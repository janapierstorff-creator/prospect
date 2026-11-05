// Bestätigung der Anmeldung (Double-Opt-in, Schritt 2)
// Die Bestätigungsseite (de/bestaetigen.html, confirm.html) schickt den Token aus dem Mail-Link hierher.
// Danach ist die Anmeldung bestätigt und es geht eine Willkommens-Mail raus.

import { cors, db, fill, footer, json, layout, plain, sendMail, SITE, texts, type Lang } from "../_shared/mail.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "method" }, 405);

  let token = "";
  try {
    token = String((await req.json()).token ?? "");
  } catch {
    return json(req, { status: "invalid" }, 400);
  }
  if (!UUID.test(token)) return json(req, { status: "invalid" }, 400);

  try {
    const sb = await db();
    const { data: row, error } = await sb.from("waitlist")
      .update({ confirmed_at: new Date().toISOString() })
      .eq("confirm_token", token).is("confirmed_at", null)
      .select("email, role, lang, name").maybeSingle();
    if (error) throw error;

    if (!row) {
      const { data: known } = await sb.from("waitlist").select("role").eq("confirm_token", token).maybeSingle();
      return json(req, known ? { status: "already", role: known.role } : { status: "invalid" });
    }

    // Willkommens-Mail; schlägt sie fehl, bleibt die Anmeldung trotzdem bestätigt
    try {
      const lang: Lang = row.lang === "en" ? "en" : "de";
      const t = await texts(lang);
      const w = t.willkommen;
      const greeting = row.name ? fill(t.anrede.mit_name, { name: escHtml(row.name) }) : t.anrede.ohne_name;
      const roleText = w[`text_${row.role}`] ?? "";
      const site = `${SITE}/${lang === "de" ? "de/" : ""}`;
      const html = layout({
        preheader: w.vorschau,
        headline: w.headline,
        paragraphs: [greeting, w.text, roleText, w.text_2].filter(Boolean),
        button: { label: w.button, url: site },
        after: [w.text_3].filter(Boolean),
        footer: footer(t),
      });
      const text = plain([greeting, w.text, roleText, w.text_2, `${w.button}: ${site}`, w.text_3, ...footer(t)]);
      await sendMail(row.email, w.betreff, html, text);
    } catch (mailErr) {
      console.error("Willkommens-Mail:", mailErr);
    }

    return json(req, { status: "confirmed", role: row.role });
  } catch (err) {
    console.error(err);
    return json(req, { status: "error" }, 500);
  }
});
