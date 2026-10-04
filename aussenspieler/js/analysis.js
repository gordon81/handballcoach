// Bewertung eines Wurfs: die sechs Technik-Prüfungen und der Sprachtext danach.
import { settings, th } from './store.js';
import { canvas } from './dom.js';
import { pick, angDiff } from '../../shared/js/utils.js';
import { inTorraum, lineOffset, lineCenter, lineTangent } from './line.js';
import { LABEL_GOOD, PRIO, wrongSide, tips } from './feedback.js';
import { RR } from './config.js';
import { countSteps } from './steps.js';


// e = Sprung-Ereignis aus tracking.js, t = Landezeit, H = Frame-Verlauf.
export function evaluate(e, t, H){
  const W = canvas.width, Hh = canvas.height, R = settings.hand==='R', TH = th();
  const res = [], issues = [], good = [];

  // Übertritt
  let over = null;
  if(settings.line){ const ft = e.tf.foot[e.foot]; over = [ft.toe, ft.heel].some(p => inTorraum({x:p.x/W, y:p.y/Hh})); }
  if(over===null) res.push({ok:null, txt:RR ? 'Abstand nicht geprüft (Linie fehlt)' : 'Übertritt nicht geprüft (Linie fehlt)'});
  else if(over){ res.push({ok:false, txt:RR ? 'Absprung innerhalb der 9 m' : 'Übertritt beim Absprung'}); issues.push('over'); }
  else { res.push({ok:true, txt:RR ? 'Absprung vor der 9-m-Linie' : 'Kein Übertritt'}); good.push('over'); }

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
  if(RR){ if(rot!==null) res.push({ok:null, txt:`Körperdrehung ca. ${rot}° (zählt im Rückraum nicht)`}); }   // nur zur Info
  else if(rot===null) res.push({ok:null, txt:'Körperdrehung nicht messbar'});
  else if(rot >= need){ res.push({ok:true, txt:`Körperdrehung ca. ${rot}°`}); good.push('rot'); }
  else if(rot >= need*0.5){ res.push({ok:null, txt:`Körperdrehung ca. ${rot}°, etwas wenig`}); issues.push('rot'); }
  else { res.push({ok:false, txt:`Kaum Körperdrehung (ca. ${rot}°)`}); issues.push('rot'); }

  // Rückraum: Schritte vor dem Absprung und Abwurf im höchsten Punkt.
  let steps = null, peakDt = null;
  if(RR){
    steps = countSteps(H, e);
    if(steps===null) res.push({ok:null, txt:'Schritte nicht gezählt'});
    else if(steps===TH.steps){ res.push({ok:true, txt:`${steps} Schritte vor dem Absprung`}); good.push('steps'); }
    else { res.push({ok:null, txt:`${steps} Schritte vor dem Absprung (Dreischritt: ${TH.steps})`}); issues.push('steps'); }
    if(e.throwF && e.peakF){
      peakDt = Math.round((e.throwF.t - e.peakF.t)*100)/100;
      if(Math.abs(peakDt) <= TH.peakDt){ res.push({ok:true, txt:'Abwurf im höchsten Punkt'}); good.push('peak'); }
      else { res.push({ok:false, txt:peakDt < 0 ? 'Abwurf zu früh (noch im Steigen)' : 'Abwurf zu spät (schon im Fallen)'}); issues.push('peak'); }
    }
  }

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
  // Flug Richtung Tormitte (für „Winkel vergrößern“): Winkel zwischen Anlaufrichtung (Hüfte, letzte 0,35 s) und Flug
  // (Hüfte beim Absprung → bei der Landung) im Bild, + = zur Linie hin nach innen (Richtung der Linienpunkte), in Grad.
  // Gegen den Anlauf gemessen, weil im schrägen Kamerabild auch ein gerader Flug ein Stück „entlang der Linie“ aussieht;
  // beides an der Hüfte, weil Absprung- und Landefuß verschiedene Füße sein können.
  const lf = H.filter(h => h.t <= t).at(-1), ft0 = e.tf.foot[e.foot];
  const tan = settings.line ? lineTangent({x:(ft0.toe.x + ft0.heel.x)/2, y:(ft0.toe.y + ft0.heel.y)/2}) : null;
  const run = H.filter(h => h.t >= e.t0 - 0.35 && h.t <= e.t0);
  let flyAng = null;
  if(tan && lf && run.length >= 3){
    const r = {x:run.at(-1).hip.x - run[0].hip.x, y:run.at(-1).hip.y - run[0].hip.y}, f = {x:lf.hip.x - e.tf.hip.x, y:lf.hip.y - e.tf.hip.y};
    const cr = (a, b) => a.x*b.y - a.y*b.x, rl = Math.hypot(r.x, r.y) || 1, fl = Math.hypot(f.x, f.y);
    // Betrag: Winkel zwischen Anlauf und Flug; Vorzeichen: + wenn der Flug weiter nach innen (entlang der Linie) geht als ein gerader.
    const inward = Math.sign((f.x*tan.x + f.y*tan.y) - fl*(r.x*tan.x + r.y*tan.y)/rl) || 1;
    if(fl > 0.1*e.bl) flyAng = Math.round(Math.abs(Math.atan2(cr(r, f), r.x*f.x + r.y*f.y))*180/Math.PI*inward);
  }

  // Handgelenk im Wurf-Frame (für „Wurfhöhe auf Ansage“): über Nase / Wurfschulter / Hüfte, KL (+ = darüber).
  const tw = e.throwF;
  const m = {line: offs ? r2(Math.max(...offs)*Hh/e.bl) : null, arm:r2((a.nose.y - a.wr.y)/e.bl), rot, jump:r2(jr),
    armT: tw ? r2((tw.nose.y - tw.wr.y)/e.bl) : null, shT: tw ? r2((tw.wsh.y - tw.wr.y)/e.bl) : null, hipT: tw ? r2((tw.hip.y - tw.wr.y)/e.bl) : null,
    steps, peakDt, flyAng,
    lean: Math.round(dir ? lean*dir : al), fps: Math.round(win.length/Math.max(0.1, t - (e.t0 - 1))), cam:settings.camPos};

  issues.sort((x,y) => PRIO.indexOf(x) - PRIO.indexOf(y));
  const T = tips(), main = issues[0] || null;
  const praise = good.length ? LABEL_GOOD[pick(good)] : null;
  const speech = [praise ? praise + '.' : '', main ? T[main].short : pick(['Alles sauber!','Top Wurf!','Weiter so!'])].join(' ').trim();
  return {res, issues, good, praise, main, tip: main ? T[main].tip : null, rot, noLine: over===null, speech, m};
}
