import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";

function extractApiKey(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = extractApiKey(req);

  if (!apiKey || apiKey !== config.server.apiKey) {
    res.status(401).json({ error: "unauthorized", message: "Valid API key required" });
    return;
  }

  next();
}
