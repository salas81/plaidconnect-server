import { Router, type Request, type Response } from "express";
import { plaidClient } from "../services/plaid-client.js";
import { tokenStore } from "../services/token-store.js";

export const accountsRouter = Router();

accountsRouter.get("/", async (req: Request, res: Response) => {
  const itemId = req.query.itemId as string;
  if (!itemId) {
    res.status(400).json({ error: "itemId query parameter is required" });
    return;
  }

  const item = tokenStore.getByItemId(itemId);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const accountsResponse = await plaidClient.accountsGet({
    access_token: item.accessToken,
  });

  res.json({
    itemId,
    accounts: accountsResponse.data.accounts,
    item: accountsResponse.data.item,
    requestId: accountsResponse.data.request_id,
  });
});

accountsRouter.get("/balance", async (req: Request, res: Response) => {
  const itemId = req.query.itemId as string;
  if (!itemId) {
    res.status(400).json({ error: "itemId query parameter is required" });
    return;
  }

  const item = tokenStore.getByItemId(itemId);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const balanceResponse = await plaidClient.accountsBalanceGet({
    access_token: item.accessToken,
  });

  res.json({
    itemId,
    accounts: balanceResponse.data.accounts,
    item: balanceResponse.data.item,
    requestId: balanceResponse.data.request_id,
  });
});
