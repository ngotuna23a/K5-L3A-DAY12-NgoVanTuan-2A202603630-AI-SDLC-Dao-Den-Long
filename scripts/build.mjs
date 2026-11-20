import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const files = ['index.html', 'style.css', 'game.contract.json', 'src/game.mjs', 'src/world.mjs', 'src/campaign.mjs', 'src/browser.mjs', 'src/audio.mjs', 'LICENSE', 'CREDITS.md'];
for (const file of files) {
  const target = resolve(root, 'dist', file);
  await mkdir(resolve(target, '..'), { recursive: true });
  await copyFile(resolve(root, file), target);
}
await mkdir(resolve(root, 'dist/vendor'), { recursive: true });
for (const name of ['three.module.js', 'three.core.js']) {
  await copyFile(resolve(root, 'node_modules/three/build', name), resolve(root, 'dist/vendor', name));
}
await copyFile(resolve(root, 'node_modules/three/LICENSE'), resolve(root, 'dist/vendor/THREE-LICENSE.txt'));
const dependency = JSON.parse(await readFile(resolve(root, 'node_modules/three/package.json'), 'utf8'));
await writeFile(resolve(root, 'dist/build-info.json'), JSON.stringify({ app: 'dao-den-long', three: dependency.version }) + '\n');
console.log(`Built dist/ (Three.js ${dependency.version}, no CDN)`);
