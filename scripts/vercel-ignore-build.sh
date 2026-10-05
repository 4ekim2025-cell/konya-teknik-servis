#!/usr/bin/env bash
# Vercel "Ignored Build Step": çıkış 0 = build'i atla, 1 = build et.
# Blog paneli taslak kaydettiğinde commit mesajına "[panel-taslak]", paylaşım paketi ya da ayar kaydettiğinde "[panel-paylasim]" ekler;
# bunlar siteyi etkilemez, boşuna build açılmaz.
# İşaret tek başına yetmez: son başarılı yayından (VERCEL_GIT_PREVIOUS_SHA; yoksa bir önceki commit) bu yana
# content/blog/, content/social/ ve content/settings.json dışında hiçbir dosya değişmemiş olmalıdır (üçü de siteye girmez). Yayın ve silme, üretilen dosyaları (sitemap.xml, llms.txt,
# blog-content.generated.ts) ya da content/redirects.json'u değiştirir; böylece sırada bekleyen bir yayın commit'inin
# ardından gelen taslak commit'i yayını atlatamaz. Karşılaştırma yapılamazsa (sığ klon, git hatası) build edilir.
message="${VERCEL_GIT_COMMIT_MESSAGE:-}"
if [[ "$message" != *"[panel-taslak]"* && "$message" != *"[panel-paylasim]"* ]]; then
  exit 1
fi
base="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [[ -z "$base" ]]; then
  base="HEAD^"
fi
if git diff --quiet "$base" HEAD -- . ':(exclude)content/blog' ':(exclude)content/social' ':(exclude)content/settings.json' 2>/dev/null; then
  echo "Panel taslağı ya da paylaşım paketi: build atlandı."
  exit 0
fi
exit 1
