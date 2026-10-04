# PLAYBOOK – Was der Einzeltrainer noch trainieren könnte

Vorschläge für weitere Übungen, die ein Spieler **allein** mit Handy auf dem Stativ machen kann: die App stellt die Aufgabe, prüft sie per Kamera (MediaPipe Pose) und Mikrofon und sagt, ob sie geschafft ist.
Das ist ein Planungsdokument. Was gebaut ist, ist in der TODO-Liste (Abschnitt 5) abgehakt und mit ✅ markiert. Was heute schon geht, steht in [`DOKUMENTATION.md`](DOKUMENTATION.md), die Technik in [`brain.md`](brain.md).

**Legende**
- **Prüfbar**: wie verlässlich Handy-Kamera und Mikro das Erfolgskriterium prüfen können. ●●● sicher, ●●○ brauchbare Schätzung, ●○○ nur grob oder mit Hilfe (Antippen).
- **Aufwand**: **S** klein (Tage, fast nur neue Ansagen/Auswertung), **M** mittel (neue Erkennung auf vorhandener Basis), **L** groß (neue Erkennungstechnik, viel Hallentest).
- **Baut auf**: welche vorhandenen Teile wiederverwendet werden.

---

## 0. Voraussetzung: Hallentest

Alle Übungen unten stehen auf denselben Messungen wie der Außenwurf-Coach (Absprung, Linie, Sprunghöhe, Arm). Die Grenzen in `TH` sind bisher nur im Demo geprüft. **Erst der Hallentest** nach der Checkliste in `brain.md` („Hallentest und Kalibrieren“), dann neue Übungen. Sonst baut man Aufgaben auf Werte, die in der Halle nicht stimmen.

---

## 1. Gemeinsamer Baustein: „Aufgabe“ ✅ gebaut (2026-10-04, `tasks.js` / `taskRun.js`)

Heute bewertet die App jeden Wurf, stellt aber keine **Aufgabe** mit Ziel. Für „Spieler Aufgaben stellen und prüfen“ fehlt ein Rahmen, den alle Übungen nutzen:

| Teil | Inhalt |
|---|---|
| Aufgabenkarte | Name, kurze Anleitung (wird vorgelesen), Kameraposition, Anzahl Wiederholungen (z. B. 10), Erfolgskriterium pro Wiederholung, Ziel für die Serie (z. B. „8 von 10“) |
| Während der Serie | Ansage „Wurf 3 von 10“, nach jeder Wiederholung „geschafft“ / „nicht geschafft“ + Grund, Zähler im Bild |
| Ende | „Aufgabe geschafft: 8 von 10“ oder „7 von 10, Ziel 8, nochmal?“, Eintrag im Log mit Aufgaben-Name, im Bericht eigener Abschnitt |
| Verlauf | Bestwert und letzte Ergebnisse je Aufgabe (zeigt Fortschritt über Wochen) |

- Umsetzung: Aufgaben als Daten (Liste in `config.js` oder eigene `tasks.js`), Kriterium als kleine Funktion auf dem fertigen Wurf (`m`, `res`). Im Außenwurf-Coach eine Auswahl „Freies Training / Aufgabe …“ in der Einrichtung.
- Neue Trainingsarten (eigener Ordner, Karte im Startmenü) nutzen denselben Rahmen und bekommen eigene Speicher-Präfixe (z. B. `7m-*`, `rr-*`).
- Gemeinsamen Code (Pose laden, Kamera, Sprache, Zuruf, Clips, Demo) dafür in einen Ordner `shared/` ziehen, sobald das zweite Training entsteht, nicht vorher.
- **Aufwand M**, aber Voraussetzung für fast alles unten.

---

## 2. Weitere Übungen für Außenspieler

### A1 · Absprung an der Linie ✅ gebaut
- **Ziel:** so nah wie möglich an der 6-m-Linie abspringen, ohne zu übertreten (größerer Wurfwinkel, weniger Übertritte im Spiel).
- **Aufbau:** Kameraposition 1, Linie wie gewohnt eingerichtet.
- **Ablauf:** 10 Würfe mit normaler Zielansage. Nach jedem Wurf sagt die App den Abstand an („20 Zentimeter vor der Linie“).
- **Erfolg:** Absprung zwischen 0 und ~30 cm vor der Linie (`m.line` zwischen −0,2 und 0 KL), kein Übertritt. Serie geschafft bei 7 von 10.
- **Prüfbar:** ●●○ – der Abstand wird schon gemessen; cm sind Schätzungen, das Fenster muss nach dem Hallentest eingestellt werden.
- **Baut auf:** Übertritt-Prüfung, `m.line`. **Aufwand S.**

