# ProspectFuel – Waitlist-Website

Statische Website mit Startseite und drei Zielgruppen-Seiten (Athleten, Eltern, Coaches), auf Englisch (Standard) und Deutsch (unter `/de/`). Dazu kommen Impressum und Datenschutz.
Die Anmeldungen für die Warteliste landen in **Supabase**, gehostet wird über **GitHub Pages**. Beides ist kostenlos.

Live: **https://prospect-fuel.com** (Domain bei GoDaddy, die Datei `CNAME` im Projekt verbindet sie mit GitHub Pages).

```
de/                  – deutsche Seiten (hier werden alle Texte gepflegt)
                       index.html  athleten.html  eltern.html  coaches.html
                       impressum.html  datenschutz.html (Rechtliches nur Deutsch)
index.html  athletes.html  parents.html  coaches.html
                     – englische Seiten im Hauptverzeichnis, werden erzeugt (siehe unten)
athleten.html  eltern.html  impressum.html  datenschutz.html  en/
                     – nur Weiterleitungen für alte Links, werden erzeugt
css/prospect.css     – das gesamte Design
css/fonts.css        – Schriften, lokal aus assets/fonts/ (keine Verbindung zu Google)
js/main.js           – Navigation, Slider, Formulare, „Schick es deinen Eltern“, Hinweis „Auf Deutsch lesen“
js/vendor/           – Icon-Bibliothek Lucide, lokal (keine Verbindung zu unpkg)
js/config.js         – Supabase-Zugangsdaten
supabase/schema.sql  – Tabelle und Sicherheitsregeln für die Warteliste
i18n/                – englische Texte und Skript für die englischen Seiten
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
| Alle | `og-image.jpg` (1200 × 630, Vorschaubild beim Teilen, fehlt noch) |

Die drei Karten „Für Athleten / Eltern / Coaches“ auf der Startseite nutzen die Hero-Bilder der Unterseiten. Der Ausschnitt steht direkt am Bild als `object-position`.

Bildausschnitt im Hero: Am Bild steht `style="--focus: 72% 30%; --focus-m: 97% 30%"`. Der erste Wert gilt für den Desktop, der zweite fürs Handy, jeweils waagerecht und senkrecht in Prozent. Bei einem neuen Foto müssen die Werte angepasst werden.

Tipp: Bilder vorher auf etwa 1800 bis 2400 px Breite verkleinern und komprimieren, zum Beispiel mit squoosh.app.

## Sprachen

Englisch ist die Standardsprache unter `prospect-fuel.com/`, Deutsch liegt unter `prospect-fuel.com/de/`.
Die Texte werden **auf den deutschen Seiten in `de/` gepflegt**, die englischen Seiten werden daraus erzeugt. Nicht direkt in den englischen Seiten im Hauptverzeichnis bearbeiten.

1. Texte auf den deutschen Seiten in `de/` ändern.
2. Neue oder geänderte Texte in `i18n/en.py` übersetzen (`TEXT` für einzelne Texte, `SNIPPETS` für Headlines mit Zeilenumbrüchen).
3. Im Projektordner ausführen:

```bash
python3 i18n/build_en.py
```

Das Skript schreibt `index.html`, `athletes.html`, `parents.html` und `coaches.html` ins Hauptverzeichnis, legt die Weiterleitungen für alte Adressen an (`/athleten.html`, `/eltern.html`, `/en/…`) und listet am Ende Texte, die noch Deutsch aussehen.
Impressum und Datenschutz gibt es nur auf Deutsch, die englischen Seiten verlinken dorthin. Anmeldungen von den englischen Seiten haben in `source_page` ein `en-` vorne, zum Beispiel `en-start-final`.
Auf den englischen Seiten erscheint unten ein kleiner Hinweis „Auf Deutsch lesen“, wenn Deutsch die erste Sprache des Browsers ist. Wer ihn schließt, sieht ihn nicht wieder.

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

3. Im Repository unter **Settings → Pages** als Source **Deploy from a branch** wählen, dann Branch `main` und Ordner `/ (root)`.
4. Nach etwa einer Minute ist die Seite unter `https://<dein-name>.github.io/prospect/` erreichbar.
5. Eigene Domain (optional): Unter **Settings → Pages → Custom domain** eintragen und beim Domain-Anbieter die DNS-Einträge setzen, die GitHub anzeigt.

Nicht veröffentlicht werden (siehe `.gitignore`): die alten `*-prospectfuel-alt.html`-Seiten, `css/style.css`, `exports/` und ungenutzte Bild-Alternativen. Sie bleiben lokal liegen.

## Vor dem Livegang

- [ ] Impressum ausfüllen (Anschrift, E-Mail, gelb markierte Stellen)
- [ ] Datenschutz vervollständigen und prüfen lassen (Supabase, Minderjährige)
- [ ] Kontakt-E-Mail festlegen (Impressum und Datenschutz nennen noch `hallo@prospectfuel.de`)
- [ ] `og-image.jpg` anlegen
- [ ] Zahlen auf der Athleten-Seite mit Quelle belegen (60 %, 2–3x), Fußnote aktivieren
- [ ] Wirkversprechen und Aussagen prüfen („Mehr Energie“, „Bessere Performance“, „mit Ernährungsexperten entwickelt“, „kostenlos“)
- [ ] Einmal selbst eintragen und in Supabase prüfen, ob der Eintrag ankommt

## Kampagnen messen

Links mit UTM-Parametern teilen, zum Beispiel `…/eltern.html?utm_source=instagram&utm_campaign=launch`.
Die Parameter werden bei der Anmeldung mitgespeichert. So siehst du später, welcher Kanal wie viele Anmeldungen gebracht hat.
Wenn ein Athlet die Seite über „Schick es deinen Eltern“ teilt, steht bei der Anmeldung der Eltern automatisch `spieler` als Quelle.

## Lokal ansehen

```bash
python3 -m http.server 8080
```

Danach im Browser http://localhost:8080 öffnen.
