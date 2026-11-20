export const EPS = 1e-8;
export const xzDistance = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
export const direction = (from, to, fallback = [1, 0]) => {
  const d = xzDistance(from, to);
  return d > EPS ? [(to[0] - from[0]) / d, (to[2] - from[2]) / d] : fallback;
};
export const idOrder = (a, b) => a.id.localeCompare(b.id, 'en', { numeric: true });
const ring = (n, radius, y = 0, start = 0, cx = 0) => Array.from({ length: n }, (_, i) => {
  const a = (start + 360 * i / n) * Math.PI / 180;
  return [cx + Math.cos(a) * radius, y, Math.sin(a) * radius];
});
const mapCache = new Map();
export function nightMap(night) {
  if (![1, 2, 3].includes(night)) throw new Error('night must be 1, 2 or 3');
  if(mapCache.has(night)) return mapCache.get(night);
  const maps = {
    1: { name: 'Đảo Bến', duration: 300, spawn: [0, 0, 0], islands: [{ x: 0, z: 0, radius: 40 }], lanterns: [[0,0,25],[23.8,0,7.7],[14.7,0,-20.2],[-14.7,0,-20.2],[-23.8,0,7.7]], motes: [...ring(8,12),...ring(16,33)], shades: ring(12,37,0,15), pads: [], charms: [], shadeInterval: 480, shadeLimit: 6 },
    2: { name: 'Đảo Cau', duration: 330, spawn: [0,0,0], islands: [{ x:0,z:0,radius:28 },{ x:70,z:0,radius:28 }], lanterns: [[0,0,20],[17,0,-10],[-17,0,-10],[70,0,20],[87,0,-10],[53,0,-10]], motes: [...ring(4,10),...ring(8,22),...ring(4,10,0,0,70),...ring(8,22,0,0,70)], shades: [...ring(8,26,0,22.5),...ring(8,26,0,22.5,70)], pads: [{pos:[20,0,18],vy:14,speed:24,target:[70,0,0]},{pos:[50,0,-18],vy:14,speed:24,target:[0,0,0]}], charms: [[35,0,0]], shadeInterval:420, shadeLimit:8 },
    3: { name:'Đảo Chuông',duration:360,spawn:[0,0,-30],islands:[{x:0,z:0,radius:45}],lanterns:[[0,6,6],[18,3,10],[-18,3,10],[35,0,-10],[-35,0,-10],[20,0,-35],[-20,0,-35]],motes:[...ring(18,34),...Array.from({length:8},(_,i)=>{const a=(20+i*20)*Math.PI/180;return [18*Math.cos(a),3,18*Math.sin(a)];}),...ring(4,5,6,45)],shades:ring(16,43),pads:[{pos:[0,3,13],vy:12,speed:8,target:[0,3,0]}],charms:[[30,0,25],[-30,0,25]],shadeInterval:360,shadeLimit:10 }
  };
  for(const [key,map] of Object.entries(maps)) mapCache.set(Number(key),map);
  return mapCache.get(night);
}
export function rampHeight(x, z) {
  const radius = Math.hypot(x,z);
  if (radius < 24-EPS || radius > 30+EPS) return null;
  for (const degrees of [30,150]) {
    const a=degrees*Math.PI/180;
    const along=x*Math.cos(a)+z*Math.sin(a), across=-x*Math.sin(a)+z*Math.cos(a);
    if (along >= 24-EPS && along <= 30+EPS && Math.abs(across)<=1.5+EPS) return Math.max(0,Math.min(3,(30-along)/2));
  }
  return null;
}
export function surfaceAt(night, x, z) {
  const map=nightMap(night);
  const inside=map.islands.some(i=>Math.hypot(x-i.x,z-i.z)<=i.radius+EPS);
  if (night===2 && x>=26-EPS && x<=44+EPS && Math.abs(z)<=2+EPS) return 0;
  if (!inside) return null;
  if (night!==3) return 0;
  const radius=Math.hypot(x,z);
  if (radius<=8+EPS) return 6;
  if(z>0 && radius>=12-EPS && radius<=24+EPS) return 3;
  return rampHeight(x,z) ?? 0;
}
export function moveHorizontal(night, pos, dx, dz, {grounded=false, flying=false}={}) {
  const candidate=[pos[0]+dx,pos[1],pos[2]+dz];
  if (night===3 && Math.hypot(candidate[0],candidate[2]) < 2 && candidate[1]<14 && candidate[1]>=6-EPS) return [...pos];
  if (!flying) {
    const ground=surfaceAt(night,candidate[0],candidate[2]);
    const ramp=night===3 ? rampHeight(candidate[0],candidate[2]) : null;
    const onRamp=night===3 && (ramp!==null||rampHeight(pos[0],pos[2])!==null);
    if (ground!==null && ground>pos[1]+EPS && !(grounded && onRamp && ground-pos[1]<=.3)) return [...pos];
    if (grounded && ground!==null && onRamp && Math.abs(ground-pos[1])<=.3) candidate[1]=ground;
  }
  return candidate;
}
