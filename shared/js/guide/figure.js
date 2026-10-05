// Lehrbild-Figur für die Anleitungsvideos (unabhängig vom Demo-Modus, ohne Browser, unit-getestet in tests/unit.mjs).
// Die Haltung wird über Gelenkwinkel beschrieben (Vorwärtskinematik), damit Lehrbild-Merkmale wie „Knie 90°“,
// „Ellbogen auf Schulterhöhe“ oder „Oberschenkel waagerecht“ genau so im Bild stehen, wie sie gemeint sind.
//
// Welt: x, y am Boden, z nach oben (Meter). Pose (alle Winkel in Grad):
//  x, y      Standort: Mitte zwischen den Fußgelenken (anchor 'both'), ein Fuß (anchor 'l' / 'r') oder Becken (anchor 'pelvis')
//  a         Blickrichtung des Beckens (0 = +x, 90 = +y)
//  air       Höhe des tiefsten Fußpunkts über dem Boden (0 = steht, > 0 = Flug)
//  lean      Oberkörper nach vorn (+) / hinten (−), tilt seitlich zur linken Seite (+), twist Schultern gegen Becken (+ = nach links gedreht)
//  lThigh, lShank, rThigh, rShank, lUpper, lFore, rUpper, rFore: Richtung des Körpersegments als [Höhe, Seite]:
//            Höhe = Winkel über der Waagerechten (−90 = senkrecht nach unten, 0 = waagerecht, 90 = nach oben),
//            Seite = 0 nach vorn, 90 zur eigenen Außenseite (links beim linken Bein/Arm), 180 nach hinten, −90 nach innen.
//            Beine im Becken-, Arme im Schulter-Bezug (dreht und neigt mit dem Oberkörper).
//  lFoot, rFoot  Fußspitze nach unten (Ferse gehoben), 0 = flach
//  ball      'r' | 'l' | 'both' | null
// Beine statt über Winkel auch über Fußpunkte (für Schritte, Anlauf, Abwehr): lAt, rAt = [x, y, Hub] des Fußgelenks in der
// Welt, pz = Beckenhöhe. Die Knie stellt dann eine Zwei-Gelenk-Kette (IK) ein, Knie zeigen nach vorn. x, y = Becken.
export const SEG = {hip:0.11, thigh:0.45, shank:0.44, ankle:0.08, heel:0.06, toe:0.18, trunk:0.52, shoulder:0.19, head:0.25, upper:0.30, fore:0.27, hand:0.08};
const D = Math.PI/180;
export const V = {
  add:(a, b, s = 1) => [a[0]+b[0]*s, a[1]+b[1]*s, a[2]+b[2]*s],
  sub:(a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]],
  dot:(a, b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  len:a => Math.hypot(a[0], a[1], a[2]),
  mix:(a, b, k) => [a[0]+(b[0]-a[0])*k, a[1]+(b[1]-a[1])*k, a[2]+(b[2]-a[2])*k]
};
const {add, sub, dot} = V;
const lin = (...terms) => terms.reduce((s, [v, k]) => add(s, v, k), [0, 0, 0]);

export const STAND = {x:0, y:0, a:90, air:0, anchor:'both', lean:0, tilt:0, twist:0,
  lThigh:[-88, 90], lShank:[-90, 0], rThigh:[-88, 90], rShank:[-90, 0], lFoot:0, rFoot:0,
  lUpper:[-85, 90], lFore:[-80, 20], rUpper:[-85, 90], rFore:[-80, 20], ball:null};

// Richtung aus [Höhe, Seite] in einem Bezug {fw, out, up} (out = Außenseite des Glieds).
function dir([el, az], {fw, out, up}){
  const c = Math.cos(el*D);
  return lin([fw, c*Math.cos(az*D)], [out, c*Math.sin(az*D)], [up, Math.sin(el*D)]);
}
// Bezug drehen: um up (Gier), dann vorn kippen (lean), dann seitlich (tilt).
function frame(a, lean = 0, tilt = 0){
  let fw = [Math.cos(a*D), Math.sin(a*D), 0], lt = [-Math.sin(a*D), Math.cos(a*D), 0], up = [0, 0, 1];
  const l = lean*D; [fw, up] = [lin([fw, Math.cos(l)], [up, -Math.sin(l)]), lin([up, Math.cos(l)], [fw, Math.sin(l)])];
  const t = tilt*D; [lt, up] = [lin([lt, Math.cos(t)], [up, -Math.sin(t)]), lin([up, Math.cos(t)], [lt, Math.sin(t)])];
  return {fw, lt, up};
}

