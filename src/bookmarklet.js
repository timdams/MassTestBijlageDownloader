/**
 * Moodle Zip Downloader - Bookmarklet Version
 * Scans the page for 'forcedownload=1' links and allows downloading them.
 */
(function () {
    console.log('Initializing Moodle Zip Downloader Bookmarklet...');

    // --- LOGIC FROM content.js ---
    function getFiles() {
        // Select all anchor tags
        const links = Array.from(document.querySelectorAll('a[href]'));

        // Filter for links containing 'forcedownload=1'
        const fileLinks = links.filter(link => link.href.includes('forcedownload=1'));

        return fileLinks.map(link => {
            let filename = null;
            let originalFilename = link.innerText.trim();

            // Fallback: if innerText is empty or weird, try to extract from URL
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
                // Attempt to find the student name header
                const questionDiv = link.closest('.que');
                if (questionDiv) {
                    let infoHeader = questionDiv.previousElementSibling;
                    // Traverse backwards until we find an h4 or hit the start
                    while (infoHeader && infoHeader.tagName !== 'H4') {
                        infoHeader = infoHeader.previousElementSibling;
                    }

                    if (infoHeader && infoHeader.tagName === 'H4') {
                        const text = infoHeader.innerText;
                        // Regex to extract attempt (optional), name, and email
                        // Matches: "Pogingnummer 1 voor First Last (first.last@domain.com)"
                        const match = text.match(/Pogingnummer\s+(\d+)\s+voor\s+(.+?)\s+\((.+?)\)/i);

                        if (match) {
                            const attemptNr = parseInt(match[1], 10);
                            const fullNameClean = match[2].trim();
                            const emailFull = match[3].trim();

                            // 1. Parse Email to find split point
                            const emailUser = emailFull.split('@')[0];
                            // Remove trailing digits (e.g. asslaoui01 -> asslaoui)
                            const emailUserClean = emailUser.replace(/\d+$/, '');

                            // Assume first part of email before dot is the "first name" representation
                            const emailParts = emailUserClean.split('.');
                            let emailFirst = emailParts[0];

                            // Normalize for comparison
                            const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
                            const targetFirstDiff = normalize(emailFirst);

                            // 2. Tokenize Full Name
                            const nameTokens = fullNameClean.split(/\s+/);

                            let firstName = "";
                            let lastName = "";
                            let splitIndex = -1;

                            // 3. Find split index
                            let accumulated = "";
                            for (let i = 0; i < nameTokens.length; i++) {
                                accumulated += nameTokens[i];
                                if (normalize(accumulated) === targetFirstDiff) {
                                    splitIndex = i + 1;
                                    break;
                                }
                            }

                            if (splitIndex !== -1) {
                                firstName = nameTokens.slice(0, splitIndex).join(' ');
                                lastName = nameTokens.slice(splitIndex).join(' ');
                            } else {
                                // Fallback
                                if (nameTokens.length > 1) {
                                    firstName = nameTokens[0];
                                    lastName = nameTokens.slice(1).join(' ');
                                } else {
                                    firstName = fullNameClean;
                                    lastName = "";
                                }
                            }

                            // 4. Construct Filename
                            // Format: LastName FirstName - OriginalFilename
                            let builder = `${lastName} ${firstName}`;
                            builder = builder.trim();

                            if (attemptNr > 1) {
                                builder += `_poging${attemptNr}`;
                            }

                            builder += ` - ${originalFilename}`;

                            // Sanitize: Only replace < > : " / \ | ? *
                            filename = builder.replace(/[<>:"/\\|?*]/g, '_');
                        }
                    }
                }
            } catch (e) {
                console.error("Error parsing student name", e);
            }

            // If we couldn't find a student name, fall back to the original filename
            if (!filename) {
                filename = originalFilename;
            }

            return {
                url: link.href,
                filename: filename
            };
        });
    }

    // --- UI CONSTRUCTION ---
    // Remove existing if any
    const existing = document.getElementById('mzd-overlay');
    if (existing) existing.remove();

    // Styles
    const style = document.createElement('style');
    style.textContent = `
        #mzd-overlay {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            background: white;
            border: 1px solid #ccc;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10001;
            padding: 20px;
            font-family: sans-serif;
            border-radius: 8px;
            font-size: 14px;
        }
        #mzd-header {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
        }
        #mzd-close { cursor: pointer; color: #999; }
        #mzd-close:hover { color: #333; }
        .mzd-btn {
            background: #2563eb;
            color: white;
            border: none;
            padding: 10px;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
            margin-top: 10px;
            font-weight: bold;
        }
        .mzd-btn:disabled { background: #ccc; cursor: not-allowed; }
        #mzd-status { margin-top: 10px; color: #666; }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'mzd-overlay';
    overlay.innerHTML = `
        <div id="mzd-header">
            <span>Moodle Zipper</span>
            <span id="mzd-close">&times;</span>
        </div>
        <div id="mzd-content">
            Scanning files...
        </div>
        <button id="mzd-download-btn" class="mzd-btn" disabled>Download All</button>
        <div id="mzd-status"></div>
    `;
    document.body.appendChild(overlay);

    // Event Listeners
    overlay.querySelector('#mzd-close').onclick = () => overlay.remove();
    const btn = overlay.querySelector('#mzd-download-btn');
    const content = overlay.querySelector('#mzd-content');
    const status = overlay.querySelector('#mzd-status');

    // Run Scan
    const files = getFiles();

    if (files.length === 0) {
        content.textContent = "No '.zip' (forcedownload) files found.";
    } else {
        content.textContent = `Found ${files.length} files.`;
        btn.disabled = false;
        btn.innerText = `Download All (${files.length})`;
    }

    // Download Logic
    btn.onclick = async () => {
        if (files.length > 5) {
            const msg = "OPGELET: Je staat op het punt meer dan 5 bestanden te downloaden.\n\n" +
                "Browser settings kunnen vragen om bevestiging voor elk bestand.\n\n" +
                "Wil je doorgaan?";
            if (!confirm(msg)) return;
        }

        btn.disabled = true;
        btn.innerText = "Downloading...";

        let successCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            status.textContent = `Downloading ${i + 1}/${files.length}...`;

            try {
                await downloadFile(file.url, file.filename);
                successCount++;
            } catch (e) {
                console.error("Download failed", e);
            }

            // Add delay to prevent browser blocking
            await new Promise(r => setTimeout(r, 500));
        }

        status.textContent = `Done! Sent ${successCount} files.`;
        btn.innerText = "Finished";
        setTimeout(() => { btn.disabled = false; btn.innerText = "Download Again"; }, 3000);
    };

    function downloadFile(url, filename) {
        return new Promise((resolve) => {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                resolve();
            }, 100);
        });
    }

})();
