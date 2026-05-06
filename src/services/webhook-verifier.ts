import { compactVerify } from "jose";
import { plaidClient } from "./plaid-client.js";

export async function verifyPlaidWebhook(
  signatureHeader: string,
  rawBody: string
): Promise<boolean> {
  try {
    // The Plaid-Verification header is a JWS compact serialization
    // Parse the unprotected header to get the key_id
    const parts = signatureHeader.split(".");
    if (parts.length !== 3) return false;

    const protectedHeader = JSON.parse(
      Buffer.from(parts[0], "base64url").toString("utf-8")
    ) as { kid: string; alg: string };

    const kid = protectedHeader.kid;
    if (!kid) return false;

    // Fetch the JWK from Plaid
    const keyResponse = await plaidClient.webhookVerificationKeyGet({
      key_id: kid,
    });

    const jwk = keyResponse.data.key;
    const key = await importJWK(jwk as unknown as JsonWebKey);

    // Verify the JWS
    const encoder = new TextEncoder();
    await compactVerify(signatureHeader, key, {
      algorithms: [protectedHeader.alg],
    });

    // Verify the payload matches the raw request body
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    );
    const payloadStr = JSON.stringify(payload);

    return payloadStr === rawBody;
  } catch {
    return false;
  }
}

async function importJWK(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"]
  );
}
