import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { blogCategories } from "@shared/blog-meta";
import { BLOG_BRANDS, BLOG_DEVICES, BLOG_DISTRICTS, GENERAL_DEVICE, GENERAL_SERVICE_PATHS, SMALL_APPLIANCE_DEVICE, SMALL_APPLIANCE_SUGGESTIONS } from "@shared/blog-taxonomy";
import { BLOG_DESCRIPTION_MAX, USTA_CATEGORY, type BlogPostInput } from "@shared/blog-schema";
import { BLOG_IMAGE_HOST, BLOG_IMAGE_LIMIT_PER_POST } from "@shared/blog-images";
import { api, ApiError, type HistoryEntry, type PostItem, type PostsResponse } from "./api";
import { ImageFields, ImagePicker } from "./ImagePicker";
import { nextOrder, todayInIstanbul } from "@shared/blog-publish";
import {
  applyDeviceAndBrand, BLOCK_LABELS, blockingSummary, checklist, emptyBlock, imageCount, insertAt, isPublished, moveItem, newPost, removeAt, replaceAt, setCaseFile, setCategory, slugFor, TEXT_BLOCK_TYPES, toPayload,
  type BlogBlockInput, type TextBlockType,
} from "./editorModel";

const Preview = lazy(() => import("./Preview"));
const AiDraftBox = lazy(() => import("./AiDraftBox"));

type Props = { data: PostsResponse; item: PostItem | null; reload: () => Promise<PostsResponse | null>; onClose: () => void; notify: (message: string) => void };

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="admin-field"><span>{label}{hint && <small> {hint}</small>}</span>{children}</label>;
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