// Pose → Gelenke (Meter, Welt). Fehlende Felder aus STAND.
export function body(pose){
  const p = {...STAND, ...pose}, j = {};
  const pf = frame(p.a), sf = frame(p.a + p.twist, p.lean, p.tilt);
  const ik = !!(p.lAt && p.rAt), pel = ik ? [p.x, p.y, p.pz ?? 0.97] : [0, 0, 0];
  for(const [s, sg] of [['l', 1], ['r', -1]]){
    const out = V.add([0, 0, 0], pf.lt, sg), Fp = {fw:pf.fw, out, up:pf.up};
    const hip = add(pel, out, SEG.hip);
    let knee, ank;
    if(ik){
      const [tx, ty, lift = 0] = p[s+'At'], fq = p[s+'Foot']*D;
      [knee, ank] = legIK(hip, [tx, ty, lift + Math.sin(fq)*SEG.toe + Math.cos(fq)*SEG.ankle], pf.fw);
    } else { knee = add(hip, dir(p[s+'Thigh'], Fp), SEG.thigh); ank = add(knee, dir(p[s+'Shank'], Fp), SEG.shank); }
    const fp = p[s+'Foot']*D, fd = lin([pf.fw, Math.cos(fp)], [pf.up, -Math.sin(fp)]), fn = lin([pf.up, Math.cos(fp)], [pf.fw, Math.sin(fp)]);
    j[s+'Hip'] = hip; j[s+'Knee'] = knee; j[s+'Ank'] = ank;
    j[s+'Heel'] = add(add(ank, fd, -SEG.heel), fn, -SEG.ankle); j[s+'Toe'] = add(add(ank, fd, SEG.toe), fn, -SEG.ankle);
  }
  const neck = add(pel, sf.up, SEG.trunk);
  j.pelvis = pel; j.neck = neck; j.head = add(neck, sf.up, SEG.head); j.nose = add(add(neck, sf.up, SEG.head - 0.02), sf.fw, 0.1);
  for(const [s, sg] of [['l', 1], ['r', -1]]){
    const out = V.add([0, 0, 0], sf.lt, sg), Fs = {fw:sf.fw, out, up:sf.up};
    const sh = add(neck, out, SEG.shoulder), el = add(sh, dir(p[s+'Upper'], Fs), SEG.upper), fd = dir(p[s+'Fore'], Fs), wr = add(el, fd, SEG.fore);
    j[s+'Sh'] = sh; j[s+'El'] = el; j[s+'Wr'] = wr; j[s+'Hand'] = add(wr, fd, SEG.hand);
  }
  if(ik) return j;
  // Höhe: tiefster Fußpunkt auf air. Standort: anchor.
  // Steht die Figur auf einem Fuß (anchor 'l' / 'r'), bestimmt dieser Fuß die Höhe; sonst der tiefste Fußpunkt.
  const feet = (p.anchor==='l' || p.anchor==='r' ? [p.anchor] : ['l', 'r']).flatMap(s => [j[s+'Heel'][2], j[s+'Toe'][2]]);
  const dz = (p.air || 0) - Math.min(...feet);
  const at = p.anchor==='l' ? j.lAnk : p.anchor==='r' ? j.rAnk : p.anchor==='pelvis' ? pel : V.mix(j.lAnk, j.rAnk, 0.5);
  const d = [p.x - at[0], p.y - at[1], dz];
  for(const k in j) j[k] = add(j[k], d);
  return j;
}

// Zwei-Gelenk-Kette Hüfte → Knie → Fußgelenk: Knie in der Ebene, die vorn (fw) enthält. Zu weit weg: Bein gestreckt.
function legIK(hip, target, fw){
  const L1 = SEG.thigh, L2 = SEG.shank, v = sub(target, hip), d0 = V.len(v), d = Math.min(d0, L1 + L2 - 1e-4);
  const u = [v[0]/d0, v[1]/d0, v[2]/d0], a = (L1*L1 - L2*L2 + d*d)/(2*d), h = Math.sqrt(Math.max(0, L1*L1 - a*a));
  let n = sub(fw, [u[0]*dot(fw, u), u[1]*dot(fw, u), u[2]*dot(fw, u)]); const nl = V.len(n) || 1; n = [n[0]/nl, n[1]/nl, n[2]/nl];
  const knee = add(add(hip, u, a), n, h);
  return [knee, add(hip, u, d)];
}

