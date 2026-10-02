import { useState, type ReactNode } from "react";
import { AI_CASE_DEVICES, AI_GOOGLE_BUSINESS_MAX, AI_INSTAGRAM_MAX, AI_NOTE_MAX, placeAiDraft, validateAiCaseInput, type AiCaseInput } from "@shared/blog-ai";
import { todayInIstanbul } from "@shared/blog-publish";
import type { BlogPostInput } from "@shared/blog-schema";
import { BLOG_BRANDS, BLOG_DISTRICTS, SMALL_APPLIANCE_DEVICE, SMALL_APPLIANCE_SUGGESTIONS } from "@shared/blog-taxonomy";
import { api, ApiError } from "./api";

type Props = {
  /** Mevcut yazıların adres ve sıraları: taslağın adresi ve sırası bunlarla çakışmayacak şekilde kurulur. */
  existing: { slug: string; order: number }[];
  /** Yayındaki yazıda yeni taslak üretilmez; daha önce üretilen sosyal metinler (yayından sonra kopyalamak için) görünmeye devam eder. */
  canGenerate: boolean;
  /** Editörde yazılmış metin var mı; varsa üzerine yazmadan önce açık onay istenir. */
  hasContent: boolean;
  /** Denetimden geçen taslak editöre doldurulur. Kaydetme ve yayın editörün kendi düğmeleriyle yapılır. */
  onDraft: (post: BlogPostInput) => void;
};

type Form = { topic: string; district: string; neighborhood: string; brand: string; device: string; deviceName: string; complaint: string; finding: string; action: string; note: string };
const EMPTY: Form = { topic: "", district: "", neighborhood: "", brand: "", device: AI_CASE_DEVICES[0], deviceName: "", complaint: "", finding: "", action: "", note: "" };

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="admin-field"><span>{label}{hint && <small> {hint}</small>}</span>{children}</label>;
}

/** Formdaki boş isteğe bağlı alanları atar; doğrulama ortak şemayla (sunucuyla aynı) yapılır. */
export function toAiInput(form: Form): unknown {
  const { neighborhood, deviceName, note, ...required } = form;
  return {
    ...required,
    ...(neighborhood.trim() ? { neighborhood } : {}),
    ...(form.device === SMALL_APPLIANCE_DEVICE && deviceName.trim() ? { deviceName } : {}),
    ...(note.trim() ? { note } : {}),
  };
}

