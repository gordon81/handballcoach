// Ansicht „Training“: Zusammenfassung, Schwerpunkte, Ziele und alle Würfe.
import { settings, sessionEntries } from '../store.js';
import { $ } from '../dom.js';
import { esc, colorOf, fmtDate } from '../utils.js';
import { LABEL_BAD, LABEL_GOOD, tips } from '../feedback.js';
import { summarize, profileText, measureText, MEASURE_HELP } from '../summary.js';
import { sessionRuns } from '../taskRun.js';

export function renderLog(){
  const list = sessionEntries(), box = $('#logBody');
  if(!list.length){ box.innerHTML = '<p class="muted">In diesem Training noch keine Würfe.</p>'; return; }
  const s = summarize(list), T = tips();
  let h = `<p class="muted">${fmtDate(new Date(settings.session.start))}, ${profileText()}<br>${s.n} Würfe, Technik sauber ${s.clean}/${s.n}${s.rotAvg!=null ? `, Drehung im Schnitt ca. ${s.rotAvg}°` : ''}</p>`;
  const runs = sessionRuns();
  if(runs.length) h += `<h3>Aufgaben</h3>` + runs.map(r => `<div class="entry"><b>${esc(r.name)}</b> ${r.hits} von ${r.n} <small>(Ziel ${r.goal}) ${r.passed ? '✓ geschafft' : 'nicht geschafft'}</small></div>`).join('');
  if(s.strengths.length) h += `<h3>Stärken</h3><p>${s.strengths.map(k => LABEL_GOOD[k]).join(', ')}</p>`;
  if(s.top.length) h += `<h3>Daran arbeiten</h3>` + s.top.slice(0,3).map(([k,c]) =>
    `<div class="entry"><b>${LABEL_BAD[k]}</b> <small>${c}×</small><br>${esc(T[k].tip)}<br><small>Übung: ${esc(T[k].drill)}</small></div>`).join('');
  const keys = Object.keys(s.byT);
  if(keys.length) h += `<h3>Ziele</h3><div class="stats"><div class="muted">Ziel</div><div class="muted">Technik ok</div><div class="muted">Treffer</div>
    ${keys.map(k => `<div style="color:${colorOf(k)}">${esc(k)}</div><div>${s.byT[k].clean}/${s.byT[k].n}</div><div>${s.byT[k].rated ? s.byT[k].hit+'/'+s.byT[k].rated : '–'}</div>`).join('')}</div>`;
  h += `<h3>Würfe</h3>` + [...list].reverse().map(e => {
    const hit = e.hit===true ? ', Treffer' : e.hit===false ? ', daneben' : '';
    return `<div class="entry">${e.clip ? `<button class="vbtn" data-clip="${e.time}">▶︎ Video</button>` : ''}<b>Wurf ${e.nr}</b> ${e.target ? `<span style="color:${colorOf(e.target)}">${esc(e.target)}</span>` : ''}<small>${hit}</small>${e.task ? ` <small class="${e.task.ok ? 'tok' : 'tbad'}">· Aufgabe ${e.task.ok ? '✓' : '✗'} ${esc(e.task.why)}</small>` : ''}<br>
      <small>${e.praise ? 'Gut: ' + esc(e.praise) + '. ' : ''}${e.main ? 'Besser: ' + esc(LABEL_BAD[e.main]) : 'Alles sauber'}</small>${e.m ? `<br><small class="meas">${esc(measureText(e.m))}</small>` : ''}</div>`;
  }).join('');
  if(list.some(e => e.m)) h += `<p class="muted"><small>Messwerte: ${esc(MEASURE_HELP)}</small></p>`;
  box.innerHTML = h;
}
