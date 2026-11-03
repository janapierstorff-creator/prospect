"""Erzeugt die englischen Seiten unter en/ aus den deutschen Seiten.

Aufruf im Projektordner:  python3 i18n/build_en.py
Nach jeder Textänderung an einer deutschen Seite neu ausführen und neue Texte in i18n/en.py ergänzen.
Das Skript listet am Ende deutsche Texte, für die noch keine Übersetzung existiert.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from en import SNIPPETS, TEXT  # noqa: E402

PAGES = ["index.html", "athleten.html", "eltern.html", "coaches.html"]
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
    # Relative Pfade eine Ebene höher
    html = re.sub(r'\b(href|src|content)="(css/|js/|assets/|impressum\.html|datenschutz\.html)', r'\1="../\2', html)
    # Sprachwechsel und hreflang umdrehen
    html = html.replace('<a class="lang-switch" href="en/%s" hreflang="en" lang="en">EN</a>' % page,
                        '<a class="lang-switch" href="../%s" hreflang="de" lang="de">DE</a>' % page)
    html = html.replace('<link rel="alternate" hreflang="en" href="en/%s">' % page,
                        '<link rel="alternate" hreflang="de" href="../%s">' % page)
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
    os.makedirs(os.path.join(ROOT, "en"), exist_ok=True)
    missing = {}
    for page in PAGES:
        with open(os.path.join(ROOT, page), encoding="utf-8") as f:
            html = translate(f.read(), page)
        with open(os.path.join(ROOT, "en", page), "w", encoding="utf-8") as f:
            f.write(html)
        rest = leftovers(html)
        if rest:
            missing[page] = sorted(rest)
    print("Englische Seiten erzeugt:", ", ".join("en/" + p for p in PAGES))
    for page, items in missing.items():
        print("\nNoch ohne Übersetzung in en/%s:" % page)
        for t in items:
            print("  -", t)


if __name__ == "__main__":
    main()
