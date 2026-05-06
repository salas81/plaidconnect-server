import { Router, type Request, type Response } from "express";
import { plaidClient } from "../services/plaid-client.js";
import { tokenStore } from "../services/token-store.js";

export const sandboxRouter = Router();

sandboxRouter.post("/token/create", async (req: Request, res: Response) => {
  const { institutionId, userId, initialProducts } = req.body;

  if (!institutionId) {
    res.status(400).json({ error: "institutionId is required" });
    return;
  }

  const sandboxResponse = await plaidClient.sandboxPublicTokenCreate({
    institution_id: institutionId,
    initial_products: initialProducts || ["auth", "transactions"],
    options: {
      webhook: req.body.webhookUrl,
    },
  });

  const publicToken = sandboxResponse.data.public_token;

  const exchangeResponse = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });

  const accessToken = exchangeResponse.data.access_token;
  const sanitizedUserId = userId || `sandbox-${Date.now()}`;

  const itemResponse = await plaidClient.itemGet({
    access_token: accessToken,
  });

  const item = itemResponse.data.item;

  const plaidItem = {
    itemId: item.item_id,
    accessToken,
    userId: sanitizedUserId,
    institutionId,
    institutionName: null,
    availableProducts: item.available_products,
    billedProducts: item.billed_products,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  tokenStore.save(plaidItem);

  res.json({
    itemId: item.item_id,
    userId: sanitizedUserId,
    publicToken,
    availableProducts: item.available_products,
  });
});

sandboxRouter.post("/webhook/fire", async (req: Request, res: Response) => {
  const { itemId, webhookCode } = req.body;
  if (!itemId || !webhookCode) {
    res.status(400).json({ error: "itemId and webhookCode are required" });
    return;
  }

  const item = tokenStore.getByItemId(itemId);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  await plaidClient.sandboxItemFireWebhook({
    access_token: item.accessToken,
    webhook_code: webhookCode,
  });

  res.json({ itemId, webhookCode, message: "Webhook fired" });
});

sandboxRouter.post("/transactions/create", async (req: Request, res: Response) => {
  const { itemId, accountId, amount, description, date } = req.body;
  if (!itemId || !accountId || !amount || !description) {
    res.status(400).json({ error: "itemId, accountId, amount, and description are required" });
    return;
  }

  const item = tokenStore.getByItemId(itemId);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  // Fire a sandbox webhook to simulate transaction updates
  await plaidClient.sandboxItemFireWebhook({
    access_token: item.accessToken,
    webhook_code: "DEFAULT_UPDATE",
  } as any);

  res.json({ itemId, accountId, amount, description, message: "Transaction webhook fired — use /api/transactions/sync to check for updates" });
});
