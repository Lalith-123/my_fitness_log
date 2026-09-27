// Deployment plumbing that must run after `vite build`.
//
// This app is client-side routed, so there is no file matching a path like
// /history. Opening or hard-refreshing one asks the host for a page that does
// not exist, and the host replies 404 before React ever boots. Each host needs
// its own way to hand back index.html instead:
//
//   vercel.json  rewrite rule, read by Vercel from the project root
//   404.html     GitHub Pages has no rewrite config, so it serves this instead
//
// Vite emits neither, so we place them into the output directory ourselves.
import { copyFileSync, writeFileSync } from 'node:fs';

copyFileSync('vercel.json', 'dist/vercel.json');

// Must be a full copy rather than a redirect, and its asset paths have to stay
// absolute so they still resolve when it is served from a deep link.
copyFileSync('dist/index.html', 'dist/404.html');

// Makes GitHub Pages serve the build verbatim instead of passing it through
// Jekyll, which drops paths it treats as special.
writeFileSync('dist/.nojekyll', '');

console.log('postbuild: wrote vercel.json, 404.html and .nojekyll into dist/');
