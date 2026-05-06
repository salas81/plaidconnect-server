import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { config } from "../config.js";

const envMap: Record<string, (typeof PlaidEnvironments)[keyof typeof PlaidEnvironments]> = {
  sandbox: PlaidEnvironments.sandbox,
  development: PlaidEnvironments.development,
  production: PlaidEnvironments.production,
};

const configuration = new Configuration({
  basePath: envMap[config.plaid.env] || PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": config.plaid.clientId,
      "PLAID-SECRET": config.plaid.secret,
      "Plaid-Version": config.plaid.apiVersion,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);
