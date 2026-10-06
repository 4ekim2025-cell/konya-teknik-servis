import { useEffect, useState, type ReactNode } from "react";
import { AI_GOOGLE_BUSINESS_MAX, AI_INSTAGRAM_MAX, AI_NOTE_MAX, buildAiSuggestions, placeAiDraft, validateAiCaseInput, validateAiSuggestInput, type AiCaseInput, type AiSuggestions } from "@shared/blog-ai";
import { todayInIstanbul } from "@shared/blog-publish";
import type { BlogPostInput } from "@shared/blog-schema";
import { api, ApiError } from "./api";
import { aiInputFromPost, aiSuggestInputFromPost } from "./editorModel";

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
  /** Cihaz, ilçe, mahalle, marka alanları: "Konu"dan sonra gösterilir. */
  children?: ReactNode;
  /** Şikâyet, tespit ve yapılan işlem alanları: neden seçilince (ya da "kendim yazacağım" denince) görünür; seçim buraya dolar, düzeltilebilir. */
  details?: ReactNode;
  /** Seçilen neden servis kaydına yazılır. Seçim proje sahibinindir: seçenek kendiliğinden kayda ya da yazıya girmez. */
  onChoose: (fields: { complaint: string; finding: string; action: string }) => void;
};

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="admin-field"><span>{label}{hint && <small> {hint}</small>}</span>{children}</label>;
}

/**
 * Servis kaydından yapay zeka taslağı. Hiçbir şey kaydetmez; sonuç editöre taslak olarak dolar.
 * Vaka bilgisi (ilçe, marka, cihaz, şikâyet, tespit, işlem) editörün "Servis kaydı" bölümünden alınır; burada yalnızca konu ve not yazılır.
 */
