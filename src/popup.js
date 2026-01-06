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
                    statusEl.innerText = `${count} zip file(s) found`;

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

    // Handle click
    btn.addEventListener('click', () => {
        if (filesToDownload.length > 0) {
            chrome.runtime.sendMessage({
                type: 'DOWNLOAD_FILES',
                files: filesToDownload
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
