# PlaidConnect

Server application implementing [Plaid APIs](https://plaid.com/docs/api/) for financial data connectivity. Built with TypeScript, Express, and the official `plaid` SDK.

## Live Deployment

**Production:** https://plaidconnect.vercel.app

The deployed app includes a frontend HTML page for Plaid Link and a serverless Express API backend on the same domain.

## Features

- **Link token creation** — Securely generate tokens for Plaid Link with support for `additional_consented_products` and `required_if_supported_products`
- **Update mode** — Add new products (e.g. liabilities) to an already-connected item
- **Item management** — Store, list, and remove connected financial institution items
- **Accounts & balances** — Fetch account details and real-time balances
- **Transaction sync** — Cursor-based incremental transaction updates
- **Liabilities** — Fetch credit card and loan liabilities cross-referenced with accounts
- **Identity verification** — Retrieve identity data from connected accounts
- **Auth** — Access account and routing numbers for ACH transfers
- **Webhook handling** — Process real-time event notifications from Plaid
- **Sandbox utilities** — Create test items, fire webhooks, generate test transactions

## Prerequisites

- Node.js 20+
- [Plaid account](https://dashboard.plaid.com/) with API credentials

## Setup (Local)

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

The server runs on `http://localhost:3000` by default.

## Frontend

An HTML frontend (`public/index.html`) is included for Plaid Link connections. It supports:

- Creating new bank connections with selectable products
- Bypassing the institution search via an optional **Institution ID** field (useful for OAuth-only banks)
- Updating existing items to add new products

Serve it locally:
```bash
python3 -m http.server 5173
# or
npx serve -p 5173
```

When deployed on Vercel, the frontend is served from the same origin as the API.

## API Endpoints

All `/api/*` routes (except `/health`) require an `Authorization: Bearer <API_KEY>` header.

### Link
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/link/token/create` | Create a Link token |
| POST | `/api/link/token/update` | Update mode: add products to existing item |
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

### Identity, Auth & Liabilities
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/identity?itemId=X` | Get identity data |
| GET | `/api/auth?itemId=X` | Get account/routing numbers |
| GET | `/api/liabilities?itemId=X` | Get credit card and loan liabilities |

### Login (Bank-verified)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/login/link-token` | Create login Link token |
| POST | `/api/login/verify` | Exchange token + verify identity |

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
# Health check (no auth required)
curl https://plaidconnect.vercel.app/health

# Create a link token
curl -X POST https://plaidconnect.vercel.app/api/link/token/create \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -d '{"userId": "user-123", "products": ["auth","transactions","liabilities"]}'

# Exchange public token after Plaid Link
curl -X POST https://plaidconnect.vercel.app/api/link/token/exchange \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -d '{"publicToken": "public-sandbox-xxx", "userId": "user-123"}'

# Get accounts
curl https://plaidconnect.vercel.app/api/accounts?itemId=YOUR_ITEM_ID \
  -H 'Authorization: Bearer YOUR_API_KEY'

# Sync transactions
curl https://plaidconnect.vercel.app/api/transactions/sync?itemId=YOUR_ITEM_ID \
  -H 'Authorization: Bearer YOUR_API_KEY'

# Get liabilities (credit cards)
curl https://plaidconnect.vercel.app/api/liabilities?itemId=YOUR_ITEM_ID \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PLAID_CLIENT_ID` | Yes | Plaid Dashboard client ID |
| `PLAID_SECRET` | Yes | Plaid Dashboard secret |
| `PLAID_ENV` | No | sandbox (default), development, or production |
| `PLAID_PRODUCTS` | No | Comma-separated products to request. Default: `transactions` |
| `PORT` | No | Server port (default: 3000) |
| `API_KEY` | Yes | API key to secure endpoints. Send as `Bearer` token in `Authorization` header |
| `CORS_ORIGIN` | No | Allowed CORS origin. Default: `http://localhost:5173`. Use `*` for any origin |
| `PLAID_API_VERSION` | No | Plaid API version override (defaults to latest) |

## Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel

# Set environment variables
vercel env add PLAID_CLIENT_ID
vercel env add PLAID_SECRET
vercel env add API_KEY
# ... etc

# Deploy to production
vercel --prod
```

The project is configured with:
- `api/index.ts` — Vercel serverless entry point
- `public/index.html` — Static frontend for Plaid Link
- `vercel.json` — Rewrites `/api/*` to the serverless function
