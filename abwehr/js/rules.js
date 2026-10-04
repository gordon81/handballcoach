// Abwehr-Beinarbeit, reine Logik ohne Browser (Unit-Tests in tests/unit.mjs).
// Handy frontal vor dem Spieler, das Handy steht für den Angreifer. Die App ruft „links“, „rechts“ (aus Sicht des Spielers),
// „raus“ (zum Angreifer heraustreten) oder „zurück“; gemessen werden Reaktionszeit und Richtung (C5), gekreuzte Füße und
// die Stellung nach den Technikkriterien des DHB für das 1-gegen-1 (Bundeseinheitliche Landeskaderkriterien des DHB,
// Abschnitt 3.3.6, nach der C-Lizenz-Ausbildung):
//  - Grundposition: Oberkörper fast aufrecht, Körperschwerpunkt abgesenkt (Hüfte und Knie gebeugt), Parallelstellung,
//    Beine etwas mehr als schulterbreit, Arme leicht angewinkelt in Vorhalte.
//  - Gegner in Wurfauslage (hier: nach „raus“): versetzte Fußstellung mit dem Fuß auf der Wurfarmseite des Angreifers vorn,
//    „Führarm“ an seinen Wurfarm (vordere Hand etwa auf Schulterhöhe), „Sicherungsarm“ an seinen Oberkörper.
//    Gegen einen Rechtshänder ist das (dem Angreifer gegenüber) der linke Fuß und die linke Hand, gegen einen Linkshänder
//    der rechte Fuß und die rechte Hand.
// Punkte in Bildpixeln, Längen in Körperlängen (KL = Schulter–Knöchel). Die Kamera blickt den Spieler an: seine linke
// Seite ist im Bild rechts (größeres x), „raus“ macht ihn im Bild größer.

export const TH_D = {
  moveStart: 0.08,   // KL seitlich: ab hier hat er sich bewegt (Reaktion)
  depthStart: 0.05,  // relative Größenänderung (5 %): ab hier hat er sich nach vorn/hinten bewegt
  maxReact: 1.0,     // s: langsamer zählt als nicht geschafft
  window: 1.6,       // s nach dem Ruf wird ausgewertet
  cross: 0.02,       // KL: so weit müssen die Knöchel die Seite tauschen, damit es als gekreuzt zählt
  lowDrop: 0.06,     // KL: so weit muss die Hüfte unter der Stand-Höhe sein, damit die Grundstellung als tief gilt
  lowShare: 0.7,     // Anteil der Zeit in tiefer Stellung, ab dem es kein „tiefer“ als Tipp gibt
  // Grundposition und Heraustreten (alle unkalibriert, im Demo eingestellt):
  wide: 1.1,         // Fußabstand / Schulterbreite: „etwas mehr als schulterbreit“
  upright: 0.85,     // Oberkörper (Schulter–Hüfte im Bild) mindestens so viel der Länge im Stand: „fast aufrecht“
  armsShare: 0.7,    // Anteil der Zeit, in der die Hände vorn zwischen Hüft- und Schulterhöhe sind
  stagger: 0.03,     // KL: so viel tiefer im Bild steht der vordere Fuß (näher zur Kamera) bei versetzter Fußstellung
  leadArm: -0.08,    // KL: Handgelenk des Führarms höchstens so weit unter der eigenen Schulter („auf Schulterhöhe“)
  shareOk: 0.7       // ab diesem Anteil gilt ein Merkmal der Grundposition als gehalten
};
// Wurfarmseite des Angreifers aus Sicht des Abwehrspielers: Rechtshänder → links, Linkshänder → rechts.
export const leadSide = opp => opp === 'L' ? 'r' : 'l';
export const SIDE = {l:'linke', r:'rechte'}, SIDE_SAY = {l:'linker', r:'rechter'};
export const CMDS = ['links', 'rechts', 'raus', 'zurück'];
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null; };

