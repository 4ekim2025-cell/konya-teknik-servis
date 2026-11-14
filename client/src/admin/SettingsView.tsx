import { useEffect, useState } from "react";
import { validateSettings, type PanelSettings } from "@shared/blog-social";
import { api, ApiError } from "./api";

const errorText = (failure: unknown, fallback: string) => (failure instanceof ApiError ? (failure.errors?.length ? failure.errors[0] : failure.message) : fallback);

/**
 * Google Business Profile bağlantısı: aynı hesap hem blog gönderilerini yayımlar hem yorumları salt okunur biçimde getirir.
 * "API var" için hesap ve konum kimliği buraya yazılır; Google anahtarları (OAuth) yalnızca Vercel ortam değişkenidir, panelde görünmez ve istenmez.
 */
export default function SettingsView({ notify }: { notify: (message: string) => void }) {
  const [saved, setSaved] = useState<PanelSettings | null>(null);
  const [mode, setMode] = useState<"none" | "api">("none");
  const [accountId, setAccountId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [sendPhoto, setSendPhoto] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [problem, setProblem] = useState("");
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  const adopt = (settings: PanelSettings) => {
    setSaved(settings);
    setMode(settings.google.mode);
    setAccountId(settings.google.accountId ?? "");
    setLocationId(settings.google.locationId ?? "");
    setSendPhoto(settings.google.sendPhoto);
  };

  useEffect(() => {
    let alive = true;
    api.settings().then(response => { if (!alive) return; adopt(response.settings); setConfigured(response.googleConfigured); setProblem(response.problem ?? ""); }).catch(failure => { if (alive) setLoadError(errorText(failure, "Ayarlar alınamadı.")); });
    return () => { alive = false; };
  }, []);

  const draft = { google: { mode, ...(mode === "api" ? { accountId: accountId.trim(), locationId: locationId.trim() } : {}), sendPhoto } };
  const checked = validateSettings(draft);
  const dirty = saved ? JSON.stringify(checked.ok ? checked.settings : draft) !== JSON.stringify(saved) : false;

  const save = async () => {
    if (!checked.ok) return;
    setBusy("save");
    setErrors([]);
    setTestResult(null);
    try {
      const result = await api.saveSettings(checked.settings);
      adopt(result.settings);
      setConfigured(result.googleConfigured);
      setProblem("");
      notify(result.noChange ? "Ayarlarda değişiklik yok." : "Ayarlar kaydedildi.");
    } catch (failure) {
      setErrors([errorText(failure, "Ayarlar kaydedilemedi.")]);
    } finally {
      setBusy("");
    }
  };

  const test = async () => {
    setBusy("test");
    setTestResult(null);
    try {
      await api.googleTest();
      setTestResult({ ok: true, text: "Bağlantı çalışıyor: OAuth anahtarı alındı, hesap/konum erişildi ve yorumlar salt okunur biçimde okunabildi. Hiçbir şey değiştirilmedi veya paylaşılmadı." });
    } catch (failure) {
      setTestResult({ ok: false, text: errorText(failure, "Bağlantı sınanamadı.") });
    } finally {
      setBusy("");
    }
  };

  if (loadError) return <p className="admin-error" role="alert">{loadError}</p>;
  if (!saved) return <p className="admin-muted">Yükleniyor…</p>;

  return (
    <section className="admin-settings">
      <h2>Ayarlar</h2>
      {problem && <p className="admin-error" role="alert">{problem}</p>}
      <fieldset className="admin-box">
        <legend>Google Business Profile bağlantısı</legend>
        <p className="admin-muted">Bu tek bağlantı blog yazılarını Google Business Profile’a göndermek ve Google yorumlarını salt okunur biçimde almak için kullanılır.</p>
        <div role="radiogroup" aria-label="Google Business Profile modu">
          <label className="admin-check"><input type="radio" name="gbp-mode" checked={mode === "none"} onChange={() => setMode("none")} /><span><strong>API yok</strong> (varsayılan) — blog paylaşımını elle yapar, izinli müşteri yorumlarını Google Yorumları bölümünden manuel yönetirsiniz.</span></label>
          <label className="admin-check"><input type="radio" name="gbp-mode" checked={mode === "api"} onChange={() => setMode("api")} /><span><strong>API var</strong> — aynı bağlantı blog gönderilerini yönetir ve yorumları okur. Google’dan API erişim onayı gerektirir.</span></label>
        </div>
        {mode === "api" && (
          <div className="admin-sub">
            <label className="admin-field"><span>Hesap kimliği <small>(yalnızca rakamlar; “accounts/” sonrası)</small></span><input inputMode="numeric" value={accountId} onChange={event => setAccountId(event.target.value)} /></label>
            <label className="admin-field"><span>Konum kimliği <small>(yalnızca rakamlar; “locations/” sonrası)</small></span><input inputMode="numeric" value={locationId} onChange={event => setLocationId(event.target.value)} /></label>
            <label className="admin-check"><input type="checkbox" checked={sendPhoto} onChange={event => setSendPhoto(event.target.checked)} /><span>Gönderiye kapak fotoğrafını ekle <small>(Google belgesi JPG/PNG sayar; panel fotoğrafları WebP’dir. Denenmedi: Google reddederse bu kutuyu kapatın.)</small></span></label>
            <p className={configured ? "admin-ok" : "admin-note"}>Google anahtarları (Vercel ortam değişkeni): {configured ? "tanımlı" : "tanımlı değil — GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET ve GOOGLE_REFRESH_TOKEN eklenmeli (docs/blog-paneli-kurulum.md bölüm 3d)"}. Değerler panelde gösterilmez.</p>
          </div>
        )}
        {!checked.ok && <p className="admin-error" role="alert">{checked.errors[0].replace(/^[A-Za-z0-9_.]+: /, "")}</p>}
        {errors.length > 0 && <div className="admin-error" role="alert"><ul>{errors.map(line => <li key={line}>{line}</li>)}</ul></div>}
        <div className="admin-inline admin-wrap">
          <button type="button" className="admin-btn admin-btn-primary" disabled={!dirty || !checked.ok || Boolean(busy)} onClick={save}>{busy === "save" ? "Kaydediliyor…" : "Ayarları kaydet"}</button>
          {saved.google.mode === "api" && <button type="button" className="admin-btn" disabled={dirty || !configured || Boolean(busy)} onClick={test}>{busy === "test" ? "Sınanıyor…" : "Bağlantıyı sına"}</button>}
        </div>
        {saved.google.mode === "api" && dirty && <p className="admin-muted">Bağlantıyı sınamadan önce ayarları kaydedin.</p>}
        {testResult && <p className={testResult.ok ? "admin-ok" : "admin-error"} role="status">{testResult.text}</p>}
      </fieldset>
      <p className="admin-muted">OAuth anahtarları ve panel ayarları ziyaretçi paketine girmez. Bağlantı ayarı değiştiğinde yalnız sunucu tarafındaki puan yapılandırmasını güncellemek için site yeniden oluşturulur.</p>
    </section>
  );
}