/** Vaka girdi formu → yapay zeka taslağı. Hiçbir şey kaydetmez; sonuç editöre taslak olarak dolar. */
export default function AiDraftBox({ existing, canGenerate, hasContent, onDraft }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [info, setInfo] = useState("");
  const [texts, setTexts] = useState<{ googleBusiness: string; instagram: string } | null>(null);
  const [copied, setCopied] = useState("");

  const set = (change: Partial<Form>) => setForm(current => ({ ...current, ...change }));
  const checked = validateAiCaseInput(toAiInput(form));

  const run = async () => {
    if (!checked.ok) return;
    const input: AiCaseInput = checked.input;
    setBusy(true);
    setErrors([]);
    setInfo("");
    try {
      const response = await api.aiDraft(input);
      // Sunucunun yanıtı da güvenilmez sayılır: şema, içerik kuralları ve "girilmemiş ayrıntı" denetimi burada yeniden çalışır.
      const placed = placeAiDraft(input, response, existing, todayInIstanbul());
      if (!placed.ok) {
        setErrors(["Taslak içerik kurallarından geçmedi; editöre aktarılmadı.", ...placed.errors]);
        return;
      }
      onDraft(placed.draft.post);
      setTexts({ googleBusiness: placed.draft.googleBusiness, instagram: placed.draft.instagram });
      setOverwrite(false);
      setInfo(`Taslak editöre dolduruldu; henüz kaydedilmedi. Okuyup düzeltin, sonra “Taslak kaydet” ya da “Yayınla” düğmesini kullanın. Bugün kalan hak: ${response.remaining}.`);
    } catch (failure) {
      if (failure instanceof ApiError) setErrors(failure.errors?.length ? [failure.message, ...failure.errors] : [failure.message]);
      else setErrors(["Beklenmeyen bir hata oluştu."]);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (key: "googleBusiness" | "instagram") => {
    if (!texts) return;
    try { await navigator.clipboard.writeText(texts[key]); setCopied(key); } catch { setCopied(""); }
  };

  const socialTexts = texts && (
    <div className="admin-ai-texts">
      <p className="admin-muted">Bu iki metin kaydedilmez; sayfadan ayrılmadan önce kopyalayın. Paylaşmadan önce okuyun ve düzeltin.</p>
      <Field label="Google İşletme metni" hint={`${texts.googleBusiness.length}/${AI_GOOGLE_BUSINESS_MAX}`}><textarea rows={7} value={texts.googleBusiness} onChange={event => { setCopied(""); setTexts({ ...texts, googleBusiness: event.target.value }); }} /></Field>
      <button type="button" className="admin-btn" onClick={() => copy("googleBusiness")}>{copied === "googleBusiness" ? "Kopyalandı" : "Google İşletme metnini kopyala"}</button>
      <Field label="Instagram metni" hint={`${texts.instagram.length}/${AI_INSTAGRAM_MAX}`}><textarea rows={9} value={texts.instagram} onChange={event => { setCopied(""); setTexts({ ...texts, instagram: event.target.value }); }} /></Field>
      <button type="button" className="admin-btn" onClick={() => copy("instagram")}>{copied === "instagram" ? "Kopyalandı" : "Instagram metnini kopyala"}</button>
    </div>
  );

  if (!canGenerate) return texts ? <fieldset className="admin-box admin-ai"><legend>Paylaşım metinleri</legend>{socialTexts}</fieldset> : null;

  if (!open) {
    return (
      <div className="admin-ai-closed">
        <button type="button" className="admin-btn" onClick={() => setOpen(true)}>Yapay zeka ile taslak oluştur</button>
        <span className="admin-muted">Servis kaydını girin; yazı taslağı, Google İşletme ve Instagram metni hazırlansın.</span>
      </div>
    );
  }

  return (
    <fieldset className="admin-box admin-ai">
      <legend>Yapay zeka ile taslak (Ustanın Defterinden)</legend>
      <p className="admin-muted">Yalnızca gerçek işi yazın; yapay zeka vaka ayrıntısı ekleyemez, yalnızca genel teknik açıklama yazar. Müşteri adı, telefon ve açık adres yazmayın; fiyat yazmayın.</p>
      <Field label="Konu" hint="— yazının anlatacağı şey, bir cümle"><input value={form.topic} onChange={event => set({ topic: event.target.value })} placeholder="Su almayan çamaşır makinesinde basınç anahtarı arızası" /></Field>
      <div className="admin-ai-grid">
        <Field label="İlçe">
          <select value={form.district} onChange={event => set({ district: event.target.value })}>
            <option value="">Seçin</option>
            {BLOG_DISTRICTS.map(name => <option key={name}>{name}</option>)}
          </select>
        </Field>
        <Field label="Mahalle" hint="(isteğe bağlı)"><input value={form.neighborhood} onChange={event => set({ neighborhood: event.target.value })} /></Field>
        <Field label="Marka">
          <select value={form.brand} onChange={event => set({ brand: event.target.value })}>
            <option value="">Seçin</option>
            {BLOG_BRANDS.map(brand => <option key={brand.slug}>{brand.name}</option>)}
          </select>
        </Field>
        <Field label="Cihaz">
          <select value={form.device} onChange={event => set({ device: event.target.value })}>
            {AI_CASE_DEVICES.map(device => <option key={device}>{device}</option>)}
          </select>
        </Field>
      </div>
      {form.device === SMALL_APPLIANCE_DEVICE && (
        <Field label="Cihaz adı" hint="— örn. Airfryer">
          <input list="admin-ai-small-appliances" value={form.deviceName} onChange={event => set({ deviceName: event.target.value })} />
          <datalist id="admin-ai-small-appliances">{SMALL_APPLIANCE_SUGGESTIONS.map(name => <option key={name} value={name} />)}</datalist>
        </Field>
      )}
      <Field label="Şikâyet"><textarea rows={2} value={form.complaint} onChange={event => set({ complaint: event.target.value })} placeholder="Makine su almıyor" /></Field>
      <Field label="Tespit"><textarea rows={2} value={form.finding} onChange={event => set({ finding: event.target.value })} placeholder="Basınç anahtarı arızalı" /></Field>
      <Field label="Yapılan işlem"><textarea rows={2} value={form.action} onChange={event => set({ action: event.target.value })} placeholder="Basınç anahtarı değiştirildi" /></Field>
      <Field label="Serbest not" hint={`(isteğe bağlı) ${form.note.length}/${AI_NOTE_MAX}`}><textarea rows={4} value={form.note} onChange={event => set({ note: event.target.value })} placeholder="Yazıda geçmesini istediğiniz, sahada gördüğünüz diğer ayrıntılar" /></Field>

      {hasContent && (
        <label className="admin-ai-check"><input type="checkbox" checked={overwrite} onChange={event => setOverwrite(event.target.checked)} /> Editördeki mevcut başlık, açıklama, özet ve blokların yerine taslak gelsin</label>
      )}
      <div className="admin-inline admin-wrap">
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy || !checked.ok || (hasContent && !overwrite)} onClick={run}>{busy ? "Hazırlanıyor… (bir dakikaya kadar sürebilir)" : "Taslak oluştur"}</button>
        <button type="button" className="admin-btn" disabled={busy} onClick={() => setOpen(false)}>Formu gizle</button>
      </div>
      {!checked.ok && <p className="admin-muted">Eksik: {checked.errors.map(line => line.replace(/^[A-Za-z0-9_.]+: /, "")).slice(0, 4).join("; ")}</p>}
      {info && <p className="admin-ok" role="status">{info}</p>}
      {errors.length > 0 && <div className="admin-error" role="alert"><ul>{errors.map(line => <li key={line}>{line}</li>)}</ul></div>}

      {socialTexts}
    </fieldset>
  );
}
