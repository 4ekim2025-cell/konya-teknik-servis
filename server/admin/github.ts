/**
 * Panelin GitHub bağlantısı: içerik dosyalarını okur, tek commit'te yazar/siler, geçmişi ve derleme durumunu getirir.
 * Yalnızca REST API'si ve `fetch` kullanılır (ek bağımlılık yok). Yanıt gövdeleri ve anahtar hata iletilerine asla konmaz.
 *
 * Yazma güvenliği: `commit` yalnızca verilen `allowedPrefixes`/`allowedFiles` içindeki yollara yazabilir. Varsayılan izin
 * `content/` altı ile derleyicinin ürettiği üç dosyadır; başka bir yol verilirse commit hiç başlamadan reddedilir.
 */

export type GithubConfig = { token: string; owner: string; repo: string; branch: string };

export type GithubErrorKind = "auth" | "notfound" | "conflict" | "rate" | "other";
export class GithubError extends Error {
  constructor(public kind: GithubErrorKind, public status: number, message: string) {
    super(message);
    this.name = "GithubError";
  }
}

/** Panelin yazabildiği yollar: içerik klasörü ve `scripts/build-content.ts`'in ürettiği üç dosya. */
export const WRITABLE_PREFIXES: readonly string[] = ["content/"];
export const WRITABLE_FILES: readonly string[] = ["shared/blog-content.generated.ts", "client/public/sitemap.xml", "client/public/llms.txt"];

const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const BRANCH_PATTERN = /^[A-Za-z0-9._/-]+$/;
export const DEFAULT_REPO = "4ekim2025-cell/konya-teknik-servis";

type Env = Record<string, string | undefined>;

/**
 * Ortam değişkenlerinden GitHub ayarını okar.
 *  - `GITHUB_CONTENT_TOKEN`: yalnızca bu depoya, yalnızca "Contents: read & write" izinli anahtar.
 *  - `GITHUB_REPO` (varsayılan: bu depo), `GITHUB_BRANCH`: verilmezse üretimde `main`, Vercel önizlemesinde önizlemenin kendi dalı;
 *    böylece önizlemede denenen yazılar `main`'e gitmez.
 */
export function readGithubConfig(env: Env): GithubConfig | undefined {
  const token = env.GITHUB_CONTENT_TOKEN?.trim();
  const repoValue = (env.GITHUB_REPO?.trim() || DEFAULT_REPO);
  if (!token || !REPO_PATTERN.test(repoValue)) return undefined;
  const preview = env.VERCEL_ENV === "preview" && env.VERCEL_GIT_COMMIT_REF?.trim();
  const branch = env.GITHUB_BRANCH?.trim() || (preview ? preview : "main");
  if (!BRANCH_PATTERN.test(branch) || branch.includes("..")) return undefined;
  const [owner, repo] = repoValue.split("/");
  return { token, owner, repo, branch };
}

export type CommitChange = { upserts: { path: string; content: string }[]; deletes: string[] };
export type HistoryEntry = { sha: string; message: string; date: string; author: string };
export type BuildStatus = { sha: string; message: string; date: string; state: "success" | "pending" | "failure" | "unknown"; description: string; url?: string };

const encodePath = (value: string) => value.split("/").map(encodeURIComponent).join("/");

function isWritable(path: string, prefixes: readonly string[], files: readonly string[]): boolean {
  if (path.includes("..") || path.startsWith("/") || path.includes("\\")) return false;
  return files.includes(path) || prefixes.some(prefix => path.startsWith(prefix) && path.length > prefix.length);
}

