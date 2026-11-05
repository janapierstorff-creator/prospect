"""Baut alle Seiten aus den Vorlagen in src/ und den Texten in content/texts.yml.

Aufruf im Projektordner:  python3 i18n/build.py
Auf GitHub läuft das automatisch nach jeder Änderung (.github/workflows/build.yml).

- Deutsche Seiten:  src/<seite>.html  →  de/<seite>.html
- Englische Seiten: src/<seite>.html  →  <englischer Name>.html im Hauptverzeichnis
- Weiterleitungen für alte Adressen (/athleten.html, /en/… usw.)

Platzhalter in den Vorlagen:
  [[seite.abschnitt.feld]]  Text mit Auszeichnung: " / " Zeilenumbruch, *blau*, **fett**
  {{seite.abschnitt.feld}}  reiner Text (Attribute, Seitentitel)
"""
import html
import json
import os
import re
import sys

import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Deutsche Seite (de/) → englische Seite (Hauptverzeichnis); Rechtliches gibt es nur auf Deutsch
PAGES = {"index.html": "index.html", "athleten.html": "athletes.html", "eltern.html": "parents.html", "coaches.html": "coaches.html",
         "bestaetigen.html": "confirm.html"}
# Seiten ohne automatische Sprachweiterleitung (Link aus der Mail soll in der Sprache der Anmeldung bleiben)
NO_LANG_REDIRECT = ["bestaetigen.html"]
LEGAL = ["impressum.html", "datenschutz.html"]
# Alte Adressen → neue Ziele (Weiterleitungsseiten, damit geteilte Links weiter funktionieren)
REDIRECTS = {
    "athleten.html": "de/athleten.html",
    "eltern.html": "de/eltern.html",
    "impressum.html": "de/impressum.html",
    "datenschutz.html": "de/datenschutz.html",
    "en/index.html": "../index.html",
    "en/athleten.html": "../athletes.html",
    "en/eltern.html": "../parents.html",
    "en/coaches.html": "../coaches.html",
}
REDIRECT_HTML = """<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>ProspectFuel</title>
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url={0}">
<script>location.replace("{0}" + location.search + location.hash);</script>
</head>
<body><a href="{0}">ProspectFuel</a></body>
</html>
"""
# Auf den englischen Seiten: Browser mit Deutsch als erster Sprache direkt auf die deutsche Seite leiten,
# außer jemand hat über DE/EN bewusst Englisch gewählt (gespeichert in localStorage "pf_lang", siehe js/main.js)
LANG_REDIRECT = """<script>(function () {
    var pref = null;
    try { pref = localStorage.getItem("pf_lang"); } catch (e) {}
    var lang = (navigator.languages && navigator.languages[0]) || navigator.language || "";
    if (pref === "de" || (pref !== "en" && /^de\\b/i.test(lang))) location.replace("de/%s" + location.search + location.hash);
  })();</script>"""

PLACEHOLDER = re.compile(r"\[\[([\w.-]+)\]\]|\{\{([\w.-]+)\}\}")


def load_texts():
    path = os.path.join(ROOT, "content", "texts.yml")
    try:
        with open(path, encoding="utf-8") as f:
            return yaml.safe_load(f)
    except yaml.YAMLError as err:
        mark = getattr(err, "problem_mark", None)
        where = " in Zeile %d" % (mark.line + 1) if mark else ""
        print("FEHLER in content/texts.yml%s: Die Datei ist nicht lesbar." % where)
        print("Häufigste Ursache: Ein Text enthält einen Doppelpunkt mit Leerzeichen dahinter (\": \")")
        print("oder beginnt mit einem Sonderzeichen, z. B. **fett** oder *blau* am Anfang. Dann den ganzen Text in Anführungszeichen setzen:")
        print('    de: "So geht\'s: ganz einfach"')
        print('    de: "**Fett am Anfang.** Rest vom Text"')
        print("Die Website wurde nicht verändert.")
        sys.exit(1)


def lookup(texts, key):
    node = texts
    for part in key.split("."):
        if not isinstance(node, dict) or part not in node:
            raise KeyError(key)
        node = node[part]
    return node


