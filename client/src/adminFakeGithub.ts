/**
 * Testler için GitHub REST API'sinin bellek içi taklidi. Gerçek `createGithubClient` bu `fetch` ile konuşur; böylece
 * ağaç/commit/dal ilerletme akışı ve yol izinleri uçtan uca sınanır. Üretim koduna girmez.
 */
import { createHash } from "node:crypto";

type Snapshot = Map<string, string>;
type FakeCommit = { sha: string; parent?: string; message: string; date: string; files: Snapshot };
type TreeEntry = { path: string; content?: string; sha?: string | null };

export class FakeGithubRepo {
  readonly commits = new Map<string, FakeCommit>();
  head: string;
  /** İstek günlüğü: "GET /contents/..." gibi. */
  readonly requests: string[] = [];
  /** Yazma çağrıları (ağaç, commit, dal güncelleme). */
  writes = 0;
  /** İlk N dal güncellemesini "ileri sarma değil" diye reddeder (eşzamanlı yazma benzetimi). */
  failRefUpdates = 0;
  /** Her çağrıya verilecek zorunlu HTTP durumu (ör. 401 benzetimi). */
  forceStatus?: number;
  readonly statuses = new Map<string, { state: string; statuses: { context: string; state: string; description: string; target_url?: string }[] }>();
  private trees = new Map<string, { base: Snapshot; entries: TreeEntry[] }>();
  private counter = 0;

  constructor(initial: Record<string, string>, public readonly token = "ghp_TESTTOKEN123456", public readonly branch = "main", private owner = "o", private repo = "r") {
    const root = this.makeCommit(undefined, new Map(Object.entries(initial)), "ilk commit");
    this.head = root.sha;
  }

  private makeCommit(parent: string | undefined, files: Snapshot, message: string): FakeCommit {
    const sha = createHash("sha1").update(`${++this.counter}|${message}|${parent ?? ""}`).digest("hex");
    const commit: FakeCommit = { sha, parent, message, date: `2026-10-0${Math.min(9, this.counter)}T10:00:00Z`, files };
    this.commits.set(sha, commit);
    return commit;
  }

  /** Dışarıdan (ör. başka bir kişi) yapılmış bir commit benzetimi. */
  externalCommit(changes: Record<string, string | null>, message = "dış commit"): string {
    const files = new Map(this.commits.get(this.head)!.files);
    for (const [path, content] of Object.entries(changes)) content === null ? files.delete(path) : files.set(path, content);
    this.head = this.makeCommit(this.head, files, message).sha;
    return this.head;
  }

  headFiles(): Snapshot {
    return this.commits.get(this.head)!.files;
  }

  file(path: string): string | undefined {
    return this.headFiles().get(path);
  }

  /** Dalın tüm commit'leri, en yeni önce. */
  log(): FakeCommit[] {
    const out: FakeCommit[] = [];
    for (let sha: string | undefined = this.head; sha; sha = this.commits.get(sha)?.parent) out.push(this.commits.get(sha)!);
    return out;
  }

  private json(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }

  readonly fetch: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = (init?.method ?? "GET").toUpperCase();
    const headers = new Headers(init?.headers);
    const prefix = `/repos/${this.owner}/${this.repo}`;
    this.requests.push(`${method} ${url.pathname.replace(prefix, "")}${url.search}`);
    if (method !== "GET") this.writes++;

    if (this.forceStatus) return this.json(this.forceStatus, { message: "zorunlu durum" });
    if (headers.get("Authorization") !== `Bearer ${this.token}`) return this.json(401, { message: "Bad credentials" });
    if (!url.pathname.startsWith(prefix)) return this.json(404, { message: "Not Found" });
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;

    if (method === "GET" && path === `/git/ref/heads/${this.branch}`) return this.json(200, { object: { sha: this.head } });
    if (method === "GET" && path.startsWith("/git/commits/")) {
      const commit = this.commits.get(path.slice("/git/commits/".length));
      return commit ? this.json(200, { sha: commit.sha, tree: { sha: `tree-${commit.sha}` } }) : this.json(404, { message: "Not Found" });
    }

    if (method === "GET" && path.startsWith("/contents/")) {
      const target = path.slice("/contents/".length);
      const ref = url.searchParams.get("ref") ?? this.head;
      const files = this.commits.get(ref)?.files;
      if (!files) return this.json(404, { message: "No commit found for the ref" });
      if (files.has(target)) return new Response(files.get(target)!, { status: 200 });
      const dir = `${target.replace(/\/$/, "")}/`;
      const names = [...files.keys()].filter(file => file.startsWith(dir) && !file.slice(dir.length).includes("/")).map(file => ({ name: file.slice(dir.length), type: "file" }));
      return names.length ? this.json(200, names) : this.json(404, { message: "Not Found" });
    }

    if (method === "POST" && path === "/git/trees") {
      const baseCommit = [...this.commits.values()].find(commit => `tree-${commit.sha}` === body.base_tree);
      if (!baseCommit) return this.json(422, { message: "base_tree bulunamadı" });
      const id = `newtree-${++this.counter}`;
      this.trees.set(id, { base: baseCommit.files, entries: body.tree });
      return this.json(201, { sha: id });
    }

    if (method === "POST" && path === "/git/commits") {
      const tree = this.trees.get(body.tree);
      if (!tree || !this.commits.has(body.parents[0])) return this.json(422, { message: "ağaç ya da üst commit yok" });
      const files = new Map(tree.base);
      for (const entry of tree.entries) {
        if (entry.sha === null) {
          if (!files.has(entry.path)) return this.json(422, { message: `Silinecek dosya yok: ${entry.path}` });
          files.delete(entry.path);
        } else files.set(entry.path, entry.content ?? "");
      }
      return this.json(201, { sha: this.makeCommit(body.parents[0], files, body.message).sha });
    }

    if (method === "PATCH" && path === `/git/refs/heads/${this.branch}`) {
      if (this.failRefUpdates > 0) {
        this.failRefUpdates--;
        return this.json(422, { message: "Update is not a fast forward" });
      }
      const next = this.commits.get(body.sha);
      if (!next || next.parent !== this.head || body.force === true) return this.json(422, { message: "Update is not a fast forward" });
      this.head = next.sha;
      return this.json(200, { object: { sha: next.sha } });
    }

    if (method === "GET" && path === "/commits") {
      const filePath = url.searchParams.get("path");
      const limit = Number(url.searchParams.get("per_page") ?? 30);
      const rows = this.log().filter(commit => {
        if (!filePath) return true;
        const before = commit.parent ? this.commits.get(commit.parent)!.files.get(filePath) : undefined;
        return commit.files.get(filePath) !== before;
      });
      return this.json(200, rows.slice(0, limit).map(commit => ({ sha: commit.sha, commit: { message: commit.message, author: { name: "Panel Sahibi", date: commit.date } } })));
    }

    const status = /^\/commits\/([0-9a-f]+)\/status$/.exec(path);
    if (method === "GET" && status) return this.json(200, this.statuses.get(status[1]) ?? { state: "pending", statuses: [] });

    return this.json(404, { message: "Not Found" });
  };
}
