import { Router, type Request, type Response } from "express";
import { plaidClient } from "../services/plaid-client.js";
import { tokenStore } from "../services/token-store.js";

export const transactionsRouter = Router();

transactionsRouter.get("/sync", async (req: Request, res: Response) => {
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

  const cursor = (req.query.cursor as string) || undefined;
  const count = req.query.count ? parseInt(req.query.count as string, 10) : 100;

  const syncResponse = await plaidClient.transactionsSync({
    access_token: item.accessToken,
    cursor,
    count,
  });

  res.json({
    itemId,
    added: syncResponse.data.added,
    modified: syncResponse.data.modified,
    removed: syncResponse.data.removed,
    hasMore: syncResponse.data.has_more,
    nextCursor: syncResponse.data.next_cursor,
    requestId: syncResponse.data.request_id,
  });
});

transactionsRouter.get("/", async (req: Request, res: Response) => {
  const itemId = req.query.itemId as string;
  const startDate = (req.query.startDate as string) || undefined;
  const endDate = (req.query.endDate as string) || undefined;
  const count = req.query.count ? parseInt(req.query.count as string, 10) : 100;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

  if (!itemId) {
    res.status(400).json({ error: "itemId query parameter is required" });
    return;
  }

  const item = tokenStore.getByItemId(itemId);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const transactionsResponse = await plaidClient.transactionsGet({
    access_token: item.accessToken,
    start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    end_date: endDate || new Date().toISOString().slice(0, 10),
    options: { count, offset },
  });

  res.json({
    itemId,
    transactions: transactionsResponse.data.transactions,
    totalTransactions: transactionsResponse.data.total_transactions,
    accounts: transactionsResponse.data.accounts,
    requestId: transactionsResponse.data.request_id,
  });
});

transactionsRouter.post("/refresh", async (req: Request, res: Response) => {
  const { itemId } = req.body;
  if (!itemId) {
    res.status(400).json({ error: "itemId is required" });
    return;
  }

  const item = tokenStore.getByItemId(itemId);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const refreshResponse = await plaidClient.transactionsRefresh({
    access_token: item.accessToken,
  });

  res.json({
    itemId,
    requestId: refreshResponse.data.request_id,
    message: "Transaction refresh initiated",
  });
});
