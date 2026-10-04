// Abschlussbericht: als Text teilen oder als eigenständige HTML-Datei.
import { settings, sessionEntries } from './store.js';
import { showHint } from './dom.js';
import { esc, fmtDate } from '../../shared/js/utils.js';
import { LABEL_BAD, LABEL_GOOD, tips } from './feedback.js';
import { summarize, profileText, measures, MEASURE_HELP, LIMITS_TEXT } from './summary.js';
import { sessionRuns } from './taskRun.js';

function reportName(){ const d = new Date(settings.session?.start || Date.now()); return `Wurfbericht-${d.toISOString().slice(0,10)}.html`; }

export function reportText(){
  const list = sessionEntries(); if(!list.length) return null;
  const s = summarize(list), T = tips(), L = [];
  L.push(`Außenwurf-Training vom ${fmtDate(new Date(settings.session.start))}`, profileText());
  L.push(`Würfe: ${s.n}, Technik sauber: ${s.clean} (${Math.round(s.clean/s.n*100)} %)`);
  if(s.rotAvg!=null) L.push(`Körperdrehung im Schnitt: ca. ${s.rotAvg}°`);
  const runs = sessionRuns();
  if(runs.length){ L.push('', 'Aufgaben:'); runs.forEach(r => L.push(`- ${r.name}: ${r.label}${r.goal != null ? ` (Ziel ${r.goal})` : ''} ${r.passed ? 'geschafft' : 'nicht geschafft'}`)); }
  if(s.strengths.length) L.push('', 'Stärken: ' + s.strengths.map(k => LABEL_GOOD[k]).join(', '));
  if(s.top.length){
    L.push('', 'Schwerpunkte fürs nächste Training:');
    s.top.slice(0,3).forEach(([k,c],i) => L.push(`${i+1}. ${LABEL_BAD[k]} (${c}×)`, `   Tipp: ${T[k].tip}`, `   Übung: ${T[k].drill}`));
  } else L.push('', 'Keine Technikfehler erkannt. Weiter so!');
  const keys = Object.keys(s.byT);
  if(keys.length){ L.push('', 'Ziele:'); keys.forEach(k => { const b = s.byT[k]; L.push(`- ${k}: ${b.n} Würfe, Technik ok ${b.clean}/${b.n}` + (b.rated ? `, Treffer ${b.hit}/${b.rated}` : '')); }); }
  L.push('', 'Erstellt mit Außenwurf-Coach');
  return L.join('\n');
}

