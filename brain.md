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
- `manifest.webmanifest` & `sw.js` – PWA-Unterstützung für Offline-Betrieb in Sporthallen (Installierbarkeit als Handy-App, Caching aller Kern-Ressourcen via Service Worker).
- `shared/` – gemeinsamer Code aller Trainings (Pfade aus einem Training: `../shared/…` bzw. in JS `../../shared/js/…`):
  - `icon.svg` – Vektor-App-Icon und Favicon (Handball-Design) für alle Seiten und PWA-Manifest.
  - `css/base.css` – Farben, Schriften, Grundstil.
  - `js/utils.js` (Helfer, Service-Worker-Registrierung `registerServiceWorker()`), `js/speech.js` (Sprachausgabe `say(text, {queue})`: beste deutsche Stimme nach `voiceScore` (natürliche/Online/Google vor Systemstimmen, eSpeak/compact zuletzt), Tempo 0,95, `spokenText` schreibt Einheiten und „6-m-Linie“ aus und macht aus „·“ Satzpausen; Piep `beep()` mit weichem Ein-/Ausblenden; Tests lesen `window.__said`), `js/wakelock.js` (Bildschirm wach), `js/pose.js` (`createPose(model)`: MediaPipe laden, GPU mit CPU-Fallback; URLs `TV`, `MODELS`).
  - `js/mic.js` – Mikrofon-Pegel für alle Trainings (`micSampler()`: start/stop, alle 30 ms `onSample(v, hi, now, pk, lvl)`; Stimmbereich und hoher Bereich in dB aus der FFT, dazu aus dem Zeitsignal der letzten ~85 ms der Mittelpegel `lvl` und der lauteste 5-ms-Abschnitt `pk`). Der Zuruf im Außenwurf-Coach (`shout.js`) hängt sich daran.
  - `js/bounceDetect.js` – Ballaufprall erkennen (C2), ohne Browser: Knall = `pk` mindestens 10,5 dB über `lvl` (Crest) in mindestens 2 Messungen hintereinander, `pk` deutlich über dem Grundpegel (Empfindlichkeit `SENS` low 24 / mid 18 / high 12 dB), nicht hochfrequent (`hi <= v + 4`, Pfiff/Quietschen werden am Ende verworfen), 250 ms Sperre. Gezählt, wenn der Knall vorbei ist.
  - `js/hitDetect.js` – Treffererkennung ohne Browser: `detectHit(rings, tRelease)` (Bildänderung im Ring-Kreis gegen das Bild vor dem Wurf), `speedKmh`.
  - `js/demo/scene.js` – Demo-Szene: gezeichnete Halle (`setView(pos, look, move)`, `proj`, `drawFloor`) und Person aus Gelenken (`joints(P, R)`, `drawPerson`, `landmarks` im MediaPipe-Format, `ball`, `hand`). Das Verhalten der Person steht im Demo des jeweiligen Trainings.
  - `js/demoGuide.js` – wiederverwendbarer interaktiver 3D-Player für Anleitungsvideos („Korrekte Ausführung“) der Trainingsmodule (Play/Pause, Zeitlupe 1×/0,5×/0,25×, Phasenanzeige, DHB/KNSU-Kriterienliste, Varianten-Umschaltung, Offline-Video-Download).
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
  - `analysis.js` – `evaluate()`: die sechs Prüfungen (Rückraum: dazu Schritte und Abwurf im höchsten Punkt) und der Sprachtext.
  - `rings.js` – Treffererkennung: Ringe antippen, Ausschnitte sammeln, nach dem Wurf auswerten, Tempo (siehe Abschnitt „Treffererkennung und Wurftempo“).
  - `steps.js` – Schritte vor dem Absprung zählen (Rückraum), ohne Browser, unit-getestet.
  - `tasks.js` – Aufgaben als Daten (`TASKS`) und ihre Regeln (`judge`, `tally`, Ansagen, Verlauf, Bestwert). Reine Logik ohne Browser, unit-getestet.
  - `taskRun.js` – Aufgabe im Training: Serie starten (`beginTask`), jeden Wurf bewerten (`taskThrow`), Zähler `#taskBox`, Ende-Karte `#taskEnd` mit „Nochmal“/„Fertig“, Auswahl in der Einrichtung (`taskBlock`), Serien des Trainings für Log/Bericht (`sessionRuns`).
  - `feedback.js` – Labels, `PRIO`, `tips()`.
  - `draw.js` – Overlay (Linie, Skelett). `summary.js` + `report.js` – Auswertung und Bericht.
  - `ui/` – `setupView.js` (Einrichtung vor dem Training, Start/Stopp), `guideView.js` (interaktives 3D-Anleitungsvideo für alle Außenwurf- und Rückraum-Übungen nach DHB/KNSU), `controls.js` (Buttons, Video-Leiste, Training-Fenster), `settingsView.js`, `card.js` (Ergebnis-Karte), `logView.js`, `sheets.js`.
- `siebenmeter/` – 7-m-Trainer (zweite Karte im Startmenü), siehe Abschnitt „7-m-Trainer“:
  - `index.html` – Gerüst; Stil aus `shared/css/base.css` und `shared/css/trainer.css`, Kamera/Bühne aus `shared/js/stage.js`, Modal `#guideSheet`.
  - `js/rules.js` – Regeln ohne Browser (unit-getestet): `judge7()` (3-s-Regel, Linie, Standbein), `findThrow()`/`throwDone()` (Wurf ohne Sprung = schnellstes Handgelenk relativ zur Hüfte), `lineDist()`, Grenzen `TH7`, Serie `SERIES`.
  - `js/state.js` – Zustand `app`, `settings`/`log` im localStorage (`7m-settings`, `7m-log`; Demo `7m-demo-*`).
  - `js/main.js` – Kamera/KI, Hauptschleife, Ablauf mit Pfiff, Linie antippen, Einrichtung, Karte, Serie, Log, Bericht (`reportText`), Anleitungsvideo (`openGuide`).
  - `js/demo.js` – Demo: Kamera schräg hinter der 7-m-Linie, Person wirft nach dem Pfiff (`VARS`: sauber 1,2 s, zu langsam 3,4 s, Linie, Standbein), `truthLine()` für Tests.
