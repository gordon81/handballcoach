---
name: demo-figuren
description: Demo-Modus im Handballcoach bauen oder ändern – gezeichnete Halle, Kamera und simulierte Person (Figur), die auf die App reagiert und bekannte Würfe/Bewegungen macht, damit Browser-Tests die Bewertung prüfen können. Nutzen, wenn eine neue Übung oder ein neues Training einen Demo-Ablauf braucht, wenn die Haltung/Bewegung der Demo-Figur angepasst werden soll (Abwehrstellung, Wurf, Sprung, Schritte) oder wenn ein Demo-Test wackelt.
---

# Demo-Figuren im Handballcoach

Jedes Training hat einen Demo-Modus (`?demo=1`): statt Kamera und KI liefert eine **gezeichnete Halle** das Videobild und
eine **simulierte Person** die Körperpunkte im MediaPipe-Format. Die App läuft sonst unverändert (Einrichtung, Erkennung,
Bewertung, Ansagen, Log). Die Person macht **absichtlich bekannte** Dinge (sauber, Übertritt, falsches Bein …); die
Browser-Tests prüfen, dass die App genau das erkennt. Grundsätze dazu: `TESTSTRATEGIE.md`, Technik: `brain.md`.

**Nicht verwechseln: Anleitungsvideos** („▶ Video: Korrekte Ausführung“) sind kein Teil der Demo. Sie haben eine eigene
Lehrbild-Figur in `shared/js/guide/` (Pose über Gelenkwinkel, Winkelmarken, eigene Kamera und Halle) und sind im Demo
ausgeblendet. Gelenkwinkel dort genau setzen (z. B. Knie 90° = Oberschenkel `[-40, 0]`, Unterschenkel `[-50, 180]`) und mit
`tests/guide.mjs` messen; nichts aus `shared/js/demo/` dafür benutzen.

## Aufbau (wo was steht)

| Datei | Aufgabe |
|---|---|
| `shared/js/demo/scene.js` | gemeinsam: Halle zeichnen, Kamera (`setView`, `proj`), Person aus Gelenken (`joints(P, R)`), Zeichnen (`drawPerson`, `ball`, `drawFloor`), Körperpunkte (`landmarks(j)` → `{landmarks, worldLandmarks}`), Ringe im Tor (`setRings`) |
| `<training>/js/demo.js` bzw. `aussenspieler/js/demo/sim.js` | das **Verhalten**: wo die Person steht, wie sie auf den Zustand der App reagiert, welche Varianten sie macht, was sie wirklich getan hat (`demo.done` / `demo.shots` / `demo.throws`) |
| `tests/browser.mjs` | öffnet `?demo=1`, liest `window.M` (Module der Seite) und vergleicht die Bewertung mit dem, was die Person getan hat |

Jedes Demo exportiert dieselbe kleine Schnittstelle:

```js
export const detector = { detectForVideo(){ return last; }, close(){} };   // Ersatz für MediaPipe
export function startDemo(){ /* setView(…), requestAnimationFrame(tick) */ return cv.captureStream(30); }
export const demo = {done:[]};   // was die Person wirklich getan hat (für Tests)
```

`shared/js/stage.js` → `startSource(demoModul)` hängt den Stream an `<video>` und nimmt `detector` statt der KI.

## Koordinaten und Kamera

- Halle in Metern: **x entlang der Torlinie** (Tor bei x = −1,5 … 1,5, y = 0), **y ins Feld**, **z nach oben**.
  6-m-Bogen: `linePt(winkel°, radius)` (linker Bogen um den linken Pfosten; 150° = linker Flügel, 125° = Rückraum links,
  90° = Mitte). 7-m-Strich bei y = 7, |x| ≤ 0,5. 9-m-Linie gestrichelt. Hallenrand x < −14 sieht aus wie eine Wand.
