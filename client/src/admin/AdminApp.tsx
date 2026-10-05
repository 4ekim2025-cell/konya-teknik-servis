import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type PostItem, type PostsResponse } from "./api";
import PostsView from "./PostsView";
import EditorView from "./EditorView";
import SocialPackage from "./SocialPackage";
import SettingsView from "./SettingsView";
import { BuildsView, OverviewView } from "./InsightViews";
import "./admin.css";

type Tab = "posts" | "overview" | "builds" | "settings";
type Screen = { name: "tab"; tab: Tab } | { name: "editor"; item: PostItem | null } | { name: "package"; item: PostItem };

function Login({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.login(password);
      setPassword("");
      onDone();
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : "Giriş yapılamadı.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="admin-login" onSubmit={submit}>
      <h1>Yönetim</h1>
      <label className="admin-field"><span>Parola</span><input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} autoFocus /></label>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <button className="admin-btn admin-btn-primary" disabled={busy || !password}>{busy ? "Kontrol ediliyor…" : "Giriş yap"}</button>
    </form>
  );
}

function Panel({ onLogout }: { onLogout: () => void }) {
  const [data, setData] = useState<PostsResponse | null>(null);
  const [error, setError] = useState("");
  const [screen, setScreen] = useState<Screen>({ name: "tab", tab: "posts" });
  const [toast, setToast] = useState("");

  const reload = useCallback(async (): Promise<PostsResponse | null> => {
    try {
      const next = await api.posts();
      setData(next);
      setError("");
      return next;
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) { onLogout(); return null; }
      setError(failure instanceof ApiError ? failure.message : "Yazılar alınamadı.");
      return null;
    }
  }, [onLogout]);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(""), 6000); return () => window.clearTimeout(id); }, [toast]);

  const tab = screen.name === "tab" ? screen.tab : "posts";
  const logout = async () => { try { await api.logout(); } finally { onLogout(); } };

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <strong>Eşli Teknik · Blog yönetimi</strong>
        <nav aria-label="Bölümler">
          {([["posts", "Yazılar"], ["overview", "Genel bakış"], ["builds", "Yayın durumu"], ["settings", "Ayarlar"]] as [Tab, string][]).map(([name, label]) => (
            <button key={name} className={`admin-tab ${tab === name && screen.name === "tab" ? "is-active" : ""}`} onClick={() => setScreen({ name: "tab", tab: name })}>{label}</button>
          ))}
        </nav>
        <button className="admin-btn" onClick={logout}>Çıkış</button>
      </header>
      {toast && <p className="admin-toast" role="status">{toast}</p>}
      {error && <p className="admin-error" role="alert">{error} <button className="admin-link" onClick={() => void reload()}>Yeniden dene</button></p>}
      {!data && !error && <p className="admin-muted">Yükleniyor…</p>}
      {data && screen.name === "editor" && <EditorView key={screen.item?.post.slug ?? "yeni"} data={data} item={screen.item} reload={reload} notify={setToast} onPackage={item => setScreen({ name: "package", item })} onClose={() => setScreen({ name: "tab", tab: "posts" })} />}
      {data && screen.name === "package" && <SocialPackage key={screen.item.post.slug} post={screen.item.post} notify={setToast} onClose={() => setScreen({ name: "tab", tab: "posts" })} />}
      {data && screen.name === "tab" && screen.tab === "posts" && <PostsView data={data} notify={setToast} onChanged={async () => { await reload(); }} onNew={() => setScreen({ name: "editor", item: null })} onEdit={item => setScreen({ name: "editor", item })} onPackage={item => setScreen({ name: "package", item })} />}
      {data && screen.name === "tab" && screen.tab === "overview" && <OverviewView data={data} />}
      {screen.name === "tab" && screen.tab === "builds" && <BuildsView />}
      {screen.name === "tab" && screen.tab === "settings" && <SettingsView notify={setToast} />}
    </div>
  );
}

/** /yonetim/ — arama motoruna kapalı, tek kullanıcılı blog paneli. Ayrı (lazy) parça olarak yüklenir; ziyaretçi sayfalarını etkilemez. */
export default function AdminApp() {
  const [state, setState] = useState<"loading" | "login" | "panel" | "setup" | "error">("loading");
  const check = useCallback(() => {
    api.session().then(session => setState(!session.configured ? "setup" : session.authenticated ? "panel" : "login")).catch(() => setState("error"));
  }, []);
  useEffect(check, [check]);

  if (state === "loading") return <p className="admin-muted admin-center">Yükleniyor…</p>;
  if (state === "error") return <p className="admin-error admin-center">Panele ulaşılamadı. <button className="admin-link" onClick={check}>Yeniden dene</button></p>;
  if (state === "setup") return <p className="admin-center">Panel henüz kurulmadı. Kurulum adımları <code>docs/blog-paneli-kurulum.md</code> dosyasındadır.</p>;
  if (state === "login") return <Login onDone={() => setState("panel")} />;
  return <Panel onLogout={() => setState("login")} />;
}
