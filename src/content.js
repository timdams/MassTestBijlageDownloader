function getFiles() {
  // Select all anchor tags
  const links = Array.from(document.querySelectorAll('a[href]'));

  // Filter for links containing 'forcedownload=1'
  const fileLinks = links.filter(link => link.href.includes('forcedownload=1'));

  return fileLinks.map(link => {
    let filename = null;
    let originalFilename = link.innerText.trim();

    // Fallback: if innerText is empty or weird, try to extract from URL (less reliable in Moodle)
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

// Function to update the badge via background script
function updateBadge() {
  const files = getFiles();
  chrome.runtime.sendMessage({
    type: 'UPDATE_COUNT',
    count: files.length
  });
}

// Run on load
updateBadge();

// Listen for messages (e.g. from popup)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_FILES') {
    sendResponse({
      files: getFiles()
    });
  }
  return true; // Keep channel open
});