- `abwehr/` – Abwehr-Beinarbeit (dritte Karte im Startmenü), siehe Abschnitt „Abwehr-Beinarbeit“: `index.html`, `js/rules.js` (Regeln ohne Browser: `judgeMove`, `nextCmd`, `summary`, Grenzen `TH_D`), `js/state.js` (Speicher `def-settings`, `def-log`; Demo `def-demo-*`), `js/main.js` (Ablauf, Einrichtung, Anleitungsvideo `openGuide`, Karte, Log, Bericht), `js/demo.js` (frontale Kamera, Person reagiert; `demo.done` = was sie wirklich getan hat).
- `passen/` – Pässe gegen die Wand (Karte im Startmenü), siehe Abschnitt „Pässe gegen die Wand“: `index.html`, `js/rules.js` (ohne Browser: `judgePass`, `releaseFrame`, `throwsFromPose`, `summary`, Grenzen `TH_P`), `js/state.js` (Speicher `pass-settings`, `pass-log`; Demo `pass-demo-*`), `js/main.js` (Ablauf, Einrichtung, Anleitungsvideo `openGuide`), `js/demo.js` (Person passt gegen die Wand, Aufprall wird direkt gemeldet; `demo.done`).
- `sprung/` – Sprungkraft (Karte im Startmenü), siehe Abschnitt „Sprungkraft“: `index.html`, `js/rules.js` (ohne Browser: `jumpTracker`, `summary`), `js/state.js` (Speicher `jump-settings`, `jump-log`; Demo `jump-demo-*`), `js/main.js` (Ablauf, Einrichtung, Anleitungsvideo `openGuide`), `js/demo.js` (Person springt auf der Stelle; `demo.done`).
- `shared/css/trainer.css`, `shared/js/stage.js` – Stil und Bühne der einfachen Trainings (7 m, Abwehr): Kamera oder Demo mit KI starten (`startSource`), Layout, Hinweis, große Anzeige, `bodyPoints`, `drawSkeleton`, Fenster, Stile für `#guideSheet` und `.guideBtn`.
- `tests/` (Wurzel) – automatische Tests (siehe „Tests“), nicht Teil der App.
- `README.md` – Kurzbeschreibung für GitHub.
- `DOKUMENTATION.md` – Anleitung für Nutzer: Bedienung, Einrichtung, Modi, Demo, Hallentest, wo Log, Videos und Einstellungen liegen und wie man sie löscht. Bei Änderungen an Bedienung oder Speicher mitpflegen.
- `PLAYBOOK.md` – Vorschläge für weitere Übungen und Trainings (Übungskarten, Prüfbarkeit, Aufwand, TODO-Liste, Reihenfolge). Erledigtes ist dort abgehakt.
- `QUELLEN.md` – fachliche Quellen der Übungen (DHB-Technikkriterien u. a.), was wofür verwendet wurde, was nicht erreichbar war, Widersprüche.
- `.claude/skills/demo-figuren/SKILL.md` – Skill für Claude: wie Demos und die simulierten Figuren gebaut und gesteuert werden (Koordinaten, Kamera, Parameter der Person, Verhalten, Varianten, Fallstricke, Vorgehen).
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
- Einmalig: `cd tests && npm install` (Playwright), Browser bei Bedarf `npx playwright install chromium`. Dann `npm test` (~10 min, alle Trainings) oder nur `npm run unit` (Sekunden, ohne Browser).
- `unit.mjs` (Node): Treffererkennung (Ball im Ring, Rauschen, Ball neben dem Ring, zu spät, zwei Ringe gleich stark, Tempo), Sprungkraft (Zählen, Höhe, Bodenkontakt, Bein, Wippen/Rauschen zählt nicht, Zusammenfassung), Pässe (`passen/js/rules.js`: Arm, Gegenbein je Wand-Seite und Wurfhand, Kamera-Zählung, Zusammenfassung), Ballaufprall (Knall zählt, Ruf/Quietschen/Pfiff nicht, schnelle Pässe einzeln, Empfindlichkeit), Rückraum-Schritte (`steps.js`: 2/3/4 Schritte, Rauschen), Abwehr-Regeln (`abwehr/js/rules.js`: Richtung, Reaktion, Verzögerung abziehen, gekreuzt, nächster Ruf, Zusammenfassung), 7-m-Regeln (`rules.js`: Zeit, Linie, Standbein, Hüpfer ist kein Wurf, Serie), Aufgaben-Regeln (`tasks.js`: Grenzen, cm-Ansage, Serie, Verlauf/Bestwert) und Ruf-Erkennung mit künstlichen Pegelverläufen: Ruf, Ballaufpralle, Quietschen, Pfiff, Dauerlärm + Ruf darüber (auch mit kurzen Einbrüchen), Mikro-Start ohne Ton, Sperre, eigene Ansage, Empfindlichkeit.
- `browser.mjs` (Playwright, headless Chromium, eigener kleiner Webserver `server.mjs`):
  - Demo von vorn bis hinten (Pause 1 s): Linie ablaufen (eingerastet, Median < 4 px, max < 12 px), 8 Würfe genau wie simuliert bewertet (gut, gut, Übertritt, flach + Arm unten), Videos gespeichert und abspielbar (MP4), „Videos aus“ → keine Clips, Zuruf-Modus (Ziel 2 s nach dem Ruf), Zuruf ohne Spieler im Bild ignoriert, Wurf ohne Ansage (Aufnahme beginnt nicht mitten im Anlauf neu, Clip gespeichert), „Kamera bewegen“ → Linie neu ausgerichtet, Mikro-Test in der Einrichtung (an, Ruf gezählt, Empfindlichkeit, aus); keine Fehler in der Konsole.
  - Demo mit Kameraposition 2: Linie ablaufen (eingerastet, genau), 4 Würfe wie simuliert bewertet, Wechsel 1 ↔ 2 behält die Linie jeder Position.
  - Aufgabe „Absprung an der Linie“ in Handy-Größe (390 px): Auswahl in der Einrichtung, 4 Würfe (nah, zu weit, Übertritt, nah) richtig bewertet, Ansagen (über `window.__said`), Ende-Karte, Verlauf, Log und Bericht, „Nochmal“, Tipp-Flächen ≥ 44 px.
  - Aufgabe „Entscheidung in der Luft“: vor jedem Wurf „Los“, das Ziel wird erst im Absprung angesagt (Zustand beim Sprechen), `callDet` < 250 ms, Bewertung (sauber / Übertritt / Arm), nachträglich getipptes „Daneben“ zählt, Messwert im Log.
  - 7-m-Trainer in Handy-Größe: Linie antippen (Treffer der echten Linie), Serie mit 4 Würfen (sauber, zu langsam, Linie, Standbein) richtig bewertet, Ziel vor dem Pfiff, Zeit ±0,2 s zur Simulation, Ansagen, Ende-Karte, Log und Bericht, Tipp-Flächen ≥ 44 px.
  - Aufgabe „Kreisläufer“: vier Würfe (richtig, richtig, falsch herum, Übertritt) richtig bewertet, Drehung ~180°, Reaktion ~0,4 s, Ansage „Links./Rechts.“ vor dem Ziel.
  - Aufgabe „Gegenstoß auf Zeit“: Mikro an ohne Modus „Zuruf“, vier Würfe (schnell, langsam, schnell, Übertritt) richtig bewertet, Zeiten plausibel, Mikro nach der Serie aus.
  - Aufgabe „Winkel vergrößern“: auf Position 1 Hinweis statt Start; auf Position 2 vier Würfe (nach innen, gerade, nach innen, Übertritt) richtig bewertet.
  - Aufgaben „Wurfhöhe auf Ansage“ (Ansage „Hoch./Hüfte.“ vor dem Ziel, Wurf 3 absichtlich falsch → 3 von 4) und „Serie unter Ermüdung“ (eigene Pause 2 s, Warnung „flacher“, Ergebnis in Prozent, Log).
  - Treffererkennung (Position 2): Ringe antippen, 4 Würfe (Treffer, Treffer, daneben, Treffer) automatisch richtig erkannt, „Treffer./Daneben.“ gesprochen, Tempo 40–70 km/h (Demo 56), Log; auf Position 1 keine Erkennung.
  - Rückraum-Modus: 9-m-Linie ablaufen (Ansage, genau), 4 Würfe (sauber 3 Schritte / 4 Schritte / innerhalb 9 m / Abwurf zu spät) richtig bewertet, Drehung zählt nicht, Log und Bericht, eigener Speicher.
  - Pässe gegen die Wand in Handy-Größe: Runde 12 s, jeder Pass gezählt und Arm/Gegenbein so bewertet, wie die simulierte Person geworfen hat (sauber, Hüftwurf, falsches Bein), Bestwert, Karte, Log, Bericht.
  - Sprungkraft in Handy-Größe: 10 Strecksprünge, gemessene Höhen proportional zu den simulierten, Bodenkontakt; Einbein links/rechts mit Wechsel, rechts stärker, kein Fehlalarm beim Beinwechsel, Vergleich nur mit gleicher Übung, Log, Bericht.
  - Abwehr-Beinarbeit in Handy-Größe: Runde mit ~6 Rufen, jede Bewegung so bewertet, wie die simulierte Person sie gemacht hat (Richtung, Reaktion ±0,3 s, richtig/falsch, gekreuzt), Grundstellung tief, Ansagen, Karte, Log, Bericht.
  - Startmenü: Karten öffnen `aussenspieler/`, `siebenmeter/` und `abwehr/`, „← Alle Trainings“ führt zurück, kein Querscrollen bei 390 px.
  - Mikrofon über das Fake-Mikrofon von Chromium mit der künstlichen Hallen-Tonspur aus `wav.mjs`: genau die 3 Rufe; genau die 3 Ballaufpralle (`bounceDetect.js`), keine Rufe, kein Pfiff, kein Quietschen, kein Lärm der zweiten Gruppe; Stopp während des Starts → Mikro bleibt aus.
