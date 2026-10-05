import { useState, type ReactNode } from "react";
import { AI_GOOGLE_BUSINESS_MAX, AI_INSTAGRAM_MAX, AI_NOTE_MAX, placeAiDraft, validateAiCaseInput, type AiCaseInput } from "@shared/blog-ai";
import { todayInIstanbul } from "@shared/blog-publish";
import type { BlogPostInput } from "@shared/blog-schema";
import { api, ApiError } from "./api";
import { aiInputFromPost } from "./editorModel";

type Props = {
  /** Editördeki cihaz ve servis kaydı: yapay zeka girdisi buradan okunur, aynı bilgi ikinci kez sorulmaz. */
  post: Pick<BlogPostInput, "device" | "caseFile">;
  /** Mevcut yazıların adres ve sıraları: taslağın adresi ve sırası bunlarla çakışmayacak şekilde kurulur. */
  existing: { slug: string; order: number }[];
  /** Editörde yazılmış metin var mı; varsa üzerine yazmadan önce açık onay istenir. */
  hasContent: boolean;
  /** Denetimden geçen taslak editöre doldurulur. Kaydetme ve yayın editörün kendi düğmeleriyle yapılır. */
  onDraft: (post: BlogPostInput) => void;
  /** Üretilen (ve elle düzeltilen) iki sosyal metin: editör bunları taslakla birlikte paylaşım paketine kaydeder. */
  onTexts?: (texts: { googleBusiness: string; instagram: string }) => void;
};

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="admin-field"><span>{label}{hint && <small> {hint}</small>}</span>{children}</label>;
}

/**
 * Servis kaydından yapay zeka taslağı. Hiçbir şey kaydetmez; sonuç editöre taslak olarak dolar.
 * Vaka bilgisi (ilçe, marka, cihaz, şikâyet, tespit, işlem) editörün "Servis kaydı" bölümünden alınır; burada yalnızca konu ve not yazılır.
 */
export default function AiDraftBox({ post, existing, hasContent, onDraft, onTexts }: Props) {
  const [topic, setTopic] = useState("");
  const [note, setNote] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [info, setInfo] = useState("");
  const [texts, setTexts] = useState<{ googleBusiness: string; instagram: string } | null>(null);
  const [copied, setCopied] = useState("");

  const checked = validateAiCaseInput(aiInputFromPost(post, { topic, note }));
  // Servis kaydındaki eksikler o bölümün başında tek tek yazar; burada yalnızca neyin beklendiği söylenir.
  const waiting = checked.ok ? "" : topic.trim() ? "Önce yukarıdaki servis kaydını tamamlayın." : "Önce servis kaydını tamamlayın ve konuyu yazın.";

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
      const generated = { googleBusiness: placed.draft.googleBusiness, instagram: placed.draft.instagram };
      setTexts(generated);
      onTexts?.(generated);
      setOverwrite(false);
      setInfo(`Taslak aşağıdaki bölümlere dolduruldu; henüz kaydedilmedi. Okuyup düzeltin, sonra “Taslak kaydet” ya da “Yayınla” düğmesini kullanın; paylaşım metinleri de birlikte kaydedilir. Bugün kalan hak: ${response.remaining}.`);
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
  const change = (next: { googleBusiness: string; instagram: string }) => { setCopied(""); setTexts(next); onTexts?.(next); };

  return (
    <div className="admin-ai">
      <p className="admin-help">Yukarıdaki servis kaydından başlık, açıklama ve yazı metnini hazırlar. Yalnızca gerçek işi yazın: yapay zeka vaka ayrıntısı ekleyemez, yalnızca genel teknik açıklama yazar. Müşteri adı, telefon, açık adres ve fiyat yazmayın.</p>
      <Field label="Konu" hint="— yazının anlatacağı şey, bir cümle"><input value={topic} onChange={event => setTopic(event.target.value)} placeholder="Su almayan çamaşır makinesinde basınç anahtarı arızası" /></Field>
      <Field label="Serbest not" hint={`(isteğe bağlı) ${note.length}/${AI_NOTE_MAX}`}><textarea rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder="Yazıda geçmesini istediğiniz, sahada gördüğünüz diğer ayrıntılar" /></Field>

      {hasContent && (
        <label className="admin-check"><input type="checkbox" checked={overwrite} onChange={event => setOverwrite(event.target.checked)} /><span>Aşağıdaki mevcut başlık, açıklama, özet ve yazı metninin yerine taslak gelsin</span></label>
      )}
      <div className="admin-inline admin-wrap">
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy || !checked.ok || (hasContent && !overwrite)} onClick={run}>{busy ? "Hazırlanıyor… (bir dakikaya kadar sürebilir)" : "Yapay zeka ile taslak yaz"}</button>
        {waiting && <span className="admin-muted">{waiting}</span>}
      </div>
      {info && <p className="admin-ok" role="status">{info}</p>}
      {errors.length > 0 && <div className="admin-error" role="alert"><ul>{errors.map(line => <li key={line}>{line}</li>)}</ul></div>}

      {texts && (
        <div className="admin-ai-texts">
          <p className="admin-help">Paylaşım metinleri de hazırlandı. Yazıyı kaydettiğinizde (Taslak kaydet / Yayınla) paylaşım paketine kaydedilir; yayından sonra Yazılar → Paylaşım’dan açılır. Paylaşmadan önce okuyun ve düzeltin.</p>
          <Field label="Google İşletme metni" hint={`${texts.googleBusiness.length}/${AI_GOOGLE_BUSINESS_MAX}`}><textarea rows={7} value={texts.googleBusiness} onChange={event => change({ ...texts, googleBusiness: event.target.value })} /></Field>
          <button type="button" className="admin-btn" onClick={() => copy("googleBusiness")}>{copied === "googleBusiness" ? "Kopyalandı" : "Google İşletme metnini kopyala"}</button>
          <Field label="Instagram metni" hint={`${texts.instagram.length}/${AI_INSTAGRAM_MAX}`}><textarea rows={9} value={texts.instagram} onChange={event => change({ ...texts, instagram: event.target.value })} /></Field>
          <button type="button" className="admin-btn" onClick={() => copy("instagram")}>{copied === "instagram" ? "Kopyalandı" : "Instagram metnini kopyala"}</button>
        </div>
      )}
    </div>
  );
}
