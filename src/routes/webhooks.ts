import { Router, type Request, type Response } from "express";
import { tokenStore } from "../services/token-store.js";
import { verifyPlaidWebhook } from "../services/webhook-verifier.js";
import type { WebhookEvent } from "../types/index.js";

export const webhooksRouter = Router();

webhooksRouter.post("/plaid", async (req: Request, res: Response) => {
  const signature = req.headers["plaid-verification"] as string | undefined;

  if (!signature) {
    res.status(401).json({ error: "Missing Plaid-Verification header" });
    return;
  }

  const rawBody = JSON.stringify(req.body);
  const verified = await verifyPlaidWebhook(signature, rawBody);

  if (!verified) {
    console.error("[webhook] Signature verification failed");
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  const event = req.body as WebhookEvent;
  const { webhook_type, webhook_code, item_id } = event;

  console.log(`[webhook] ${webhook_type}:${webhook_code} for item ${item_id}`);

  switch (webhook_type) {
    case "TRANSACTIONS":
      handleTransactionWebhook(webhook_code, event);
      break;
    case "ITEM":
      handleItemWebhook(webhook_code, event);
      break;
    case "ASSETS":
      console.log(`[assets] ${webhook_code}`, event);
      break;
    case "TRANSFER":
      console.log(`[transfer] ${webhook_code}`, event);
      break;
    case "INCOME":
      console.log(`[income] ${webhook_code}`, event);
      break;
    default:
      console.log(`[webhook] unknown type: ${webhook_type}`);
  }

  res.status(200).json({ received: true });
});

function handleTransactionWebhook(code: string, event: WebhookEvent): void {
  const item = tokenStore.getByItemId(event.item_id);
  if (!item) {
    console.error(`[webhook] Unknown item ${event.item_id}`);
    return;
  }

  switch (code) {
    case "SYNC_UPDATES_AVAILABLE":
      console.log(`[transactions] New updates available for ${event.item_id}`);
      break;
    case "INITIAL_UPDATE":
      console.log(`[transactions] Initial sync complete for ${event.item_id}`);
      break;
    case "HISTORICAL_UPDATE":
      console.log(`[transactions] Historical backfill complete for ${event.item_id}`);
      break;
    case "DEFAULT_UPDATE":
      console.log(`[transactions] Default update for ${event.item_id} — ${event.error?.error_message || "no errors"}`);
      break;
    case "TRANSACTIONS_REMOVED":
      console.log(`[transactions] Transactions removed for ${event.item_id}`);
      break;
  }
}

function handleItemWebhook(code: string, event: WebhookEvent): void {
  switch (code) {
    case "ERROR":
      console.error(`[item] Error for ${event.item_id}: ${JSON.stringify(event.error)}`);
      break;
    case "PENDING_EXPIRATION":
      console.log(`[item] Access token expiring for ${event.item_id} — user action needed`);
      break;
    case "USER_PERMISSION_REVOKED":
    case "USER_ACCOUNT_REVOKED":
      console.log(`[item] Permission revoked for ${event.item_id} — consider removing this item`);
      break;
    case "NEW_ACCOUNTS_AVAILABLE":
      console.log(`[item] New accounts available for ${event.item_id}`);
      break;
  }
}
