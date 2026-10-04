# brain.md – Handballcoach (Außenwurf-Coach)

Projektgedächtnis für Menschen und KI-Assistenten. Vor Änderungen lesen, nach größeren Änderungen aktualisieren.
Bedienungsanleitung für Nutzer: [`DOKUMENTATION.md`](DOKUMENTATION.md).

## Ziel
Handy-Web-App für das Außenwurf-Training (Links-/Rechtsaußen) ohne Torwart:
- Zielansage per Sprache während des Anlaufs (Gummiringe: 2× orange 16 cm, 2× blau 10 cm; z. B. „Orange kurz“, „Blau lang“).
- KI prüft per Kamera die Technik und gibt nach jedem Wurf Feedback: ein Lob + ein Verbesserungstipp.
- Auswertung pro Training mit Abschlussbericht zum Teilen/Herunterladen.
- Videoclips (z. B. Bundesliga) mit denselben Prüfungen analysieren.
- Null Kosten: alles läuft im Browser, kein Server, keine Uploads.

## Ort, Repo, Hosting
- Lokal: `/home/gordon/Projekte/handballcoach`
- Repo: https://github.com/gordon81/handballcoach (Branch `main`)
- Live: https://gordon81.github.io/handballcoach/ (GitHub Pages, Deploy from branch `main` / root) = Startmenü; Außenwurf-Coach unter https://gordon81.github.io/handballcoach/aussenspieler/ (Demo: `aussenspieler/?demo=1`).
- Daten (localStorage `awc-*`, IndexedDB `awc-clips`) gehören zur Origin `gordon81.github.io`, nicht zum Pfad: der Umzug nach `aussenspieler/` hat nichts gelöscht. Neue Trainings eigene Schlüssel-Präfixe geben.
- Kamera und ES-Module funktionieren nur über https oder localhost, nicht per `file://`. Lokal testen: `python3 -m http.server` im Projektordner, dann http://localhost:8000 (Menü) bzw. http://localhost:8000/aussenspieler/.

## Dateien
- `index.html` (Wurzel) – Startmenü: eine Karte (ein `<a>` in `#trainings`) pro Trainingsart, Stil inline. Neue Trainingsart = eigener Ordner mit eigener `index.html` + eine Zeile im Menü.
- `shared/` – gemeinsamer Code aller Trainings (Pfade aus einem Training: `../shared/…` bzw. in JS `../../shared/js/…`):
  - `css/base.css` – Farben, Schriften, Grundstil.
  - `js/utils.js` (Helfer), `js/speech.js` (Sprachausgabe `say(text, {queue})`, Piep `beep()`; Tests lesen `window.__said`), `js/wakelock.js` (Bildschirm wach), `js/pose.js` (`createPose(model)`: MediaPipe laden, GPU mit CPU-Fallback; URLs `TV`, `MODELS`).
  - `js/demo/scene.js` – Demo-Szene: gezeichnete Halle (`setView(pos, look, move)`, `proj`, `drawFloor`) und Person aus Gelenken (`joints(P, R)`, `drawPerson`, `landmarks` im MediaPipe-Format, `ball`, `hand`). Das Verhalten der Person steht im Demo des jeweiligen Trainings.
- `aussenspieler/` – Außenwurf-Coach (die folgenden Dateien bis `ui/` liegen in diesem Ordner, Pfade darin relativ):
- `index.html` – nur das HTML-Gerüst; bindet `../shared/css/base.css`, die eigenen CSS-Dateien und `js/main.js` ein. Link „← Alle Trainings“ (`../`) zurück ins Menü.
- `css/` – `stage.css` (Kamerabild, HUD, Zielansage, Hinweis, Ergebnis-Karte), `controls.css` (Video- und Button-Leiste), `sheets.css` (Einstellungen, Training).
- `js/` – ES-Module, ohne Build direkt vom Browser geladen:
  - `main.js` – Einstieg: verbindet die Bedienung, Hauptschleife (ein KI-Durchlauf pro Videobild).
  - `config.js` – feste Werte: MediaPipe-URLs, Modelle, Körperpunkt-Indizes, Skelett, Standard-Einstellungen.
  - `state.js` – gemeinsamer Laufzeit-Zustand `app` (Zustand, Quelle, Ziel, letzter Frame, Linien-Markierung). Als Objekt, weil importierte Variablen nicht neu zugewiesen werden können.
  - `store.js` – `settings` und `log` im localStorage, Trainings-Sitzungen.
  - `dom.js` – Seitenelemente, Hinweis-Einblendung.
  - `model.js`, `source.js` – KI-Modell laden (über `shared/js/pose.js`, im Demo die simulierte Person), Kamera/Video + Layout.
  - `line.js` – 6-m-Linie: Antippen (mit „Zurück“), Kurve, `inTorraum()`, `saveLine()`, `setCamPos()` (Kameraposition wechseln, Linie je Position).
  - `lineWizard.js` – Linie ablaufen: Person geht auf Sprachansage die Linie entlang, Fußpunkte geben die grobe Lage, dann Einrasten auf den Strich am Boden.
  - `lineDetect.js` – Bodenlinie im Kamerabild finden (`snapLine`), Bild ohne Person (`medianFrame`), Punkte glätten/reduzieren (`simplify`).
  - `camCheck.js` – Referenzbild bei der Einrichtung, Kamera-Check beim Öffnen der Einrichtung und beim Start, automatisches Nachjustieren.
  - `shout.js` + `shoutDetect.js` + `micControl.js` – Zuruf per Mikrofon erkennen (Pegel im Stimmbereich, Dauer, Klang; `shoutDetect.js` ist die reine Logik ohne Browser), Mikro nur im Modus „Zuruf“ während des Trainings an.
  - `clips.js` – Wurf-Videos aufnehmen (MediaRecorder) und in IndexedDB speichern. `ui/clipView.js` – Video ansehen (Zeitlupe, Speichern/Teilen). `ui/micMeter.js` – Mikrofon-Pegel anzeigen.
  - `demo/sim.js` – Demo-Modus: Verhalten der simulierten Person (Linie ablaufen, Würfe, Zuruf), Kamerapositionen, Ersatz für Kamera und KI; Halle und Körper aus `shared/js/demo/scene.js`.
  - `tracking.js` – Zustandsautomat, Absprung-/Landungserkennung, speichert den Wurf.
  - `analysis.js` – `evaluate()`: die sechs Prüfungen und der Sprachtext.
  - `tasks.js` – Aufgaben als Daten (`TASKS`) und ihre Regeln (`judge`, `tally`, Ansagen, Verlauf, Bestwert). Reine Logik ohne Browser, unit-getestet.
  - `taskRun.js` – Aufgabe im Training: Serie starten (`beginTask`), jeden Wurf bewerten (`taskThrow`), Zähler `#taskBox`, Ende-Karte `#taskEnd` mit „Nochmal“/„Fertig“, Auswahl in der Einrichtung (`taskBlock`), Serien des Trainings für Log/Bericht (`sessionRuns`).
  - `feedback.js` – Labels, `PRIO`, `tips()`.
  - `draw.js` – Overlay (Linie, Skelett). `summary.js` + `report.js` – Auswertung und Bericht.
  - `ui/` – `setupView.js` (Einrichtung vor dem Training, Start/Stopp), `controls.js` (Buttons, Video-Leiste, Training-Fenster), `settingsView.js`, `card.js` (Ergebnis-Karte), `logView.js`, `sheets.js`.
