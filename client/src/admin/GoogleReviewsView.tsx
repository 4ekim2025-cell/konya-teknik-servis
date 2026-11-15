import { useEffect, useMemo, useState } from "react";
import { validateGoogleReviews, type GoogleReviewsFile, type ManualGoogleReview } from "@shared/google-reviews";
import { api, ApiError, type GoogleApiReview, type GoogleReviewsListResponse } from "./api";
import type { SettingsResponse } from "./api";
import { prepareBulkReviews } from "./googleReviewBulk";

const message = (error: unknown, fallback: string) => error instanceof ApiError ? error.message : fallback;
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const emptyReview = (): ManualGoogleReview => ({ id: `manual_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`, author: "", rating: 5, text: "", reviewDate: today(), consentConfirmed: false, independentlyProvided: false, consentDate: today(), visible: true, order: 0 });

function Stars({ value }: { value: number }) {
  return <span className="admin-review-stars" aria-label={`${value} yıldız`}>{"★".repeat(value)}{"☆".repeat(5 - value)}</span>;
}

export default function GoogleReviewsView({ notify }: { notify: (value: string) => void }) {
  const [manual, setManual] = useState<GoogleReviewsFile | null>(null);
  const [apiData, setApiData] = useState<GoogleReviewsListResponse | null>(null);
  const [connection, setConnection] = useState<SettingsResponse | null>(null);
  const [problem, setProblem] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [bulkText, setBulkText] = useState("");
  const [bulkConsentDate, setBulkConsentDate] = useState(today);
  const [bulkConsent, setBulkConsent] = useState(false);
  const [bulkIndependent, setBulkIndependent] = useState(false);
  const pageSize = 10;

  useEffect(() => { api.googleReviewsManual().then(result => { setManual(result.data); setProblem(result.problem ?? ""); }).catch(failure => setError(message(failure, "Manuel yorumlar alınamadı."))); api.googleReviewsList().then(setApiData).catch(() => undefined); }, []);
  useEffect(() => { api.settings().then(setConnection).catch(() => undefined); }, []);
  const refresh = async () => {
    setBusy("refresh"); setError("");
    try { setApiData(await api.googleReviewsRefresh()); setPage(0); }
    catch (failure) { setError(message(failure, "Google yorumları alınamadı.")); }
    finally { setBusy(""); }
  };
  const save = async () => {
    if (!manual) return;
    const checked = validateGoogleReviews(manual);
    if (!checked.ok) { setError(checked.errors[0]); return; }
    setBusy("save"); setError("");
    try { const result = await api.saveGoogleReviewsManual(checked.data); setManual(result.data); notify(result.noChange ? "Yorumlarda değişiklik yok." : "İzinli yorumlar kaydedildi; site yeniden oluşturulacak."); }
    catch (failure) { setError(message(failure, "Yorumlar kaydedilemedi.")); }
    finally { setBusy(""); }
  };
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr");
    return (apiData?.reviews ?? []).filter(review => !needle || `${review.authorName ?? "Anonim"} ${review.comment}`.toLocaleLowerCase("tr").includes(needle));
  }, [apiData, query]);
  const visible = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const update = (id: string, patch: Partial<ManualGoogleReview>) => setManual(current => current ? { ...current, manualReviews: current.manualReviews.map(item => item.id === id ? { ...item, ...patch } : item) } : current);
  const move = (index: number, offset: number) => setManual(current => {
    if (!current) return current;
    const next = [...current.manualReviews]; const target = index + offset;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return { ...current, manualReviews: next.map((item, order) => ({ ...item, order })) };
  });
  const addBulk = () => {
    if (!manual) return;
    if (!bulkConsent || !bulkIndependent) { setError("Yorum sahibinin iznini ve metnin bağımsız kaynağını onaylayın."); return; }
    const prepared = prepareBulkReviews(bulkText, manual, bulkConsentDate);
    if (!prepared.ok) { setError(prepared.error); return; }
    setManual(prepared.data); setBulkText(""); setBulkConsent(false); setBulkIndependent(false); setError("");
    notify(`${prepared.count} yorum düzenleme listesine eklendi. Yayınlamak için Değişiklikleri kaydet düğmesine basın.`);
  };

  if (!manual && !error) return <p className="admin-muted">Yükleniyor…</p>;
  return <section className="admin-settings admin-reviews">
    <h2>Google Yorumları</h2>
    <p className="admin-note">Google’dan alınan yorumlar yalnızca bu oturumlu ekranda geçici olarak görüntülenir; Git’e veya anasayfaya kopyalanmamalıdır. Anasayfa kaydını yalnızca yorum sahibinden ayrıca aldığınız metin ve açık web sitesi izniyle oluşturun.</p>
    {problem && <p className="admin-error" role="alert">{problem}</p>}{error && <p className="admin-error" role="alert">{error}</p>}
    <fieldset className="admin-box"><legend>Google Business Profile bağlantısı</legend>
      {connection && <p className={connection.settings.google.mode === "api" && connection.googleConfigured ? "admin-ok" : "admin-note"}>Bağlantı durumu: {connection.settings.google.mode === "api" ? (connection.googleConfigured ? "API ayarları ve OAuth ortam değişkenleri tanımlı" : "Hesap/konum seçili; OAuth ortam değişkenleri eksik") : "API yok — manuel yönetim açık"}{connection.settings.google.mode === "api" && <> · Hesap {connection.settings.google.accountId} · Konum {connection.settings.google.locationId}</>}</p>}
      <div className="admin-inline admin-wrap"><button className="admin-btn" type="button" disabled={Boolean(busy)} onClick={() => void refresh()}>{busy === "refresh" ? "Yenileniyor…" : "Yorumları yenile"}</button>
      {apiData?.averageRating !== undefined && <strong>Güncel puan: {apiData.averageRating.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}</strong>}
      {apiData && <span className="admin-muted">Son yenileme: {new Date(apiData.refreshedAt).toLocaleString("tr-TR")}</span>}</div>
      {apiData && <><label className="admin-field"><span>Yorumlarda ara</span><input value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} placeholder="Yazar veya yorum metni" /></label>
      <p className="admin-muted">Panelde toplam {apiData.totalReviewCount ?? apiData.reviews.length} yorum bildirildi. Bu sayı ziyaretçi tarafına gönderilmez.</p>
      <div className="admin-review-list">{visible.map((review: GoogleApiReview) => <article className="admin-box" key={review.id}><div className="admin-inline admin-wrap"><strong>{review.anonymous ? "Anonim kullanıcı" : review.authorName}</strong><Stars value={review.rating}/><time dateTime={review.createTime}>{new Date(review.createTime).toLocaleDateString("tr-TR")}</time></div><p>{review.comment || "Yorum metni yok."}</p><small className="admin-muted">Bu API metnini kalıcı kayda kopyalamayın. Yayın için yorum sahibinden metni bağımsız olarak yeniden alın ve açık izin kaydedin.</small></article>)}</div>
      {filtered.length > pageSize && <div className="admin-inline"><button className="admin-btn" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Önceki</button><span>{page + 1} / {Math.ceil(filtered.length / pageSize)}</span><button className="admin-btn" disabled={(page + 1) * pageSize >= filtered.length} onClick={() => setPage(value => value + 1)}>Sonraki</button></div>}</>}
    </fieldset>
    {manual && <fieldset className="admin-box"><legend>İzinli manuel yorumlar</legend>
      <details className="admin-bulk-reviews"><summary>Birden çok yorumu ekle</summary>
        <p className="admin-note">Her satıra sırasıyla <strong>tam ad, puan (1–5), yorum tarihi (YYYY-AA-GG), yorum metni</strong> yazın. Alanları sekme tuşuyla ayırın; bir tablodan dört sütunu kopyalayıp yapıştırabilirsiniz. API ekranındaki metni kopyalamayın.</p>
        <label className="admin-field"><span>Yorum satırları</span><textarea rows={6} value={bulkText} onChange={event => setBulkText(event.target.value)} placeholder={"Ayşe Yılmaz\t5\t2026-11-01\tServis zamanında geldi."}/></label>
        <label className="admin-field"><span>Yorum sahiplerinden alınan izin tarihi (hepsi için aynı gün)</span><input type="date" value={bulkConsentDate} onChange={event => setBulkConsentDate(event.target.value)}/></label>
        <label className="admin-check"><input type="checkbox" checked={bulkConsent} onChange={event => setBulkConsent(event.target.checked)}/><span>Bu satırlardaki her yorum sahibinden web sitesinde kullanım izni aldım</span></label>
        <label className="admin-check"><input type="checkbox" checked={bulkIndependent} onChange={event => setBulkIndependent(event.target.checked)}/><span>Metinleri yorum sahiplerinden bağımsız olarak aldım; Google API çıktısından kopyalamadım</span></label>
        <button className="admin-btn" type="button" disabled={Boolean(busy)} onClick={addBulk}>Satırları listeye ekle</button>
      </details>
      <div className="admin-review-list">{manual.manualReviews.map((review, index) => <article className="admin-box" key={review.id}>
        <div className="admin-review-grid"><label className="admin-field"><span>Yazarın Google’da görünen tam adı</span><input value={review.author} onChange={event => update(review.id, { author: event.target.value })}/></label><label className="admin-field"><span>Puan</span><select value={review.rating} onChange={event => update(review.id, { rating: Number(event.target.value) as ManualGoogleReview["rating"] })}>{[5,4,3,2,1].map(value => <option key={value} value={value}>{value}</option>)}</select></label><label className="admin-field"><span>Yorum tarihi</span><input type="date" value={review.reviewDate} onChange={event => update(review.id, { reviewDate: event.target.value })}/></label><label className="admin-field"><span>İzin tarihi</span><input type="date" value={review.consentDate} onChange={event => update(review.id, { consentDate: event.target.value })}/></label></div>
        <label className="admin-field"><span>Yorum</span><textarea rows={4} maxLength={1200} value={review.text} onChange={event => update(review.id, { text: event.target.value })}/></label>
        <label className="admin-check"><input type="checkbox" checked={review.consentConfirmed} onChange={event => update(review.id, { consentConfirmed: event.target.checked })}/><span>Yorum sahibinin web sitesinde kullanım izni alındı</span></label><label className="admin-check"><input type="checkbox" checked={review.independentlyProvided} onChange={event => update(review.id, { independentlyProvided: event.target.checked })}/><span>Metin yorum sahibinden bağımsız olarak alındı; API ekranından kopyalanmadı</span></label><label className="admin-check"><input type="checkbox" checked={review.visible} onChange={event => update(review.id, { visible: event.target.checked })}/><span>Anasayfada göster</span></label>
        <div className="admin-inline admin-wrap"><button className="admin-btn" disabled={index === 0} onClick={() => move(index, -1)}>Yukarı</button><button className="admin-btn" disabled={index === manual.manualReviews.length - 1} onClick={() => move(index, 1)}>Aşağı</button><button className="admin-btn admin-btn-danger" onClick={() => setManual({ ...manual, manualReviews: manual.manualReviews.filter(item => item.id !== review.id).map((item, order) => ({ ...item, order })) })}>Kaldır</button></div>
      </article>)}</div>
      <div className="admin-inline admin-wrap"><button className="admin-btn" type="button" onClick={() => setManual({ ...manual, manualReviews: [...manual.manualReviews, { ...emptyReview(), order: manual.manualReviews.length }] })}>Manuel yorum ekle</button><button className="admin-btn admin-btn-primary" type="button" disabled={Boolean(busy)} onClick={() => void save()}>{busy === "save" ? "Kaydediliyor…" : "Değişiklikleri kaydet"}</button></div>
    </fieldset>}
  </section>;
}
