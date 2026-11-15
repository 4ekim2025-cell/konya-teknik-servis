import { validateGoogleReviews, type GoogleReviewsFile, type ManualGoogleReview } from "@shared/google-reviews";

/** Bir satır: tam ad, 1–5 puan, YYYY-AA-GG tarih, yorum, isteğe bağlı Google bağlantısı. */
export function prepareBulkReviews(input: string, current: GoogleReviewsFile, consentDate: string):
  | { ok: true; data: GoogleReviewsFile; count: number }
  | { ok: false; error: string } {
  const lines = input.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!lines.length) return { ok: false, error: "En az bir yorum satırı girin." };
  if (current.manualReviews.length + lines.length > 50) return { ok: false, error: "En fazla 50 manuel yorum kaydedilebilir." };

  const additions: ManualGoogleReview[] = [];
  for (const [index, line] of lines.entries()) {
    const fields = line.split("\t").map(field => field.trim());
    if (fields.length !== 4 && fields.length !== 5) return { ok: false, error: `${index + 1}. satır dört veya beş alan içermeli: ad, puan, tarih, yorum, isteğe bağlı Google bağlantısı.` };
    const [author, rawRating, reviewDate, text, googleReviewUrl] = fields;
    const rating = Number(rawRating);
    if (!/^[1-5]$/.test(rawRating)) return { ok: false, error: `${index + 1}. satırdaki puan 1 ile 5 arasında olmalı.` };
    additions.push({ id: `manual_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`, author, rating, reviewDate, text, ...(googleReviewUrl ? { googleReviewUrl } : {}), consentDate, consentConfirmed: true, visible: true, order: current.manualReviews.length + index });
  }
  const checked = validateGoogleReviews({ ...current, manualReviews: [...current.manualReviews, ...additions] });
  if (!checked.ok) return { ok: false, error: checked.errors[0] };
  return { ok: true, data: checked.data, count: additions.length };
}
