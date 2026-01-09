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

            // Student metadata variables
            let firstName = "";
            let lastName = "";
            let attemptNr = 0;

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
                // Structure: <h4>Pogingnummer X voor NAAM (EMAIL)</h4>
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
                            attemptNr = parseInt(match[1], 10);
                            const fullNameClean = match[2].trim();
                            const emailFull = match[3].trim();

                            // 1. Parse Email to find split point
                            const emailUser = emailFull.split('@')[0];
                            // Remove trailing digits
                            const emailUserClean = emailUser.replace(/\d+$/, '');

                            // Assume first part of email before dot is the "first name"
                            const emailParts = emailUserClean.split('.');
                            let emailFirst = emailParts[0];

                            // Normalize for comparison
                            const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
                            const targetFirstDiff = normalize(emailFirst);

                            // 2. Tokenize Full Name
                            const nameTokens = fullNameClean.split(/\s+/);

                            let splitIndex = -1;
                            // Accumulate tokens until they match the emailFirst
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
                        }
                    }
                }
            } catch (e) {
                console.error("Error parsing student name", e);
            }

            // Return rich object
            return {
                url: link.href,
                originalFilename: originalFilename,
                student: {
                    firstName: firstName,
                    lastName: lastName,
                    attempt: attemptNr
                }
            };
        });
    }

    // --- FILENAME CONSTRUCTION LOGIC ---
    function getExtension(filename) {
        if (!filename) return '';
        const parts = filename.split('.');
        if (parts.length > 1) return '.' + parts.pop();
        return '';
    }

    function constructFilename(fileObj, convention) {
        // Safe defaults if student info missing
        const s = fileObj.student;
        const orig = fileObj.originalFilename || 'download.bin';

        if (!s || (!s.firstName && !s.lastName)) {
            // Respect 'original' preference if possible, else default
            let name = convention === 'original' ? orig : (orig); // Fallback to orig
            return name.trim().replace(/[<>:"/\\|?*]/g, '_');
        }

        const ext = getExtension(orig);
        const attemptSuffix = s.attempt > 1 ? `_poging${s.attempt}` : '';
        let base = "";

        switch (convention) {
            case 'original':
                base = orig;
                break;
            case 'first_last_orig':
                base = `${s.firstName} ${s.lastName}${attemptSuffix} - ${orig}`;
                break;
            case 'last_first_ext':
                base = `${s.lastName} ${s.firstName}${attemptSuffix}${ext}`;
                break;
            case 'first_last_ext':
                base = `${s.firstName} ${s.lastName}${attemptSuffix}${ext}`;
                break;
            case 'last_first_orig':
            default:
                base = `${s.lastName} ${s.firstName}${attemptSuffix} - ${orig}`;
                break;
        }

        return base.trim().replace(/[<>:"/\\|?*]/g, '_');
    }

    // --- UI CONSTRUCTION ---
    const existing = document.getElementById('mzd-overlay');
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.textContent = `
        #mzd-overlay {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 320px;
            background: white;
            border: 1px solid #ccc;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10001;
            padding: 15px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            border-radius: 8px;
            font-size: 13px;
            color: #333;
        }
        #mzd-header {
            font-weight: bold;
            font-size: 15px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #eee;
            padding-bottom: 8px;
        }
        #mzd-close { cursor: pointer; color: #999; font-size: 18px; }
        #mzd-close:hover { color: #333; }
        .mzd-row { margin-bottom: 10px; }
        .mzd-label { display: block; margin-bottom: 4px; font-weight: 500; }
        #mzd-naming {
            width: 100%;
            padding: 6px;
            border-radius: 4px;
            border: 1px solid #ccc;
        }
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
        #mzd-status { margin-top: 10px; color: #666; font-size: 12px; }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'mzd-overlay';

    // Check localStorage for saved preference
    const savedConvention = localStorage.getItem('mzd_naming_convention') || 'last_first_orig';

    overlay.innerHTML = `
        <div id="mzd-header">
            <span>Moodle Zipper</span>
            <span id="mzd-close">&times;</span>
        </div>
        <div class="mzd-row">
            <span id="mzd-count-msg">Scanning...</span>
        </div>
        <div class="mzd-row">
            <label class="mzd-label" for="mzd-naming">Bestandsnaam formaat:</label>
            <select id="mzd-naming">
                <option value="last_first_orig">Achternaam Voornaam - Origineel</option>
                <option value="first_last_orig">Voornaam Achternaam - Origineel</option>
                <option value="last_first_ext">Achternaam Voornaam . extensie</option>
                <option value="first_last_ext">Voornaam Achternaam . extensie</option>
                <option value="original">Originele bestandsnaam</option>
            </select>
        </div>
        <button id="mzd-download-btn" class="mzd-btn" disabled>Download All</button>
        <div id="mzd-status"></div>
    `;
    document.body.appendChild(overlay);

    // Elements
    const closeBtn = overlay.querySelector('#mzd-close');
    const downloadBtn = overlay.querySelector('#mzd-download-btn');
    const countMsg = overlay.querySelector('#mzd-count-msg');
    const namingSelect = overlay.querySelector('#mzd-naming');
    const statusDiv = overlay.querySelector('#mzd-status');

    // Init Select
    namingSelect.value = savedConvention;
    namingSelect.onchange = () => {
        localStorage.setItem('mzd_naming_convention', namingSelect.value);
    };

    closeBtn.onclick = () => overlay.remove();

    // Run Scan
    const filesRaw = getFiles();

    if (filesRaw.length === 0) {
        countMsg.textContent = "No '.zip' (forcedownload) files found.";
    } else {
        countMsg.textContent = `Found ${filesRaw.length} files.`;
        downloadBtn.disabled = false;
        downloadBtn.innerText = `Download All (${filesRaw.length})`;
    }

    // Download Logic
    downloadBtn.onclick = async () => {
        if (filesRaw.length > 5) {
            const msg = "OPGELET: Je staat op het punt meer dan 5 bestanden te downloaden.\n\n" +
                "Wil je doorgaan?";
            if (!confirm(msg)) return;
        }

        downloadBtn.disabled = true;
        downloadBtn.innerText = "Downloading...";

        const convention = namingSelect.value;
        let successCount = 0;

        for (let i = 0; i < filesRaw.length; i++) {
            const f = filesRaw[i];
            const finalName = constructFilename(f, convention);

            statusDiv.textContent = `Downloading ${i + 1}/${filesRaw.length}...`;

            try {
                await downloadFile(f.url, finalName);
                successCount++;
            } catch (e) {
                console.error("Download failed", e);
            }

            // Delay
            await new Promise(r => setTimeout(r, 500));
        }

        statusDiv.textContent = `Done! Sent ${successCount} files.`;
        downloadBtn.innerText = "Finished";
        setTimeout(() => { downloadBtn.disabled = false; downloadBtn.innerText = "Download Again"; }, 3000);
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
