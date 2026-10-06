/**
 * Testler için yapay zeka sağlayıcılarının (Gemini ve Groq REST API'leri) bellek içi taklidi. Gerçek `createAiProviders`
 * bu `fetch` ile konuşur; böylece istek biçimi, anahtarın başlıkta gitmesi, hata türleri ve yedek sağlayıcıya geçiş
 * gerçek ağ çağrısı olmadan uçtan uca sınanır. Üretim koduna girmez.
 */
export type FakeAiFacts = { konu: string; ilce: string; marka: string; cihaz: string; sikayet: string; tespit: string; yapilanIslem: string; serbestNot?: string };
export type FakeAiSymptom = { belirti: string; marka: string; cihaz: string };
export type FakeAiReply = { text: string } | { status: number } | { draft: (facts: FakeAiFacts) => unknown } | { suggest: (symptom: FakeAiSymptom) => unknown };
export type FakeAiRequest = { provider: "gemini" | "groq"; url: string; model: string; authorized: boolean; system: string; user: string };

const lowerFirst = (value: string) => value.charAt(0).toLocaleLowerCase("tr-TR") + value.slice(1);

/**
 * "Kurallara uyan model": yalnızca vakadaki bilgiyi ve rakamsız, genel teknik cümleleri kullanır.
 * Testler bu çıktıyı bozarak (sayı, başka marka, bağlantı… ekleyerek) reddedilen durumları üretir.
 */
export function wellBehavedDraft(facts: FakeAiFacts) {
  const district = facts.ilce.split(" · ")[0];
  const device = lowerFirst(facts.cihaz);
  return {
    title: `${district}’de ${facts.marka} ${device}: ${lowerFirst(facts.tespit)}`,
    description: `${district}’den gelen ${facts.marka} ${device} kaydında şikâyeti, tespiti ve yapılan işlemi; kullanıcının önce bakabileceklerini anlatıyoruz.`,
    excerpt: `${facts.sikayet}. Kontrol sonunda görülen: ${lowerFirst(facts.tespit)}.`,
    blocks: [
      { type: "p", text: `${facts.ilce} bölgesinden gelen servis talebinde ${facts.marka} ${device} için şikâyet şuydu: ${lowerFirst(facts.sikayet)}. Bu belirtide önce kullanıcı tarafındaki basit nedenler elenir.${facts.serbestNot ? ` Ustanın notu: ${facts.serbestNot}` : ""}` },
      { type: "h2", text: "Tespit" },
      { type: "p", text: `Kontrol sonunda görülen: ${lowerFirst(facts.tespit)}. Yapılan işlem: ${lowerFirst(facts.yapilanIslem)}.` },
      { type: "h2", text: "Bu parça ne işe yarar?" },
      { type: "p", text: "Cihazın ilgili parçası, makinenin o adımı güvenle tamamlamasını sağlar; görevini yapamadığında cihaz kendini korumaya alabilir ya da programı sürdüremez." },
      { type: "h2", text: "Servis çağırmadan önce kontrol edebilecekleriniz" },
      { type: "steps", items: [{ title: "Fişi ve prizi kontrol edin", text: "Cihazın fişinin tam oturduğundan ve prizde elektrik olduğundan emin olun." }, { title: "Kullanım kılavuzuna bakın", text: "Belirtiye karşılık gelen uyarıyı kılavuzdan okuyun." }] },
      { type: "p", text: "Bu kontroller sorunu çözmüyorsa cihazın açılması gerekir; bu noktada kullanıcı müdahalesi önerilmez." },
      { type: "note", title: "Ustanın notu", text: "Aynı belirti farklı parçalardan kaynaklanabilir; parça değiştirmeden önce arızanın yerini ölçerek bulmak gerekir." },
    ],
    googleBusiness: `${district}’den gelen servis kaydında ${facts.marka} ${device} için şikâyet: ${lowerFirst(facts.sikayet)}. Tespit: ${lowerFirst(facts.tespit)}. Yapılan işlem: ${lowerFirst(facts.yapilanIslem)}. Benzer bir belirti için bize ulaşabilirsiniz.`,
    instagram: `${district}’den gelen servis kaydı: ${facts.marka} ${device}.\n\nŞikâyet: ${lowerFirst(facts.sikayet)}.\nTespit: ${lowerFirst(facts.tespit)}.\nYapılan işlem: ${lowerFirst(facts.yapilanIslem)}.\n\n#konya #beyazeşya #teknikservis #eşliteknik`,
  };
}

