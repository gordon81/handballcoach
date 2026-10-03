// Bewertung eines Wurfs: die sechs Technik-Prüfungen und der Sprachtext danach.
import { settings } from './store.js';
import { canvas } from './dom.js';
import { pick, angDiff } from './utils.js';
import { TH } from './config.js';
import { inTorraum, lineOffset, lineCenter } from './line.js';
import { LABEL_GOOD, PRIO, wrongSide, tips } from './feedback.js';

// e = Sprung-Ereignis aus tracking.js, t = Landezeit, H = Frame-Verlauf.
export function evaluate(e, t, H){
  const W = canvas.width, Hh = canvas.height, R = settings.hand==='R';
  const res = [], issues = [], good = [];

  // Übertritt
  let over = null;
  if(settings.line){ const ft = e.tf.foot[e.foot]; over = [ft.toe, ft.heel].some(p => inTorraum({x:p.x/W, y:p.y/Hh})); }
  if(over===null) res.push({ok:null, txt:'Übertritt nicht geprüft (Linie fehlt)'});
  else if(over){ res.push({ok:false, txt:'Übertritt beim Absprung'}); issues.push('over'); }
  else { res.push({ok:true, txt:'Kein Übertritt'}); good.push('over'); }

  // Sprungbein
  const want = R ? 0 : 1, legOk = e.foot === want;
  res.push({ok:legOk, txt:`Absprung mit ${e.foot===0?'links':'rechts'}` + (legOk ? '' : `, richtig wäre ${want===0?'links':'rechts'}`)});
  (legOk ? good : issues).push('leg');

  // Wurfarm beim Absprung
  const a = e.armF, arm = a.wr.y < a.nose.y ? 'high' : a.wr.y < a.wsh.y ? 'mid' : 'low';
  if(arm==='high'){ res.push({ok:true, txt:'Wurfarm beim Absprung oben'}); good.push('arm'); }
  else if(arm==='mid'){ res.push({ok:null, txt:'Wurfarm nur auf Schulterhöhe'}); issues.push('arm'); }
  else { res.push({ok:false, txt:'Wurfarm beim Absprung zu tief'}); issues.push('arm'); }

  // Körperdrehung (Schultern gegen Hüfte, 3D-Schätzung)
  const endT = e.throwF ? e.throwF.t + 0.1 : t;
  const fr = H.filter(h => h.t >= e.t0 && h.t <= endT && h.twist != null);
  let rot = null;
  if(fr.length >= 3){
    const tw = fr.map(h => h.twist);
    rot = Math.round(Math.max(Math.max(...tw) - Math.min(...tw), Math.abs(angDiff(fr.at(-1).shYaw, fr[0].shYaw))));
  }
  const need = wrongSide() ? TH.rotWrongSide : TH.rot;
  if(rot===null) res.push({ok:null, txt:'Körperdrehung nicht messbar'});
  else if(rot >= need){ res.push({ok:true, txt:`Körperdrehung ca. ${rot}°`}); good.push('rot'); }
  else if(rot >= need*0.5){ res.push({ok:null, txt:`Körperdrehung ca. ${rot}°, etwas wenig`}); issues.push('rot'); }
  else { res.push({ok:false, txt:`Kaum Körperdrehung (ca. ${rot}°)`}); issues.push('rot'); }

  // Sprunghöhe (grob)
  const jr = (e.base - e.peak)/e.bl, jump = jr >= TH.jumpHigh ? 'hoch' : jr >= TH.jumpMid ? 'mittel' : 'flach';
  res.push({ok: jump!=='flach', txt:`Sprunghöhe ${jump}`});
  if(jump==='hoch') good.push('jump'); else if(jump==='flach') issues.push('jump');

  // Oberkörper beim Wurf
  const tf = e.throwF || e.peakF || e.tf;
  const lean = Math.atan2(tf.sh.x - tf.hip.x, tf.hip.y - tf.sh.y) * 180/Math.PI, al = Math.abs(lean);
  let dir = 0; if(settings.line){ const l=settings.line, m=lineCenter(l); dir = Math.sign(l.inside.x - m.x); }
  const toward = dir ? Math.sign(lean) === dir : null;
  if(al < TH.leanUpright){ res.push({ok:true, txt:'Oberkörper beim Wurf aufrecht'}); good.push('lean'); }
  else if(toward===true && al > TH.leanForward){ res.push({ok:false, txt:`Oberkörper kippt nach vorn (${Math.round(al)}°)`}); issues.push('lean'); }
  else if(toward===false){ res.push({ok:true, txt:`Rücklage ${Math.round(al)}°`}); good.push('lean'); }
  else if(al > TH.leanStrong) res.push({ok:null, txt:`Starke Neigung ${Math.round(al)}°`});
  else res.push({ok:true, txt:`Leichte Neigung ${Math.round(al)}°`});

  // Rohe Messwerte zum Kalibrieren der Grenzen (KL = Körperlängen; Linie/Arm/Oberkörper: + = Richtung Torraum/über der Nase).
  const r2 = x => x==null ? null : Math.round(x*100)/100;
  const ft = e.tf.foot[e.foot], offs = settings.line ? [ft.toe, ft.heel].map(p => lineOffset({x:p.x/W, y:p.y/Hh})) : null;
  const win = H.filter(h => h.t >= e.t0 - 1 && h.t <= t);
  const m = {line: offs ? r2(Math.max(...offs)*Hh/e.bl) : null, arm:r2((a.nose.y - a.wr.y)/e.bl), rot, jump:r2(jr),
    lean: Math.round(dir ? lean*dir : al), fps: Math.round(win.length/Math.max(0.1, t - (e.t0 - 1)))};

  issues.sort((x,y) => PRIO.indexOf(x) - PRIO.indexOf(y));
  const T = tips(), main = issues[0] || null;
  const praise = good.length ? LABEL_GOOD[pick(good)] : null;
  const speech = [praise ? praise + '.' : '', main ? T[main].short : pick(['Alles sauber!','Top Wurf!','Weiter so!'])].join(' ').trim();
  return {res, issues, good, praise, main, tip: main ? T[main].tip : null, rot, noLine: over===null, speech, m};
}