// Eine Bewegung auf den Ruf bewerten. frames: [{t, hip, bl, lAnk, rAnk}] mit Vorlauf; tc = Zeitpunkt des Rufs;
// lag = bekannte Verzögerung der Sprachausgabe (s), wird von der Reaktionszeit abgezogen.
// → {ok, react (s oder null), dir (erkannte Richtung oder null), crossed, why, say}
export function judgeMove(frames, tc, cmd, th = TH_D, lag = 0){
  const before = frames.filter(f => f.t >= tc - 0.3 && f.t <= tc), after = frames.filter(f => f.t > tc && f.t <= tc + th.window);
  if(!before.length || !after.length) return {ok:false, react:null, dir:null, crossed:false, why:'Nicht im Bild', say:'Nicht im Bild.'};
  const x0 = median(before.map(f => f.hip.x)), b0 = median(before.map(f => f.bl));
  const lat = f => (f.hip.x - x0)/b0, dep = f => (f.bl - b0)/b0;
  // Reaktion: erster Frame über einer der Schwellen. Richtung: was zuerst deutlich (doppelte Schwelle) wird, sonst das Größere am Ende.
  const start = after.find(f => Math.abs(lat(f)) > th.moveStart || Math.abs(dep(f)) > th.depthStart);
  // Zeitpunkt: der Beginn dieser Bewegung (halbe Schwelle). Vor/zurück ändert die Größe im Bild langsamer als seitlich die Lage,
  // mit der vollen Schwelle käme die Reaktion dort später heraus.
  const onset = start && after.find(f => f.t <= start.t && (Math.abs(lat(f)) > th.moveStart/2 || Math.abs(dep(f)) > th.depthStart/2));
  const react = start ? Math.max(0, Math.round((onset.t - tc - lag)*100)/100) : null;
  let dir = null;
  const clear = after.find(f => Math.abs(lat(f)) > 2*th.moveStart || Math.abs(dep(f)) > 2*th.depthStart) || after.at(-1);
  if(start){
    const l = lat(clear)/th.moveStart, d = dep(clear)/th.depthStart;
    dir = Math.abs(l) >= Math.abs(d) ? (l > 0 ? 'links' : 'rechts') : (d > 0 ? 'raus' : 'zurück');
  }
  // Gekreuzt: linker Knöchel liegt normal im Bild rechts vom rechten; tauschen sie deutlich die Seite → gekreuzt.
  const s0 = Math.sign(median(before.map(f => f.lAnk.x - f.rAnk.x)) || 1);
  const crossed = after.some(f => (f.lAnk.x - f.rAnk.x)*s0 < -th.cross*b0);
  const ok = dir === cmd && react != null && react <= th.maxReact;
  const why = !start ? 'Keine Bewegung' : dir !== cmd ? `Falsche Richtung (${dir})` : react > th.maxReact ? `Zu langsam (${fmtS(react)} s)` : `${fmtS(react)} s`;
  return {ok, react, dir, crossed, why, say: ok ? '' : !start ? 'Los!' : dir !== cmd ? 'Falsch.' : 'Schneller.'};
}

// Stellung nach „raus“: frames [{t, lAnk, rAnk, lSh, rSh, lWr, rWr, bl}] (Pixel), ausgewertet am Ende des Heraustretens
// (t0…t1, z. B. 0,4 s nach der Reaktion bis Fensterende). opp = 'R' | 'L' (Wurfhand des Angreifers).
// → {foot, arm (true/false/null), why, say}
export function judgeOut(frames, t0, t1, opp, th = TH_D){
  const w = frames.filter(f => f.t >= t0 && f.t <= t1);
  if(w.length < 3) return {foot:null, arm:null, why:'Stellung nicht gesehen', say:''};
  const lead = leadSide(opp), other = lead === 'l' ? 'r' : 'l';
  const fwd = median(w.map(f => (f.lAnk.y - f.rAnk.y)/f.bl));   // + = linker Fuß tiefer im Bild = näher am Angreifer
  const front = Math.abs(fwd) < th.stagger ? null : fwd > 0 ? 'l' : 'r';
  const hi = sd => median(w.map(f => (f[sd+'Sh'].y - f[sd+'Wr'].y)/f.bl));   // + = Hand über der Schulter
  const foot = front === lead, arm = hi(lead) >= th.leadArm && hi(lead) > hi(other) + 0.05;
  const why = foot && arm ? `Richtig: ${SIDE[lead]} Seite vorn` : [!foot ? (front ? 'Falscher Fuß vorn' : 'Füße nicht versetzt') : '', !arm ? 'Führarm nicht am Wurfarm' : ''].filter(Boolean).join(', ');
  const say = foot && arm ? '' : !foot ? `${SIDE_SAY[lead][0].toUpperCase() + SIDE_SAY[lead].slice(1)} Fuß vor.` : `${SIDE[lead][0].toUpperCase() + SIDE[lead].slice(1)} Hand hoch zum Wurfarm.`;
  return {foot, arm, front, why, say};
}