- Nach jeder Änderung an Erkennung, Ablauf oder Zuruf `npm test` laufen lassen.

## Ablauf (Zustandsautomat)
`off` → `ready` → `runup` → `air` → `cool` → `ready` …
- **ready**: Kamera-Modus „auto“ sagt ein Ziel an, sobald der Spieler ≥ 0,6 s sichtbar ist und steht (Hüfte in den letzten 0,6 s < 0,15 Körperlängen bewegt und Körpergröße im Bild < 6 % geändert, sonst gilt Gehen direkt auf die Kamera zu oder weg als Stehen; vorher kam die Ansage schon beim Zurückgehen, der Anlauf begann aus dem Gehen, und Übertritt/Sprunghöhe wurden falsch erkannt – im Demo mit 1 s Pause gefunden); Modus „timer“ nach 1,5 s; Modus „call“ (Nach Zuruf): Spieler ruft laut, Piep als Quittung, Ziel nach fest 1/2/3/4/5 s oder zufällig 1–5 s (Auswahl „Ziel nach Zuruf“, gespeichert als `callMin`…`callMax`, Standard zufällig 1–5). Ein Ruf in der Pause nach dem Wurf zählt auch, die Ansage kommt dann frühestens nach der Pause. Im Video-Modus keine Ansagen.
- **runup**: Ziel angesagt, wartet auf Sprung (Timeout 8 s → zurück zu ready).
- **air**: Sprung erkannt, wenn Hüfte > 0,12 × Körperlänge über Basis UND beide Füße > 0,04 × Körperlänge über Boden, 2 Frames in Folge. Basis der Hüfte für die Erkennung = Gerade über die Zeit (wie der Boden), damit Weggehen von der Kamera (Hüfte steigt im Bild) kein Sprung ist; die gemessene Sprunghöhe nutzt weiter den Median (darauf sind die Grenzen eingestellt).
  - Körperlänge = Abstand Schultermitte–Knöchelmitte. Boden = Gerade über die Zeit durch den tiefsten Fußpunkt (Regression + 80. Perzentil der Abweichung), Basis-Hüfte = Median (Sprunghöhe) bzw. Gerade über die Zeit (Erkennung), jeweils aus Frames 0,8–0,15 s vorher. Die Gerade nötig, weil der Fußpunkt im Bild wandert, wenn der Spieler auf die Kamera zuläuft; mit festem Boden lag der Absprung-Frame dann schon in der Luft (im Demo gefunden: Übertritt übersehen).
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
- **A3 Wurfhöhe auf Ansage** (`height`, `calls:['Hoch','Hüfte']`): vor dem Ziel sagt die App „Hoch.“ oder „Hüfte.“ (`taskCall()` in `announce()`, HUD „Hoch · Orange kurz“, Log `entry.call`). Gemessen im Wurf-Frame (max. Handgelenk-Geschwindigkeit, `e.throwF`): `m.armT` / `m.shT` / `m.hipT` = Handgelenk über Nase / Wurfschulter / Hüfte (KL). „Hoch“ geschafft: `armT > TH.taskHighArm` (0); „Hüfte“: `shT < TH.taskHipShoulder` (0) und `hipT ≥ TH.taskHipLow` (−0,1). Würfe ohne Höhen-Ansage zählen nicht. 10 Würfe, Ziel 7.
- **A5 Serie unter Ermüdung** (`tired`, `goal:null`, `pause:2`): 20 Würfe mit 2 s Pause (`taskPause()`). Jeder Wurf ohne Übertritt zählt als geschafft; ab Wurf 6 Warnung „Sprung wird flacher. Knie hoch.“, wenn `m.jump` unter `TH.taskTiredKeep` (90 %) des Schnitts der ersten 5 liegt. Serie geschafft (`result()`): Schnitt der letzten 5 ≥ 90 % der ersten 5 und kein Übertritt. Anzeige/Bestwert in Prozent (`rec.score`, `rec.label`).
- **A4 Winkel vergrößern** (`angle`, `needCam:'court'`): nur mit Kameraposition 2 (sonst Hinweis statt Start; von Position 1 ist der Flug im Bild kaum von einem geraden zu unterscheiden, im Demo gemessen). `m.flyAng` = Winkel im Bild zwischen Anlauf (Hüfte, letzte 0,35 s vor dem Absprung) und Flug (Hüfte Absprung → Landung); Vorzeichen + = der Flug geht entlang der Linie weiter nach innen als ein gerader (`lineTangent()` in `line.js`, Richtung = Reihenfolge der Linienpunkte: beim Ablaufen außen → innen, beim Antippen von außen nach innen tippen). Geschafft: kein Übertritt und `flyAng ≥ TH.taskFlyAng` (20). Angesagt wird nur „Geschafft. Gut nach innen.“ / „Zu gerade.“, weil der Bildwinkel kein Hallenwinkel ist. Demo: Position 2 gerade ~0°, nach innen ~160°.
- **A6 Gegenstoß auf Zeit** (`fastbreak`, `shout:true`): 5 Würfe, Ziel 4. Das Mikrofon ist in dieser Aufgabe immer an (`taskShout()` in `syncMic`), es gibt keine Ansage ohne Ruf. Ruf (auch ohne Spieler im Bild) → Piep, Ziel sofort, Uhr läuft (`app.breakAt`), Anlauf-Zeitlimit 12 s. Beim Wurf `m.breakT` = s vom Ruf bis zum Absprung-Frame. Geschafft: ≤ `TH.taskBreakMax` (4,0 s), kein Übertritt, richtiges Sprungbein. Demo: Person startet 11 m vor der Linie, ruft selbst; schnell 5,5 m/s, langsam 2 m/s.
- **B3 Kreisläufer: Drehen auf Ansage** (`pivot`, `calls:['Links','Rechts']`): als Aufgabe im Außenwurf-Coach (braucht 6-m-Linie und Absprung-Erkennung). Spieler steht mit dem Rücken zum Tor an der Linie, Ansage „Links. Orange kurz“. Gemessen (`turnSince` in `tracking.js`): Summe der Änderungen des Hüft-Yaws (`worldLandmarks` 23→24) von der Ansage (`app.task.callT`) bis zum Absprung, `m.turn` (° , + = nach links, `TURN_SIGN` in `config.js`, im Demo bestimmt), `m.react` = s bis 20° gedreht. Geschafft: Richtung stimmt, |Drehung| ≥ `TH.taskTurnMin` (60°), kein Übertritt. Ansage „Richtig. Reaktion 0,4 Sekunden.“ / „Falsche Richtung.“. 10 Würfe, Ziel 7.
- Serien-Ende allgemein: `result(task, entries)` → `{passed, score, label, say}`; Zählaufgaben „8 von 10“, eigene Kriterien wie A5. Training stoppt, danach erst die Ende-Karte (`onSeriesDone`).
- Demo: `TASK_VAR` in `demo/sim.js` gibt je Aufgabe eine feste Wurf-Folge vor (A1: nah, zu weit, Übertritt, nah; A3: folgt der Ansage, Wurf 3 macht das Gegenteil; A5: ab Wurf 3 flacher). Die Person kann aus der Hüfte werfen (`P.low` in `shared/js/demo/scene.js`).
- Neue Aufgabe = Eintrag in `TASKS` + Fall in `judge()` + Unit-Test + Wurf-Folge in `TASK_VAR` + Browser-Test.

