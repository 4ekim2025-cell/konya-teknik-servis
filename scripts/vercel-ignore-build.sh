#!/usr/bin/env bash
# Vercel "Ignored Build Step": çıkış 0 = build'i atla, 1 = build et.
# Blog paneli taslak kaydettiğinde commit mesajına "[panel-taslak]" ekler; taslak siteyi etkilemez, boşuna build açılmaz.
# Başka her commit (yayın, silme, kod) build edilir.
if [[ "${VERCEL_GIT_COMMIT_MESSAGE:-}" == *"[panel-taslak]"* ]]; then
  echo "Panel taslağı: build atlandı."
  exit 0
fi
exit 1
