import dotenv from "dotenv";
dotenv.config();

export const config = {
  plaid: {
    clientId: process.env.PLAID_CLIENT_ID || "",
    secret: process.env.PLAID_SECRET || "",
    env: process.env.PLAID_ENV || "sandbox",
    apiVersion: process.env.PLAID_API_VERSION || "2020-09-14",
  },
  server: {
    port: parseInt(process.env.PORT || "3000", 10),
    apiKey: process.env.API_KEY || "",
    corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  },
} as const;

export function validateConfig(): void {
  const errors: string[] = [];
  if (!config.plaid.clientId) errors.push("PLAID_CLIENT_ID is required");
  if (!config.plaid.secret) errors.push("PLAID_SECRET is required");
  if (!["sandbox", "development", "production"].includes(config.plaid.env)) {
    errors.push("PLAID_ENV must be sandbox, development, or production");
  }
  if (!config.server.apiKey) errors.push("API_KEY is required (used to secure the API)");
  if (errors.length) {
    throw new Error(`Configuration errors:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }
}
