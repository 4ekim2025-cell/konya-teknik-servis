import type { IncomingMessage, ServerResponse } from "node:http";
import { adminHandler } from "../server/admin/handler.js";
import { publicGoogleRatingHandler } from "../server/google-reviews-public.js";

// Blog yönetim paneli API'si: /api/admin?action=... (tek fonksiyon; ayrıntılar server/admin/handler.ts içinde).
export default function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/api/admin", "http://internal.local");
  if (url.searchParams.get("public") === "google-rating") {
    const allowed = url.searchParams.size === 1 && url.searchParams.getAll("public").length === 1;
    if (!allowed) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
      return res.end(JSON.stringify({ error: "bad_request" }));
    }
    return publicGoogleRatingHandler(req, res);
  }
  return adminHandler(req, res);
}
