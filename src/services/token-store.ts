import type { PlaidItem } from "../types/index.js";

// In-memory token store. Replace with a database (Postgres, SQLite, DynamoDB) in production.
const items = new Map<string, PlaidItem>();

export const tokenStore = {
  save(item: PlaidItem): void {
    items.set(item.itemId, item);
    items.set(`access:${item.accessToken}`, item);
  },

  getByItemId(itemId: string): PlaidItem | undefined {
    return items.get(itemId);
  },

  getByAccessToken(accessToken: string): PlaidItem | undefined {
    return items.get(`access:${accessToken}`);
  },

  getByUserId(userId: string): PlaidItem[] {
    return Array.from(items.values()).filter((item) => item.userId === userId);
  },

  remove(itemId: string): void {
    const item = items.get(itemId);
    if (item) {
      items.delete(itemId);
      items.delete(`access:${item.accessToken}`);
    }
  },

  list(): PlaidItem[] {
    return Array.from(items.values());
  },
};
