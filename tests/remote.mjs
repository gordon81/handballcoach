// Browser-Test (Playwright, Demo-Modus): Bedienung aus der Ferne ohne Netz (shared/js/remote.js):
// Start mit 10 s Vorlauf (Chip oben), Presenter-Tasten (Bild ab = Start, Esc/B = Stopp), Vorlauf abbrechen,
// und im 7-m-Trainer „Bereit“ per Taste in der Pause „Nur Zuruf“. Stufe 2: zweites Handy als Fernbedienung (fern/),
// zwei Browser-Seiten koppeln direkt (der Code der Fernbedienung wird statt mit der Kamera über __hcLink.accept gelesen).
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

// Fernbedienung koppeln: Kamera-Seite zeigt den QR-Code, zweite Seite öffnet dessen Adresse, ihr Code geht zurück.
async function pairRemote(cam){
  await cam.click('#linkChip');
  await cam.waitForFunction(() => window.__hcLink?.code, null, {timeout:8000});
  const code = await cam.evaluate(() => __hcLink.code);
  assert.match(code, /^HC1~O~/);
  assert.ok(code.length < 400, `Code kurz genug für einen kleinen QR-Code (${code.length})`);
  assert.equal(await cam.isVisible('#linkBox canvas'), true, 'QR-Code sichtbar');
  const rem = await browser.newPage({viewport:{width:390, height:800}});
  const errors = trackErrors(rem);
  await rem.goto(await cam.evaluate(() => __hcLink.url));
  await rem.waitForFunction(() => window.__fern?.code, null, {timeout:8000});
  assert.equal(await rem.isVisible('#qr'), true, 'Fernbedienung zeigt ihren Code');
  assert.equal(await rem.evaluate(() => location.hash), '', 'Code aus der Adresse entfernt');
  assert.equal(await cam.evaluate(c => __hcLink.accept(c), await rem.evaluate(() => __fern.code)), true);
  await rem.waitForSelector('#vCtl:not([hidden])', {timeout:10000});
  await until(cam, () => __hcLink.linked, 5000, 'verbunden');
  assert.equal(await cam.textContent('#linkChip'), '📱 verbunden');
  assert.equal(await cam.isVisible('#linkBox'), false);
  return {rem, errors};
}

test('Fernbedienung (Sprungkraft, Demo): koppeln, Start mit Vorlauf und Abbrechen, Start, Stopp, Trennen', {timeout:90000}, async () => {
  const cam = await browser.newPage({viewport:{width:390, height:800}});
  const errors = trackErrors(cam);
  await cam.addInitScript(() => { window.__said = []; localStorage.clear(); });
  await cam.goto(srv.url + 'sprung/?demo=1');
  await cam.evaluate(async () => { window.M = {st:await import('/sprung/js/state.js')}; });
  assert.ok((await cam.locator('#linkChip').boundingBox()).height >= 44, 'Chip groß genug zum Tippen');
  await cam.click('#btnStart');
  await cam.waitForSelector('#setup [data-a=start]');
  const {rem, errors:remErr} = await pairRemote(cam);
  assert.ok((await cam.evaluate(() => __said)).includes('Fernbedienung verbunden.'));
  assert.equal(await rem.evaluate(() => document.documentElement.scrollWidth <= 390), true, 'kein Querscrollen');
  for(const b of ['#btnStart', '#btnBye']) assert.ok((await rem.locator(b).boundingBox()).height >= 44, b);
  await until(rem, () => __fern.state?.can, 5000, 'Zustand: startbereit');
  assert.equal(await rem.textContent('#btnStart'), 'Start');
  assert.equal(await rem.isVisible('#btnNext'), false, 'Sprungkraft hat kein Weiter');

  // Mit Vorlauf: Fernbedienung zeigt den Countdown, „Abbrechen“ bricht ab.
  await cam.click('#leadChip');
  await until(rem, () => __fern.state?.lead === 10, 3000, 'Vorlauf an');
  assert.equal(await rem.textContent('#btnStart'), 'Start (10 s)');
  await rem.click('#btnStart');
  await until(rem, () => __fern.state?.count > 0, 3000, 'Countdown');
  assert.equal(await cam.isVisible('#leadBox'), true);
  assert.match(await rem.textContent('#status .st'), /Start in \d+ s/);
  assert.equal(await rem.textContent('#btnStart'), 'Abbrechen');
  await rem.click('#btnStart');
  await until(cam, () => !document.querySelector('#leadBox') || getComputedStyle(document.querySelector('#leadBox')).display === 'none', 3000, 'abgebrochen');
  await sleep(1000);
  assert.equal(await cam.evaluate(() => M.st.app.state), 'off');

  // Ohne Vorlauf: Start, Stopp.
  await cam.click('#leadChip');
  await until(rem, () => __fern.state?.lead === 0 && __fern.state?.count === 0, 3000, 'Vorlauf aus');
  await rem.click('#btnStart');
  await until(cam, () => M.st.app.state !== 'off', 3000, 'Start per Fernbedienung');
  await until(rem, () => __fern.state?.run, 3000, 'läuft');
  assert.equal(await rem.textContent('#btnStart'), 'Stopp');
  await rem.click('#btnStart');
  await until(cam, () => M.st.app.state === 'off', 3000, 'Stopp per Fernbedienung');
  assert.equal(await cam.textContent('#btnStart'), 'Start');

  // Trennen am zweiten Handy: Kamera-Handy merkt es.
  rem.on('dialog', d => d.accept());
  await rem.click('#btnBye');
  await rem.waitForSelector('#vGone:not([hidden])');
  await until(cam, () => !__hcLink.linked, 8000, 'getrennt');
  assert.equal(await cam.textContent('#linkChip'), '📱');
  assert.deepEqual([...errors, ...remErr], [], 'Fehler in der Browser-Konsole');
  await rem.close(); await cam.close();
});

