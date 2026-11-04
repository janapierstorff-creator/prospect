# ProspectFuel – Waitlist-Website

Statische Website mit Startseite und drei Zielgruppen-Seiten (Athleten, Eltern, Coaches), auf Englisch (Standard) und Deutsch (unter `/de/`). Dazu kommen Impressum und Datenschutz.
Die Anmeldungen für die Warteliste landen in **Supabase**, gehostet wird über **GitHub Pages**. Beides ist kostenlos.

Live: **https://prospect-fuel.com** (Domain bei GoDaddy, die Datei `CNAME` im Projekt verbindet sie mit GitHub Pages).

```
content/texts.yml    – ALLE TEXTE der Website, Deutsch und Englisch (hier wird bearbeitet)
src/                 – Vorlagen der Seiten (Aufbau, Design-Klassen, Bilder); Texte als Platzhalter
i18n/build.py        – baut aus Vorlagen + Texten die fertigen Seiten
de/                  – deutsche Seiten (werden erzeugt, nicht direkt bearbeiten)
index.html  athletes.html  parents.html  coaches.html
                     – englische Seiten im Hauptverzeichnis (werden erzeugt)
athleten.html  eltern.html  impressum.html  datenschutz.html  en/
                     – nur Weiterleitungen für alte Links (werden erzeugt)
.github/workflows/build.yml – baut und veröffentlicht automatisch nach jeder Änderung
css/prospect.css     – das gesamte Design
css/fonts.css        – Schriften, lokal aus assets/fonts/ (keine Verbindung zu Google)
js/main.js           – Navigation, Slider, Formulare, Einblenden beim Scrollen, gemerkte Sprachwahl
js/vendor/           – Icon-Bibliothek Lucide, lokal (keine Verbindung zu unpkg)
js/config.js         – Supabase-Zugangsdaten
supabase/schema.sql  – Tabelle und Sicherheitsregeln für die Warteliste
assets/img/prospect/ – alle Fotos
CNAME                – eigene Domain prospect-fuel.com
```

## Bilder

Alle Bilder liegen in `assets/img/prospect/`. Fehlt ein Bild, zeigt die Seite einen grauen Platzhalter mit dem erwarteten Dateinamen.

| Seite | Dateien |
|---|---|
| Startseite | `hero.jpg`, `challenge.jpg`, `system.jpg`, `jana.jpg`, `final.jpg` |
| Athleten | `athlet-hero.jpg`, `athlet-skill.jpg`, `athlet-final.jpg` |
| Eltern | `eltern-hero.jpg`, `eltern-challenge.jpg`, `eltern-motivation.jpg`, `eltern-final.jpg` |
| Coaches | `coach-hero.jpg`, `coach-band.jpg`, `coach-final.jpg` |
| Alle | `og-image.jpg` und `og-image-de.jpg` (1200 × 630, Vorschaubild beim Teilen auf Englisch und Deutsch) |

Die drei Karten „Für Athleten / Eltern / Coaches“ auf der Startseite nutzen die Hero-Bilder der Unterseiten. Der Ausschnitt steht direkt am Bild als `object-position`.

Bildausschnitt im Hero: Am Bild steht `style="--focus: 72% 30%; --focus-m: 97% 30%"`. Der erste Wert gilt für den Desktop, der zweite fürs Handy, jeweils waagerecht und senkrecht in Prozent. Bei einem neuen Foto müssen die Werte angepasst werden.

Tipp: Bilder vorher auf etwa 1800 bis 2400 px Breite verkleinern und komprimieren, zum Beispiel mit squoosh.app.

## Texte bearbeiten

Alle Texte stehen in **`content/texts.yml`**, sortiert nach Seite → Abschnitt → Element, Deutsch (`de`) und Englisch (`en`) untereinander.

**Auf github.com (ohne Programm auf dem Rechner):**
1. Im Repository `content/texts.yml` öffnen und oben rechts auf das Stift-Symbol klicken.
2. Text ändern. Mit `Strg/Cmd + F` findest du die Stelle schnell, einfach nach dem alten Text suchen.
3. Unten bzw. oben rechts auf **Commit changes** klicken.
4. Nach ca. 1–2 Minuten ist die Änderung live. Den Fortschritt siehst du im Reiter **Actions**.

**Zeichen in Texten auf der Seite** (nicht in Bildbeschreibungen und Platzhaltern):
- ` / ` Zeilenumbruch, z. B. `Real fuel. / *Real progress.*`
- `*Text*` Text in Blau
- `**Text**` Text fett

**Wichtig:** Enthält ein Text einen Doppelpunkt mit Leerzeichen dahinter (`: `) oder beginnt er mit einem Sonderzeichen, muss er in Anführungszeichen stehen: `de: "So geht's: ganz einfach"`. Ist die Datei fehlerhaft, bricht der automatische Bau ab, die Website bleibt unverändert, und unter **Actions** steht, in welcher Zeile das Problem ist.

**Lokal:** `python3 i18n/build.py` im Projektordner baut alle Seiten (einmalig `python3 -m pip install --user pyyaml`).

Neue Abschnitte, Layout, Bilder und Design werden in den Vorlagen in `src/` und in `css/prospect.css` geändert.

## Sprachen

