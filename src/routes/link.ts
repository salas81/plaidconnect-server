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

  const requestedProducts: string[] = products || ["auth", "transactions"];

  // Core products that filter the institution list.
  // Only institutions supporting ALL of these are shown.
  const coreProducts = requestedProducts.filter(
    (p) => p === "auth" || p === "transactions"
  );

  // Products that are consented IF the institution supports them,
  // but institutions are NOT hidden if they don't support them.
  // This lets you see Bilt Rewards (no liabilities) AND BofA (has liabilities)
  // in the same list, and consent is collected automatically per-bank.
  const requiredIfSupported = requestedProducts.filter(
    (p) => p !== "auth" && p !== "transactions"
  );

  const linkTokenResponse = await plaidClient.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: "PlaidConnect",
    products: (coreProducts as any).length ? (coreProducts as any) : ["auth" as any],
    required_if_supported_products: requiredIfSupported.length ? (requiredIfSupported as any) : undefined,
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

// Update mode: create a link token for an existing item to add new products
linkRouter.post("/token/update", async (req: Request, res: Response) => {
  const { itemId, products } = req.body as { itemId?: string; products?: string[] };

  if (!itemId) {
    res.status(400).json({ error: "itemId is required" });
    return;
  }

  const item = tokenStore.getByItemId(itemId);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const requestedProducts: string[] = products || ["liabilities"];

  const linkTokenResponse = await plaidClient.linkTokenCreate({
    user: { client_user_id: item.userId },
    client_name: "PlaidConnect",
    products: (requestedProducts as any).length ? (requestedProducts as any) : undefined,
    country_codes: ["US" as any],
    language: "en",
    access_token: item.accessToken,
  });

  res.json({
    linkToken: linkTokenResponse.data.link_token,
    expiration: linkTokenResponse.data.expiration,
    itemId,
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
