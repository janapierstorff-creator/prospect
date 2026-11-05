// Anmeldung zur Warteliste (Double-Opt-in, Schritt 1)
// Speichert die Anmeldung als unbestätigt und schickt eine Mail mit Bestätigungslink.
// Aufruf von der Website: POST /functions/v1/waitlist-signup (siehe js/main.js)

import { cors, db, fill, footer, json, layout, plain, sendMail, SITE, texts, type Lang } from "../_shared/mail.ts";

const ROLES = ["eltern", "coach", "spieler"];
const RESEND_AFTER_MS = 2 * 60 * 1000; // Bestätigungsmail höchstens alle 2 Minuten erneut schicken
const DELETE_UNCONFIRMED_DAYS = 30;

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "method" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "json" }, 400);
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const role = String(body.role ?? "");
  const lang: Lang = body.lang === "en" ? "en" : "de";
  if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(req, { error: "email" }, 400);
  if (!ROLES.includes(role)) return json(req, { error: "role" }, 400);
  if (body.consent !== true) return json(req, { error: "consent" }, 400);

  const age = Number(body.child_age);
  const row = {
    email,
    role,
    lang,
    consent: true,
    child_age: role === "eltern" && Number.isInteger(age) && age >= 6 && age <= 25 ? age : null,
    name: str(body.name, 120),
    club: role === "coach" ? str(body.club, 160) : null,
    sport: str(body.sport, 60),
    source_page: str(body.source_page, 200),
    referrer: str(body.referrer, 300),
    utm_source: str(body.utm_source, 100),
    utm_medium: str(body.utm_medium, 100),
    utm_campaign: str(body.utm_campaign, 100),
  };

  try {
    const t = await texts(lang); // zuerst: ohne Texte keine Mail, dann auch nichts speichern
    const sb = await db();

    // Aufräumen: unbestätigte Anmeldungen nach 30 Tagen löschen (steht so in der Datenschutzerklärung)
    await sb.from("waitlist").delete().is("confirmed_at", null)
      .lt("created_at", new Date(Date.now() - DELETE_UNCONFIRMED_DAYS * 864e5).toISOString());

    const { data: existing, error: selErr } = await sb.from("waitlist")
      .select("id, confirm_token, confirmed_at, confirm_sent_at")
      .eq("email", email).eq("role", role).maybeSingle(); // E-Mails werden immer klein gespeichert
    if (selErr) throw selErr;

    let token: string;
    if (existing) {
      // Schon bestätigt: keine neue Mail, Antwort wie immer (verrät nicht, wer angemeldet ist)
      if (existing.confirmed_at) return json(req, { ok: true });
      if (existing.confirm_sent_at && Date.now() - Date.parse(existing.confirm_sent_at) < RESEND_AFTER_MS) {
        return json(req, { ok: true });
      }
      token = existing.confirm_token;
      const { error } = await sb.from("waitlist").update({ ...row, confirm_sent_at: new Date().toISOString() }).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { data, error } = await sb.from("waitlist")
        .insert({ ...row, confirm_sent_at: new Date().toISOString() })
        .select("confirm_token").single();
      if (error) throw error;
      token = data.confirm_token;
    }

    const link = `${SITE}/${lang === "de" ? "de/bestaetigen.html" : "confirm.html"}?t=${token}`;
    const m = t.bestaetigung;
    const greeting = row.name ? fill(t.anrede.mit_name, { name: escHtml(row.name) }) : t.anrede.ohne_name;
    const linkNote = fill(m.link_hinweis, { link: `<a href="${link}" style="color:#2f5bff;word-break:break-all">${link}</a>` });
    const html = layout({
      preheader: m.vorschau,
      headline: m.headline,
      paragraphs: [greeting, m.text],
      button: { label: m.button, url: link },
      after: [linkNote, m.hinweis],
      footer: footer(t),
    });
    const text = plain([greeting, m.text, `${m.button}: ${link}`, m.hinweis, ...footer(t)]);
    await sendMail(email, m.betreff, html, text);

    return json(req, { ok: true });
  } catch (err) {
    console.error(err);
    return json(req, { error: "server" }, 500);
  }
});
