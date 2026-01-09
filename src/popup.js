let filesToDownload = [];

document.addEventListener('DOMContentLoaded', async () => {
    const statusEl = document.getElementById('status');
    const btn = document.getElementById('downloadBtn');

    try {
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Send message to content script
        if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'GET_FILES' }, (response) => {
                if (chrome.runtime.lastError) {
                    statusEl.innerText = "No script found. Refresh the page?";
                    return;
                }

                if (response && response.files) {
                    filesToDownload = response.files;
                    const count = filesToDownload.length;
                    statusEl.innerText = `${count} file(s) found`;

                    if (count > 0) {
                        btn.disabled = false;
                        btn.innerText = `Download All (${count})`;
                    } else {
                        btn.innerText = "Download All";
                    }
                } else {
                    statusEl.innerText = "No files found.";
                }
            });
        }
    } catch (err) {
        statusEl.innerText = "Error scanning page.";
        console.error(err);
    }

    // Load saved convention
    const conventionSelect = document.getElementById('namingConvention');
    const savedConvention = localStorage.getItem('namingConvention');
    if (savedConvention) {
        conventionSelect.value = savedConvention;
    }

    // Save preference on change
    conventionSelect.addEventListener('change', () => {
        localStorage.setItem('namingConvention', conventionSelect.value);
    });

    // Helper to extract extension
    function getExtension(filename) {
        if (!filename) return '';
        const parts = filename.split('.');
        if (parts.length > 1) return '.' + parts.pop();
        return '';
    }

    // Helper to construct filename
    function constructFilename(fileObj, convention) {
        // If no student info (or incomplete), fallback to safe default
        // The content script already provides a 'filename' which is the default (Last First - Orig)
        // or just Original if no student found.
        if (!fileObj.student || (!fileObj.student.firstName && !fileObj.student.lastName)) {
            // Fallback: use default filename from content script (which is usually original or fallback formatted)
            // But we should try to respect 'original' if explicitly requested even if no student info found?
            // Actually if no student info, we can't do the other formats.
            // If the user wants 'original', we should just give 'originalFilename'.
            // If the user wants 'First Last', but we don't have it, we fall back to 'filename' (which is likely original).

            let name = convention === 'original' ? fileObj.originalFilename : fileObj.filename;
            return name.trim().replace(/[<>:"/\\|?*]/g, '_');
        }

        const s = fileObj.student;
        const orig = fileObj.originalFilename || 'download.bin';
        const ext = getExtension(orig);
        const attemptSuffix = s.attempt > 1 ? `_poging${s.attempt}` : '';

        let base = "";

        switch (convention) {
            case 'original':
                base = orig;
                break;

            case 'first_last_orig':
                // "Voornaam Achternaam - Origineel bestand"
                base = `${s.firstName} ${s.lastName}${attemptSuffix} - ${orig}`;
                break;

            case 'last_first_ext':
                // "Achternaam Voornaam . extensie"
                base = `${s.lastName} ${s.firstName}${attemptSuffix}${ext}`;
                break;

            case 'first_last_ext':
                // "Voornaam Achternaam . extensie"
                base = `${s.firstName} ${s.lastName}${attemptSuffix}${ext}`;
                break;

            case 'last_first_orig':
            default:
                // "Achternaam Voornaam - Origineel bestand"
                base = `${s.lastName} ${s.firstName}${attemptSuffix} - ${orig}`;
                break;
        }

        // Sanitize
        return base.trim().replace(/[<>:"/\\|?*]/g, '_');
    }

    btn.addEventListener('click', () => {
        if (filesToDownload.length > 0) {

            // Warning for large batches
            if (filesToDownload.length > 5) {
                const message = "OPGELET: Je staat op het punt meer dan 5 bestanden te downloaden.\n\n" +
                    "Ben je zeker dat je wilt doorgaan?\n\n" +
                    "1. Dit proces kan NIET gestopt worden eens gestart.\n" +
                    "2. Indien je 'automatische downloads' niet hebt aanstaan in je browser instellingen, " +
                    "zal je voor ELK bestand manueel moeten bevestigen.";

                if (!confirm(message)) {
                    return;
                }
            }

            const convention = conventionSelect.value;

            // Map files to new structure with updated filenames
            const finalFiles = filesToDownload.map(f => ({
                url: f.url,
                filename: constructFilename(f, convention)
            }));

            chrome.runtime.sendMessage({
                type: 'DOWNLOAD_FILES',
                files: finalFiles
            });
            // window.close(); // Close popup
        }
    });

    document.getElementById('helpLink').addEventListener('click', (e) => {
        e.preventDefault();
        const help = document.getElementById('helpContent');
        help.style.display = help.style.display === 'none' ? 'block' : 'none';

        // Adjust body width if help is open to accommodate text
        document.body.style.width = help.style.display === 'block' ? '300px' : '200px';
    });
});
