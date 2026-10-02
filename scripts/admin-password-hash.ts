/**
 * Panel parolası için scrypt özeti ve oturum anahtarı üretir. Çıktıyı Vercel ortam değişkenlerine yapıştırın:
 *   pnpm admin:hash "parolanız"      (ya da parolayı standart girdiden verin)
 * Parola en az 12 karakter olmalıdır. Parola hiçbir yere kaydedilmez.
 */
import { randomBytes } from "node:crypto";
import { MIN_PASSWORD_LENGTH, hashPassword } from "../server/admin/auth";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
}

const password = process.argv[2] ?? (process.stdin.isTTY ? "" : await readStdin());
if (password.length < MIN_PASSWORD_LENGTH) {
  console.error(`Parola en az ${MIN_PASSWORD_LENGTH} karakter olmalı. Kullanım: pnpm admin:hash "parolanız"`);
  process.exit(1);
}
console.log(`ADMIN_PASSWORD_HASH=${await hashPassword(password)}`);
console.log(`ADMIN_SESSION_SECRET=${randomBytes(32).toString("hex")}`);
