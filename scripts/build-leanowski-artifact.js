/**
 * Udleder en hosted udgave af public/leanowski.html.
 *
 * Hosting-siden pakker selv indholdet ind i sit eget <html>/<head>/<body>,
 * så her trækkes title, styles og body-indhold ud af det færdige dokument.
 * Kildefilen er den eneste sandhed — den hostede kopi genereres altid herfra,
 * så de to udgaver ikke kan nå at drive fra hinanden.
 *
 *   node scripts/build-leanowski-artifact.js <ud-fil>
 */
const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'public', 'leanowski.html');
const outPath = process.argv[2];

if (!outPath) {
  console.error('Brug: node scripts/build-leanowski-artifact.js <ud-fil>');
  process.exit(1);
}

const src = fs.readFileSync(srcPath, 'utf8');

function grab(tag) {
  const m = src.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>'));
  if (!m) throw new Error('Fandt ikke <' + tag + '> i ' + srcPath);
  return m[1];
}

const title = grab('title').trim();
const style = grab('style');
const body = grab('body');

const out =
  '<title>' + title + '</title>\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  '<meta name="theme-color" content="#0d0f14">\n' +
  '<style>' + style + '</style>\n' +
  body.trim() + '\n';

fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
fs.writeFileSync(outPath, out);

console.log('Skrev ' + outPath + ' (' + Math.round(out.length / 1024) + ' kB) ud fra public/leanowski.html');
