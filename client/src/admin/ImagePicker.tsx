import { useRef, useState } from "react";
import { BLOG_IMAGE_ALT_MAX, type BlogImageFields } from "@shared/blog-images";
import { api, ApiError } from "./api";
import { IMAGE_INPUT_TYPES, prepareImage, ImagePrepareError } from "./imageTools";

/** Fotoğraf seç → tarayıcıda küçült (konum verisi silinir) → yükle. Başarılırsa alt metni boş bir fotoğraf alanı döndürür; alt metin zorunludur. */
export function ImagePicker({ label, disabled, onUploaded }: { label: string; disabled?: string; onUploaded: (image: BlogImageFields) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    try {
      setBusy("Küçültülüyor…");
      const prepared = await prepareImage(file);
      setBusy("Yükleniyor…");
      const stored = await api.uploadImage(prepared.large, prepared.small);
      onUploaded({ src: stored.src, alt: "", width: stored.width, height: stored.height });
    } catch (failure) {
      setError(failure instanceof ImagePrepareError || failure instanceof ApiError ? failure.message : "Fotoğraf yüklenemedi.");
    } finally {
      setBusy("");
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="admin-picker">
      <input ref={input} type="file" accept={IMAGE_INPUT_TYPES.join(",")} hidden onChange={event => void pick(event.target.files?.[0])} />
      <button type="button" className="admin-btn" disabled={Boolean(disabled) || Boolean(busy)} onClick={() => input.current?.click()}>{busy || label}</button>
      {disabled && <small className="admin-muted"> {disabled}</small>}
      {error && <p className="admin-error" role="alert">{error}</p>}
    </div>
  );
}

/** Yüklenmiş fotoğrafın önizlemesi ve zorunlu alt metin alanı. */
export function ImageFields({ image, onAlt }: { image: BlogImageFields; onAlt: (alt: string) => void }) {
  return (
    <div className="admin-image">
      <img src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" />
      <label className="admin-field">
        <span>Alt metin <small>(zorunlu — fotoğrafta ne göründüğünü kısaca anlatın · {image.alt.length}/{BLOG_IMAGE_ALT_MAX})</small></span>
        <input value={image.alt} maxLength={BLOG_IMAGE_ALT_MAX} onChange={event => onAlt(event.target.value)} placeholder="Örn. Açılmış çamaşır makinesinde kireçlenmiş rezistans" />
      </label>
      <small className="admin-muted">{image.width}×{image.height} piksel · WebP · konum bilgisi silinmiş</small>
    </div>
  );
}
