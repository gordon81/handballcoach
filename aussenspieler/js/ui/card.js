// Ergebnis-Karte nach jedem Wurf (Prüfungen, Lob, Tipp, Treffer erfassen).
import { store } from '../store.js';
import { $ } from '../dom.js';
import { esc } from '../utils.js';
import { renderLog } from './logView.js';
import { openClip } from './clipView.js';
import { taskRecount } from '../taskRun.js';

let cardTimer = null;
function icon(ok){ return ok===true ? '<span class="ic ok">✓</span>' : ok===false ? '<span class="ic bad">✗</span>' : '<span class="ic mid">•</span>'; }

export function showCard(en){
  const c = $('#card');
  const tk = en.task;
  c.innerHTML = `<h3>Wurf ${en.nr}${en.target ? ', Ziel ' + esc(en.target) : ''}</h3>
    ${tk ? `<p class="taskline ${tk.ok ? 'ok' : 'bad'}">${tk.ok ? '✓ Geschafft' : '✗ Nicht geschafft'}: ${esc(tk.why)}</p>` : ''}
    <ul class="checks">${en.res.map(r => `<li>${icon(r.ok)}<span>${esc(r.txt)}</span></li>`).join('')}</ul>
    ${en.praise ? `<p class="tipline"><span class="ic ok">+</span><span><b>Gut:</b> ${esc(en.praise)}</span></p>` : ''}
    <p class="tipline"><span class="ic mid">➜</span><span><b>Besser:</b> ${en.tip ? esc(en.tip) : 'Nichts Auffälliges, genau so weitermachen.'}</span></p>
    <div class="btnrow"><button data-v ${en.clip ? '' : 'hidden'}>▶︎ Video ansehen</button></div>
    ${en.target ? `<div class="hitrow"><span>Ziel getroffen?</span><button data-h="1">Treffer</button><button class="no" data-h="0">Daneben</button></div>` : ''}`;
  c.querySelectorAll('[data-h]').forEach(b => b.onclick = () => {
    en.hit = b.dataset.h === '1'; taskRecount(en); store(); renderLog();
    c.querySelectorAll('[data-h]').forEach(x => x.classList.toggle('on', x===b));
    clearTimeout(cardTimer); cardTimer = setTimeout(() => c.style.display='none', 1500);
  });
  c.querySelector('[data-v]').onclick = () => { c.style.display = 'none'; openClip(en); };
  c.dataset.nr = en.nr; c.style.display = 'block'; c.scrollTop = 0;
  clearTimeout(cardTimer); cardTimer = setTimeout(() => c.style.display='none', 10000);
}

// Clip wurde nach der Landung gespeichert: Button auf der Karte einblenden, falls sie noch diesen Wurf zeigt.
export function clipReady(en){ const c = $('#card'); if(+c.dataset.nr === en.nr) c.querySelector('[data-v]').hidden = false; }
