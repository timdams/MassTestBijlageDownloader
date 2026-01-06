chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'UPDATE_COUNT') {
        if (sender.tab) {
            const text = request.count > 0 ? request.count.toString() : '';
            chrome.action.setBadgeText({
                text: text,
                tabId: sender.tab.id
            });
            chrome.action.setBadgeBackgroundColor({
                color: '#2196F3', // Blue-ish
                tabId: sender.tab.id
            });
        }
    } else if (request.type === 'DOWNLOAD_FILES') {
        request.files.forEach((file) => {
            chrome.downloads.download({
                url: file.url,
                filename: file.filename || undefined, // Use parsed filename or let Chrome decide
                saveAs: false,
                conflictAction: 'uniquify'
            });
        });
    }
});