## Rückraum-Modus (`aussenspieler/?rr=1`)
- Dieselbe App wie der Außenwurf-Coach, Karte „Rückraum: Sprungwurf“ im Startmenü. `RR` und Texte `TXT` in `config.js` (Titel, „9-m-Linie“, „Richtung Tor“ statt „Torraum“), eigener Speicher `rr-settings`, `rr-log`, IndexedDB `rr-clips` (Demo `rr-demo-*`). Einstellung „Position“ ausgeblendet, eine Kameraposition „1 · Schräg vorn“ (Handy am Torraum schräg vor dem Rückraum, der Spieler läuft auf die Kamera zu – wie beim Außenwurf, sonst steht der vordere Fuß beim Absprung im Bild höher als der Boden und das Sprungbein wird falsch erkannt).
- Prüfungen: `over` = Absprung innerhalb der 9 m („Absprung zu nah“), Sprungbein, Wurfarm, **steps** = Bodenkontakte vom Anlauf bis zum Absprung (`steps.js`, Ziel `TH.steps` = 3, sonst Tipp „Drei Schritte, dann hoch“), **peak** = Abwurf höchstens `TH.peakDt` (0,15 s, bei 30 fps sind das ~5 Bilder) vom höchsten Punkt der Hüfte („zu früh“ / „zu spät“), Sprunghöhe mit `TH_RR` (0,19 / 0,13 KL, im Demo gemessen), Oberkörper. Die Drehung steht nur zur Info auf der Karte. `PRIO` Rückraum: over, leg, steps, arm, peak, jump, lean. Messwerte `m.steps`, `m.peakDt` (Log, Bericht).
- Schritte zählen (`countSteps`): ein aufsetzender Fuß steht im Bild fast still, ein schwingender ist schneller als der Körper. Kontakt = Fuß wechselt von „schwingend“ (> 1,3 × Hüft-Tempo, mind. 0,5 KL/s) zu „stehend“ (< 0,5 ×), je 2 Frames in Folge; gezählt ab 0,15 s nach der Zielansage, höchstens 2,5 s vor dem Absprung. Unabhängig von der Lage des Bodens im Bild.
- Demo: Kamera am Torraum, Person läuft am 9-m-Bogen bei 125° an (`G` in `demo/sim.js`), mit echten Schritten (`stepRun`, Füße stehen fest, Sprungbein zuletzt, 0,15 s Stand vor dem Absprung). Würfe (`VAR_RR`): sauber, vier Schritte, innerhalb 9 m, Abwurf zu spät.
- Aufgaben gibt es auch hier; ihre Demo-Würfe sind für den Außenwurf gedacht.

