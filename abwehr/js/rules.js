// Abwehr-Beinarbeit, reine Logik ohne Browser (Unit-Tests in tests/unit.mjs).
// Handy frontal vor dem Spieler. Die App ruft „links“, „rechts“ (aus Sicht des Spielers), „raus“ (Richtung Handy)
// oder „zurück“; gemessen werden Reaktionszeit und Richtung (C5), dazu gekreuzte Füße und die Tiefe der Grundstellung.
// Punkte in Bildpixeln, Längen in Körperlängen (KL = Schulter–Knöchel). Die Kamera blickt den Spieler an: seine linke
// Seite ist im Bild rechts (größeres x), „raus“ macht ihn im Bild größer.

export const TH_D = {
  moveStart: 0.08,   // KL seitlich: ab hier hat er sich bewegt (Reaktion)
  depthStart: 0.05,  // relative Größenänderung (5 %): ab hier hat er sich nach vorn/hinten bewegt
  maxReact: 1.0,     // s: langsamer zählt als nicht geschafft
  window: 1.6,       // s nach dem Ruf wird ausgewertet
  cross: 0.02,       // KL: so weit müssen die Knöchel die Seite tauschen, damit es als gekreuzt zählt
  lowDrop: 0.06,     // KL: so weit muss die Hüfte unter der Stand-Höhe sein, damit die Grundstellung als tief gilt
  lowShare: 0.7      // Anteil der Zeit in tiefer Stellung, ab dem es kein „tiefer“ als Tipp gibt
};
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

// Zusammenfassung einer Runde: results = judgeMove-Ergebnisse, lowShare = Anteil der Zeit in tiefer Grundstellung (0–1).
export function summary(results, lowShare, th = TH_D){
  const n = results.length, ok = results.filter(r => r.ok).length, rs = results.filter(r => r.ok).map(r => r.react);
  const avg = rs.length ? Math.round(rs.reduce((a, b) => a + b, 0)/rs.length*100)/100 : null, crossed = results.filter(r => r.crossed).length;
  const tips = [];
  if(crossed) tips.push(`Füße ${crossed === 1 ? 'einmal' : crossed + ' mal'} gekreuzt. Seitlich nachstellen, nicht kreuzen.`);
  if(lowShare != null && lowShare < th.lowShare) tips.push('Tiefer in die Grundstellung, Knie beugen.');
  const say = `Fertig. ${ok} von ${n} richtig.` + (avg != null ? ` Reaktion im Schnitt ${fmtS(avg)} Sekunden.` : '') + (tips.length ? ' ' + tips.join(' ') : '');
  return {n, ok, avg, crossed, lowShare, tips, say};
}

export const fmtS = s => s == null ? '–' : s.toFixed(2).replace('.', ',');
