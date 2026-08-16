/**
 * Bygger trackeren som et selvstændigt website, klar til hosting.
 *
 * Filen kopieres til <ud-mappe>/index.html, så adressen bliver ren:
 * https://liga.jeres-domæne.dk/ — ikke .../leanowski.html.
 *
 * Kildefilen er stadig den eneste sandhed; her kopieres den bare.
 *
 *   node scripts/build-leanowski-site.js dist
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'public', 'leanowski.html');
const outDir = process.argv[2] || 'dist';

fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(src, path.join(outDir, 'index.html'));

// Ingen søgemaskiner: ligaen er ikke noget der skal kunne googles frem.
fs.writeFileSync(path.join(outDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

const bytes = fs.statSync(path.join(outDir, 'index.html')).size;
console.log('Skrev ' + outDir + '/index.html (' + Math.round(bytes / 1024) + ' kB) + robots.txt');
