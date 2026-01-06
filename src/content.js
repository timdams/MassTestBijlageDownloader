function getZipLinks() {
  // Select all anchor tags
  const links = Array.from(document.querySelectorAll('a[href]'));

  // Filter for .zip in the href
  const zipLinks = links.filter(link => link.href.toLowerCase().includes('.zip'));

  return zipLinks.map(link => {
    let filename = null;
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
            // Sanitize filename
            filename = match[1].trim().replace(/[^a-z0-9 áéíóúäëïöüñç-]/gi, '_') + '.zip';
          }
        }
      }
    } catch (e) {
      console.error("Error parsing student name", e);
    }

    return {
      url: link.href,
      filename: filename // Can be null, background script should handle fallback
    };
  });
}

// Function to update the badge via background script
function updateBadge() {
  const zips = getZipLinks();
  chrome.runtime.sendMessage({
    type: 'UPDATE_COUNT',
    count: zips.length
  });
}

// Run on load
updateBadge();

// Listen for messages (e.g. from popup)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_FILES') {
    sendResponse({
      files: getZipLinks()
    });
  }
  return true; // Keep channel open
});
