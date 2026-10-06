import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { blogCategories } from "@shared/blog-meta";
import { BLOG_BRANDS, BLOG_DEVICES, BLOG_DISTRICTS, GENERAL_DEVICE, GENERAL_SERVICE_PATHS, SMALL_APPLIANCE_DEVICE, SMALL_APPLIANCE_SUGGESTIONS } from "@shared/blog-taxonomy";
import { BLOG_DESCRIPTION_MAX, USTA_CATEGORY, type BlogPostInput } from "@shared/blog-schema";
import { BLOG_IMAGE_HOST, BLOG_IMAGE_LIMIT_PER_POST } from "@shared/blog-images";
import { api, ApiError, type HistoryEntry, type PostItem, type PostsResponse } from "./api";
import { ImageFields, ImagePicker } from "./ImagePicker";
import { nextOrder, todayInIstanbul } from "@shared/blog-publish";
import {
  applyDeviceAndBrand, BLOCK_LABELS, checklist, collapseCaseIssues, emptyBlock, errorsBySection, hasWrittenText, imageCount, insertAt, isPublished, moveItem, newPost, removeAt, replaceAt, setCaseFile, setCategory, slugFor, splitDistrict, TEXT_BLOCK_TYPES, toPayload,
  type BlogBlockInput, type TextBlockType,
} from "./editorModel";

const Preview = lazy(() => import("./Preview"));
const AiDraftBox = lazy(() => import("./AiDraftBox"));

type Props = { data: PostsResponse; item: PostItem | null; reload: () => Promise<PostsResponse | null>; onClose: () => void; onPackage: (item: PostItem) => void; notify: (message: string) => void };

/** Alan etiketi. `count`: karakter sayacı (sınır aşılınca kırmızı); `help`: alanın altında tek satır açıklama. */
function Field({ label, hint, count, help, children }: { label: string; hint?: string; count?: { value: number; max: number }; help?: string; children: ReactNode }) {
  return (
    <label className="admin-field">
      <span className="admin-field-head"><span>{label}{hint && <small> {hint}</small>}</span>{count && <small className={`admin-count ${count.value > count.max ? "is-over" : ""}`}>{count.value}/{count.max}</small>}</span>
      {children}
      {help && <small className="admin-field-help">{help}</small>}
    </label>
  );
}

/** Kategori kartlarındaki tek satırlık açıklamalar (yalnızca panelde görünür). */
const CATEGORY_HELP: Record<string, string> = {
  "Ustanın Defterinden": "Sahada yaptığınız gerçek bir iş",
  "Bakım Rehberi": "Bakım evde nasıl yapılır",
  "Karar Rehberi": "Tamir mi, yenisi mi",
  "Tüketici Rehberi": "Servis sürecinde bilinmesi gerekenler",
};

type GroupId = "type" | "record" | "article" | "sources" | "history";

/**
 * Editörün numaralı grubu. Ana gruplar SABİTTİR (açılıp kapanmaz); yalnızca nadiren gereken ekler (`collapsible`) kapalı başlar.
 * Başlığın sağında durum yazar ("Tamam", "2 eksik", "İsteğe bağlı").
 */
function Section({ id, step, title, hint, missing = 0, optional, filled, collapsible, open = true, onToggle, children }: { id: GroupId; step: number | string; title: string; hint?: string; missing?: number; optional?: boolean; filled?: boolean; collapsible?: boolean; open?: boolean; onToggle?: (id: GroupId) => void; children: ReactNode }) {
  const done = missing === 0 && (!optional || Boolean(filled));
  const state = missing ? "is-todo" : done ? "is-done" : "is-optional";
  const head = (
    <>
      <span className="admin-step-no" aria-hidden="true">{done && typeof step === "number" ? "✓" : step}</span>
      <span className="admin-section-title"><strong>{title}</strong>{hint && <small>{hint}</small>}</span>
      <span className="admin-chip">{missing ? `${missing} eksik` : done ? "Tamam" : "İsteğe bağlı"}</span>
      {collapsible && <span className="admin-chevron" aria-hidden="true">{open ? "▾" : "▸"}</span>}
    </>
  );
  return (
    <section className={`admin-section ${state}`} id={`admin-sec-${id}`}>
      {collapsible
        ? <button type="button" className="admin-section-head is-button" aria-expanded={open} onClick={() => onToggle?.(id)}>{head}</button>
        : <div className="admin-section-head">{head}</div>}
      {open && <div className="admin-section-body">{children}</div>}
    </section>
  );
}

