// 7-m-Trainer, Pause zwischen den Würfen beim Alleine-Trainieren (ohne Browser, unit-getestet in tests/unit.mjs).
// Der Spieler holt den Ball und meldet sich per Zuruf. Die App hört nur Lautstärke, keine Wörter; was der Ruf heißt,
// entscheidet, wo der Spieler steht (Kamera):
//  - Ruf an der Linie („Ready!“) = bereit, REST.lead s später kommt der Pfiff,
//  - Ruf unterwegs („Pause!“) hält den Zähler an, der nächste Ruf unterwegs lässt ihn weiterlaufen,
//  - ohne Ruf pfeift es, wenn der Zähler abgelaufen ist (30 s / 45 s); bei „Nur Zuruf“ läuft kein Zähler.
// Zwei Rufe kurz hintereinander gehen in der Halle nicht: der Nachhall verbindet sie (unit-getestet), daher der Ort.
// lead: Ruf → Pfiff (s). near: „an der Linie“ = alle Füße hinter der Linie, der vordere höchstens so weit (in KL) davor.
// warn: Ansage „Noch zehn Sekunden“, wenn so viel übrig ist (nur bei Zählern ab 20 s).
export const REST = {lead:1.0, near:0.6, warn:10};
// Auswahl in der Einrichtung: 0 = kurz (feste kurze Pause wie bisher, Einstellung „pause“), -1 = nur Zuruf, sonst Sekunden.
export const REST_MODES = [[0, 'Kurz'], [30, '30 s'], [45, '45 s'], [-1, 'Nur Zuruf']];
export const restLen = mode => mode > 0 ? mode : mode < 0 ? null : undefined;   // undefined = kein Zuruf-Modus

// Zähler, der angehalten und fortgesetzt werden kann. len in s oder null (ohne Zähler, wartet nur auf Zuruf).
export function restClock(len, t0){
  const r = {len, held:false, used:0, from:t0};
  r.left = t => len == null ? null : Math.max(0, len - r.used - (r.held ? 0 : t - r.from));
  r.hold = t => { if(!r.held){ r.used += t - r.from; r.held = true; } };
  r.resume = t => { if(r.held){ r.held = false; r.from = t; } };
  r.done = t => len != null && !r.held && r.left(t) <= 0;
  return r;
}

// Steht der Spieler an der Linie? dists = Abstand der Fußpunkte zur Linie (lineDist, px, + = Richtung Tor), bl = KL in px.
export const nearLine = (dists, bl) => dists.length > 0 && dists.every(d => d < 0) && Math.max(...dists) > -REST.near*bl;

// Was ein Zuruf oder Antippen bewirkt. kind: 'shout' | 'ready' | 'hold' (Tipp-Flächen). armed: Pfiff steht schon an.
// → 'ready' (Pfiff nach REST.lead s) | 'hold' | 'resume' | 'pause' (Pfiff abbrechen, Zähler angehalten) | null.
export function callAction(kind, {armed = false, atLine = false, held = false} = {}){
  if(armed) return kind==='hold' || (kind==='shout' && !atLine) ? 'pause' : null;
  if(kind==='ready' || (kind==='shout' && atLine)) return 'ready';
  return held ? 'resume' : 'hold';
}

// Restzeit für die Anzeige: „0:27“.
export const fmtLeft = s => `${Math.floor(Math.ceil(s)/60)}:${String(Math.ceil(s) % 60).padStart(2, '0')}`;

// Ansage zum Start der Serie, damit der Spieler weiß, wie er sich meldet.
export function restIntro(mode){
  const len = restLen(mode);
  if(len === undefined) return '';
  return (len ? `Zwischen den Würfen ${len} Sekunden zum Ball holen. ` : 'Zwischen den Würfen holst du den Ball. ')
    + 'Stell dich an die Linie und ruf laut, wenn du bereit bist, dann kommt nach einer Sekunde der Pfiff. Rufst du unterwegs, hält der Zähler an.';
}
