// Ballaufprall erkennen (C2), reine Logik ohne Browser (Unit-Tests in tests/unit.mjs). Gegenstück zur Ruf-Erkennung
// (aussenspieler/js/shoutDetect.js): dieselben Pegel alle STEP ms (v = 200–1200 Hz, hi = 2,5–6 kHz, in dB). Ein Aufprall
//  - steigt steil an: in einer Messung mindestens RISE dB über die vorige,
//  - liegt deutlich über dem Grundpegel (sens dB),
//  - ist kurz: höchstens SHORT ms nahe seinem Höchstwert (danach nur Nachhall; ein Ruf bleibt länger oben),
//  - klingt nicht hoch: hi nicht deutlich über v (Pfiff, Schuhquietschen),
//  - und kommt frühestens GAP ms nach dem letzten.
// Gewertet wird, sobald der Pegel wieder deutlich (DROP dB) unter dem Höchstwert liegt.
export const STEP = 30, RISE = 12, SHORT = 90, DROP = 10, PEAK = 6, GAP = 250, LEARN = 500, FLOOR_MIN = -75, SILENT = -150;
export const SENS = {low:22, mid:16, high:11};

export function bounceDetector(){
  const d = {floor:-60, level:-100, thr:-60, n:0, prev:-100, ev:null, lastHit:-Infinity};
  // → true, wenn mit dieser Messung ein Aufprall zu Ende gegangen ist. mute = gerade nicht hören (eigene Ansage, Piep).
  d.push = (v, hi, now, sens, mute = false) => {
    if(v < SILENT) return false;
    d.level = v;
    if(d.n < LEARN/STEP){ d.floor = d.n ? (d.floor*d.n + v)/(d.n+1) : v; d.n++; d.thr = d.floor + sens; d.prev = v; return false; }
    const thr = d.thr = Math.max(d.floor + sens, FLOOR_MIN);
    let hit = false;
    if(mute) d.ev = null;
    else if(!d.ev){
      if(v > thr && v - d.prev >= RISE) d.ev = {peak:v, strong:STEP, high:hi > v + 6};
    } else {
      const e = d.ev;
      if(v > e.peak){ e.peak = v; e.strong = STEP; }
      else if(v >= e.peak - PEAK) e.strong += STEP;
      if(v < e.peak - DROP || v < thr){
        if(e.strong <= SHORT && !e.high && now - d.lastHit > GAP){ d.lastHit = now; hit = true; }
        d.ev = null;
      } else if(e.strong > SHORT) e.strong = Infinity;   // zu lang oben: kein Aufprall (Ruf, Dauerlärm)
    }
    // Grundpegel: nach unten schnell, nach oben langsam (nur außerhalb eines Ereignisses).
    if(!d.ev){ if(v < d.floor) d.floor += (v - d.floor)*0.05; else if(v < thr) d.floor += (v - d.floor)*0.01; else d.floor += (v - d.floor)*0.002; }
    d.prev = v;
    return hit;
  };
  return d;
}
