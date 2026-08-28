import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, ChevronDown, CircleCheck, Droplets, Fan, Flame, Gauge, MapPin, MessageCircle, Refrigerator, Sparkles, WashingMachine, Wrench, X } from "lucide-react";
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
  return <div className="smart-stepper" aria-label={`Form adımı ${step} / 3`}>
    {["Cihaz", "Arıza", "Detaylar"].map((label, index) => {
      const number = index + 1;
      return <div className={`smart-step ${number <= step ? "is-active" : ""} ${number === step ? "is-current" : ""}`} key={label}>
        <span>{number < step ? <Check size={13} /> : number}</span><small>{label}</small>
      </div>;
    })}
  </div>;
}

export function SmartInfoModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [device, setDevice] = useState("Çamaşır Makinesi");
  const [symptom, setSymptom] = useState(symptoms["Çamaşır Makinesi"][0]);
  const [district, setDistrict] = useState("");
  const [brandModel, setBrandModel] = useState("");
  const [otherDevice, setOtherDevice] = useState("");
  const [otherSymptom, setOtherSymptom] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  const effectiveDevice = device === "Diğer" && otherDevice.trim() ? otherDevice.trim() : device;
  const effectiveSymptom = symptom === "Diğer" && otherSymptom.trim() ? otherSymptom.trim() : symptom;
  const canContinue = step === 1 ? Boolean(effectiveDevice) : step === 2 ? Boolean(effectiveSymptom) : Boolean(district);

  function selectDevice(nextDevice: string) {
    setDevice(nextDevice);
    setSymptom(symptoms[nextDevice][0]);
    setOtherSymptom("");
    if (nextDevice !== "Diğer") setOtherDevice("");
  }

  function close() { setOpen(false); setStep(1); }
  function next() { if (canContinue && step < 3) setStep(step + 1); }
  function back() { if (step > 1) setStep(step - 1); else close(); }
  function sendWhatsApp() {
    if (!district || isSending) return;
    setIsSending(true);
    const message = `Merhaba, ${effectiveDevice} / ${effectiveSymptom} / ${district}${brandModel.trim() ? ` / ${brandModel.trim()}` : ""} için bilgi almak istiyorum.`;
    toast.success("Bilgileriniz hazırlandı", { description: "WhatsApp’a yönlendiriliyorsunuz." });
    window.setTimeout(() => { window.location.href = `${SITE_WHATSAPP_HREF}?text=${encodeURIComponent(message)}`; }, 620);
  }

  return <section className="diagnostic-section smart-info-section" aria-labelledby="diagnostic-title">
    <div className="diagnostic-intro">
      <span className="section-kicker">AKILLI ÖN BİLGİ</span>
      <h2 id="diagnostic-title">Üç kısa adımda<br /><em>bize ulaşın.</em></h2>
      <p>Cihazınızı seçin, arızayı belirtin ve ilçe bilginizi ekleyin. Talebiniz WhatsApp mesajına hazır biçimde aktarılsın.</p>
      <div className="diagnostic-meta"><span><i>01</i>Cihazı seçin</span><span><i>02</i>Arızayı seçin</span><span><i>03</i>Detay ekleyin</span></div>
      <button type="button" className="button button-primary smart-info-launch" onClick={() => setOpen(true)}><Wrench size={17} /> Ön Bilgi Formunu Aç</button>
    </div>
    <div className="smart-info-preview" aria-label="Ön bilgi formu adımları">
      <span className="section-kicker">KOLAY SERVİS TALEBİ</span>
      <strong>{stepLabel(1)} → {stepLabel(2)} → {stepLabel(3)}</strong>
      <p>Formu açarak seçimlerinizi adım adım tamamlayın.</p>
      <button type="button" className="text-link" onClick={() => setOpen(true)}>Formu başlat <ArrowRight size={16} /></button>
    </div>

    {open && <div className="smart-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="smart-modal" role="dialog" aria-modal="true" aria-labelledby="smart-modal-title">
        <header className="smart-modal-header"><div><span className="section-kicker">ÖN BİLGİ FORMU</span><h3 id="smart-modal-title">Servis talebinizi hazırlayın.</h3></div><button type="button" className="smart-modal-close" onClick={close} aria-label="Formu kapat"><X size={20} /></button></header>
        <StepIndicator step={step} />
        <div className="smart-modal-body">
          {step === 1 && <div className="smart-modal-step"><p className="smart-modal-question">Hangi cihaz için destek istiyorsunuz?</p><div className="smart-device-grid">{devices.map(({ name, Icon }) => <button key={name} type="button" className={device === name ? "is-selected" : ""} aria-pressed={device === name} onClick={() => selectDevice(name)}><Icon size={20} /><span>{name}</span></button>)}</div>{device === "Diğer" && <label htmlFor="modal-other-device">Cihaz türünü yazın<input id="modal-other-device" value={otherDevice} onChange={(event) => setOtherDevice(event.target.value)} placeholder="Örn. Robot süpürge" /></label>}</div>}
          {step === 2 && <div className="smart-modal-step"><p className="smart-modal-question">{effectiveDevice} hangi belirtiyi gösteriyor?</p><div className="smart-symptom-grid">{[...symptoms[device], "Diğer"].map((item, index) => <button key={`${item}-${index}`} type="button" className={symptom === item ? "is-selected" : ""} aria-pressed={symptom === item} onClick={() => setSymptom(item)}><span>{String(index + 1).padStart(2, "0")}</span>{item}</button>)}</div>{symptom === "Diğer" && <label htmlFor="modal-other-symptom">Arızayı kısaca yazın<input id="modal-other-symptom" value={otherSymptom} onChange={(event) => setOtherSymptom(event.target.value)} placeholder="Örn. Cihaz çalışırken hata veriyor" /></label>}</div>}
          {step === 3 && <div className="smart-modal-step"><p className="smart-modal-question">Servis planlaması için son detaylar.</p><label htmlFor="modal-district">Hizmet ilçeniz<select id="modal-district" value={district} onChange={(event) => setDistrict(event.target.value)}><option value="" disabled>İlçenizi seçin</option>{districts.map((item) => <option value={item} key={item}>{item}</option>)}</select><ChevronDown className="smart-select-icon" size={17} /></label><label htmlFor="modal-brand-model">Marka ve modeliniz <small>isteğe bağlı</small><input id="modal-brand-model" value={brandModel} onChange={(event) => setBrandModel(event.target.value)} placeholder="Örn. Arçelik 7103" /></label><div className="smart-summary"><CircleCheck size={18} /><span><b>{effectiveDevice}</b><small>{effectiveSymptom} · {district || "İlçe seçilmedi"}{brandModel.trim() ? ` · ${brandModel.trim()}` : ""}</small></span></div></div>}
        </div>
        <footer className="smart-modal-footer"><button type="button" className="button button-ghost dark-ghost" onClick={back}><ArrowLeft size={16} /> {step === 1 ? "Kapat" : "Geri"}</button>{step < 3 ? <button type="button" className="button button-primary" disabled={!canContinue} onClick={next}>Devam et <ArrowRight size={16} /></button> : <button type="button" className="button button-primary" disabled={!canContinue || isSending} onClick={sendWhatsApp}><MessageCircle size={17} />{isSending ? "WhatsApp açılıyor…" : "WhatsApp’tan bilgi ver"}</button>}</footer>
      </div>
    </div>}
  </section>;
}

function stepLabel(step: number) { return ["Cihaz", "Arıza", "Detaylar"][step - 1]; }
