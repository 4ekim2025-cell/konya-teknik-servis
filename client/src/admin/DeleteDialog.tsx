import { useEffect, useState } from "react";
import { GOOGLE_BUSINESS_URL } from "@shared/business-contact";
import { api, ApiError, type PostItem, type SettingsResponse, type SocialResponse } from "./api";
import { imageCount, isPublished } from "./editorModel";

/** Yayındaki yazı için onay, isteğe bağlı yönlendirme ve Google İşletme hatırlatması; taslak doğrudan silinir (bu bileşen açılmaz). */
export default function DeleteDialog({ item, onClose, onDeleted }: { item: PostItem; onClose: () => void; onDeleted: (message: string) => void }) {
  const { post } = item;
  const targets = [post.servicePath, post.brandPath, "/blog/"].filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);
  const [redirect, setRedirect] = useState(true);
  const [target, setTarget] = useState(targets[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Paylaşım durumu: Google'da paylaşılmış yazının düğmesi silmeden sonra "Hemen ara"ya çevrilmeli; panel mümkünse bunu kendisi yapar.
  const [social, setSocial] = useState<SocialResponse | null>(null);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  useEffect(() => {
    let alive = true;
    api.social(post.slug).then(value => { if (alive) setSocial(value); }).catch(() => undefined);
    api.settings().then(value => { if (alive) setSettings(value); }).catch(() => undefined);
    return () => { alive = false; };
  }, [post.slug]);
  const googleShared = social?.record?.shared.google;
  const autoSwitch = googleShared?.via === "api" && settings?.settings.google.mode === "api" && settings.googleConfigured;

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await api.remove({ slug: post.slug, confirm: true, ...(redirect ? { redirectTo: target } : {}) });
      const where = result.redirectedTo ? `Yazı silindi; ${post.slug} adresi ${result.redirectedTo} sayfasına yönlendirilecek.` : `Yazı silindi; ${post.slug} adresi 404 verecek.`;
      const photos = result.imagesDeleted ? ` ${result.imagesDeleted} fotoğraf dosyası da silindi.` : result.imagesNote === "kept_preview" ? " Fotoğraflar silinmedi (önizleme paneli canlı depoyu paylaşır; canlı panelde silin ya da temizleyin)." : result.imagesNote === "failed" ? " Fotoğraflar silinemedi; Genel bakış → Fotoğraf depolama → “Kullanılmayanları temizle” ile alınır." : "";
      const google = result.google === "switched" ? " Google’daki paylaşımın düğmesi “Hemen ara” olarak değiştirildi." : result.google === "failed" ? " Google’daki paylaşımın düğmesi otomatik değiştirilemedi; profilde elle “Hemen ara” yapın." : result.google === "manual" ? " Google’daki paylaşımın düğmesini profilde elle “Hemen ara” yapın." : "";
      onDeleted(where + photos + google);
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : "Silinemedi.");
      setBusy(false);
    }
  };

  return (
    <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-delete-title">
      <div className="admin-modal-card">
        <h2 id="admin-delete-title">Yayındaki yazı silinsin mi?</h2>
        <p><strong>{post.title}</strong><br /><code>{post.slug}</code></p>
        <p>Bu yazı sitede yayında. Silinirse adres sitemap’ten ve llms.txt’den çıkar; Google’da bu adresi bulan biri 404 görür, yazının arama görünürlüğü kaybolur. Silme, GitHub geçmişinden geri alınabilir.</p>
        {imageCount(post) > 0 && <p className="admin-muted">Yazının {imageCount(post)} fotoğrafı da depodan (Vercel Blob) silinir; başka yazıda kullanılan fotoğraf silinmez. Fotoğraf silme yalnızca canlı panelde yapılır.</p>}
        <label className="admin-check">
          <input type="checkbox" checked={redirect} onChange={event => setRedirect(event.target.checked)} />
          <span>Eski adres ilgili bir sayfaya yönlendirilsin (önerilir)</span>
        </label>
        {redirect && (
          <label className="admin-field">
            <span>Yönlendirme hedefi</span>
            <select value={target} onChange={event => setTarget(event.target.value)}>
              {targets.map(path => <option key={path} value={path}>{path}</option>)}
            </select>
          </label>
        )}
        {autoSwitch ? (
          <p className="admin-note">Bu yazı Google İşletme profilinde API ile paylaşılmış; silinince paylaşımın düğmesi otomatik olarak “Hemen ara”ya çevrilir (olmazsa size bildirilir).</p>
        ) : (
          <p className="admin-note">
            Hatırlatma: {googleShared ? "Bu yazı Google İşletme profilinde paylaşılmış olarak işaretli; paylaşımın düğmesini “Hemen ara” olarak değiştirin" : "Google İşletme profilinde bu yazıya bağlı bir “Daha fazla bilgi” düğmesi kullandıysanız, düğmeyi “Hemen ara” olarak değiştirin"}; yoksa ölü bağlantıya gider. <a href={GOOGLE_BUSINESS_URL} target="_blank" rel="noreferrer">Profili aç</a>
          </p>
        )}
        {social?.record && <p className="admin-muted">Yazının paylaşım paketi (Google/Instagram metinleri) de silinir.</p>}
        {error && <p className="admin-error" role="alert">{error}</p>}
        <div className="admin-actions">
          <button className="admin-btn" onClick={onClose} disabled={busy}>Vazgeç</button>
          <button className="admin-btn admin-btn-danger" onClick={confirm} disabled={busy || !isPublished(post)}>{busy ? "Siliniyor…" : "Yazıyı sil"}</button>
        </div>
      </div>
    </div>
  );
}
