export interface PlaidItem {
  itemId: string;
  accessToken: string;
  userId: string;
  institutionId: string | null;
  institutionName: string | null;
  availableProducts: string[];
  billedProducts: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LinkTokenRequest {
  userId: string;
  redirectUri?: string;
  webhookUrl?: string;
  products?: string[];
  countryCodes?: string[];
  language?: string;
  institutionId?: string;
}

export interface ExchangeTokenRequest {
  publicToken: string;
  userId: string;
}

export interface SandboxTokenRequest {
  institutionId: string;
  userId?: string;
  initialProducts?: string[];
}

export interface TransactionQuery {
  itemId: string;
  startDate?: string;
  endDate?: string;
  count?: number;
  offset?: number;
}

export interface WebhookEvent {
  webhook_type: string;
  webhook_code: string;
  item_id: string;
  error?: {
    error_type: string;
    error_code: string;
    error_message: string;
  };
  [key: string]: unknown;
}
