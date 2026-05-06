import { Router, type Request, type Response } from "express";
import { plaidClient } from "../services/plaid-client.js";
import { tokenStore } from "../services/token-store.js";
import { config } from "../config.js";

export const loginRouter = Router();

// Step 1: Create a Link token scoped to identity verification
loginRouter.post("/link-token", async (req: Request, res: Response) => {
  const { userId } = req.body as { userId?: string };

  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: "PlaidConnect",
    products: config.plaid.products as any,
    country_codes: ["US" as any],
    language: "en",
  });

  res.json({
    linkToken: response.data.link_token,
    expiration: response.data.expiration,
  });
});

// Step 2: Exchange public token and verify identity
loginRouter.post("/verify", async (req: Request, res: Response) => {
  const { publicToken, userId } = req.body as { publicToken: string; userId: string };

  if (!publicToken || !userId) {
    res.status(400).json({ error: "publicToken and userId are required" });
    return;
  }

  // Exchange public token for access token
  const exchangeResponse = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });

  const accessToken = exchangeResponse.data.access_token;
  const itemId = exchangeResponse.data.item_id;

  // Try to fetch identity data — only works if the identity product is enabled
  let identities: unknown[] = [];
  let availableProducts: string[] = [];
  let billedProducts: string[] = [];

  try {
    const identityResponse = await plaidClient.identityGet({
      access_token: accessToken,
    });

    const owners = identityResponse.data.accounts.flatMap(
      (account) => account.owners
    );

    // Deduplicate owners by name
    const seen = new Set<string>();
    const uniqueOwners = owners.filter((owner) => {
      const key = JSON.stringify(owner.names);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    identities = uniqueOwners.map((owner) => ({
      names: owner.names,
      emails: owner.emails.map((e) => ({ address: e.data, primary: e.primary })),
      phoneNumbers: owner.phone_numbers.map((p) => ({
        number: p.data,
        type: p.type,
        primary: p.primary,
      })),
      addresses: owner.addresses.map((a) => ({
        street: a.data.street,
        city: a.data.city,
        region: a.data.region,
        postalCode: a.data.postal_code,
        country: a.data.country,
        primary: a.primary,
      })),
    }));

    availableProducts = identityResponse.data.item.available_products;
    billedProducts = identityResponse.data.item.billed_products;
  } catch (_err) {
    // Identity not available — use the configured products
    availableProducts = config.plaid.products;
    billedProducts = config.plaid.products;
  }

  // Store the item
  tokenStore.save({
    itemId,
    accessToken,
    userId,
    institutionId: null,
    institutionName: null,
    availableProducts,
    billedProducts,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  res.json({
    verified: true,
    userId,
    itemId,
    identities,
    products: availableProducts,
  });
});