export default function EditorView({ data, item, reload, onClose, notify }: Props) {
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
  const dragFrom = useRef<number | null>(null);

  const stored = origin ? data.items.find(entry => entry.post.slug === origin.slug)?.post : undefined;
  const published = stored ? isPublished(stored) : false;
  const slugLocked = published;
  const sheet = useMemo(() => checklist(post), [post]);
  const isUsta = post.category === USTA_CATEGORY;
  const device = BLOG_DEVICES.find(option => option.device === post.device);
  const dirty = useMemo(() => !item || JSON.stringify(post) !== JSON.stringify(item.post), [post, item]);

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
      if (result.noChange) {
        setMessage("Değişiklik yok; kaydedilecek bir şey bulunamadı.");
      } else {
        const saved = fresh?.items.find(entry => entry.post.slug === result.slug);
        if (saved) { setOrigin({ slug: saved.post.slug, hash: saved.hash }); setPost(saved.post); }
        setSlugEdited(true);
        const tail = result.status === "published" ? (result.siteAffecting ? "Site birkaç dakika içinde güncellenir (Yayın durumu sekmesinden izleyin)." : "") : "Taslak kaydedildi; sitede görünmez.";
        setMessage(`${result.status === "published" ? "Yayınlandı." : "Kaydedildi."} ${tail}${result.warnings.length ? ` Uyarılar: ${result.warnings.join("; ")}` : ""}`);
        notify(result.status === "published" ? "Yazı yayınlandı." : "Taslak kaydedildi.");
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

  // Yapay zeka taslağı yalnızca editöre dolar; kaydedilmiş taslağın adresi ve sırası korunur. Kaydetme yine aşağıdaki düğmelerle yapılır.
  const fillFromAi = (draft: BlogPostInput) => {
    setPost(current => (origin ? { ...draft, slug: current.slug, order: current.order } : draft));
    setSlugEdited(Boolean(origin));
    setErrors([]);
    setMessage("Yapay zeka taslağı editöre dolduruldu. Henüz kaydedilmedi; okuyup düzelttikten sonra kaydedin.");
  };
  const hasContent = Boolean(post.title.trim() || post.description.trim() || post.cover || post.blocks.some(block => block.type === "image" || JSON.stringify(block) !== JSON.stringify(emptyBlock(block.type))));

  const addBlock = (type: TextBlockType) => patch({ blocks: [...post.blocks, emptyBlock(type)] });
  const photos = imageCount(post);
  // Fotoğraf yüklemesi: alan (BLOG_IMAGE_HOST) ayarlanmadıysa ya da yazı sınıra ulaştıysa kapalıdır; nedeni düğmenin yanında yazar.
  const photoBlock = !BLOG_IMAGE_HOST ? "Fotoğraf yükleme henüz açılmadı (Blob store adresi shared/blog-images.ts içinde ayarlı değil)." : photos >= BLOG_IMAGE_LIMIT_PER_POST ? `Bir yazıda en çok ${BLOG_IMAGE_LIMIT_PER_POST} fotoğraf olur.` : undefined;
  const sources = post.sources ?? [];

  return (
    <section className="admin-editor">
      <div className="admin-toolbar">
        <button className="admin-btn" onClick={onClose}>← Yazılar</button>
        <strong>{origin ? (published ? "Yayındaki yazıyı düzenle" : "Taslağı düzenle") : "Yeni yazı"}</strong>
        <span className="admin-spacer" />
        <button className="admin-btn" onClick={() => setShowPreview(value => !value)}>{showPreview ? "Önizlemeyi gizle" : "Canlı önizleme"}</button>
        {!published && <button className="admin-btn" disabled={busy || !sheet.canPublish} onClick={() => submit("draft")}>Taslak kaydet</button>}
        <button className="admin-btn admin-btn-primary" disabled={busy || !sheet.canPublish} onClick={() => submit("publish")}>{published ? "Güncelle ve yayınla" : "Yayınla"}</button>
      </div>

      {!sheet.canPublish && <p className="admin-note" role="status">Kaydetmek için tamamlanması gerekenler: {blockingSummary(sheet.errors)}</p>}
      {message && <p className="admin-ok" role="status">{message}</p>}
      {errors.length > 0 && <div className="admin-error" role="alert"><strong>Kaydedilemedi:</strong><ul>{errors.map(line => <li key={line}>{line}</li>)}</ul></div>}

      <div className={`admin-editor-grid ${showPreview ? "has-preview" : ""}`}>
        <div className="admin-form">
          <Suspense fallback={null}>
            <AiDraftBox existing={data.items.filter(entry => entry.post.slug !== origin?.slug).map(entry => ({ slug: entry.post.slug, order: entry.post.order }))} canGenerate={!published} hasContent={hasContent} onDraft={fillFromAi} />
          </Suspense>
          <Field label="Kategori">
            <select value={post.category} onChange={event => setPost(setCategory(post, event.target.value as BlogPostInput["category"]))}>
              {blogCategories.map(category => <option key={category}>{category}</option>)}
            </select>
          </Field>

          <Field label="Başlık" hint={`${post.title.length}/70`}><input value={post.title} onChange={event => setTitle(event.target.value)} /></Field>
          <Field label="Adres (slug)" hint={slugLocked ? "— yayında olduğu için kilitli" : "— başlıktan üretilir; kaydedildikten sonra değiştirilebilir, yayınlandıktan sonra kilitlenir"}>
            <input value={post.slug} disabled={slugLocked} onChange={event => { setSlugEdited(true); patch({ slug: event.target.value }); }} />
          </Field>
          <Field label="Açıklama (arama sonucu)" hint={`${post.description.length}/${BLOG_DESCRIPTION_MAX}`}>
            <textarea rows={3} value={post.description} onChange={event => patch({ description: event.target.value })} />
          </Field>
          <p className={`admin-counter ${post.description.length > BLOG_DESCRIPTION_MAX ? "is-over" : ""}`}>{post.description.length} / {BLOG_DESCRIPTION_MAX} karakter</p>
          <Field label="Özet (yazı başında görünür)"><textarea rows={2} value={post.excerpt} onChange={event => patch({ excerpt: event.target.value })} /></Field>

          <fieldset className="admin-box">
            <legend>Kapak fotoğrafı (isteğe bağlı)</legend>
            {post.cover ? (
              <>
                <ImageFields image={post.cover} onAlt={alt => patch({ cover: { ...post.cover!, alt } })} />
                <div className="admin-inline"><button type="button" className="admin-btn admin-btn-danger" onClick={() => { const { cover: _removed, ...rest } = post; setPost(rest); }}>Kapağı kaldır</button></div>
              </>
            ) : (
              <ImagePicker label="+ Kapak fotoğrafı seç" disabled={photoBlock} onUploaded={cover => patch({ cover })} />
            )}
            <p className="admin-muted">Kapak sayfanın üstünde görünür ve paylaşım önizlemesinde (WhatsApp, Facebook) kullanılır; kapaksız yazıların paylaşım görseli logodur. Fotoğraflar tarayıcıda küçültülür, konum bilgisi silinir ({photos}/{BLOG_IMAGE_LIMIT_PER_POST}).</p>
          </fieldset>

          <fieldset className="admin-box">
            <legend>Cihaz ve servis bağlantısı</legend>
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
            <p className="admin-muted">Servis adresi: <code>{post.servicePath}</code>{post.brandPath && <> · Marka adresi: <code>{post.brandPath}</code></>}{post.serviceLabel && <> · Düğme: “{post.serviceLabel}”</>} <small>(otomatik)</small></p>
            {!device && <p className="admin-error">Bu cihaz listede yok; kaydetmeden önce listeden seçin.</p>}
          </fieldset>

          {isUsta && (
            <fieldset className="admin-box">
              <legend>Servis kaydı (yalnızca gerçek işler)</legend>
              <Field label="İlçe">
                <select value={BLOG_DISTRICTS.find(name => post.caseFile?.district.startsWith(name)) ?? ""} onChange={event => setPost(setCaseFile(post, { district: event.target.value }))}>
                  <option value="">Seçin</option>
                  {BLOG_DISTRICTS.map(name => <option key={name}>{name}</option>)}
                </select>
              </Field>
              <Field label="Mahalle (isteğe bağlı)">
                <input value={(post.caseFile?.district ?? "").replace(/^[^·]*·?\s*/, "")} onChange={event => {
                  const name = BLOG_DISTRICTS.find(item => post.caseFile?.district.startsWith(item));
                  if (name) setPost(setCaseFile(post, { district: event.target.value.trim() ? `${name} · ${event.target.value}` : name }));
                }} />
              </Field>
              <Field label="Marka">
                <select value={post.caseFile?.brand ?? ""} onChange={event => setPost(setCaseFile(post, { brand: event.target.value }))}>
                  <option value="">Seçin</option>
                  {BLOG_BRANDS.map(brand => <option key={brand.slug}>{brand.name}</option>)}
                </select>
              </Field>
              <Field label="Cihaz adı (kayıtta görünen)" hint={post.device === SMALL_APPLIANCE_DEVICE ? "— örn. Airfryer" : ""}>
                <input list="admin-small-appliances" value={post.caseFile?.device ?? ""} onChange={event => setPost(setCaseFile(post, { device: event.target.value }))} />
                <datalist id="admin-small-appliances">{SMALL_APPLIANCE_SUGGESTIONS.map(name => <option key={name} value={name} />)}</datalist>
              </Field>
              <Field label="Şikâyet"><textarea rows={2} value={post.caseFile?.complaint ?? ""} onChange={event => setPost(setCaseFile(post, { complaint: event.target.value }))} /></Field>
              <Field label="Tespit"><textarea rows={2} value={post.caseFile?.finding ?? ""} onChange={event => setPost(setCaseFile(post, { finding: event.target.value }))} /></Field>
              <Field label="Yapılan işlem"><textarea rows={2} value={post.caseFile?.action ?? ""} onChange={event => setPost(setCaseFile(post, { action: event.target.value }))} /></Field>
            </fieldset>
          )}

          <fieldset className="admin-box">
            <legend>İçerik blokları</legend>
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
                  <strong>{BLOCK_LABELS[block.type]}</strong>
                  <span className="admin-spacer" />
                  <button type="button" className="admin-btn" disabled={index === 0} onClick={() => patch({ blocks: moveItem(post.blocks, index, index - 1) })} aria-label="Yukarı taşı">↑</button>
                  <button type="button" className="admin-btn" disabled={index === post.blocks.length - 1} onClick={() => patch({ blocks: moveItem(post.blocks, index, index + 1) })} aria-label="Aşağı taşı">↓</button>
                  <button type="button" className="admin-btn admin-btn-danger" disabled={post.blocks.length === 1} onClick={() => patch({ blocks: removeAt(post.blocks, index) })} aria-label="Bloğu sil">Sil</button>
                </div>
                <BlockEditor block={block} onChange={next => setBlock(index, next)} />
                <button type="button" className="admin-link admin-insert" onClick={() => patch({ blocks: insertAt(post.blocks, index + 1, emptyBlock("p")) })}>+ buraya paragraf ekle</button>
              </div>
            ))}
            <div className="admin-inline admin-wrap">
              {TEXT_BLOCK_TYPES.map(type => <button type="button" key={type} className="admin-btn" onClick={() => addBlock(type)}>+ {BLOCK_LABELS[type]}</button>)}
              <ImagePicker label="+ Fotoğraf" disabled={photoBlock} onUploaded={image => setPost(current => ({ ...current, blocks: [...current.blocks, { type: "image", ...image }] }))} />
            </div>
          </fieldset>

          <fieldset className="admin-box">
            <legend>Kaynaklar (yalnızca Türkçe)</legend>
            {sources.map((source, index) => (
              <div className="admin-inline" key={index}>
                <input value={source.label} placeholder="Kaynak adı" onChange={event => patch({ sources: replaceAt(sources, index, { ...source, label: event.target.value }) })} />
                <input value={source.url} placeholder="https://…" onChange={event => patch({ sources: replaceAt(sources, index, { ...source, url: event.target.value }) })} />
                <button type="button" className="admin-btn" onClick={() => patch({ sources: removeAt(sources, index) })} aria-label="Kaynağı sil">×</button>
              </div>
            ))}
            <button type="button" className="admin-btn" onClick={() => patch({ sources: [...sources, { label: "", url: "" }] })}>+ Kaynak</button>
          </fieldset>

          {origin && (
            <fieldset className="admin-box">
              <legend>Önceki sürümler</legend>
              {!history ? <button type="button" className="admin-btn" onClick={loadHistory}>Geçmişi göster</button> : (
                <ul className="admin-history">
                  {history.map(entry => (
                    <li key={entry.sha}><span>{new Date(entry.date).toLocaleString("tr-TR")} · {entry.message}</span><button type="button" className="admin-btn" onClick={() => restore(entry)}>Bu sürümü yükle</button></li>
                  ))}
                  {history.length === 0 && <li className="admin-muted">Geçmiş bulunamadı.</li>}
                </ul>
              )}
            </fieldset>
          )}

          <fieldset className="admin-box admin-checklist">
            <legend>Yayın öncesi kontrol</legend>
            <ul>
              {sheet.errors.map(line => <li key={line} className="is-bad">✕ {line}</li>)}
              {sheet.errors.length === 0 && <li className="is-good">✓ Zorunlu kurallar tamam; yayınlanabilir</li>}
              {sheet.advisory.map(check => <li key={check.id} className={check.ok ? "is-good" : "is-warn"}>{check.ok ? "✓" : "!"} {check.label}</li>)}
            </ul>
            <p className="admin-muted">✕ işaretliler taslak kaydını da yayını da engeller. ! işaretliler öneridir; engellemez.</p>
          </fieldset>
        </div>

        {showPreview && (
          <aside className="admin-preview-pane">
            <Suspense fallback={<p className="admin-muted">Önizleme yükleniyor…</p>}><Preview post={post} /></Suspense>
          </aside>
        )}
      </div>
    </section>
  );
}