- `setView(pos, look, [dx, dy, schwenk°])`: Kamera bei `pos`, Blick auf `look`. Höhe 1,4–2,2 m wie ein Stativ.
- **Bildrechts = `cross(blickrichtung, oben)`.** Prüfen, auf welcher Bildseite was landet (Wand links/rechts, Gegner).
- Die Kamera so stellen wie in der echten Anleitung (z. B. Rückraum **schräg von vorn**, der Spieler läuft auf die
  Kamera zu). Andere Winkel ändern die Erkennung (siehe Fallstricke).

## Die Person steuern (`P`)

`joints(P, R)` baut aus `P` die 3D-Gelenke (R = Rechtshänder). Wichtige Felder:

| Feld | Bedeutung |
|---|---|
| `x, y` | Standort (m), `a` Blickrichtung (rad; zur Kamera schauen: `Math.atan2(cam.y − y, cam.x − x)`) |
| `s`, `phi`, `fl` | Gehen/Laufen: Tempo 0–1, Schrittphase, Fußhub (m, Standard 0,1) |
| `lift` | Becken hoch (Sprung, m). **Hebt die Füße nicht mit** – dafür `lf`/`rf` setzen |
| `lf`, `rf` | linker/rechter Fuß hoch (m) |
| `lfx`, `rfx` | Fuß nach vorn versetzt (m; versetzte Fußstellung, Ausfallschritt, fester Standfuß) |
| `lfy`, `rfy` | Fuß nach rechts versetzt (m; breiter Stand: `lfy < 0`, `rfy > 0`; gekreuzt: `lfy > 0,24`) |
| `raise`, `swing`, `twist`, `low` | Wurfarm hoch (0–1), Wurf (0–1), Oberkörper gegen Hüfte (rad), Abwurf aus der Hüfte (0–1) |
| `lean` | Oberkörper nach vorn (rad; aufrecht ≈ 0,05–0,1) |
| `guard` | Abwehr-Arme in Vorhalte `{l, r}`: Handgelenk gegenüber der eigenen Schulter in m (0 = Schulterhöhe, −0,3 ≈ Brust/Bauch) |
| `ball` | Ball in der Hand |

Fehlt eine Haltung (z. B. neue Armposition), in `scene.js` einen **optionalen** Parameter ergänzen, der nichts ändert,
wenn er fehlt, und ihn im Kommentar über `joints` beschreiben. Danach alle Browser-Tests laufen lassen, weil alle
Trainings dieselbe Figur nutzen.

## Verhalten: auf die App reagieren

Im `tick(now)` je Bild: `behave(dt)` → `joints` → `drawFloor` → `drawPerson` → `last = landmarks(j)`.
`behave` liest den Zustand der App (`app.state`, `app.target`, `app.cmd`, `app.tc`, `app.cmdOpp`, `settings` …) und
reagiert wie ein Mensch, der zuhört: in die Einrichtung gehen, Linie ablaufen, nach der Ansage anlaufen, nach dem Pfiff
werfen, auf „links/rechts/raus/zurück“ verschieben.

- **Varianten als Liste**, im Wechsel (`VARS[k++ % VARS.length]`), z. B. sauber, sauber, Übertritt, flach/Arm unten.
  Für Aufgaben eigene Listen (`TASK_VAR[aufgabe]`). Jede Variante ändert genau **eine** Sache, damit die Erwartung klar ist.
- **Festhalten, was die Person getan hat** (`demo.done.push({…})`): Ruf, tatsächliche Richtung, Reaktionszeit,
  erwartete Stellung. Der Test vergleicht damit statt mit Annahmen.
- Erwartungen nur dort eintragen, wo die App sie sehen kann (Beispiel Abwehr: Stellung nur bei gerufenem „raus“ und
  nur, wenn die Bewegung im Auswertefenster fertig ist).
- Für Tests Hilfen exportieren: wahre Lage von Linien/Ringen im Bild (`truthError`, `truthLine`, `ringTruth`),
  `_test.shoot()` u. ä.

### Beispiel: Abwehr-Stellung seitlich zur Wurfhand (aus `abwehr/js/demo.js`)

