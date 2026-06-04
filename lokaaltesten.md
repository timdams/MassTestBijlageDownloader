 De bookmarklet snel testen (eenvoudigst)
In de map demo/ zit een opgeslagen Moodle pagina (demo/DEEL 2 _ Inhaal Vaardigheidsproef _ Toets.html) die de echte resultatenpagina nabootst — perfect voor lokaal testen zonder Moodle.

Stappen:

1. Open install.html lokaal in je browser (dubbelklikken werkt, of via Live Server in VS Code).
2. Sleep de blauwe knop "🧰 Moodle Toolkit" naar je bladwijzerbalk.
3. Open de demo file: dubbelklik op demo/DEEL 2 _ Inhaal Vaardigheidsproef _ Toets.html.
4. Klik op de bladwijzer → overlay verschijnt, klik "Download All".
De bookmarklet die op de bladwijzerbalk komt, wordt gegenereerd uit het inline <script id="bookmarklet-source"> blok in install.html. Dat blok is zélf geen bron: het wordt automatisch uit src/bookmarklet.js gegenereerd door scripts/build-install.mjs. Bewerk dus src/bookmarklet.js en draai daarna `node scripts/build-install.mjs` (of push naar main) om install.html bij te werken vóór je lokaal opnieuw test.