# Moodle Zip Downloader voor AP Hogeschool

Deze Chrome extensie helpt docenten om snel alle ingediende bestanden (zip, pdf, docx, ...) van een toets of opdracht te downloaden van `toets.ap.be` en `digitap.ap.be`. De bestanden worden automatisch hernoemd naar `Achternaam Voornaam_Bestandsnaam.ext`.

## Installatie

Klik hier rechts op "releases" en download de file "extension.zip".

 Volg onderstaande stappen om deze te installeren in Google Chrome (of Edge).

1.  **Uitpakken**:
    *   Klik met de rechtermuisknop op het ontvangen ZIP-bestand.
    *   Kies "Alles uitpakken..." en kies een plek op uw computer (bijvoorbeeld in Documenten). Onthoud deze map goed.

2.  **Inladen in Chrome**:
    *   Open Google Chrome.
    *   Typ in de adresbalk: `chrome://extensions` en druk op Enter.
    *   Zet rechtsboven de schakelaar **Developer mode** (Ontwikkelaarsmodus) **AAN**.
    *   Er verschijnen nieuwe knoppen. Klik linksboven op **Load unpacked** (Uitgepakte extensie laden).
    *   Blader naar de map die u in stap 1 heeft uitgepakt en selecteer deze.
    *   De extensie "Moodle Zip Downloader" staat nu in uw lijst.

## Belangrijke Configuratie (Eenmalig)

Om te zorgen dat u niet voor *elk* bestand apart op "Opslaan" moet klikken, moet u een instelling in Chrome aanpassen.

1.  Ga in Chrome naar **Instellingen** (drie puntjes rechtsboven > Instellingen).
2.  Klik in het linkermenu op **Downloads**.
3.  Zet de schakelaar **UIT** bij: *"Vragen waar elk bestand moet worden opgeslagen voor het downloaden"*.

*Soms vraagt Chrome bij het eerste gebruik toestemming om meerdere bestanden tegelijk te downloaden van `toets.ap.be` of `digitap.ap.be`. Klik dan op **Toestaan**.*

## Gebruik

Volg deze stappen om de bestanden van een toets te downloaden:

1.  Ga naar de resultatenpagina van de toets op `toets.ap.be` of `digitap.ap.be`.
2.  Kies voor **Manuele beoordeling** (bij toetsen) of bekijk de inzendingen (bij opdrachten).
3.  Klik bij de vraag die u wilt downloaden op **Beoordeel alles**.
4.  **Belangrijk**: Zoek op de pagina naar de instelling **Vragen per pagina**. Zet dit getal op het totaal aantal studenten (zodat alle inzendingen op één pagina staan) en klik op **Wijzig opties**.
5.  Klik nu rechtsboven in uw browser op het icoontje van deze extensie.
6.  U ziet hoeveel zip-bestanden er gevonden zijn. Klik op de knop **Download All**.

Alle bestanden worden nu gedownload naar uw standaard downloadmap, netjes hernoemd met de naam van de student.


## Responsible AI Disclaimer

Quasi deze hele applicatie, inclusief de github workflow en documentatie werd geschreven met behulp van **Gemini 3 PRo (High) in Antigravity**. 

Volgende prompts werden aan de start gebruikt:

* "ik wil een chrome extensie maken"
* "wanener het op pagina's van een moodle (onder toets.ap.be) test komt moet het automatisch alle bijlagen downloaden die daar als links staan. het html document in de demofolder is een voorbeeld van zo'n pagina. Het moet daar de archief (zip) bijlagen downloaden . In het voorbeeld zijn er 3 ( redacted_2023.zip, BeastMasterNinja.zip en Examenredacted_2023OOP.zip )"
* "geen automatic download starten. de gebruiker moet op de extensie klikken en een knop induwen "download all" die dan start. De extensie toont wel al via een tellertje hoeveel zips het zal downloaden als op de knop wordt geduwd"
* "Dat werkt perfect.Nu wil ik het volgende. de naam van de zip moet gebaseerd zijn op de naam van de student. In demo file heb je bijvoorbeeld voor de eerste zip "<h4>Pogingnummer 1 voor REDACTED (REDACTED.REDACTED@student.ap.be)</h4>" . de naam van de zip wordt  dan "REDACTED REDACTED.zip"
* "dat werkt goed; ik wil echter achternaam en voornaam omdraaien in de bestandsnaam. Soms heeft een student meerdere achternamen, dus plaats gewoon steeds de voornaam achteraan (dus alle voor eerste spatie) maar blijf voor de rest van de achternaam af"

enz.