export function createGithubClient(
  config: GithubConfig,
  fetchImpl: typeof fetch = fetch,
  access: { prefixes: readonly string[]; files: readonly string[] } = { prefixes: WRITABLE_PREFIXES, files: WRITABLE_FILES },
) {
  const base = `https://api.github.com/repos/${config.owner}/${config.repo}`;

  async function request(path: string, init: { method?: string; body?: unknown; accept?: string } = {}): Promise<Response> {
    let response: Response;
    try {
      response = await fetchImpl(`${base}${path}`, {
        method: init.method ?? "GET",
        headers: {
          Authorization: `Bearer ${config.token}`,
          Accept: init.accept ?? "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "esliteknik-panel",
          ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new GithubError("other", 0, "GitHub'a ulaşılamadı");
    }
    if (response.ok) return response;
    const limited = response.status === 429 || (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0");
    if (limited) throw new GithubError("rate", response.status, "GitHub istek sınırına ulaşıldı");
    if (response.status === 401 || response.status === 403) throw new GithubError("auth", response.status, "GitHub anahtarı geçersiz ya da yetkisiz");
    if (response.status === 404) throw new GithubError("notfound", 404, "GitHub'da bulunamadı");
    if (response.status === 409 || response.status === 422) throw new GithubError("conflict", response.status, "GitHub isteği reddetti");
    throw new GithubError("other", response.status, `GitHub hatası (${response.status})`);
  }

  const json = async <T>(path: string, init?: Parameters<typeof request>[1]) => (await request(path, init)).json() as Promise<T>;

  return {
    config,

    /** Dalın son commit'i. */
    async headSha(): Promise<string> {
      const data = await json<{ object?: { sha?: string } }>(`/git/ref/heads/${encodePath(config.branch)}`);
      if (!data.object?.sha) throw new GithubError("other", 0, "Dal bilgisi okunamadı");
      return data.object.sha;
    },

    /** Dosyanın metni; yoksa `null`. */
    async readFile(path: string, ref: string): Promise<string | null> {
      try {
        return await (await request(`/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`, { accept: "application/vnd.github.raw+json" })).text();
      } catch (error) {
        if (error instanceof GithubError && error.kind === "notfound") return null;
        throw error;
      }
    },

    /** Klasördeki dosya adları; klasör yoksa boş liste. */
    async listFiles(path: string, ref: string): Promise<string[]> {
      try {
        const data = await json<{ name: string; type: string }[]>(`/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`);
        return Array.isArray(data) ? data.filter(entry => entry.type === "file").map(entry => entry.name) : [];
      } catch (error) {
        if (error instanceof GithubError && error.kind === "notfound") return [];
        throw error;
      }
    },

    /**
     * Tek commit'te dosya ekler/değiştirir/siler ve dalı ilerletir (zorla yazmaz).
     * `parent`: değişiklikler hesaplanırken görülen son commit; dal bu arada ilerlediyse `conflict` hatası verir.
     */
    async commit(change: CommitChange, message: string, parent: string): Promise<string> {
      const paths = [...change.upserts.map(file => file.path), ...change.deletes];
      if (paths.length === 0) throw new GithubError("other", 0, "Yazılacak değişiklik yok");
      const forbidden = paths.find(path => !isWritable(path, access.prefixes, access.files));
      if (forbidden) throw new GithubError("auth", 0, `Bu yola yazma izni yok: ${forbidden}`);

      const parentCommit = await json<{ tree?: { sha?: string } }>(`/git/commits/${parent}`);
      if (!parentCommit.tree?.sha) throw new GithubError("other", 0, "Commit ağacı okunamadı");
      const tree = await json<{ sha: string }>("/git/trees", {
        method: "POST",
        body: {
          base_tree: parentCommit.tree.sha,
          tree: [
            ...change.upserts.map(file => ({ path: file.path, mode: "100644", type: "blob", content: file.content })),
            ...change.deletes.map(path => ({ path, mode: "100644", type: "blob", sha: null })),
          ],
        },
      });
      const commit = await json<{ sha: string }>("/git/commits", { method: "POST", body: { message, tree: tree.sha, parents: [parent] } });
      await request(`/git/refs/heads/${encodePath(config.branch)}`, { method: "PATCH", body: { sha: commit.sha, force: false } });
      return commit.sha;
    },

    /** Bir dosyanın commit geçmişi (en yeni önce). */
    async history(path: string, limit = 20): Promise<HistoryEntry[]> {
      const rows = await json<{ sha: string; commit: { message: string; author?: { name?: string; date?: string } } }[]>(
        `/commits?sha=${encodeURIComponent(config.branch)}&path=${encodeURIComponent(path)}&per_page=${limit}`,
      );
      return rows.map(row => ({ sha: row.sha, message: row.commit.message.split("\n")[0], date: row.commit.author?.date ?? "", author: row.commit.author?.name ?? "" }));
    },

    /** Dalın son commit'leri ve her biri için Vercel'in GitHub'a bildirdiği derleme durumu. */
    async builds(limit = 6): Promise<BuildStatus[]> {
      const commits = await json<{ sha: string; commit: { message: string; author?: { date?: string } } }[]>(`/commits?sha=${encodeURIComponent(config.branch)}&per_page=${limit}`);
      return Promise.all(
        commits.map(async row => {
          const base: Omit<BuildStatus, "state" | "description"> = { sha: row.sha, message: row.commit.message.split("\n")[0], date: row.commit.author?.date ?? "" };
          try {
            const status = await json<{ state?: string; statuses?: { context?: string; state?: string; description?: string; target_url?: string }[] }>(`/commits/${row.sha}/status`);
            const vercel = status.statuses?.find(item => /vercel/i.test(item.context ?? "")) ?? status.statuses?.[0];
            if (!vercel) return { ...base, state: "unknown" as const, description: "Derleme bilgisi yok" };
            const state = vercel.state === "success" ? "success" : vercel.state === "pending" ? "pending" : vercel.state === "failure" || vercel.state === "error" ? "failure" : "unknown";
            return { ...base, state, description: vercel.description ?? "", ...(vercel.target_url ? { url: vercel.target_url } : {}) };
          } catch (error) {
            if (error instanceof GithubError && (error.kind === "auth" || error.kind === "rate")) throw error;
            return { ...base, state: "unknown" as const, description: "Derleme bilgisi alınamadı" };
          }
        }),
      );
    },
  };
}

export type GithubClient = ReturnType<typeof createGithubClient>;

/** Sıralı sonuç döndüren, eşzamanlılığı sınırlı `Promise.all`. */
export async function mapLimit<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await task(items[index]);
      }
    }),
  );
  return results;
}