### A2 · Entscheidung in der Luft ✅ gebaut (Ansage beim Absprung; die leichtere Variante „beim letzten Schritt“ erst, wenn der Hallentest zeigt, dass es zu spät kommt)
- **Ziel:** Torwart lesen lernen: das Ziel steht erst fest, wenn der Spieler schon springt.
- **Ablauf:** Spieler läuft ohne Ziel an. Die App sagt das Ziel **beim Absprung** an (Zustand `air`), kurz und laut („Blau!“, „Lang!“). Variante leichter: Ansage beim letzten Schritt (Fuß nähert sich der Linie).
- **Erfolg:** Treffer im angesagten Ziel (heute per Antippen), Technik trotzdem sauber.
- **Prüfbar:** ●○○ für den Treffer (Antippen oder später Treffererkennung C1), ●●● für die Technik.
- **Hinweis:** Sprachausgabe hat Verzögerung (100–300 ms je nach Handy). Kurze, vorab geladene Töne oder Wörter nehmen; im Hallentest messen, ob die Ansage noch rechtzeitig kommt.
- **Baut auf:** Zustandsautomat, Zielansage. **Aufwand S.**

### A3 · Wurfhöhe auf Ansage (hoch / Hüfte) ✅ gebaut
- **Ziel:** Abwurf aus verschiedenen Armpositionen, damit der Torwart die Ecke nicht ablesen kann.
- **Ablauf:** Zur Zielansage kommt die Armhöhe: „Hoch – Orange kurz“, „Hüfte – Blau lang“.
- **Erfolg:** Handgelenk im Wurf-Frame über der Nase („hoch“) bzw. zwischen Hüfte und Schulter („Hüfte“).
- **Prüfbar:** ●●○ – Handgelenk und Wurf-Frame (max. Handgelenk-Geschwindigkeit) gibt es schon; die Abgrenzung muss im Hallentest kalibriert werden.
- **Baut auf:** Arm-Prüfung, Oberkörper-Frame. **Aufwand S.**

### A4 · Winkel vergrößern (Flug Richtung Tormitte) ✅ gebaut (Aufgabe, nur Kameraposition 2)
- **Ziel:** im Sprung Richtung Tormitte fliegen statt geradeaus, damit der Wurfwinkel größer wird.
- **Aufbau:** Kameraposition 2 (Sprung von der Seite, Tor im Bild).
- **Erfolg:** Landepunkt deutlich weiter innen als der Absprungpunkt (Weg entlang der Linie Richtung Tor, gemessen in Körperlängen).
- **Prüfbar:** ●●○ – Fußpunkte bei Absprung und Landung sind da; die Richtung im Bild muss aus der eingerichteten Linie abgeleitet werden.
- **Baut auf:** Absprung-/Landungserkennung, Linie. **Aufwand M.**

### A5 · Serie unter Ermüdung ✅ gebaut
- **Ziel:** Technik halten, wenn die Beine müde werden (Spielende).
- **Ablauf:** 20 Würfe mit kurzer Pause (z. B. 2 s), zwischendurch Ansage „Zurück zur Mittellinie und wieder an“ möglich.
- **Erfolg:** Sprunghöhe der letzten 5 Würfe höchstens ~10 % unter den ersten 5, keine Übertritte.
- **Prüfbar:** ●●● (Verlauf der vorhandenen Messwerte).
- **Baut auf:** Log, Messwerte, Bericht (Verlaufslinie dazu). **Aufwand S.**