/** "Kurallara uyan model"in olası nedenler yanıtı: rakamsız, markasız, genel seçenekler. */
export function wellBehavedSuggestions(symptom: FakeAiSymptom) {
  return {
    complaint: `${symptom.cihaz} düzgün çalışmıyor`,
    options: [
      { finding: "Filtre ve su yolu artıkla tıkanmış", action: "Filtre ve su yolu sökülüp temizlendi" },
      { finding: "Pompa motoru zayıflamış", action: "Pompa motoru değiştirildi" },
      { finding: "Isıtıcı rezistans arızalı", action: "Rezistans değiştirildi" },
    ],
  };
}

export class FakeAi {
  readonly requests: FakeAiRequest[] = [];
  /** Sıradaki yanıtlar; kuyruk boşsa `wellBehavedDraft` döner. Sağlayıcıya özel kuyruk önceliklidir. */
  readonly queue: FakeAiReply[] = [];
  readonly queueFor: { gemini: FakeAiReply[]; groq: FakeAiReply[] } = { gemini: [], groq: [] };

  constructor(public readonly geminiKey = "AIzaTESTGEMINIKEY0123456789", public readonly groqKey = "gsk_TESTGROQKEY0123456789") {}

  private json(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }

  private answer(provider: "gemini" | "groq", user: string): { text: string } | { status: number } {
    // Olası nedenler isteği <ariza>, taslak isteği <vaka> taşır; kuyruk boşsa isteğin türüne uygun "kurallara uyan" yanıt döner.
    const symptomText = /<ariza>\n([\s\S]*?)\n<\/ariza>/.exec(user)?.[1];
    const next = this.queueFor[provider].shift() ?? this.queue.shift() ?? (symptomText ? { suggest: wellBehavedSuggestions } : { draft: wellBehavedDraft });
    if ("suggest" in next) return { text: JSON.stringify(next.suggest(JSON.parse(symptomText ?? "{}") as FakeAiSymptom)) };
    if ("draft" in next) {
      const facts = JSON.parse(/<vaka>\n([\s\S]*?)\n<\/vaka>/.exec(user)?.[1] ?? "{}") as FakeAiFacts;
      return { text: JSON.stringify(next.draft(facts)) };
    }
    return next;
  }

  readonly fetch: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const headers = new Headers(init?.headers);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if ((init?.method ?? "GET").toUpperCase() !== "POST") return this.json(405, { error: "method" });

    const gemini = url.host === "generativelanguage.googleapis.com" ? /^\/v1beta\/models\/([^/:]+):generateContent$/.exec(url.pathname) : null;
    if (gemini) {
      const authorized = headers.get("x-goog-api-key") === this.geminiKey;
      const system = body.systemInstruction?.parts?.[0]?.text ?? "";
      const user = body.contents?.[0]?.parts?.[0]?.text ?? "";
      this.requests.push({ provider: "gemini", url: url.href, model: gemini[1], authorized, system, user });
      if (!authorized) return this.json(403, { error: { message: "API key not valid" } });
      const reply = this.answer("gemini", user);
      if ("status" in reply) return this.json(reply.status, { error: { message: "zorunlu durum", detail: "sağlayıcı-gövdesi-sızmamalı" } });
      return this.json(200, { candidates: [{ content: { role: "model", parts: [{ text: reply.text }] }, finishReason: "STOP" }] });
    }

    if (url.host === "api.groq.com" && url.pathname === "/openai/v1/chat/completions") {
      const authorized = headers.get("Authorization") === `Bearer ${this.groqKey}`;
      const system = body.messages?.[0]?.content ?? "";
      const user = body.messages?.[1]?.content ?? "";
      this.requests.push({ provider: "groq", url: url.href, model: body.model, authorized, system, user });
      if (!authorized) return this.json(401, { error: { message: "Invalid API Key" } });
      const reply = this.answer("groq", user);
      if ("status" in reply) return this.json(reply.status, { error: { message: "zorunlu durum", detail: "sağlayıcı-gövdesi-sızmamalı" } });
      return this.json(200, { choices: [{ message: { role: "assistant", content: reply.text } }] });
    }

    return this.json(404, { error: "bilinmeyen adres" });
  };
}
