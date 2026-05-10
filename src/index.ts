import "express-async-errors";
import { readFileSync } from "fs";
import { join } from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config, validateConfig } from "./config.js";
import { requireAuth } from "./middleware/auth.js";
import { linkRouter } from "./routes/link.js";
import { accountsRouter } from "./routes/accounts.js";
import { transactionsRouter } from "./routes/transactions.js";
import { identityRouter } from "./routes/identity.js";
import { authRouter } from "./routes/auth.js";
import { itemsRouter } from "./routes/items.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { loginRouter } from "./routes/login.js";
import { liabilitiesRouter } from "./routes/liabilities.js";
import { errorHandler } from "./middleware/error-handler.js";

validateConfig();

const app = express();

// Security headers (CSP, X-Frame-Options, HSTS, etc.)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.plaid.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        fontSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
  })
);

// CORS — explicit origin, not wildcard
app.use(
  cors({
    origin: config.server.corsOrigin,
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limited", message: "Too many requests, try again later" },
});
app.use(limiter);

app.use(express.json({ limit: "1mb" }));

// Serve frontend HTML at root (Vercel serverless)
app.get("/", (_req, res) => {
  try {
    const htmlPath = join(process.cwd(), "public", "index.html");
    const html = readFileSync(htmlPath, "utf-8");
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch {
    res.status(500).send("Frontend not available");
  }
});

// Health check — no auth required
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    environment: config.plaid.env,
    timestamp: new Date().toISOString(),
  });
});

// Webhooks — authenticated via Plaid-Verification header, no API key needed
app.use("/api/webhooks", webhooksRouter);

// All other API routes require API key
app.use("/api", requireAuth);

// Link — create link tokens and exchange public tokens
app.use("/api/link", linkRouter);

// Items — manage connected financial institution items
app.use("/api/items", itemsRouter);

// Accounts — fetch account info and balances
app.use("/api/accounts", accountsRouter);

// Transactions — sync and fetch transaction data
app.use("/api/transactions", transactionsRouter);

// Identity — fetch identity data (names, emails, phones, addresses)
app.use("/api/identity", identityRouter);

// Auth — fetch account and routing numbers
app.use("/api/auth", authRouter);

// Login — authenticate users via Plaid Identity (bank-verified login)
app.use("/api/login", loginRouter);

// Liabilities — fetch credit card and loan liabilities
app.use("/api/liabilities", liabilitiesRouter);

// Sandbox — testing utilities (only in sandbox environment)
if (config.plaid.env === "sandbox") {
  const { sandboxRouter } = await import("./routes/sandbox.js");
  app.use("/api/sandbox", sandboxRouter);
}

app.use(errorHandler);

if (!process.env.VERCEL) {
  app.listen(config.server.port, "0.0.0.0", () => {
    console.log(`\nPlaidConnect server running on http://0.0.0.0:${config.server.port}`);
    console.log(`Environment: ${config.plaid.env}`);
    console.log(`Auth:      API key required on all /api/* routes`);
    console.log(`Webhooks:  JWS signature verification enabled`);
    console.log(`CORS:      ${config.server.corsOrigin}`);
    console.log(`Endpoints:`);
    console.log(`  POST /api/link/token/create       — Create Link token`);
    console.log(`  POST /api/link/token/exchange     — Exchange public token`);
    console.log(`  GET  /api/items                    — List items`);
    console.log(`  GET  /api/items/:itemId            — Get item details`);
    console.log(`  DELETE /api/items/:itemId          — Remove item`);
    console.log(`  GET  /api/accounts                 — Get accounts`);
    console.log(`  GET  /api/accounts/balance         — Get real-time balances`);
    console.log(`  GET  /api/transactions             — Get transactions`);
    console.log(`  GET  /api/transactions/sync        — Sync transactions (cursor-based)`);
    console.log(`  POST /api/transactions/refresh     — Force transaction refresh`);
    console.log(`  GET  /api/identity                 — Get identity data`);
    console.log(`  GET  /api/auth                     — Get account & routing numbers`);
    console.log(`  POST /api/login/link-token         — Create login Link token`);
    console.log(`  POST /api/login/verify             — Exchange token + verify identity`);
    console.log(`  GET  /api/liabilities              — Get credit card and loan liabilities`);
    if (config.plaid.env === "sandbox") {
      console.log(`  POST /api/sandbox/token/create     — Create sandbox test item`);
      console.log(`  POST /api/sandbox/webhook/fire     — Fire sandbox webhook`);
    }
    console.log(`  POST /api/webhooks/plaid           — Receive webhooks`);
    console.log(`  GET  /health                       — Health check\n`);
  });
}

export default app;