### A6 · Gegenstoß-Abschluss auf Zeit ✅ gebaut (Aufgabe)
- **Ziel:** schnell laufen und trotzdem sauber abschließen.
- **Ablauf:** Spieler startet weit weg (außerhalb des Bildes, z. B. Mittellinie), ruft beim Loslaufen. Die App misst die Zeit vom Ruf bis zum Absprung.
- **Erfolg:** Zeit unter einer persönlichen Grenze (z. B. 4,0 s) **und** sauberer Wurf.
- **Prüfbar:** ●●○ – Ruf und Absprung haben Zeitstempel; der Ruf muss ohne „Spieler im Bild“ gelten (Ausnahme nur in dieser Übung).
- **Baut auf:** Zuruf, Absprungerkennung. **Aufwand S–M.**

---

## 3. Andere Positionen und Fähigkeiten

### B1 · 7-m-Wurf ✅ gebaut (`siebenmeter/`; noch ohne Videos)
- **Ziel:** Strafwurf unter Regel-Bedingungen: Standbein bleibt am Boden, Linie nicht berühren, Wurf innerhalb von 3 s nach dem Pfiff.
- **Aufbau:** Handy seitlich hinter der 7-m-Linie, Linie (gerade, 1 m) antippen.
- **Ablauf:** App pfeift (Ton), Ziel wird angesagt oder nach Zufall erst kurz vor dem Pfiff. Spieler wirft.
- **Erfolg:** Wurf (max. Handgelenk-Geschwindigkeit) innerhalb 3 s nach Pfiff; kein Fuß über der Linie; vorderer Fuß hebt nicht ab bzw. rutscht nicht (Fußpunkt bewegt sich < ~5 cm bis zum Abwurf); Treffer im Ziel per Antippen.
- **Prüfbar:** ●●● für Zeit und Linie, ●●○ für „Fuß bewegt“ (kleine Bewegungen gegen Rauschen der Erkennung abgrenzen).
- **Baut auf:** Linie (gerade statt Bogen), `lineSide()`, Ansage, Clips. Neu: Wurf **ohne** Sprung erkennen (Handgelenk-Geschwindigkeit statt Absprung). **Aufwand M.** Eigene Karte im Startmenü.

### B2 · Rückraum-Sprungwurf (9 m) ✅ gebaut (`aussenspieler/?rr=1`)
- **Ziel:** Sprungwurf aus dem Rückraum mit Stemmschritt-Rhythmus und hohem Abwurf über den Block.
- **Aufbau:** Kameraposition schräg von vorn auf den 9-m-Bereich, 9-m-Linie (gestrichelt) ablaufen.
- **Erfolg:** Absprung vor der 9-m-Linie (Aufgabe: Wurf aus 9–10 m), Sprungbein richtig, Arm über Kopf, Sprunghöhe, Abwurf im oberen Punkt (Wurf-Frame nahe Hüft-Höchstpunkt). Dazu Drei-Schritt-Rhythmus: Bodenkontakte vor dem Absprung zählen.
- **Prüfbar:** ●●○ – fast alles wie beim Außenwurf; die gestrichelte Linie ist für die Strich-Erkennung schwerer, notfalls antippen. Schrittzählung aus Fußpunkten ist neu.
- **Baut auf:** fast der ganze Außenwurf-Coach (Prüfungen 1–3, 5, 6 ohne Drehungs-Sonderfall). **Aufwand M.**

### B3 · Kreisläufer: Drehung und Abschluss
- **Ziel:** mit dem Rücken zum Tor starten, auf Ansage drehen („links“ / „rechts“) und abschließen, Absprung außerhalb des Torraums.
- **Ablauf:** Spieler steht mit Ball rückwärts an der 6-m-Linie, App sagt Drehrichtung an.
- **Erfolg:** Drehung in die angesagte Richtung (Hüft-Yaw aus `worldLandmarks`), Absprung vor der Linie, Reaktionszeit Ansage → erste Bewegung.
- **Prüfbar:** ●●○ – Drehrichtung aus 3D-Schätzung ist zuverlässig genug für links/rechts; Übertritt wie gehabt.
- **Baut auf:** Linie, Körperdrehung, Übertritt. **Aufwand M.**

