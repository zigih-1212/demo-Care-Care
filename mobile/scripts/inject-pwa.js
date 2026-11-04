/**
 * Post-export PWA injection.
 *
 * `expo export --platform web` writes a generic `index.html` with no PWA
 * wiring. Expo has no first-class hook for this in the Metro web exporter, so
 * after the export we add the small set of tags a browser needs before it will
 * offer "Install":
 *   - <link rel="manifest">  (the manifest itself is copied from public/)
 *   - theme-color + apple-mobile-web-app-* for a native-feeling tab/title bar
 *
 * The service worker is registered from app code (src/pwa/useInstallPrompt.ts),
 * so it is intentionally not injected here.
 *
 * Idempotent: running the build twice does not duplicate the tags.
 */
const fs = require('fs');
const path = require('path');

const distIndex = path.join(__dirname, '..', 'dist', 'index.html');

const TAGS = [
  '<link rel="manifest" href="/manifest.json" />',
  '<meta name="theme-color" content="#0E7C7B" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
  '<meta name="apple-mobile-web-app-title" content="Cara Care" />',
  '<link rel="apple-touch-icon" href="/icon-192.png" />',
];

function main() {
  if (!fs.existsSync(distIndex)) {
    console.error(`[inject-pwa] ${distIndex} not found - run the web export first.`);
    process.exit(1);
  }
  let html = fs.readFileSync(distIndex, 'utf8');

  const missing = TAGS.filter((tag) => !html.includes(tag));
  if (missing.length === 0) {
    console.log('[inject-pwa] PWA tags already present; nothing to do.');
    return;
  }
  html = html.replace('</head>', `    ${missing.join('\n    ')}\n  </head>`);
  fs.writeFileSync(distIndex, html);
  console.log(`[inject-pwa] injected ${missing.length} tag(s) into dist/index.html`);
}

main();
