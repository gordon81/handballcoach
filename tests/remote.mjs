// Browser-Test (Playwright, Demo-Modus): Bedienung aus der Ferne ohne Netz (shared/js/remote.js):
// Start mit 10 s Vorlauf (Chip oben), Presenter-Tasten (Bild ab = Start, Esc/B = Stopp), Vorlauf abbrechen,
// und im 7-m-Trainer „Bereit“ per Taste in der Pause „Nur Zuruf“.
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
function trackErrors(page){
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if(m.type()==='error') errors.push(m.text()); });
  return errors;
}

test('Sprungkraft (Demo): Vorlauf-Chip, Start per Presenter-Taste mit 10 s Vorlauf, Abbrechen, Stopp per Taste', {timeout:90000}, async () => {
  const page = await browser.newPage({viewport:{width:390, height:800}});
  const errors = trackErrors(page);
  await page.addInitScript(() => { window.__said = []; localStorage.clear(); });
  await page.goto(srv.url + 'sprung/?demo=1');
  await page.evaluate(async () => { window.M = {st:await import('/sprung/js/state.js')}; });
  // Ohne Kamera: Taste startet nichts, Hinweis.
  await page.keyboard.press('PageDown');
  assert.match(await page.textContent('#hint'), /Erst am Handy/);
  assert.equal(await page.textContent('#leadChip'), '⏱ aus');
  assert.ok((await page.locator('#leadChip').boundingBox()).height >= 44, 'Chip groß genug zum Tippen');

  await page.click('#btnStart');
  await page.waitForSelector('#setup [data-a=start]');
  await page.click('#leadChip');
  assert.equal(await page.textContent('#leadChip'), '⏱ 10 s');

  // Start-Button mit Vorlauf: Zahl im Bild, Ansage; Antippen bricht ab.
  await page.click('#setup [data-a=start]');
  assert.equal(await page.isVisible('#leadBox'), true);
  assert.match(await page.textContent('#leadBox'), /^10/);
  assert.ok((await page.evaluate(() => __said)).includes('Start in 10 Sekunden.'));
  await sleep(1500);
  await page.click('#leadBox');
  assert.equal(await page.isVisible('#leadBox'), false);
  await sleep(10000);
  assert.equal(await page.evaluate(() => M.st.app.state), 'off', 'abgebrochen: startet nicht');

  // Presenter: Bild ab startet nach 10 s, B stoppt.
  const t0 = Date.now();
  await page.keyboard.press('PageDown');
  await until(page, () => M.st.app.state !== 'off', 13000, 'Start nach Vorlauf');
  const dt = (Date.now() - t0)/1000;
  assert.ok(dt > 9.5 && dt < 11.5, `Vorlauf ${dt} s`);
  assert.equal(await page.isVisible('#leadBox'), false);
  await page.keyboard.press('b');
  assert.equal(await page.evaluate(() => M.st.app.state), 'off', 'Stopp per Taste');
  assert.equal(await page.textContent('#btnStart'), 'Start');
  assert.deepEqual(errors, [], 'Fehler in der Browser-Konsole');
  await page.close();
});

test('7-m-Trainer (Demo): in der Pause „Nur Zuruf“ meldet die Presenter-Taste „bereit“, Pfiff 1 s später', {timeout:90000}, async () => {
  const page = await browser.newPage({viewport:{width:390, height:800}});
  const errors = trackErrors(page);
  await page.addInitScript(() => { window.__said = []; localStorage.clear(); localStorage.setItem('7m-demo-settings', JSON.stringify({pause:1, rest:-1})); });
  await page.goto(srv.url + 'siebenmeter/?demo=1');
  await page.evaluate(async () => {
    window.M = {st:await import('/siebenmeter/js/state.js'), demo:await import('/siebenmeter/js/demo.js')};
    M.demo.resetDemo?.();
    M.demo.REST_VARS.splice(0, M.demo.REST_VARS.length, {calls:[], late:999});   // Person ruft nie, nur die Taste
  });
  await page.click('#btnStart');
  await page.waitForSelector('#setup [data-a=start]');
  await page.evaluate(() => { M.st.settings.line = {...M.demo.truthLine(), at:Date.now()}; M.st.store(); });
  await page.click('#btnSetup'); await page.click('#btnSetup');
  await page.click('#setup [data-a=start]');
  await until(page, () => M.st.app.state==='cool' && M.st.app.rest, 60000, 'erste Pause');
  await sleep(9000);   // Person ist mit dem Ball zurück an der Linie; ohne Zähler passiert nichts
  assert.equal(await page.evaluate(() => M.st.app.state), 'cool');
  await page.keyboard.press('PageUp');
  assert.equal(await page.evaluate(() => M.st.app.rest.held), true, 'Zurück = anhalten');
  const t0 = await page.evaluate(() => performance.now());
  await page.keyboard.press('PageDown');
  await until(page, () => M.st.app.state==='go', 5000, 'Pfiff');
  const dt = (await page.evaluate(() => M.st.app.whistleAt*1000) - t0)/1000;
  assert.ok(dt > 0.9 && dt < 1.4, `Pfiff ${dt} s nach der Taste`);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => M.st.app.state), 'off');
  assert.deepEqual(errors, [], 'Fehler in der Browser-Konsole');
  await page.close();
});