### B4 · Passen gegen die Wand ✅ gebaut (`passen/`)
- **Ziel:** genaues, schnelles Passen und Fangen allein.
- **Aufbau:** Ziel an der Wand (Klebeband-Kreuz, Ring), Spieler 4–6 m davor, Handy seitlich.
- **Ablauf:** „30 Sekunden, so viele saubere Pässe wie möglich“, oder Wechsel Schlagwurf / Handgelenkpass auf Ansage.
- **Erfolg:** Anzahl Pässe (Wandaufprall per Mikro zählen), Wurfarm über Schulter, Schrittstellung (Gegenbein vorn).
- **Prüfbar:** ●●○ für das Zählen in ruhiger Halle (der Ballaufprall ist genau das, was der Zuruf heute **ausfiltert**: kurzer Knall mit Nachhall), ●○○ wenn nebenan gespielt wird. Ob das Wandziel getroffen wurde: ●○○.
- **Baut auf:** `shoutDetect.js` (Aufprall-Muster umgekehrt nutzen), Arm-Prüfung. **Aufwand M.**

### B5 · Abwehr-Beinarbeit auf Zuruf ✅ gebaut (`abwehr/`)
- **Ziel:** schnelle Abwehrbewegung: seitlich verschieben, heraustreten, zurück, ohne Ball.
- **Aufbau:** zwei Hütchen ~3 m auseinander, Handy frontal.
- **Ablauf:** App sagt zufällig „links“, „rechts“, „raus“, „zurück“, im Wechsel mit kurzen Pausen, 30–45 s.
- **Erfolg:** Bewegung in die richtige Richtung, Reaktionszeit (Ansage → Hüfte bewegt sich), Füße kreuzen nicht beim Seitschritt, tiefe Grundstellung (Hüfte unter Stand-Höhe).
- **Prüfbar:** ●●● für Richtung und Reaktionszeit, ●●○ für Füße kreuzen und Tiefe.
- **Baut auf:** Ansage, Pose, Stillstand-Erkennung aus dem Modus „Wenn Spieler im Bild steht“. Kein Ball, keine Linie nötig. **Aufwand M.**

### B6 · Sprungkraft und Koordination ✅ gebaut (`sprung/`; Hürdensprünge seitlich noch nicht)
- **Ziel:** Sprungkraft für den Wurf, Einbein-Absprung.
- **Übungen:** 10 Strecksprünge aus dem Stand, je 5 Einbein-Sprünge links/rechts, Hürdensprünge seitlich.
- **Erfolg:** Anzahl, Sprunghöhe pro Sprung (Hüfte über Stand-Höhe), Unterschied links/rechts, Bodenkontaktzeit.
- **Prüfbar:** ●●○ – Sprung- und Landungserkennung gibt es schon; Höhe ist eine Schätzung aus einer Kamera, als Verlauf (heute vs. letzte Woche) aber aussagekräftig.
- **Baut auf:** Sprungerkennung, Sprunghöhe. **Aufwand S–M.**

### B7 · Wurfgeschwindigkeit (Schätzung)
- **Ziel:** härter werfen, Fortschritt sehen.
- **Idee:** Abwurf-Zeitpunkt aus der Pose (max. Handgelenk-Geschwindigkeit), Aufprall an Wand oder Tor per Mikro. Bekannter Abstand (z. B. 7 m) / Flugzeit = Geschwindigkeit.
- **Prüfbar:** ●○○ bis ●●○ – bei 30 fps ist der Abwurf auf ~30 ms genau, bei ~300 ms Flugzeit sind das ±10 %. Für „schneller als letzte Woche“ reicht das, für km/h-Rekorde nicht. Bildrate und Mikro-Verzögerung im Hallentest prüfen.
- **Baut auf:** Wurf-Frame, Mikro-Auswertung. **Aufwand M.**

### Bewusst nicht vorgeschlagen
- **Torwart-Training:** braucht einen Werfer, ist also kein Einzeltraining.
- **Täuschungen, Kempa, Dreher:** mit einer Kamera und 30 fps kaum sicher zu unterscheiden; besser als Video (Clip) nachschauen.
- **Spracherkennung („Treffer“ sagen):** aus denselben Gründen wie in `brain.md` beschrieben (Netz, Lärm, Verzögerung) nicht.

---

## 4. Technische Bausteine, die mehrere Übungen brauchen

