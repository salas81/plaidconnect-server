import { Router, type Request, type Response } from "express";
import { plaidClient } from "../services/plaid-client.js";
import { tokenStore } from "../services/token-store.js";
import type { LinkTokenRequest, ExchangeTokenRequest } from "../types/index.js";

export const linkRouter = Router();

linkRouter.post("/token/create", async (req: Request, res: Response) => {
  const { userId, products, countryCodes, language, redirectUri, webhookUrl } = req.body as LinkTokenRequest;

  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const linkTokenResponse = await plaidClient.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: "PlaidConnect",
    products: (products as any) || ["auth", "transactions"],
    country_codes: (countryCodes as any) || ["US" as any],
    language: language || "en",
    redirect_uri: redirectUri,
    webhook: webhookUrl,
  });

  res.json({
    linkToken: linkTokenResponse.data.link_token,
    expiration: linkTokenResponse.data.expiration,
  });
});

linkRouter.post("/token/exchange", async (req: Request, res: Response) => {
  const { publicToken, userId } = req.body as ExchangeTokenRequest;

  if (!publicToken || !userId) {
    res.status(400).json({ error: "publicToken and userId are required" });
    return;
  }

  const exchangeResponse = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });

  const accessToken = exchangeResponse.data.access_token;
  const itemId = exchangeResponse.data.item_id;

  const itemResponse = await plaidClient.itemGet({
    access_token: accessToken,
  });

  const item = itemResponse.data.item;
  const institutionId = item.institution_id || null;

  let institutionName: string | null = null;
  if (institutionId) {
    try {
      const instResponse = await plaidClient.institutionsGetById({
        institution_id: institutionId,
        country_codes: ["US" as any],
        options: { include_optional_metadata: true },
      });
      institutionName = instResponse.data.institution.name;
    } catch {
      // institution lookup is best-effort
    }
  }

  const plaidItem = {
    itemId,
    accessToken,
    userId,
    institutionId,
    institutionName,
    availableProducts: item.available_products,
    billedProducts: item.billed_products,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  tokenStore.save(plaidItem);

  res.json({
    itemId,
    userId,
    institutionName,
    availableProducts: item.available_products,
  });
});