test('Fernbedienung (7-m-Trainer, Demo): Treffer/Daneben, Bereit/Anhalten in der Pause, Stopp', {timeout:120000}, async () => {
  const cam = await browser.newPage({viewport:{width:390, height:800}});
  const errors = trackErrors(cam);
  await cam.addInitScript(() => { window.__said = []; localStorage.clear(); localStorage.setItem('7m-demo-settings', JSON.stringify({pause:1, rest:-1})); });
  await cam.goto(srv.url + 'siebenmeter/?demo=1');
  await cam.evaluate(async () => {
    window.M = {st:await import('/siebenmeter/js/state.js'), demo:await import('/siebenmeter/js/demo.js')};
    M.demo.resetDemo?.();
    M.demo.REST_VARS.splice(0, M.demo.REST_VARS.length, {calls:[], late:999});   // Person ruft nie, nur die Knöpfe
  });
  await cam.click('#btnStart');
  await cam.waitForSelector('#setup [data-a=start]');
  await cam.evaluate(() => { M.st.settings.line = {...M.demo.truthLine(), at:Date.now()}; M.st.store(); });
  await cam.click('#btnSetup'); await cam.click('#btnSetup');
  const {rem, errors:remErr} = await pairRemote(cam);
  await until(rem, () => __fern.state?.can, 5000, 'startbereit');
  assert.equal(await rem.textContent('#btnNext'), 'Bereit');
  assert.equal(await rem.textContent('#btnPrev'), 'Anhalten');
  assert.equal(await rem.isDisabled('#btnNext'), true, 'Bereit erst im Training');

  await rem.click('#btnStart');
  await until(cam, () => M.st.app.state !== 'off', 3000, 'Start per Fernbedienung');
  // Erster Wurf: Karte mit Ziel, auf der Fernbedienung erscheinen Treffer/Daneben.
  await until(rem, () => __fern.state?.hit === 'open', 60000, 'Karte mit Treffer/Daneben');
  assert.equal(await rem.isVisible('#hitRow'), true);
  assert.ok((await rem.textContent('#status .card')).length > 3, 'Ergebnis auf der Fernbedienung');
  await rem.click('#btnMiss');
  await until(cam, () => M.st.log.at(-1)?.hit === false, 3000, 'Daneben gespeichert');
  await until(rem, () => __fern.state?.hit === 'miss' || __fern.state?.hit === null, 3000, 'Daneben angezeigt');

  // Pause „Nur Zuruf“: Anhalten, dann Bereit → Pfiff.
  await until(cam, () => M.st.app.state==='cool' && M.st.app.rest, 60000, 'erste Pause');
  await sleep(9000);
  assert.equal(await cam.evaluate(() => M.st.app.state), 'cool');
  await rem.click('#btnPrev');
  await until(cam, () => M.st.app.rest?.held === true, 3000, 'Anhalten');
  await rem.click('#btnNext');
  await until(cam, () => M.st.app.state === 'go', 5000, 'Pfiff nach Bereit');
  await rem.click('#btnStart');
  await until(cam, () => M.st.app.state === 'off', 3000, 'Stopp');
  assert.deepEqual([...errors, ...remErr], [], 'Fehler in der Browser-Konsole');
  await rem.close(); await cam.close();
});

test('Fernbedienung: Kamera-Handy liest den Code der Fernbedienung aus dem Kamerabild', {timeout:60000}, async t => {
  // Ohne BarcodeDetector (wie hier und auf dem iPhone) wird jsQR vom CDN geladen; ohne Netz überspringen.
  try{ await fetch('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/+esm', {method:'HEAD'}); }catch(e){ t.skip('kein Netz für jsQR'); return; }
  const cam = await browser.newPage({viewport:{width:390, height:800}});
  const errors = trackErrors(cam);
  await cam.addInitScript(() => { localStorage.clear(); });
  await cam.goto(srv.url + 'sprung/?demo=1');
  await cam.click('#btnStart');
  await cam.waitForSelector('#setup [data-a=start]');
  await cam.click('#linkChip');
  await cam.waitForFunction(() => window.__hcLink?.code, null, {timeout:8000});
  const rem = await browser.newPage({viewport:{width:390, height:800}});
  await rem.goto(await cam.evaluate(() => __hcLink.url));
  await rem.waitForFunction(() => window.__fern?.code, null, {timeout:8000});
  // Wie „Handy vor die Kamera halten“: das Kamerabild zeigt den QR-Code der Fernbedienung, klein und mittig.
  await cam.evaluate(async code => {
    const { drawQr } = await import('/shared/js/qr.js');
    const q = document.createElement('canvas'), big = document.createElement('canvas'); big.width = 1280; big.height = 720;
    drawQr(q, code, 260); const g = big.getContext('2d');
    setInterval(() => { g.fillStyle = '#6b5a45'; g.fillRect(0, 0, 1280, 720); g.drawImage(q, 520, 220); }, 100);
    const v = document.querySelector('video'); v.srcObject = big.captureStream(10); await v.play();
  }, await rem.evaluate(() => __fern.code));
  await until(cam, () => __hcLink.linked, 20000, 'verbunden über das Kamerabild');
  await rem.waitForSelector('#vCtl:not([hidden])', {timeout:5000});
  assert.deepEqual(errors, [], 'Fehler in der Browser-Konsole');
  await rem.close(); await cam.close();
});
