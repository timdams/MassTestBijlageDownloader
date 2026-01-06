# Hoe een nieuwe release uitrollen

Dit project gebruikt **GitHub Actions** om automatisch releases te maken. Telkens wanneer je een nieuwe versie tag pusht, zal GitHub automatisch een zip-bestand bouwen en dit als 'Release' publiceren.

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