/** Grup içindeki alt başlık ve o alt bölümün eksikleri (eksikler sayfanın altında değil, ait oldukları yerde listelenir). */
function Part({ id, title, hint, issues = [], children }: { id?: string; title: string; hint?: string; issues?: string[]; children: ReactNode }) {
  return (
    <div className="admin-part" id={id}>
      <h3 className="admin-part-title">{title}{hint && <small> {hint}</small>}</h3>
      {issues.length > 0 && <ul className="admin-missing" aria-label={`${title}: eksikler`}>{issues.map(line => <li key={line}>{line}</li>)}</ul>}
      {children}
    </div>
  );
}

function BlockEditor({ block, onChange }: { block: BlogBlockInput; onChange: (next: BlogBlockInput) => void }) {
  switch (block.type) {
    case "p":
    case "h2":
      return <textarea rows={block.type === "p" ? 5 : 1} value={block.text} onChange={event => onChange({ ...block, text: event.target.value })} placeholder={block.type === "p" ? "Paragraf metni" : "Ara başlık"} />;
    case "list":
      return (
        <div className="admin-sub">
          {block.items.map((text, index) => (
            <div className="admin-inline" key={index}>
              <input value={text} onChange={event => onChange({ ...block, items: replaceAt(block.items, index, event.target.value) })} placeholder={`Madde ${index + 1}`} />
              <button type="button" className="admin-btn" onClick={() => onChange({ ...block, items: removeAt(block.items, index) })} disabled={block.items.length === 1} aria-label="Maddeyi sil">×</button>
            </div>
          ))}
          <button type="button" className="admin-btn" onClick={() => onChange({ ...block, items: [...block.items, ""] })}>+ Madde</button>
        </div>
      );
    case "steps":
      return (
        <div className="admin-sub">
          {block.items.map((step, index) => (
            <div className="admin-step" key={index}>
              <input value={step.title} onChange={event => onChange({ ...block, items: replaceAt(block.items, index, { ...step, title: event.target.value }) })} placeholder={`${index + 1}. adım başlığı`} />
              <textarea rows={3} value={step.text} onChange={event => onChange({ ...block, items: replaceAt(block.items, index, { ...step, text: event.target.value }) })} placeholder="Adım metni" />
              <button type="button" className="admin-btn" onClick={() => onChange({ ...block, items: removeAt(block.items, index) })} disabled={block.items.length === 1}>Adımı sil</button>
            </div>
          ))}
          <button type="button" className="admin-btn" onClick={() => onChange({ ...block, items: [...block.items, { title: "", text: "" }] })}>+ Adım</button>
        </div>
      );
    case "image":
      return <ImageFields image={block} onAlt={alt => onChange({ ...block, alt })} />;
    case "note":
      return (
        <div className="admin-sub">
          <input value={block.title} onChange={event => onChange({ ...block, title: event.target.value })} placeholder="Not başlığı" />
          <textarea rows={4} value={block.text} onChange={event => onChange({ ...block, text: event.target.value })} placeholder="Ustanın notu" />
        </div>
      );
  }
}

