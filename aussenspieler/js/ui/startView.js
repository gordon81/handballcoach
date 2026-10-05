// Startseite als Ablauf in vier Schritten, bevor die Kamera läuft: 1 Übung, 2 Seite und Wurfhand, 3 Bewegungsablauf mit
// Anleitungsvideo, 4 Handy aufstellen → Kamera starten (dann Einrichtung mit der Linie, dann Training starten).
// „Ändern“ in der Einrichtung öffnet sie wieder über dem Kamerabild.
import { app } from '../state.js';
import { settings, store } from '../store.js';
import { $ } from '../dom.js';
import { esc } from '../../../shared/js/utils.js';
import { CAM_POS, DEMO, RR, TXT } from '../config.js';
import { TASKS } from '../tasks.js';
import { taskKeys, taskName, taskInfo } from '../taskRun.js';
import { openGuide, phasesFor, who } from './guideView.js';
import { openSetup, showSetup } from './setupView.js';

const STEPS = ['Übung', RR ? 'Wurfhand' : 'Seite & Hand', 'Ablauf', 'Kamera'];
let step = 0;

// Kleines Spielfeld von oben: Tor oben, 6-m-Bogen, Punkt auf dem Flügel (aus Sicht des Angreifers).
const court = wing => `<svg viewBox="0 0 80 52" aria-hidden="true" class="mini">
  <line x1="2" y1="4" x2="78" y2="4" stroke="currentColor" stroke-width="1.5" opacity=".6"/>
  <line x1="32" y1="4" x2="48" y2="4" stroke="#d42a2a" stroke-width="4"/>
  <path d="M12 4 A22 22 0 0 0 34 26 L46 26 A22 22 0 0 0 68 4" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".6"/>
  <circle cx="${wing === 'LA' ? 9 : 71}" cy="${30}" r="6" fill="var(--orange)"/>
  <path d="M${wing === 'LA' ? '12 34 L24 30' : '68 34 L56 30'}" stroke="var(--orange)" stroke-width="2"/></svg>`;

const chip = (i, label) => `<button data-a="step" data-v="${i}" class="${i === step ? 'on' : i < step ? 'done' : ''}" aria-current="${i === step ? 'step' : 'false'}"><b>${i < step ? '✓' : i + 1}</b>${label}</button>`;
const opt = (a, v, on, body) => `<button data-a="${a}" data-v="${v}" class="opt ${on ? 'on' : ''}" aria-pressed="${on}">${body}</button>`;

