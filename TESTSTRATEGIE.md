# Teststrategie – Handballcoach

Wie die App getestet wird und was welcher Test zeigen kann. Gilt für alle Trainings (Außenwurf-Coach, 7-m-Trainer, neue Aufgaben).
Befehle und Einzelheiten der vorhandenen Tests: [`brain.md`](brain.md), Abschnitt „Tests“.

## Grundsatz

Die App hat keinen Server und keinen Build. Was sich prüfen lässt, ohne in die Halle zu gehen, wird automatisch geprüft, und zwar auf drei Ebenen:

| Ebene | Werkzeug | Dauer | Was sie zeigt | Was sie **nicht** zeigt |
|---|---|---|---|---|
| **1. Unit-Tests** | Node (`node --test`), Datei `tests/unit.mjs` | Sekunden | reine Logik ohne Browser: Ruf-Erkennung, Aufgaben-Regeln (geschafft / nicht geschafft, Serie, Bestwert), Zeit- und Linienregeln des 7-m-Trainers, Texte der Ansagen | ob die Teile im Browser zusammenspielen |
| **2. Browser-Tests im Demo-Modus** | Playwright, headless Chromium, Datei `tests/browser.mjs` | ~10 min | die ganze App von „Start“ bis Bericht mit gezeichneter Halle und simulierter Person: Einrichtung, Zustandsautomat, Bewertung, Ansagen (Text), Log, Bericht, Videos, Bedienbarkeit (Größe der Tipp-Flächen, kein Querscrollen) | echte Kamera, echte KI-Erkennung, echte Halle, Verzögerung der Sprachausgabe am Handy |
| **3. Hallentest** | Gordon mit Handy, Checkliste in `brain.md` („Hallentest und Kalibrieren“) | ein Training | ob die Grenzen in `TH` / `TH_POS` stimmen, ob die Erkennung bei echtem Licht und echter Bewegung hält, ob Ansagen rechtzeitig kommen, ob man die App aus 3–5 m bedienen und verstehen kann | – |

Die simulierte Person (`demo/sim.js`) ist das Bindeglied: sie macht **absichtlich bekannte** Würfe (gut, Übertritt, flach, Arm unten, zu weit von der Linie, zu langsam, Standbein bewegt …), und der Browser-Test prüft, dass die App genau diese erkennt. Damit testen wir die ganze Kette, aber mit perfekten Körperpunkten. Ob die Grenzen für echte Menschen passen, kann nur Ebene 3 zeigen.

## Regeln

1. **Logik getrennt von Browser-Code schreiben.** Neue Regeln (Erfolgskriterium einer Aufgabe, Serien-Auswertung, 3-s-Regel, Standbein) kommen in Module ohne `document`, `window` oder `localStorage` (z. B. `tasks.js`, `sevenRules.js`). Grenzwerte werden als Parameter übergeben. Dann sind sie in Ebene 1 testbar.
2. **Jede Übung bekommt**
   - Unit-Tests für ihr Kriterium: Grenzfälle genau an der Grenze, knapp drüber, knapp drunter, fehlende Messwerte (z. B. keine Linie);
   - einen Demo-Ablauf in der Simulation mit festgelegter Wurf-Folge und einen Browser-Test, der die Bewertung jedes Wurfs, die Ansage-Texte, das Serien-Ergebnis und den Eintrag in Log und Bericht prüft;
   - einen Punkt in der Hallentest-Checkliste, wenn ihre Grenzen nur geschätzt sind.
3. **Ansagen prüfen wir als Text.** Die Tests zeichnen auf, was `say()` sprechen würde (`window.__said`), statt Ton abzuspielen. Ob es verständlich klingt und rechtzeitig kommt, prüft der Hallentest.
4. **Bedienbarkeit ist Teil der Browser-Tests:** in Handy-Größe (390 × 800) kein Querscrollen, Buttons der Haupt-Abläufe mindestens 44 px hoch, die wichtigste Zahl (Zähler einer Aufgabe, Zielname) groß im Bild. Was aus 4 m lesbar ist und ob man mit Ball in der Hand trifft, zeigt erst die Halle.
5. **Vor jedem Push läuft `npm test` komplett grün.** Ein einzelner Fehlschlag, der beim zweiten Lauf weg ist (z. B. weil eine andere Sitzung gleichzeitig Tests laufen lässt), wird einmal wiederholt; ein zweiter Fehlschlag ist ein echter Fehler.
6. **Keine Grenzen raten.** Wenn eine Übung Werte braucht, die nur die Halle liefern kann (cm-Fenster, Reaktionszeit, Sprachverzögerung), bekommt sie einen vorläufigen Wert in `TH`, die Messwerte landen im Log/Bericht, und der Punkt kommt in die Hallentest-Checkliste in `brain.md`.

## Was nur der Hallentest zeigen kann

- Lage der Grenzen (`TH`, `TH_POS`), auch das Fenster „0–30 cm vor der Linie“ (A1) und die Fußbewegung beim 7-m-Wurf.
- Bildrate am echten Handy, mit und ohne Wurf-Videos.
- Verzögerung der Sprachausgabe (wichtig für „Entscheidung in der Luft“: kommt das Ziel, solange der Spieler noch in der Luft ist?). Die App misst sie und schreibt sie in die Messwerte.
- Zuruf in echter Hallenakustik, Pfiff des 7-m-Trainers über Hallenlärm.
- Lesbarkeit und Bedienung aus der Entfernung, mit Ball, mit verschwitzten Fingern.

## Abdeckung heute (Stand dieser Datei)

| Bereich | Unit | Browser (Demo) | Halle |
|---|---|---|---|
| Ruf-Erkennung | ✓ | ✓ (Fake-Mikrofon) | offen |
| Ballaufprall per Mikro | ✓ | ✓ (Fake-Mikrofon) | offen |
| Linie ablaufen / einrasten, Kamera bewegt | – | ✓ | offen |
| Sechs Prüfungen des Außenwurfs | – | ✓ (4 Wurfarten, 2 Kamerapositionen) | offen |
| Wurf-Videos | – | ✓ | offen |
| Startmenü | – | ✓ | – |
| Aufgaben (Baustein + A1 …) | ✓ | ✓ | offen |
| 7-m-Trainer (Zeit, Linie, Standbein, Serie) | ✓ | ✓ | offen |
| Rückraum-Modus (9-m-Linie, Schritte, Abwurf im höchsten Punkt) | ✓ (Schritte) | ✓ | offen |
| Pässe gegen die Wand (Zählen, Arm, Gegenbein) | ✓ | ✓ | offen |
| Sprungkraft (Zählen, Höhe, Bein, Bodenkontakt) | ✓ | ✓ | offen |
| Abwehr-Beinarbeit (Richtung, Reaktion, gekreuzt, Grundstellung) | ✓ | ✓ | offen |

Die Tabelle wird mit jeder neuen Übung ergänzt.
