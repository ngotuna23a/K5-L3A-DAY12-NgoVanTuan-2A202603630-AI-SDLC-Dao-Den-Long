import * as THREE from 'three';
import { Game, DT, seededRandom, ISLAND_RADIUS } from './game.mjs';

const $ = id => document.getElementById(id);
const contract = await fetch('./game.contract.json').then(r => { if (!r.ok) throw new Error('Không tải được contract'); return r.json(); });
const t = contract.tuning;
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: $('world'), antialias: true, powerPreference: 'high-performance' }); }
catch { $('fatal').hidden = false; $('fatal').textContent = 'Trình duyệt chưa bật WebGL. Hãy bật hardware acceleration hoặc thử Chrome/Edge mới hơn. Chế độ headless vẫn chạy được bằng Node.js.'; throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#13243b');
scene.fog = new THREE.FogExp2('#182b40', .016);
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, .1, 240);
const ambient = new THREE.HemisphereLight('#b8d8ef', '#213b36', 1.9);
scene.add(ambient);
const moonlight = new THREE.DirectionalLight('#bed8e9', 2.2);
moonlight.position.set(-20, 35, -10);
moonlight.castShadow = true;
moonlight.shadow.mapSize.set(1024, 1024);
Object.assign(moonlight.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 90 });
moonlight.shadow.bias = -.0005;
scene.add(moonlight);
const warm = new THREE.PointLight('#ffba58', 2.4, 14, 1.5);
scene.add(warm);
const materials = {};
const mat = (name, color, extra = {}) => materials[name] ??= new THREE.MeshStandardMaterial({ color, roughness: .85, flatShading: true, ...extra });
const mesh = (geometry, material, parent, pos = [0, 0, 0]) => {
  const item = new THREE.Mesh(geometry, material); item.position.fromArray(pos); item.castShadow = true; item.receiveShadow = true; parent.add(item); return item;
};
const cylinder = (top, bottom, height, sides, material, parent, pos) => mesh(new THREE.CylinderGeometry(top, bottom, height, sides), material, parent, pos);
const glowMaterial = new THREE.MeshBasicMaterial({ color: '#ffe29a', transparent: true, opacity: .13, depthWrite: false });

// All scenery is visual only; the shared simulation owns positions and collisions.
cylinder(29, 26.8, 2.4, 80, mat('island', '#3d6255'), scene, [0, -1.2, 0]);
cylinder(26.8, 14, 7, 17, mat('rock', '#253c47'), scene, [0, -5.7, 0]);
cylinder(14, 4, 6, 13, mat('rockdeep', '#1c2e3e'), scene, [0, -12, 0]);
const grass = cylinder(28.8, 28.8, .08, 80, mat('grass', '#496d59'), scene, [0, .01, 0]);
const visualRandom = seededRandom(702);
for (let i = 0; i < 48; i++) {
  const angle = visualRandom() * Math.PI * 2, radius = 6 + visualRandom() * 20;
  const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
  const rock = mesh(new THREE.DodecahedronGeometry(.25 + visualRandom() * .6, 0), mat('stone', '#759187'), scene, [x, .12, z]);
  rock.scale.y = .55;
  if (i % 3 === 0) {
    const tuft = new THREE.Group(); tuft.position.set(x + .8, 0, z); scene.add(tuft);
    for (let j = 0; j < 3; j++) {
      const blade = mesh(new THREE.ConeGeometry(.09, .6 + visualRandom() * .5, 3), mat('tuft', '#719174'), tuft, [(j - 1) * .16, .25, 0]);
      blade.rotation.z = (j - 1) * .3;
    }
  }
}
for (let i = 0; i < 11; i++) {
  const angle = i / 11 * Math.PI * 2, radius = 25 + visualRandom() * 1.5;
  const tree = new THREE.Group(); tree.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius); scene.add(tree);
  cylinder(.13, .25, 2.2, 6, mat('bark', '#4b5149'), tree, [0, 1.1, 0]);
  const crown = mesh(new THREE.IcosahedronGeometry(1.7, 0), mat('leaves', '#365a54'), tree, [0, 3, 0]); crown.scale.set(1, 1.35, 1);
  mesh(new THREE.IcosahedronGeometry(1.2, 0), mat('leaves2', '#426c60'), tree, [.7, 2.2, .3]);
}
const cloudMat = new THREE.MeshStandardMaterial({ color: '#657887', roughness: 1, flatShading: true, transparent: true, opacity: .4 });
for (let i = 0; i < 50; i++) {
  const angle = visualRandom() * Math.PI * 2, radius = 34 + visualRandom() * 55;
  const cloud = mesh(new THREE.IcosahedronGeometry(4 + visualRandom() * 6, 1), cloudMat, scene, [Math.sin(angle) * radius, -7 - visualRandom() * 5, Math.cos(angle) * radius]);
  cloud.scale.y = .25; cloud.castShadow = false;
}
const starPositions = [];
for (let i = 0; i < 450; i++) {
  const a = visualRandom() * Math.PI * 2, y = 20 + visualRandom() * 90;
  starPositions.push(Math.cos(a) * 100, y, Math.sin(a) * 100);
}
const starGeometry = new THREE.BufferGeometry(); starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: '#d3e8e3', size: .18, transparent: true, opacity: .65 })));
mesh(new THREE.SphereGeometry(2.3, 24, 16), new THREE.MeshBasicMaterial({ color: '#f1dcb7' }), scene, [-48, 43, 48]);