Englisch ist die Standardsprache unter `prospect-fuel.com/`, Deutsch liegt unter `prospect-fuel.com/de/`. Impressum und Datenschutz gibt es nur auf Deutsch, die englischen Seiten verlinken dorthin.
Anmeldungen von den englischen Seiten haben in `source_page` ein `en-` vorne, zum Beispiel `en-start-final`.

**Automatische Sprachwahl:** Ist Deutsch die erste Sprache im Browser, leiten die englischen Seiten direkt auf die deutsche Version weiter (zum Beispiel `/parents.html` → `/de/eltern.html`). Wer über DE/EN in der Navigation bewusst eine Sprache wählt, bekommt diese ab dann immer, die Wahl wird im Browser gespeichert. Die deutschen Seiten leiten nie weiter, ein geteilter `/de/`-Link bleibt also immer deutsch.

## Supabase einrichten (ca. 10 Minuten)

1. Auf [supabase.com](https://supabase.com) einen Account anlegen und **New project** wählen. Als Region **Frankfurt (eu-central-1)** nehmen, das ist wichtig für die DSGVO.
2. Links **SQL Editor** öffnen, **New query** wählen, den Inhalt von `supabase/schema.sql` einfügen und mit **Run** ausführen.
3. Unter **Project Settings → API** die **Project URL** und den **anon public** Key kopieren und in `js/config.js` eintragen.
4. Fertig. Neue Anmeldungen findest du unter **Table Editor → waitlist**. Über **Export → CSV** kannst du sie herunterladen.
   Die Auswertung nach Rolle und Seite siehst du im SQL Editor mit `select * from waitlist_stats;`.

Solange `js/config.js` leer ist, laufen die Formulare im Testmodus: Nichts wird gespeichert, die Daten erscheinen nur in der Browser-Konsole.

Der anon-Key darf öffentlich im Code stehen. Die Tabelle erlaubt Besuchern nur das **Eintragen**, nicht das Lesen. Wer sich doppelt einträgt, bekommt trotzdem die Danke-Meldung, die Liste speichert die Adresse pro Rolle aber nur einmal.

## Auf GitHub Pages veröffentlichen

1. Auf [github.com](https://github.com) ein neues Repository anlegen, zum Beispiel `prospect`. Es kann öffentlich sein.
2. Den lokalen Stand hochladen (das Repository ist hier schon angelegt):

```bash
git remote add origin https://github.com/<dein-name>/prospect.git
```

```bash
git push -u origin main
```

3. Im Repository unter **Settings → Pages** als Source **GitHub Actions** wählen. Die Seiten werden dann bei jeder Änderung automatisch gebaut und veröffentlicht.
4. Nach etwa einer Minute ist die Seite unter `https://<dein-name>.github.io/prospect/` erreichbar.
5. Eigene Domain (optional): Unter **Settings → Pages → Custom domain** eintragen und beim Domain-Anbieter die DNS-Einträge setzen, die GitHub anzeigt.

Nicht veröffentlicht werden (siehe `.gitignore`): die alten `*-prospectfuel-alt.html`-Seiten, `css/style.css`, `exports/` und ungenutzte Bild-Alternativen. Sie bleiben lokal liegen.

## Vor dem breiten Teilen

- [x] Impressum ausgefüllt (Anschrift, E-Mail)
- [x] Datenschutzerklärung überarbeitet (Stand November 2026)
- [x] Kontakt-E-Mail: jana@prospect-fuel.com
- [x] Vorschaubilder zum Teilen: `og-image.jpg` (Englisch) und `og-image-de.jpg` (Deutsch), Vorlagen in `exports/og-image-*.html`
- [ ] E-Mail-Empfang für jana@prospect-fuel.com einrichten (Weiterleitung oder Postfach bei GoDaddy, MX-Eintrag)
- [ ] Auftragsverarbeitungsvertrag (DPA) mit Supabase abschließen (Dashboard → Organization → Legal Documents)
- [ ] Einmal selbst auf Deutsch und Englisch eintragen und in Supabase prüfen, ob die Einträge ankommen; alte Test-Einträge löschen
- [ ] Wirkversprechen und Aussagen prüfen („Mehr Energie“, „Bessere Leistung“, „Schneller regenerieren“, „mit Ernährungsexperten entwickelt“)
- [ ] Datenschutzerklärung und Impressum juristisch prüfen lassen
- [ ] Später: E-Mail-Tool für die Start-Mails wählen (mit Double-Opt-in) und in der Datenschutzerklärung ergänzen
- [ ] Optional: Zahlen auf der Athleten-Seite nur mit Quelle wieder einblenden (60 %, 2–3x)

## Kampagnen messen

Links mit UTM-Parametern teilen, zum Beispiel `…/eltern.html?utm_source=instagram&utm_campaign=launch`.
Die Parameter werden bei der Anmeldung mitgespeichert. So siehst du später, welcher Kanal wie viele Anmeldungen gebracht hat.
Wenn ein Athlet die Seite über „Schick es deinen Eltern“ teilt, steht bei der Anmeldung der Eltern automatisch `spieler` als Quelle.

## Lokal ansehen

```bash
python3 -m http.server 8080
```

Danach im Browser http://localhost:8080 öffnen.
