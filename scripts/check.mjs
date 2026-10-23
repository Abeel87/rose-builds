import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
for(const file of readdirSync('dist').filter(f=>f.endsWith('.js')))execFileSync(process.execPath,['--check',`dist/${file}`]);
const sw=readFileSync('dist/sw.js','utf8');
const assets=JSON.parse(sw.match(/const FILES=(\[.*\]);/)[1]);
const hash=createHash('sha256');
for(const file of assets){assert.ok(existsSync(`dist/${file}`),file);hash.update(readFileSync(`dist/${file}`));}
assert.ok(sw.includes(`rose-companion-${hash.digest('hex').slice(0,12)}`),'Run node scripts/generate-sw.mjs after changing static files.');
const html=readFileSync('dist/index.html','utf8'),css=readFileSync('dist/style.css','utf8');
for(const match of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g))assert.ok(existsSync(`dist/${match[1]}`),match[1]);
for(const match of css.matchAll(/url\(['"]?\.\/([^)'"\s]+)['"]?\)/g))assert.ok(existsSync(`dist/${match[1]}`),match[1]);
const manifest=JSON.parse(readFileSync('dist/manifest.webmanifest','utf8'));
for(const icon of manifest.icons)assert.ok(existsSync(`dist/${icon.src.replace(/^\.\//,'')}`),icon.src);
assert.equal(existsSync('dist/__qa-mobile.html'),false,'Remove preview-only QA fixture before release.');
console.log(`JavaScript, asset paths, manifest and offline version verified (${assets.length} cached files).`);
