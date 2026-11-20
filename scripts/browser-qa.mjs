import { writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

// Uses an already installed Chrome via its local CDP port; installs no test dependency.
const port = process.env.CDP_PORT ?? '9222';
const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
const target = targets.find(t => t.type === 'page');
if (!target) throw new Error('No Chrome page target. Start headless Chrome with --remote-debugging-port=9222.');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((ok, no) => { socket.addEventListener('open', ok, { once: true }); socket.addEventListener('error', no, { once: true }); });
let nextId = 0;
const pending = new Map(), errors = [];
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const request = pending.get(message.id); if (!request) return;
    pending.delete(message.id); clearTimeout(request.timer);
    if (message.error) request.reject(new Error(JSON.stringify(message.error))); else request.resolve(message.result);
  } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text + ': ' + (message.params.exceptionDetails.exception?.description ?? ''));
  else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(`${message.params.entry.text} ${message.params.entry.url ?? ''}`);
});
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function until(expression, timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return;
    await new Promise(ok => setTimeout(ok, 100));
  }
  throw new Error(`Timed out waiting: ${expression}`);
}
async function key(code, key, type) { await cdp('Input.dispatchKeyEvent', { type, code, key, windowsVirtualKeyCode: key.length === 1 ? key.toUpperCase().charCodeAt(0) : code === 'Space' ? 32 : 27 }); }
const proof = resolve('docs/proof/phase-1'); await mkdir(proof, { recursive: true });
try {
  await cdp('Runtime.enable'); await cdp('Log.clear'); await cdp('Log.enable'); await cdp('Page.enable');
  errors.length = 0;
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: 'http://127.0.0.1:4173' });
  await until('Boolean(window.__dao) && !document.getElementById("play").disabled');
  assert.ok(await evaluate('window.__dao.rendererInfo().triangles > 0'));
  await writeFile(resolve(proof, 'intro.png'), Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await evaluate('document.getElementById("play").click()');
  assert.equal(await evaluate('document.activeElement.id'), 'world');
  const before = await evaluate('window.__dao.snapshot()');
  await key('KeyW', 'w', 'keyDown');
  await until(`window.__dao.snapshot().player.pos[2] >= ${before.player.pos[2] + .8}`);
  await key('KeyW', 'w', 'keyUp');
  const moved = await evaluate('window.__dao.snapshot()');
  assert.ok(moved.player.pos[2] > before.player.pos[2] + .5);
  const horizontalChecks = [];
  async function checkHorizontal(code, label, direction) {
    const origin = await evaluate('window.__dao.snapshot().player.pos');
    await key(code, label, 'keyDown');
    try {
      await until(`Math.hypot(window.__dao.snapshot().player.pos[0] - ${origin[0]}, window.__dao.snapshot().player.pos[2] - ${origin[2]}) >= .6`);
    } finally { await key(code, label, 'keyUp'); }
    // Project both world positions through the same camera so follow motion cannot hide an inverted input.
    const screenDelta = await evaluate(`(() => { const a = window.__dao.screenPosition(${JSON.stringify(origin)}); const b = window.__dao.screenPosition(window.__dao.snapshot().player.pos); return b[0] - a[0]; })()`);
    assert.ok(screenDelta * direction > .01, `${code}: wrong on-screen direction (${screenDelta})`);
    horizontalChecks.push({ code, direction: direction > 0 ? 'right' : 'left', screenDelta });
  }
  await checkHorizontal('KeyA', 'a', -1);
  await checkHorizontal('KeyD', 'd', 1);
  await checkHorizontal('ArrowLeft', 'ArrowLeft', -1);
  await checkHorizontal('ArrowRight', 'ArrowRight', 1);
  // Rotate the actual camera through mouse input and repeat; screen-relative controls must still agree.
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: 720, y: 500, button: 'left', clickCount: 1 });
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1034, y: 500, button: 'left', buttons: 1 });
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 1034, y: 500, button: 'left', clickCount: 1 });
  await until('Math.abs(window.__dao.screenPosition([0, 0, 1])[0] - window.__dao.screenPosition([0, 0, 0])[0]) > .02');
  await evaluate('new Promise(resolve => setTimeout(resolve, 500))');
  await checkHorizontal('KeyA', 'a', -1);
  await checkHorizontal('KeyD', 'd', 1);
  // Reload to restore the default camera and world for the remaining independent checks.
  await cdp('Page.reload');
  await until('Boolean(window.__dao) && !document.getElementById("play").disabled');
  await evaluate('document.getElementById("play").click()');
  await key('Space', ' ', 'keyDown');
  await until('window.__dao.snapshot().player.pos[1] > .1');
  await key('Space', ' ', 'keyUp');
  await until('window.__dao.snapshot().player.pos[1] === 0');
  await evaluate('document.getElementById("pause").click()');
  const pausedTick = await evaluate('window.__dao.snapshot().tick');
  await evaluate('new Promise(resolve => setTimeout(resolve, 350))');
  assert.equal(await evaluate('window.__dao.snapshot().tick'), pausedTick);
  await evaluate('document.getElementById("play").click()');
  await until(`window.__dao.snapshot().tick > ${pausedTick}`);
  await writeFile(resolve(proof, 'gameplay.png'), Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  let fullPlay;
  if (process.argv.includes('--full-play')) {
    await evaluate(`(() => {
      const pressed = new Set(); let pulse = false, interact = false;
      window.__qaBotDone = false;
      const bot = setInterval(() => {
        const s = window.__dao.snapshot();
        const desired = new Set();
        if (s.state !== 'playing') {
          for (const code of pressed) document.getElementById('world').dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
          clearInterval(bot); window.__qaBotDone = true; return;
        }
        const p = s.player;
        const dist = o => Math.hypot(o.pos[0] - p.pos[0], o.pos[2] - p.pos[2]);
        const lamps = s.lanterns.filter(l => !l.lit).sort((a,b) => dist(a)-dist(b));
        const target = p.carried >= 8 ? lamps[0] : s.motes.slice().sort((a,b) => dist(a)-dist(b))[0] ?? lamps[0];
        if (target) {
          const dx = target.pos[0] - p.pos[0], dz = target.pos[2] - p.pos[2];
          if (Math.abs(dx) > .3) desired.add(dx > 0 ? 'KeyA' : 'KeyD');
          if (Math.abs(dz) > .3) desired.add(dz > 0 ? 'KeyW' : 'KeyS');
        }
        interact = !interact && lamps.some(l => dist(l) < 2.7) && p.carried > 0;
        pulse = !pulse && p.carried >= 2 && s.shades.some(sh => sh.state !== 'stunned' && dist(sh) < 4.5);
        if (interact) desired.add('KeyE'); if (pulse) desired.add('KeyQ');
        for (const code of pressed) if (!desired.has(code)) document.getElementById('world').dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
        for (const code of desired) if (!pressed.has(code)) document.getElementById('world').dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
        pressed.clear(); for (const code of desired) pressed.add(code);
      }, 40);
    })()`);
    await until('window.__qaBotDone', 150000);
    fullPlay = await evaluate('window.__dao.snapshot()');
    assert.equal(fullPlay.state, 'won', 'Browser input-only bot should win');
    assert.equal(fullPlay.lanterns.filter(l => l.lit).length, 5);
    assert.equal(await evaluate('document.getElementById("overlay").hidden'), false);
    await writeFile(resolve(proof, 'won.png'), Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
    await evaluate('document.getElementById("play").click()');
    const replay = await evaluate('window.__dao.snapshot()');
    assert.equal(replay.state, 'playing'); assert.equal(replay.score, 0); assert.equal(replay.lanterns.filter(l => l.lit).length, 0);
  }
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cdp('Emulation.setTouchEmulationEnabled', { enabled: true });
  await cdp('Page.reload');
  await until('Boolean(window.__dao) && !document.getElementById("play").disabled && innerWidth === 390');
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await writeFile(resolve(proof, 'mobile.png'), Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  assert.deepEqual(errors, []);
  const checks = ['WebGL draws triangles', 'start focuses game canvas', 'W moves player', 'Space jumps and lands', 'pause freezes gameplay tick', 'resume advances tick', 'mobile viewport has no horizontal overflow', 'no browser exception/error'];
  checks.push('A moves left on screen', 'D moves right on screen', 'ArrowLeft moves left on screen', 'ArrowRight moves right on screen', 'A moves left after camera rotation', 'D moves right after camera rotation');
  if (fullPlay) checks.push('input-only bot wins default night in browser', 'win overlay and replay reset state');
  const report = { browser: await cdp('Browser.getVersion'), checks, errors, before, moved, horizontalChecks, ...(fullPlay ? { fullPlay } : {}), render: await evaluate('window.__dao.rendererInfo()') };
  await writeFile(resolve(proof, 'browser-qa.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Browser QA passed: ${report.checks.length} checks. Screenshots: docs/proof/phase-1/`);
} finally { await cdp('Page.navigate', { url: 'about:blank' }).catch(() => {}); socket.close(); }
