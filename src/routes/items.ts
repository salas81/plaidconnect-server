import { Router, type Request, type Response } from "express";
import { plaidClient } from "../services/plaid-client.js";
import { tokenStore } from "../services/token-store.js";

export const itemsRouter = Router();

itemsRouter.get("/", async (req: Request, res: Response) => {
  const userId = req.query.userId as string | undefined;

  let items;
  if (userId) {
    items = tokenStore.getByUserId(userId);
  } else {
    items = tokenStore.list();
  }

  const safeItems = items.map(({ accessToken: _accessToken, ...rest }) => rest);

  res.json({ items: safeItems });
});

itemsRouter.get("/:itemId", async (req: Request, res: Response) => {
  const itemId = req.params.itemId as string;
  const item = tokenStore.getByItemId(itemId);

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const plaidItemResponse = await plaidClient.itemGet({
    access_token: item.accessToken,
  });

  const { accessToken: _accessToken, ...safeItem } = item;

  res.json({
    item: safeItem,
    plaidItem: plaidItemResponse.data.item,
    status: plaidItemResponse.data.status,
    requestId: plaidItemResponse.data.request_id,
  });
});

itemsRouter.delete("/:itemId", async (req: Request, res: Response) => {
  const itemId = req.params.itemId as string;
  const item = tokenStore.getByItemId(itemId);

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  await plaidClient.itemRemove({
    access_token: item.accessToken,
  });

  tokenStore.remove(itemId);

  res.json({ itemId, message: "Item removed successfully" });
});