export default function EditorView({ data, item, reload, onClose, onPackage, notify }: Props) {
  const today = todayInIstanbul();
  // Yeni yazı "Ustanın Defterinden" olarak açılır: en sık kullanılan yol servis kaydından yapay zeka taslağıdır (proje sahibinin kararı).
  const [post, setPost] = useState<BlogPostInput>(() => item?.post ?? setCategory(newPost(today, nextOrder(data.items.map(entry => entry.post))), USTA_CATEGORY));
  // Düzenlenen yazının yüklendiği adres ve sürüm özeti; kaydetme sırasında "başka yerde değişti mi" denetimi için sunucuya gider.
  const [origin, setOrigin] = useState<{ slug: string; hash: string } | undefined>(item ? { slug: item.post.slug, hash: item.hash } : undefined);
  const [slugEdited, setSlugEdited] = useState(Boolean(item));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  // Yapay zekanın ürettiği iki sosyal metin: yazı kaydedilirken paylaşım paketine de yazılır (başarısız olursa ekranda kalır, tekrar denenir).
  const [pendingTexts, setPendingTexts] = useState<{ googleBusiness: string; instagram: string } | null>(null);
  const [packageItem, setPackageItem] = useState<PostItem | null>(null);
  const dragFrom = useRef<number | null>(null);
  // Ana gruplar sabittir; yalnızca nadiren gereken ekler ("Kaynaklar", "Önceki sürümler") açılıp kapanır ve kapalı başlar.
  const [open, setOpen] = useState<Record<string, boolean>>(() => ({ sources: Boolean(item?.post.sources?.length), history: false }));
  const [editSlug, setEditSlug] = useState(false);

  const stored = origin ? data.items.find(entry => entry.post.slug === origin.slug)?.post : undefined;
  const published = stored ? isPublished(stored) : false;
  const slugLocked = published;
  const sheet = useMemo(() => checklist(post), [post]);
  const issues = useMemo(() => errorsBySection(sheet.errors), [sheet]);
  const isUsta = post.category === USTA_CATEGORY;
  const device = BLOG_DEVICES.find(option => option.device === post.device);
  const dirty = useMemo(() => !item || JSON.stringify(post) !== JSON.stringify(item.post) || pendingTexts !== null, [post, item, pendingTexts]);

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (dirty && !busy) event.preventDefault(); };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, busy]);

  const patch = (change: Partial<BlogPostInput>) => setPost(current => ({ ...current, ...change }));
  const setTitle = (title: string) => setPost(current => ({ ...current, title, ...(slugLocked || slugEdited ? {} : { slug: slugFor(title) }) }));
  const setBlock = (index: number, block: BlogBlockInput) => patch({ blocks: replaceAt(post.blocks, index, block) });

  const submit = async (mode: "draft" | "publish") => {
    setBusy(true);
    setErrors([]);
    setMessage("");
    try {
      const result = await api.save({ post: toPayload(post), mode, ...(origin ? { previousSlug: origin.slug, baseHash: origin.hash } : {}) });
      const fresh = await reload();
      const finalSlug = result.noChange ? post.slug : result.slug;
      let packageNote = "";
      if (pendingTexts) {
        // Yazı kaydedildi; sosyal metinler ayrı (siteyi derletmeyen) bir commit'le paylaşım paketine yazılır. Düğme türü varsa korunur.
        try {
          const current = await api.social(finalSlug);
          await api.saveSocial({ slug: finalSlug, googleBusiness: pendingTexts.googleBusiness, instagram: pendingTexts.instagram, button: current.record?.button ?? "LEARN_MORE" });
          setPendingTexts(null);
          packageNote = " Paylaşım metinleri de kaydedildi.";
        } catch (failure) {
          packageNote = ` Ancak paylaşım metinleri kaydedilemedi (${failure instanceof ApiError ? failure.message : "beklenmeyen hata"}); metinler ekranda duruyor, tekrar kaydedin.`;
        }
      }
      const saved = fresh?.items.find(entry => entry.post.slug === finalSlug);
      if (result.noChange) {
        setMessage(`Değişiklik yok; kaydedilecek bir şey bulunamadı.${packageNote}`);
      } else {
        if (saved) { setOrigin({ slug: saved.post.slug, hash: saved.hash }); setPost(saved.post); }
        setSlugEdited(true);
        const tail = result.status === "published" ? (result.siteAffecting ? "Site birkaç dakika içinde güncellenir (Yayın durumu sekmesinden izleyin)." : "") : "Taslak kaydedildi; sitede görünmez.";
        setMessage(`${result.status === "published" ? "Yayınlandı." : "Kaydedildi."} ${tail}${result.warnings.length ? ` Uyarılar: ${result.warnings.join("; ")}` : ""}${packageNote}`);
        notify(result.status === "published" ? "Yazı yayınlandı." : "Taslak kaydedildi.");
        if (result.status === "published" && saved) setPackageItem(saved);
      }
    } catch (failure) {
      if (failure instanceof ApiError) { setErrors(failure.errors?.length ? failure.errors : [failure.message]); }
      else setErrors(["Beklenmeyen bir hata oluştu."]);
    } finally {
      setBusy(false);
    }
  };

  const loadHistory = async () => {
    if (!origin) return;
    try { setHistory((await api.history(origin.slug)).entries); } catch (failure) { setErrors([failure instanceof ApiError ? failure.message : "Geçmiş alınamadı."]); }
  };
  const restore = async (entry: HistoryEntry) => {
    if (!origin) return;
    try {
      const { post: old } = await api.version(origin.slug, entry.sha);
      setPost(current => ({ ...old, slug: current.slug, order: current.order, status: current.status, published: current.published, updated: current.updated }));
      setMessage(`${entry.sha.slice(0, 7)} sürümü editöre yüklendi. Kaydetmeden önce gözden geçirin; yayınlayınca bu sürüm geri gelir.`);
    } catch (failure) { setErrors([failure instanceof ApiError ? failure.message : "Sürüm alınamadı."]); }
  };

  // Yapay zeka taslağı yalnızca editöre dolar; kaydedilmiş taslağın adresi ve sırası ile yüklenmiş kapak fotoğrafı korunur. Kaydetme yine üstteki düğmelerle yapılır.
  const fillFromAi = (draft: BlogPostInput) => {
    setPost(current => ({ ...draft, ...(origin ? { slug: current.slug, order: current.order } : {}), ...(current.cover ? { cover: current.cover } : {}) }));
    setSlugEdited(Boolean(origin));
    setErrors([]);
    setMessage("Yapay zeka taslağı dolduruldu. Henüz kaydedilmedi; okuyup düzelttikten sonra kaydedin.");
    window.requestAnimationFrame(() => document.getElementById("admin-sec-article")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const hasContent = hasWrittenText(post);

  const addBlock = (type: TextBlockType) => patch({ blocks: [...post.blocks, emptyBlock(type)] });
  const photos = imageCount(post);
  // Fotoğraf yüklemesi: alan (BLOG_IMAGE_HOST) ayarlanmadıysa ya da yazı sınıra ulaştıysa kapalıdır; nedeni düğmenin yanında yazar.
  const photoBlock = !BLOG_IMAGE_HOST ? "Fotoğraf yükleme henüz açılmadı (Blob store adresi shared/blog-images.ts içinde ayarlı değil)." : photos >= BLOG_IMAGE_LIMIT_PER_POST ? `Bir yazıda en çok ${BLOG_IMAGE_LIMIT_PER_POST} fotoğraf olur.` : undefined;
  const sources = post.sources ?? [];

  const toggle = (id: GroupId) => setOpen(current => ({ ...current, [id]: !current[id] }));
  /** Gruba kaydırır (üstteki eksik düğmeleri ve sağdaki liste bunu kullanır); kapalı ek ise açar. */
  const jump = (id: GroupId) => {
    setOpen(current => ({ ...current, [id]: true }));
    window.requestAnimationFrame(() => document.getElementById(`admin-sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const place = splitDistrict(post.caseFile?.district);
  const showAi = isUsta && !published;
  const detailsFilled = Boolean(post.caseFile?.complaint.trim() || post.caseFile?.finding.trim() || post.caseFile?.action.trim());
  const caseIssues = collapseCaseIssues(issues.case, !showAi || detailsFilled);
  const typeGroup = { id: "type" as GroupId, label: isUsta ? "Yazı türü" : "Yazı türü ve cihaz", missing: issues.type.length };
  const groups: { id: GroupId; label: string; missing: number; optional?: boolean; empty?: boolean }[] = [
    // Usta yazısında servis kaydı ve yapay zeka taslağı EN ÜSTTEDİR; cihaz da orada seçilir. Diğer türlerde ilk grup tür ve cihazdır.
    ...(isUsta ? [{ id: "record" as GroupId, label: showAi ? "Yapay zeka ile yazdır" : "Servis kaydı", missing: caseIssues.length }] : []),
    typeGroup,
    { id: "article", label: "Yazı", missing: issues.intro.length + issues.cover.length + issues.body.length },
    { id: "sources", label: "Kaynaklar", missing: issues.sources.length, optional: true, empty: sources.length === 0 },
  ];
  const step = (id: GroupId) => groups.findIndex(group => group.id === id) + 1;
  const missingOf = (id: GroupId) => groups.find(group => group.id === id)?.missing ?? 0;
  const todo = groups.filter(group => group.missing > 0);
  const status = origin ? (published ? "Yayında" : "Taslak") : "Yeni";

  // Servis kaydı alanları (cihaz dahil). Yapay zeka açıkken "Konu"nun altında, kapalıyken (yayındaki yazı) tek başına gösterilir.
  const recordFields = (
    <>
              <div className="admin-cols admin-cols-5">
                <Field label="Cihaz">
                  <select value={post.device} onChange={event => setPost(applyDeviceAndBrand(post, { device: event.target.value }))}>
                    {BLOG_DEVICES.map(option => <option key={option.device}>{option.device}</option>)}
                  </select>
                </Field>
                <Field label="İlçe">
                  <select value={place.district} onChange={event => setPost(setCaseFile(post, { district: event.target.value ? (place.neighborhood ? `${event.target.value} · ${place.neighborhood}` : event.target.value) : "" }))}>
                    <option value="">Seçin</option>
                    {BLOG_DISTRICTS.map(name => <option key={name}>{name}</option>)}
                  </select>
                </Field>
                <Field label="Mahalle" hint="(isteğe bağlı)">
                  <input value={place.neighborhood} disabled={!place.district} placeholder={place.district ? "" : "Önce ilçe seçin"} onChange={event => setPost(setCaseFile(post, { district: event.target.value.trim() ? `${place.district} · ${event.target.value}` : place.district }))} />
                </Field>
                <Field label="Marka">
                  <select value={post.caseFile?.brand ?? ""} onChange={event => setPost(setCaseFile(post, { brand: event.target.value }))}>
                    <option value="">Seçin</option>
                    {BLOG_BRANDS.map(brand => <option key={brand.slug}>{brand.name}</option>)}
                  </select>
                </Field>
                <Field label="Cihaz adı" hint={post.device === SMALL_APPLIANCE_DEVICE ? "— örn. Airfryer" : "(kayıtta görünen)"}>
                  <input list="admin-small-appliances" value={post.caseFile?.device ?? ""} onChange={event => setPost(setCaseFile(post, { device: event.target.value }))} />
                  <datalist id="admin-small-appliances">{SMALL_APPLIANCE_SUGGESTIONS.map(name => <option key={name} value={name} />)}</datalist>
                </Field>
              </div>
    </>
  );
  // Şikâyet, tespit ve yapılan işlem: yapay zeka akışında neden seçilince görünür ve seçimle dolar; yayındaki yazıda her zaman görünür.
  const recordDetails = (
              <div className="admin-cols admin-cols-3">
                <Field label="Şikâyet" help="Müşteri ne dedi?"><textarea rows={3} value={post.caseFile?.complaint ?? ""} onChange={event => setPost(setCaseFile(post, { complaint: event.target.value }))} placeholder="Makine su almıyor" /></Field>
                <Field label="Tespit" help="Arızanın nedeni neydi?"><textarea rows={3} value={post.caseFile?.finding ?? ""} onChange={event => setPost(setCaseFile(post, { finding: event.target.value }))} placeholder="Basınç anahtarı arızalı" /></Field>
                <Field label="Yapılan işlem" help="Ne yapıldı, ne değişti?"><textarea rows={3} value={post.caseFile?.action ?? ""} onChange={event => setPost(setCaseFile(post, { action: event.target.value }))} placeholder="Basınç anahtarı değiştirildi" /></Field>
              </div>
  );

  const readiness = (
    <div className="admin-card admin-ready">
      <h3>{sheet.canPublish ? "Yayına hazır" : "Yayına hazırlık"}</h3>
      <ol className="admin-ready-list">
        {groups.map(group => (
          <li key={group.id} className={group.missing ? "is-todo" : group.empty ? "is-optional" : "is-done"}>
            <button type="button" className="admin-link" onClick={() => jump(group.id)}>{group.label}</button>
            <span>{group.missing ? `${group.missing} eksik` : group.empty ? "isteğe bağlı" : "✓"}</span>
          </li>
        ))}
      </ol>
      <p className="admin-muted">{sheet.canPublish ? "Zorunlu alanlar tamam; kaydedebilir ya da yayınlayabilirsiniz." : "Eksikler tamamlanınca “Taslak kaydet” ve “Yayınla” düğmeleri açılır."}</p>
      {hasContent && (
        <>
          <h4>Öneriler <small>(engellemez)</small></h4>
          <ul className="admin-advice">
            {sheet.advisory.map(check => <li key={check.id} className={check.ok ? "is-good" : "is-warn"}>{check.ok ? "✓" : "!"} {check.label}</li>)}
          </ul>
        </>
      )}
    </div>
  );

  return (
    <section className="admin-editor">
      <div className="admin-editbar">
        <div className="admin-editbar-row">
          <button className="admin-btn" onClick={onClose}>← Yazılar</button>
          <div className="admin-editbar-title">
            <strong>{post.title.trim() || (origin ? "Başlıksız yazı" : "Yeni yazı")}</strong>
            <small><span className={`admin-badge ${published ? "is-live" : "is-draft"}`}>{status}</span>{dirty && <span className="admin-unsaved"> Kaydedilmemiş değişiklik var</span>}</small>
          </div>
          <span className="admin-spacer" />
          <button className="admin-btn" onClick={() => setShowPreview(value => !value)}>{showPreview ? "Önizlemeyi kapat" : "Önizleme"}</button>
          {published && stored && <button className="admin-btn" onClick={() => onPackage({ post: stored, hash: origin!.hash })} title="Google İşletme ve Instagram paylaşım paketi">Paylaşım paketi</button>}
          {!published && <button className="admin-btn" disabled={busy || !sheet.canPublish} onClick={() => submit("draft")}>Taslak kaydet</button>}
          <button className="admin-btn admin-btn-primary" disabled={busy || !sheet.canPublish} onClick={() => submit("publish")}>{busy ? "Kaydediliyor…" : published ? "Güncelle ve yayınla" : "Yayınla"}</button>
        </div>
        {todo.length > 0 && (
          <p className="admin-editbar-note" role="status">
            Kaydetmek için tamamlayın:{" "}
            {todo.map(group => <button type="button" key={group.id} className="admin-todo" onClick={() => jump(group.id)}>{group.label} · {group.missing} eksik</button>)}
          </p>
        )}
      </div>

      {message && <p className="admin-ok" role="status">{message}</p>}
      {packageItem && <p className="admin-note" role="status">Yazı yayında. Google İşletme ve Instagram için paylaşım paketi hazır: <button type="button" className="admin-btn admin-btn-primary" onClick={() => onPackage(packageItem)}>Paylaşım paketini aç</button></p>}
      {errors.length > 0 && <div className="admin-error" role="alert"><strong>Kaydedilemedi:</strong><ul>{errors.map(line => <li key={line}>{line}</li>)}</ul></div>}

      <div className={`admin-editor-grid ${showPreview ? "has-preview" : "has-rail"}`}>
        <div className="admin-form">
          {isUsta && (
            <Section id="record" step={step("record")} title={showAi ? "Yapay zeka ile yazdır" : "Servis kaydı"} hint={showAi ? "Arızayı yazın, olası nedenlerden sahada yaptığınızı seçin, yazıyı yapay zeka hazırlasın" : "Yalnızca gerçek iş: nerede, hangi cihaz, ne şikâyet geldi, ne bulundu, ne yapıldı"} missing={missingOf("record")}>
              {caseIssues.length > 0 && <ul className="admin-missing">{caseIssues.map(line => <li key={line}>{line}</li>)}</ul>}
              {showAi ? (
                <Suspense fallback={<p className="admin-muted">Yükleniyor…</p>}>
                  <AiDraftBox post={post} existing={data.items.filter(entry => entry.post.slug !== origin?.slug).map(entry => ({ slug: entry.post.slug, order: entry.post.order }))} hasContent={hasContent} onDraft={fillFromAi} onTexts={setPendingTexts} details={recordDetails} onChoose={fields => setPost(current => setCaseFile(current, fields))}>{recordFields}</AiDraftBox>
                </Suspense>
              ) : <>{recordFields}{recordDetails}</>}
            </Section>
          )}

          <Section id="type" step={step("type")} title={isUsta ? "Yazı türü" : "Yazı türü ve cihaz"} hint={isUsta ? "Servis işi dışında bir rehber yazacaksanız buradan değiştirin" : "Ne tür bir yazı, hangi cihaz hakkında?"} missing={missingOf("type")}>
            {issues.type.length > 0 && <ul className="admin-missing">{issues.type.map(line => <li key={line}>{line}</li>)}</ul>}
            <div className="admin-choices" role="radiogroup" aria-label="Yazı türü">
              {blogCategories.map(category => (
                <label key={category} className={`admin-choice ${post.category === category ? "is-selected" : ""}`}>
                  <input type="radio" name="admin-category" checked={post.category === category} onChange={() => setPost(setCategory(post, category))} />
                  <span><strong>{category}</strong><small>{CATEGORY_HELP[category] ?? ""}</small></span>
                </label>
              ))}
            </div>
            <div className={isUsta ? "" : "admin-device-row"}>
              {!isUsta && (
                <Field label="Cihaz">
                  <select value={post.device} onChange={event => setPost(applyDeviceAndBrand(post, { device: event.target.value }))}>
                    {BLOG_DEVICES.map(option => <option key={option.device}>{option.device}</option>)}
                  </select>
                </Field>
              )}
              {post.device === GENERAL_DEVICE && (
                <Field label="Servis düğmesi nereye gitsin?">
                  <select value={post.servicePath} onChange={event => setPost(applyDeviceAndBrand(post, { generalPath: event.target.value }))}>
                    {GENERAL_SERVICE_PATHS.map(option => <option key={option.path} value={option.path}>{option.label}</option>)}
                  </select>
                </Field>
              )}
              <p className="admin-help">Yazının sonundaki servis düğmesi otomatik bağlanır: <code>{post.servicePath}</code>{post.brandPath && <> · marka sayfası <code>{post.brandPath}</code></>}</p>
            </div>
            {!device && <p className="admin-error">Bu cihaz listede yok; kaydetmeden önce listeden seçin.</p>}
          </Section>

          <Section id="article" step={step("article")} title="Yazı" hint="Okuyucunun göreceği her şey: başlık, kapak fotoğrafı ve metin" missing={missingOf("article")}>
            <Part title="Başlık ve tanıtım" hint="— Google’da ve yazının başında görünür" issues={issues.intro}>
              <Field label="Başlık" count={{ value: post.title.length, max: 70 }}><input value={post.title} onChange={event => setTitle(event.target.value)} /></Field>
              <div className="admin-cols admin-cols-2">
                <Field label="Açıklama" hint="(arama sonucu)" count={{ value: post.description.length, max: BLOG_DESCRIPTION_MAX }} help="Google’da başlığın altında görünür. 90–160 karakter önerilir.">
                  <textarea rows={4} value={post.description} onChange={event => patch({ description: event.target.value })} />
                </Field>
                <Field label="Özet" help="Yazının en başındaki kısa giriş; açıklamayı aynen tekrar etmesin."><textarea rows={4} value={post.excerpt} onChange={event => patch({ excerpt: event.target.value })} /></Field>
              </div>
              <div className="admin-address">
                <span>Sayfa adresi: <code>{post.slug || "başlık yazılınca oluşur"}</code></span>
                {slugLocked ? <small>Yayında olduğu için değiştirilemez.</small> : <button type="button" className="admin-link" onClick={() => setEditSlug(value => !value)}>{editSlug ? "Gizle" : "Elle değiştir"}</button>}
              </div>
              {editSlug && !slugLocked && (
                <Field label="Sayfa adresi" help="Normalde başlıktan otomatik üretilir. Yayınlandıktan sonra değiştirilemez.">
                  <input value={post.slug} onChange={event => { setSlugEdited(true); patch({ slug: event.target.value }); }} placeholder="/blog/ornek-yazi-adresi/" />
                </Field>
              )}
            </Part>

            <Part title="Kapak fotoğrafı" hint="(isteğe bağlı) — yazının üstünde ve paylaşım önizlemesinde görünür" issues={issues.cover}>
              {post.cover ? (
                <>
                  <ImageFields image={post.cover} onAlt={alt => patch({ cover: { ...post.cover!, alt } })} />
                  <div className="admin-inline"><button type="button" className="admin-btn admin-btn-danger" onClick={() => { const { cover: _removed, ...rest } = post; setPost(rest); }}>Kapağı kaldır</button></div>
                </>
              ) : (
                <ImagePicker label="+ Kapak fotoğrafı seç" disabled={photoBlock} onUploaded={cover => patch({ cover })} />
              )}
              <p className="admin-help">Kapaksız yazıların paylaşım görseli logodur. Fotoğraflar tarayıcıda küçültülür, konum bilgisi silinir ({photos}/{BLOG_IMAGE_LIMIT_PER_POST}).</p>
            </Part>

            <Part title="Metin" hint="— paragraf, ara başlık, liste, adımlar, not ve fotoğraf blokları" issues={issues.body}>
              {post.blocks.map((block, index) => (
                <div
                  className="admin-block"
                  key={index}
                  draggable
                  onDragStart={() => { dragFrom.current = index; }}
                  onDragOver={event => event.preventDefault()}
                  onDrop={() => { if (dragFrom.current !== null) patch({ blocks: moveItem(post.blocks, dragFrom.current, index) }); dragFrom.current = null; }}
                >
                  <div className="admin-block-head">
                    <span className="admin-handle" title="Sürükleyerek taşıyın" aria-hidden="true">⠿</span>
                    <strong>{index + 1}. {BLOCK_LABELS[block.type]}</strong>
                    <span className="admin-spacer" />
                    <button type="button" className="admin-btn admin-btn-icon" disabled={index === 0} onClick={() => patch({ blocks: moveItem(post.blocks, index, index - 1) })} aria-label="Yukarı taşı" title="Yukarı taşı">↑</button>
                    <button type="button" className="admin-btn admin-btn-icon" disabled={index === post.blocks.length - 1} onClick={() => patch({ blocks: moveItem(post.blocks, index, index + 1) })} aria-label="Aşağı taşı" title="Aşağı taşı">↓</button>
                    <button type="button" className="admin-btn admin-btn-danger" disabled={post.blocks.length === 1} onClick={() => patch({ blocks: removeAt(post.blocks, index) })} aria-label="Bloğu sil">Sil</button>
                  </div>
                  <BlockEditor block={block} onChange={next => setBlock(index, next)} />
                  <button type="button" className="admin-link admin-insert" onClick={() => patch({ blocks: insertAt(post.blocks, index + 1, emptyBlock("p")) })}>+ araya paragraf ekle</button>
                </div>
              ))}
              <div className="admin-addbar">
                <strong>Sona blok ekle</strong>
                <div className="admin-inline admin-wrap">
                  {TEXT_BLOCK_TYPES.map(type => <button type="button" key={type} className="admin-btn" onClick={() => addBlock(type)}>+ {BLOCK_LABELS[type]}</button>)}
                  <ImagePicker label="+ Fotoğraf" disabled={photoBlock} onUploaded={image => setPost(current => ({ ...current, blocks: [...current.blocks, { type: "image", ...image }] }))} />
                </div>
              </div>
            </Part>
          </Section>

          <Section id="sources" step="+" title="Kaynaklar" hint="Yalnızca Türkçe kaynak; çoğu yazıda gerekmez" missing={missingOf("sources")} optional filled={sources.length > 0} collapsible open={Boolean(open.sources)} onToggle={toggle}>
            {issues.sources.length > 0 && <ul className="admin-missing">{issues.sources.map(line => <li key={line}>{line}</li>)}</ul>}
            {sources.map((source, index) => (
              <div className="admin-inline" key={index}>
                <input value={source.label} placeholder="Kaynak adı" onChange={event => patch({ sources: replaceAt(sources, index, { ...source, label: event.target.value }) })} />
                <input value={source.url} placeholder="https://…" onChange={event => patch({ sources: replaceAt(sources, index, { ...source, url: event.target.value }) })} />
                <button type="button" className="admin-btn" onClick={() => patch({ sources: removeAt(sources, index) })} aria-label="Kaynağı sil">×</button>
              </div>
            ))}
            <button type="button" className="admin-btn" onClick={() => patch({ sources: [...sources, { label: "", url: "" }] })}>+ Kaynak</button>
          </Section>

          {origin && (
            <Section id="history" step="↺" title="Önceki sürümler" hint="Yanlış kaydedilen yazıyı eski hâline döndürmek için" optional collapsible open={Boolean(open.history)} onToggle={id => { toggle(id); if (!history) void loadHistory(); }}>
            {!history ? <p className="admin-muted">Geçmiş yükleniyor…</p> : (
              <ul className="admin-history">
                {history.map(entry => (
                  <li key={entry.sha}><span>{new Date(entry.date).toLocaleString("tr-TR")} · {entry.message}</span><button type="button" className="admin-btn" onClick={() => restore(entry)}>Bu sürümü yükle</button></li>
                ))}
                {history.length === 0 && <li className="admin-muted">Geçmiş bulunamadı.</li>}
              </ul>
            )}
            </Section>
          )}

          {showPreview && readiness}
        </div>

        {showPreview ? (
          <aside className="admin-preview-pane">
            <Suspense fallback={<p className="admin-muted">Önizleme yükleniyor…</p>}><Preview post={post} /></Suspense>
          </aside>
        ) : (
          <aside className="admin-rail">{readiness}</aside>
        )}
      </div>
    </section>
  );
}
