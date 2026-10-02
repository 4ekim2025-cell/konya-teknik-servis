import type { IncomingMessage, ServerResponse } from "node:http";
import { adminHandler } from "../server/admin/handler.js";

// Blog yönetim paneli API'si: /api/admin?action=... (tek fonksiyon; ayrıntılar server/admin/handler.ts içinde).
export default function handler(req: IncomingMessage, res: ServerResponse) {
  return adminHandler(req, res);
}
