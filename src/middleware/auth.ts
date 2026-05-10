import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { config } from "../config.js";

function extractApiKey(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

function secureCompare(a: string, b: string): boolean {
  // Hash both strings with SHA-256 to get fixed-length buffers,
  // then compare with timingSafeEqual to prevent timing attacks.
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  if (hashA.length !== hashB.length) return false;
  return crypto.timingSafeEqual(hashA, hashB);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = extractApiKey(req);

  if (!apiKey || !secureCompare(apiKey, config.server.apiKey)) {
    res.status(401).json({ error: "unauthorized", message: "Valid API key required" });
    return;
  }

  next();
}
