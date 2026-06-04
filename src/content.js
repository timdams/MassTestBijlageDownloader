// Split a full name into first/last using the student's email as the hint.
// Moodle e-mails are "voornaam.achternaam@..." so the part before the first
// dot tells us where the first name ends - which lets us keep multi-word
// last names ("El Achaouche", "Van Nuffel") intact. Falls back to
// "first token = first name" when the e-mail is missing or accented chars
// make it not line up.
function splitFullName(fullNameClean, emailFull) {
  const normalize = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const nameTokens = (fullNameClean || '').split(/\s+/).filter(Boolean);
  if (nameTokens.length === 0) return { firstName: '', lastName: '' };

  if (emailFull) {
    const emailUser = emailFull.split('@')[0];
    const emailUserClean = emailUser.replace(/\d+$/, ''); // drop trailing digits (asslaoui01 -> asslaoui)
    const emailFirst = emailUserClean.split('.')[0];
    const targetFirstDiff = normalize(emailFirst);
    if (targetFirstDiff) {
      let accumulated = '';
      for (let i = 0; i < nameTokens.length; i++) {
        accumulated += nameTokens[i];
        if (normalize(accumulated) === targetFirstDiff) {
          return {
            firstName: nameTokens.slice(0, i + 1).join(' '),
            lastName: nameTokens.slice(i + 1).join(' ')
          };
        }
      }
    }
  }

  if (nameTokens.length > 1) {
    return { firstName: nameTokens[0], lastName: nameTokens.slice(1).join(' ') };
  }
  return { firstName: nameTokens[0], lastName: '' };
}

// Quiz grading report: each attachment lives in a `.que` block preceded by an
// <h4>Pogingnummer X voor NAAM (EMAIL)</h4> header.
function parseQuizStudent(link) {
  const questionDiv = link.closest('.que');
  if (!questionDiv) return null;
  let infoHeader = questionDiv.previousElementSibling;
  while (infoHeader && infoHeader.tagName !== 'H4') {
    infoHeader = infoHeader.previousElementSibling;
  }
  if (!infoHeader || infoHeader.tagName !== 'H4') return null;
  const match = infoHeader.innerText.match(/Pogingnummer\s+(\d+)\s+voor\s+(.+?)\s+\((.+?)\)/i);
  if (!match) return null;
  const split = splitFullName(match[2].trim(), match[3].trim());
  return { firstName: split.firstName, lastName: split.lastName, attempt: parseInt(match[1], 10) };
}

// Assignment (mod/assign) grading table: each submission link sits in a <tr>
// row that also holds the student's name (a /user/view.php link) and e-mail.
function parseAssignStudent(link) {
  const row = link.closest('tr');
  if (!row) return null;
  const userLink = row.querySelector('a[href*="/user/view.php"]');
  if (!userLink) return null;
  const nameClone = userLink.cloneNode(true);
  // Strip the avatar / initials so only the name text remains.
  nameClone.querySelectorAll('.userinitials, .userpicture, img').forEach(el => el.remove());
  const fullName = nameClone.textContent.trim();
  if (!fullName) return null;
  let email = '';
  const emailCell = row.querySelector('td.email');
  if (emailCell) email = emailCell.textContent.trim();
  if (!email) {
    const m = row.textContent.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    if (m) email = m[0];
  }
  const split = splitFullName(fullName, email);
  return { firstName: split.firstName, lastName: split.lastName, attempt: 0 };
}

function getFiles() {
  // Select all anchor tags
  const links = Array.from(document.querySelectorAll('a[href]'));

  // Filter for links containing 'forcedownload=1'
  const fileLinks = links.filter(link => link.href.includes('forcedownload=1'));

  return fileLinks.map(link => {
    let originalFilename = link.innerText.trim();

    // Fallback: if innerText is empty or weird, try to extract from URL (less reliable in Moodle)
    if (!originalFilename) {
      try {
        const urlObj = new URL(link.href);
        const pathname = urlObj.pathname;
        originalFilename = decodeURIComponent(pathname.substring(pathname.lastIndexOf('/') + 1));
      } catch (e) {
        originalFilename = 'download.bin';
      }
    }

    let student = { firstName: '', lastName: '', attempt: 0 };
    try {
      const parsed = parseQuizStudent(link) || parseAssignStudent(link);
      if (parsed) student = parsed;
    } catch (e) {
      console.error("Error parsing student name", e);
    }

    // Default/fallback filename used by popup.js when no student info is found.
    // Format: "LastName FirstName - OriginalFilename" (accents preserved; only
    // illegal path chars sanitized).
    let filename = originalFilename;
    if (student.firstName || student.lastName) {
      let builder = `${student.lastName} ${student.firstName}`.trim();
      if (student.attempt > 1) builder += `_poging${student.attempt}`;
      builder += ` - ${originalFilename}`;
      filename = builder.replace(/[<>:"/\\|?*]/g, '_');
    }

    return {
      url: link.href,
      filename: filename, // Default/fallback
      originalFilename: originalFilename,
      student: student
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
