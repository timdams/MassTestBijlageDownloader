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
                // Structure: <h4>Pogingnummer X voor NAAM (EMAIL)</h4> <div class="que ..."> ... <a ...>
                const questionDiv = link.closest('.que');
                if (questionDiv) {
                    let infoHeader = questionDiv.previousElementSibling;
                    // Traverse backwards until we find an h4 or hit the start
                    while (infoHeader && infoHeader.tagName !== 'H4') {
                        infoHeader = infoHeader.previousElementSibling;
                    }

                    if (infoHeader && infoHeader.tagName === 'H4') {
                        const text = infoHeader.innerText;
                        // Regex to extract name: Look for text between "voor " and " ("
                        // Example: "Pogingnummer 1 voor Mohammed Asad (mohammed.asad01@student.ap.be)"
                        const match = text.match(/voor\s+(.+?)\s+\(/);
                        if (match && match[1]) {
                            let fullName = match[1].trim();
                            // Swap firstname (first word) to the end
                            const firstSpaceIdx = fullName.indexOf(' ');
                            if (firstSpaceIdx > 0) {
                                const firstName = fullName.substring(0, firstSpaceIdx);
                                const lastName = fullName.substring(firstSpaceIdx + 1);
                                fullName = `${lastName} ${firstName}`;
                            }

                            // Sanitize student name
                            const sanitizedStudentName = fullName.trim().replace(/[^a-z0-9 áéíóúäëïöüñç-]/gi, '_');

                            // Construct new filename: StudentName_OriginalFilename
                            filename = `${sanitizedStudentName}_${originalFilename}`;
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