```js
const lead = app.curOpp === 'L' ? 'r' : 'l';          // Wurfarmseite des Gegners aus Sicht des Abwehrspielers
P.lfy = -0.14; P.rfy = 0.14;                          // mindestens schulterbreit
P.lfx = lead === 'l' ? 0.22 : -0.1;                   // Fuß auf der Wurfarmseite vorn (Richtung Kamera = Gegner)
P.rfx = lead === 'r' ? 0.22 : -0.1;
P.guard = {[lead]:-0.12, [lead === 'l' ? 'r' : 'l']:-0.3};   // Führarm vorn/höher, Sicherungsarm tiefer
P.lean = 0.1; P.lift = -0.13;                         // Oberkörper fast aufrecht, Körperschwerpunkt tief
```

Fachliche Vorlage für Haltungen: `QUELLEN.md` (DHB-Technikkriterien, Regeln). Die Demo-Figur soll die **richtige**
Technik zeigen; Fehler nur als bewusste Variante.

## Fallstricke (alle schon passiert)

- **Fuß rutscht mit:** Mit `s`/`phi` steht ein Fuß beim Anlauf nicht fest; der Sprungfuß wandert mit dem Körper. Für
  saubere Schritte Füße als Weltpositionen führen und über `lfx/rfx` relativ zum Körper setzen (`stepRun` in `sim.js`).
- **Teleportieren:** Haltung oder Blickrichtung nie sprunghaft ändern, wenn die App gerade misst (falsche Schritte,
  falsche Sprungerkennung). Vorher drehen (`stand(dt, toward(ziel))`), Übergänge über ~0,2–0,45 s.
- **Uhr:** Bewegungen an die echte Zeit seit dem Ereignis koppeln (`performance.now()/1000 − app.tc`), nicht an
  aufsummierte `dt` – bei ruckelnden Bildern stimmt sonst die Reaktionszeit nicht.
- **Perspektive:** Geht die Person direkt auf die Kamera zu oder weg, sieht das im Bild wie Stehen aus; der vordere Fuß
  liegt je nach Kamerawinkel im Bild höher oder tiefer. Kamera wie in der Anleitung stellen, Erwartungen in einer Probe
  messen (siehe unten), nicht schätzen.
- **`lift` hebt die Füße nicht.** Für Sprünge/Hüpfer `lf`/`rf` mitsetzen.
- **Zu kleine/zu schnelle Bewegungen** fallen unter Rauschen oder Grenzen (z. B. Hüftwurf zu langsam → „kein Wurf“).
  Bewegungen so groß machen, wie sie in echt sind.
- Die Person hat **eigenen Zustand**; beim Neustart der Seite ist er frisch, innerhalb einer Seite laufen Zähler weiter
  (Tests rufen ggf. `resetDemo()`, falls vorhanden).

## Vorgehen bei einer neuen Übung

1. Verhalten im Demo des Trainings ergänzen (Reaktion auf den neuen Zustand/Ruf), Varianten-Liste mit genau
   einem Fehler je Variante, `demo.done` füllen.
2. **Probe statt Raten:** kleines Playwright-Skript im Scratchpad (Muster: Demo öffnen, Start, Einrichtung, Runde,
   dann `M.store.log` / `M.st.log` und `demo.done` ausgeben), Werte ansehen, Kamera/Varianten anpassen, bis die
   Erkennung mit Abstand richtig liegt.
3. Browser-Test in `tests/browser.mjs`: jede Bewertung gegen `demo.done` prüfen, dazu Ansagen (`window.__said`),
   Karte, Log, Bericht, Tipp-Flächen ≥ 44 px.
4. Den Test **mehrmals** laufen lassen (Zufall bei Rufen und Zielen); wackelt er, Ursache in der Figur suchen
   (Übergänge, Uhr, Größe der Bewegung), nicht die Toleranz aufweiten, ohne zu verstehen warum.
5. `npm test` komplett grün, dann `brain.md` (Abschnitt des Trainings: „Demo: …“) und ggf. `TESTSTRATEGIE.md` ergänzen.
