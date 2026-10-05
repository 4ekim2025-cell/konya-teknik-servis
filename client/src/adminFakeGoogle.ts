/**
 * Testler için Google İşletme Profili API'sinin ve OAuth belirteç uç noktasının bellek içi taklidi. Gerçek `createGoogleClient` bu `fetch` ile
 * konuşur; böylece belirteç yenileme, paylaşım oluşturma ve düğme değiştirme akışı uçtan uca sınanır. Üretim koduna girmez.
 * Taklit Google belgesindeki kuralları uygular: "Hemen ara" (CALL) düğmesinde url boş olmalı, "Daha fazla bilgi" (LEARN_MORE) url ister,
 * PATCH `updateMask` ister, her istek geçerli bir erişim anahtarı taşımalıdır. Gerçek Google'a hiçbir çağrı yapılmaz.
 */
type StoredPost = { name: string; summary?: string; topicType?: string; languageCode?: string; callToAction?: { actionType?: string; url?: string }; media?: { mediaFormat?: string; sourceUrl?: string }[]; state: string };

export class FakeGoogle {
  /** "GET /v4/accounts/…" gibi istek günlüğü (adres + sorgu). */
  readonly requests: string[] = [];
  /** Gönderilen JSON gövdeleri (istek günlüğüyle aynı sırada, gövdesiz istek için null). */
  readonly bodies: (unknown | null)[] = [];
  /** Her isteğin Authorization başlığı. */
  readonly authorizations: (string | null)[] = [];
  readonly posts = new Map<string, StoredPost>();
  tokenCalls = 0;
  /** Zorunlu HTTP durumu: belirteç uç noktası ya da yazma/okuma uç noktaları için (ör. 403 = erişim onaylanmadı). */
  forceTokenStatus?: number;
  forceApiStatus?: number;
  /** Yalnızca PATCH çağrılarını reddeder. */
  forcePatchStatus?: number;
  /** Sonraki oluşturma yanıtında geçersiz bir gönderi adı döndürür. */
  badCreateName = false;
  private counter = 0;

  constructor(
    public readonly credentials = { clientId: "fake-client-id.apps.googleusercontent.com", clientSecret: "FAKE-CLIENT-SECRET-xyz", refreshToken: "1//FAKE-REFRESH-TOKEN-abc" },
    public readonly accountId = "123456789",
    public readonly locationId = "987654321",
    public readonly accessToken = "ya29.FAKE-ACCESS-TOKEN",
  ) {}

  /** Test ortamı değişkenleri: Google anahtarları bu değerlerle tanımlı sayılır. */
  env(): Record<string, string> {
    return { GOOGLE_CLIENT_ID: this.credentials.clientId, GOOGLE_CLIENT_SECRET: this.credentials.clientSecret, GOOGLE_REFRESH_TOKEN: this.credentials.refreshToken };
  }

  postName(index: number): string {
    return `accounts/${this.accountId}/locations/${this.locationId}/localPosts/${index}`;
  }

  private json(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }

  readonly fetch: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = (init?.method ?? "GET").toUpperCase();
    const headers = new Headers(init?.headers);
    const rawBody = init?.body === undefined ? undefined : String(init.body);
    this.requests.push(`${method} ${url.host}${url.pathname}${url.search}`);
    this.authorizations.push(headers.get("Authorization"));

    if (url.host === "oauth2.googleapis.com" && url.pathname === "/token") {
      this.tokenCalls++;
      this.bodies.push(rawBody ?? null);
      if (this.forceTokenStatus) return this.json(this.forceTokenStatus, { error: "zorunlu durum" });
      const form = new URLSearchParams(rawBody ?? "");
      const ok = method === "POST" && form.get("grant_type") === "refresh_token" && form.get("client_id") === this.credentials.clientId && form.get("client_secret") === this.credentials.clientSecret && form.get("refresh_token") === this.credentials.refreshToken;
      return ok ? this.json(200, { access_token: this.accessToken, expires_in: 3600, token_type: "Bearer" }) : this.json(400, { error: "invalid_grant" });
    }

    let body: unknown = null;
    if (rawBody !== undefined) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        return this.json(400, { error: { message: "geçersiz JSON" } });
      }
    }
    this.bodies.push(body);
    if (url.host !== "mybusiness.googleapis.com") return this.json(404, { error: { message: "Not Found" } });
    if (headers.get("Authorization") !== `Bearer ${this.accessToken}`) return this.json(401, { error: { message: "Unauthenticated" } });
    if (this.forceApiStatus) return this.json(this.forceApiStatus, { error: { message: "zorunlu durum" } });

    const list = new RegExp(`^/v4/accounts/${this.accountId}/locations/${this.locationId}/localPosts$`);
    if (list.test(url.pathname)) {
      if (method === "GET") return this.json(200, { localPosts: [...this.posts.values()].slice(0, Number(url.searchParams.get("pageSize") ?? 20)) });
      if (method === "POST") {
        const post = body as Partial<StoredPost> | null;
        if (!post || typeof post.summary !== "string" || !post.summary) return this.json(400, { error: { message: "summary zorunlu" } });
        if (post.topicType !== "STANDARD") return this.json(400, { error: { message: "topicType STANDARD olmalı" } });
        const action = post.callToAction;
        if (action?.actionType === "CALL" && action.url !== undefined) return this.json(400, { error: { message: "CALL için url boş olmalı" } });
        if (action?.actionType === "LEARN_MORE" && !action.url) return this.json(400, { error: { message: "LEARN_MORE için url gerekli" } });
        const name = this.badCreateName ? "../kötü-ad" : this.postName(++this.counter);
        this.posts.set(name, { ...post, name, state: "PROCESSING" } as StoredPost);
        return this.json(200, { name, state: "PROCESSING", summary: post.summary });
      }
    }

    const item = new RegExp(`^/v4/(accounts/${this.accountId}/locations/${this.locationId}/localPosts/[A-Za-z0-9_-]+)$`).exec(url.pathname);
    if (item && method === "PATCH") {
      if (this.forcePatchStatus) return this.json(this.forcePatchStatus, { error: { message: "zorunlu durum" } });
      const post = this.posts.get(item[1]);
      if (!post) return this.json(404, { error: { message: "gönderi yok" } });
      if (url.searchParams.get("updateMask") !== "callToAction") return this.json(400, { error: { message: "updateMask zorunlu" } });
      const action = (body as { callToAction?: { actionType?: string; url?: string } } | null)?.callToAction;
      if (!action?.actionType) return this.json(400, { error: { message: "callToAction zorunlu" } });
      if (action.actionType === "CALL" && action.url !== undefined) return this.json(400, { error: { message: "CALL için url boş olmalı" } });
      post.callToAction = { actionType: action.actionType };
      return this.json(200, post);
    }

    return this.json(404, { error: { message: "Not Found" } });
  };
}
