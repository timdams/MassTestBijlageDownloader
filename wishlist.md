# Wishlist & Future Improvements

## 1. Functionele Uitbreidingen
* [ ] **Selectieve Downloads:** Lijst tonen in popup met checkboxen om specifieke bestanden te kunnen (de)selecteren voor download.
* [x] **Meer bestandsformaten:** Alle bestanden met `forcedownload=1` worden nu gedownload, ongeacht de extensie.
* [ ] **Unzip functionaliteit:**  Mogelijkheid onderzoeken om zips direct uit te pakken (bijv. met JSZip) en als mappenstructuur op te slaan.
* [ ] **Submappen structuur:** Downloads organiseren in submappen, bijv. `Downloads/Toetsen/[Datum]/[StudentNaam]/`.

## 2. Robuustheid & Flexibiliteit
* [ ] **Configurable Selectors/Regex:** De huidige naamherkenning (hardcoded op specifieke HTML structuur en NL taal) flexibel maken via instellingen.
* [ ] **Foutrapportage:** Feedback in de UI wanneer het hernoemen/herkennen van een student mislukt.
* [ ] **Bestandsgrootte checks:** Waarschuwing of check (via HEAD request) voor zeer grote bestanden.

## 3. Gebruikersinterface (UI/UX)
* [ ] **Dark Mode:** Thema ondersteuning voor de popup.

## 4. Technische Kwaliteit
* [ ] **TypeScript Migratie:** Codebase omzetten naar TypeScript voor betere type-safety end onderhoudbaarheid.
* [ ] **Cross-Browser Support:** Compatibiliteit verifiëren en fixen voor Firefox/Edge.

## 5. Directe 'Next Steps'
* [ ] **Opties Pagina (Settings):** Een settings pagina toevoegen voor het beheren van bovenstaande voorkeuren (extensies, mapstructuur, naamgeving).
