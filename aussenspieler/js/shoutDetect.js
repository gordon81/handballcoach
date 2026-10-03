// Ruf-Erkennung aus Pegelwerten, ohne Browser-Abhängigkeiten (läuft auch in Node, siehe tests/unit.mjs).
// Pro Messung (alle STEP ms) kommen zwei Pegel in dB: v = Stimmbereich (200–1200 Hz), hi = hoher
// Bereich (2,5–6 kHz). Ein Ruf
//  - ist im Stimmbereich deutlich lauter als der Grundpegel (sens dB),
//  - bleibt mindestens MIN ms nahe seinem Höchstwert (ein Ballaufprall ist nur ein kurzer Knall mit Nachhall),
//  - dauert höchstens MAX ms (länger = Dauerlärm, z. B. zweite Gruppe in der Halle, Musik),
//  - klingt nach Stimme: Stimmbereich lauter als der hohe Bereich (Schuhquietschen und Pfiffe sind hoch),
//  - kommt aus der Ruhe: davor mindestens CALM ms unter der Schwelle (sonst sind es Spitzen im Dauerlärm).
// Gewertet wird am Ende des Rufs. Bei Dauerlärm zieht der Grundpegel mit, statt auszulösen.
export const SENS = {low:20, mid:14, high:9};
export const STEP = 30, MIN = 120, MAX = 2000, GAP = 1500, CALM = 300, LEARN = 500, PEAK = 8, FLOOR_MIN = -75, SILENT = -150;

export function shoutDetector(){
  const d = {floor:-60, level:-100, thr:-60, n:0, loud:0, strong:0, voice:0, peak:-Infinity, calm:0, calmBefore:0, lastHit:-Infinity, busy:0, noisy:false};
  const reset = () => { d.loud = d.strong = d.voice = 0; d.peak = -Infinity; };
  // → true, wenn mit dieser Messung ein Ruf zu Ende gegangen ist. mute = gerade nicht hören (eigene Ansage).
  d.push = (v, hi, now, sens, mute = false) => {
    if(v < SILENT) return false;   // noch kein Ton (Mikro startet gerade): nicht als Hallenpegel lernen
    d.level = v;
    // Grundpegel: die erste halbe Sekunde Mittelwert.
    if(d.n < LEARN/STEP){ d.floor = d.n ? (d.floor*d.n + v)/(d.n+1) : v; d.n++; d.thr = d.floor + sens; return false; }
    const thr = d.thr = Math.max(d.floor + sens, FLOOR_MIN);
    let hit = false;
    if(mute){ reset(); d.calm = 0; }
    else if(v > thr){
      if(!d.loud) d.calmBefore = d.calm;
      d.calm = 0; d.loud += STEP; d.peak = Math.max(d.peak, v);
      if(v >= d.peak - PEAK) d.strong += STEP;
      if(v > hi) d.voice += STEP;
    } else {
      if(d.loud && d.calmBefore >= CALM && d.strong >= MIN && d.loud <= MAX && d.voice >= 0.6*d.loud && now - d.lastHit > GAP){ d.lastHit = now; hit = true; }
      reset(); d.calm += STEP;
    }
    // Dauerlärm: busy zählt Zeit über der Schwelle, kurze Einbrüche zählen nur zurück (statt alles zu löschen).
    // Ab MAX ms gilt Dauerlärm, bis busy wieder bei 0 ist.
    if(!mute){ d.busy = Math.min(MAX, Math.max(0, d.busy + (v > thr ? STEP : -2*STEP))); d.noisy = d.busy >= MAX || (d.noisy && d.busy > 0); }
    // Grundpegel: nach unten schnell, nach oben langsam; bei Dauerlärm zügig (~1,5 s) bis zum Lärmpegel.
    if(v < d.floor) d.floor += (v - d.floor)*0.05;
    else if(d.noisy && !mute) d.floor += (v - d.floor)*0.02;
    else if(v < thr) d.floor += (v - d.floor)*0.005;
    return hit;
  };
  return d;
}
