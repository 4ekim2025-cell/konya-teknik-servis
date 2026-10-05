import { useState } from "react";
import { api, ApiError, type ImageUsage } from "./api";

const mb = (bytes: number) => `${(bytes / (1024 * 1024)).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} MB`;

/**
 * Vercel Blob (fotoğraf) depolama göstergesi. Ölçüm Blob'a gelişmiş işlem harcatır (Hobby: ayda 2.000), bu yüzden otomatik değil, düğmeyle çalışır.
 * Hobby kotası aşılırsa Blob 30 gün kapanır; bu gösterge o duruma yaklaşmadan önce uyarmak içindir.
 */
export function ImageUsageCard() {
  const [usage, setUsage] = useState<ImageUsage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);

  const load = async () => {
    setBusy(true);
    setError("");
    try {
      setUsage(await api.imageUsage());
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : "Kullanım alınamadı.");
    } finally {
      setBusy(false);
    }
  };
  const clean = async () => {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const result = await api.imageCleanup();
      setNote(`${result.deletedFiles} dosya silindi (${mb(result.freedBytes)} boşaldı).${result.remainingImages > 0 ? ` ${result.remainingImages} kullanılmayan fotoğraf kaldı; düğmeye yeniden basın.` : ""}`);
      setConfirming(false);
      setUsage(await api.imageUsage());
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : "Temizlik yapılamadı.");
    } finally {
      setBusy(false);
    }
  };

  const percent = usage ? Math.min(100, (usage.storageBytes / usage.limitBytes) * 100) : 0;
  return (
    <div className="admin-card">
      <h3>Fotoğraf depolama (Vercel Blob)</h3>
      {!usage && <p className="admin-muted">Ölçüm Blob işlem kotasından harcar; yalnızca gerektiğinde alın.</p>}
      <div className="admin-toolbar"><button className="admin-btn" onClick={load} disabled={busy}>{busy ? "Okunuyor…" : usage ? "Yenile" : "Kullanımı göster"}</button></div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {note && <p className="admin-ok" role="status">{note}</p>}
      {usage && (
        <>
          <div className={`admin-gauge ${percent >= 90 ? "is-bad" : percent >= 70 ? "is-warn" : ""}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} aria-label="Depolama kullanımı"><span style={{ width: `${percent}%` }} /></div>
          <p><strong>{mb(usage.storageBytes)}</strong> / {mb(usage.limitBytes)} (%{percent.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}){usage.truncated && " — liste eksik okundu, gerçek kullanım daha yüksek olabilir"}</p>
          <p className="admin-muted">{usage.imageCount} fotoğraf · {usage.referencedImages} tanesi yazılarda kullanılıyor · {usage.unreferencedImages} tanesi kullanılmıyor ({mb(usage.unreferencedBytes)}; son {usage.graceHours} saatte yüklenenler sayılmaz)</p>
          {percent >= 70 && <p className="admin-note">Hobby planında 1 GB dolarsa Blob 30 gün boyunca kapanır ve fotoğraflar görünmez. Kullanılmayanları temizleyin ya da fotoğraf eklemeyi durdurun.</p>}
          {usage.contentProblems > 0 && <p className="admin-error">Okunamayan {usage.contentProblems} yazı dosyası var; bu yüzden temizlik kapalı (o yazıların fotoğrafları “kullanılmıyor” görünebilir). Önce dosyayı düzeltin.</p>}
          {usage.unreferencedImages > 0 && usage.canCleanup && usage.contentProblems === 0 && !usage.truncated && (
            confirming ? (
              <div className="admin-actions">
                <span className="admin-muted">{usage.unreferencedImages} fotoğraf kalıcı olarak silinecek. Emin misiniz?</span>
                <button className="admin-btn" onClick={() => setConfirming(false)} disabled={busy}>Vazgeç</button>
                <button className="admin-btn admin-btn-danger" onClick={clean} disabled={busy}>Evet, sil</button>
              </div>
            ) : <button className="admin-btn" onClick={() => setConfirming(true)}>Kullanılmayanları temizle</button>
          )}
          {!usage.canCleanup && <p className="admin-muted">Temizlik yalnızca canlı panelde yapılır (önizleme canlıyla aynı fotoğraf deposunu paylaşır).</p>}
        </>
      )}
    </div>
  );
}
