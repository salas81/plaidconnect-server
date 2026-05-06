# PlaidConnect

Server application implementing [Plaid APIs](https://plaid.com/docs/api/) for financial data connectivity. Built with TypeScript, Express, and the official `plaid` SDK.

## Features

- **Link token creation** — Securely generate tokens for Plaid Link
- **Item management** — Store, list, and remove connected financial institution items
- **Accounts & balances** — Fetch account details and real-time balances
- **Transaction sync** — Cursor-based incremental transaction updates
- **Identity verification** — Retrieve identity data from connected accounts
- **Auth** — Access account and routing numbers for ACH transfers
- **Webhook handling** — Process real-time event notifications from Plaid
- **Sandbox utilities** — Create test items, fire webhooks, generate test transactions

## Prerequisites

- Node.js 20+
- [Plaid account](https://dashboard.plaid.com/) with API credentials

## Setup

```bash
# Clone and enter
cd PlaidConnect

# Install dependencies
npm install

# Copy and configure env
cp .env.example .env
# Fill in PLAID_CLIENT_ID and PLAID_SECRET

# Build and start
npm run dev
```

## API Endpoints

### Link
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/link/token/create` | Create a Link token |
| POST | `/api/link/token/exchange` | Exchange public token for access token |

### Items
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/items?userId=X` | List items by user |
| GET | `/api/items/:itemId` | Get item status |
| DELETE | `/api/items/:itemId` | Remove item |

### Accounts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/accounts?itemId=X` | Get accounts |
| GET | `/api/accounts/balance?itemId=X` | Get real-time balances |

### Transactions
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/transactions?itemId=X` | Get transactions |
| GET | `/api/transactions/sync?itemId=X` | Incremental sync |
| POST | `/api/transactions/refresh` | Force refresh |

### Identity & Auth
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/identity?itemId=X` | Get identity data |
| GET | `/api/auth?itemId=X` | Get account/routing numbers |

### Webhooks
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/webhooks/plaid` | Receive Plaid webhook events |

### Sandbox
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sandbox/token/create` | Create sandbox item |
| POST | `/api/sandbox/webhook/fire` | Fire test webhook |
| POST | `/api/sandbox/transactions/create` | Create test transaction |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |

## Example Usage

```bash
# Create a sandbox test item
curl -X POST http://localhost:3000/api/sandbox/token/create \
  -H 'Content-Type: application/json' \
  -d '{"institutionId": "ins_109508"}'

# Get accounts
curl http://localhost:3000/api/accounts?itemId=YOUR_ITEM_ID

# Sync transactions
curl http://localhost:3000/api/transactions/sync?itemId=YOUR_ITEM_ID
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PLAID_CLIENT_ID` | Yes | Plaid Dashboard client ID |
| `PLAID_SECRET` | Yes | Plaid Dashboard secret |
| `PLAID_ENV` | No | sandbox (default), development, or production |
| `PORT` | No | Server port (default: 3000) |
| `PLAID_API_VERSION` | No | Plaid API version override |
