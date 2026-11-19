// Výkup Express — сповіщення про нову заявку у WhatsApp (CallMeBot) і/або Telegram.
// Викликається Database Webhook-ом Supabase на INSERT у таблицю requests.
// Секрети (Edge Functions → Secrets):
//   WhatsApp: WHATSAPP_PHONE (+420…), CALLMEBOT_APIKEY (ключ від CallMeBot)
//   Telegram (необов'язково): TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (можна кілька через кому)
//   ADMIN_URL — адреса адмінки
// SUPABASE_URL і SUPABASE_SERVICE_ROLE_KEY Supabase підставляє сам.
// Захист: функція бере заявку з бази за її id, тому підробленим запитом нічого не надіслати.

const BOT = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const CHATS = (Deno.env.get("TELEGRAM_CHAT_ID") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const WA_PHONE = Deno.env.get("WHATSAPP_PHONE") ?? "";
const WA_KEY = Deno.env.get("CALLMEBOT_APIKEY") ?? "";
const ADMIN = Deno.env.get("ADMIN_URL") ?? "";
const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CAT: Record<string, string> = {
  zlato: "🪙 Zlato a stříbro", auta: "🚗 Auto / motorka", elektronika: "📱 Elektronika",
  luxus: "⌚ Hodinky a luxus", ostatni: "💎 Jiné", nemovitosti: "🏠 Nemovitost",
};
const CP: Record<string, string> = { call: "zavolat", whatsapp: "WhatsApp", telegram: "Telegram" };
const LANG: Record<string, string> = { cs: "🇨🇿", de: "🇩🇪", ru: "RU" };
const PT: Record<string, string> = { byt: "Byt", dum: "Rodinný dům", pozemek: "Pozemek", chata: "Chata/chalupa", komercni: "Komerční", podil: "Podíl" };
const OWN: Record<string, string> = { os: "osobní", dr: "družstevní", sp: "spoluvlastnictví" };
const CON: Record<string, string> = { new: "novostavba", good: "dobrý", reno: "před rekonstrukcí", demo: "ke zbourání" };
const BUR: Record<string, string> = { mort: "hypotéka", exe: "exekuce", ease: "věcné břemeno", none: "bez zatížení" };
const OCC: Record<string, string> = { free: "volná", owner: "bydlí vlastník", rent: "pronajato" };
const WHEN: Record<string, string> = { asap: "co nejdřív", "3m": "do 3 měsíců", info: "zjišťuje cenu" };

const esc = (s: unknown) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
const plain = (s: unknown) => String(s ?? "").replace(/[*_~`]/g, "");

// deno-lint-ignore no-explicit-any
function build(r: any, html: boolean) {
  const e = html ? esc : plain;
  const b = (s: string) => (html ? `<b>${s}</b>` : `*${s}*`);
  const d = r.details ?? {};
  const lines: string[] = [
    `${b("Nová poptávka")} · ${CAT[r.category] ?? e(r.category)} ${LANG[r.lang] ?? ""}`,
    "",
    `👤 ${b(e(r.name))}`,
    `📞 ${html ? `<code>${e(r.phone)}</code>` : e(r.phone)} · ozvat se: ${e(CP[r.contact_pref] ?? r.contact_pref)}`,
  ];
  if (r.city) lines.push(`📍 ${e(r.city)}`);
  if (r.category === "nemovitosti" && d.type) {
    lines.push(
      "",
      `🏠 ${b(e(PT[d.type] ?? d.type))}${d.layout ? " " + e(d.layout) : ""}${d.area_m2 ? ` · ${e(d.area_m2)} m²` : ""}${d.land_m2 ? ` · pozemek ${e(d.land_m2)} m²` : ""}`,
      `Vlastnictví: ${e(OWN[d.ownership] ?? "—")} · stav: ${e(CON[d.condition] ?? "—")}`,
      `Zatížení: ${e((d.burdens ?? []).map((x: string) => BUR[x] ?? x).join(", ") || "neuvedeno")}${d.occupancy ? " · " + e(OCC[d.occupancy] ?? d.occupancy) : ""}`,
      `Prodej: ${e(WHEN[d.timeline] ?? "—")}${d.price_idea ? ` · představa ${Number(d.price_idea).toLocaleString("cs-CZ")} Kč` : ""}`,
    );
    if (d.email) lines.push(`✉️ ${e(d.email)}`);
  }
  if (r.description) lines.push("", e(r.description));
  const n = Array.isArray(r.photos) ? r.photos.length : 0;
  if (n && !html) lines.push("", `📷 Fotky: ${n} (v administraci)`);
  const wa = String(r.phone ?? "").replace(/\D/g, "");
  lines.push("");
  if (html) lines.push(`<a href="https://wa.me/${wa}">Napsat na WhatsApp</a>` + (ADMIN ? ` · <a href="${esc(ADMIN)}">Otevřít administraci</a>` : ""));
  else lines.push(`Odpovědět: https://wa.me/${wa}` + (ADMIN ? `\nAdministrace: ${ADMIN}` : ""));
  return lines.join("\n");
}

async function whatsapp(text: string) {
  const phone = WA_PHONE.replace(/[^\d]/g, "");
  if (!phone || !WA_KEY) { console.log("whatsapp skipped: phone or apikey missing", { phone: !!phone, key: !!WA_KEY }); return; }
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&apikey=${encodeURIComponent(WA_KEY)}&text=${encodeURIComponent(text)}`;
  const r = await fetch(url);
  const body = (await r.text()).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
  console.log("whatsapp", r.status, body);
}

async function tg(method: string, body: Record<string, unknown>) {
  if (!BOT) return;
  for (const chat_id of CHATS) {
    const r = await fetch(`https://api.telegram.org/bot${BOT}/${method}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, chat_id }),
    });
    if (!r.ok) console.error(method, chat_id, r.status, await r.text());
  }
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
  const payload = await req.json().catch(() => null);
  const id = payload?.record?.id;
  if (payload?.type !== "INSERT" || !/^[0-9a-f-]{36}$/i.test(String(id ?? ""))) { console.log("ignored payload", payload?.type); return new Response("ignored"); }
  // načíst skutečnou poptávku z databáze (ne z těla požadavku)
  const q = await fetch(`${SB_URL}/rest/v1/requests?id=eq.${id}&select=*`, { headers: { apikey: SB_KEY, authorization: `Bearer ${SB_KEY}` } });
  const rows = q.ok ? await q.json() : [];
  const r = rows[0];
  if (!r || Date.now() - new Date(r.created_at).getTime() > 10 * 60 * 1000) { console.log("ignored", id, q.status, rows.length); return new Response("ignored"); }

  await Promise.all([
    whatsapp(build(r, false)).catch((e) => console.error("whatsapp", e)),
    (async () => {
      if (!BOT || !CHATS.length) return;
      await tg("sendMessage", { text: build(r, true), parse_mode: "HTML", disable_web_page_preview: true });
      const photos: string[] = Array.isArray(r.photos) ? r.photos : [];
      if (photos.length) {
        const urls = (await Promise.all(photos.map(signed))).filter(Boolean) as string[];
        if (urls.length === 1) await tg("sendPhoto", { photo: urls[0] });
        else if (urls.length > 1) await tg("sendMediaGroup", { media: urls.map((u) => ({ type: "photo", media: u })) });
      }
    })().catch((e) => console.error("telegram", e)),
  ]);
  return new Response("ok");
});