## 7-m-Trainer (`siebenmeter/`)
- Aufbau: Handy seitlich hinter der 7-m-Linie, erhöht (1–1,5 m). Einrichtung: „Linie antippen“ = beide Enden der 7-m-Linie, dann ein Punkt Richtung Tor (`settings.line = {a, b, goal}`, normiert). Die Linie gilt als Gerade (auch über die Enden hinaus). Kein Einrasten auf den Strich (1 m, gut zu tippen).
- Einstellungen in der Einrichtung: Wurfhand, „Ziel vor dem Pfiff ansagen“ (Ja: „Oben links“ … aus `settings.targets`), Übung „Serie 10 Würfe, Ziel 8“ oder „Frei“.
- Ablauf (`app.state`): `ready` – wartet, bis der Spieler 1 s still steht (Hüfte < 0,1 KL bewegt) und alle Fußpunkte hinter der Linie sind → Ziel ansagen, `set` – Pfiff nach 1,6 s + zufällig 0–1,4 s (ohne Ziel 1 s + …). Bewegt er sich vorher oder steht über der Linie: „Zu früh bewegt“, zurück zu `ready`. Pfiff = Ton 2,8 kHz, 450 ms (`beep`) und „Pfiff!“ groß im Bild → `go` – bis der Wurf vorbei ist (`throwDone`: Spitze der Handgelenk-Geschwindigkeit + 0,25 s) oder 4,5 s → bewerten → `cool` (Pause, Standard 4 s) → `ready`.
- Bewertung (`judge7`): Wurf = Frame mit der höchsten Geschwindigkeit des Wurf-Handgelenks relativ zur Hüfte nach dem Pfiff, mindestens `vThrow` 3 KL/s (C3 „Wurf ohne Sprung“). Zeit > 3,0 s → „zu langsam“; kein Wurf in 4,5 s → „kein Wurf erkannt“. Linie (Regel 14:5): Spitze oder Ferse eines Fußes vom Pfiff bis zum Abwurf jenseits der Linienmitte (`lineTouch` 0) → „Linie übertreten“; ein angehobener Fuß zählt dabei nicht (im Bild läge er sonst scheinbar über der Linie). Standfuß (Regel 15:1): ein Teil eines Fußes muss ununterbrochen am Boden bleiben, der andere darf abheben, Rutschen ist erlaubt. Je Fuß die größte Höhe über seiner Lage beim Pfiff (über 3 Bilder geglättet); Fehler nur, wenn beide Füße irgendwann mehr als `footLift` 0,05 KL abgehoben waren → „Ein Fuß muss am Boden bleiben.“ (Vorher wurde fälschlich schon Rutschen ab 7 cm als Fehler gewertet.) Messwerte im Log: `m = {time, line, foot, lift}` (KL).
- Ansage nach dem Wurf: „Sauber. 1,4 Sekunden.“ / „Zu langsam. 3,4 Sekunden.“ / „Linie übertreten.“ / „Standbein bewegt.“, in der Serie + „Noch N.“ bzw. „Serie geschafft: 8 von 10.“. Karte mit Zeit, Linie, Standbein und Treffer/Daneben. Serien-Verlauf: `settings.seriesHist` (letzte 30).
- Noch nicht: Wurf-Videos, Video-Datei-Analyse, Bestwert in der Einrichtung, Treffererkennung. Die Grenzen in `TH7` sind nur im Demo geprüft.

## Pässe gegen die Wand (`passen/`)
- Aufbau: Ziel an der Wand, 4–6 m davor, Handy seitlich (Wand links oder rechts im Bild, `settings.wall`). Einrichtung: Wand-Seite, Wurfhand, Dauer 30/60 s, Zählen über Mikrofon (Standard) oder Kamera, Mikro-Test mit Pegel und Zähler, Empfindlichkeit.
- Ablauf: „30 Sekunden Pässe gegen die Wand. Auf den Piep.“ → 3 s → Piep → Runde, großer Zähler und Restzeit, „Noch zehn Sekunden.“ → Schluss-Piep, Zusammenfassung gesprochen und als Karte, Bestwert (`settings.best`), Log.
- Zählen: Mikrofon mit `shared/js/bounceDetect.js` (Aufprall an der Wand). Ein Knall ohne Wurf davor, obwohl der Spieler im Bild war, zählt nicht (Fangen, Nachbarfeld; `app.ignored`). Kein Mikro → automatisch Kamera: Würfe = Spitzen der Handgelenk-Geschwindigkeit relativ zur Hüfte, ≥ 0,5 s auseinander. Im Demo meldet die Person den Aufprall direkt.
- Technik je Pass (`judgePass`, DHB-Kriterien Schlagwurf): Abwurf = schnellstes Handgelenk (relativ zur Hüfte) 1,0–0,12 s vor dem Aufprall. Arm oben = Handgelenk über der Wurfschulter und Ellbogen höchstens 0,1 KL unter der Schulter („Ellbogen auf Schulterhöhe“). Gegenbein vorn = der Knöchel näher an der Wand gehört zum Bein gegenüber der Wurfhand. Kein Abwurf gefunden → Pass zählt, Technik „nicht gesehen“.
- Log je Runde: `{nr, sid, dur, n, seen, arm, foot, count, best}`. Bericht als Text.

## Sprungkraft (`sprung/`)
- Aufbau: Handy frontal, 3–4 m, Hüfthöhe, ganzer Körper auch im Sprung. Übungen: 10 Strecksprünge (`ex:'both'`) oder Einbein 5 links + 5 rechts (`ex:'single'`).
- Ablauf: ruhig stehen (Stand-Höhe der Hüfte, Boden = tiefster Fußpunkt, Körperlänge) → „Los“ + Piep → Sprünge zählen, Höhe groß im Bild → bei Einbein nach 5 „Wechsel. Fünf auf dem rechten Bein.“ → Zusammenfassung gesprochen und als Karte, Log.
- Erkennung (`jumpTracker`): in der Luft, wenn beide Füße > 0,05 KL über dem Boden; Landung, wenn ein Fuß < 0,03 KL (frühestens 0,12 s nach dem Absprung). Höhe = höchster Punkt der Hüfte über der Stand-Höhe (KL, cm über `KL_CM` 140). Bodenkontakt = Landung bis nächster Absprung. Bein = Füße am Boden in den letzten 0,15 s vor dem Absprung (`l`, `r`, `both`); bei Einbein zählen falsches Bein und beidbeinig nicht („Falsches Bein.“ / „Nur ein Bein.“).
- Auswertung (`summary`): Schnitt, bester, Bodenkontakt; Einbein: links/rechts und Unterschied in Prozent (ab 10 % Tipp fürs schwächere Bein); Vergleich mit der letzten Übung derselben Art („3 Zentimeter mehr als letztes Mal“). Die Höhen sind Schätzungen aus einer Kamera; als Verlauf aussagekräftig.
- Log-Eintrag: `{nr, sid, ex, n, avg, best, contact, left, right, heights[]}` (KL).

