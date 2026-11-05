// Gemeinsame Bausteine für die Wartelisten-Funktionen: CORS, Texte, Mail-Layout, Versand über Resend.
// Die Mail-Texte kommen aus content/texts.yml (Abschnitt "emails"); der Build schreibt sie nach
// https://prospect-fuel.com/assets/emails.json. So lassen sie sich ändern, ohne die Funktionen neu zu deployen.

export const SITE = "https://prospect-fuel.com";
const FROM = "ProspectFuel <support@prospect-fuel.com>";
const REPLY_TO = "support@prospect-fuel.com";

const ALLOWED_ORIGINS = [SITE, "https://www.prospect-fuel.com", "http://localhost:8765"];

export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : SITE,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
    "Vary": "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json" },
  });
}

export async function db() {
  const { createClient } = await import("npm:@supabase/supabase-js@2.45.4");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return createClient(Deno.env.get("SUPABASE_URL") ?? "", key, { auth: { persistSession: false } });
}

export type Lang = "de" | "en";
type Texts = Record<string, Record<string, string>>;

let cache: { at: number; data: Record<Lang, Texts> } | null = null;

export async function texts(lang: Lang): Promise<Texts> {
  if (!cache || Date.now() - cache.at > 5 * 60 * 1000) {
    const res = await fetch(`${SITE}/assets/emails.json?ts=${Date.now()}`);
    if (!res.ok) throw new Error(`emails.json: HTTP ${res.status}`);
    cache = { at: Date.now(), data: await res.json() };
  }
  return cache.data[lang] ?? cache.data.de;
}

export function fill(s: string, vars: Record<string, string>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Mail-Programme kennen keine CSS-Klassen: Auszeichnung aus texts.yml in Inline-Styles umwandeln
function inline(html: string): string {
  return html.replace(/<span class="accent">/g, '<span style="color:#2f5bff">').replace(/<b>/g, '<b style="color:#101820">');
}

// Absätze (bereits HTML aus dem Build: **fett**, *blau*) und optional ein Button
export function layout(opts: {
  preheader: string;
  headline: string;
  paragraphs: string[];
  button?: { label: string; url: string };
  after?: string[];
  footer: string[];
}): string {
  const p = (html: string) =>
    `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#4a505c">${inline(html)}</p>`;
  const button = opts.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td style="border-radius:999px;background:#2f5bff">
        <a href="${esc(opts.button.url)}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px">${opts.button.label}</a>
      </td></tr></table>`
    : "";
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(opts.headline.replace(/<[^>]+>/g, ""))}</title></head>
<body style="margin:0;padding:0;background:#f2f4f7;font-family:Inter,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f7"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">
    <tr><td style="background:#080e13;padding:22px 32px">
      <img src="${SITE}/assets/email-logo.png" width="60" height="28" alt="ProspectFuel" style="display:block;border:0">
    </td></tr>
    <tr><td style="padding:32px 32px 8px">
      <h1 style="margin:0 0 20px;font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:32px;line-height:1.05;font-weight:800;text-transform:uppercase;color:#101820">${inline(opts.headline)}</h1>
      ${opts.paragraphs.map(p).join("\n")}
      ${button}
      ${(opts.after ?? []).map(p).join("\n")}
    </td></tr>
    <tr><td style="padding:20px 32px 28px;border-top:1px solid #e4e7ec">
      ${opts.footer.map((f) => `<p style="margin:0 0 6px;font-size:12.5px;line-height:1.5;color:#6b7280">${inline(f)}</p>`).join("\n")}
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

// Text-Version für Mail-Programme ohne HTML
export function plain(parts: string[]): string {
  return parts
    .filter(Boolean)
    .map((s) => s.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"))
    .join("\n\n");
}

export async function sendMail(to: string, subject: string, html: string, text: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject, html, text }),
  });
  if (!res.ok) throw new Error(`Resend: HTTP ${res.status} ${await res.text()}`);
}

// Fußzeile: Hinweis + Links zu Impressum und Datenschutz (die Rechtstexte gibt es nur auf Deutsch)
const LEGAL = { impressum: `${SITE}/de/impressum.html`, datenschutz: `${SITE}/de/datenschutz.html` };

export function footer(t: Texts): string[] {
  const f = t.footer;
  const a = (label: string, url: string) => `<a href="${url}" style="color:#6b7280;text-decoration:underline">${label}</a>`;
  return [f.text, `ProspectFuel · ${a(f.impressum || "Impressum", LEGAL.impressum)} · ${a(f.datenschutz || "Datenschutz", LEGAL.datenschutz)}`];
}

export function footerText(t: Texts): string[] {
  const f = t.footer;
  return [f.text, `${f.impressum || "Impressum"}: ${LEGAL.impressum}`, `${f.datenschutz || "Datenschutz"}: ${LEGAL.datenschutz}`];
}
