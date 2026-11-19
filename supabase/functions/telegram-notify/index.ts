// Výkup Express — сповіщення в Telegram про нову заявку.
// Викликається Database Webhook-ом Supabase на INSERT у таблицю requests.
// Секрети (Edge Functions → Secrets): TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, WEBHOOK_SECRET, ADMIN_URL
// SUPABASE_URL і SUPABASE_SERVICE_ROLE_KEY Supabase підставляє сам.

const BOT = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const CHAT = Deno.env.get("TELEGRAM_CHAT_ID") ?? "";
const SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";
const ADMIN = Deno.env.get("ADMIN_URL") ?? "";
const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CAT: Record<string, string> = {
  zlato: "🪙 Zlato a stříbro", auta: "🚗 Auto / motorka", elektronika: "📱 Elektronika",
  luxus: "⌚ Hodinky a luxus", ostatni: "💎 Jiné", nemovitosti: "🏠 Nemovitost",
};
const CP: Record<string, string> = { call: "zavolat", whatsapp: "WhatsApp", telegram: "Telegram" };
const LANG: Record<string, string> = { cs: "🇨🇿", de: "🇩🇪", ru: "RU" };

const esc = (s: unknown) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));

async function tg(method: string, body: unknown) {
  const r = await fetch(`https://api.telegram.org/bot${BOT}/${method}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok) console.error(method, r.status, await r.text());
}

async function signed(path: string): Promise<string | null> {
  const r = await fetch(`${SB_URL}/storage/v1/object/sign/photos/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${SB_KEY}`, apikey: SB_KEY },
    body: JSON.stringify({ expiresIn: 60 * 60 * 24 * 7 }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.signedURL ? `${SB_URL}/storage/v1${j.signedURL}` : null;
}

Deno.serve(async (req) => {
  if (SECRET && req.headers.get("x-webhook-secret") !== SECRET) return new Response("forbidden", { status: 403 });
  const payload = await req.json().catch(() => null);
  const r = payload?.record;
  if (!r || payload.type !== "INSERT") return new Response("ignored");

  const wa = String(r.phone ?? "").replace(/\D/g, "");
  const d = r.details ?? {};
  const PT: Record<string, string> = { byt: "Byt", dum: "Rodinný dům", pozemek: "Pozemek", chata: "Chata/chalupa", komercni: "Komerční", podil: "Podíl" };
  const OWN: Record<string, string> = { os: "osobní", dr: "družstevní", sp: "spoluvlastnictví" };
  const CON: Record<string, string> = { new: "novostavba", good: "dobrý", reno: "před rekonstrukcí", demo: "ke zbourání" };
  const BUR: Record<string, string> = { mort: "hypotéka", exe: "exekuce", ease: "věcné břemeno", none: "bez zatížení" };
  const OCC: Record<string, string> = { free: "volná", owner: "bydlí vlastník", rent: "pronajato" };
  const WHEN: Record<string, string> = { asap: "co nejdřív", "3m": "do 3 měsíců", info: "zjišťuje cenu" };
  const prop = r.category === "nemovitosti" && d.type ? [
    "",
    `🏠 <b>${esc(PT[d.type] ?? d.type)}</b>${d.layout ? " " + esc(d.layout) : ""}${d.area_m2 ? ` · ${esc(d.area_m2)} m²` : ""}${d.land_m2 ? ` · pozemek ${esc(d.land_m2)} m²` : ""}`,
    `Vlastnictví: ${esc(OWN[d.ownership] ?? "—")} · stav: ${esc(CON[d.condition] ?? "—")}`,
    `Zatížení: ${esc((d.burdens ?? []).map((b: string) => BUR[b] ?? b).join(", ") || "neuvedeno")} · ${esc(OCC[d.occupancy] ?? "")}`,
    `Prodej: ${esc(WHEN[d.timeline] ?? "—")}${d.price_idea ? ` · představa ${Number(d.price_idea).toLocaleString("cs-CZ")} Kč` : ""}`,
    d.email ? `✉️ ${esc(d.email)}` : "",
  ].filter(Boolean).join("\n") : "";
  const text = [
    `<b>Nová poptávka</b> · ${esc(CAT[r.category] ?? r.category)} ${LANG[r.lang] ?? ""}`,
    "",
    `👤 <b>${esc(r.name)}</b>`,
    `📞 <code>${esc(r.phone)}</code> · ozvat se: ${esc(CP[r.contact_pref] ?? r.contact_pref)}`,
    r.city ? `📍 ${esc(r.city)}` : "",
    prop,
    r.description ? `\n${esc(r.description)}` : "",
    "",
    `<a href="https://wa.me/${wa}">Napsat na WhatsApp</a>` + (ADMIN ? ` · <a href="${esc(ADMIN)}">Otevřít administraci</a>` : ""),
  ].filter((l) => l !== "").join("\n");

  await tg("sendMessage", { chat_id: CHAT, text, parse_mode: "HTML", disable_web_page_preview: true });

  const photos: string[] = Array.isArray(r.photos) ? r.photos : [];
  if (photos.length) {
    const urls = (await Promise.all(photos.map(signed))).filter(Boolean) as string[];
    if (urls.length === 1) await tg("sendPhoto", { chat_id: CHAT, photo: urls[0] });
    else if (urls.length > 1) await tg("sendMediaGroup", { chat_id: CHAT, media: urls.map((u) => ({ type: "photo", media: u })) });
  }
  return new Response("ok");
});
