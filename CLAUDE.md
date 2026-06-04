# CLAUDE.md

Moodle Toolkit — hulpmiddelen voor docenten op Moodle (toets.ap.be / digitap.ap.be).
Twee functies: bijlagen massaal **downloaden** (met automatische hernoeming naar
studentennaam) en studenten in bulk **aan een groep toevoegen**.

## Drie distributiekanalen — elk met eigen download-code

Dezelfde functionaliteit, drie verpakkingen. Ze **delen geen code**: een fix in één
kanaal moet je bewust ook in de andere doorvoeren waar relevant.

| Kanaal | Bron | Download-mechanisme |
|---|---|---|
| Bookmarklet | `src/bookmarklet.js` → `install.html` | `fetch` → blob → `<a download>` |
| Browserextensie (Chrome/Edge) | `manifest.json`, `src/content.js`, `src/background.js`, `src/popup.*` | `chrome.downloads.download({ filename })` |
| Userscript (Tampermonkey) | `userscript.js` | `GM_download({ name })` |

De drie mechanismes gedragen zich verschillend t.o.v. Moodle's
`Content-Disposition`-header: de bookmarklet moet via `fetch`+blob downloaden om de
gekozen bestandsnaam te behouden; de extensie en userscript geven de naam expliciet
mee aan hun download-API.

## ⚠️ install.html is gegenereerd — bewerk alleen src/bookmarklet.js

`install.html` (de GitHub Pages installatiepagina) bevat een **ingesloten kopie** van
de bookmarklet in `<script id="bookmarklet-source">`. Die kopie én de versie-stempel
op de pagina worden **automatisch gegenereerd** door `scripts/build-install.mjs`, dat
draait in de Pages-deploy workflow.

- **Bewerk uitsluitend `src/bookmarklet.js`.** Pas de ingesloten kopie nooit met de
  hand aan — ze wordt overschreven.
- Lokaal regenereren (optioneel, houdt de gecommitte `install.html` in sync):
  `node scripts/build-install.mjs`
- De pagina toont onderaan "Versie &lt;commitdatum&gt; (&lt;short SHA&gt;)", ingevuld
  bij de deploy, zodat je kan zien of de live site de laatste commit bevat.

**Minifier-beperking:** `install.html` bouwt een `javascript:`-URL door
regelcommentaren te strippen en witruimte samen te vouwen. Vermijd daarom
commentaar-tekens binnen string- of regex-literals (bouw bv. URL's op uit
`window.location.origin` i.p.v. ze letterlijk te schrijven).

## Deployen

- **Pages-site:** push naar `main` → `.github/workflows/deploy_pages.yml` draait het
  build-script en publiceert (~30 s). Daarna eventueel hard refreshen (Ctrl+F5).
- **Extensie-release:** push een git-tag `vX.Y` → `.github/workflows/release.yml`
  bouwt de zip en maakt een GitHub Release. Details staan in `HOWTODEPLOY.md`.

## Testen

Echte Moodle-pagina's om tegen te testen (grading-rapporten op toets.ap.be) staan
onderaan `HOWTODEPLOY.md`.
