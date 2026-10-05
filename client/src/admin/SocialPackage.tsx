import { useEffect, useMemo, useState } from "react";
import { GOOGLE_BUSINESS_URL } from "@shared/business-contact";
import { collectPostImages } from "@shared/blog-images";
import { todayInIstanbul } from "@shared/blog-publish";
import type { BlogPostInput } from "@shared/blog-schema";
import {
  GOOGLE_BUTTON_LABELS, GOOGLE_BUTTONS, GOOGLE_TEXT_MAX, INSTAGRAM_TEXT_MAX, trackedUrl, validateSocialRecord,
  type GoogleButton, type PanelSettings, type SocialChannel, type SocialRecord,
} from "@shared/blog-social";
import { api, ApiError } from "./api";
import { downloadAsJpeg } from "./imageTools";

type Props = { post: Pick<BlogPostInput, "slug" | "title" | "cover" | "blocks">; onClose: () => void; notify: (message: string) => void };

const errorText = (failure: unknown, fallback: string) => (failure instanceof ApiError ? (failure.errors?.length ? failure.errors[0] : failure.message) : fallback);

/** Panelde bir kopyalama düğmesi: pano erişimi reddedilirse metnin elle seçilip kopyalanması gerektiğini söyler. */
function CopyButton({ text, label, disabled }: { text: string; label: string; disabled?: boolean }) {
  const [state, setState] = useState<"" | "ok" | "fail">("");
  useEffect(() => { if (!state) return; const id = window.setTimeout(() => setState(""), 2500); return () => window.clearTimeout(id); }, [state]);
  return (
    <>
      <button type="button" className="admin-btn" disabled={disabled || !text} onClick={async () => { try { await navigator.clipboard.writeText(text); setState("ok"); } catch { setState("fail"); } }}>{state === "ok" ? "Kopyalandı" : label}</button>
      {state === "fail" && <span className="admin-error-inline"> Kopyalanamadı; metni seçip elle kopyalayın.</span>}
    </>
  );
}

/**
 * Paylaşım paketi (aşama 5): Google İşletme gönderisi ve Instagram metni, takip etiketli bağlantı, fotoğraflar ve "paylaşıldı" durumu.
 * Hepsi yalnızca panelde durur (content/social/<adres>.json); ziyaretçi sayfasına, sitemap'e ve şemaya gitmez. Takip etiketli bağlantı yalnızca burada kullanılır.
 */
