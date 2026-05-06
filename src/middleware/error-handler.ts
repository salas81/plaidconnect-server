import type { Request, Response, NextFunction } from "express";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error("[error]", err.message);

  if (isPlaidError(err)) {
    const plaidData = (err as any).response?.data;
    const plaidErrorType = plaidData?.error_type || "unknown";
    const plaidErrorCode = plaidData?.error_code || "unknown";
    console.error("[plaid_error]", plaidErrorType, plaidErrorCode);

    res.status(500).json({
      error: "plaid_error",
      message: "An error occurred while processing your request",
    });
    return;
  }

  res.status(500).json({
    error: "internal_error",
    message: "An internal error occurred",
  });
}

function isPlaidError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as Record<string, any>;
  return (e.message as string)?.includes("PLAID") || !!(e.response?.data?.error_type);
}
