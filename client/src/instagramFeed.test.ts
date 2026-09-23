import { afterEach, describe, expect, it, vi } from "vitest";
import { getInstagramFeed, instagramFeedHandler } from "../../server/instagram-feed";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

const env = { INSTAGRAM_ACCESS_TOKEN: "test-token", INSTAGRAM_USER_ID: "1234" };
const photo = (id: string) => ({ id, media_type: "IMAGE", media_url: `https://example.com/${id}.jpg`, permalink: `https://www.instagram.com/p/${id}/` });
afterEach(() => vi.unstubAllGlobals());

describe("Instagram feed", () => {
  it("reports missing credentials without calling Instagram", async () => {
    const upstream = vi.fn();
    expect(await getInstagramFeed({}, upstream)).toEqual({ status: 503, body: { data: [], error: "instagram_not_configured" } });
    expect(upstream).not.toHaveBeenCalled();
  });

  it("returns six posts and uses a video thumbnail instead of an MP4", async () => {
    const video = { ...photo("video"), media_type: "VIDEO", media_url: "https://example.com/video.mp4", thumbnail_url: "https://example.com/cover.jpg" };
    const upstream = vi.fn().mockResolvedValue(Response.json({ data: [video, ...Array.from({ length: 7 }, (_, i) => photo(String(i)))] }));
    const result = await getInstagramFeed(env, upstream);
    expect(result.status).toBe(200);
    expect(result.body.data).toHaveLength(6);
    expect(result.body.data[0].image_url).toBe(video.thumbnail_url);
    const [url, options] = upstream.mock.calls[0];
    expect(url.origin).toBe("https://graph.instagram.com");
    expect(url.pathname).toBe("/v24.0/1234/media");
    expect(url.toString()).not.toContain(env.INSTAGRAM_ACCESS_TOKEN);
    expect(options.headers.Authorization).toBe("Bearer test-token");
  });

  it("omits media without a usable image or Instagram permalink", async () => {
    const upstream = vi.fn().mockResolvedValue(Response.json({ data: [null, { ...photo("a"), media_url: "javascript:alert(1)" }, { ...photo("b"), permalink: "https://example.com/" }, { ...photo("c"), media_type: "VIDEO" }, photo("valid")] }));
    expect((await getInstagramFeed(env, upstream)).body.data.map(post => post.id)).toEqual(["valid"]);
  });

  it.each(["expired", "malformed", "timeout"])("handles %s upstream failures without exposing credentials", async failure => {
    const upstream = vi.fn();
    if (failure === "expired") upstream.mockResolvedValue(new Response("test-token expired", { status: 401 }));
    if (failure === "malformed") upstream.mockResolvedValue(Response.json({ unexpected: true }));
    if (failure === "timeout") upstream.mockRejectedValue(new Error("test-token timed out"));
    expect(await getInstagramFeed(env, upstream)).toEqual({ status: 502, body: { data: [], error: "instagram_unavailable" } });
  });

  it("serves JSON, rejects writes and does not cache configuration failures", async () => {
    const server = createServer((req, res) => { void instagramFeedHandler(req, res, {}); });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    try {
      const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/instagram-feed`;
      const response = await fetch(url);
      expect(response.status).toBe(503);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect((await response.json()).error).toBe("instagram_not_configured");
      expect((await fetch(url, { method: "HEAD" })).status).toBe(503);
      const post = await fetch(url, { method: "POST" });
      expect(post.status).toBe(405);
      expect(post.headers.get("allow")).toBe("GET, HEAD");
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
});
