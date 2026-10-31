import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {makeBanner, frameAt, normalize} from '../docs/display.js';
const font=JSON.parse(await readFile(new URL('../docs/pixel-font.json',import.meta.url)));
const fixtures=JSON.parse(await readFile(new URL('./render-fixtures.json',import.meta.url)));
for(const fixture of fixtures){
 const banner=makeBanner(fixture.text,font);
 assert.equal(banner.width,fixture.width);
 assert.equal(banner.height,fixture.height);
 assert.equal(createHash('sha256').update(frameAt(banner,fixture.time)).digest('hex'),fixture.sha256,`${fixture.text} at ${fixture.time}s`);
}
assert.equal(normalize('  boo\n neighbor!  '),'BOO NEIGHBOR!');
console.log(`${fixtures.length} preview frames match the Pi's Pillow renderer byte for byte.`);