// Winkel an b zwischen a und c (Grad), z. B. Knie: angle(j.lHip, j.lKnee, j.lAnk).
export function angle(a, b, c){
  const u = sub(a, b), w = sub(c, b);
  return Math.acos(Math.max(-1, Math.min(1, dot(u, w)/(V.len(u)*V.len(w)))))/D;
}
// Gelenkwinkel per Name: 'lKnee', 'rElbow', 'lHip' (Rumpf–Oberschenkel), 'rShoulder' (Rumpf–Oberarm).
export function jointAngle(j, name){
  const s = name[0], k = name.slice(1);
  if(k==='Knee') return angle(j[s+'Hip'], j[s+'Knee'], j[s+'Ank']);
  if(k==='Elbow') return angle(j[s+'Sh'], j[s+'El'], j[s+'Wr']);
  if(k==='Hip') return angle(j.neck, j[s+'Hip'], j[s+'Knee']);
  if(k==='Shoulder') return angle(j[s+'Hip'], j[s+'Sh'], j[s+'El']);
  throw new Error('Gelenk unbekannt: ' + name);
}
// Drei Punkte, die den Winkel bilden (für die Anzeige).
export function jointPts(j, name){
  const s = name[0], k = name.slice(1);
  return k==='Knee' ? [j[s+'Hip'], j[s+'Knee'], j[s+'Ank']] : k==='Elbow' ? [j[s+'Sh'], j[s+'El'], j[s+'Wr']]
    : k==='Hip' ? [j.neck, j[s+'Hip'], j[s+'Knee']] : [j[s+'Hip'], j[s+'Sh'], j[s+'El']];
}

// Spiegeln für Linkshänder: links und rechts tauschen, Drehung und Seitneigung umkehren.
export function mirror(p){
  const o = {};
  for(const k in p){
    const m = k[0]==='l' && /^[A-Z]/.test(k[1] || '') ? 'r' + k.slice(1) : k[0]==='r' && /^[A-Z]/.test(k[1] || '') ? 'l' + k.slice(1) : k;
    o[m] = p[k];
  }
  if('twist' in o) o.twist = -o.twist;
  if('tilt' in o) o.tilt = -o.tilt;
  if(o.ball === 'r' || o.ball === 'l') o.ball = o.ball === 'r' ? 'l' : 'r';
  if(o.anchor === 'r' || o.anchor === 'l') o.anchor = o.anchor === 'r' ? 'l' : 'r';
  return o;
}
const swapName = n => (n[0] === 'l' ? 'r' : n[0] === 'r' ? 'l' : n[0]) + n.slice(1);
// Ganze Keyframe-Liste spiegeln (Pose, Winkelmarken, hervorgehobene Glieder), für Linkshänder. Mit x0 wird auch die Halle
// an der Linie x = x0 gespiegelt (Standort, Fußpunkte, Blickrichtung): Linkshänder auf dem anderen Flügel.
export function mirrorFrames(fr, x0 = null){
  const rx = v => x0 == null ? v : 2*x0 - v;
  return fr.map(f => {
    const p = mirror(f.pose || {});
    if(x0 != null){
      if('x' in p) p.x = rx(p.x);
      if('a' in p) p.a = ((180 - p.a + 540) % 360) - 180;
      for(const k of ['lAt', 'rAt']) if(p[k]) p[k] = [rx(p[k][0]), ...p[k].slice(1)];
    }
    return {...f, pose:p, marks:f.marks?.map(m => ({...m, j:swapName(m.j)})), hl:f.hl?.map(swapName)};
  });
}

// Keyframes → Ablauf. frames: [{t, pose (nur was sich ändert), phase, marks, ease:'lin'}]; die volle Pose erbt vom Vorgänger.
// → (t) => {pose, phase, marks, i}. Zwischen zwei Keyframes weich (smoothstep) oder linear (ease 'lin', z. B. Laufen).
export function track(frames, dur){
  const full = []; let prev = STAND;
  for(const f of frames){ prev = {...prev, ...f.pose}; full.push({...f, pose:prev}); }
  const mixPose = (A, B, k) => {
    const o = {};
    for(const key in B){
      const a = A[key], b = B[key];
      o[key] = typeof b === 'number' && typeof a === 'number' ? a + (b - a)*k
        : Array.isArray(b) && Array.isArray(a) ? b.map((v, i) => a[i] + (v - a[i])*k)
        : k < 0.5 ? a : b;
    }
    return o;
  };
  return t => {
    t = ((t % dur) + dur) % dur;
    let i = 0; while(i < full.length - 1 && full[i+1].t <= t) i++;
    const A = full[i], B = full[i+1];
    if(!B) return {pose:A.pose, phase:A.phase, marks:A.marks || [], i};
    let k = (t - A.t)/(B.t - A.t); if(B.ease !== 'lin') k = k*k*(3 - 2*k);
    return {pose:mixPose(A.pose, B.pose, k), phase:A.phase, marks:A.marks || [], i};
  };
}
