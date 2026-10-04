// Pässe gegen die Wand, reine Logik ohne Browser (Unit-Tests in tests/unit.mjs).
// Gezählt wird der Aufprall an der Wand (Mikrofon, shared/js/bounceDetect.js; ohne Mikro: Wurfbewegung der Kamera).
// Zu jedem Pass wird die Technik im Moment des Abwurfs geprüft: Wurfhand über der Schulter (Schlagwurf) und das
// Gegenbein vorn (Rechtshänder: links vorn, Richtung Wand). Kamera seitlich, die Wand links oder rechts im Bild.

export const TH_P = {
  vThrow: 3.0,     // KL/s: Handgelenk relativ zur Hüfte, ab hier ist es ein Wurf
  armOver: 0.0,    // KL: Handgelenk so weit über der Wurfschulter = Arm oben
  elbow: -0.1,     // KL: Ellbogen höchstens so weit unter der Schulter (DHB: „Ellbogen ist vor dem Ball auf Schulterhöhe“)
  before: 1.0,     // s: so lange vor dem Aufprall wird der Abwurf gesucht
  flight: 0.12,    // s: mindestens so lange fliegt der Ball zur Wand (Abwurf davor)
  gap: 0.5         // s: Kamera-Zählung ohne Mikro: Mindestabstand zweier Würfe
};
const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Abwurf im Fenster [t0, t1]: schnellstes Handgelenk relativ zur Hüfte. frames: [{t, wr, hip, bl, ...}] → Frame oder null.
export function releaseFrame(frames, t0, t1, th = TH_P){
  let best = null, bv = th.vThrow;
  for(let i = 1; i < frames.length; i++){
    const f = frames[i], p = frames[i-1]; if(f.t < t0 || f.t > t1) continue;
    const dt = f.t - p.t; if(dt <= 0) continue;
    const v = d2({x:f.wr.x - f.hip.x, y:f.wr.y - f.hip.y}, {x:p.wr.x - p.hip.x, y:p.wr.y - p.hip.y})/dt/(f.bl || 1);
    if(v > bv){ bv = v; best = f; }
  }
  return best;
}

// Technik eines Passes. frames: [{t, wr, wsh, wel (Ellbogen, optional), hip, lAnk, rAnk, bl}], tHit = Aufprall, wall = 'left' | 'right' (Wand im Bild),
// R = Rechtshänder. → {arm, foot (true/false/null = nicht erkannt), ok, why}
export function judgePass(frames, tHit, wall, R, th = TH_P){
  const f = releaseFrame(frames, tHit - th.before, tHit - th.flight, th);
  if(!f) return {arm:null, foot:null, ok:null, why:'Abwurf nicht gesehen'};
  // Schlagwurf (DHB-Technikkriterien): Hand hinter dem Ball über der Schulter, Ellbogen auf Schulterhöhe.
  const arm = (f.wsh.y - f.wr.y)/f.bl > th.armOver && (f.wel ? (f.wsh.y - f.wel.y)/f.bl >= th.elbow : true);
  // Vorn = näher an der Wand. Wand links: kleineres x ist vorn.
  const front = (wall === 'left') === (f.lAnk.x < f.rAnk.x) ? 'l' : 'r';
  const foot = front === (R ? 'l' : 'r');
  const why = arm && foot ? 'Sauber' : [!arm ? 'Arm unter der Schulter' : '', !foot ? 'Falsches Bein vorn' : ''].filter(Boolean).join(', ');
  return {arm, foot, ok:arm && foot, why, t:f.t};
}

// Kamera-Zählung (ohne Mikro): Würfe = Spitzen der Handgelenk-Geschwindigkeit, mindestens gap s auseinander.
// → Zeitpunkte der Abwürfe.
export function throwsFromPose(frames, th = TH_P){
  const out = [];
  for(let i = 2; i < frames.length - 1; i++){
    const v = k => { const f = frames[k], p = frames[k-1], dt = f.t - p.t; return dt > 0 ? d2({x:f.wr.x - f.hip.x, y:f.wr.y - f.hip.y}, {x:p.wr.x - p.hip.x, y:p.wr.y - p.hip.y})/dt/(f.bl || 1) : 0; };
    const a = v(i);
    if(a >= th.vThrow && a >= v(i-1) && a >= v(i+1) && (!out.length || frames[i].t - out.at(-1) >= th.gap)) out.push(frames[i].t);
  }
  return out;
}

// Zusammenfassung einer Runde. passes = judgePass-Ergebnisse, dur = Dauer (s).
export function summary(passes, dur){
  const n = passes.length, seen = passes.filter(p => p.ok !== null), arm = seen.filter(p => p.arm).length, foot = seen.filter(p => p.foot).length;
  const tips = [];
  if(seen.length && arm < seen.length*0.8) tips.push('Ellbogen auf Schulterhöhe, Hand über der Schulter.');
  if(seen.length && foot < seen.length*0.8) tips.push('Gegenbein vor, Richtung Wand.');
  const say = `Fertig. ${n} Pässe in ${dur} Sekunden.` + (seen.length ? ` ${arm} mit Arm oben, ${foot} mit dem richtigen Bein vorn.` : '') + (tips.length ? ' ' + tips.join(' ') : '');
  return {n, perMin:dur ? Math.round(n*60/dur) : 0, seen:seen.length, arm, foot, tips, say};
}
