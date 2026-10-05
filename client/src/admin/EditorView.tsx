import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { blogCategories } from "@shared/blog-meta";
import { BLOG_BRANDS, BLOG_DEVICES, BLOG_DISTRICTS, GENERAL_DEVICE, GENERAL_SERVICE_PATHS, SMALL_APPLIANCE_DEVICE, SMALL_APPLIANCE_SUGGESTIONS } from "@shared/blog-taxonomy";
import { BLOG_DESCRIPTION_MAX, USTA_CATEGORY, type BlogPostInput } from "@shared/blog-schema";
import { BLOG_IMAGE_HOST, BLOG_IMAGE_LIMIT_PER_POST } from "@shared/blog-images";
import { api, ApiError, type HistoryEntry, type PostItem, type PostsResponse } from "./api";
import { ImageFields, ImagePicker } from "./ImagePicker";
import { nextOrder, todayInIstanbul } from "@shared/blog-publish";
import {
  applyDeviceAndBrand, BLOCK_LABELS, checklist, EDITOR_SECTION_LABELS, emptyBlock, errorsBySection, hasWrittenText, imageCount, insertAt, isPublished, moveItem, newPost, removeAt, replaceAt, setCaseFile, setCategory, slugFor, splitDistrict, TEXT_BLOCK_TYPES, toPayload,
  type BlogBlockInput, type EditorSection, type TextBlockType,
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
  "Ustanın Defterinden": "Sahada yaptığınız gerçek bir iş. Servis kaydı ister; yapay zeka taslak yazabilir.",
  "Bakım Rehberi": "Bir cihazın bakımı evde nasıl yapılır.",
  "Karar Rehberi": "Tamir mi, yenisi mi: nasıl karar verilir.",
  "Tüketici Rehberi": "Servis sürecinde bilinmesi gerekenler.",
};

type SectionId = EditorSection | "ai" | "history";

/**
 * Editörün numaralı bölümü: başlığa tıklayınca açılır/kapanır, sağında durumu yazar ("Tamam", "2 eksik", "İsteğe bağlı").
 * Eksikler sayfanın altında değil, ait oldukları bölümün başında listelenir.
 */
