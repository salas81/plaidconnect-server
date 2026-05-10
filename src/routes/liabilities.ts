import { Router, type Request, type Response } from "express";
import { plaidClient } from "../services/plaid-client.js";
import { tokenStore } from "../services/token-store.js";

export const liabilitiesRouter = Router();

liabilitiesRouter.get("/", async (req: Request, res: Response) => {
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

  // 1. Fetch all accounts
  const accountsResponse = await plaidClient.accountsGet({
    access_token: item.accessToken,
  });

  // 2. Filter for credit cards
  const creditCardAccounts = accountsResponse.data.accounts.filter(
    (account) => account.type === "credit" && account.subtype === "credit card"
  );

  // 3. Fetch liabilities
  const liabilitiesResponse = await plaidClient.liabilitiesGet({
    access_token: item.accessToken,
  });

  // 4. Map liabilities to the credit card accounts
  const creditCards = creditCardAccounts.map((account) => {
    const liability = liabilitiesResponse.data.liabilities?.credit?.find(
      (l) => l.account_id === account.account_id
    );

    return {
      accountId: account.account_id,
      name: account.name,
      officialName: account.official_name,
      mask: account.mask,
      balances: account.balances,
      liability: liability || null,
    };
  });

  res.json({
    itemId,
    creditCards,
    totalCreditCards: creditCards.length,
    requestId: liabilitiesResponse.data.request_id,
  });
});