// Grundposition in einem Bild: {wide, arms, upright} (true/false). stand = {torso} aus dem aufrechten Stand (Schulter–Hüfte, px).
export function baseFrame(f, stand, th = TH_D){
  const shW = Math.abs(f.lSh.x - f.rSh.x) || 1, ftW = Math.abs(f.lAnk.x - f.rAnk.x);
  const shY = (f.lSh.y + f.rSh.y)/2, torso = f.hip.y - shY;
  const armIn = sd => f[sd+'Wr'].y >= f[sd+'Sh'].y - 0.12*f.bl && f[sd+'Wr'].y <= f.hip.y;   // Hand zwischen Schulter und Hüfte
  return {wide:ftW/shW >= th.wide, arms:armIn('l') && armIn('r'), upright:!stand?.torso || torso >= th.upright*stand.torso};
}

// Nächster Ruf: zurück zur Mitte, wenn er schon weit weg ist; sonst zufällig, nicht dreimal dasselbe.
// off = seitlicher Abstand zur Startposition (KL, + = im Bild rechts), dep = Größenänderung (+ = näher).
export function nextCmd(off, dep, last = [], rnd = Math.random){
  if(off > 0.45) return 'rechts';
  if(off < -0.45) return 'links';
  if(dep > 0.1) return 'zurück';
  if(dep < -0.1) return 'raus';
  let c = CMDS.filter(k => !(last.length >= 2 && last.at(-1) === k && last.at(-2) === k));
  if(off > 0.2) c = c.filter(k => k !== 'links');
  if(off < -0.2) c = c.filter(k => k !== 'rechts');
  return c[Math.floor(rnd()*c.length)];
}

// Zusammenfassung einer Runde: results = judgeMove-Ergebnisse (bei „raus“ mit out = judgeOut), lowShare = Anteil der Zeit
// in tiefer Grundposition (0–1), base = Anteile {wide, arms, upright} der Grundposition (0–1) oder null.
export function summary(results, lowShare, th = TH_D, base = null){
  const n = results.length, ok = results.filter(r => r.ok).length, rs = results.filter(r => r.ok).map(r => r.react);
  const avg = rs.length ? Math.round(rs.reduce((a, b) => a + b, 0)/rs.length*100)/100 : null, crossed = results.filter(r => r.crossed).length;
  const tips = [];
  if(crossed) tips.push(`Füße ${crossed === 1 ? 'einmal' : crossed + ' mal'} gekreuzt. Seitlich nachstellen, nicht kreuzen.`);
  if(lowShare != null && lowShare < th.lowShare) tips.push('Körperschwerpunkt tiefer, Hüfte und Knie beugen.');
  if(base?.wide != null && base.wide < th.shareOk) tips.push('Beine etwas mehr als schulterbreit.');
  if(base?.upright != null && base.upright < th.shareOk) tips.push('Oberkörper fast aufrecht lassen.');
  if(base?.arms != null && base.arms < th.shareOk) tips.push('Arme leicht angewinkelt vor den Körper.');
  const outs = results.filter(r => r.out && r.out.foot !== null);
  const outOk = outs.filter(r => r.out.foot && r.out.arm).length;
  if(outs.length && outOk < outs.length) tips.push('Beim Heraustreten den Fuß auf der Wurfarmseite des Gegners vorn und die Hand an seinen Wurfarm.');
  const say = `Fertig. ${ok} von ${n} richtig.` + (avg != null ? ` Reaktion im Schnitt ${fmtS(avg)} Sekunden.` : '')
    + (outs.length ? ` Heraustreten ${outOk} von ${outs.length} mit richtiger Stellung.` : '') + (tips.length ? ' ' + tips.join(' ') : '');
  return {n, ok, avg, crossed, lowShare, base, out:outs.length ? {n:outs.length, ok:outOk} : null, tips, say};
}

export const fmtS = s => s == null ? '–' : s.toFixed(2).replace('.', ',');
