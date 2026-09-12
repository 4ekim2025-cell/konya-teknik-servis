import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, ChevronDown, CircleCheck, Droplets, Fan, Flame, Gauge, MapPin, MessageCircle, Phone, Refrigerator, Sparkles, WashingMachine, Wrench, X } from "lucide-react";
import { SITE_WHATSAPP_HREF } from "@/siteConfig";

type Device = { name: string; Icon: typeof WashingMachine };

const symptoms: Record<string, string[]> = {
  "Çamaşır Makinesi": ["Su almıyor", "Sıkmıyor", "Aşırı ses yapıyor", "Kapak açılmıyor"],
  "Bulaşık Makinesi": ["Temiz yıkamıyor", "İçinde su kalıyor", "Kötü kokuyor", "Program bitmiyor"],
  "Kurutma Makinesi": ["Isıtmıyor", "Tambur dönmüyor", "Çamaşırlar nemli kalıyor", "Ses yapıyor"],
  "Fırın / Ocak": ["Isıtmıyor", "Geç pişiriyor", "Ateşleme sürüyor", "Fan veya düğme sorunu"],
  "Buzdolabı": ["Soğutmuyor", "Aşırı donduruyor", "Su akıtıyor", "Ses yapıyor"],
  "Elektrikli Süpürge": ["Çekmiyor", "Motor sesi yapıyor", "Çalışmıyor", "Koku geliyor"],
  Davlumbaz: ["Çekiş az", "Motor çalışmıyor", "Işık yanmıyor", "Titreşim yapıyor"],
  "Derin Dondurucu": ["Dondurmuyor", "Aşırı buzlanıyor", "Su birikiyor", "Ses yapıyor"],
  "Su Sebili": ["Soğutmuyor", "Isıtmıyor", "Su akıtıyor", "Ses yapıyor"],
  Diğer: ["Çalışmıyor", "Ses yapıyor", "Performansı düştü", "Diğer bir sorun"],
};

const devices: Device[] = [
  { name: "Çamaşır Makinesi", Icon: WashingMachine },
  { name: "Bulaşık Makinesi", Icon: Sparkles },
  { name: "Kurutma Makinesi", Icon: Fan },
  { name: "Fırın / Ocak", Icon: Flame },
  { name: "Buzdolabı", Icon: Refrigerator },
  { name: "Elektrikli Süpürge", Icon: Wrench },
  { name: "Davlumbaz", Icon: Fan },
  { name: "Derin Dondurucu", Icon: Refrigerator },
  { name: "Su Sebili", Icon: Droplets },
  { name: "Diğer", Icon: Gauge },
];

const districts = ["Karatay", "Meram", "Selçuklu"];

function StepIndicator({ step }: { step: number }) {
  const progress = (step / 4) * 100;
  return <div className="smart-progress-wrap" aria-label={`Form adımı ${step} / 4`}>
    <div className="smart-progress-meta"><span>İlerleme</span><strong>{step}. adım <small>/ 4</small></strong></div>
    <div className="smart-progress-track" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step} aria-valuetext={`${step}. adım / 4`}><span style={{ width: `${progress}%` }} /></div>
    <div className="smart-stepper">
      {["Cihaz", "Arıza", "Detaylar", "Özet"].map((label, index) => {
        const number = index + 1;
        return <div className={`smart-step ${number <= step ? "is-active" : ""} ${number === step ? "is-current" : ""}`} key={label}>
          <span>{number < step ? <Check size={13} /> : number}</span><small>{label}</small>
        </div>;
      })}
    </div>
  </div>;
}