## Abwehr-Beinarbeit (`abwehr/`)
- Aufbau: Handy frontal vor dem Spieler, 4–5 m, etwa Hüfthöhe, Platz für einen großen Schritt in jede Richtung. Einrichtung: Dauer (30/40/60 s, `settings.dur`), Rück-/Frontkamera.
- Ablauf: `calib` – „Stell dich aufrecht hin“, steht er still, werden Stand-Höhe der Hüfte, Mitte und Körperlänge gemerkt → `stance` „Grundstellung.“ → Runde: `gap` (0,5–1,5 s Pause) / `cmd` (Ruf „links“, „rechts“, „raus“, „zurück“ groß im Bild, nach 1,6 s ausgewertet, falsch = tiefer Piep) bis die Dauer um ist → Zusammenfassung gesprochen und als Karte, Eintrag im Log.
- Richtungen aus Sicht des Spielers: Kamera blickt ihn an, seine linke Seite ist im Bild rechts; „raus“ (zum Handy) macht ihn im Bild größer. `nextCmd` holt ihn zur Mitte zurück, wenn er > 0,45 KL seitlich oder > 10 % vor/zurück steht.
- Stellung nach den DHB-Technikkriterien 1-gegen-1 (Quellen: `QUELLEN.md`), mit Gordons Vorgabe „immer seitlich zur Wurfhand, kein Parallelstand“: **Grundposition** = seitlich zur Wurfhand des aktuellen Gegners (`app.curOpp`; Fuß auf seiner Wurfarmseite vorn ≥ `stagger`, Hand auf dieser Seite höher, `side`), Beine mindestens schulterbreit (Fußabstand auch schräg / Schulterbreite ≥ `wide` 1,0), Körperschwerpunkt abgesenkt (`lowDrop`), Oberkörper fast aufrecht (Schulter–Hüfte im Bild ≥ 85 % vom Stand), Arme in Vorhalte (Hände zwischen Schulter- und Hüfthöhe). Gemessen als Anteil der Zeit außerhalb der Rufe (`baseFrame`), nicht während herausgetreten. **Heraustreten („raus“)** = versetzte Fußstellung mit dem Fuß auf der Wurfarmseite des Gegners vorn (vorderer Fuß steht im Bild tiefer, ≥ `stagger` 0,03 KL) und Führarm auf dieser Seite etwa auf Schulterhöhe und höher als der Sicherungsarm (`judgeOut`). Gegner (`settings.opp`): Rechtshänder → linker Fuß und linke Hand, Linkshänder → rechts; „Wechselnd“ sagt beim Raus „Raus, Linkshänder“. Falsch → kurze Korrektur („Linker Fuß vor.“ / „Linke Hand hoch zum Wurfarm.“), nächster Ruf 1,2 s später.
- Bewertung (`judgeMove`, C5 Reaktionszeit): Bewegung erkannt, wenn die Hüfte > 0,08 KL seitlich oder die Körpergröße > 5 % geändert ist; Reaktion = Beginn dieser Bewegung (halbe Schwelle, weil vor/zurück sich die Größe langsamer ändert als seitlich die Lage), minus Verzögerung der Sprachausgabe (`onstart` der Äußerung, falls gemeldet). Richtung = was zuerst deutlich wird (doppelte Schwelle). Richtig: Richtung stimmt und Reaktion ≤ 1,0 s. Gekreuzt: Knöchel tauschen um > 0,02 KL die Seite. Grundstellung: Anteil der Zeit mit Hüfte ≥ 0,06 KL unter der Stand-Höhe; < 70 % → Tipp „tiefer“.
- Log-Eintrag je Runde: `{nr, sid, dur, n, ok, avg, crossed, low, opp, base{wide, arms, upright}, out{n, ok}, moves[{cmd, dir, react, ok, crossed, opp?, foot?, arm?}]}`. Bericht als Text.
- Demo: Person in Grundposition (breit, tief, aufrecht, Arme vorn, `P.guard` in `scene.js`), beim gerufenen Heraustreten im Wechsel richtig / falscher Fuß / richtig / Führarm unten (`OUTS`).

## Treffererkennung und Wurftempo (C1, B7; `rings.js`, `shared/js/hitDetect.js`)
- Nur Kameraposition 2 (Tor im Bild). Einrichtung: „Ringe antippen“ = für jedes aktive Ziel die Mitte des Rings antippen („Nicht im Bild“ überspringt), gespeichert in `settings.rings.court` [{name, x, y}] (normiert). Ring-Größe im Bild (`settings.ringSize`, Anteil der Bildhöhe: klein 0,012 / mittel 0,02 / groß 0,03) und Wurfentfernung (`settings.throwDist`, Standard 7 m) in den Einstellungen.
- Pro Videobild (`ringFrame`): Bild auf 640 px Breite, je Ring ein quadratischer Graubild-Ausschnitt (Durchmesser 2 × Ring-Radius), die letzten 2,5 s.
- Nach jedem Wurf (`autoHit` in `tracking.js`), sobald 1 s nach dem Abwurf (Wurf-Frame) vorbei ist: `detectHit` vergleicht je Ring jeden Ausschnitt 0,05–1,0 s nach dem Abwurf mit dem Median der Ausschnitte 0,6–0,05 s davor (mittlere Grauwert-Änderung im Kreis). Getroffen = stärkster Ring mit ≥ `TH_HIT.diff` (22) und ≥ 1,6 × zweitbester; sonst „kein Ring“. Ergebnis `entry.hitAuto`; war Treffer/Daneben noch nicht getippt, wird `entry.hit` gesetzt und „Treffer.“/„Daneben.“ angehängt gesprochen. Antippen auf der Karte überschreibt es weiterhin.
- Tempo: `m.flight` = s vom Abwurf bis zur stärksten Änderung im getroffenen Ring, `m.speed` = Wurfentfernung / Flugzeit (km/h). Bei 30 fps ±1 Bild ≈ ±10 %; nur als grober Vergleich.
- Alle Grenzen nur im Demo eingestellt (unkalibriert). Demo: Ringe im Tor gezeichnet (`RINGS` in `demo/sim.js`), der Ball fliegt in 0,45 s zum angesagten Ring oder 0,6 m daneben (`HITS`), `ringTruth()` für Tests.

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
6. **lean – Oberkörper** in der Wurfauslage = im höchsten Punkt des Sprungs (`e.peakF`; nach dem Abwurf klappt er bei gutem Sprungwurf nach vorn, das ist kein Fehler, siehe `QUELLEN.md`). Der Wurf-Frame (max. Geschwindigkeit des Handgelenks relativ zur Hüfte) bleibt für Drehung, Wurfhöhe und Tempo: < 15° aufrecht; > 25° Richtung Torraum = kippt nach vorn; weg vom Torraum = Rücklage (ok).

