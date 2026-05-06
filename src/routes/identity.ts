import { Router, type Request, type Response } from "express";
import { plaidClient } from "../services/plaid-client.js";
import { tokenStore } from "../services/token-store.js";

export const identityRouter = Router();

identityRouter.get("/", async (req: Request, res: Response) => {
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

  const identityResponse = await plaidClient.identityGet({
    access_token: item.accessToken,
  });

  res.json({
    itemId,
    accounts: identityResponse.data.accounts,
    item: identityResponse.data.item,
    requestId: identityResponse.data.request_id,
  });
});
