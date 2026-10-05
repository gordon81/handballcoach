// Browser-Test (Playwright, Demo-Modus): 7-m-Trainer, Pause zwischen den Würfen mit Zuruf (siebenmeter/js/rest.js).
// Die Demo-Person holt nach jedem Wurf den Ball und ruft (demo.js, REST_VARS): an der Linie (bereit) |
// unterwegs anhalten, unterwegs weiter, an der Linie bereit | gar nicht (Zähler 30 s läuft ab).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serve } from './server.mjs';

let srv, browser;
before(async () => { srv = await serve(); browser = await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); });
after(async () => { await browser?.close(); srv?.close(); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(page, fn, ms, what){
  const t0 = Date.now();
  while(Date.now() - t0 < ms){ if(await page.evaluate(fn)) return; await sleep(200); }
  throw new Error('Zeit abgelaufen: ' + what);
}

test('7-m-Trainer (Demo): Pause 30 s mit Zuruf – bereit an der Linie, anhalten unterwegs, Zähler läuft ab', {timeout:180000}, async () => {
  const page = await browser.newPage({viewport:{width:390, height:800}});
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if(m.type()==='error') errors.push(m.text()); });
  await page.addInitScript(() => { window.__said = []; localStorage.clear(); localStorage.setItem('7m-demo-settings', JSON.stringify({pause:1, rest:30})); });
  await page.goto(srv.url + 'siebenmeter/?demo=1');
  await page.evaluate(async () => {
    window.M = {st:await import('/siebenmeter/js/state.js'), rules:await import('/siebenmeter/js/rules.js'), demo:await import('/siebenmeter/js/demo.js')};
    M.demo.resetDemo?.(); M.rules.SERIES.reps = 4; M.rules.SERIES.goal = 2;
    // Zustandswechsel mit Zeit mitschreiben, dazu ob der Zähler angehalten ist und was er anzeigt.
    window.__st = []; let prev = null;
    setInterval(() => {
      const a = M.st.app, k = a.state + (a.rest?.held ? '-held' : '');
      if(k !== prev){ prev = k; __st.push({s:k, t:performance.now()/1000, left:a.rest?.left(performance.now()/1000)}); }
    }, 20);
  });
  await page.click('#btnStart');
  await page.waitForSelector('#setup [data-a=start]');
  // Einrichtung: Pausen-Auswahl vorhanden, 30 s gewählt; Linie direkt setzen (Antippen prüft browser.mjs).
  assert.equal(await page.getAttribute('#setup [data-a=rest][data-v="30"]', 'class'), 'on');
  assert.equal(await page.locator('#setup [data-a=rest]').count(), 4);
  await page.evaluate(() => { M.st.settings.line = {...M.demo.truthLine(), at:Date.now()}; M.st.store(); });
  await page.click('#btnSetup'); await page.click('#btnSetup');
  await page.click('#setup [data-a=start]');
  assert.match((await page.evaluate(() => __said)).join(' '), /30 Sekunden zum Ball holen.*an die Linie/);

  // Erste Pause: Zähler sichtbar, groß, mit Tipp-Flächen; „Anhalten“ antippen hält ihn an, der Ruf an der Linie pfeift trotzdem.
  await until(page, () => M.st.app.state==='cool' && M.st.app.rest, 60000, 'erste Pause');
  await sleep(1000);
  assert.match(await page.textContent('#restBox .left'), /^0:(29|28|27)$/);
  assert.match(await page.textContent('#restBox'), /Nächstes Ziel: (Oben|Unten) (links|rechts)/);
  const bh = await page.$$eval('#restBox button', bs => bs.map(b => b.getBoundingClientRect().height));
  assert.ok(bh.length === 2 && bh.every(h => h >= 48), `Tipp-Flächen ${bh}`);
  await page.click('#restBox [data-r=hold]');
  assert.equal(await page.evaluate(() => M.st.app.rest.held), true);
  await page.waitForFunction(() => document.querySelector('#restBox [data-r=hold]')?.textContent === 'Weiter', null, {timeout:2000});   // nächstes Bild

  await until(page, () => M.st.log.length >= 4 && M.st.app.state==='off', 150000, '4 Würfe');
  const st = await page.evaluate(() => __st), said = await page.evaluate(() => __said);
  const log = await page.evaluate(() => M.st.log.map(e => ({target:e.target})));
  // Je Pause: Beginn (cool nach go) bis zum nächsten Pfiff.
  const gaps = [];
  for(let i = 1; i < st.length; i++) if(st[i].s.startsWith('cool') && st[i-1].s==='go'){
    const g = st.slice(i).find(x => x.s==='go'); if(g) gaps.push(+(g.t - st[i].t).toFixed(2));
  }
  assert.equal(gaps.length, 3, JSON.stringify(st));
  // Ruf an der Linie bei 7,3 s → Pfiff 1 s später. Die Person beginnt erst ~1,2 s nach Pausenbeginn (Wurf ausschwingen).
  assert.ok(gaps[0] > 8.8 && gaps[0] < 10.2, `Pause 1: ${gaps[0]} s`);
  assert.ok(gaps[1] > 8.8 && gaps[1] < 10.2, `Pause 2: ${gaps[1]} s`);
  // Ohne Ruf: Pfiff nach Ablauf der 30 s (+ 1 s Vorlauf).
  assert.ok(gaps[2] > 30.8 && gaps[2] < 32.5, `Pause 3: ${gaps[2]} s`);
  // Pause 2: unterwegs gerufen → angehalten, wieder gerufen → weiter.
  assert.ok(st.some(x => x.s==='cool-held'), 'Zähler angehalten');
  assert.ok(said.includes('Pause.') && said.includes('Weiter.'), said.join(' | '));
  assert.ok(said.includes('Noch zehn Sekunden.'), 'Warnung vor Ablauf');
  assert.ok(said.some(x => /Nächstes Ziel: /.test(x)));
  log.forEach((e, i) => assert.ok(e.target, `Wurf ${i+1}: Ziel`));
  assert.equal(await page.isVisible('#restBox'), false, 'Pausen-Anzeige nach der Serie weg');
  assert.deepEqual(errors, [], 'Fehler in der Browser-Konsole');
  await page.close();
});
