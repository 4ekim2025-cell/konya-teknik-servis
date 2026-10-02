import type { BlogPostInput } from "@shared/blog-schema";
import type { AiCaseInput } from "@shared/blog-ai";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public errors?: string[]) {
    super(message);
  }
}

export type PostItem = { post: BlogPostInput; hash: string };
export type Redirect = { from: string; to: string; date: string };
export type PostsResponse = { head: string; branch: string; repo: string; items: PostItem[]; problems: { file: string; errors: string[] }[]; redirects: Redirect[] };
export type SaveResponse = { noChange: true } | { noChange: false; commit: string; slug: string; status: "draft" | "published"; warnings: string[]; siteAffecting: boolean };
export type DeleteResponse = { commit: string; slug: string; redirectedTo?: string; wasPublished: boolean };
export type HistoryEntry = { sha: string; message: string; date: string; author: string };
export type BuildRow = { sha: string; message: string; date: string; state: "success" | "pending" | "failure" | "unknown"; description: string; url?: string; skipped: boolean };
export type AiDraftResponse = { post: BlogPostInput; googleBusiness: string; instagram: string; provider: string; attempts: number; remaining: number };
export type Session = { configured: boolean; authenticated: boolean };

type Options = { method?: "GET" | "POST"; query?: Record<string, string>; body?: unknown };

/** Tek uç nokta: /api/admin?action=... Her istek x-admin-request başlığını taşır (CSRF koruması sunucuda doğrulanır). */
async function call<T>(action: string, { method = "GET", query = {}, body }: Options = {}): Promise<T> {
  const params = new URLSearchParams({ action, ...query });
  let response: Response;
  try {
    response = await fetch(`/api/admin?${params}`, {
      method,
      credentials: "same-origin",
      headers: { "x-admin-request": "1", ...(method === "POST" ? { "Content-Type": "application/json" } : {}) },
      ...(method === "POST" ? { body: JSON.stringify(body ?? {}) } : {}),
    });
  } catch {
    throw new ApiError(0, "network", "Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.");
  }
  let data: Record<string, unknown> = {};
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    /* gövde yok ya da JSON değil */
  }
  if (!response.ok) throw new ApiError(response.status, String(data.error ?? "error"), String(data.message ?? "İstek başarısız oldu."), Array.isArray(data.errors) ? (data.errors as string[]) : undefined);
  return data as T;
}

export const api = {
  session: () => call<Session>("session"),
  login: (password: string) => call<{ ok: true }>("login", { method: "POST", body: { password } }),
  logout: () => call<{ ok: true }>("logout", { method: "POST" }),
  posts: () => call<PostsResponse>("posts"),
  save: (body: { post: BlogPostInput; mode: "draft" | "publish"; previousSlug?: string; baseHash?: string }) => call<SaveResponse>("save", { method: "POST", body }),
  remove: (body: { slug: string; confirm: boolean; redirectTo?: string }) => call<DeleteResponse>("delete", { method: "POST", body }),
  history: (slug: string) => call<{ entries: HistoryEntry[] }>("history", { query: { slug } }),
  version: (slug: string, sha: string) => call<{ post: BlogPostInput }>("version", { query: { slug, sha } }),
  builds: () => call<{ rows: BuildRow[] }>("builds"),
  /** Yapay zeka taslağı: yalnızca editöre dolacak metni döndürür; hiçbir şey kaydetmez. */
  aiDraft: (input: AiCaseInput) => call<AiDraftResponse>("ai-draft", { method: "POST", body: { input } }),
};