Alle Grenzwerte stehen in `TH` (`aussenspieler/js/config.js`), Abweichungen je Kameraposition in `TH_POS`; der Code holt sie über `th()` (`store.js`).

Feedback: Sprachansage = „Gut: <zufälliges Lob aus den guten Punkten>. Tipp: <Kurz-Tipp des wichtigsten Fehlers>“. Texte in `tips()` (`aussenspieler/js/feedback.js`) (short / tip / drill), Labels in `LABEL_GOOD` / `LABEL_BAD`, Reihenfolge in `PRIO`.

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
- Treffererkennung (Position 2): Ringe antippen, je 10 Würfe in jeden Ring und bewusst daneben; erkannt? Fehlalarme durch Netzbewegung, Schatten, Torwart-Wand? `TH_HIT` in `shared/js/hitDetect.js`, Ring-Größe in den Einstellungen. Tempo mit einem bekannten Wert vergleichen (z. B. Radar-App), Wurfentfernung einstellen.
- Aufgabe „Kreisläufer“: je 5 Mal bewusst links und rechts herum drehen; stimmt die erkannte Richtung? Wenn alles vertauscht ist: `TURN_SIGN` auf −1. Reaktionszeit plausibel?
- Aufgabe „Gegenstoß auf Zeit“: wird der Ruf von der Mittellinie gehört (Mikro-Test vorher, Empfindlichkeit)? Ist 4,0 s als Grenze passend (persönlich, `TH.taskBreakMax`)?
- Aufgabe „Winkel vergrößern“ (Position 2): je 5 Würfe bewusst gerade und bewusst Richtung Tormitte; `m.flyAng` im Log vergleichen, `TH.taskFlyAng` dazwischenlegen.
- Aufgabe „Wurfhöhe auf Ansage“: je 5 Würfe bewusst hoch und aus der Hüfte; im Log `armT`/`shT`/`hipT` ansehen (stehen in `m`), `TH.taskHighArm`, `taskHipShoulder`, `taskHipLow` dazwischenlegen.
- Aufgabe „Serie unter Ermüdung“: prüfen, ob 2 s Pause reichen, um zurück zum Anlauf zu kommen (sonst `pause` in `TASKS.tired` erhöhen), und ob die Sprunghöhe von Wurf zu Wurf genug streut, dass 90 % sinnvoll sind.
- Aufgabe „Entscheidung in der Luft“: 10 Würfe, Spalte „Ansage“ im Bericht ansehen (zweiter Wert = Sprachausgabe am Handy). Kommt das Ziel erst nach ~400 ms, hört der Spieler es zu spät (Flugzeit ~0,6 s). Dann: kürzere Ziel-Namen, kurze Töne statt Wörter oder die leichtere Variante (Ansage beim letzten Schritt) bauen.
- Aufgabe „Absprung an der Linie“: 10 Würfe bewusst in verschiedenen Abständen (Maßband/Klebeband 10, 20, 30, 40 cm vor der Linie), angesagte cm mit den echten vergleichen. Fenster `TH.taskLineFar` (heute −0,2 KL ≈ 30 cm) so legen, dass 30 cm gerade noch zählt.
- Rückraum: Handy schräg vorn aufstellen, je 5 Würfe mit 3 Schritten, mit 2 und 4 Schritten, bewusst früh/spät abwerfen, knapp innerhalb der 9 m. Schritte und Abwurf-Zeit im Bericht prüfen, `TH.steps`-Erkennung (Schwellen in `steps.js`), `TH.peakDt` und `TH_RR` einstellen. Die gestrichelte 9-m-Linie: rastet sie ein, sonst Striche antippen.
- Pässe gegen die Wand: Mikro-Test vor der Wand: zählt jeder Aufprall genau einmal (auch das Fangen nicht)? Mit Nachbarfeld laut: zählt Ballprellen von dort mit? Dann Empfindlichkeit oder Kamera-Zählung. Seitenansicht: verwechselt die KI linkes und rechtes Bein (dann ist „Gegenbein“ unzuverlässig)?
- Sprungkraft: eine Übung mit bekanntem Sprung (z. B. gegen eine Markierung an der Wand) vergleichen; prüfen, ob beim Einbein das richtige Bein erkannt wird und ob kleine Wipper nicht zählen.
- Abwehr-Beinarbeit, Stellung: je 5× bewusst richtig und falsch heraustreten (falscher Fuß, Arm unten), gegen Rechts- und Linkshänder; stimmt die Ansage? Grenzen `wide`, `upright`, `stagger`, `leadArm` in `abwehr/js/rules.js`. Erkennt die KI frontal, welcher Fuß vorn steht?
- Abwehr-Beinarbeit: eine Runde ansehen, ob Richtungen stimmen (Spiegelung bei Frontkamera?), ob die Reaktionszeiten plausibel sind (Sprachverzögerung wird nur abgezogen, wenn das Handy den Sprechbeginn meldet) und ob „gekreuzt“ nur bei echtem Kreuzen kommt. `TH_D` in `abwehr/js/rules.js`.
- 7-m-Trainer: je 5 Würfe sauber, bewusst langsam (> 3 s), Fuß auf die Linie, mit beiden Füßen kurz hochspringen, Standfuß nur rutschen lassen (darf kein Fehler sein). Im Log stehen Zeit, Linie und Fuß (KL). `TH7` in `siebenmeter/js/rules.js` anpassen; besonders `footLift`, weil echte Körperpunkte stärker zittern als im Demo. Prüfen, ob man den Pfiff in der Halle hört (sonst lauter/länger, `beep` in `main.js`).
- Beide Kamerapositionen getrennt kalibrieren (Spalte „Kamera“ im Bericht). Auch Oberkörper und Drehung können sich je Position unterscheiden; dann weitere Werte in `TH_POS` eintragen.
- cm-Angaben in Log und Bericht sind Schätzungen (`KL_CM` = 140 cm Schulter–Knöchel). Für die Grenzen zählen die Verhältnisse, nicht die genauen cm.

## Bekannte Grenzen
- Eine Kamera: Drehung, Sprunghöhe und Oberkörper sind Schätzungen. Übertritt hängt von Kamerawinkel und Linienmarkierung ab.
- Treffer werden nur mit Kameraposition 2 und angetippten Ringen automatisch erkannt (unkalibriert), sonst per Tippen.
- Schwellenwerte noch nicht in der Halle kalibriert.
- Kamera am besten erhöht (1,5–2 m), schräg von vorn auf die Absprungzone, gutes Licht, möglichst 60 fps.

## Ideen / offene Punkte
- Weitere Übungen und Trainingsarten mit Prioritäten: [`PLAYBOOK.md`](PLAYBOOK.md).
- Hallentest nach der Checkliste oben, danach `TH` anpassen.
- PDF-Bericht direkt erzeugen.