function body(){
  const tk = settings.task || 'free', w = who();
  if(step === 0) return `<h2>Welche Übung?</h2>
    <div class="opts tasks">${taskKeys().map(k => opt('task', k, tk === k, `<b>${esc(taskName(k))}</b><small>${esc(taskInfo(k))}</small>`)).join('')}</div>`;
  if(step === 1) return `<h2>${RR ? 'Deine Wurfhand' : 'Deine Seite und Wurfhand'}</h2>
    ${RR ? '' : `<p class="muted">Seite aus deiner Sicht, mit Blick aufs Tor.</p>
    <div class="opts two">${opt('pos', 'LA', settings.pos !== 'RA', `${court('LA')}<b>Linksaußen</b>`)}${opt('pos', 'RA', settings.pos === 'RA', `${court('RA')}<b>Rechtsaußen</b>`)}</div>`}
    <p class="muted">Mit welcher Hand wirfst du?</p>
    <div class="opts two">${opt('hand', 'R', settings.hand !== 'L', '<b>Rechtshand</b>')}${opt('hand', 'L', settings.hand === 'L', '<b>Linkshand</b>')}</div>
    <div class="who"><div><span>Anlauf</span><b>${w.seq}</b></div><div><span class="leg">Sprungbein</span><b>${w.T}</b></div><div><span class="arm">Wurfarm</span><b>${w.S}</b></div></div>
    ${RR ? '' : `<p class="muted">${w.hard ? `${w.hand} auf ${w.wing}: der Wurfarm ist außen. In der Luft weiter zum Tor aufdrehen, die App rechnet damit.`
      : `${w.hand} auf ${w.wing}: der Wurfarm ist zum Tor hin, die günstige Seite.`}</p>`}`;
  if(step === 2){
    const ph = phasesFor(tk).filter(p => !p.startsWith('✓'));
    return `<h2>So geht’s: ${esc(taskName(tk))}</h2>
    <p class="muted">${w.wing}, ${w.hand}: Sprungbein <b class="leg">${w.T}</b>, Wurfarm <b class="arm">${w.S}</b>.</p>
    <ol class="phases">${ph.map(p => `<li>${esc(p)}</li>`).join('')}</ol>
    <button class="guideBtn bigGuide" data-a="guide">▶ Anleitungsvideo ansehen</button>
    ${DEMO ? '<p class="muted">Im Demo-Modus gibt es kein Anleitungsvideo.</p>' : ''}`;
  }
  const need = TASKS[tk]?.needCam, pos = CAM_POS[need || settings.camPos] || Object.values(CAM_POS)[0];
  return `<h2>Handy aufstellen</h2>
    <ul class="checks">
      <li><span class="ic ok">1</span><span><b>Stativ, erhöht</b> (1,5–2 m).</span></li>
      <li><span class="ic ok">2</span><span><b>${esc(pos.name)}:</b> ${esc(pos.where || '')}</span></li>
      <li><span class="ic ok">3</span><span>Ganzer Körper, ${TXT.line} und Absprungzone im Bild.</span></li>
    </ul>
    ${need ? `<p class="muted">„${esc(taskName(tk))}“ geht nur mit dieser Kameraposition.</p>` : ''}
    <p class="muted">Danach richtest du die ${TXT.line} ein (ablaufen oder antippen) und startest das Training.</p>`;
}

export function renderFlow(){
  const box = $('#flow'); if(!box) return;
  const last = step === STEPS.length - 1, running = app.source !== 'none';
  box.innerHTML = `<nav class="flow-steps" aria-label="Schritte">${STEPS.map((l, i) => chip(i, l)).join('')}</nav>
    <div class="flow-body">${body()}</div>
    <div class="flow-nav">${step ? '<button data-a="prev">Zurück</button>' : ''}${last
      ? `<button class="primaryBtn" data-a="go">${running ? 'Zurück zur Einrichtung' : 'Kamera starten'}</button>`
      : `<button class="primaryBtn" data-a="next">Weiter: ${STEPS[step + 1]}</button>`}</div>`;
}

// Über dem Kamerabild wieder öffnen (aus der Einrichtung: „Ändern“).
export function openFlow(at = 0){ step = at; $('#empty').hidden = false; $('#empty').classList.toggle('over', app.source !== 'none'); renderFlow(); $('#empty').scrollTop = 0; }
export function closeFlow(){ if(app.source !== 'none') $('#empty').hidden = true; }

const ACTIONS = {
  step(el){ step = +el.dataset.v; },
  prev(){ step = Math.max(0, step - 1); },
  next(){ step = Math.min(STEPS.length - 1, step + 1); },
  task(el){ settings.task = el.dataset.v; store(); },
  pos(el){ settings.pos = el.dataset.v; store(); },
  hand(el){ settings.hand = el.dataset.v; store(); },
  guide(){ openGuide(settings.task || 'free'); },
  go(){ if(app.source === 'none') openSetup(); else { closeFlow(); showSetup(false); } }
};

export function initFlow(){
  const box = $('#flow'); if(!box) return;
  box.addEventListener('click', e => {
    const el = e.target.closest('[data-a]'), a = el?.dataset.a;
    if(!ACTIONS[a]) return;
    const before = step; ACTIONS[a](el); renderFlow();
    if(step !== before) $('#empty').scrollTop = 0;
    if(['task', 'pos', 'hand'].includes(a)) document.dispatchEvent(new CustomEvent('awc:who'));
  });
  document.addEventListener('awc:who', () => { if(!$('#empty').hidden) renderFlow(); });
  renderFlow();
}