export function SmartInfoModal({ standalone = false }: { standalone?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [device, setDevice] = useState("Çamaşır Makinesi");
  const [symptom, setSymptom] = useState(symptoms["Çamaşır Makinesi"][0]);
  const [district, setDistrict] = useState("");
  const [brandModel, setBrandModel] = useState("");
  const [otherDevice, setOtherDevice] = useState("");
  const [otherSymptom, setOtherSymptom] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  useEffect(() => {
    const openFromQuickRequest = () => { setStep(1); setAttempted(false); setOpen(true); };
    window.addEventListener("esli:open-smart-info", openFromQuickRequest);
    try {
      if (window.sessionStorage.getItem("esli-open-smart-info") === "1") {
        window.sessionStorage.removeItem("esli-open-smart-info");
        openFromQuickRequest();
      }
    } catch {}
    return () => window.removeEventListener("esli:open-smart-info", openFromQuickRequest);
  }, []);

  const effectiveDevice = device === "Diğer" && otherDevice.trim() ? otherDevice.trim() : device;
  const effectiveSymptom = symptom === "Diğer" && otherSymptom.trim() ? otherSymptom.trim() : symptom;
  const canContinue = step === 1 ? Boolean(effectiveDevice) : step === 2 ? Boolean(effectiveSymptom) : step === 3 ? Boolean(district) : true;
  const whatsappMessage = `Merhaba, ${effectiveDevice} / ${effectiveSymptom} / ${district}${brandModel.trim() ? ` / ${brandModel.trim()}` : ""} için bilgi almak istiyorum.`;

  function selectDevice(nextDevice: string) {
    setDevice(nextDevice);
    setSymptom(symptoms[nextDevice][0]);
    setAttempted(false);
    setOtherSymptom("");
    if (nextDevice !== "Diğer") setOtherDevice("");
  }

  function close() { setOpen(false); setStep(1); }
  function next() { if (!canContinue) { setAttempted(true); return; } setAttempted(false); if (step < 4) setStep(step + 1); }
  function back() { if (step > 1) setStep(step - 1); else close(); }
  function sendWhatsApp() {
    if (!district || isSending) return;
    setIsSending(true);
    const message = whatsappMessage;
    toast.success("Bilgileriniz hazırlandı", { description: "WhatsApp’a yönlendiriliyorsunuz." });
    window.setTimeout(() => { window.location.href = `${SITE_WHATSAPP_HREF}?text=${encodeURIComponent(message)}`; }, 620);
  }

  return <>{!standalone && <section className="diagnostic-section smart-info-section" aria-labelledby="diagnostic-title"><Gauge className="smart-info-watermark" aria-hidden="true" strokeWidth={1.1} />
    <div className="diagnostic-intro">
      <span className="section-kicker">AKILLI ÖN BİLGİ</span>
      <h2 id="diagnostic-title">Üç kısa adımda<br /><em>bize ulaşın.</em></h2>
      <p>Cihazınızı seçin, arızayı belirtin ve ilçe bilginizi ekleyin. Talebiniz WhatsApp mesajına hazır biçimde aktarılsın.</p>
      <div className="diagnostic-meta"><span><i>01</i>Cihazı seçin</span><span><i>02</i>Arızayı seçin</span><span><i>03</i>Detay ekleyin</span></div>
      <button type="button" className="button button-primary smart-info-launch smart-info-whatsapp" onClick={() => setOpen(true)} aria-label="WhatsApp üzerinden hızlı servis talebi oluştur"><span className="smart-whatsapp-mark" aria-hidden="true"><MessageCircle size={20} /><Phone size={9} /></span> WhatsApp üzerinden hızlı servis talebi oluştur</button>
      <p className="diagnostic-privacy-note smart-info-privacy-note">WhatsApp üzerinden servis talebi oluşturmanız halinde paylaşacağınız kişisel bilgileriniz, servis talebinizin alınması, sizinle iletişim kurulması ve teknik servis hizmetinin sunulması amacıyla Eşli Teknik tarafından işlenecektir. Detaylı bilgi için KVKK Aydınlatma Metnimizi inceleyebilirsiniz.</p>
    </div>
    <div className="smart-info-preview" aria-label="Ön bilgi formu adımları">
      <div className="smart-preview-head"><span className="section-kicker">KOLAY SERVİS TALEBİ</span><span className="smart-preview-status"><i /> 3 adım</span></div>
      <div className="smart-preview-flow"><div><b>01</b><span><strong>Cihaz</strong><small>Ürün grubunu seçin</small></span></div><div><b>02</b><span><strong>Arıza</strong><small>Belirtiyi işaretleyin</small></span></div><div><b>03</b><span><strong>Detaylar</strong><small>İlçe ve model ekleyin</small></span></div></div>
      <div className="smart-preview-footer"><span><MessageCircle size={15} /> WhatsApp mesajınız hazır</span><button type="button" className="text-link" onClick={() => setOpen(true)}>Servis talebi oluştur <ArrowRight size={16} /></button></div>
    </div></section>}

    {open && <div className="smart-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="smart-modal" role="dialog" aria-modal="true" aria-labelledby="smart-modal-title">
        <header className="smart-modal-header"><div><span className="section-kicker">ÖN BİLGİ FORMU</span><h3 id="smart-modal-title">Servis talebinizi hazırlayın.</h3></div><button type="button" className="smart-modal-close" onClick={close} aria-label="Formu kapat"><X size={20} /></button></header>
        <StepIndicator step={step} />
        <div key={step} className="smart-modal-body smart-step-transition">
          {step === 1 && <div className="smart-modal-step"><p className="smart-modal-question">Hangi cihaz için destek istiyorsunuz?</p><div className={`smart-device-grid ${attempted && !effectiveDevice ? "has-error" : ""}`}>{devices.map(({ name, Icon }) => <button key={name} type="button" className={device === name ? "is-selected" : ""} aria-pressed={device === name} onClick={() => selectDevice(name)}><Icon size={20} /><span>{name}</span></button>)}</div>{attempted && !effectiveDevice && <p className="smart-validation" role="alert">Devam etmek için cihazınızı seçin.</p>}{device === "Diğer" && <label htmlFor="modal-other-device">Cihaz türünü yazın<input id="modal-other-device" value={otherDevice} onChange={(event) => setOtherDevice(event.target.value)} placeholder="Örn. Robot süpürge" /></label>}</div>}
          {step === 2 && <div className="smart-modal-step"><p className="smart-modal-question">{effectiveDevice} hangi belirtiyi gösteriyor?</p><div className={`smart-symptom-grid ${attempted && !effectiveSymptom ? "has-error" : ""}`}>{[...symptoms[device], "Diğer"].map((item, index) => <button key={`${item}-${index}`} type="button" className={symptom === item ? "is-selected" : ""} aria-pressed={symptom === item} onClick={() => setSymptom(item)}><span>{String(index + 1).padStart(2, "0")}</span>{item}</button>)}</div>{attempted && !effectiveSymptom && <p className="smart-validation" role="alert">Devam etmek için arıza tipini seçin.</p>}{symptom === "Diğer" && <label htmlFor="modal-other-symptom">Arızayı kısaca yazın<input id="modal-other-symptom" value={otherSymptom} onChange={(event) => setOtherSymptom(event.target.value)} placeholder="Örn. Cihaz çalışırken hata veriyor" /></label>}</div>}
          {step === 3 && <div className="smart-modal-step"><p className="smart-modal-question">Servis planlaması için son detaylar.</p><label htmlFor="modal-district">Hizmet ilçeniz<select id="modal-district" aria-invalid={attempted && !district} value={district} onChange={(event) => { setDistrict(event.target.value); setAttempted(false); }}><option value="" disabled>İlçenizi seçin</option>{districts.map((item) => <option value={item} key={item}>{item}</option>)}</select><ChevronDown className="smart-select-icon" size={17} /></label><label htmlFor="modal-brand-model">Marka ve modeliniz <small>isteğe bağlı</small><input id="modal-brand-model" value={brandModel} onChange={(event) => setBrandModel(event.target.value)} placeholder="Örn. Arçelik 7103" /></label><div className="smart-summary"><CircleCheck size={18} /><span><b>{effectiveDevice}</b><small>{effectiveSymptom} · {district || "İlçe seçilmedi"}{brandModel.trim() ? ` · ${brandModel.trim()}` : ""}</small></span></div>{attempted && !district && <p className="smart-validation" role="alert">Devam etmek için hizmet ilçenizi seçin.</p>}</div>}
          {step === 4 && <div className="smart-modal-step smart-summary-step"><p className="smart-modal-question">Bilgilerinizi kontrol edin.</p><div className="smart-final-summary"><div><small>CİHAZ</small><strong>{effectiveDevice}</strong></div><div><small>ARIZA</small><strong>{effectiveSymptom}</strong></div><div><small>MARKA / MODEL</small><strong>{brandModel.trim() || "Belirtilmedi"}</strong></div><div><small>HİZMET İLÇESİ</small><strong>{district}</strong></div></div><p className="smart-confirm-note"><CircleCheck size={16} /> Bilgileriniz hazır. Gönderdiğinizde WhatsApp sohbeti açılacak.</p></div>}
        </div>
        <footer className="smart-modal-footer"><button type="button" className="button button-ghost dark-ghost" onClick={back}><ArrowLeft size={16} /> {step === 1 ? "Kapat" : "Geri"}</button>{step < 4 ? <button type="button" className="button button-primary" aria-disabled={!canContinue} onClick={next}>Devam et <ArrowRight size={16} /></button> : <button type="button" className="button button-primary" disabled={!canContinue || isSending} onClick={sendWhatsApp}><MessageCircle size={17} />{isSending ? "WhatsApp açılıyor…" : "WhatsApp’tan bilgi ver"}</button>}</footer>
      </div>
    </div>}
  </>;
}

function stepLabel(step: number) { return ["Cihaz", "Arıza", "Detaylar"][step - 1]; }
