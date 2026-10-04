// Treffererkennung (C1), reine Logik ohne Browser (Unit-Tests in tests/unit.mjs). Kamera mit dem Tor im Bild, die Ringe
// sind in der Einrichtung angetippt. Pro Ring kommt pro Videobild ein kleiner Graubild-Ausschnitt (quadratisch, size×size
// Pixel, Ring in der Mitte). Der Ball, der durch den Ring fliegt, verändert das Bild im Kreis deutlich gegenüber dem Bild
// vor dem Wurf. Der Ring mit der stärksten Änderung kurz nach dem Abwurf ist getroffen, wenn die Änderung groß genug ist
// und deutlich größer als bei den anderen Ringen. Grenzen bis zum Hallentest nur im Demo eingestellt (unkalibriert).

export const TH_HIT = {
  diff: 22,        // mittlere Grauwert-Änderung im Kreis, ab der „etwas war im Ring“ zählt (0–255)
  ratio: 1.6,      // so viel stärker als der zweitbeste Ring
  before: [-0.6, -0.05],   // s um den Abwurf: daraus das Vergleichsbild (Median)
  after: [0.05, 1.0]       // s nach dem Abwurf: hier wird gesucht
};

// Kreis-Maske für einen Ausschnitt size×size (Ring = innerer Kreis mit Radius size/2 − 1).
export function circleMask(size){
  const m = new Uint8Array(size*size), c = (size - 1)/2, r2 = (size/2 - 1)**2;
  for(let y = 0; y < size; y++) for(let x = 0; x < size; x++) if((x - c)**2 + (y - c)**2 <= r2) m[y*size + x] = 1;
  return m;
}
// Pixelweiser Median mehrerer gleich großer Ausschnitte.
export function medianImg(imgs){
  const n = imgs[0].length, out = new Uint8Array(n), tmp = new Array(imgs.length);
  for(let i = 0; i < n; i++){ for(let k = 0; k < imgs.length; k++) tmp[k] = imgs[k][i]; tmp.sort((a, b) => a - b); out[i] = tmp[tmp.length >> 1]; }
  return out;
}
// Mittlere absolute Änderung im Kreis.
export function maskDiff(a, b, mask){
  let s = 0, n = 0;
  for(let i = 0; i < a.length; i++) if(mask[i]){ s += Math.abs(a[i] - b[i]); n++; }
  return n ? s/n : 0;
}

// rings = [{name, size, samples:[{t, px:Uint8Array}]}], tRelease = Abwurf (s).
// → {ring (Name oder null), t (Zeitpunkt der stärksten Änderung im getroffenen Ring), scores:[{name, diff, t}]}
export function detectHit(rings, tRelease, th = TH_HIT){
  const scores = rings.map(r => {
    const base = r.samples.filter(s => s.t >= tRelease + th.before[0] && s.t <= tRelease + th.before[1]).map(s => s.px);
    if(base.length < 2) return {name:r.name, diff:0, t:null};
    const bg = medianImg(base), mask = circleMask(r.size);
    let best = 0, bt = null;
    for(const s of r.samples) if(s.t >= tRelease + th.after[0] && s.t <= tRelease + th.after[1]){ const d = maskDiff(s.px, bg, mask); if(d > best){ best = d; bt = s.t; } }
    return {name:r.name, diff:Math.round(best*10)/10, t:bt};
  });
  const sorted = [...scores].sort((a, b) => b.diff - a.diff), top = sorted[0], second = sorted[1]?.diff ?? 0;
  const hit = top && top.diff >= th.diff && top.diff >= th.ratio*second ? top : null;
  return {ring:hit?.name ?? null, t:hit?.t ?? null, scores};
}

// Geschwindigkeit (km/h) aus Entfernung (m) und Flugzeit (s). null, wenn unplausibel (< 0,1 s).
export const speedKmh = (dist, flight) => flight > 0.1 ? Math.round(dist/flight*3.6) : null;
