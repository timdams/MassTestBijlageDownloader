# Hoe een nieuwe release uitrollen

Dit project gebruikt **GitHub Actions** om automatisch releases te maken. Telkens wanneer je een nieuwe versie tag pusht, zal GitHub automatisch een zip-bestand bouwen en dit als 'Release' publiceren.

> Er zijn **twee** losstaande deploy-flows:
> - **Installatiepagina + bookmarklet** → automatisch bij elke push naar `main` (geen tag nodig). Zie de volgende sectie.
> - **Chrome-extensie (zip-release)** → bij het pushen van een versie-tag. Zie "Stappenplan".

## Installatiepagina & bookmarklet (GitHub Pages)

De installatiepagina (`install.html`, live op <https://timdams.github.io/MassTestBijlageDownloader/install.html>) wordt **automatisch gepubliceerd bij elke push naar `main`** via `.github/workflows/deploy_pages.yml`. Hiervoor is **geen tag** nodig.

**Belangrijk — enige bron van waarheid:** de bookmarklet-code staat in `src/bookmarklet.js`. De workflow draait `scripts/build-install.mjs`, dat die code in `install.html` injecteert en er een versie-stempel (commitdatum + short SHA) op zet. Bewerk dus **alleen `src/bookmarklet.js`**; pas de ingesloten kopie in `install.html` nooit met de hand aan (ze wordt overschreven).

Werkwijze:

1. Pas `src/bookmarklet.js` aan, commit en push naar `main`.
2. Volg de deploy onder **Actions → Deploy to GitHub Pages** (~30 s).
3. Controleer onderaan de installatiepagina het label **"Versie &lt;datum&gt; (&lt;SHA&gt;)"**: komt de SHA overeen met je laatste commit, dan staat de nieuwste versie live (eventueel hard refreshen met Ctrl+F5).

Optioneel: draai lokaal `node scripts/build-install.mjs` om de gecommitte `install.html` mee in sync te houden — de deploy doet dit sowieso automatisch.

## Stappenplan

1.  **Code wijzigen en committen**
    Voer je wijzigingen door in de code. Commit deze zoals gewoonlijk:
    ```powershell
    git add .
    git commit -m "Beschrijving van je wijzigingen"
    git push
    ```

2.  **Versie verhogen in manifest.json** (Optioneel maar aanbevolen)
    Open `manifest.json` en verhoog het versienummer (bijv. van `"1.0"` naar `"1.1"`). Commit deze wijziging ook.

3.  **Tag aanmaken**
    Maak een git tag aan voor de nieuwe versie. Gebruik `v` gevolgd door het versienummer (bijv. `v1.1`).
    ```powershell
    git tag v1.1
    ```

4.  **Tag pushen**
    Push de tag naar GitHub. **Dit is de stap die de actie triggert.**
    ```powershell
    git push origin v1.1
    ```

## Wat gebeurt er daarna?

1.  Ga naar de GitHub repository pagina: [https://github.com/timdams/MassTestBijlageDownloader](https://github.com/timdams/MassTestBijlageDownloader)
2.  Klik bovenaan op het tabblad **Actions**. Je ziet nu dat de workflow "Publish Extension" draait.
3.  Zodra deze klaar is (groen vinkje), ga je naar de **Releases** sectie (rechts op de hoofdpagina).
4.  Daar staat je nieuwe release `v1.1` klaar, met het `extension.zip` bestand dat gebruikers kunnen downloaden.

## Test url

https://toets.ap.be/mod/quiz/report.php?id=57220&mode=grading&slot=1&qid=33917694&grade=all&pagesize=3&order=studentlastname

https://toets.ap.be/mod/quiz/report.php?id=89720&mode=grading&slot=1&qid=39427106&grade=all&pagesize=99&order=studentlastname 