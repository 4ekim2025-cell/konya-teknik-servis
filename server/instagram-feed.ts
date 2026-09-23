import type { IncomingMessage, ServerResponse } from "node:http";

type InstagramEnvironment = {
  [key: string]: string | undefined;
  INSTAGRAM_ACCESS_TOKEN?: string;
  INSTAGRAM_USER_ID?: string;
};

export type InstagramPost = {
  id: string;
  media_type: string;
  image_url: string;
  permalink: string;
};

function httpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

export async function getInstagramFeed(
  env: InstagramEnvironment = process.env,
  fetchMedia: typeof fetch = fetch,
): Promise<{ status: number; body: { data: InstagramPost[]; error?: string } }> {
  const token = env.INSTAGRAM_ACCESS_TOKEN?.trim();
  const userId = env.INSTAGRAM_USER_ID?.trim();
  if (!token || !userId) {
    return { status: 503, body: { data: [], error: "instagram_not_configured" } };
  }

  try {
    // Tokens created with "Instagram API with Instagram Login" are scoped to
    // the Instagram Graph host, not the Facebook Login Graph host.
    const url = new URL(`https://graph.instagram.com/v24.0/${encodeURIComponent(userId)}/media`);
    url.searchParams.set("fields", "id,media_type,media_url,thumbnail_url,permalink,timestamp");
    url.searchParams.set("limit", "6");
    const response = await fetchMedia(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Instagram upstream failed");
    const payload = await response.json();
    if (!Array.isArray(payload?.data)) throw new Error("Invalid Instagram response");
    const data: InstagramPost[] = payload.data.slice(0, 6).flatMap((post: Record<string, unknown> | null) => {
      if (!post || typeof post.id !== "string" || typeof post.media_type !== "string") return [];
      const image = post.media_type === "VIDEO" ? post.thumbnail_url : post.media_url;
      if (!httpsUrl(image) || !httpsUrl(post.permalink)) return [];
      const host = new URL(post.permalink).hostname;
      if (host !== "instagram.com" && !host.endsWith(".instagram.com")) return [];
      return [{ id: post.id, media_type: post.media_type, image_url: image, permalink: post.permalink }];
    });
    return { status: 200, body: { data } };
  } catch {
    // Never return upstream errors: they can contain credentials or account details.
    return { status: 502, body: { data: [], error: "instagram_unavailable" } };
  }
}

export async function instagramFeedHandler(
  req: IncomingMessage,
  res: ServerResponse,
  env: InstagramEnvironment = process.env,
) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.setHeader("Cache-Control", "no-store");
    res.statusCode = 405;
    res.end(JSON.stringify({ data: [], error: "method_not_allowed" }));
    return;
  }
  const result = await getInstagramFeed(env);
  res.statusCode = result.status;
  res.setHeader("Cache-Control", result.status === 200
    ? "public, max-age=0, s-maxage=300, stale-while-revalidate=600"
    : "no-store");
  res.end(req.method === "HEAD" ? undefined : JSON.stringify(result.body));
}