- `tests/` (Wurzel) – automatische Tests (siehe „Tests“), nicht Teil der App.
- `README.md` – Kurzbeschreibung für GitHub.
- `DOKUMENTATION.md` – Anleitung für Nutzer: Bedienung, Einrichtung, Modi, Demo, Hallentest, wo Log, Videos und Einstellungen liegen und wie man sie löscht. Bei Änderungen an Bedienung oder Speicher mitpflegen.
- `PLAYBOOK.md` – Vorschläge für weitere Übungen und Trainings (Übungskarten, Prüfbarkeit, Aufwand, TODO-Liste, Reihenfolge). Erledigtes ist dort abgehakt.
- `TESTSTRATEGIE.md` – was Unit-Tests, Browser-Tests im Demo und der Hallentest jeweils prüfen; Regeln für neue Übungen.
- `brain.md` – diese Datei.

## Technik
- Pose-Erkennung: `@mediapipe/tasks-vision@0.10.14` (PoseLandmarker, runningMode `VIDEO`, 1 Person), erst bei Bedarf per `import()` von cdn.jsdelivr.net geladen (Demo braucht es nicht).
- Modelle von storage.googleapis.com: `lite` (~5,8 MB, Standard) oder `full` (~9,4 MB). GPU-Delegate mit CPU-Fallback.
- 2D-Landmarks (Pixel) für Füße, Hüfte, Arm, Linie; `worldLandmarks` (3D, Meter) nur für die Körperdrehung.
- Sprache: Web Speech API (`speechSynthesis`, de-DE). Muss einmal per Nutzer-Geste freigeschaltet werden (Start-Button sagt „Los geht's“).
- Screen Wake Lock hält den Bildschirm an.
- Schrift: Barlow / Barlow Condensed (Google Fonts) mit System-Fallback.
- Kein Build-Schritt, keine Abhängigkeiten im Repo.

## Einrichtung (vor dem Training)
- **Kameraposition** (oben in der Einrichtung, `settings.camPos`, Texte in `CAM_POS` in `config.js`):
  - **1 · Grundlinie** (`base`, Standard): auf der Grundlinie zwischen 6-m-Linie und Tor, erhöht, schräg von vorn auf die Absprungzone.
  - **2 · Feld mit Tor** (`court`): im Feld hinter dem 7-m-Punkt, zur anderen Seite versetzt (vom Flügel aus gesehen), erhöht. Tor und Absprungzone sind im Bild, der Sprung wird von der Seite gesehen. Der Spieler ist weiter weg (im Demo ~12 m, ~150 px groß bei 720p), also auf gutes Licht und das Modell „Full“ achten, falls die Erkennung hakt.
  - Jede Position hat ihre eigene 6-m-Linie (`settings.lines.base` / `.court`, aktiv ist `settings.line`). Beim Wechsel wird die Linie der neuen Position geladen und der Kamera-Check läuft.
  - Prüfungen und Ablauf sind für beide Positionen gleich, nur die Sprunghöhe hat eigene Grenzen (`TH_POS.court`, siehe Prüfungen). Jeder Wurf speichert die Position in `m.cam`.
- **Start** lädt KI und Kamera und öffnet die Einrichtung; erst danach „Training starten“ (im Kamera-Modus nur mit gesetzter 6-m-Linie). Der Button „Setup“ öffnet die Einrichtung jederzeit. Video-Modus: Analyse startet direkt, Linie optional.
- **Linie antippen**: Punkte entlang des Bogens, „↶ Zurück“ nimmt den letzten Punkt (bzw. den Torraum-Schritt) zurück, „Fertig“, dann 1 Punkt im Torraum. Die Leiste steht dabei oben, „⇅“ schiebt sie nach unten.
- **Linie ablaufen** (`lineWizard.js`): Ansage „ans äußere Ende stellen“ → steht die Person 1,5 s still, „los, langsam auf der Linie gehen“ → gesammelt wird der Bodenpunkt des aufstehenden Fußes (Mitte Ferse/Spitze) → nach ≥ 0,8 Körperlängen Weg und ~1 s Stillstand (oder „Fertig“, max. 30 s) werden die Punkte geglättet (gleitender Median) und auf 3–7 Punkte in gleichen Abständen reduziert → „zwei Schritte in den Torraum und stehen bleiben“ → Stillstand mit genug Abstand zur Linie = Torraum-Punkt. Klappt das nicht (20 s), Torraum-Punkt antippen.
- **Strich am Boden erkennen** (`lineDetect.js`): Während des Ablaufens werden alle ~1,2 s Bilder gesammelt, der pixelweise Median entfernt die Person. Quer zur Fußpunkt-Kurve wird in ±0,3 Körperlängen nach einem Streifen gesucht, der sich zu beiden Seiten vom Boden abhebt (Farbabstand, Breiten 1–6 px bei 640 px Bildbreite). Die Stärke ist gedeckelt, ein glatter Pfad (dynamische Programmierung) mit Strafe für Sprünge und für Abstand zu den Fußpunkten wählt den Strich: von mehreren Linien gewinnt die nächstgelegene (Basketball-, Volleyball-Linien). Sicher (≥ 50 % der Stellen klar) → Linie eingerastet („am Boden erkannt“), sonst bleiben die Fußpunkte. Angetippte Punkte werden ebenso eingerastet (Band ±3 % Bildhöhe).
- **Gespeicherte Linie**: `line.at` (Datum), `line.snapped`, `line.ref` (Referenzbild 160 px Graustufen, base64). Beim Start mit vorhandener Linie: Hinweis „Linie von der letzten Einrichtung gefunden“, Button „Mit dieser Linie starten“, „Korrigieren“ = Antippen mit den alten Punkten.
- **Kamera bewegt** (`camCheck.js`): beim Öffnen der Einrichtung und bei „Training starten“ wird das aktuelle Bild mit der Referenz verglichen (weichgezeichnete Kanten). Unterschied < 0,4 × mittlere Kantenstärke = unverändert. Sonst: beste Verschiebung suchen, Linie mitschieben und neu einrasten (Band ±6 %) → „neu ausgerichtet, bitte prüfen“ (Start erst beim zweiten Tippen). Klappt das nicht → „bitte neu einrichten“ (zweites Tippen auf Start startet trotzdem, z. B. wenn nur das Licht anders ist).
- Noch nicht in der Halle getestet; geprüft im Demo-Modus (siehe unten).

## Demo-Modus (am Schreibtisch testen)
- `?demo=1` an die Adresse hängen (oder auf der Startseite „Demo ohne Kamera“). Eigener Speicher (`awc-demo-settings`, `awc-demo-log`), das echte Training bleibt unberührt.
- `demo/sim.js` zeichnet eine Halle in Perspektive (Kamera je nach gewählter Kameraposition 1 oder 2, `CAMS`) (Holzboden, gebogene 6-m-Linie, gestrichelte 9-m-Linie, Tor, dazu Basketball-, Volleyball-, Badminton- und grüne Linien als Störer) und eine Person. Das Bild geht per `canvas.captureStream()` ins `<video>`, die Körperpunkte kommen im MediaPipe-Format (`landmarks` + `worldLandmarks`) statt aus der KI. Einrichtung, Linienerkennung, Kamera-Check und Analyse laufen unverändert.
- Im Modus „Zuruf“ ruft die Person am Startpunkt (Hinweis „Demo: Spieler ruft“), Button „Zuruf“ in der Demo-Leiste ruft von Hand.
- Die Person reagiert auf die Ansagen: ans Ende der Linie, Linie entlanggehen, zwei Schritte in den Torraum; im Training bei Ansage Anlauf und Sprungwurf. Würfe im Wechsel: gut, gut, Übertritt, flach mit Arm unten.
- „Kamera bewegen“ verschiebt/schwenkt die Kamera (3 Stellungen) → Einrichtung/Start merkt es und richtet die Linie neu aus.
- Automatische Tests laufen über den Demo-Modus, siehe „Tests“.

## Tests (`tests/`)
- Einmalig: `cd tests && npm install` (Playwright), Browser bei Bedarf `npx playwright install chromium`. Dann `npm test` (~2 min) oder nur `npm run unit` (Sekunden, ohne Browser).
- `unit.mjs` (Node): Aufgaben-Regeln (`tasks.js`: Grenzen, cm-Ansage, Serie, Verlauf/Bestwert) und Ruf-Erkennung mit künstlichen Pegelverläufen: Ruf, Ballaufpralle, Quietschen, Pfiff, Dauerlärm + Ruf darüber (auch mit kurzen Einbrüchen), Mikro-Start ohne Ton, Sperre, eigene Ansage, Empfindlichkeit.
- `browser.mjs` (Playwright, headless Chromium, eigener kleiner Webserver `server.mjs`):
  - Demo von vorn bis hinten (Pause 1 s): Linie ablaufen (eingerastet, Median < 4 px, max < 12 px), 8 Würfe genau wie simuliert bewertet (gut, gut, Übertritt, flach + Arm unten), Videos gespeichert und abspielbar (MP4), „Videos aus“ → keine Clips, Zuruf-Modus (Ziel 2 s nach dem Ruf), Zuruf ohne Spieler im Bild ignoriert, Wurf ohne Ansage (Aufnahme beginnt nicht mitten im Anlauf neu, Clip gespeichert), „Kamera bewegen“ → Linie neu ausgerichtet, Mikro-Test in der Einrichtung (an, Ruf gezählt, Empfindlichkeit, aus); keine Fehler in der Konsole.
  - Demo mit Kameraposition 2: Linie ablaufen (eingerastet, genau), 4 Würfe wie simuliert bewertet, Wechsel 1 ↔ 2 behält die Linie jeder Position.
  - Aufgabe „Absprung an der Linie“ in Handy-Größe (390 px): Auswahl in der Einrichtung, 4 Würfe (nah, zu weit, Übertritt, nah) richtig bewertet, Ansagen (über `window.__said`), Ende-Karte, Verlauf, Log und Bericht, „Nochmal“, Tipp-Flächen ≥ 44 px.
  - Aufgabe „Entscheidung in der Luft“: vor jedem Wurf „Los“, das Ziel wird erst im Absprung angesagt (Zustand beim Sprechen), `callDet` < 250 ms, Bewertung (sauber / Übertritt / Arm), nachträglich getipptes „Daneben“ zählt, Messwert im Log.
  - Startmenü: Karte öffnet `aussenspieler/`, „← Alle Trainings“ führt zurück, kein Querscrollen bei 390 px.
  - Mikrofon über das Fake-Mikrofon von Chromium mit der künstlichen Hallen-Tonspur aus `wav.mjs`: genau die 3 Rufe; Stopp während des Starts → Mikro bleibt aus.
- Nach jeder Änderung an Erkennung, Ablauf oder Zuruf `npm test` laufen lassen.

## Ablauf (Zustandsautomat)
`off` → `ready` → `runup` → `air` → `cool` → `ready` …
- **ready**: Kamera-Modus „auto“ sagt ein Ziel an, sobald der Spieler ≥ 0,6 s sichtbar ist und steht (Hüfte in den letzten 0,6 s < 0,15 Körperlängen bewegt; vorher kam die Ansage schon beim Zurückgehen, der Anlauf begann aus dem Gehen, und Übertritt/Sprunghöhe wurden falsch erkannt – im Demo mit 1 s Pause gefunden); Modus „timer“ nach 1,5 s; Modus „call“ (Nach Zuruf): Spieler ruft laut, Piep als Quittung, Ziel nach fest 1/2/3/4/5 s oder zufällig 1–5 s (Auswahl „Ziel nach Zuruf“, gespeichert als `callMin`…`callMax`, Standard zufällig 1–5). Ein Ruf in der Pause nach dem Wurf zählt auch, die Ansage kommt dann frühestens nach der Pause. Im Video-Modus keine Ansagen.
- **runup**: Ziel angesagt, wartet auf Sprung (Timeout 8 s → zurück zu ready).
- **air**: Sprung erkannt, wenn Hüfte > 0,12 × Körperlänge über Basis UND beide Füße > 0,04 × Körperlänge über Boden, 2 Frames in Folge.
  - Körperlänge = Abstand Schultermitte–Knöchelmitte. Boden = Gerade über die Zeit durch den tiefsten Fußpunkt (Regression + 80. Perzentil der Abweichung), Basis-Hüfte = Median, jeweils aus Frames 0,8–0,15 s vorher. Die Gerade nötig, weil der Fußpunkt im Bild wandert, wenn der Spieler auf die Kamera zuläuft; mit festem Boden lag der Absprung-Frame dann schon in der Luft (im Demo gefunden: Übertritt übersehen).
  - Absprung-Frame = letzter Frame mit Fuß < 0,035 × Körperlänge über Boden; Sprungbein = der tiefere Fuß dort.
- **Landung**: nach > 0,25 s, wenn Fuß wieder am Boden oder Hüfte < 0,04 über Basis; spätestens nach 1,8 s oder 0,4 s ohne Pose.
- **cool**: Pause nach Wurf (Einstellung, Standard 4 s; im Video-Modus 0,6 s).

## Aufgaben (`tasks.js`, `taskRun.js`)
- Auswahl oben in der Einrichtung (nur Kamera-Modus): „Freies Training“ (Standard) oder eine Aufgabe (`settings.task`). Der Start-Button heißt dann „Aufgabe starten“.
- Start: statt „Los geht's“ wird die Anleitung der Aufgabe gesprochen; die erste Zielansage wartet, bis sie vorbei ist (`app.holdUntil`, Dauer grob aus der Wortzahl).
- Jeder Wurf wird nach der normalen Bewertung mit `judge(id, entry, th())` geprüft → `{ok, why, say}` oder `null` (zählt nicht). Die Ansage nach dem Wurf ist dann das Aufgaben-Ergebnis + „Noch N.“ statt Lob/Tipp (der Tipp steht weiter auf der Karte). Log-Eintrag bekommt `task:{id, run, ok, why, n}`.
- Zähler oben rechts groß („3/10“, darunter „✓ 2 · Ziel 7“). Nach der letzten Wiederholung: „Aufgabe geschafft: 8 von 10“ bzw. „7 von 10. Ziel war 8 …“, Training stoppt (nach dem Speichern des letzten Clips), Ende-Karte mit „Nochmal“ (neue Serie) und „Fertig“.
- Verlauf: `settings.taskHist[id]` = die letzten 30 Serien `{at, run, sid, hits, n, goal, passed}`; Bestwert (beste Quote) und letztes Ergebnis stehen in der Einrichtung. Log-Fenster und Bericht haben einen Abschnitt „Aufgaben“ (Serien des aktuellen Trainings).
- Stopp mitten in einer Serie verwirft sie (kein Verlauf-Eintrag).
- **A1 Absprung an der Linie** (`line`): 10 Würfe, Ziel 7. Geschafft: kein Übertritt und `m.line` ≥ `TH.taskLineFar` (−0,2 KL ≈ 30 cm vor der Linie). Ansage „Geschafft. 15 Zentimeter vor der Linie.“ / „40 Zentimeter vor der Linie. Näher ran.“ / „Übertritt.“ (cm auf 5 gerundet, über `KL_CM` geschätzt).
- **A2 Entscheidung in der Luft** (`air`, `callInAir`): 10 Würfe, Ziel 7. Statt des Ziels sagt `announce()` nur „Los“ (`app.pending` = schon gewähltes Ziel, HUD „Los!“, Clip-Label „Los“). In `startAir()` wird das Ziel sofort angesagt (`callLate`), `app.target` gesetzt und gemessen: `m.callDet` = ms vom Absprung-Frame bis die App das Ziel abschickt (Erkennung, 2 Frames), `m.callLag` = ms bis die Sprachausgabe wirklich beginnt (`onstart` der Äußerung, kann nach der Landung nachgetragen werden; im headless Test ohne Stimme leer). Die Ansage nach der Landung wird angehängt (`say(…, {queue:true})`), damit das Ziel nicht abgeschnitten wird. Geschafft: kein Übertritt, richtiges Sprungbein, Wurfarm oben, nicht „Daneben“ getippt (Sprunghöhe/Drehung zählen hier nicht). Würfe ohne „Los“ zählen nicht. „Daneben“ nachträglich auf der Karte → `taskRecount(entry)` zieht `entry.task` und den Zähler nach.
- Demo: `TASK_VAR` in `demo/sim.js` gibt je Aufgabe eine feste Wurf-Folge vor (A1: nah, zu weit, Übertritt, nah).
- Neue Aufgabe = Eintrag in `TASKS` + Fall in `judge()` + Unit-Test + Wurf-Folge in `TASK_VAR` + Browser-Test.

## Zuruf (Mikrofon, `shout.js`, `shoutDetect.js`)
- Kein Spracherkenner, nur Pegel und Klang. Alle 30 ms eine FFT (2048 Punkte): Pegel im Stimmbereich 200–1200 Hz (`v`) und im hohen Bereich 2,5–6 kHz (`hi`). Grundpegel = Mittel der ersten 0,5 s mit Ton (Messungen ganz ohne Ton beim Mikro-Start, unter −150 dB, werden übersprungen), danach unterhalb der Schwelle langsam nachgeführt (nach unten schneller). Schwelle = Grundpegel + Empfindlichkeit (`sens`: low 20 / mid 14 / high 9 dB, mindestens −75 dB).
- Ein Ruf zählt am **Ende** des lauten Abschnitts, wenn er
  - mindestens 120 ms nahe seinem Höchstwert bleibt (Ballaufprall = kurzer Knall + Nachhall, zählt nicht),
  - höchstens 2 s dauert (länger = Dauerlärm: der Grundpegel zieht dann mit, ~1,5 s; Zähler `busy`, kurze Einbrüche des Lärms zählen nur zurück, statt ihn zu löschen),
  - nach Stimme klingt: in ≥ 60 % der Messungen `v` > `hi` (Schuhquietschen und Pfiffe sind hoch),
  - aus der Ruhe kommt: davor ≥ 0,3 s unter der Schwelle (sonst sind es Spitzen im Dauerlärm),
  - und 1,5 s Sperre nach dem letzten Ruf.
- Zusätzlich muss der Spieler im Bild sein (in den letzten 2 s erkannt), sonst Hinweis „Zuruf gehört, aber niemand im Bild“. So lösen Rufe von anderen Feldern nicht aus.
- Echo-/Rauschunterdrückung und Pegelautomatik aus (sonst wird der Ruf weggeregelt). Während der eigenen Sprachausgabe (+0,4 s) und 1,2 s nach einer Zielansage wird nicht gehört.
- **Mikro testen** (Einrichtung, nur im Modus „Zuruf“): Pegel-Balken, weißer Strich = Schwelle, grün + Piep = Ruf erkannt (mit Zähler). Darunter die Empfindlichkeit „Laute Halle / Mittel / Leise Halle“ (= `sens` low/mid/high), direkt vor Ort einstellbar. Im Training kleine Anzeige „Mikro“ oben im Bild (rot = Mikro liefert keinen Ton).
- Mikro an/aus nur über `syncMic()` (`micUse.test` für den Mikro-Test) (Start/Stopp, Moduswechsel, Wechsel Kamera ↔ Videodatei). Stopp während der Erlaubnis-Abfrage: das Mikro bleibt aus. Liefert das Mikro 2 s lang gar keinen Ton → Hinweis.
- Warum kein Wort-Erkenner: Web Speech Recognition braucht auf Android Netz (Google-Server), ist in der lauten Halle unzuverlässig und hat Verzögerung. Lautstärke geht offline und sofort.
- Getestet (siehe Tests): künstliche Pegelverläufe und eine künstliche Hallen-Tonspur über das Fake-Mikrofon von Chromium (Rauschen, Ballaufpralle mit Nachhall, Schuhquietschen, Pfiff, 8 s zweite Gruppe 20 dB lauter, 3 Rufe): genau die 3 Rufe erkannt. In der Halle noch nicht getestet.

## Wurf-Videos (`clips.js`)
- Aufnahme ab der Zielansage bis 0,8 s nach der Landung (ohne Ansage: laufend, nach 6 s neu begonnen, aber nur, wenn der Spieler gerade steht oder nicht im Bild ist, damit der Anlauf im Clip bleibt; spätestens nach 15 s). Aufgenommen wird ein Bild aus Kamerabild + Overlay (Linie, Skelett) + Zielname, max. 720 px breit, 30 fps, 2 Mbit/s (~350 KB pro Wurf).
- Format: H.264 bevorzugt (`video/mp4;codecs=avc1…`, sonst WebM H.264, dann VP8). Grund: H.264 läuft auf Handys meist im Hardware-Encoder und nimmt der Pose-Erkennung keine Rechenzeit weg, und MP4 lässt sich überall abspielen und teilen (WhatsApp, Galerie). VP9 nicht mehr (oft Software-Kodierung).
- Einstellung „Wurf-Videos: Aufnehmen / Aus“ (`clips`). Aus spart Rechenzeit und Speicher. In der Halle die fps-Anzeige mit und ohne Videos vergleichen: fällt sie deutlich (z. B. von 30 auf 20), Videos ausschalten oder Modell „Lite“ nehmen.
- Gespeichert in IndexedDB `awc-clips` (Demo: `awc-demo-clips`), Schlüssel = `entry.time`, Log-Eintrag bekommt `clip:true`. Nur die letzten 60 Clips bleiben. „Gesamtes Log löschen“ löscht auch die Clips.
- Ansehen: Button „▶︎ Video ansehen“ auf der Ergebnis-Karte und „▶︎ Video“ pro Wurf im Training-Fenster. Startet in 0,5×, Schleife, 1× / 0,5× / 0,25×, „Speichern“ teilt die Datei (Android) oder lädt sie herunter.
- Nur Kamera-Modus (bei Video-Dateien gibt es das Video ja schon).

## Prüfungen (in `evaluate()`, `aussenspieler/js/analysis.js`), Priorität für den Tipp
1. **over – Übertritt**: Fußspitze oder Ferse des Sprungbeins im Absprung-Frame auf der Torraum-Seite der markierten 6-m-Linie. Ohne Linie: nicht geprüft.
   - Die 6-m-Linie ist **gebogen** (Viertelkreise mit 6 m Radius um die Pfosten + 3 m gerades Stück). Markierung daher als beliebig viele Punkte entlang des Bogens (≥ 2, empfohlen 4–6) oder per Ablaufen, danach 1 Punkt im Torraum (siehe Einrichtung).
   - `curve()` legt eine Catmull-Rom-Kurve durch die Punkte; `lineSide()` nimmt das Kreuzprodukt zum nächstgelegenen Kurvenstück (Endstücke verlängert, Abstand seitenverhältnis-korrigiert). Funktioniert im perspektivischen Bild ohne Kalibrierung.
2. **leg – Sprungbein**: Rechtshänder links, Linkshänder rechts.
3. **arm – Wurfarm**: bestes Frame im Fenster −0,04 … +0,08 s um den Absprung. Handgelenk über Nase = gut, über Schulter = mittel (Tipp), sonst zu tief.
4. **rot – Körperdrehung**: Schulter-Yaw minus Hüft-Yaw aus worldLandmarks (x/z-Ebene). Wert = max(Spannweite der Verwindung, Änderung Schulter-Yaw) vom Absprung bis Wurf + 0,1 s. Grenze 25°, bei „falscher Seite“ (RH auf RA, LH auf LA) 35°; ≥ Grenze gut, ≥ halbe Grenze mittel (Tipp), darunter schlecht.
5. **jump – Sprunghöhe**: (Basis − Hüft-Höchstpunkt) / Körperlänge: ≥ 0,25 hoch, ≥ 0,17 mittel, sonst flach. Kameraposition 2: ≥ 0,36 hoch, ≥ 0,30 mittel (`TH_POS.court`). Grund: auf Position 1 läuft der Spieler in der Luft auf die erhöhte Kamera zu, die Hüfte sinkt im Bild, die Höhe wird zu klein gemessen; von der Seite (Position 2) passt sie fast zur echten Höhe. Im Demo dieselben Würfe: Position 1 0,32 / 0,26 / 0,13, Position 2 0,42 / 0,38 / 0,24.
6. **lean – Oberkörper** beim Wurf (Frame mit max. Handgelenk-Geschwindigkeit): < 15° aufrecht; > 25° Richtung Torraum = kippt nach vorn; weg vom Torraum = Rücklage (ok).

Alle Grenzwerte stehen in `TH` (`aussenspieler/js/config.js`), Abweichungen je Kameraposition in `TH_POS`; der Code holt sie über `th()` (`store.js`).

Feedback: Sprachansage = zufälliges Lob aus den guten Punkten + Kurz-Tipp des wichtigsten Fehlers. Texte in `tips()` (`aussenspieler/js/feedback.js`) (short / tip / drill), Labels in `LABEL_GOOD` / `LABEL_BAD`, Reihenfolge in `PRIO`.

## Daten (localStorage)
- `awc-settings`: `task` (`free` oder Aufgaben-id), `taskHist` (Verlauf je Aufgabe), `hand` (R/L), `pos` (LA/RA), `camPos` (base/court), `lines{base,court}` (Linie je Kameraposition), `mode` (auto/timer/call), `callMin`, `callMax`, `sens` (low/mid/high), `clips` (Wurf-Videos an/aus), `pause`, `camera`, `model`, `targets[{name,on}]`, `line{pts[],inside,at,snapped,ref{w,h,g}}` (normalisiert 0–1; altes Format `{a,b,inside}` wird beim Laden zu `pts:[a,b]`), `session{id,start,last}`.
- Demo-Modus: dieselben Daten unter `awc-demo-settings` / `awc-demo-log`.
- `awc-log`: Array von Würfen `{nr, sid, target, res[{ok,txt}], issues[], good[], praise, main, tip, rot, noLine, m, hit, time, video, clip, task}`; max. 1000 Einträge. `task` nur bei Würfen in einer Aufgabe: `{id, run, ok, why, n}`.
  - `m` = rohe Messwerte zum Kalibrieren (bei „Entscheidung in der Luft“ zusätzlich `callDet`, `callLag` in ms): `line` (Fuß zur Linie beim Absprung, KL, + = im Torraum), `arm` (Handgelenk über der Nase, KL), `rot` (°), `jump` (Hüfte über Anlauf-Höhe, KL), `lean` (Oberkörper beim Wurf, °, + = Richtung Torraum), `fps` (Pose-Bilder pro Sekunde um den Sprung), `cam` (Kameraposition base/court). KL = Körperlänge Schulter–Knöchel.
- Neues Training automatisch nach > 3 h Pause oder per Button.

## Bericht
- `reportText()` → Text für Teilen-Menü (`navigator.share`, Fallback Zwischenablage).
- `reportHTML()` → eigenständige HTML-Seite (`Wurfbericht-JJJJ-MM-TT.html`), teilen per `navigator.share({files})` oder Download.

## Hallentest und Kalibrieren
Die Grenzwerte (`TH` in `aussenspieler/js/config.js`) sind bisher nur im Demo geprüft. Beim ersten Hallentest:
1. Aufbau: Handy erhöht (1,5–2 m), schräg von vorn auf die Absprungzone. Linie ablaufen, prüfen, ob die rote Linie auf dem Strich liegt.
2. fps oben rechts ansehen, mit „Wurf-Videos“ an und aus. Ziel ≥ 25 fps. Fällt es mit Videos deutlich, Videos aus.
3. Zuruf: Modus „Nach Zuruf“, in der Einrichtung „Mikro testen“. Vom Startpunkt rufen → grün und Piep. Ball prellen, Schuhe quietschen lassen, pfeifen → darf nicht zählen. Sonst Empfindlichkeit ändern.
4. Würfe für die Grenzen, je 5–10 und bewusst: saubere Würfe; knapper Übertritt (Fuß auf/hinter der Linie); flache Sprünge; Arm unten; wenig Drehung; Oberkörper nach vorn fallen lassen. Reihenfolge notieren.
5. Danach im Training-Fenster die Messwerte pro Wurf ansehen (Zweifelsfälle mit „▶︎ Video“ prüfen) und „Bericht als Datei“ teilen: der Bericht hat die Tabelle „Messwerte“.
6. Grenzen in `TH` (Position 1) bzw. `TH_POS.court` (Position 2) zwischen die Werte der guten und der bewusst schlechten Würfe legen. Übertritt: liegen echte Übertritte nur knapp im Plus oder saubere Absprünge im Plus, zuerst die Linie prüfen (Ablaufen wiederholen, Kamera fester).
- Aufgabe „Entscheidung in der Luft“: 10 Würfe, Spalte „Ansage“ im Bericht ansehen (zweiter Wert = Sprachausgabe am Handy). Kommt das Ziel erst nach ~400 ms, hört der Spieler es zu spät (Flugzeit ~0,6 s). Dann: kürzere Ziel-Namen, kurze Töne statt Wörter oder die leichtere Variante (Ansage beim letzten Schritt) bauen.
- Aufgabe „Absprung an der Linie“: 10 Würfe bewusst in verschiedenen Abständen (Maßband/Klebeband 10, 20, 30, 40 cm vor der Linie), angesagte cm mit den echten vergleichen. Fenster `TH.taskLineFar` (heute −0,2 KL ≈ 30 cm) so legen, dass 30 cm gerade noch zählt.
- Beide Kamerapositionen getrennt kalibrieren (Spalte „Kamera“ im Bericht). Auch Oberkörper und Drehung können sich je Position unterscheiden; dann weitere Werte in `TH_POS` eintragen.
- cm-Angaben in Log und Bericht sind Schätzungen (`KL_CM` = 140 cm Schulter–Knöchel). Für die Grenzen zählen die Verhältnisse, nicht die genauen cm.

## Bekannte Grenzen
- Eine Kamera: Drehung, Sprunghöhe und Oberkörper sind Schätzungen. Übertritt hängt von Kamerawinkel und Linienmarkierung ab.
- Treffer werden nicht automatisch erkannt, sondern per Tippen erfasst.
- Schwellenwerte noch nicht in der Halle kalibriert.
- Kamera am besten erhöht (1,5–2 m), schräg von vorn auf die Absprungzone, gutes Licht, möglichst 60 fps.

## Ideen / offene Punkte
- Weitere Übungen und Trainingsarten mit Prioritäten: [`PLAYBOOK.md`](PLAYBOOK.md).
- Hallentest nach der Checkliste oben, danach `TH` anpassen.
- Ballflug/Treffer automatisch erkennen (Farberkennung der Ringe). Kameraposition 2 hat das Tor im Bild, dafür die passende Position.
- PDF-Bericht direkt erzeugen.

## Historie
- 2026-10-01: erste Version (Ansage, Übertritt, Sprungbein, Arm, Sprung, Oberkörper, Log, Video-Analyse).
- 2026-10-01: Körperdrehung, Position LA/RA, Lob + Tipp nach jedem Wurf, Training-Auswertung, Abschlussbericht teilen/herunterladen.
- 2026-10-01: 6-m-Linie als Bogen statt Gerade (mehrere Punkte, glatte Kurve) – vorher wurde am Flügel der Übertritt falsch bewertet.
- 2026-10-01: Aufteilung in `index.html`, `css/` und `js/`-Module (gleiches Verhalten, kein Build).
- 2026-10-01: Fix: Startanleitung (`#empty`) blieb trotz `hidden` sichtbar (CSS `display:flex`) und fing alle Tipps ab; Hinweis-Text ist jetzt durchlässig (`pointer-events:none`) und steht beim Linie-Markieren oben.
- 2026-10-01: Einrichtung vor dem Training (Start → Einrichtung → Training starten), „Zurück“ beim Antippen, Linie ablaufen mit Sprachansage.
- 2026-10-03: Strich am Boden erkennen und Linie einrasten (Ablaufen und Antippen), Hinweis auf gespeicherte Linie, Kamera-Check mit automatischem Nachjustieren, Demo-Modus (`?demo=1`) mit gezeichneter Halle und simulierter Person. Fix: Absprung-Frame beim Anlauf auf die Kamera zu (Boden als Gerade über die Zeit).
- 2026-10-03: Ansage „Nach Zuruf“ (Mikrofon, Ziel 1–5 s nach dem Ruf, einstellbar) und kurze Videos pro Wurf (Zeitlupe, speichern/teilen).
- 2026-10-03: Prüfung und Verbesserungen: Zuruf löst nicht mehr bei Dauerlärm, Quietschen, Pfiff aus, nur mit Spieler im Bild; Mikro bleibt nach Stopp aus; Mikro testen in der Einrichtung mit Pegelanzeige; Wurf-Videos in H.264/MP4 und abschaltbar, Anlauf bleibt im Clip; Ansage „Wenn Spieler im Bild steht“ wartet aufs Stehen (vorher Übertritt/Sprung falsch bei kurzer Pause); Messwerte pro Wurf für das Kalibrieren, Grenzen gesammelt in `TH`; automatische Tests in `tests/`.
- 2026-10-03: Zweite Kameraposition „Feld mit Tor“ (hinter dem 7-m-Punkt, Tor und Absprungzone im Bild) in der Einrichtung, eigene Linie je Position, eigene Sprunghöhen-Grenzen, Demo und Test für Position 2.
- 2026-10-03: Fix Zuruf: die ersten Rufe nach dem Mikro-Start gingen verloren (Messungen ohne Ton zogen den Grundpegel auf −200 dB). Fix: Ruf über Dauerlärm wurde manchmal verpasst, weil der Grundpegel bei kurzen Einbrüchen des Lärms nicht mehr nachzog.
- 2026-10-04: Baustein „Aufgabe“ (Serie mit Ziel, Zähler, Ansage pro Wurf, Ende-Karte mit „Nochmal“, Verlauf/Bestwert, Abschnitt in Log und Bericht) und erste Aufgabe A1 „Absprung an der Linie“. `TESTSTRATEGIE.md`.
- 2026-10-04: Gemeinsamer Code nach `shared/` (Grundstil, Helfer, Sprache, Bildschirm wach, KI laden, Demo-Halle und -Person), Vorbereitung für den 7-m-Trainer.
- 2026-10-04: Aufgabe A2 „Entscheidung in der Luft“ (Ziel erst beim Absprung, Verzögerung von Erkennung und Sprachausgabe als Messwert).
- 2026-10-03: Außenwurf-Coach in den Ordner `aussenspieler/` verschoben, im Wurzelverzeichnis ein Startmenü für mehrere Trainingsarten. Neue Adresse: https://gordon81.github.io/handballcoach/aussenspieler/ (Daten bleiben erhalten).
