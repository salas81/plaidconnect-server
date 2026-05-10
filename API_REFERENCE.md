# PlaidConnect API Reference

**Base URL:** `https://plaidconnect.vercel.app` (production) or `http://localhost:3000` (local)

**Authentication:** All `/api/*` endpoints require `Authorization: Bearer <API_KEY>`. The `/health` endpoint does not require auth.

---

## Link

### POST /api/link/token/create
Create a Plaid Link token.

**Request:**
```json
{
  "userId": "string (required)",
  "products": ["auth", "transactions", "identity", "liabilities"],
  "countryCodes": ["US"],
  "language": "en",
  "redirectUri": "string (optional)",
  "webhookUrl": "string (optional)"
}
```

**Response:**
```json
{
  "linkToken": "link-sandbox-xxx",
  "expiration": "2026-05-10T12:00:00Z"
}
```

**Notes:**
- `products` filters institutions. All institutions shown will support every product listed.
- For more institutions, pass only `auth` + `transactions`.

---

### POST /api/link/token/update
Update mode: add new products to an existing connected item.

**Request:**
```json
{
  "itemId": "string (required)",
  "products": ["liabilities"]
}
```

**Response:**
```json
{
  "linkToken": "link-sandbox-xxx",
  "expiration": "2026-05-10T12:00:00Z",
  "itemId": "string"
}
```

**Notes:**
- Use this when an item was connected without a product (e.g. liabilities) and you want to add it.

---

### POST /api/link/token/exchange
Exchange the public token from Plaid Link for an access token.

**Request:**
```json
{
  "publicToken": "string (required)",
  "userId": "string (required)"
}
```

**Response:**
```json
{
  "itemId": "string",
  "userId": "string",
  "institutionName": "string",
  "availableProducts": ["auth", "transactions", "liabilities"]
}
```

---

## Items

### GET /api/items
List all connected items (optionally filtered by userId).

**Query params:**
- `userId` (optional)

**Response:**
```json
{
  "items": [
    {
      "itemId": "string",
      "userId": "string",
      "institutionId": "string",
      "institutionName": "string",
      "availableProducts": ["string"],
      "billedProducts": ["string"],
      "createdAt": "2026-05-10T00:00:00Z",
      "updatedAt": "2026-05-10T00:00:00Z"
    }
  ]
}
```

---

### GET /api/items/:itemId
Get details for a specific item.

**Response:**
```json
{
  "item": { ... },
  "plaidItem": { ... },
  "status": { ... },
  "requestId": "string"
}
```

---

### DELETE /api/items/:itemId
Remove an item from Plaid and the local store.

**Response:**
```json
{
  "itemId": "string",
  "message": "Item removed successfully"
}
```

---

## Accounts

### GET /api/accounts?itemId=X
Get all accounts for an item.

**Response:**
```json
{
  "itemId": "string",
  "accounts": [ ... ],
  "item": { ... },
  "requestId": "string"
}
```

---

### GET /api/accounts/balance?itemId=X
Get real-time balances.

**Response:**
```json
{
  "itemId": "string",
  "accounts": [ ... ],
  "item": { ... },
  "requestId": "string"
}
```

---

## Transactions

### GET /api/transactions?itemId=X
Get transactions for an item.

**Query params:**
- `itemId` (required)
- `startDate` (optional, YYYY-MM-DD)
- `endDate` (optional, YYYY-MM-DD)
- `count` (optional, default 100)
- `offset` (optional, default 0)

**Response:**
```json
{
  "itemId": "string",
  "transactions": [ ... ],
  "totalTransactions": 42,
  "accounts": [ ... ],
  "requestId": "string"
}
```

---

### GET /api/transactions/sync?itemId=X
Cursor-based incremental sync.

**Query params:**
- `itemId` (required)
- `cursor` (optional)
- `count` (optional, default 100)

**Response:**
```json
{
  "itemId": "string",
  "added": [ ... ],
  "modified": [ ... ],
  "removed": [ ... ],
  "hasMore": false,
  "nextCursor": "string",
  "requestId": "string"
}
```

---

### POST /api/transactions/refresh
Force a transaction refresh.

**Request:**
```json
{ "itemId": "string" }
```

**Response:**
```json
{
  "itemId": "string",
  "requestId": "string",
  "message": "Transaction refresh initiated"
}
```

---

## Identity, Auth & Liabilities

### GET /api/identity?itemId=X
Get identity data (names, emails, phones, addresses).

**Response:**
```json
{
  "itemId": "string",
  "accounts": [ ... ],
  "item": { ... },
  "requestId": "string"
}
```

---

### GET /api/auth?itemId=X
Get account and routing numbers.

**Response:**
```json
{
  "itemId": "string",
  "accounts": [ ... ],
  "numbers": { ... },
  "item": { ... },
  "requestId": "string"
}
```

---

### GET /api/liabilities?itemId=X
Get credit card and loan liabilities, cross-referenced with accounts.

**Response:**
```json
{
  "itemId": "string",
  "creditCards": [
    {
      "accountId": "string",
      "name": "Bank of America Credit Card",
      "officialName": "string",
      "mask": "1234",
      "balances": { ... },
      "liability": { ... }
    }
  ],
  "totalCreditCards": 1,
  "requestId": "string"
}
```

**Notes:**
- Only returns accounts where `type === "credit"` and `subtype === "credit card"`.
- If the item was not connected with the `liabilities` product, this will return an empty list or error.

---

## Login (Bank-verified)

### POST /api/login/link-token
Create a login-scoped Link token.

**Request:**
```json
{ "userId": "string" }
```

**Response:**
```json
{
  "linkToken": "string",
  "expiration": "string"
}
```

---

### POST /api/login/verify
Exchange public token and verify identity.

**Request:**
```json
{
  "publicToken": "string",
  "userId": "string"
}
```

**Response:**
```json
{
  "verified": true,
  "userId": "string",
  "itemId": "string",
  "identities": [ ... ],
  "products": [ ... ]
}
```

---

## Webhooks

### POST /api/webhooks/plaid
Receive Plaid webhook events.

**Headers:**
- `Plaid-Verification`: JWS signature from Plaid

**Body:**
```json
{
  "webhook_type": "TRANSACTIONS",
  "webhook_code": "SYNC_UPDATES_AVAILABLE",
  "item_id": "string"
}
```

**Notes:**
- No API key required for this endpoint.
- The server verifies the JWS signature automatically.

---

## Sandbox

Only available when `PLAID_ENV=sandbox`.

### POST /api/sandbox/token/create
Create a sandbox test item.

**Request:**
```json
{
  "institutionId": "ins_109508",
  "userId": "string (optional)",
  "initialProducts": ["auth", "transactions"]
}
```

---

### POST /api/sandbox/webhook/fire
Fire a test webhook.

**Request:**
```json
{
  "itemId": "string",
  "webhookCode": "DEFAULT_UPDATE"
}
```

---

### POST /api/sandbox/transactions/create
Simulate a transaction update.

**Request:**
```json
{
  "itemId": "string",
  "accountId": "string",
  "amount": 100,
  "description": "Test transaction"
}
```

---

## Health

### GET /health
No authentication required.

**Response:**
```json
{
  "status": "ok",
  "environment": "production",
  "timestamp": "2026-05-10T00:00:00Z"
}
```
