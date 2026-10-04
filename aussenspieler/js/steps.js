// Schritte vor dem Absprung (Rückraum-Modus), reine Logik ohne Browser (Unit-Test in tests/unit.mjs).
// H = Frame-Verlauf aus tracking.js ({t, hip, foot[{toe, heel}]}), e = Sprung-Ereignis ({t0, runT, bl}).

// Bodenkontakte vor dem Absprung zählen (Rückraum: Drei-Schritt-Rhythmus). Ein Fuß, der aufsetzt, steht im Bild fast still,
// ein schwingender ist schneller als der Körper. Kontakt = Fuß war „schwingend“ (> 1,3 × Hüft-Tempo) und wird „stehend“
// (< 0,5 × Hüft-Tempo). Das hängt nicht von der Lage des Bodens im Bild ab (die ändert sich beim Anlauf mit der Perspektive).
// Gezählt ab 0,15 s nach der Zielansage (Anlauf), höchstens 2,5 s vor dem Absprung, bis einschließlich zum Aufsetzen des Sprungbeins.
export function countSteps(H, e){
  const from = Math.max(e.t0 - 2.5, (e.runT ?? -Infinity) + 0.15), w = H.filter(h => h.t >= from && h.t <= e.t0);   // erst kurz nach der Ansage
  if(w.length < 6) return null;
  const pt = (h, i) => ({x:(h.foot[i].toe.x + h.foot[i].heel.x)/2, y:(h.foot[i].toe.y + h.foot[i].heel.y)/2});
  const spd = (a, b, pa, pb) => Math.hypot(pb.x - pa.x, pb.y - pa.y)/Math.max(1e-3, b.t - a.t)/e.bl;
  // Zustand je Fuß wechselt erst nach 2 Frames in Folge (gegen Rauschen); mindestens 0,5 KL/s im Nenner, damit beim Stehen nichts zählt.
  const swing = [false, false], cnt = [0, 0]; let n = 0;
  for(let k = 2; k < w.length; k++){
    const a = w[k-2], b = w[k];   // über 2 Frames: weniger Rauschen
    const vb = Math.max(spd(a, b, a.hip, b.hip), 0.5);
    for(let i = 0; i < 2; i++){
      const r = spd(a, b, pt(a, i), pt(b, i))/vb, want = r > 1.3 ? true : r < 0.5 ? false : swing[i];
      if(want !== swing[i]){ if(++cnt[i] >= 2){ swing[i] = want; cnt[i] = 0; if(!want) n++; } } else cnt[i] = 0;
    }
  }
  return n;
}
