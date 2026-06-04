// ==UserScript==
// @name         Moodle Zip Downloader (Hogeschool AP)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Download alle zip bijlagen van toets.ap.be en digitap.ap.be met automatische hernoeming
// @author       Antigravity
// @match        https://toets.ap.be/*
// @match        https://digitap.ap.be/*
// @grant        GM_download
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // Styles for the floating button
    GM_addStyle(`
        #moodle-zip-downloader-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            padding: 15px 20px;
            background-color: #d32f2f; /* AP Red-ish */
            color: white;
            border: none;
            border-radius: 50px;
            font-family: sans-serif;
            font-weight: bold;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: transform 0.2s, background-color 0.2s;
        }
        #moodle-zip-downloader-btn:hover {
            background-color: #b71c1c;
            transform: scale(1.05);
        }
        #moodle-zip-downloader-btn:active {
            transform: scale(0.95);
        }
        #moodle-zip-downloader-badge {
            background-color: white;
            color: #d32f2f;
            border-radius: 50%;
            padding: 2px 8px;
            margin-left: 8px;
            font-size: 0.9em;
        }
    `);

    // Split a full name into first/last using the student's email as the hint.
    // Moodle e-mails are "voornaam.achternaam@..." so the text before the first
    // dot marks where the first name ends - keeping multi-word last names
    // ("El Achaouche", "Van Nuffel") intact. Falls back to "first token = first
    // name" when there is no e-mail or accents stop it lining up.
    function splitFullName(fullNameClean, emailFull) {
        const normalize = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const nameTokens = (fullNameClean || '').split(/\s+/).filter(Boolean);
        if (nameTokens.length === 0) return { firstName: '', lastName: '' };
        if (emailFull) {
            const emailUser = emailFull.split('@')[0];
            const emailUserClean = emailUser.replace(/\d+$/, '');
            const emailFirst = emailUserClean.split('.')[0];
            const targetFirstDiff = normalize(emailFirst);
            if (targetFirstDiff) {
                let accumulated = '';
                for (let i = 0; i < nameTokens.length; i++) {
                    accumulated += nameTokens[i];
                    if (normalize(accumulated) === targetFirstDiff) {
                        return {
                            firstName: nameTokens.slice(0, i + 1).join(' '),
                            lastName: nameTokens.slice(i + 1).join(' ')
                        };
                    }
                }
            }
        }
        if (nameTokens.length > 1) {
            return { firstName: nameTokens[0], lastName: nameTokens.slice(1).join(' ') };
        }
        return { firstName: nameTokens[0], lastName: '' };
    }

    // Quiz grading report: <h4>Pogingnummer X voor NAAM (EMAIL)</h4> before a .que block.
    function parseQuizStudent(link) {
        const questionDiv = link.closest('.que');
        if (!questionDiv) return null;
        let infoHeader = questionDiv.previousElementSibling;
        while (infoHeader && infoHeader.tagName !== 'H4') {
            infoHeader = infoHeader.previousElementSibling;
        }
        if (!infoHeader || infoHeader.tagName !== 'H4') return null;
        const match = infoHeader.innerText.match(/Pogingnummer\s+(\d+)\s+voor\s+(.+?)\s+\((.+?)\)/i);
        if (!match) return null;
        const split = splitFullName(match[2].trim(), match[3].trim());
        return { firstName: split.firstName, lastName: split.lastName, attempt: parseInt(match[1], 10) };
    }

    // Assignment (mod/assign) grading table: submission link in a <tr> that also
    // holds the student's name (/user/view.php link) and e-mail.
    function parseAssignStudent(link) {
        const row = link.closest('tr');
        if (!row) return null;
        const userLink = row.querySelector('a[href*="/user/view.php"]');
        if (!userLink) return null;
        const nameClone = userLink.cloneNode(true);
        nameClone.querySelectorAll('.userinitials, .userpicture, img').forEach(el => el.remove());
        const fullName = nameClone.textContent.trim();
        if (!fullName) return null;
        let email = '';
        const emailCell = row.querySelector('td.email');
        if (emailCell) email = emailCell.textContent.trim();
        if (!email) {
            const m = row.textContent.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
            if (m) email = m[0];
        }
        const split = splitFullName(fullName, email);
        return { firstName: split.firstName, lastName: split.lastName, attempt: 0 };
    }

    function getFiles() {
        const links = Array.from(document.querySelectorAll('a[href]'));
        const fileLinks = links.filter(link => link.href.includes('forcedownload=1'));

        return fileLinks.map(link => {
            let originalFilename = link.innerText.trim();

            if (!originalFilename) {
                try {
                    const urlObj = new URL(link.href);
                    const pathname = urlObj.pathname;
                    originalFilename = decodeURIComponent(pathname.substring(pathname.lastIndexOf('/') + 1));
                } catch (e) {
                    originalFilename = 'download.bin';
                }
            }

            let filename = originalFilename;
            try {
                const student = parseQuizStudent(link) || parseAssignStudent(link);
                if (student && (student.firstName || student.lastName)) {
                    let builder = `${student.lastName} ${student.firstName}`.trim();
                    if (student.attempt > 1) builder += `_poging${student.attempt}`;
                    builder += ` - ${originalFilename}`;
                    // Preserve accents; only replace characters illegal in filenames.
                    filename = builder.replace(/[<>:"/\\|?*]/g, '_');
                }
            } catch (e) {
                console.error("Error parsing student name", e);
            }

            return {
                url: link.href,
                name: filename // GM_download uses 'name'
            };
        });
    }

    function createButton() {
        const files = getFiles();
        if (files.length === 0) return;

        const btn = document.createElement('button');
        btn.id = 'moodle-zip-downloader-btn';
        btn.innerHTML = `Download Zips <span id="moodle-zip-downloader-badge">${files.length}</span>`;
        
        btn.onclick = () => {
            if (confirm(`Ben je zeker dat je ${files.length} bestanden wil downloaden?`)) {
                files.forEach((file, index) => {
                    setTimeout(() => {
                        GM_download({
                            url: file.url,
                            name: file.name,
                            saveAs: false
                        });
                    }, index * 200); // Stagger downloads slightly to prevent browser choking
                });
            }
        };

        document.body.appendChild(btn);
    }

    // Run after page load
    window.addEventListener('load', createButton);
    // Also try immediately in case load already fired
    if (document.readyState === 'complete') {
        createButton();
    }

})();