function Section({ id, step, title, hint, issues = [], optional, filled, open, onToggle, children }: { id: SectionId; step: number; title: string; hint?: string; issues?: string[]; optional?: boolean; filled?: boolean; open: boolean; onToggle: (id: SectionId) => void; children: ReactNode }) {
  const done = issues.length === 0 && (!optional || Boolean(filled));
  const state = issues.length ? "is-todo" : done ? "is-done" : "is-optional";
  return (
    <section className={`admin-section ${state} ${open ? "is-open" : ""}`} id={`admin-sec-${id}`}>
      <button type="button" className="admin-section-head" aria-expanded={open} aria-controls={`admin-sec-body-${id}`} onClick={() => onToggle(id)}>
        <span className="admin-step-no" aria-hidden="true">{done ? "✓" : step}</span>
        <span className="admin-section-title"><strong>{title}</strong>{hint && <small>{hint}</small>}</span>
        <span className="admin-chip">{issues.length ? `${issues.length} eksik` : done ? "Tamam" : "İsteğe bağlı"}</span>
        <span className="admin-chevron" aria-hidden="true">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="admin-section-body" id={`admin-sec-body-${id}`}>
          {issues.length > 0 && <ul className="admin-missing" aria-label="Bu bölümde eksikler">{issues.map(line => <li key={line}>{line}</li>)}</ul>}
          {children}
        </div>
      )}
    </section>
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
  const [post, setPost] = useState<BlogPostInput>(() => item?.post ?? newPost(today, nextOrder(data.items.map(entry => entry.post))));
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
  // Açık bölümler: zorunlu bölümler açık başlar; boş "Kaynaklar" ve "Önceki sürümler" kapalıdır.
  const [open, setOpen] = useState<Record<string, boolean>>(() => ({ type: true, case: true, ai: !item, intro: true, cover: true, body: true, sources: Boolean(item?.post.sources?.length), history: false }));
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
    setOpen(current => ({ ...current, intro: true, body: true }));
  };
  const hasContent = hasWrittenText(post);

  const addBlock = (type: TextBlockType) => patch({ blocks: [...post.blocks, emptyBlock(type)] });
  const photos = imageCount(post);
  // Fotoğraf yüklemesi: alan (BLOG_IMAGE_HOST) ayarlanmadıysa ya da yazı sınıra ulaştıysa kapalıdır; nedeni düğmenin yanında yazar.
  const photoBlock = !BLOG_IMAGE_HOST ? "Fotoğraf yükleme henüz açılmadı (Blob store adresi shared/blog-images.ts içinde ayarlı değil)." : photos >= BLOG_IMAGE_LIMIT_PER_POST ? `Bir yazıda en çok ${BLOG_IMAGE_LIMIT_PER_POST} fotoğraf olur.` : undefined;
  const sources = post.sources ?? [];

  const toggle = (id: SectionId) => setOpen(current => ({ ...current, [id]: !current[id] }));
  /** Bölümü açar ve oraya kaydırır (üstteki eksik düğmeleri ve sağdaki liste bunu kullanır). */
  const jump = (id: SectionId) => {
    setOpen(current => ({ ...current, [id]: true }));
    window.requestAnimationFrame(() => document.getElementById(`admin-sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const place = splitDistrict(post.caseFile?.district);
  const showAi = isUsta && !published;
  // Ekrandaki bölümler ve sıra numaraları (servis kaydı ve yapay zeka yalnızca "Ustanın Defterinden" yazısında görünür).
  const visible: SectionId[] = ["type", ...(isUsta ? (["case"] as SectionId[]) : []), ...(showAi ? (["ai"] as SectionId[]) : []), "intro", "cover", "body", "sources"];
  const step = (id: SectionId) => visible.indexOf(id) + 1;
  const todo = visible.filter((id): id is EditorSection => id !== "ai" && id !== "history" && issues[id].length > 0);
  const status = origin ? (published ? "Yayında" : "Taslak") : "Yeni";

  const readiness = (
    <div className="admin-card admin-ready">
      <h3>{sheet.canPublish ? "Yayına hazır" : "Yayına hazırlık"}</h3>
      <ol className="admin-ready-list">
        {visible.filter((id): id is EditorSection => id !== "ai" && id !== "history").map(id => {
          const empty = (id === "cover" && !post.cover) || (id === "sources" && sources.length === 0);
          return (
            <li key={id} className={issues[id].length ? "is-todo" : empty ? "is-optional" : "is-done"}>
              <button type="button" className="admin-link" onClick={() => jump(id)}>{EDITOR_SECTION_LABELS[id]}</button>
              <span>{issues[id].length ? `${issues[id].length} eksik` : empty ? "isteğe bağlı" : "✓"}</span>
            </li>
          );
        })}
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
            {todo.map(id => <button type="button" key={id} className="admin-todo" onClick={() => jump(id)}>{EDITOR_SECTION_LABELS[id]} · {issues[id].length}</button>)}
          </p>
        )}
      </div>

      {message && <p className="admin-ok" role="status">{message}</p>}
      {packageItem && <p className="admin-note" role="status">Yazı yayında. Google İşletme ve Instagram için paylaşım paketi hazır: <button type="button" className="admin-btn admin-btn-primary" onClick={() => onPackage(packageItem)}>Paylaşım paketini aç</button></p>}
      {errors.length > 0 && <div className="admin-error" role="alert"><strong>Kaydedilemedi:</strong><ul>{errors.map(line => <li key={line}>{line}</li>)}</ul></div>}

      <div className={`admin-editor-grid ${showPreview ? "has-preview" : "has-rail"}`}>
        <div className="admin-form">
          <Section id="type" step={step("type")} title="Yazı türü ve cihaz" hint="Ne tür bir yazı, hangi cihaz hakkında?" issues={issues.type} open={open.type} onToggle={toggle}>
            <div className="admin-choices" role="radiogroup" aria-label="Kategori">
              {blogCategories.map(category => (
                <label key={category} className={`admin-choice ${post.category === category ? "is-selected" : ""}`}>
                  <input type="radio" name="admin-category" checked={post.category === category} onChange={() => setPost(setCategory(post, category))} />
                  <span><strong>{category}</strong><small>{CATEGORY_HELP[category] ?? ""}</small></span>
                </label>
              ))}
            </div>
            <div className="admin-cols">
              <Field label="Cihaz">
                <select value={post.device} onChange={event => setPost(applyDeviceAndBrand(post, { device: event.target.value }))}>
                  {BLOG_DEVICES.map(option => <option key={option.device}>{option.device}</option>)}
                </select>
              </Field>
              {post.device === GENERAL_DEVICE && (
                <Field label="Servis düğmesi nereye gitsin?">
                  <select value={post.servicePath} onChange={event => setPost(applyDeviceAndBrand(post, { generalPath: event.target.value }))}>
                    {GENERAL_SERVICE_PATHS.map(option => <option key={option.path} value={option.path}>{option.label}</option>)}
                  </select>
                </Field>
              )}
            </div>
            <p className="admin-help">Yazının sonundaki servis düğmesi otomatik bağlanır: <code>{post.servicePath}</code>{post.serviceLabel && <> (“{post.serviceLabel}”)</>}{post.brandPath && <> · marka sayfası <code>{post.brandPath}</code></>}</p>
            {!device && <p className="admin-error">Bu cihaz listede yok; kaydetmeden önce listeden seçin.</p>}
          </Section>

          {isUsta && (
            <Section id="case" step={step("case")} title="Servis kaydı" hint="Yalnızca gerçek iş: ne şikâyet geldi, ne bulundu, ne yapıldı" issues={issues.case} open={open.case} onToggle={toggle}>
              <div className="admin-cols">
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
              <Field label="Şikâyet" help="Müşteri ne dedi?"><textarea rows={2} value={post.caseFile?.complaint ?? ""} onChange={event => setPost(setCaseFile(post, { complaint: event.target.value }))} placeholder="Makine su almıyor" /></Field>
              <Field label="Tespit" help="Arızanın nedeni neydi?"><textarea rows={2} value={post.caseFile?.finding ?? ""} onChange={event => setPost(setCaseFile(post, { finding: event.target.value }))} placeholder="Basınç anahtarı arızalı" /></Field>
              <Field label="Yapılan işlem" help="Ne yapıldı, ne değişti?"><textarea rows={2} value={post.caseFile?.action ?? ""} onChange={event => setPost(setCaseFile(post, { action: event.target.value }))} placeholder="Basınç anahtarı değiştirildi" /></Field>
            </Section>
          )}

          {showAi && (
            <Section id="ai" step={step("ai")} title="Yapay zeka ile yazdır" hint="Servis kaydından başlık ve metin taslağı; isterseniz atlayıp kendiniz yazın" optional filled={hasContent} open={open.ai} onToggle={toggle}>
              <Suspense fallback={<p className="admin-muted">Yükleniyor…</p>}>
                <AiDraftBox post={post} existing={data.items.filter(entry => entry.post.slug !== origin?.slug).map(entry => ({ slug: entry.post.slug, order: entry.post.order }))} hasContent={hasContent} onDraft={fillFromAi} onTexts={setPendingTexts} />
              </Suspense>
            </Section>
          )}

          <Section id="intro" step={step("intro")} title="Başlık ve tanıtım" hint="Google’da ve yazının başında görünen metinler" issues={issues.intro} open={open.intro} onToggle={toggle}>
            <Field label="Başlık" count={{ value: post.title.length, max: 70 }}><input value={post.title} onChange={event => setTitle(event.target.value)} /></Field>
            <Field label="Açıklama" hint="(arama sonucu)" count={{ value: post.description.length, max: BLOG_DESCRIPTION_MAX }} help="Google’da başlığın altında görünür. 90–160 karakter önerilir; başka yazının açıklamasıyla aynı olamaz.">
              <textarea rows={3} value={post.description} onChange={event => patch({ description: event.target.value })} />
            </Field>
            <Field label="Özet" help="Yazının en başında görünen kısa giriş; açıklamayı kelimesi kelimesine tekrar etmesin."><textarea rows={2} value={post.excerpt} onChange={event => patch({ excerpt: event.target.value })} /></Field>
            <div className="admin-address">
              <span>Sayfa adresi: <code>{post.slug || "başlık yazılınca oluşur"}</code></span>
              {slugLocked ? <small>Yayında olduğu için değiştirilemez.</small> : <button type="button" className="admin-link" onClick={() => setEditSlug(value => !value)}>{editSlug ? "Gizle" : "Elle değiştir"}</button>}
            </div>
            {editSlug && !slugLocked && (
              <Field label="Sayfa adresi" help="Normalde başlıktan otomatik üretilir. Yayınlandıktan sonra değiştirilemez.">
                <input value={post.slug} onChange={event => { setSlugEdited(true); patch({ slug: event.target.value }); }} placeholder="/blog/ornek-yazi-adresi/" />
              </Field>
            )}
          </Section>

          <Section id="cover" step={step("cover")} title="Kapak fotoğrafı" hint="Yazının üstünde ve paylaşım önizlemesinde görünür" issues={issues.cover} optional filled={Boolean(post.cover)} open={open.cover} onToggle={toggle}>
            {post.cover ? (
              <>
                <ImageFields image={post.cover} onAlt={alt => patch({ cover: { ...post.cover!, alt } })} />
                <div className="admin-inline"><button type="button" className="admin-btn admin-btn-danger" onClick={() => { const { cover: _removed, ...rest } = post; setPost(rest); }}>Kapağı kaldır</button></div>
              </>
            ) : (
              <ImagePicker label="+ Kapak fotoğrafı seç" disabled={photoBlock} onUploaded={cover => patch({ cover })} />
            )}
            <p className="admin-help">Kapaksız yazıların paylaşım görseli logodur. Fotoğraflar tarayıcıda küçültülür, konum bilgisi silinir ({photos}/{BLOG_IMAGE_LIMIT_PER_POST}).</p>
          </Section>

          <Section id="body" step={step("body")} title="Yazı metni" hint="Paragraf, ara başlık, liste, adımlar, not ve fotoğraf blokları" issues={issues.body} open={open.body} onToggle={toggle}>
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
          </Section>

          <Section id="sources" step={step("sources")} title="Kaynaklar" hint="Yalnızca Türkçe kaynak; çoğu yazıda gerekmez" issues={issues.sources} optional filled={sources.length > 0} open={open.sources} onToggle={toggle}>
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
            <section className={`admin-section is-optional ${open.history ? "is-open" : ""}`} id="admin-sec-history">
              <button type="button" className="admin-section-head" aria-expanded={open.history} onClick={() => { toggle("history"); if (!history) void loadHistory(); }}>
                <span className="admin-step-no" aria-hidden="true">↺</span>
                <span className="admin-section-title"><strong>Önceki sürümler</strong><small>Yanlış kaydedilen yazıyı eski hâline döndürmek için</small></span>
                <span className="admin-chevron" aria-hidden="true">{open.history ? "▾" : "▸"}</span>
              </button>
              {open.history && (
                <div className="admin-section-body">
                  {!history ? <p className="admin-muted">Geçmiş yükleniyor…</p> : (
                    <ul className="admin-history">
                      {history.map(entry => (
                        <li key={entry.sha}><span>{new Date(entry.date).toLocaleString("tr-TR")} · {entry.message}</span><button type="button" className="admin-btn" onClick={() => restore(entry)}>Bu sürümü yükle</button></li>
                      ))}
                      {history.length === 0 && <li className="admin-muted">Geçmiş bulunamadı.</li>}
                    </ul>
                  )}
                </div>
              )}
            </section>
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