const may = new THREE.Group(); scene.add(may);
const tunic = mat('tunic', '#db9b56'), dark = mat('clothes', '#28545b'), skin = mat('skin', '#e8bf8b');
cylinder(.3, .44, .8, 8, tunic, may, [0, .85, 0]);
mesh(new THREE.SphereGeometry(.27, 10, 8), skin, may, [0, 1.42, .015]);
const hat = mesh(new THREE.ConeGeometry(.72, .36, 24), mat('hat', '#e3ce8c'), may, [0, 1.75, 0]);
cylinder(.7, .7, .035, 24, mat('hatedge', '#b49557'), may, [0, 1.57, 0]);
const limbs = [];
for (const side of [-1, 1]) {
  const leg = cylinder(.11, .13, .55, 6, dark, may, [side * .18, .3, 0]); limbs.push(leg);
  cylinder(.085, .1, .55, 6, tunic, may, [side * .44, .9, 0]);
}
mesh(new THREE.BoxGeometry(.65, .15, .12), dark, may, [0, 1.2, .27]);
const smallLantern = mesh(new THREE.SphereGeometry(.15, 8, 8), mat('smallLight', '#ffd48a', { emissive: '#ffb340', emissiveIntensity: 2 }), may, [.55, 1.05, .2]);
const pulseRing = mesh(new THREE.RingGeometry(.92, 1, 64), new THREE.MeshBasicMaterial({ color: '#ffe09a', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }), scene);
pulseRing.rotation.x = -Math.PI / 2;
pulseRing.castShadow = false;

