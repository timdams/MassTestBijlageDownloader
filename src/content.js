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
          // Also handles cases without "Pogingnummer" if they exist, though prompt implies it's standard.
          // Capture groups: 1=AttemptNumber, 2=FullName, 3=Email
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
            // e.g. "ayub.ahmednur" -> "ayub"
            const emailParts = emailUserClean.split('.');
            // If no dot, entire thing is first name (unlikely for student mails, but safe fallback)
            let emailFirst = emailParts[0];
            // Normalize for comparison: remove dashes, underscores, lowercase
            const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
            const targetFirstDiff = normalize(emailFirst);

            // 2. Tokenize Full Name
            const nameTokens = fullNameClean.split(/\s+/);

            let firstName = "";
            let lastName = "";
            let splitIndex = -1;

            // 3. Find split index
            // Accumulate tokens until they match the emailFirst
            // e.g. [Syrielle, Wendy, Ditie, Bessondi] -> "SyrielleWendy" matches "syriellewendy"
            let accumulated = "";
            for (let i = 0; i < nameTokens.length; i++) {
              accumulated += nameTokens[i];
              if (normalize(accumulated) === targetFirstDiff) {
                splitIndex = i + 1; // Split after this token
                break;
              }
            }

            if (splitIndex !== -1) {
              firstName = nameTokens.slice(0, splitIndex).join(' ');
              lastName = nameTokens.slice(splitIndex).join(' ');
            } else {
              // Fallback: Default to Last, First logic if we can't match?
              // Or just First Word = First Name.
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
            // Preserve accents! Only sanitize illegal chars.
            let builder = `${lastName} ${firstName}`;
            builder = builder.trim();

            // Append attempt if > 1 (e.g. "_poging2") to ensure uniqueness without overwriting
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