export default function SocialPackage({ post, onClose, notify }: Props) {
  const [record, setRecord] = useState<SocialRecord | null>(null);
  const [settings, setSettings] = useState<PanelSettings | null>(null);
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [published, setPublished] = useState(true);
  const [problem, setProblem] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [google, setGoogle] = useState("");
  const [instagram, setInstagram] = useState("");
  const [button, setButton] = useState<GoogleButton>("LEARN_MORE");
  const [busy, setBusy] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmShare, setConfirmShare] = useState(false);
  const [photoNote, setPhotoNote] = useState("");
  // Gönderi Google'da oluşmuş olabilir (kayıt yazılamadı ya da yanıt alınamadı): tekrar göndermeyi önlemek için düğme bu oturumda kapanır.
  const [shareLocked, setShareLocked] = useState(false);

  const adopt = (next: SocialRecord | null) => {
    setRecord(next);
    setGoogle(next?.googleBusiness ?? "");
    setInstagram(next?.instagram ?? "");
    setButton(next?.button ?? "LEARN_MORE");
  };

  useEffect(() => {
    let alive = true;
    Promise.all([api.social(post.slug), api.settings()])
      .then(([social, config]) => {
        if (!alive) return;
        adopt(social.record);
        setPublished(social.published);
        setProblem(social.problem ?? "");
        setSettings(config.settings);
        setGoogleConfigured(config.googleConfigured);
        if (config.problem) setProblem(current => current || config.problem!);
        setLoaded(true);
      })
      .catch(failure => { if (alive) setLoadError(errorText(failure, "Paylaşım paketi alınamadı.")); });
    return () => { alive = false; };
  }, [post.slug]);

  const dirty = loaded && (google !== (record?.googleBusiness ?? "") || instagram !== (record?.instagram ?? "") || button !== (record?.button ?? "LEARN_MORE"));
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (dirty && !busy) event.preventDefault(); };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, busy]);

  const check = useMemo(() => validateSocialRecord({ slug: post.slug, googleBusiness: google, instagram, button, shared: record?.shared ?? {}, updated: record?.updated ?? todayInIstanbul() }), [post.slug, google, instagram, button, record]);
  const images = useMemo(() => collectPostImages(post), [post]);
  const googleLink = trackedUrl(post.slug, "google");
  const instagramLink = trackedUrl(post.slug, "instagram");
  const apiMode = settings?.google.mode === "api";
  const googleDone = record?.shared.google;
  const instagramDone = record?.shared.instagram;

  const run = async (name: string, work: () => Promise<void>) => {
    setBusy(name);
    setErrors([]);
    try { await work(); } catch (failure) { setErrors([errorText(failure, "İşlem yapılamadı.")]); } finally { setBusy(""); setConfirmShare(false); }
  };

  const save = () => run("save", async () => {
    const result = await api.saveSocial({ slug: post.slug, googleBusiness: google, instagram, button });
    adopt(result.record);
    notify(result.noChange ? "Değişiklik yok." : "Paylaşım metinleri kaydedildi.");
  });

  const mark = (channel: SocialChannel, shared: boolean) => run(`mark-${channel}`, async () => {
    const result = await api.markShared({ slug: post.slug, channel, shared });
    // Metin kutuları kaydedilmemiş düzenleme taşıyabilir; yalnızca "paylaşıldı" durumu güncellenir.
    setRecord(current => (current ? { ...current, shared: result.record.shared, updated: result.record.updated } : result.record));
    notify(shared ? "Paylaşıldı olarak işaretlendi." : "Paylaşıldı işareti kaldırıldı.");
  });

  const share = () => run("share", async () => {
    let result;
    try {
      result = await api.googleShare(post.slug);
    } catch (failure) {
      if (failure instanceof ApiError && (failure.code === "google_share_not_recorded" || failure.code === "google_share_uncertain")) setShareLocked(true);
      throw failure;
    }
    setRecord(current => (current ? { ...current, shared: result.record.shared, updated: result.record.updated } : result.record));
    notify("Google İşletme profilinde paylaşıldı.");
  });

  const download = async (index: number) => {
    const image = images[index];
    setPhotoNote("");
    const ok = await downloadAsJpeg(image.src, `${post.slug}-${index + 1}.jpg`);
    if (!ok) { window.open(image.src, "_blank", "noopener"); setPhotoNote("JPEG’e çevrilemedi; fotoğraf yeni sekmede açıldı (WebP). Uzun basıp ya da sağ tıklayıp kaydedebilirsiniz."); }
  };

  if (loadError) return <section><button className="admin-btn" onClick={onClose}>← Yazılar</button><p className="admin-error" role="alert">{loadError}</p></section>;
  if (!loaded) return <section><button className="admin-btn" onClick={onClose}>← Yazılar</button><p className="admin-muted">Yükleniyor…</p></section>;

  const saveBlocked = !check.ok;
  return (
    <section className="admin-editor admin-social">
      <div className="admin-toolbar">
        <button className="admin-btn" onClick={onClose}>← Yazılar</button>
        <strong>Paylaşım paketi</strong>
        <span className="admin-spacer" />
        <button className="admin-btn admin-btn-primary" disabled={!dirty || saveBlocked || Boolean(busy)} onClick={save}>{busy === "save" ? "Kaydediliyor…" : "Metni kaydet"}</button>
      </div>
      <p><strong>{post.title}</strong><br /><code>{post.slug}</code></p>
      {!published && <p className="admin-note" role="status">Bu yazı henüz yayında değil; metinleri kaydedebilirsiniz ama “paylaşıldı” işaretlemek ve Google’a göndermek yayından sonra açılır.</p>}
      {problem && <p className="admin-error" role="alert">{problem}</p>}
      {errors.length > 0 && <div className="admin-error" role="alert"><ul>{errors.map(line => <li key={line}>{line}</li>)}</ul></div>}
      {dirty && saveBlocked && <div className="admin-error" role="alert"><ul>{check.errors.slice(0, 4).map(line => <li key={line}>{line.replace(/^[A-Za-z0-9_.]+: /, "")}</li>)}</ul></div>}
      {dirty && !saveBlocked && <p className="admin-note" role="status">Kaydedilmemiş değişiklik var. Kopyalamak için kaydetmeniz gerekmez; kaydedilmezse sonraki açılışta eski metin gelir.</p>}

      <fieldset className="admin-box">
        <legend>Google İşletme gönderisi</legend>
        <label className="admin-field"><span>Metin <small>{google.length}/{GOOGLE_TEXT_MAX}</small></span><textarea rows={8} value={google} onChange={event => setGoogle(event.target.value)} /></label>
        <div className="admin-inline admin-wrap" role="radiogroup" aria-label="Düğme türü">
          <strong>Düğme:</strong>
          {GOOGLE_BUTTONS.map(value => (
            <label className="admin-check" key={value}><input type="radio" name="gbp-button" checked={button === value} onChange={() => setButton(value)} /><span>{GOOGLE_BUTTON_LABELS[value]}</span></label>
          ))}
        </div>
        {button === "LEARN_MORE" ? (
          <label className="admin-field"><span>Düğme bağlantısı (takip etiketli)</span><input readOnly value={googleLink} onFocus={event => event.currentTarget.select()} /></label>
        ) : (
          <p className="admin-muted">“Hemen ara” düğmesinde bağlantı yoktur; Google işletme telefonunuzu kullanır.</p>
        )}
        <div className="admin-inline admin-wrap">
          <CopyButton text={google} label="Metni kopyala" />
          {button === "LEARN_MORE" && <CopyButton text={googleLink} label="Bağlantıyı kopyala" />}
          <a className="admin-btn" href={GOOGLE_BUSINESS_URL} target="_blank" rel="noreferrer">Profili aç</a>
        </div>
        <p className="admin-muted">Elle paylaşım: Google’da profilinizde “Güncelleme ekle” → metni yapıştırın → fotoğraf ekleyin → düğme olarak “{GOOGLE_BUTTON_LABELS[button]}” seçin{button === "LEARN_MORE" ? " ve bağlantıyı yapıştırın" : ""} → yayınlayın; sonra aşağıyı işaretleyin.</p>
        <label className="admin-check">
          <input type="checkbox" checked={Boolean(googleDone)} disabled={!published || Boolean(busy) || googleDone?.via === "api"} onChange={event => mark("google", event.target.checked)} />
          <span>Google’da paylaşıldı{googleDone ? ` (${googleDone.at}${googleDone.via === "api" ? ", API ile; işaret elle kaldırılamaz" : ""})` : ""}</span>
        </label>
        {apiMode && (
          <div className="admin-sub">
            {!googleConfigured && <p className="admin-note">“API var” seçili ama Google anahtarları Vercel’de tanımlı değil; paylaşımı elle yapın.</p>}
            {shareLocked && !googleDone && <p className="admin-note">Tekrar göndermeyi önlemek için “Google’da paylaş” kapatıldı. Profilinizi kontrol edin; gönderi oluştuysa yukarıdaki “Google’da paylaşıldı” kutusunu işaretleyin.</p>}
            {googleConfigured && !googleDone && !confirmShare && !shareLocked && <button type="button" className="admin-btn admin-btn-primary" disabled={!published || dirty || !google || Boolean(busy)} onClick={() => setConfirmShare(true)}>Google’da paylaş (API)</button>}
            {googleConfigured && !googleDone && dirty && <p className="admin-muted">Önce metni kaydedin; API kayıtlı metni gönderir.</p>}
            {confirmShare && (
              <div className="admin-note" role="alertdialog" aria-label="Google paylaşımını onayla">
                <p>Kayıtlı metin Google İşletme profilinizde herkese açık yayınlanacak{settings?.google.sendPhoto && post.cover ? " (kapak fotoğrafıyla)" : ""}. Gönderilsin mi?</p>
                <div className="admin-inline"><button type="button" className="admin-btn admin-btn-primary" disabled={Boolean(busy)} onClick={share}>{busy === "share" ? "Gönderiliyor…" : "Evet, paylaş"}</button><button type="button" className="admin-btn" disabled={Boolean(busy)} onClick={() => setConfirmShare(false)}>Vazgeç</button></div>
              </div>
            )}
          </div>
        )}
      </fieldset>

      <fieldset className="admin-box">
        <legend>Fotoğraflar</legend>
        {images.length === 0 ? <p className="admin-muted">Bu yazıda fotoğraf yok.</p> : (
          <ul className="admin-photos">
            {images.map((image, index) => (
              <li key={`${index}-${image.src}`}>
                <img src={image.src} alt={image.alt} width={96} height={Math.max(1, Math.round((96 * image.height) / image.width))} loading="lazy" />
                <div><small>{index === 0 && post.cover ? "Kapak" : `Fotoğraf ${index + 1}`}</small><br /><button type="button" className="admin-btn" onClick={() => download(index)}>JPEG indir</button></div>
              </li>
            ))}
          </ul>
        )}
        {photoNote && <p className="admin-note" role="status">{photoNote}</p>}
        <p className="admin-muted">Google ve Instagram’a yüklemek için JPEG olarak iner. Metin ve fotoğraf eşleşmesini paylaşmadan önce kontrol edin.</p>
      </fieldset>

      <fieldset className="admin-box">
        <legend>Instagram gönderisi</legend>
        <label className="admin-field"><span>Metin <small>{instagram.length}/{INSTAGRAM_TEXT_MAX}</small></span><textarea rows={10} value={instagram} onChange={event => setInstagram(event.target.value)} /></label>
        <label className="admin-field"><span>Biyografi / hikâye bağlantısı (takip etiketli)</span><input readOnly value={instagramLink} onFocus={event => event.currentTarget.select()} /></label>
        <div className="admin-inline admin-wrap"><CopyButton text={instagram} label="Metni kopyala" /><CopyButton text={instagramLink} label="Bağlantıyı kopyala" /></div>
        <p className="admin-muted">Instagram gönderi metnindeki bağlantı tıklanmaz; bağlantıyı biyografiye ya da hikâyeye koyun.</p>
        <label className="admin-check">
          <input type="checkbox" checked={Boolean(instagramDone)} disabled={!published || Boolean(busy)} onChange={event => mark("instagram", event.target.checked)} />
          <span>Instagram’da paylaşıldı{instagramDone ? ` (${instagramDone.at})` : ""}</span>
        </label>
      </fieldset>
      <p className="admin-muted">Takip etiketleri yalnızca bu pakette kullanılır; sitedeki bağlantılar, sitemap ve canonical etiketsiz kalır. Google ayarı: {apiMode ? "API var" : "API yok"} (Ayarlar sekmesinden değişir).</p>
    </section>
  );
}
