import type { IncomingMessage, ServerResponse } from "node:http";
import { GOOGLE_PUBLIC_CONFIG } from "./google-public-config.generated.js";
import { GoogleError, createGoogleClient, readGoogleCredentials } from "./admin/google.js";

const PUBLIC_CACHE_SECONDS = 172_800;
const FAILURE_CACHE_MS = 5 * 60 * 1000;
const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export async function publicGoogleRatingData(env: Record<string, string | undefined>, fetchImpl: typeof fetch = fetch, now: () => number = Date.now, suppliedConfig: { enabled: boolean; accountId?: string; locationId?: string } = GOOGLE_PUBLIC_CONFIG) {
  const config = suppliedConfig;
  if (!config.enabled || !config.accountId || !config.locationId) return { status: 404, body: { error: "not_configured" } } as const;
  const credentials = readGoogleCredentials(env);
  if (!credentials) return { status: 503, body: { error: "not_configured" } } as const;
  try {
    const averageRating = await createGoogleClient(credentials, fetchImpl, now).getRating(config.accountId, config.locationId);
    if (averageRating === undefined) return { status: 404, body: { error: "rating_unavailable" } } as const;
    return { status: 200, body: { averageRating, refreshedAt: new Date(now()).toISOString() } } as const;
  } catch (error) {
    if (error instanceof GoogleError) console.error("public: google puanı alınamadı", error.kind, error.status);
    else console.error("public: google puanı alınamadı");
    return { status: 503, body: { error: "rating_unavailable" } } as const;
  }
}

type PublicRatingResult = Awaited<ReturnType<typeof publicGoogleRatingData>>;
let memoryCache: { expiresAt: number; result: PublicRatingResult } | undefined;
let inFlight: Promise<PublicRatingResult> | undefined;

function storeInMemory(result: PublicRatingResult): void {
  const ttl = result.status === 200 ? PUBLIC_CACHE_SECONDS * 1000 : FAILURE_CACHE_MS;
  const expiresAt = Date.now() + ttl;
  memoryCache = { expiresAt, result };
  const expiryTimer = setTimeout(() => {
    if (memoryCache?.expiresAt === expiresAt) memoryCache = undefined;
  }, ttl);
  expiryTimer.unref();
}

async function cachedPublicGoogleRating(): Promise<PublicRatingResult> {
  const current = Date.now();
  if (memoryCache && memoryCache.expiresAt > current) return memoryCache.result;
  memoryCache = undefined;
  if (!inFlight) {
    inFlight = publicGoogleRatingData(process.env).then(result => {
      storeInMemory(result);
      return result;
    }).finally(() => { inFlight = undefined; });
  }
  return inFlight;
}

export async function publicGoogleRatingHandler(req: IncomingMessage, res: ServerResponse) {
  if ((req.method ?? "GET").toUpperCase() !== "GET") {
    res.writeHead(405, { ...jsonHeaders, "Cache-Control": "no-store", Allow: "GET" });
    return res.end(JSON.stringify({ error: "method_not_allowed" }));
  }
  // CDN atlanıp fonksiyon doğrudan çağrılsa bile aynı sunucu örneği Google'a en çok 48 saatte bir gider.
  const result = await cachedPublicGoogleRating();
  const cache = result.status === 200
    ? { "Cache-Control": "public, max-age=0, must-revalidate", "CDN-Cache-Control": `public, s-maxage=${PUBLIC_CACHE_SECONDS}, stale-while-revalidate=900`, "Vercel-CDN-Cache-Control": `public, s-maxage=${PUBLIC_CACHE_SECONDS}, stale-while-revalidate=900` }
    : { "Cache-Control": "no-store" };
  res.writeHead(result.status, { ...jsonHeaders, ...cache });
  return res.end(JSON.stringify(result.body));
}
