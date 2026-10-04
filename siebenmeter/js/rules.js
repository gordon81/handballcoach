// Regeln des 7-m-Wurfs, reine Logik ohne Browser (Unit-Tests in tests/unit.mjs).
// Nach dem Pfiff: Wurf innerhalb von 3 s, kein Fuß auf oder über der 7-m-Linie, ein Fuß bleibt stehen (Standbein).
// Alle Punkte in Bildpixeln; Längen werden in Körperlängen (KL = Schultermitte–Knöchelmitte) gerechnet.

// Grenzen. Bis zum Hallentest Schätzungen (siehe brain.md, Hallentest).
export const TH7 = {
  maxTime: 3.0,     // s vom Pfiff bis zum Abwurf (Regel)
  vThrow: 3.0,      // KL/s: so schnell muss das Handgelenk mindestens sein, damit es als Wurf zählt
  footMove: 0.05,   // KL (~7 cm): so weit darf sich der Bodenpunkt eines Fußes bis zum Abwurf höchstens bewegen
  footLift: 0.05,   // KL: Fuß gilt als abgehoben, wenn er so weit über seiner Höhe beim Pfiff ist
  lineTouch: 0.0,   // KL: Fußspitze/Ferse jenseits der Linienmitte (+ = Richtung Tor) gilt als übertreten
  waitThrow: 4.5    // s nach dem Pfiff: kein Wurf erkannt
};
export const KL_CM = 140;

const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null; };

// Abstand eines Punkts zur Geraden durch die Linie, in Pixeln. + = auf der Seite des Tors.
// line = {a, b, goal} in Pixeln (a, b: Enden der 7-m-Linie, goal: ein Punkt Richtung Tor).
export function lineDist(line, p){
  const {a, b} = line, len = d2(a, b) || 1;
  const cr = q => ((b.x - a.x)*(q.y - a.y) - (b.y - a.y)*(q.x - a.x))/len;
  return cr(p) * Math.sign(cr(line.goal) || 1);
}

// Wurf finden: Frame mit der höchsten Handgelenk-Geschwindigkeit nach dem Pfiff (über vThrow).
// frames = [{t, wr:{x,y}, hip?, bl}], → {t, v} oder null. v in KL/s (Handgelenk relativ zur Hüfte, falls vorhanden).
export function findThrow(frames, t0, th = TH7){
  let best = null;
  for(let i = 1; i < frames.length; i++){
    const f = frames[i], p = frames[i-1]; if(f.t < t0) continue;
    const dt = f.t - p.t; if(dt <= 0) continue;
    // Gegen die Hüfte gemessen: ein Schritt oder Hüpfer des ganzen Körpers ist kein Wurf.
    const rel = (q, h) => h ? {x:q.x - h.x, y:q.y - h.y} : q;
    const v = d2(rel(f.wr, f.hip), rel(p.wr, p.hip))/dt/(f.bl || 1);
    if(v >= th.vThrow && (!best || v > best.v)) best = {t:f.t, v};
  }
  return best;
}
// Ist der Wurf vorbei (Spitze erkannt und das Handgelenk schon wieder deutlich langsamer)? Für den Ablauf im Training.
export function throwDone(frames, t0, th = TH7){
  const w = findThrow(frames, t0, th); if(!w) return false;
  return frames.at(-1).t - w.t >= 0.25;
}

// Bodenpunkt eines Fußes: Mitte von Spitze und Ferse.
const foot = (f, s) => ({x:(f[s+'Toe'].x + f[s+'Heel'].x)/2, y:(f[s+'Toe'].y + f[s+'Heel'].y)/2});

// Einen 7-m-Wurf bewerten.
// frames: [{t, lToe, lHeel, rToe, rHeel, wr, bl}] (Pixel), mit etwas Vorlauf vor dem Pfiff; tw = Zeit des Pfiffs.
// → {ok, issues[], why, say, m:{time, line, foot, lift}}; issues aus 'none' (kein Wurf), 'slow', 'line', 'foot'.
export function judge7(frames, tw, line, th = TH7){
  const before = frames.filter(f => f.t >= tw - 0.4 && f.t <= tw);
  const bl = median(frames.filter(f => f.t >= tw - 0.4).map(f => f.bl)) || 1;
  const w = findThrow(frames, tw, th);
  const end = w ? w.t : tw + th.waitThrow;
  const during = frames.filter(f => f.t >= tw && f.t <= end);
  const issues = [];
  const time = w ? Math.round((w.t - tw)*100)/100 : null;
  if(!w) issues.push('none'); else if(time > th.maxTime) issues.push('slow');

  // Linie: Spitze und Ferse beider Füße vom Pfiff bis zum Abwurf.
  let lineMax = -Infinity;
  if(line) for(const f of during) for(const k of ['lToe', 'lHeel', 'rToe', 'rHeel']) lineMax = Math.max(lineMax, lineDist(line, f[k])/bl);
  if(line && lineMax > th.lineTouch) issues.push('line');

  // Standbein: Bodenpunkt jedes Fußes gegen seine Lage beim Pfiff (Median, gegen Rauschen auch im Verlauf über 3 Frames).
  // Ein Fuß muss stehen bleiben; es zählt der ruhigere.
  let footMin = Infinity, lifted = true;
  for(const s of ['l', 'r']){
    const b0 = before.length ? {x:median(before.map(f => foot(f, s).x)), y:median(before.map(f => foot(f, s).y))} : null;
    if(!b0 || !during.length) continue;
    const pts = during.map(f => foot(f, s));
    const sm = pts.map((p, i) => { const q = pts.slice(Math.max(0, i-1), i+2); return {x:median(q.map(z => z.x)), y:median(q.map(z => z.y))}; });
    const move = Math.max(...sm.map(p => d2(p, b0)))/bl, lift = Math.max(...sm.map(p => b0.y - p.y))/bl > th.footLift;
    if(move < footMin){ footMin = move; lifted = lift; }
  }
  if(footMin === Infinity) footMin = null;
  if(footMin != null && (footMin > th.footMove || lifted)) issues.push('foot');

  const r2 = x => x == null || !isFinite(x) ? null : Math.round(x*100)/100;
  const m = {time, line:r2(lineMax), foot:r2(footMin), lift:footMin != null && lifted};
  const ok = !issues.length;
  return {ok, issues, m, why:ok ? `Sauber, ${fmtS(time)} s` : WHY[issues[0]](m), say:ok ? `Sauber. ${speakS(time)}.` : SAY[issues[0]](m)};
}

export const fmtS = s => s == null ? '–' : s.toFixed(1).replace('.', ',');
const speakS = s => `${fmtS(s)} Sekunden`;
const WHY = {none:() => 'Kein Wurf erkannt', slow:m => `Zu langsam, ${fmtS(m.time)} s`, line:() => 'Linie übertreten', foot:() => 'Standbein bewegt'};
const SAY = {none:() => 'Kein Wurf erkannt.', slow:m => `Zu langsam. ${speakS(m.time)}.`, line:() => 'Linie übertreten.', foot:() => 'Standbein bewegt.'};

// Serie: reps Würfe, geschafft bei goal sauberen.
export const SERIES = {reps:10, goal:8};
export function seriesSpeech(res, n, hits, s = SERIES){
  if(n < s.reps) return `${res.say} Noch ${s.reps - n}.`;
  return `${res.say} ${hits >= s.goal ? `Serie geschafft: ${hits} von ${n}.` : `${hits} von ${n}. Ziel war ${s.goal}.`}`;
}