export function reportHTML(){
  const list = sessionEntries(); if(!list.length) return null;
  const s = summarize(list), T = tips(), runs = sessionRuns();
  const focus = s.top.length ? s.top.slice(0,3).map(([k,c]) => `<li><b>${LABEL_BAD[k]}</b> (${c}×)<br>Tipp: ${esc(T[k].tip)}<br><span class="m">Übung: ${esc(T[k].drill)}</span></li>`).join('') : '<li>Keine Technikfehler erkannt. Weiter so!</li>';
  const targets = Object.keys(s.byT).map(k => { const b = s.byT[k]; return `<tr><td>${esc(k)}</td><td>${b.n}</td><td>${b.clean}/${b.n}</td><td>${b.rated ? b.hit+'/'+b.rated : '–'}</td></tr>`; }).join('');
  const mrows = list.filter(e => e.m).map(e => { const s = measures(e.m); return `<tr><td>${e.nr}</td><td>${s.cam}</td><td>${s.line}</td><td>${s.arm}</td><td>${s.rot}</td><td>${s.jump}</td><td>${s.lean}</td><td>${s.fps}</td><td>${s.call}</td></tr>`; }).join('');
  const rows = list.map(e => `<tr><td>${e.nr}</td><td>${esc(e.target || '–')}</td><td>${e.hit===true?'✓':e.hit===false?'✗':'–'}</td><td>${esc(e.praise || '–')}</td><td>${e.main ? esc(LABEL_BAD[e.main]) : 'sauber'}</td><td>${e.task ? (e.task.ok ? '✓ ' : '✗ ') + esc(e.task.why) : '–'}</td></tr>`).join('');
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wurfbericht</title>
<style>body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;max-width:720px;margin:24px auto;padding:0 16px;color:#1b2530;line-height:1.5}
h1{margin:0}h2{margin-top:28px;padding-bottom:4px;border-bottom:3px solid #ff8a1f}.m{color:#5b6b7b}
table{width:100%;border-collapse:collapse;font-size:.92rem}td,th{border-bottom:1px solid #dde3e9;padding:6px 4px;text-align:left}li{margin-bottom:10px}</style></head><body>
<h1>Außenwurf-Training</h1><p class="m">${fmtDate(new Date(settings.session.start))}, ${profileText()}</p>
<p><b>${s.n}</b> Würfe, Technik sauber <b>${s.clean}</b> (${Math.round(s.clean/s.n*100)} %)${s.rotAvg!=null ? `, Körperdrehung im Schnitt ca. ${s.rotAvg}°` : ''}</p>
${runs.length ? `<h2>Aufgaben</h2><table><tr><th>Aufgabe</th><th>Ergebnis</th><th>Ziel</th><th></th></tr>${runs.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.label)}</td><td>${r.goal ?? '–'}</td><td>${r.passed ? '✓ geschafft' : 'nicht geschafft'}</td></tr>`).join('')}</table>` : ''}
${s.strengths.length ? `<h2>Stärken</h2><p>${s.strengths.map(k => LABEL_GOOD[k]).join(', ')}</p>` : ''}
<h2>Schwerpunkte fürs nächste Training</h2><ol>${focus}</ol>
${targets ? `<h2>Ziele</h2><table><tr><th>Ziel</th><th>Würfe</th><th>Technik ok</th><th>Treffer</th></tr>${targets}</table>` : ''}
<h2>Alle Würfe</h2><table><tr><th>Nr</th><th>Ziel</th><th>Treffer</th><th>Gut</th><th>Verbessern</th><th>Aufgabe</th></tr>${rows}</table>
${mrows ? `<h2>Messwerte</h2><p class="m">Zum Einstellen der Grenzen nach dem Hallentest. ${esc(MEASURE_HELP)}<br>${esc(LIMITS_TEXT())}</p>
<table><tr><th>Nr</th><th>Kamera</th><th>Linie</th><th>Arm</th><th>Drehung</th><th>Sprung</th><th>Oberkörper</th><th>fps</th><th>Ansage</th></tr>${mrows}</table>` : ''}
<p class="m" style="margin-top:24px">Erstellt mit Außenwurf-Coach. Werte sind KI-Schätzungen aus einer Handykamera.</p></body></html>`;
}

function downloadReport(){
  const html = reportHTML(); if(!html){ showHint('Noch keine Würfe in diesem Training', 2500); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], {type:'text/html'}));
  a.download = reportName(); document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
export async function shareText(){
  const text = reportText(); if(!text){ showHint('Noch keine Würfe in diesem Training', 2500); return; }
  if(navigator.share){ try{ await navigator.share({title:'Wurfbericht', text}); return; }catch(e){ if(e.name==='AbortError') return; } }
  try{ await navigator.clipboard.writeText(text); showHint('Bericht in die Zwischenablage kopiert', 2500); }catch(e){ downloadReport(); }
}
export async function shareFile(){
  const html = reportHTML(); if(!html){ showHint('Noch keine Würfe in diesem Training', 2500); return; }
  const file = new File([html], reportName(), {type:'text/html'});
  if(navigator.canShare?.({files:[file]})){ try{ await navigator.share({files:[file], title:'Wurfbericht'}); return; }catch(e){ if(e.name==='AbortError') return; } }
  downloadReport();
}
