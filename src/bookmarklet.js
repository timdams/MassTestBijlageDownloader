/**
 * Moodle Toolkit - Bookmarklet
 *
 * Two modules under one overlay (tab-switched):
 *   1. DOWNLOADER  - scans the page for 'forcedownload=1' links and downloads
 *                    them with a configurable naming convention.
 *   2. GROUP_ADDER - on a Moodle "Groepen: Gebruikers toevoegen/verwijderen"
 *                    page, accepts a plain list of student names, matches them
 *                    against the course-roster (addselect / removeselect) and
 *                    adds the selected ones in one POST request.
 *
 * Notes for maintainers:
 *  - The install.html "minifier" strips lines containing `//`. Avoid `//` inside
 *    string literals (e.g. URLs) - use `window.location.href` etc. instead.
 *  - Use block comments only where comments are wanted to survive minification
 *    (they don't survive either after `\s+` collapse, but they don't break it).
 */
(function () {
    'use strict';

    /* ============================================================
     * SHARED HELPERS
     * ============================================================ */

    function normalizeName(s) {
        return (s || '')
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9 ]+/g, ' ')
            .trim()
            .replace(/\s+/g, ' ');
    }

    function reverseFirstToken(normalized) {
        const tokens = normalized.split(' ');
        if (tokens.length < 2) return normalized;
        return tokens.slice(1).join(' ') + ' ' + tokens[0];
    }

    function reverseLastToken(normalized) {
        const tokens = normalized.split(' ');
        if (tokens.length < 2) return normalized;
        return tokens[tokens.length - 1] + ' ' + tokens.slice(0, -1).join(' ');
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
        });
    }

    function levenshtein(a, b) {
        if (a === b) return 0;
        const m = a.length, n = b.length;
        if (!m) return n;
        if (!n) return m;
        let prev = new Array(n + 1);
        let curr = new Array(n + 1);
        for (let j = 0; j <= n; j++) prev[j] = j;
        for (let i = 1; i <= m; i++) {
            curr[0] = i;
            const ai = a.charCodeAt(i - 1);
            for (let j = 1; j <= n; j++) {
                const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
                let v = prev[j - 1] + cost;
                if (prev[j] + 1 < v) v = prev[j] + 1;
                if (curr[j - 1] + 1 < v) v = curr[j - 1] + 1;
                curr[j] = v;
            }
            const t = prev; prev = curr; curr = t;
        }
        return prev[n];
    }

    function nameDistance(inputNorm, candidateName) {
        const candidateNorm = normalizeName(candidateName);
        if (!candidateNorm) return Infinity;
        let best = levenshtein(inputNorm, candidateNorm);
        if (best === 0) return 0;
        const r1 = reverseFirstToken(candidateNorm);
        if (r1 !== candidateNorm) {
            const d = levenshtein(inputNorm, r1);
            if (d < best) best = d;
        }
        const r2 = reverseLastToken(candidateNorm);
        if (r2 !== candidateNorm && r2 !== r1) {
            const d = levenshtein(inputNorm, r2);
            if (d < best) best = d;
        }
        return best;
    }

    /* ============================================================
     * DOWNLOADER MODULE
     * ============================================================ */

    const Downloader = (function () {
        function getFiles() {
            const links = Array.from(document.querySelectorAll('a[href]'));
            const fileLinks = links.filter(function (link) {
                return link.href.indexOf('forcedownload=1') !== -1;
            });

            return fileLinks.map(function (link) {
                let originalFilename = link.innerText.trim();
                let firstName = '';
                let lastName = '';
                let attemptNr = 0;

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
                    const questionDiv = link.closest('.que');
                    if (questionDiv) {
                        let infoHeader = questionDiv.previousElementSibling;
                        while (infoHeader && infoHeader.tagName !== 'H4') {
                            infoHeader = infoHeader.previousElementSibling;
                        }
                        if (infoHeader && infoHeader.tagName === 'H4') {
                            const text = infoHeader.innerText;
                            const match = text.match(/Pogingnummer\s+(\d+)\s+voor\s+(.+?)\s+\((.+?)\)/i);
                            if (match) {
                                attemptNr = parseInt(match[1], 10);
                                const fullNameClean = match[2].trim();
                                const emailFull = match[3].trim();
                                const emailUser = emailFull.split('@')[0];
                                const emailUserClean = emailUser.replace(/\d+$/, '');
                                const emailParts = emailUserClean.split('.');
                                const emailFirst = emailParts[0];
                                const norm = function (str) { return str.toLowerCase().replace(/[^a-z0-9]/g, ''); };
                                const targetFirstDiff = norm(emailFirst);
                                const nameTokens = fullNameClean.split(/\s+/);
                                let splitIndex = -1;
                                let accumulated = '';
                                for (let i = 0; i < nameTokens.length; i++) {
                                    accumulated += nameTokens[i];
                                    if (norm(accumulated) === targetFirstDiff) {
                                        splitIndex = i + 1;
                                        break;
                                    }
                                }
                                if (splitIndex !== -1) {
                                    firstName = nameTokens.slice(0, splitIndex).join(' ');
                                    lastName = nameTokens.slice(splitIndex).join(' ');
                                } else if (nameTokens.length > 1) {
                                    firstName = nameTokens[0];
                                    lastName = nameTokens.slice(1).join(' ');
                                } else {
                                    firstName = fullNameClean;
                                    lastName = '';
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error parsing student name', e);
                }

                return {
                    url: link.href,
                    originalFilename: originalFilename,
                    student: { firstName: firstName, lastName: lastName, attempt: attemptNr }
                };
            });
        }

        function getExtension(filename) {
            if (!filename) return '';
            const parts = filename.split('.');
            if (parts.length > 1) return '.' + parts.pop();
            return '';
        }

        function constructFilename(fileObj, convention) {
            const s = fileObj.student;
            const orig = fileObj.originalFilename || 'download.bin';
            if (!s || (!s.firstName && !s.lastName)) {
                return orig.trim().replace(/[<>:"/\\|?*]/g, '_');
            }
            const ext = getExtension(orig);
            const attemptSuffix = s.attempt > 1 ? ('_poging' + s.attempt) : '';
            let base = '';
            switch (convention) {
                case 'original':
                    base = orig; break;
                case 'first_last_orig':
                    base = s.firstName + ' ' + s.lastName + attemptSuffix + ' - ' + orig; break;
                case 'last_first_ext':
                    base = s.lastName + ' ' + s.firstName + attemptSuffix + ext; break;
                case 'first_last_ext':
                    base = s.firstName + ' ' + s.lastName + attemptSuffix + ext; break;
                case 'last_first_orig':
                default:
                    base = s.lastName + ' ' + s.firstName + attemptSuffix + ' - ' + orig; break;
            }
            return base.trim().replace(/[<>:"/\\|?*]/g, '_');
        }

        async function downloadFile(url, filename) {
            /* Fetch as blob so Moodle's Content-Disposition header does not
             * override the chosen filename. A direct <a download> against
             * pluginfile.php is ignored by the browser when the response
             * carries Content-Disposition: attachment; filename="...". */
            const resp = await fetch(url, { credentials: 'same-origin' });
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
            }, 100);
        }

        function render(rootEl) {
            const savedConvention = localStorage.getItem('mzd_naming_convention') || 'last_first_orig';
            rootEl.innerHTML =
                '<div class="mzd-row"><span id="mzd-count-msg">Scanning...</span></div>' +
                '<div class="mzd-row">' +
                '  <label class="mzd-label" for="mzd-naming">Bestandsnaam formaat:</label>' +
                '  <select id="mzd-naming">' +
                '    <option value="last_first_orig">Achternaam Voornaam - Origineel</option>' +
                '    <option value="first_last_orig">Voornaam Achternaam - Origineel</option>' +
                '    <option value="last_first_ext">Achternaam Voornaam . extensie</option>' +
                '    <option value="first_last_ext">Voornaam Achternaam . extensie</option>' +
                '    <option value="original">Originele bestandsnaam</option>' +
                '  </select>' +
                '</div>' +
                '<button id="mzd-download-btn" class="mzd-btn" disabled>Download All</button>' +
                '<div id="mzd-status"></div>';

            const downloadBtn = rootEl.querySelector('#mzd-download-btn');
            const countMsg = rootEl.querySelector('#mzd-count-msg');
            const namingSelect = rootEl.querySelector('#mzd-naming');
            const statusDiv = rootEl.querySelector('#mzd-status');

            namingSelect.value = savedConvention;
            namingSelect.onchange = function () {
                localStorage.setItem('mzd_naming_convention', namingSelect.value);
            };

            const filesRaw = getFiles();
            if (filesRaw.length === 0) {
                countMsg.textContent = 'Geen forcedownload bestanden gevonden op deze pagina.';
            } else {
                countMsg.textContent = filesRaw.length + ' bestanden gevonden.';
                downloadBtn.disabled = false;
                downloadBtn.innerText = 'Download All (' + filesRaw.length + ')';
            }

            downloadBtn.onclick = async function () {
                if (filesRaw.length > 5) {
                    const msg = 'OPGELET: Je staat op het punt meer dan 5 bestanden te downloaden.\n\nWil je doorgaan?';
                    if (!confirm(msg)) return;
                }
                downloadBtn.disabled = true;
                downloadBtn.innerText = 'Downloading...';
                const convention = namingSelect.value;
                let successCount = 0;
                for (let i = 0; i < filesRaw.length; i++) {
                    const f = filesRaw[i];
                    const finalName = constructFilename(f, convention);
                    statusDiv.textContent = 'Downloading ' + (i + 1) + '/' + filesRaw.length + '...';
                    try {
                        await downloadFile(f.url, finalName);
                        successCount++;
                    } catch (e) {
                        console.error('Download failed', e);
                    }
                    await new Promise(function (r) { setTimeout(r, 500); });
                }
                statusDiv.textContent = 'Klaar! ' + successCount + ' bestanden verstuurd.';
                downloadBtn.innerText = 'Finished';
                setTimeout(function () {
                    downloadBtn.disabled = false;
                    downloadBtn.innerText = 'Download Again';
                }, 3000);
            };
        }

        return { render: render };
    })();

    /* ============================================================
     * GROUP_ADDER MODULE
     * ============================================================ */

    const GroupAdder = (function () {

        function parseInputLines(text) {
            return text
                .split(/[\r\n]+/)
                .map(function (s) { return s.replace(/\s+/g, ' ').replace(/^[\s,]+|[\s,]+$/g, ''); })
                .filter(Boolean);
        }

        function findSelectorId(selectName) {
            const scripts = document.querySelectorAll('script');
            const re = new RegExp('init_user_selector\\s*\\(\\s*[^,]+,\\s*"' + selectName + '"\\s*,\\s*"([a-zA-Z0-9]+)"');
            for (const s of scripts) {
                const m = (s.textContent || '').match(re);
                if (m) return m[1];
            }
            return null;
        }

        function extractUsers(data) {
            const users = [];
            const seen = new Set();
            function add(u) {
                if (!u || u.id === undefined || u.id === null) return;
                const id = String(u.id);
                if (seen.has(id)) return;
                seen.add(id);
                const text = (u.name || u.fullname || '').toString();
                const m = text.match(/^(.+?)\s+\(([^()]+@[^()]+)\)/);
                users.push({
                    id: id,
                    name: m ? m[1].trim() : text.trim(),
                    email: m ? m[2].trim() : (u.extrafields || u.email || '').toString()
                });
            }
            function walk(node) {
                if (!node) return;
                if (Array.isArray(node)) {
                    for (const item of node) walk(item);
                    return;
                }
                if (typeof node !== 'object') return;
                if (node.id !== undefined && (node.name !== undefined || node.fullname !== undefined)) {
                    add(node);
                    return;
                }
                for (const key of Object.keys(node)) {
                    walk(node[key]);
                }
            }
            walk(data);
            return users;
        }

        async function searchUsers(query, selectorid, sesskey) {
            const body = new URLSearchParams();
            body.set('selectorid', selectorid);
            body.set('sesskey', sesskey);
            body.set('search', query);
            body.set('userselector_searchtype', '0');
            const url = window.location.origin + '/user/selector/search.php';
            const resp = await fetch(url, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': '*/*'
                },
                body: body.toString()
            });
            if (!resp.ok) throw new Error('Zoek-API status ' + resp.status);
            const text = await resp.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('Onverwacht zoek-response (geen JSON):', text.slice(0, 500));
                throw new Error('Zoek-API gaf geen JSON terug');
            }
            return extractUsers(data);
        }

        function pickSearchTerm(line) {
            const norm = normalizeName(line);
            if (!norm) return '';
            const tokens = norm.split(' ').filter(function (t) { return t.length >= 2; });
            if (tokens.length === 0) return norm.slice(0, 4);
            let best = tokens[0];
            for (const t of tokens) if (t.length > best.length) best = t;
            return best;
        }

        function nameMatches(inputLine, candidate) {
            const inputNorm = normalizeName(inputLine);
            if (!inputNorm) return false;
            const lower = inputLine.trim().toLowerCase();
            if (candidate.email && candidate.email.toLowerCase() === lower) return true;
            const candNorm = normalizeName(candidate.name);
            if (!candNorm) return false;
            if (candNorm === inputNorm) return true;
            if (reverseFirstToken(candNorm) === inputNorm) return true;
            if (reverseLastToken(candNorm) === inputNorm) return true;
            return false;
        }

        async function classifyOne(line, addSelectorId, removeSelectorId, sesskey) {
            const inputNorm = normalizeName(line);
            if (!inputNorm) return { type: 'notFound', input: line };
            const term = pickSearchTerm(line);
            if (!term) return { type: 'notFound', input: line };

            let addResults = [];
            let remResults = [];
            try {
                const promises = [searchUsers(term, addSelectorId, sesskey)];
                if (removeSelectorId) promises.push(searchUsers(term, removeSelectorId, sesskey));
                const settled = await Promise.all(promises);
                addResults = settled[0] || [];
                remResults = settled[1] || [];
            } catch (e) {
                return { type: 'error', input: line, error: e.message };
            }
            const addMatches = addResults.filter(function (u) { return nameMatches(line, u); });
            const remMatches = remResults.filter(function (u) { return nameMatches(line, u); });
            if (addMatches.length === 1) return { type: 'found', input: line, match: addMatches[0] };
            if (addMatches.length > 1) return { type: 'ambiguous', input: line, matches: addMatches };
            if (remMatches.length > 0) return { type: 'alreadyMember', input: line, match: remMatches[0] };

            if (term.length >= 5) {
                const shortTerm = term.slice(0, 4);
                try {
                    const more = await searchUsers(shortTerm, addSelectorId, sesskey);
                    const seen = new Set(addResults.map(function (u) { return u.id; }));
                    for (const u of more) if (!seen.has(u.id)) addResults.push(u);
                } catch (e) { /* tolerate broader-search failure */ }
            }

            const threshold = Math.max(2, Math.min(4, Math.ceil(inputNorm.length * 0.25)));
            const scored = addResults
                .map(function (u) { return { user: u, dist: nameDistance(inputNorm, u.name) }; })
                .filter(function (c) { return c.dist <= threshold; })
                .sort(function (a, b) { return a.dist - b.dist; });

            if (scored.length > 0) {
                return {
                    type: 'fuzzyMatch',
                    input: line,
                    match: scored[0].user,
                    dist: scored[0].dist,
                    alternatives: scored.slice(1, 4).map(function (c) { return c.user; })
                };
            }
            return { type: 'notFound', input: line };
        }

        async function classifyAsync(lines, addSelectorId, removeSelectorId, sesskey, onProgress) {
            let done = 0;
            const total = lines.length;
            if (onProgress) onProgress(0, total);
            const promises = lines.map(async function (line) {
                const r = await classifyOne(line, addSelectorId, removeSelectorId, sesskey);
                done++;
                if (onProgress) onProgress(done, total);
                return r;
            });
            const raw = await Promise.all(promises);
            const result = { found: [], fuzzy: [], alreadyMember: [], notFound: [], ambiguous: [], errors: [] };
            const seenIds = new Set();
            for (const r of raw) {
                if (r.type === 'found') {
                    if (seenIds.has(r.match.id)) continue;
                    seenIds.add(r.match.id);
                    result.found.push(r);
                } else if (r.type === 'fuzzyMatch') {
                    if (seenIds.has(r.match.id)) continue;
                    seenIds.add(r.match.id);
                    result.fuzzy.push(r);
                } else if (r.type === 'alreadyMember') {
                    result.alreadyMember.push(r);
                } else if (r.type === 'notFound') {
                    result.notFound.push(r);
                } else if (r.type === 'ambiguous') {
                    result.ambiguous.push(r);
                } else if (r.type === 'error') {
                    result.errors.push(r);
                }
            }
            return result;
        }

        async function performAdd(ids) {
            const sesskeyEl = document.querySelector('input[name=sesskey]');
            if (!sesskeyEl || !sesskeyEl.value) throw new Error('sesskey niet gevonden op deze pagina.');
            const body = new URLSearchParams();
            body.set('sesskey', sesskeyEl.value);
            body.set('add', '1');
            body.set('userselector_preserveselected', '0');
            body.set('userselector_autoselectunique', '0');
            body.set('userselector_searchfromstart', '0');
            for (const id of ids) {
                body.append('addselect[]', id);
            }
            const targetUrl = window.location.href;
            const resp = await fetch(targetUrl, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body.toString()
            });
            if (!resp.ok) throw new Error('Server gaf status ' + resp.status);
            return resp;
        }

        function render(rootEl) {
            const addSel = document.getElementById('addselect');
            const sesskeyEl = document.querySelector('input[name=sesskey]');

            if (!addSel || !sesskeyEl) {
                rootEl.innerHTML =
                    '<div class="mzd-row" style="color:#b00020;">' +
                    'Geen Moodle groep-pagina gedetecteerd.<br>' +
                    'Open een pagina met URL <code>group/members.php?group=...</code> en open de bookmarklet daar opnieuw.' +
                    '</div>';
                return;
            }

            const groupHeader = document.querySelector('#region-main h3');
            const groupLabel = groupHeader ? groupHeader.textContent.replace(/^[^:]*:\s*/, '').trim() : 'geselecteerde groep';

            rootEl.innerHTML =
                '<div class="mzd-row">' +
                '  <label class="mzd-label" for="mzd-names">Plak studentennamen (1 per regel, typisch <em>Achternaam Voornaam</em>):</label>' +
                '  <textarea id="mzd-names" rows="7" class="mzd-textarea" placeholder="Dams Tim&#10;Janssens Jan&#10;Dijckx Lieven"></textarea>' +
                '</div>' +
                '<div class="mzd-row mzd-muted">Toevoegen aan: <strong id="mzd-group-label"></strong></div>' +
                '<button id="mzd-preview-btn" class="mzd-btn">Zoek &amp; preview</button>' +
                '<div id="mzd-preview" class="mzd-preview"></div>' +
                '<div id="mzd-add-status" class="mzd-muted" style="margin-top:8px;"></div>';

            rootEl.querySelector('#mzd-group-label').textContent = groupLabel;

            const namesArea = rootEl.querySelector('#mzd-names');
            const previewBtn = rootEl.querySelector('#mzd-preview-btn');
            const previewDiv = rootEl.querySelector('#mzd-preview');
            const statusDiv = rootEl.querySelector('#mzd-add-status');

            previewBtn.onclick = async function () {
                const lines = parseInputLines(namesArea.value);
                if (lines.length === 0) {
                    previewDiv.innerHTML = '<div style="color:#b00020;">Geen namen ingegeven.</div>';
                    return;
                }

                const addSelectorId = findSelectorId('addselect');
                const removeSelectorId = findSelectorId('removeselect');
                if (!addSelectorId) {
                    previewDiv.innerHTML = '<div style="color:#b00020;">Kon de Moodle-zoeker niet initialiseren (selectorid voor addselect niet gevonden).</div>';
                    return;
                }
                const sesskey = sesskeyEl.value;

                previewBtn.disabled = true;
                statusDiv.textContent = '';
                statusDiv.style.color = '';
                previewDiv.innerHTML = '<div class="mzd-muted">Zoeken in Moodle (0/' + lines.length + ')...</div>';

                let result;
                try {
                    result = await classifyAsync(lines, addSelectorId, removeSelectorId, sesskey, function (done, total) {
                        previewDiv.innerHTML = '<div class="mzd-muted">Zoeken in Moodle (' + done + '/' + total + ')...</div>';
                    });
                } catch (e) {
                    console.error(e);
                    previewDiv.innerHTML = '<div style="color:#b00020;">Fout tijdens zoeken: ' + escapeHtml(e.message) + '</div>';
                    previewBtn.disabled = false;
                    return;
                }

                previewBtn.disabled = false;

                let html = '';

                if (result.found.length > 0) {
                    html += '<div class="mzd-section-title" style="color:#1e7d22;">&#10003; ' + result.found.length + ' gevonden</div>';
                    html += '<div class="mzd-list">';
                    for (const f of result.found) {
                        html +=
                            '<label class="mzd-item">' +
                            '<input type="checkbox" class="mzd-add-check" value="' + escapeHtml(f.match.id) + '" checked> ' +
                            escapeHtml(f.match.name) +
                            ' <span class="mzd-muted">(' + escapeHtml(f.match.email) + ')</span>' +
                            '</label>';
                    }
                    html += '</div>';
                }

                if (result.fuzzy.length > 0) {
                    html += '<div class="mzd-section-title" style="color:#d68a00;">~ ' + result.fuzzy.length + ' mogelijke match' + (result.fuzzy.length === 1 ? '' : 'es') + ' (typfout?)</div>';
                    html += '<div class="mzd-list">';
                    for (const f of result.fuzzy) {
                        const foutLabel = f.dist === 1 ? '1 verschil' : (f.dist + ' verschillen');
                        html +=
                            '<label class="mzd-item" title="Standaard niet aangevinkt - controleer eerst">' +
                            '<input type="checkbox" class="mzd-add-check" value="' + escapeHtml(f.match.id) + '"> ' +
                            '<em>' + escapeHtml(f.input) + '</em> &rarr; ' +
                            escapeHtml(f.match.name) +
                            ' <span class="mzd-muted">(' + escapeHtml(f.match.email) + ', ' + foutLabel + ')</span>' +
                            '</label>';
                    }
                    html += '</div>';
                }

                if (result.alreadyMember.length > 0) {
                    html += '<div class="mzd-warn"><strong>&#9888; ' + result.alreadyMember.length + ' al lid:</strong> ' +
                        result.alreadyMember.map(function (a) { return escapeHtml(a.match.name); }).join(', ') + '</div>';
                }

                if (result.notFound.length > 0) {
                    html += '<div class="mzd-err"><strong>&#10007; ' + result.notFound.length + ' niet gevonden:</strong> ' +
                        result.notFound.map(function (a) { return escapeHtml(a.input); }).join(', ') + '</div>';
                }

                if (result.ambiguous.length > 0) {
                    html += '<div class="mzd-warn"><strong>&#9888; ' + result.ambiguous.length + ' meerdere matches:</strong><br>';
                    for (const a of result.ambiguous) {
                        html += '&nbsp;&nbsp;<em>' + escapeHtml(a.input) + '</em> &rarr; ' +
                            a.matches.map(function (m) { return escapeHtml(m.name); }).join(', ') + '<br>';
                    }
                    html += 'Maak de invoer unieker (bv. met volledige naam of email).</div>';
                }

                if (result.errors.length > 0) {
                    html += '<div class="mzd-err"><strong>&#10007; ' + result.errors.length + ' fouten:</strong><br>';
                    for (const e of result.errors) {
                        html += '&nbsp;&nbsp;<em>' + escapeHtml(e.input) + '</em>: ' + escapeHtml(e.error) + '<br>';
                    }
                    html += '</div>';
                }

                if (result.found.length > 0 || result.fuzzy.length > 0) {
                    html += '<button id="mzd-add-btn" class="mzd-btn">Voeg geselecteerde studenten toe</button>';
                } else {
                    html += '<div class="mzd-muted">Geen toevoegbare studenten gevonden.</div>';
                }

                previewDiv.innerHTML = html;
                statusDiv.textContent = '';
                statusDiv.style.color = '';

                const addBtn = previewDiv.querySelector('#mzd-add-btn');
                if (addBtn) {
                    addBtn.onclick = async function () {
                        const checks = Array.from(previewDiv.querySelectorAll('.mzd-add-check:checked'));
                        const ids = checks.map(function (c) { return c.value; });
                        if (ids.length === 0) {
                            statusDiv.style.color = '#b00020';
                            statusDiv.textContent = 'Geen studenten geselecteerd.';
                            return;
                        }
                        const confirmMsg = 'Ben je zeker dat je ' + ids.length + ' student(en) wil toevoegen aan "' + groupLabel + '"?';
                        if (!confirm(confirmMsg)) return;
                        addBtn.disabled = true;
                        addBtn.innerText = 'Bezig met toevoegen...';
                        statusDiv.style.color = '#666';
                        statusDiv.textContent = 'Verzenden naar Moodle...';
                        try {
                            await performAdd(ids);
                            statusDiv.style.color = '#1e7d22';
                            statusDiv.textContent = 'Klaar! ' + ids.length + ' student(en) toegevoegd. Pagina wordt herladen...';
                            setTimeout(function () { window.location.reload(); }, 1200);
                        } catch (e) {
                            console.error(e);
                            statusDiv.style.color = '#b00020';
                            statusDiv.textContent = 'Fout: ' + e.message;
                            addBtn.disabled = false;
                            addBtn.innerText = 'Voeg geselecteerde studenten toe';
                        }
                    };
                }
            };
        }

        return { render: render };
    })();

    /* ============================================================
     * UI SHELL (tabs + overlay)
     * ============================================================ */

    function init() {
        const existing = document.getElementById('mzd-overlay');
        if (existing) existing.remove();

        const styleId = 'mzd-style';
        const old = document.getElementById(styleId);
        if (old) old.remove();
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent =
            '#mzd-overlay{position:fixed;top:20px;right:20px;width:380px;max-height:85vh;overflow-y:auto;background:#fff;border:1px solid #ccc;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:10001;padding:15px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;border-radius:8px;font-size:13px;color:#333;}' +
            '#mzd-header{font-weight:bold;font-size:15px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eee;padding-bottom:8px;}' +
            '#mzd-close{cursor:pointer;color:#999;font-size:18px;line-height:1;}' +
            '#mzd-close:hover{color:#333;}' +
            '.mzd-tabs{display:flex;gap:4px;border-bottom:1px solid #ddd;margin-bottom:12px;}' +
            '.mzd-tab{background:none;border:none;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:500;color:#666;border-bottom:2px solid transparent;margin-bottom:-1px;}' +
            '.mzd-tab.active{color:#2563eb;border-bottom-color:#2563eb;}' +
            '.mzd-tab:hover{color:#2563eb;}' +
            '.mzd-row{margin-bottom:10px;}' +
            '.mzd-label{display:block;margin-bottom:4px;font-weight:500;}' +
            '#mzd-naming{width:100%;padding:6px;border-radius:4px;border:1px solid #ccc;}' +
            '.mzd-textarea{width:100%;box-sizing:border-box;font-family:monospace;font-size:12px;padding:6px;border-radius:4px;border:1px solid #ccc;resize:vertical;}' +
            '.mzd-btn{background:#2563eb;color:#fff;border:none;padding:10px;border-radius:4px;cursor:pointer;width:100%;margin-top:10px;font-weight:bold;}' +
            '.mzd-btn:disabled{background:#ccc;cursor:not-allowed;}' +
            '.mzd-muted{color:#666;font-size:12px;}' +
            '#mzd-status{margin-top:10px;color:#666;font-size:12px;}' +
            '.mzd-preview{margin-top:10px;}' +
            '.mzd-section-title{font-weight:bold;margin-bottom:4px;}' +
            '.mzd-list{max-height:200px;overflow-y:auto;border:1px solid #eee;border-radius:4px;padding:6px;margin-bottom:8px;}' +
            '.mzd-item{display:block;font-size:12px;padding:2px 0;cursor:pointer;}' +
            '.mzd-warn{margin-bottom:8px;font-size:12px;color:#d68a00;}' +
            '.mzd-err{margin-bottom:8px;font-size:12px;color:#b00020;}';
        document.head.appendChild(style);

        const overlay = document.createElement('div');
        overlay.id = 'mzd-overlay';
        overlay.innerHTML =
            '<div id="mzd-header"><span>Moodle Toolkit</span><span id="mzd-close">&times;</span></div>' +
            '<div class="mzd-tabs">' +
            '  <button class="mzd-tab" data-tab="downloads">Downloads</button>' +
            '  <button class="mzd-tab" data-tab="groups">Groepen</button>' +
            '</div>' +
            '<div id="mzd-tab-content"></div>';
        document.body.appendChild(overlay);

        overlay.querySelector('#mzd-close').onclick = function () { overlay.remove(); };

        const tabContent = overlay.querySelector('#mzd-tab-content');
        const tabs = Array.from(overlay.querySelectorAll('.mzd-tab'));

        function activate(tabName) {
            tabs.forEach(function (t) { t.classList.toggle('active', t.dataset.tab === tabName); });
            tabContent.innerHTML = '';
            if (tabName === 'groups') {
                GroupAdder.render(tabContent);
            } else {
                Downloader.render(tabContent);
            }
            try { localStorage.setItem('mzd_last_tab', tabName); } catch (e) { /* ignore */ }
        }

        tabs.forEach(function (t) {
            t.onclick = function () { activate(t.dataset.tab); };
        });

        let initial = 'downloads';
        try {
            const last = localStorage.getItem('mzd_last_tab');
            if (last === 'downloads' || last === 'groups') initial = last;
        } catch (e) { /* ignore */ }
        activate(initial);
    }

    init();
})();
