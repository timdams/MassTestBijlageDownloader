// Regenerates the generated parts of install.html from the repo:
//   1. the bookmarklet inlined in <script id="bookmarklet-source"> is taken
//      verbatim from src/bookmarklet.js (the single source of truth);
//   2. the <span id="build-version"> stamp is set to the last commit's date and
//      short hash, so the live install page reveals whether it is up to date.
//
// Runs automatically in the GitHub Pages deploy workflow
// (.github/workflows/deploy_pages.yml) before the site is uploaded, and can be
// run locally to keep the committed install.html honest:
//
//     node scripts/build-install.mjs
//
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML_PATH = join(ROOT, 'install.html');
const SRC_PATH = join(ROOT, 'src', 'bookmarklet.js');

// The two generated regions of install.html.
const BOOKMARKLET_BLOCK = /(<script id="bookmarklet-source"[^>]*>)[\s\S]*?<\/script>/;
const VERSION_SPAN = /(<span id="build-version">)[\s\S]*?(<\/span>)/;

function buildVersion() {
  try {
    const date = execFileSync('git', ['log', '-1', '--format=%cd', '--date=short'],
      { cwd: ROOT, encoding: 'utf8' }).trim();
    const sha = execFileSync('git', ['log', '-1', '--format=%h'],
      { cwd: ROOT, encoding: 'utf8' }).trim();
    return `${date} (${sha})`;
  } catch {
    // No git available (e.g. running from a tarball) - fall back to the build date.
    return new Date().toISOString().slice(0, 10);
  }
}

const source = readFileSync(SRC_PATH, 'utf8').replace(/\s+$/, '');
let html = readFileSync(HTML_PATH, 'utf8');
const before = html;

if (!BOOKMARKLET_BLOCK.test(html)) {
  console.error('build-install: <script id="bookmarklet-source"> block not found in install.html');
  process.exit(1);
}
if (source.includes('</script>')) {
  console.error('build-install: src/bookmarklet.js contains a literal </script>, which cannot be inlined safely');
  process.exit(1);
}

html = html.replace(BOOKMARKLET_BLOCK, (_m, openTag) => `${openTag}\n${source}\n    </script>`);

const version = buildVersion();
if (VERSION_SPAN.test(html)) {
  html = html.replace(VERSION_SPAN, (_m, open, close) => `${open}${version}${close}`);
} else {
  console.warn('build-install: <span id="build-version"> not found; skipping version stamp');
}

if (html === before) {
  console.log('build-install: install.html already up to date');
} else {
  writeFileSync(HTML_PATH, html);
  console.log(`build-install: updated install.html (bookmarklet ${source.length} chars, version "${version}")`);
}
