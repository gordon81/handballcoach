// Ballaufprall erkennen (C2), reine Logik ohne Browser (Unit-Tests in tests/unit.mjs). Eingang alle STEP ms aus
// shared/js/mic.js: pk = lautester 5-ms-Abschnitt und lvl = Mittelpegel der letzten ~85 ms (dBFS), hi/v = Pegel im hohen
// Bereich und im Stimmbereich (dB). Ein Aufprall
//  - ist ein Knall: pk mindestens CREST dB über lvl, und zwar in mindestens 2 Messungen hintereinander (der kurze Knall liegt
//    in mehreren Zeitfenstern; der Anfang eines Rufs nur in einem). Rauschen und Hallenlärm haben ~6 dB, Aufpralle ~12 dB,
//  - ist deutlich lauter als der Grundpegel (sens dB, auf pk),
//  - klingt nicht hoch: hi nicht deutlich über v (Pfiff, Schuhquietschen),
//  - und kommt frühestens GAP ms nach dem letzten.
// Derselbe Knall liegt in 2–3 Messungen (das Zeitfenster ist länger als STEP); gezählt wird einmal, wenn er vorbei ist.
export const STEP = 30, CREST = 9.5, GAP = 250, LEARN = 500, FLOOR_MIN = -80, SILENT = -150;
export const SENS = {low:24, mid:18, high:12};

export function bounceDetector(){
  const d = {floor:-60, level:-100, thr:-60, n:0, ev:null, lastHit:-Infinity};
  // → true, wenn mit dieser Messung ein Aufprall zu Ende gegangen ist. mute = gerade nicht hören (eigene Ansage, Piep).
  d.push = (v, hi, now, sens, mute = false, pk = v, lvl = v) => {
    if(lvl < SILENT) return false;
    d.level = pk;
    if(d.n < LEARN/STEP){ d.floor = d.n ? (d.floor*d.n + lvl)/(d.n+1) : lvl; d.n++; d.thr = d.floor + sens; return false; }
    const thr = d.thr = Math.max(d.floor + sens, FLOOR_MIN);
    const knall = pk > thr && pk - lvl >= CREST && !(hi > v + 6);
    let hit = false;
    if(mute) d.ev = null;
    else if(knall){ d.ev ??= {n:0}; d.ev.n++; }
    else if(d.ev){ if(d.ev.n >= 2 && now - d.lastHit > GAP){ d.lastHit = now; hit = true; } d.ev = null; }
    // Grundpegel (Mittelpegel): nach unten schnell, nach oben langsam.
    if(lvl < d.floor) d.floor += (lvl - d.floor)*0.05; else d.floor += (lvl - d.floor)*(lvl < thr ? 0.01 : 0.002);
    return hit;
  };
  return d;
}