export default function AiDraftBox({ post, existing, hasContent, onDraft, onTexts, children, details, onChoose }: Props) {
  const [topic, setTopic] = useState("");
  const [note, setNote] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [info, setInfo] = useState("");
  const [texts, setTexts] = useState<{ googleBusiness: string; instagram: string } | null>(null);
  const [copied, setCopied] = useState("");
  // Olası nedenler: model yalnızca seçenek sunar; hangisinin sahada yapıldığını kullanıcı seçer (tek seçenek çıksa da).
  const [suggestions, setSuggestions] = useState<AiSuggestions | null>(null);
  const [picked, setPicked] = useState<number | "manual" | null>(null);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestError, setSuggestError] = useState("");

  const file = post.caseFile;
  const detailsFilled = Boolean(file?.complaint.trim() || file?.finding.trim() || file?.action.trim());
  const suggestInput = validateAiSuggestInput(aiSuggestInputFromPost(post, topic));
  const brand = file?.brand ?? "";
  // Konu, marka ya da cihaz değişince eski seçenekler geçersizdir (başka arızaya ait olurdu).
  useEffect(() => { setSuggestions(null); setPicked(current => (current === "manual" ? current : null)); setSuggestError(""); }, [topic, brand, post.device]);

  const suggest = async () => {
    if (!suggestInput.ok) return;
    setSuggestBusy(true);
    setSuggestError("");
    try {
      const response = await api.aiSuggest(suggestInput.input);
      // Sunucunun yanıtı da güvenilmez sayılır: seçenekler burada aynı kurallarla yeniden denetlenir.
      const check = buildAiSuggestions(suggestInput.input, { complaint: response.complaint, options: response.options });
      if (!check.ok) { setSuggestError("Öneriler içerik kurallarından geçmedi; tespiti ve işlemi kendiniz yazın."); return; }
      setSuggestions(check.suggestions);
      setPicked(null);
    } catch (failure) {
      setSuggestError(failure instanceof ApiError ? failure.message : "Öneriler alınamadı.");
    } finally {
      setSuggestBusy(false);
    }
  };
  const choose = (index: number) => {
    if (!suggestions) return;
    setPicked(index);
    onChoose({ complaint: suggestions.complaint, ...suggestions.options[index] });
  };

  const checked = validateAiCaseInput(aiInputFromPost(post, { topic, note }));
  // Servis kaydındaki eksikler o bölümün başında tek tek yazar; burada yalnızca neyin beklendiği söylenir.
  const waiting = checked.ok ? "" : !topic.trim() ? "Önce konuyu yazın." : !detailsFilled ? "Önce arıza nedenini seçin ya da yazın." : "Önce yukarıdaki eksikleri tamamlayın.";

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
      setInfo(`Taslak aşağıdaki “Yazı” bölümüne dolduruldu; henüz kaydedilmedi. Okuyup düzeltin, sonra “Taslak kaydet” ya da “Yayınla” düğmesini kullanın; paylaşım metinleri de birlikte kaydedilir. Bugün kalan hak: ${response.remaining}.`);
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
      <p className="admin-help">Arızayı yazın, yapay zeka olası nedenleri listelesin; sahada gerçekten yaptığınızı seçin, yazıyı o seçime göre hazırlasın. Müşteri adı, telefon, açık adres ve fiyat yazmayın.</p>
      <Field label="Arıza / konu" hint="— bir cümle"><input value={topic} onChange={event => setTopic(event.target.value)} placeholder="Temiz yıkamayan bulaşık makinesi" /></Field>
      {children}

      <div className="admin-suggest">
        <div className="admin-inline admin-wrap">
          <button type="button" className="admin-btn admin-btn-primary" disabled={suggestBusy || !suggestInput.ok} onClick={suggest}>{suggestBusy ? "Olası nedenler aranıyor…" : suggestions ? "Nedenleri yeniden getir" : "Olası nedenleri getir"}</button>
          {picked !== "manual" && !detailsFilled && <button type="button" className="admin-link" onClick={() => setPicked("manual")}>Tespiti ve işlemi kendim yazacağım</button>}
          {!suggestInput.ok && <span className="admin-muted">Önce arızayı yazın, cihazı ve markayı seçin.</span>}
        </div>
        {suggestError && <p className="admin-error" role="alert">{suggestError}</p>}
        {suggestions && (
          <fieldset className="admin-options">
            <legend>Sahada gerçekten hangisi oldu? <small>Yalnızca yaptığınız işi seçin; yazı bu seçime göre yazılır.</small></legend>
            {suggestions.options.map((option, index) => (
              <label key={option.finding} className={`admin-choice ${picked === index ? "is-selected" : ""}`}>
                <input type="radio" name="admin-ai-suggestion" checked={picked === index} onChange={() => choose(index)} />
                <span><strong>{option.finding}</strong><small>{option.action}</small></span>
              </label>
            ))}
            <label className={`admin-choice ${picked === "manual" ? "is-selected" : ""}`}>
              <input type="radio" name="admin-ai-suggestion" checked={picked === "manual"} onChange={() => setPicked("manual")} />
              <span><strong>Hiçbiri değil</strong><small>Tespiti ve yapılan işlemi kendim yazacağım</small></span>
            </label>
            <p className="admin-help">Bu seçenekler genel bilgidir; yapay zeka o cihazda ne olduğunu bilemez.</p>
          </fieldset>
        )}
      </div>

      {(picked !== null || detailsFilled) && (
        <div className="admin-details">
          <p className="admin-help">{typeof picked === "number" ? "Seçiminiz aşağıya yazıldı. Sahada olan farklıysa düzeltin; yazı bu üç satıra göre yazılır." : "Sahada olanı yazın; yazı bu üç satıra göre yazılır."}</p>
          {details}
        </div>
      )}

      <Field label="Serbest not" hint={`(isteğe bağlı) ${note.length}/${AI_NOTE_MAX}`}><textarea rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder="Yazıda geçmesini istediğiniz, sahada gördüğünüz diğer ayrıntılar" /></Field>

      {hasContent && (
        <label className="admin-check"><input type="checkbox" checked={overwrite} onChange={event => setOverwrite(event.target.checked)} /><span>Aşağıdaki mevcut başlık, açıklama, özet ve yazı metninin yerine taslak gelsin</span></label>
      )}
      <div className="admin-inline admin-wrap">
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy || !checked.ok || (hasContent && !overwrite)} onClick={run}>{busy ? "Hazırlanıyor… (bir dakikaya kadar sürebilir)" : "Yapay zeka ile yazıyı yaz"}</button>
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
