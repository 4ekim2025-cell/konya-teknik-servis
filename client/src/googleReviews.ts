import { useEffect, useState } from "react";

export type PublicGoogleRating = {
  averageRating: number;
  refreshedAt: string;
};

let ratingRequest: Promise<PublicGoogleRating | null> | null = null;

function parseRating(value: unknown): PublicGoogleRating | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.averageRating !== "number" || record.averageRating < 1 || record.averageRating > 5) return null;
  if (typeof record.refreshedAt !== "string" || !Number.isFinite(Date.parse(record.refreshedAt))) return null;
  return { averageRating: record.averageRating, refreshedAt: record.refreshedAt };
}

export function getPublicGoogleRating() {
  if (!ratingRequest) {
    ratingRequest = fetch("/api/google-reviews", { headers: { Accept: "application/json" } })
      .then(response => response.ok ? response.json() : null)
      .then(parseRating)
      .catch(() => null);
  }
  return ratingRequest;
}

export function usePublicGoogleRating() {
  const [rating, setRating] = useState<PublicGoogleRating | null>(null);
  useEffect(() => {
    let active = true;
    getPublicGoogleRating().then(value => { if (active) setRating(value); });
    return () => { active = false; };
  }, []);
  return rating;
}

export function formatGoogleRating(value: number) {
  return new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

export function formatGoogleRatingDate(value: string) {
  return `${new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Istanbul" }).format(new Date(value))} itibarıyla`;
}