def esc_text(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def esc_attr(s):
    return esc_text(s).replace('"', "&quot;")


def rich(s):
    """Auszeichnung aus texts.yml in HTML umwandeln."""
    s = esc_text(s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"\*(.+?)\*", r'<span class="accent">\1</span>', s)
    s = re.sub(r"\s+/\s+", " <br>", s)
    return s


def fill(template, texts, lang, page, warnings):
    def repl(m):
        key = m.group(1) or m.group(2)
        try:
            entry = lookup(texts, key)
        except KeyError:
            warnings.append("%s: Text „%s“ fehlt in texts.yml" % (page, key))
            return ""
        value = entry.get(lang) if isinstance(entry, dict) else None
        if value is None:
            if lang == "en":
                warnings.append("%s: noch keine englische Übersetzung für %s" % (page, key))
            value = entry.get("de", "") if isinstance(entry, dict) else ""
        value = str(value)
        return rich(value) if m.group(1) else esc_attr(value)
    return PLACEHOLDER.sub(repl, template)


def inject_messages(page_html, texts, lang):
    """Meldungen für js/main.js (Formular, Teilen) als window.PF_TEXT vor main.js einfügen."""
    msgs = {}
    for section, entries in texts.get("meldungen", {}).items():
        for key, entry in entries.items():
            value = entry.get(lang) or entry.get("de", "")
            msgs["%s.%s" % (section, key)] = str(value)
    data = json.dumps(msgs, ensure_ascii=False).replace("</", "<\\/")
    return page_html.replace('<script src="../js/main.js"></script>',
                             '<script>window.PF_TEXT = %s;</script>\n<script src="../js/main.js"></script>' % data, 1)


def write_emails(texts, warnings):
    """Mail-Texte (Abschnitt "emails") für die Supabase-Funktionen nach assets/emails.json schreiben.
    Betreff und Vorschau bleiben reiner Text, alles andere wird wie auf der Seite ausgezeichnet."""
    out = {}
    for lang in ("de", "en"):
        out[lang] = {}
        for group, entries in texts.get("emails", {}).items():
            out[lang][group] = {}
            for key, entry in entries.items():
                value = entry.get(lang)
                if value is None:
                    warnings.append("emails: noch keine englische Übersetzung für %s.%s" % (group, key))
                    value = entry.get("de", "")
                value = str(value)
                out[lang][group][key] = value if key in ("betreff", "vorschau") else rich(value)
    with open(os.path.join(ROOT, "assets", "emails.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)


def to_english(html_src, page):
    """Struktur der deutschen Seite (de/) für das Hauptverzeichnis auf Englisch umstellen."""
    s = html_src.replace('<html lang="de">', '<html lang="en">', 1)
    if page not in NO_LANG_REDIRECT:
        s = s.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n  ' + LANG_REDIRECT % page, 1)
    # Pfade: die englischen Seiten liegen eine Ebene höher als die deutschen
    s = re.sub(r'\b(href|src|content)="\.\./(css/|js/|assets/)', r'\1="\2', s)
    # Sprachwechsel und hreflang umdrehen (deutsche Vorlage zeigt auf ../<englisch>)
    s = re.sub(r'<a class="lang-switch" href="\.\./[a-z]+\.html" hreflang="en" lang="en">EN</a>',
               '<a class="lang-switch" href="de/%s" hreflang="de" lang="de">DE</a>' % page, s)
    s = re.sub(r'<link rel="alternate" hreflang="en" href="\.\./[a-z]+\.html">',
               '<link rel="alternate" hreflang="de" href="de/%s">' % page, s)

    # Links zwischen den Seiten auf die englischen Namen, Rechtliches bleibt deutsch unter de/
    def page_link(m):
        name, rest = m.group(1), m.group(2)
        if name in LEGAL:
            return 'href="de/%s%s"' % (name, rest)
        return 'href="%s%s"' % (PAGES[name], rest)
    s = re.sub(r'href="(index\.html|athleten\.html|eltern\.html|coaches\.html|impressum\.html|datenschutz\.html)([^"]*)"', page_link, s)
    # Vorschaubild und Adresse beim Teilen (absolute URLs, damit WhatsApp & Co. sie finden)
    s = s.replace("og-image-de.jpg", "og-image.jpg")
    s = s.replace('content="https://prospect-fuel.com/de/%s"' % ("" if page == "index.html" else page),
                  'content="https://prospect-fuel.com/%s"' % ("" if page == "index.html" else PAGES[page]))
    # Anmeldungen der englischen Seiten erkennbar machen
    s = re.sub(r'data-source="([^"]+)"', r'data-source="en-\1"', s)
    return s


def main():
    texts = load_texts()
    warnings = []
    for page in list(PAGES) + LEGAL:
        with open(os.path.join(ROOT, "src", page), encoding="utf-8") as f:
            template = f.read()
        with open(os.path.join(ROOT, "de", page), "w", encoding="utf-8") as f:
            f.write(inject_messages(fill(template, texts, "de", page, warnings), texts, "de"))
        if page in PAGES:
            en = to_english(inject_messages(fill(template, texts, "en", page, warnings), texts, "en"), page)
            with open(os.path.join(ROOT, PAGES[page]), "w", encoding="utf-8") as f:
                f.write(en)
    write_emails(texts, warnings)
    for old, target in REDIRECTS.items():
        path = os.path.join(ROOT, old)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(REDIRECT_HTML.format(target))
    print("Seiten gebaut: de/ (%d) und Englisch (%s)" % (len(PAGES) + len(LEGAL), ", ".join(PAGES.values())))
    for w in warnings:
        print("Hinweis:", w)
    missing = [w for w in warnings if "fehlt in texts.yml" in w]
    if missing:
        sys.exit(1)


if __name__ == "__main__":
    main()