## Historie
- 2026-10-04: Offline-Unterstützung (PWA): Service Worker (`sw.js`) mit Cache für alle Trainings in netzlosen Sporthallen, Web App Manifest (`manifest.webmanifest`), Vektor-App-Icon (`shared/icon.svg`). Stabilisierung der Test-Suite: `bounceDetect.js` gegen Pfiff-Fehlalarme gehärtet (`isHigh`, `CREST = 10.5`), Demo-Reset (`resetDemo()`), Filterung von Offline-Font-Netzwerkfehlern in Playwright.
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
- 2026-10-04: Anleitungsvideo „Korrekte Ausführung“ im Außenwurf-Coach (`guideView.js`, `#guideSheet`): interaktiver 3D-Player für alle Übungen basierend auf dem Skill `demo-figuren`. Zeigt die simulierte Person in Lehrbild-Technik (DHB / KNSU nach `QUELLEN.md`), mit synchronisierter Phasen-Anzeige, Zeitlupe (0,5× / 0,25×), Kamera-Perspektiven-Wechsel, Checkliste und Video-Download (`.webm`).
- 2026-10-04: PWA & Offline-Fähigkeit für Sporthallen (`manifest.webmanifest`, `sw.js` mit Stale-While-Revalidate, `shared/icon.svg` App-Icon). Zero-Build Vanilla JS beibehalten. Test-Suite gegen Flakiness stabilisiert (`bounceDetect.js`, headless Google Fonts Filterung, Test-Timings).
- 2026-10-04: Baustein „Aufgabe“ (Serie mit Ziel, Zähler, Ansage pro Wurf, Ende-Karte mit „Nochmal“, Verlauf/Bestwert, Abschnitt in Log und Bericht) und erste Aufgabe A1 „Absprung an der Linie“. `TESTSTRATEGIE.md`.
- 2026-10-04: Sprachausgabe weicher und verständlicher (beste deutsche Stimme, ruhigeres Tempo, Einheiten ausgeschrieben, weicher Piep), Ansagen sprachlich geglättet („Gut: … Tipp: …“, ganze Sätze).
- 2026-10-04: Außenwurf/Rückraum: Oberkörper wird in der Wurfauslage (höchster Punkt) bewertet statt im Abwurf; Pässe: Ellbogen auf Schulterhöhe geprüft (DHB-/KNSU-Kriterien).
- 2026-10-04: Abwehr: Grundposition immer seitlich zur Wurfhand (Gordons Vorgabe statt DHB-Parallelstellung); bei „Wechselnd“ gilt die zuletzt angesagte Wurfhand.
- 2026-10-04: 7-m-Trainer nach den Regeln korrigiert: Standfuß darf rutschen, Fehler nur, wenn kein Fuß am Boden bleibt (IHF 15:1); angehobener Fuß zählt nicht als Linienberührung.
- 2026-10-04: Abwehr-Beinarbeit nach den DHB-Technikkriterien korrigiert (Grundposition parallel/breit/aufrecht/Arme vorn, Heraustreten mit Fuß und Führarm auf der Wurfarmseite, Gegner Rechts-/Linkshänder), `QUELLEN.md`.
- 2026-10-04: Treffererkennung (C1) und Wurftempo (B7) mit Kameraposition 2: Ringe antippen, Ball im Ring per Bildvergleich, Tempo aus Flugzeit; Grenzen unkalibriert.
- 2026-10-04: Kreisläufer (B3) als Aufgabe im Außenwurf-Coach: Drehen auf Ansage links/rechts, Richtung aus der Hüftdrehung, Reaktionszeit.
- 2026-10-04: Sprungkraft als Training (`sprung/`): Strecksprünge, Einbein links/rechts, Höhe, Bodenkontakt, Vergleich mit dem letzten Mal.
- 2026-10-04: Aufgabe A6 „Gegenstoß auf Zeit“ (Ruf beim Loslaufen, Zeit bis zum Absprung).
- 2026-10-04: Aufgabe A4 „Winkel vergrößern“ (Kameraposition 2, Flug gegen den Anlauf nach innen).
- 2026-10-04: Pässe gegen die Wand als Training (`passen/`): Aufprall zählen (Mikro, sonst Kamera), Arm und Gegenbein je Pass, Bestwert.
- 2026-10-04: Ballaufprall per Mikro (C2, `shared/js/bounceDetect.js`), Mikrofon-Pegel gemeinsam in `shared/js/mic.js` (Zuruf nutzt ihn).
- 2026-10-04: Rückraum-Modus (`aussenspieler/?rr=1`, Karte „Rückraum: Sprungwurf“): 9-m-Linie, Dreischritt, Abwurf im höchsten Punkt, eigener Speicher. Dabei für alle: Wurf-Frame relativ zur Hüfte, Sprung-Erkennung mit Hüft-Gerade über die Zeit, „steht“ berücksichtigt die Größe im Bild.
- 2026-10-04: Abwehr-Beinarbeit als drittes Training (`abwehr/`): Rufe links/rechts/raus/zurück, Reaktionszeit und Richtung, gekreuzte Füße, Grundstellung; gemeinsame Bühne `shared/js/stage.js` und `shared/css/trainer.css` (auch für den 7-m-Trainer).
- 2026-10-04: Aufgaben A3 „Wurfhöhe auf Ansage“ und A5 „Serie unter Ermüdung“; Serien-Ende allgemein über `result()`; Training stoppt vor der Ende-Karte.
- 2026-10-04: UX: Tipp-Flächen im Außenwurf-Coach auf mindestens 44–48 px (Treffer/Daneben, Schließen, Einstellungen, Ziel-Liste, Log), Zustand oben etwas größer; Browser-Test prüft die Größen.
- 2026-10-04: 7-m-Trainer als zweites Training (`siebenmeter/`, Karte im Startmenü): Linie antippen, Ziel + Pfiff, 3-s-Regel, Linie, Standbein, Serie 10/8, Log, Bericht, Demo und Tests.
- 2026-10-04: Gemeinsamer Code nach `shared/` (Grundstil, Helfer, Sprache, Bildschirm wach, KI laden, Demo-Halle und -Person), Vorbereitung für den 7-m-Trainer.
- 2026-10-04: Aufgabe A2 „Entscheidung in der Luft“ (Ziel erst beim Absprung, Verzögerung von Erkennung und Sprachausgabe als Messwert).
- 2026-10-03: Außenwurf-Coach in den Ordner `aussenspieler/` verschoben, im Wurzelverzeichnis ein Startmenü für mehrere Trainingsarten. Neue Adresse: https://gordon81.github.io/handballcoach/aussenspieler/ (Daten bleiben erhalten).