const actors = new THREE.Group(); scene.add(actors);
const lanternViews = new Map(), shadeViews = new Map(), moteViews = new Map();
const moteGeometry = new THREE.SphereGeometry(.09, 5, 4), moteMat = new THREE.MeshBasicMaterial({ color: '#ffdd85' });
const shadeGeometry = new THREE.IcosahedronGeometry(.68, 1);
function createLantern(lantern) {
  const group = new THREE.Group(); group.position.fromArray(lantern.pos); actors.add(group);
  cylinder(.7, .85, .16, 8, mat('base', '#8b927e'), group, [0, .1, 0]);
  cylinder(.12, .17, 3, 8, mat('post', '#716149'), group, [0, 1.55, 0]);
  const cageMaterial = new THREE.MeshStandardMaterial({ color: '#897358', emissive: '#ffb64b', emissiveIntensity: .05, roughness: .6 });
  const cage = mesh(new THREE.SphereGeometry(.65, 12, 10), cageMaterial, group, [0, 3.1, 0]); cage.scale.y = 1.3;
  cylinder(.5, .5, .1, 10, mat('lanterncap', '#694c3c'), group, [0, 3.92, 0]);
  mesh(new THREE.ConeGeometry(.85, .38, 8), mat('roof', '#805642'), group, [0, 4.17, 0]);
  cylinder(.4, .4, .1, 10, materials.lanterncap, group, [0, 2.34, 0]);
  const halo = mesh(new THREE.SphereGeometry(1.1, 12, 10), glowMaterial, group, [0, 3.1, 0]); halo.visible = false;
  halo.castShadow = false;
  const pool = mesh(new THREE.CircleGeometry(t.safe_radius, 64), new THREE.MeshBasicMaterial({ color: '#ffc05c', transparent: true, opacity: .1, depthWrite: false }), group, [0, .075, 0]); pool.rotation.x = -Math.PI / 2; pool.visible = false;
  pool.castShadow = false;
  const light = new THREE.PointLight('#ffb54c', 0, 13, 1.4); light.position.set(0, 3.1, 0); group.add(light);
  return { group, cageMaterial, halo, pool, light };
}
function createShade() {
  const group = new THREE.Group(); actors.add(group);
  const material = new THREE.MeshStandardMaterial({ color: '#342540', emissive: '#6c3697', emissiveIntensity: .4, flatShading: true, transparent: true, opacity: .93 });
  mesh(shadeGeometry, material, group, [0, .8, 0]);
  for (const side of [-1, 1]) mesh(new THREE.SphereGeometry(.09, 6, 4), mat('eye', '#d695f6', { emissive: '#c77eff', emissiveIntensity: 2 }), group, [side * .23, .94, .55]);
  const tail = mesh(new THREE.ConeGeometry(.5, 1.1, 5), material, group, [0, .15, 0]); tail.rotation.z = Math.PI;
  return { group, material };
}
let game, playing = false, paused = false, yaw = 0, cameraDistance = 11, accumulator = 0, previousTime = 0, pulseTime = -10, toastUntil = 0;
let audio, soundOn = false, lastMoveAngle = 0;
const keys = new Set();
function notify(message, duration = 2.6) { $('toast').textContent = message; $('toast').classList.add('visible'); toastUntil = performance.now() + duration * 1000; }
function tone(frequency, duration = .12) {
  if (!soundOn || !audio) return;
  const oscillator = audio.createOscillator(), gain = audio.createGain();
  oscillator.type = 'sine'; oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(.06, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
  oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + duration);
}
function clearActors() {
  for (const map of [lanternViews, shadeViews, moteViews]) {
    for (const view of map.values()) {
      const group = view.group ?? view;
      actors.remove(group);
      if (view.cageMaterial) view.cageMaterial.dispose();
      if (view.material) view.material.dispose();
    }
    map.clear();
  }
}
function reset() {
  clearActors(); game = new Game(t, 202603630); accumulator = 0; keys.clear(); yaw = 0; pulseTime = -10;
  for (const lantern of game.lanterns) lanternViews.set(lantern.id, createLantern(lantern));
  updateHud(); syncView(0);
}
function start() {
  if (!game || game.state !== 'playing') reset();
  playing = true; paused = false; accumulator = 0; previousTime = performance.now();
  $('overlay').hidden = true; $('pause').textContent = 'Tạm dừng';
  notify('Đèn cần 8 đom đóm. Nhặt rồi nhấn E bên đèn.');
  $('world').focus();
}
function togglePause(force) {
  if (!playing || game.state !== 'playing') return;
  paused = force ?? !paused; keys.clear(); accumulator = 0;
  $('pause').textContent = paused ? 'Tiếp tục' : 'Tạm dừng';
  $('overlay').hidden = !paused;
  if (paused) {
    $('panel-eyebrow').textContent = 'NGHỈ CHÂN DƯỚI ÁNH ĐÈN';
    $('panel-title').innerHTML = 'Đảo vẫn đợi.<br><em>Cứ thong thả.</em>';
    $('panel-description').textContent = 'Game đang tạm dừng. Đồng hồ sẽ chạy tiếp khi bạn trở lại.';
    $('intro-rules').hidden = true; $('play').textContent = 'Tiếp tục hành trình';
  } else $('world').focus();
}
function finish() {
  playing = false; keys.clear();
  const won = game.state === 'won';
  $('overlay').hidden = false;
  $('panel-eyebrow').textContent = won ? 'NĂM NGỌN ĐÈN. MỘT HÒN ĐẢO THỨC GIẤC.' : 'MỖI ĐÊM LÀ MỘT CƠ HỘI MỚI';
  $('panel-title').innerHTML = won ? 'Đảo đã sáng.<br><em>Cảm ơn Mây.</em>' : 'Đêm khép lại.<br><em>Thử lại nhé.</em>';
  $('panel-description').textContent = `${won ? 'Bạn đã mang ánh sáng về Đảo Bến.' : game.player.flames <= 0 ? 'Bóng Mực đã làm tắt những ngọn lửa của Mây.' : 'Bình minh đã đến trước khi các đèn được thắp.'} Điểm của bạn: ${game.score.toLocaleString('vi-VN')}.`;
  $('intro-rules').hidden = true; $('play').textContent = 'Chơi lại Đêm 1';
}
function handleEvents(events) {
  for (const event of events) {
    if (event.name === 'mote_picked') tone(620 + event.data.carried * 22, .08);
    if (event.name === 'deposit') notify(`Đã nạp ${event.data.amount} đom đóm vào ${event.data.lantern_id}`);
    if (event.name === 'lantern_lit') { notify('Một ngọn đèn đã sáng. Ở gần đèn để được an toàn!'); tone(880, .5); }
    if (event.name === 'pulse') { pulseTime = performance.now() / 1000; tone(180, .4); }
    if (event.name === 'player_hit') { notify('Bóng Mực chạm vào Mây! Hãy chạy về đèn hoặc nhấn Q.'); tone(110, .25); }
    if (event.name === 'game_over') finish();
  }
}
function updateHud() {
  $('health').textContent = Array.from({ length: t.flames }, (_, i) => i < game.player.flames ? '♦' : '♢').join(' ');
  $('health').setAttribute('aria-label', `${game.player.flames} máu`);
  $('carried').textContent = game.player.carried;
  $('carry-meter').style.width = `${game.player.carried / t.carry_capacity * 100}%`;
  const seconds = Math.ceil(game.timeLeft);
  $('timer').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  $('score').textContent = game.score.toLocaleString('vi-VN');
  const lit = game.lanterns.filter(l => l.lit).length;
  $('lantern-dots').textContent = game.lanterns.map(l => l.lit ? '●' : '○').join(' ');
  $('lantern-count').textContent = `${lit} / 5 đèn đã sáng`;
  $('objective').textContent = lit > 0 ? `Ánh sáng đã trở về ${lit} góc đảo. Còn ${5 - lit} đèn chờ Mây.` : 'Gom đom đóm. Thắp đèn. Tìm đường về.';
  const cooldown = Math.max(0, (game.pulseUntil - game.tick) / 60);
  $('pulse-status').textContent = cooldown > 0 ? `Tỏa sáng hồi sau ${cooldown.toFixed(1)}s` : `Tỏa sáng · Q · ${t.pulse_cost} đom đóm`;
  const nearest = game.lanterns.filter(l => !l.lit).sort((a, b) => Math.hypot(a.pos[0] - game.player.pos[0], a.pos[2] - game.player.pos[2]) - Math.hypot(b.pos[0] - game.player.pos[0], b.pos[2] - game.player.pos[2]))[0];
  const canInteract = nearest && Math.hypot(nearest.pos[0] - game.player.pos[0], nearest.pos[2] - game.player.pos[2]) <= t.interact_radius;
  $('interaction').hidden = !playing || paused || !canInteract;
  if (canInteract) $('interaction').lastElementChild.textContent = game.player.carried > 0 ? `Nạp ánh sáng · ${nearest.deposited}/${t.lantern_cost}` : `Cần đom đóm · ${nearest.deposited}/${t.lantern_cost}`;
}
const mapContext = $('map').getContext('2d');
function drawMap() {
  const ctx = mapContext, c = 110, scale = 3.05;
  ctx.clearRect(0, 0, 220, 220);
  ctx.fillStyle = '#152f37cc'; ctx.strokeStyle = '#7f9f9166'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(c, c, 96, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const dot = (pos, radius, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(c - pos[0] * scale, c - pos[2] * scale, radius, 0, Math.PI * 2); ctx.fill(); };
  for (const m of game.motes) dot(m.pos, 1.2, '#b5b66b');
  for (const l of game.lanterns) {
    if (l.lit) dot(l.pos, t.safe_radius * scale, '#e4bb6c1f');
    dot(l.pos, l.lit ? 5 : 4, l.lit ? '#ffdc92' : '#8f8e74');
  }
  for (const s of game.shades) dot(s.pos, 3, s.state === 'stunned' ? '#b3e8e0' : '#b187d5');
  dot(game.player.pos, 4, '#fff4d4');
}
function syncView(time) {
  may.position.fromArray(game.player.pos);
  const moving = Math.hypot(...game.input.move) > 0;
  if (moving) lastMoveAngle = Math.atan2(game.input.move[0], game.input.move[1]) + yaw;
  may.rotation.y = lastMoveAngle;
  limbs.forEach((leg, i) => { leg.rotation.x = moving ? Math.sin(time * 12 + i * Math.PI) * .55 : 0; });
  may.visible = !(game.tick < game.hitUntil && Math.floor(time * 12) % 2 === 0);
  smallLantern.rotation.z = Math.sin(time * 3) * .12;
  warm.position.set(game.player.pos[0], game.player.pos[1] + 2, game.player.pos[2]);
  let litCount = 0;
  for (const lantern of game.lanterns) {
    const view = lanternViews.get(lantern.id);
    view.cageMaterial.emissiveIntensity = lantern.lit ? 2 : .05;
    view.cageMaterial.color.set(lantern.lit ? '#ffdb91' : '#897358');
    view.halo.visible = lantern.lit; view.pool.visible = lantern.lit; view.light.intensity = lantern.lit ? 7 : 0;
    if (lantern.lit) litCount++;
    view.halo.scale.setScalar(1 + Math.sin(time * 1.6) * .035);
  }
  ambient.intensity = 1.9 + litCount * .19;
  grass.material.color.set(litCount > 2 ? '#587c60' : '#496d59');
  const liveMotes = new Set(game.motes.map(m => m.id));
  for (const [id, view] of moteViews) if (!liveMotes.has(id)) { actors.remove(view); moteViews.delete(id); }
  for (const [i, mote] of game.motes.entries()) {
    let view = moteViews.get(mote.id);
    if (!view) { view = mesh(moteGeometry, moteMat, actors); view.castShadow = false; moteViews.set(mote.id, view); }
    view.position.set(mote.pos[0], .55 + Math.sin(time * 2 + i * 1.7) * .2, mote.pos[2]);
    view.scale.setScalar(1 + Math.sin(time * 3 + i) * .25);
  }
  for (const shade of game.shades) {
    let view = shadeViews.get(shade.id);
    if (!view) { view = createShade(); shadeViews.set(shade.id, view); }
    view.group.position.set(shade.pos[0], shade.pos[1] + Math.sin(time * 3 + shade.pos[0]) * .12, shade.pos[2]);
    view.group.rotation.y = Math.atan2(game.player.pos[0] - shade.pos[0], game.player.pos[2] - shade.pos[2]);
    view.material.color.set(shade.state === 'stunned' ? '#739d99' : '#342540');
    view.material.emissiveIntensity = shade.state === 'stunned' ? .1 : .4;
  }
  const age = time - pulseTime;
  pulseRing.material.opacity = age >= 0 && age < .65 ? (1 - age / .65) * .7 : 0;
  pulseRing.scale.setScalar(Math.max(.01, Math.min(t.pulse_radius, age / .65 * t.pulse_radius)));
  pulseRing.position.set(game.player.pos[0], .12, game.player.pos[2]);
  const target = new THREE.Vector3(game.player.pos[0] - Math.sin(yaw) * cameraDistance, game.player.pos[1] + cameraDistance * .68, game.player.pos[2] - Math.cos(yaw) * cameraDistance);
  camera.position.lerp(target, .13);
  camera.lookAt(game.player.pos[0] + Math.sin(yaw) * 1.5, game.player.pos[1] + .7, game.player.pos[2] + Math.cos(yaw) * 1.5);
  drawMap();
}
function frame(now) {
  const elapsed = Math.min((now - previousTime) / 1000, .25); previousTime = now;
  if (playing && !paused) {
    accumulator += elapsed;
    while (accumulator >= DT && game.state === 'playing') {
      // Looking toward +Z makes camera-right point toward -X in Three.js.
      const x = Number(keys.has('KeyA') || keys.has('ArrowLeft')) - Number(keys.has('KeyD') || keys.has('ArrowRight'));
      const z = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
      handleEvents(game.step({ move: [x, z], cam_yaw_deg: yaw * 180 / Math.PI, jump: keys.has('Space'), interact: keys.has('KeyE'), pulse: keys.has('KeyQ') }));
      accumulator -= DT;
    }
  }
  updateHud(); syncView(now / 1000);
  if (now > toastUntil) $('toast').classList.remove('visible');
  renderer.render(scene, camera); requestAnimationFrame(frame);
}
$('play').addEventListener('click', start);
$('pause').addEventListener('click', () => togglePause());
$('sound').addEventListener('click', async () => {
  audio ??= new AudioContext(); await audio.resume(); soundOn = !soundOn;
  $('sound').textContent = `Âm thanh: ${soundOn ? 'bật' : 'tắt'}`; $('sound').setAttribute('aria-pressed', String(soundOn)); tone(660);
  if (playing && !paused) $('world').focus();
});
const gameKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyE', 'KeyQ'];
addEventListener('keydown', event => {
  if (event.code === 'Escape' && !event.repeat) togglePause();
  if (gameKeys.includes(event.code) && playing && !paused && event.target.tagName !== 'BUTTON') { event.preventDefault(); keys.add(event.code); }
});
addEventListener('keyup', event => keys.delete(event.code));
addEventListener('blur', () => { keys.clear(); if (playing && !paused) togglePause(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && playing && !paused) togglePause(true); });
let dragging = false;
$('world').addEventListener('pointerdown', event => { dragging = true; $('world').setPointerCapture(event.pointerId); });
$('world').addEventListener('pointermove', event => { if (dragging) yaw -= event.movementX * .005; });
$('world').addEventListener('pointerup', () => { dragging = false; });
$('world').addEventListener('pointercancel', () => { dragging = false; });
$('world').addEventListener('wheel', event => { event.preventDefault(); cameraDistance = THREE.MathUtils.clamp(cameraDistance + event.deltaY * .01, 7, 19); }, { passive: false });
for (const button of document.querySelectorAll('[data-key]')) {
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); if (playing && !paused) keys.add(button.dataset.key); });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, () => keys.delete(button.dataset.key));
}
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
reset(); camera.position.set(0, 10, -14); previousTime = performance.now();
$('play').disabled = false; $('play').textContent = 'Mang ánh sáng về đảo';
// Read-only inspection hook for reproducible browser QA; gameplay still goes through normal inputs.
window.__dao = { snapshot: () => game.snapshot(), status: () => ({ playing, paused }), screenPosition: pos => new THREE.Vector3(...pos).project(camera).toArray(), rendererInfo: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }) };
requestAnimationFrame(frame);
