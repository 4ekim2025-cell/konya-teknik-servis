import { z } from "zod";

export const GOOGLE_REVIEWS_PATH = "content/google-reviews.json";
export const GOOGLE_REVIEWS_GENERATED_PATH = "shared/google-reviews.generated.ts";
export const GOOGLE_PUBLIC_CONFIG_PATH = "server/google-public-config.generated.ts";
export const GOOGLE_REVIEW_COMMIT_MARKER = "[panel-yorumlar]";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-AA-GG biçiminde tarih gerekli").refine(value => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Geçersiz tarih");

export const manualGoogleReviewSchema = z.object({
  id: z.string().regex(/^manual_[a-z0-9_-]{8,64}$/, "Manuel yorum kimliği geçersiz"),
  author: z.string().trim().min(1, "Yazar gerekli").max(120, "Yazar en fazla 120 karakter olabilir"),
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().min(1, "Yorum gerekli").max(1200, "Yorum en fazla 1200 karakter olabilir"),
  reviewDate: isoDate,
  consentConfirmed: z.boolean().refine(value => value, "Yorum sahibinin izni doğrulanmalı"),
  independentlyProvided: z.boolean().refine(value => value, "Metin API çıktısından kopyalanmamalı; bağımsız kaynaktan sağlanmalı"),
  consentDate: isoDate,
  visible: z.boolean(),
  order: z.number().int().min(0).max(9999),
}).strict().superRefine((review, ctx) => {
  if (review.consentDate < review.reviewDate) ctx.addIssue({ code: "custom", path: ["consentDate"], message: "İzin tarihi yorum tarihinden önce olamaz" });
});

export const googleReviewsFileSchema = z.object({
  version: z.literal(1),
  manualReviews: z.array(manualGoogleReviewSchema).max(50),
}).strict().superRefine((value, ctx) => {
  const ids = new Set<string>();
  for (const [index, review] of value.manualReviews.entries()) {
    if (ids.has(review.id)) ctx.addIssue({ code: "custom", path: ["manualReviews", index, "id"], message: "Yorum kimliği tekrarlanamaz" });
    ids.add(review.id);
  }
});

export type ManualGoogleReview = z.infer<typeof manualGoogleReviewSchema>;
export type PublicManualReview = ManualGoogleReview;
export type GoogleReviewsFile = z.infer<typeof googleReviewsFileSchema>;
export const EMPTY_GOOGLE_REVIEWS: GoogleReviewsFile = { version: 1, manualReviews: [] };

export function validateGoogleReviews(value: unknown): { ok: true; data: GoogleReviewsFile } | { ok: false; errors: string[] } {
  const parsed = googleReviewsFileSchema.safeParse(value);
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, errors: parsed.error.issues.map(issue => `${issue.path.join(".") || "yorumlar"}: ${issue.message}`) };
}

export const serializeGoogleReviews = (value: GoogleReviewsFile) => `${JSON.stringify(value, null, 2)}\n`;

export function renderGoogleReviewsGenerated(value: GoogleReviewsFile): string {
  const reviews = value.manualReviews.filter(review => review.visible && review.consentConfirmed && review.independentlyProvided).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return `/* Bu dosya yönetim paneli tarafından content/google-reviews.json kaynağından üretilir. Elle düzenlemeyin. */\nimport type { PublicManualReview } from "./google-reviews";\nexport const PUBLIC_MANUAL_REVIEWS: readonly PublicManualReview[] = ${JSON.stringify(reviews, null, 2)};\n`;
}

export { PUBLIC_MANUAL_REVIEWS } from "./google-reviews.generated";

export function renderGooglePublicConfig(input: { mode: "none" | "api"; accountId?: string; locationId?: string }): string {
  const safe = input.mode === "api" && input.accountId && input.locationId
    ? { enabled: true, accountId: input.accountId, locationId: input.locationId }
    : { enabled: false };
  return `/* Bu dosya panel ayarlarından üretilir. OAuth sırrı içermez ve yalnız sunucu paketine girer. */\nexport const GOOGLE_PUBLIC_CONFIG = ${JSON.stringify(safe, null, 2)} as const;\n`;
}
