// Sprungkraft, reine Logik ohne Browser (Unit-Tests in tests/unit.mjs). Sprünge auf der Stelle, Kamera fest:
// Boden = Fußhöhe beim ruhigen Stehen. Sprung = beide Füße deutlich über dem Boden; Landung = ein Fuß wieder unten.
// Höhe = wie weit die Hüfte über die Stand-Höhe steigt (KL, KL = Schulter–Knöchel), Bodenkontakt = Zeit zwischen
// Landung und nächstem Absprung, Bein = welche Füße in den letzten 0,15 s vor dem Absprung am Boden standen (davor kann
// beim Beinwechsel noch der andere Fuß unten gewesen sein).

export const TH_J = {up:0.05, down:0.03, minAir:0.12};   // KL über dem Boden: in der Luft / wieder unten; s: kürzester Sprung
export const KL_CM = 140;
export const cm = kl => Math.round(kl*KL_CM);

// frame: {t, hipY, lY, rY, bl} – lY/rY = tiefster Punkt des linken/rechten Fußes (Pixel, größer = tiefer im Bild).
// stand: {hipY, ground, bl} aus dem ruhigen Stehen. → Objekt mit push(frame) → fertiger Sprung oder null.
export function jumpTracker(stand, th = TH_J){
  const k = {state:'ground', peak:Infinity, t0:null, lastLand:null, hist:[]};
  k.push = f => {
    const bl = stand.bl, hl = (stand.ground - f.lY)/bl, hr = (stand.ground - f.rY)/bl;
    const lDown = hl < th.down, rDown = hr < th.down, bothUp = hl > th.up && hr > th.up;
    if(k.state === 'ground'){
      k.hist.push({t:f.t, l:lDown, r:rDown}); while(k.hist.length && f.t - k.hist[0].t > 0.3) k.hist.shift();
      if(bothUp){
        const w = k.hist.filter(h => h.t >= f.t - 0.15), l = w.some(h => h.l), r = w.some(h => h.r);
        k.state = 'air'; k.t0 = f.t; k.peak = f.hipY; k.leg = l && r ? 'both' : l ? 'l' : r ? 'r' : null;
      }
      return null;
    }
    k.peak = Math.min(k.peak, f.hipY);
    if((lDown || rDown) && f.t - k.t0 >= th.minAir){
      const j = {t0:k.t0, t1:f.t, height:Math.max(0, (stand.hipY - k.peak)/bl), leg:k.leg, contact:k.lastLand != null ? Math.round((k.t0 - k.lastLand)*100)/100 : null};
      k.state = 'ground'; k.lastLand = f.t; k.hist = [];
      return j;
    }
    return null;
  };
  return k;
}

const avg = a => a.length ? a.reduce((x, y) => x + y, 0)/a.length : null;
// Zusammenfassung. jumps = gezählte Sprünge; ex = 'both' (beidbeinig) oder 'single' (je Bein); prev = letzte Runde derselben Übung.
export function summary(jumps, ex, prev = null){
  const h = jumps.map(j => j.height), c = jumps.map(j => j.contact).filter(x => x != null);
  const out = {n:jumps.length, avg:avg(h), best:h.length ? Math.max(...h) : null, contact:avg(c)};
  const parts = [];
  if(ex === 'single'){
    const L = avg(jumps.filter(j => j.leg === 'l').map(j => j.height)), R = avg(jumps.filter(j => j.leg === 'r').map(j => j.height));
    out.left = L; out.right = R;
    if(L != null && R != null){
      const diff = Math.round(Math.abs(L - R)/Math.max(L, R)*100);
      parts.push(`Links ${cm(L)}, rechts ${cm(R)} Zentimeter.`);
      if(diff >= 10) parts.push(`${L > R ? 'Links' : 'Rechts'} ${diff} Prozent stärker, das schwächere Bein extra trainieren.`);
      else parts.push('Beide Beine ähnlich stark.');
    }
  } else if(out.avg != null) parts.push(`Im Schnitt ${cm(out.avg)} Zentimeter, bester ${cm(out.best)}.`);
  if(out.contact != null) parts.push(`Bodenkontakt ${out.contact.toFixed(2).replace('.', ',')} Sekunden.`);
  if(prev?.avg != null && out.avg != null){
    const d = cm(out.avg) - cm(prev.avg);
    parts.push(d > 0 ? `${d} Zentimeter mehr als letztes Mal.` : d < 0 ? `${-d} Zentimeter weniger als letztes Mal.` : 'Gleich wie letztes Mal.');
  }
  out.say = `Fertig. ${out.n} Sprünge. ` + parts.join(' ');
  return out;
}
