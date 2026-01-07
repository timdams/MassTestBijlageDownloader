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

    // Core logic ported from content.js
    function getFiles() {
        const links = Array.from(document.querySelectorAll('a[href]'));
        const fileLinks = links.filter(link => link.href.includes('forcedownload=1'));

        return fileLinks.map(link => {
            let filename = null;
            let originalFilename = link.innerText.trim();

            if (!originalFilename) {
                try {
                    const urlObj = new URL(link.href);
                    const pathname = urlObj.pathname;
                    originalFilename = pathname.substring(pathname.lastIndexOf('/') + 1);
                } catch (e) {
                    originalFilename = 'download.bin';
                }
            }

            try {
                const questionDiv = link.closest('.que');
                if (questionDiv) {
                    let infoHeader = questionDiv.previousElementSibling;
                    while (infoHeader && infoHeader.tagName !== 'H4') {
                        infoHeader = infoHeader.previousElementSibling;
                    }

                    if (infoHeader && infoHeader.tagName === 'H4') {
                        const text = infoHeader.innerText;
                        const match = text.match(/voor\s+(.+?)\s+\(/);
                        if (match && match[1]) {
                            let fullName = match[1].trim();
                            const firstSpaceIdx = fullName.indexOf(' ');
                            if (firstSpaceIdx > 0) {
                                const firstName = fullName.substring(0, firstSpaceIdx);
                                const lastName = fullName.substring(firstSpaceIdx + 1);
                                fullName = `${lastName} ${firstName}`;
                            }
                            const sanitizedStudentName = fullName.trim().replace(/[^a-z0-9 áéíóúäëïöüñç-]/gi, '_');
                            filename = `${sanitizedStudentName}_${originalFilename}`;
                        }
                    }
                }
            } catch (e) {
                console.error("Error parsing student name", e);
            }

            if (!filename) {
                filename = originalFilename;
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
