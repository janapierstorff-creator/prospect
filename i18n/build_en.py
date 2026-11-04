"""Erzeugt die englischen Seiten im Hauptverzeichnis aus den deutschen Seiten unter de/.

Aufruf im Projektordner:  python3 i18n/build_en.py
Nach jeder Textänderung an einer deutschen Seite neu ausführen und neue Texte in i18n/en.py ergänzen.
Das Skript listet am Ende deutsche Texte, für die noch keine Übersetzung existiert.
Außerdem legt es Weiterleitungen für alte Adressen an (/athleten.html, /en/… usw.)\nund baut in die englischen Seiten die automatische Weiterleitung für Browser auf Deutsch ein.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from en import SNIPPETS, TEXT  # noqa: E402

# Deutsche Seite (de/) → englische Seite (Hauptverzeichnis)
PAGES = {"index.html": "index.html", "athleten.html": "athletes.html", "eltern.html": "parents.html", "coaches.html": "coaches.html"}
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
ATTRS = ("alt", "placeholder", "aria-label", "content", "title")
GERMAN_HINT = re.compile(r"[äöüÄÖÜß]|\b(und|der|die|das|dein|deine|nicht|mit|für|wir|ist)\b")


def translate(html, page):
    for de, en in SNIPPETS.items():
        html = html.replace(de, en)

    # Textknoten
    def text_node(m):
        lead, txt, trail = m.group(1), m.group(2), m.group(3)
        return ">" + lead + TEXT.get(txt, txt) + trail + "<"
    html = re.sub(r">(\s*)([^<>]*?\S)(\s*)<", text_node, html)

    # Attribute
    def attr(m):
        return '%s="%s"' % (m.group(1), TEXT.get(m.group(2), m.group(2)))
    html = re.sub(r'\b(%s)="([^"]*)"' % "|".join(ATTRS), attr, html)

    html = html.replace('<html lang="de">', '<html lang="en">', 1)
    html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n  ' + LANG_REDIRECT % page, 1)
    # Pfade: die englischen Seiten liegen eine Ebene höher als die deutschen
    html = re.sub(r'\b(href|src|content)="\.\./(css/|js/|assets/)', r'\1="\2', html)
    # Sprachwechsel und hreflang umdrehen (deutsche Quelle zeigt auf ../<englisch>)
    html = re.sub(r'<a class="lang-switch" href="\.\./[a-z]+\.html" hreflang="en" lang="en">EN</a>',
                  '<a class="lang-switch" href="de/%s" hreflang="de" lang="de">DE</a>' % page, html)
    html = re.sub(r'<link rel="alternate" hreflang="en" href="\.\./[a-z]+\.html">',
                  '<link rel="alternate" hreflang="de" href="de/%s">' % page, html)
    # Links zwischen den Seiten auf die englischen Namen, Rechtliches bleibt deutsch unter de/
    def page_link(m):
        name, rest = m.group(1), m.group(2)
        if name in ("impressum.html", "datenschutz.html"):
            return 'href="de/%s%s"' % (name, rest)
        return 'href="%s%s"' % (PAGES[name], rest)
    html = re.sub(r'href="(index\.html|athleten\.html|eltern\.html|coaches\.html|impressum\.html|datenschutz\.html)([^"]*)"', page_link, html)
    # Anmeldungen der englischen Seiten erkennbar machen
    html = re.sub(r'data-source="([^"]+)"', r'data-source="en-\1"', html)
    return html


def leftovers(html):
    body = re.sub(r"<!--.*?-->|<script.*?</script>|<style.*?</style>", "", html, flags=re.S)
    found = set()
    for t in re.findall(r">([^<>]+)<", body):
        t = t.strip()
        if t and GERMAN_HINT.search(t):
            found.add(t)
    for t in re.findall(r'\b(?:%s)="([^"]*)"' % "|".join(ATTRS), body):
        if GERMAN_HINT.search(t):
            found.add(t)
    return found


def main():
    missing = {}
    for page, en_page in PAGES.items():
        with open(os.path.join(ROOT, "de", page), encoding="utf-8") as f:
            html = translate(f.read(), page)
        with open(os.path.join(ROOT, en_page), "w", encoding="utf-8") as f:
            f.write(html)
        rest = leftovers(html)
        if rest:
            missing[en_page] = sorted(rest)
    for old, target in REDIRECTS.items():
        path = os.path.join(ROOT, old)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(REDIRECT_HTML.format(target))
    print("Englische Seiten erzeugt:", ", ".join(PAGES.values()))
    print("Weiterleitungen:", ", ".join("%s → %s" % kv for kv in REDIRECTS.items()))
    for page, items in missing.items():
        print("\nNoch ohne Übersetzung in %s:" % page)
        for t in items:
            print("  -", t)


if __name__ == "__main__":
    main()