| Baustein | Für | Prüfbar | Aufwand |
|---|---|---|---|
| **C1 Treffererkennung** (Ball im Ring per Farbe oder Bildänderung im Zielbereich, Kameraposition 2 hat das Tor im Bild) | A2, A3, B1, B4, alle Trefferquoten | ●○○ heute, Ziel ●●○ | **L** |
| **C2 Ballaufprall per Mikro** ✅ (`shared/js/bounceDetect.js`) (Muster aus `shoutDetect.js` umgekehrt: kurzer Knall + Nachhall zählt) | B4, B7, Prellen | ●●○ in ruhiger Halle | **M** |
| **C3 Wurf ohne Sprung** ✅ (`findThrow` im 7-m-Trainer) (Abwurf an Handgelenk-Geschwindigkeit erkennen) | B1, B4, B7 | ●●○ | **M** |
| **C4 Gerade Linien** (7 m, 9 m gestrichelt) für Einrichtung und Übertritt ✅ (7 m: antippen; 9 m: ablaufen/einrasten wie 6 m) | B1, B2 | ●●● | **S** |
| **C5 Reaktionszeit** ✅ (`judgeMove` in `abwehr/`) (Ansage-Zeitpunkt → erste deutliche Hüftbewegung, Sprachausgabe-Verzögerung abziehen) | A2, B3, B5 | ●●○ | **S** |

---

## 5. TODO-Liste (Vorschlag, nach Priorität)

1. [ ] Hallentest Außenwurf-Coach, Grenzen in `TH` / `TH_POS` einstellen (Voraussetzung).
2. [x] Baustein „Aufgabe“ (Abschnitt 1) im Außenwurf-Coach: Aufgabenkarte, Zähler, „geschafft / nicht geschafft“, Ergebnis im Log und Bericht. **M**
3. [x] Erste Aufgaben ohne neue Erkennung: **A1 Absprung an der Linie** ✅, **A5 Serie unter Ermüdung** ✅, **A3 Wurfhöhe auf Ansage** ✅. **S** je Aufgabe
4. [x] **A2 Entscheidung in der Luft** (Ansage beim Absprung) ✅; Verzögerung wird gemessen (`callDet`/`callLag`), **in der Halle ansehen** (offen). **S**
5. [x] Gemeinsamen Code nach `shared/` ziehen (Kamera, Pose, Sprache, Zuruf, Clips, Demo), zweite Karte im Startmenü vorbereiten. **M**
6. [x] **B1 7-m-Trainer** ✅ als zweites Training (mit C3 Wurf ohne Sprung, C4 gerade Linie). **M**
7. [x] **B5 Abwehr-Beinarbeit** ✅ (ohne Ball, mit C5 Reaktionszeit). **M**
8. [x] **B2 Rückraum-Sprungwurf** ✅ (großteils Außenwurf-Coach mit 9-m-Linie und Schrittzählung). **M**
9. [x] **C2 Ballaufprall per Mikro** ✅, dann **B4 Pässe gegen die Wand** ✅. **M**
10. [ ] **A4 Winkel vergrößern** ✅, **A6 Gegenstoß auf Zeit** ✅, **B3 Kreisläufer**, **B6 Sprungkraft** ✅. **S–M**
11. [ ] **C1 Treffererkennung** und **B7 Wurfgeschwindigkeit**. **L / M**, erst wenn der Rest in der Halle läuft.

Jede neue Übung bekommt einen Demo-Ablauf in `demo/sim.js` und einen Test in `tests/browser.mjs`, wie der Außenwurf-Coach heute.

---

## 6. Empfehlung: die ersten drei

1. **Baustein „Aufgabe“ mit A1 „Absprung an der Linie“.** Macht aus dem freien Training ein „Aufgabe stellen und prüfen“, nutzt nur vorhandene Messwerte und ist die Grundlage für alles Weitere.
2. **A2 „Entscheidung in der Luft“.** Kleiner Umbau am Zustandsautomaten, großer Trainingseffekt für Außenspieler, und es klärt früh, wie schnell die Sprachausgabe in der Halle wirklich ist (wichtig auch für B3 und B5).
3. **B1 „7-m-Trainer“** als zweite Karte im Startmenü. Klar prüfbare Regeln (Zeit, Linie, Standbein), wenig Bewegung im Bild, daher verlässlich mit dem Handy, und es zwingt zum Aufteilen in gemeinsamen Code.
