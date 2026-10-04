# Außenwurf-Coach – Dokumentation

Anleitung für Trainer und Spieler: was die App macht, wie man sie bedient und wo sie ihre Daten ablegt.
Technische Details für Änderungen am Code stehen in [`brain.md`](brain.md).

**App:** https://gordon81.github.io/handballcoach/aussenspieler/ (Startmenü mit allen Trainings: https://gordon81.github.io/handballcoach/)
**Demo ohne Kamera:** https://gordon81.github.io/handballcoach/aussenspieler/?demo=1

---

## 1. Was die App macht

Ein Spieler trainiert allein Außenwürfe (Links- oder Rechtsaußen) ohne Torwart. Das Handy steht auf dem Stativ und

1. sagt per Sprache ein Ziel an (Standard: die Gummiringe „Orange kurz“, „Orange lang“, „Blau kurz“, „Blau lang“),
2. beobachtet Anlauf, Absprung und Wurf mit der Kamera (KI-Körpererkennung MediaPipe Pose),
3. sagt nach jedem Wurf ein Lob und den wichtigsten Verbesserungstipp an und zeigt eine Ergebnis-Karte,
4. nimmt pro Wurf ein kurzes Video auf (Zeitlupe zum Nachschauen),
5. fasst das Training zusammen und erstellt einen Bericht zum Teilen.

Alles läuft im Browser auf dem Handy. Es gibt keinen Server, kein Konto und keine Uploads. Aus dem Netz geladen werden nur die App selbst, die KI-Bibliothek und das KI-Modell (einmalig einige MB) sowie die Schriftart.

### Die sechs Prüfungen

| Prüfung | Was gemessen wird | Gut, wenn … |
|---|---|---|
| **Übertritt** | Fußspitze oder Ferse des Sprungbeins beim letzten Bodenkontakt gegenüber der markierten 6-m-Linie | der Fuß außerhalb des Torraums bleibt. Ohne eingerichtete Linie wird nicht geprüft. |
| **Sprungbein** | welcher Fuß zuletzt am Boden war | Rechtshänder links, Linkshänder rechts abspringen |
| **Wurfarm** | Höhe des Wurf-Handgelenks beim Absprung | Handgelenk über der Nase (über der Schulter = mittel) |
| **Körperdrehung** | wie weit die Schultern gegen die Hüfte aufdrehen (3D-Schätzung) | ab 25°, auf der „falschen Seite“ (Rechtshänder auf Rechtsaußen bzw. Linkshänder auf Linksaußen) ab 35° |
| **Sprunghöhe** | Hüfte im höchsten Punkt über der Anlauf-Höhe | hoch genug (Grenzen je Kameraposition) |
| **Oberkörper** | Neigung beim Wurf | aufrecht oder leichte Rücklage; nach vorn Richtung Torraum kippen ist ein Fehler |

Angesagt wird immer nur **ein** Tipp, und zwar der wichtigste Fehler in dieser Reihenfolge: Übertritt, Sprungbein, Wurfarm, Drehung, Sprung, Oberkörper.
Drehung, Sprunghöhe und Oberkörper sind Schätzungen aus einer einzigen Kamera. Treffer erkennt die App nicht selbst, die tippt man auf der Ergebnis-Karte an.

---

## 2. Voraussetzungen

- Handy mit Chrome (Android) oder Safari (iPhone); am PC geht ein aktueller Chrome/Edge/Firefox.
- Die Seite muss über **https** (die Live-Adresse) oder `http://localhost` laufen. Als Datei (`file://`) geöffnet gehen Kamera und Mikrofon nicht.
- Beim ersten Start fragt der Browser nach **Kamera**, im Modus „Nach Zuruf“ auch nach dem **Mikrofon**. Beides erlauben.
- Stativ, das Handy erhöht (1,5–2 m). Gutes Licht hilft der Erkennung, 60 fps sind besser als 30.
- Ton am Handy an, damit man die Ansagen hört (Sprachausgabe auf Deutsch).
- Während des Trainings hält die App den Bildschirm wach.

---

## 3. Bedienung im Überblick

### Untere Button-Leiste

| Button | Funktion |
|---|---|
| **Start / Stopp** | Erster Druck: KI und Kamera laden, Einrichtung öffnen. In der Einrichtung startet „Training starten“. Während des Trainings wird der Button zu **Stopp**. |
| **Setup** | Einrichtung öffnen oder schließen (Kameraposition, 6-m-Linie, Mikro-Test). |
| **Ansage** | Sofort ein Ziel ansagen (nur im Kamera-Modus bei laufendem Training). Nützlich, wenn die automatische Ansage nicht kommt. |
| **Video** | Eine Videodatei vom Handy laden und analysieren (siehe Abschnitt 6). |
| **Log** | Fenster „Training“: Auswertung, alle Würfe, Videos, Bericht. |
| **⚙︎** | Einstellungen. |

### Anzeigen oben im Bild

- **Zustand:** *Gestoppt*, *Bereit*, *Anlauf* (Ziel angesagt), *Sprung*, *Pause* (nach dem Wurf); im Zuruf-Modus *Warte auf Zuruf* bzw. *Zuruf gehört*; bei Videodateien *Analyse aktiv*.
- **Mikro** mit kleinem Pegel-Balken: nur sichtbar, solange das Mikrofon an ist. Rot = das Mikrofon liefert keinen Ton.
- **fps:** wie viele Bilder pro Sekunde die KI auswertet. Ziel: 25 oder mehr.
- **Zielname** groß in der Mitte, solange ein Ziel angesagt ist.
- Im Bild: die **rote 6-m-Linie** (eingerichtet) und das **Skelett** des Spielers.

### Ergebnis-Karte nach jedem Wurf

Zeigt alle Prüfungen (✓ gut, • mittel, ✗ Fehler), „Gut:“ (Lob) und „Besser:“ (Tipp). Darunter:
- **▶︎ Video ansehen** (erscheint, sobald das Video gespeichert ist),
- **Treffer / Daneben**, wenn ein Ziel angesagt war. Das Ergebnis geht in die Trefferquote je Ziel ein.

Die Karte verschwindet nach 10 s von selbst (nach dem Antippen von Treffer/Daneben nach 1,5 s).

---

## 4. Einrichtung (vor jedem Training)

**Start** drücken. Die App lädt KI und Kamera und öffnet die Einrichtung. Darin:

### 4.1 Kameraposition wählen

| | Position 1 · Grundlinie (Standard) | Position 2 · Feld mit Tor |
|---|---|---|
| Wo | Auf der Grundlinie zwischen 6-m-Linie und Tor, erhöht, schräg von vorn auf die Absprungzone | Im Feld hinter dem 7-m-Punkt, zur anderen Seite versetzt (vom Flügel aus gesehen), erhöht |
| Im Bild | Ganzer Körper und Linie | Tor, Linie und Absprungzone; der Sprung wird von der Seite gesehen |
| Hinweis | | Spieler ist weiter weg und kleiner im Bild: auf gutes Licht achten, bei Erkennungsproblemen in den Einstellungen das KI-Modell „Full“ wählen |

Jede Position hat ihre **eigene gespeicherte 6-m-Linie**. Beim Wechsel lädt die App die Linie dieser Position und prüft, ob die Kamera noch so steht wie damals. Die Prüfungen sind für beide Positionen gleich, nur die Grenzen für die Sprunghöhe unterscheiden sich.

### 4.2 Die 6-m-Linie einrichten

Ohne Linie kann das Training im Kamera-Modus nicht starten (der Übertritt braucht sie). Zwei Wege:

**Linie ablaufen (empfohlen)**
1. „Linie ablaufen“ tippen. Ansage: *„Stell dich ans äußere Ende der Sechs-Meter-Linie und warte kurz.“*
2. Eine Person stellt sich mit den Füßen auf das äußere Ende der Linie und bleibt ca. 1,5 s still stehen.
3. Ansage „los“: langsam auf der Linie nach innen gehen, am Ende stehen bleiben (oder „Fertig“ tippen; nach 30 s ist automatisch Schluss).
4. Die App sucht dabei den gemalten Strich am Boden und rastet die Linie darauf ein („am Boden erkannt“). Findet sie ihn nicht sicher, nimmt sie die Fußpunkte.
5. Ansage: zwei Schritte in den Torraum gehen und stehen bleiben. Damit weiß die App, auf welcher Seite der Torraum liegt. Klappt das nicht innerhalb von 20 s, „Torraum antippen“ und einen Punkt im Torraum antippen.
6. Ansage „Linie gespeichert.“ Prüfen, ob die rote Linie auf dem Strich liegt.

**Linie antippen**
1. „Linie antippen“, dann Punkte entlang der 6-m-Linie im Bild antippen (Bogen: 4–6 Punkte).
2. „↶ Zurück“ nimmt den letzten Punkt zurück, „⇅“ schiebt die Leiste nach unten, falls sie die Linie verdeckt.
3. „Fertig“, dann **einen Punkt im Torraum** antippen. Auch hier rastet die App auf den Strich am Boden ein, wenn sie ihn sicher findet.

Weitere Buttons: **Korrigieren** (Antippen mit den bisherigen Punkten), **Löschen** (Linie der aktuellen Kameraposition entfernen). In den Einstellungen gibt es zusätzlich „6-m-Linie löschen“.

### 4.3 Gespeicherte Linie und Nachjustieren

Die Linie bleibt gespeichert, zusammen mit einem kleinen Referenzbild der Kamera. Beim nächsten Start:
- **Kamera steht gleich:** Hinweis „Linie von der letzten Einrichtung gefunden“, Button **„Mit dieser Linie starten“**.
- **Kamera leicht verschoben:** die App schiebt die Linie mit und rastet sie neu ein: „Linie neu ausgerichtet, bitte prüfen“. Erst prüfen, dann noch einmal auf Start tippen.
- **Kamera stark bewegt:** „Bitte die Linie neu einrichten“. Neu ablaufen oder antippen. Wer sicher ist, dass nur das Licht anders ist, tippt ein zweites Mal auf Start und trainiert trotzdem.

Dieser Kamera-Check läuft beim Öffnen der Einrichtung, beim Wechsel der Kameraposition und bei „Training starten“.

### 4.4 Mikro testen (nur im Modus „Nach Zuruf“)

Erscheint in der Einrichtung, wenn in den Einstellungen „Ansage: Nach Zuruf“ gewählt ist.
1. „Mikro testen“ tippen.
2. Vom Startpunkt laut rufen („Hey!“). Der Balken muss über den weißen Strich (Schwelle). Erkannte Rufe: grün, Piep, Zähler.
3. Ball prellen, Schuhe quietschen lassen, pfeifen: das darf **nicht** zählen.
4. Empfindlichkeit direkt darunter anpassen: **Laute Halle** (braucht lauteren Ruf), **Mittel**, **Leise Halle**.
5. „Test beenden“ oder Training starten (der Test endet dann automatisch).

### 4.5 Übung wählen: freies Training oder Aufgabe

Ganz oben in der Einrichtung steht **Übung**:
- **Freies Training** (Standard): Würfe mit Zielansage und Technik-Feedback, ohne feste Anzahl.
- **Absprung an der Linie:** 10 Würfe, so nah wie möglich an der 6-m-Linie abspringen, ohne überzutreten. Geschafft ist ein Wurf, wenn der Fuß beim Absprung höchstens ca. 30 cm vor der Linie ist und nicht übertritt. Die Aufgabe ist geschafft bei **7 von 10**.

- **Entscheidung in der Luft:** die App sagt nur **„Los“**. Der Spieler läuft ohne Ziel an, das Ziel kommt erst, **wenn er abspringt**. So lernt man, die Ecke erst in der Luft zu wählen (wie gegen einen Torwart). Geschafft ist ein Wurf mit richtigem Sprungbein, Wurfarm oben und ohne Übertritt; wer auf der Ergebnis-Karte „Daneben“ tippt, hat ihn nicht geschafft. 10 Würfe, Ziel **7 von 10**.

- **Wurfhöhe auf Ansage:** vor dem Ziel sagt die App **„Hoch.“** (über dem Kopf abwerfen) oder **„Hüfte.“** (seitlich, Hand zwischen Hüfte und Schulter), z. B. *„Hüfte. Blau lang“*. Geprüft wird die Hand im Moment des Abwurfs. 10 Würfe, Ziel **7 von 10**.
- **Serie unter Ermüdung:** 20 Würfe mit nur 2 s Pause. Ab dem 6. Wurf warnt die App *„Sprung wird flacher. Knie hoch.“*, wenn ein Sprung deutlich niedriger ist als am Anfang. Geschafft, wenn die letzten 5 Sprünge im Schnitt mindestens **90 %** so hoch sind wie die ersten 5 und kein Übertritt dabei war. Das Ergebnis steht in Prozent.

Unter der Auswahl stehen kurz die Regeln und, sobald es sie gibt, **Bestwert** und **letztes Ergebnis**. Der Start-Button heißt dann „Aufgabe starten“.

So läuft eine Aufgabe:
1. Die App liest die Aufgabe vor, danach kommt die erste Zielansage.
2. Oben rechts steht groß, der wievielte Wurf es ist („3/10“), darunter wie viele geschafft sind und das Ziel.
3. Nach jedem Wurf sagt die App das Ergebnis an, z. B. *„Geschafft. 15 Zentimeter vor der Linie. Noch 7.“* oder *„40 Zentimeter vor der Linie. Näher ran.“* oder *„Übertritt.“* Die Ergebnis-Karte zeigt es oben in Grün/Rot, darunter wie gewohnt die Technik.
4. Nach dem letzten Wurf: *„Aufgabe geschafft: 8 von 10.“* bzw. *„6 von 10. Ziel war 7.“* Das Training stoppt, eine große Karte zeigt das Ergebnis mit **Nochmal** (gleich die nächste Serie) und **Fertig**.
5. **Stopp** mitten in der Serie bricht sie ab; sie zählt dann nicht im Verlauf.

Die cm-Angaben sind Schätzungen aus dem Kamerabild (siehe Messwerte). Aufgaben gibt es nur mit Kamera, nicht bei Videodateien.

### 4.6 Training starten

„Training starten“ bzw. „Mit dieser Linie starten“. Die App sagt *„Los geht's“*. Ab jetzt läuft der Wurfzyklus (Abschnitt 5). **Stopp** beendet das Training, Mikrofon und Bildschirm-wach gehen aus.

---

## 5. Training

### 5.1 Ablauf eines Wurfs

1. **Bereit:** die App wartet auf den Auslöser für die Ansage (siehe Modi).
2. **Anlauf:** Ziel wird angesagt, das Video läuft. Kommt innerhalb von 8 s kein Sprung, geht es zurück auf „Bereit“.
3. **Sprung:** Absprung erkannt; die App merkt sich Absprung, Arm, höchsten Punkt und Wurf.
4. **Landung:** Bewertung, Sprachfeedback (Lob + Tipp), Ergebnis-Karte, Video wird 0,8 s nach der Landung gespeichert.
5. **Pause:** Standard 4 s (einstellbar), dann wieder „Bereit“.

Würfe ohne Ansage (z. B. wenn der Spieler einfach losläuft) werden trotzdem erkannt, bewertet und aufgenommen.

### 5.2 Ansage-Modi (Einstellungen → „Ansage“)

| Modus | Wann kommt das Ziel? |
|---|---|
| **Wenn Spieler im Bild steht** (Standard) | sobald der Spieler mindestens 0,6 s im Bild ist **und still steht**. Wer noch zurückgeht, bekommt noch keine Ansage. |
| **Nach fester Pause** | 1,5 s nach Ende der Pause, unabhängig vom Spieler. |
| **Nach Zuruf (Mikrofon)** | der Spieler ruft laut, wenn er bereit ist. Ein **Piep** bestätigt, das Ziel kommt nach der eingestellten Zeit: fest 1, 2, 3, 4 oder 5 s oder **zufällig 1–5 s** (Standard, „Ziel nach Zuruf“). |

Unabhängig vom Modus sagt der Button **Ansage** jederzeit sofort ein Ziel an. Dasselbe Ziel kommt nie zweimal hintereinander.

### 5.3 „Nach Zuruf“ im Detail

- Der Spieler ruft vom Startpunkt laut, kurz und deutlich („Hey!“, „Los!“). **Welches Wort, ist egal.**
- Ein Ruf zählt nur, wenn er nach Stimme klingt, mindestens kurz anhält, nicht länger als 2 s dauert und aus der Ruhe kommt. Ballaufpralle, Schuhquietschen, Pfiffe und Dauerlärm zählen deshalb nicht.
- Der Spieler muss **im Bild** sein. Ruft jemand, der nicht zu sehen ist, kommt nur der Hinweis „Zuruf gehört, aber niemand im Bild“. So lösen Rufe von anderen Feldern nichts aus.
- Nach einem Ruf ist 1,5 s Sperre. Während die App selbst spricht und kurz nach einer Zielansage hört sie nicht hin.
- Ein Ruf während der Pause nach dem Wurf zählt auch; das Ziel kommt dann frühestens nach der Pause.
- Das Mikrofon ist nur an, solange im Zuruf-Modus trainiert wird (oder beim Mikro-Test). Nach Stopp ist es aus.
- Liefert das Mikrofon keinen Ton (z. B. Erlaubnis verweigert), erscheint ein Hinweis; dann per Button **Ansage** weitermachen oder einen anderen Modus wählen.

### 5.4 Sprachsteuerung: was geht und was nicht

**Was die App spricht** (Sprachausgabe des Handys, Deutsch): Zielansagen, Lob und Tipp nach jedem Wurf, die Anweisungen beim Linie-Ablaufen, Hinweise beim Kamera-Check, „Los geht's“.

**Was die App hört:** nur, *dass* laut gerufen wurde (Lautstärke und Klang), im Modus „Nach Zuruf“. Es gibt **keine Spracherkennung**: die App versteht keine Wörter. Man kann also nicht per Stimme stoppen, ein bestimmtes Ziel verlangen, Treffer melden oder Einstellungen ändern. Das geht nur über die Buttons.

Warum so: Worterkennung braucht auf Android eine Internetverbindung zu Google, ist in einer lauten Halle unzuverlässig und reagiert verzögert. Die Lautstärke-Erkennung läuft offline und sofort.

### 5.5 Einstellungen (⚙︎)

| Einstellung | Bedeutung |
|---|---|
| Wurfhand | Rechts / Links (bestimmt das richtige Sprungbein und den Wurfarm) |
| Position | Linksaußen / Rechtsaußen (für die Drehungs-Grenze auf der „falschen Seite“) |
| Ansage | siehe 5.2 |
| Ziel nach Zuruf | 1–5 s fest oder zufällig 1–5 s (nur im Zuruf-Modus sichtbar) |
| Mikrofon-Empfindlichkeit | Niedrig (laute Halle) / Mittel / Hoch (leise Halle); dieselbe Einstellung wie im Mikro-Test |
| Wurf-Videos | Aufnehmen / Aus. „Aus“ spart Rechenzeit und Speicher. |
| Pause nach Wurf | 1–30 s, Standard 4 |
| Kamera | Rückkamera / Frontkamera |
| KI-Modell | Lite (schneller, Standard) / Full (genauer, langsamer) |
| Ziele für die Ansage | an-/abhaken, umbenennen, entfernen, „Ziel hinzufügen“ |
| 6-m-Linie löschen | löscht die Linie der aktuellen Kameraposition |

Alle Einstellungen werden sofort gespeichert und gelten auch beim nächsten Öffnen.

### 5.6 Trainings (Sitzungen)

Würfe werden zu „Trainings“ zusammengefasst. Ein neues Training beginnt automatisch, wenn seit dem letzten Wurf mehr als **3 Stunden** vergangen sind, oder per Button „Neues Training starten“ im Log. Das alte Training bleibt gespeichert.

---

## 6. Videodatei analysieren

Mit **Video** eine Videodatei vom Handy wählen (z. B. ein Bundesliga-Clip oder eine eigene Aufnahme). Die Analyse startet sofort, es gibt keine Ansagen, die Linie ist optional (über „Setup“; ohne Linie wird der Übertritt nicht geprüft).

Video-Leiste: **▶︎/❚❚** abspielen/anhalten, **−2 s** zurück, Geschwindigkeit **0,25× / 0,5× / 1×** (Standard 0,5×, langsamer ist genauer), Schieberegler zum Spulen, **Kamera** zurück zur Live-Kamera.

Aus Videodateien werden keine eigenen Clips aufgenommen. Die Würfe landen aber im Log wie im Training.

---

## 7. Auswertung und Bericht (Button „Log“)

Das Fenster „Training“ zeigt **das aktuelle Training**:
- Zusammenfassung: Anzahl Würfe, davon technisch sauber, Drehung im Schnitt,
- **Aufgaben:** jede Serie in diesem Training mit Ergebnis („8 von 10, geschafft“), bei den Würfen steht „Aufgabe ✓/✗“ und der Grund,
- **Stärken** (ab 3 Würfen) und **Daran arbeiten** (die 3 häufigsten Fehler mit Tipp und Übung),
- **Ziele:** Technik ok und Treffer je Ziel,
- **Würfe:** neueste oben, mit Lob, Hauptfehler, **Messwerten** und **▶︎ Video**.

Buttons:
- **Bericht teilen:** Text über das Teilen-Menü (z. B. WhatsApp). Ohne Teilen-Menü wird der Text in die Zwischenablage kopiert.
- **Bericht als Datei:** HTML-Seite `Wurfbericht-JJJJ-MM-TT.html` mit allen Würfen und der Tabelle „Messwerte“. Wird geteilt (Handy) oder heruntergeladen (PC). Im Browser öffnen oder als PDF drucken.
- **Neues Training starten:** beginnt ein neues Training, das alte bleibt gespeichert.
- **Gesamtes Log löschen:** löscht nach Rückfrage **alle Würfe aller Trainings und alle Wurf-Videos**.

Hinweis: Die App zeigt und berichtet nur das **aktuelle** Training. Frühere Trainings bleiben im Speicher (bis zu 1000 Würfe insgesamt), lassen sich in der App aber nicht mehr aufrufen. Wer ein Training aufheben will, erstellt am Ende den Bericht als Datei.

### Messwerte

Bei „Entscheidung in der Luft“ zusätzlich **Ansage**: wie viele Millisekunden nach dem Absprung die App das Ziel abschickt und wann die Sprachausgabe des Handys wirklich zu sprechen beginnt. Ist der zweite Wert deutlich über 300 ms, kommt das Ziel zu spät.

Pro Wurf: Kameraposition (1/2), **Linie** (Fuß zur 6-m-Linie beim Absprung, + = im Torraum, also Übertritt), **Arm** (Handgelenk über + oder unter − der Nase), **Drehung** (°), **Sprung** (Hüfte über Anlauf-Höhe), **Oberkörper** (°, + = Richtung Torraum), **fps**. Die cm-Werte sind Schätzungen (angenommen 140 cm von Schulter bis Knöchel); sie dienen zum Einstellen der Grenzen nach dem Hallentest.

### Wurf-Videos ansehen

„▶︎ Video ansehen“ auf der Ergebnis-Karte oder „▶︎ Video“ im Log. Das Video startet in 0,5× und läuft in Schleife; Buttons 1× / 0,5× / 0,25×. **Speichern** öffnet auf dem Handy das Teilen-Menü (z. B. Galerie, WhatsApp, Dateien), am PC wird die Datei heruntergeladen. Dateiname: `Wurf-<Nr>-JJJJ-MM-TT.mp4` (je nach Browser `.webm`).

Ein Video zeigt das Kamerabild mit eingezeichneter Linie, Skelett und Zielname, ab der Zielansage bis kurz nach der Landung (max. 720 px breit, ca. 350 KB pro Wurf).

---

## 8. Wo die Daten liegen

Die App schreibt **keine Log-Dateien** und schickt nichts an einen Server. Alles liegt im **Speicher des Browsers** für die Adresse, unter der die App geöffnet wurde. Das heißt:
- Die Daten gibt es nur auf diesem einen Gerät und in diesem einen Browser. Handy und PC haben getrennte Daten.
- Live-Seite (`gordon81.github.io`), lokaler Test (`localhost:8000`) und Demo-Modus haben jeweils getrennte Daten.
- Ein privates/Inkognito-Fenster vergisst alles beim Schließen.

| Was | Wo im Browser | Name | Umfang | Löschen in der App |
|---|---|---|---|---|
| Einstellungen, 6-m-Linien (je Kameraposition, mit Referenzbild), aktuelles Training, gewählte Übung, Verlauf der Aufgaben (je Aufgabe die letzten 30 Serien) | localStorage | `awc-settings` | wenige KB | Linie: „Löschen“ in der Einrichtung / „6-m-Linie löschen“; Einstellungen: nur über die Browser-Daten |
| Wurf-Log (alle Würfe mit Bewertung, Treffer, Messwerten) | localStorage | `awc-log` | die letzten 1000 Würfe | „Gesamtes Log löschen“ |
| Wurf-Videos | IndexedDB | Datenbank `awc-clips` | die letzten **60** Videos (ca. 20 MB), ältere werden automatisch gelöscht | „Gesamtes Log löschen“ (löscht Log **und** Videos) |
| Demo-Modus | localStorage / IndexedDB | `awc-demo-settings`, `awc-demo-log`, `awc-demo-clips` | wie oben | wie oben, im Demo-Modus |
| Berichte | nicht in der App | `Wurfbericht-JJJJ-MM-TT.html` | | liegt dort, wo man ihn hin geteilt hat, bzw. im Download-Ordner |
| Gespeicherte Videos | nicht in der App | `Wurf-<Nr>-JJJJ-MM-TT.mp4` | | Galerie/Dateien bzw. Download-Ordner |
| KI-Modell | Browser-Cache | | ca. 6 MB (Lite) bzw. 9 MB (Full) | lädt der Browser bei Bedarf neu |

### Rankommen an die Daten

- **Handy (Android/Chrome):** über die App selbst: Log → „Bericht als Datei“, einzelne Videos über „Speichern“. Heruntergeladene Dateien liegen in der App „Dateien“ unter *Downloads*. Direkten Zugriff auf localStorage/IndexedDB gibt es am Handy nicht.
- **PC (Chrome/Edge):** F12 → Reiter *Application* (Anwendung) → *Local Storage* → `https://gordon81.github.io` zeigt `awc-settings` und `awc-log` als Text; *IndexedDB* → `awc-clips` → `clips` enthält die Videos. Das komplette Log kopieren: in der Konsole (F12 → *Console*) `copy(localStorage['awc-log'])` eingeben und in eine Textdatei einfügen.
- **Handy-Daten am PC ansehen (Android):** Handy per USB verbinden, USB-Debugging an, am PC in Chrome `chrome://inspect` öffnen, die App-Seite auswählen, dann wie beim PC.

### Komplett löschen

- **In der App:** „Gesamtes Log löschen“ entfernt alle Würfe und Videos; Einstellungen und Linien bleiben.
- **Alles inkl. Einstellungen, Handy (Chrome):** Einstellungen → Website-Einstellungen → Alle Websites → `gordon81.github.io` → Daten löschen. **Achtung:** das löscht auch die Daten anderer Seiten unter `gordon81.github.io`.
- **Alles, PC (Chrome/Edge):** F12 → *Application* → *Storage* → „Clear site data“, oder Schloss-Symbol in der Adresszeile → Website-Einstellungen → Daten löschen.
- **iPhone (Safari):** Einstellungen → Safari → Erweitert → Website-Daten → `github.io` löschen.

Der Browser kann gespeicherte Daten selbst entfernen, wenn das Handy sehr wenig Speicher hat. Wichtige Trainings deshalb als Bericht sichern.

---

## 9. Demo-Modus (am Schreibtisch testen)

Adresse mit `?demo=1` öffnen oder auf der Startseite „Demo ohne Kamera“ tippen. Statt Kamera und KI gibt es eine gezeichnete Halle (Holzboden, gebogene 6-m-Linie, 9-m-Linie, Tor und Linien anderer Sportarten als Störer) und eine simulierte Person, die auf die Ansagen reagiert:
- Einrichtung: geht ans Ende der Linie, läuft sie ab, macht zwei Schritte in den Torraum,
- Training: Anlauf und Sprungwurf nach jeder Ansage, im Wechsel *gut, gut, Übertritt, flach mit Arm unten*,
- Zuruf-Modus: die Person ruft selbst am Startpunkt („Demo: Spieler ruft“).

Die Demo folgt der gewählten Kameraposition 1 oder 2. Zusatz-Leiste oben:
- **Kamera bewegen:** verschiebt/schwenkt die Kamera (3 Stellungen). Danach „Setup“ oder „Start“: die App merkt es und richtet die Linie neu aus.
- **Zuruf:** löst von Hand einen Ruf aus (ohne Mikrofon).
- **Beenden:** zurück zur echten App.

Die Demo hat ihren eigenen Speicher (siehe Abschnitt 8); das echte Training bleibt unberührt. Einrichtung, Linienerkennung, Kamera-Check, Analyse, Videos und Bericht laufen genauso wie mit Kamera.

---

## 10. Checkliste für den ersten Hallentest

Die Grenzwerte der Prüfungen sind bisher nur im Demo geprüft. Beim ersten Hallentest:

1. **Aufbau:** Handy erhöht (1,5–2 m) auf Position 1 (oder 2). Linie ablaufen, prüfen, ob die rote Linie auf dem Strich liegt.
2. **Bildrate:** fps oben rechts ansehen, einmal mit Wurf-Videos an, einmal aus. Ziel ≥ 25 fps. Fällt sie mit Videos deutlich (z. B. von 30 auf 20), Videos ausschalten oder Modell „Lite“ nehmen.
3. **Zuruf:** Modus „Nach Zuruf“, in der Einrichtung „Mikro testen“. Vom Startpunkt rufen → grün und Piep. Ball prellen, Schuhe quietschen lassen, pfeifen → darf nicht zählen. Sonst Empfindlichkeit ändern.
4. **Würfe für die Grenzen,** je 5–10 und bewusst: saubere Würfe, knapper Übertritt (Fuß auf/hinter der Linie), flache Sprünge, Arm unten, wenig Drehung, Oberkörper nach vorn fallen lassen. Reihenfolge notieren.
5. **Auswerten:** im Log die Messwerte pro Wurf ansehen (Zweifelsfälle mit „▶︎ Video“ prüfen) und „Bericht als Datei“ teilen; der Bericht enthält die Tabelle „Messwerte“.
6. **Grenzen anpassen:** zwischen die Werte der guten und der bewusst schlechten Würfe legen (im Code `TH` bzw. `TH_POS.court` in `aussenspieler/js/config.js`, siehe `brain.md`). Beim Übertritt zuerst die Linie prüfen, wenn echte Übertritte nur knapp im Plus oder saubere Absprünge im Plus liegen.
7. Beide Kamerapositionen getrennt testen (Spalte „Kamera“ im Bericht).
8. **Aufgabe „Entscheidung in der Luft“:** 10 Würfe, dann im Bericht die Spalte „Ansage“ ansehen und notieren, ob man das Ziel in der Luft noch rechtzeitig gehört hat.
9. **Aufgaben „Wurfhöhe“ und „Ermüdung“:** je 5 Würfe bewusst hoch und aus der Hüfte; prüfen, ob die Ansage stimmt. Bei der Ermüdung prüfen, ob 2 s Pause reichen, um zurück zum Anlauf zu kommen.
10. **Aufgabe „Absprung an der Linie“:** Klebeband 10, 20, 30 und 40 cm vor die Linie kleben, an jedem ein paar Mal abspringen und notieren, was die App ansagt. Passen die cm nicht, wird die Grenze (heute ca. 30 cm) im Code angepasst.

---

## 11. Probleme und Lösungen

| Problem | Lösung |
|---|---|
| „Keine Kamera verfügbar“ | Seite über https (Live-Adresse) öffnen, Kamera-Erlaubnis in den Website-Einstellungen prüfen. |
| KI lädt nicht | Internet nötig beim ersten Laden des Modells; danach aus dem Browser-Cache. |
| Keine Sprachausgabe | Medienlautstärke hochdrehen; Sprachausgabe des Handys (Google-Sprachausgabe, Deutsch) prüfen. Die Sprache wird mit dem ersten Tipp auf Start freigeschaltet. |
| Keine Ansage im Modus „Wenn Spieler im Bild steht“ | Ganzer Körper im Bild? Still stehen. Notfalls Button **Ansage**. |
| Zuruf wird nicht erkannt | Mikro testen, Empfindlichkeit auf „Leise Halle“, lauter und kürzer rufen, im Bild stehen. |
| Zuruf löst zu oft aus | Empfindlichkeit „Laute Halle“. |
| Mikro-Anzeige rot | Mikrofon liefert keinen Ton: Erlaubnis prüfen, andere App mit Mikrofon schließen. |
| Übertritt falsch erkannt | Liegt die rote Linie auf dem Strich? Neu ablaufen; Kamera fester stellen. |
| „Kamera hat sich bewegt“ | Linie prüfen bzw. neu einrichten; bei reinem Lichtwechsel zweites Mal auf Start. |
| fps niedrig | Wurf-Videos aus, Modell „Lite“, besseres Licht. |
| „Video nicht mehr gespeichert“ | Es bleiben nur die letzten 60 Videos. |

---

## 12. 7-m-Trainer

**App:** https://gordon81.github.io/handballcoach/siebenmeter/ (im Startmenü die Karte „7-m-Wurf“) · **Demo:** `siebenmeter/?demo=1`

Der 7-m-Trainer prüft den Strafwurf nach den Regeln: Wurf **innerhalb von 3 Sekunden nach dem Pfiff**, die **7-m-Linie nicht berühren** und das **Standbein nicht bewegen oder abheben**, bis der Ball weg ist.

### Aufbau und Einrichtung
1. Handy aufs Stativ, **seitlich hinter der 7-m-Linie**, erhöht (1–1,5 m). Linie, Füße und Wurfarm müssen im Bild sein.
2. **Start** drücken (Kamera und KI laden), die Einrichtung öffnet sich.
3. **Linie antippen:** auf das eine Ende der 7-m-Linie tippen, dann auf das andere Ende, dann auf **einen Punkt Richtung Tor**. „↶ Zurück“ nimmt den letzten Punkt zurück. Die rote Linie muss auf dem Strich liegen.
4. In der Einrichtung wählen: **Wurfhand**, **Ziel vor dem Pfiff ansagen** (Ja/Nein) und **Übung**: Serie mit 10 Würfen (geschafft bei 8 sauberen) oder frei.
5. **Training starten.**

### Ablauf eines Wurfs
1. Hinter die Linie stellen und **ruhig stehen**. Nach einer Sekunde sagt die App das Ziel an („Oben links“ …).
2. Kurz danach, nach einer zufälligen Pause, kommt der **Pfiff** (hoher Ton, „Pfiff!“ groß im Bild). Wer sich vorher bewegt, bekommt „Zu früh bewegt“ und es geht von vorn los.
3. Werfen. Die App erkennt den Abwurf an der schnellen Armbewegung.
4. Ansage: *„Sauber. 1,4 Sekunden.“* oder der wichtigste Fehler: *„Zu langsam. 3,4 Sekunden.“*, *„Linie übertreten.“*, *„Standbein bewegt.“*, *„Kein Wurf erkannt.“* In der Serie dazu, wie viele Würfe noch fehlen.
5. Die Karte zeigt Zeit, Linie und Standbein, darunter **Treffer / Daneben** für das angesagte Ziel.
6. Nach der Serie: *„Serie geschafft: 8 von 10.“* bzw. *„6 von 10. Ziel war 8.“* und eine große Karte mit **Nochmal** und **Fertig**.

Das Standbein darf abrollen (Ferse heben ist erlaubt), aber nicht rutschen oder abheben. Gemessen wird der Fuß, der ruhiger bleibt; ab ca. 7 cm Bewegung gilt er als bewegt. Diese Grenze und die Linie sind bisher nur im Demo geprüft (siehe Hallentest).

### Log und Bericht
**Log** zeigt das aktuelle Training: wie viele Würfe regelgerecht waren, die Zeit im Schnitt, wie oft zu langsam / Linie / Standbein, die Serien und alle Würfe. **Bericht teilen** schickt den Text übers Teilen-Menü. Daten: localStorage `7m-settings` und `7m-log` (Demo: `7m-demo-…`), getrennt vom Außenwurf-Coach. Wurf-Videos gibt es im 7-m-Trainer noch nicht.

### Hallentest 7 m
Je 5 Würfe: sauber, bewusst zu langsam, Fuß auf die Linie, Standbein anheben oder rutschen lassen. Notieren, was die App ansagt, und prüfen, ob man den Pfiff in der Halle gut hört. Danach im Log die Werte „Linie“ und „Fuß“ ansehen; daraus werden die Grenzen eingestellt.

---

## 13. Abwehr-Beinarbeit

**App:** https://gordon81.github.io/handballcoach/abwehr/ (Karte „Abwehr-Beinarbeit“ im Startmenü) · **Demo:** `abwehr/?demo=1`

Schnelle Abwehrbewegung ohne Ball: seitlich verschieben, heraustreten und zurück, auf Zuruf der App.

### Aufbau
- Handy aufs Stativ, **frontal vor dir**, 4–5 m weg, etwa Hüfthöhe. Ganzer Körper im Bild und Platz für einen großen Schritt nach links, rechts, vorn und hinten. Zwei Hütchen ca. 3 m auseinander helfen.
- **Start** drücken, in der Einrichtung die **Dauer** (30, 40 oder 60 s) und die **Kamera** wählen (Frontkamera, wenn du dich selbst sehen willst), dann **Runde starten**.

### Ablauf
1. *„Stell dich aufrecht hin, Gesicht zum Handy.“* Kurz still stehen: die App misst deine Stand-Höhe.
2. *„Grundstellung.“* Tief gehen, Knie gebeugt.
3. Die App ruft **links**, **rechts**, **raus** (Richtung Handy) oder **zurück**. Die Richtungen gelten **aus deiner Sicht**. Das Wort steht auch groß im Bild. So schnell wie möglich in die Richtung verschieben. Ein tiefer Piep heißt: falsche Richtung, zu langsam oder keine Bewegung.
4. Stehst du zu weit außen, ruft die App dich zur Mitte zurück.
5. Am Ende: *„Fertig. 12 von 14 richtig. Reaktion im Schnitt 0,45 Sekunden.“* und, wenn nötig, *„Füße einmal gekreuzt …“* oder *„Tiefer in die Grundstellung …“*. Die Karte zeigt dasselbe mit **Nochmal** und **Fertig**.

Richtig ist eine Bewegung in die gerufene Richtung, die innerhalb von 1 Sekunde beginnt. Die Reaktionszeit zählt vom Ruf bis zur ersten deutlichen Bewegung der Hüfte; wenn das Handy meldet, wann die Sprachausgabe wirklich anfängt, wird diese Verzögerung abgezogen.

### Log und Bericht
**Log** zeigt jede Runde: richtig, Reaktion im Schnitt, wie oft die Füße gekreuzt waren, wie viel der Zeit du tief warst, und jeden Ruf einzeln. **Bericht teilen** schickt das als Text. Daten: localStorage `def-settings` und `def-log` (Demo: `def-demo-…`).

### Hallentest Abwehr
Eine Runde machen und prüfen: stimmen links und rechts (auch mit der Frontkamera)? Sind die Reaktionszeiten plausibel? Kommt „gekreuzt“ nur, wenn du wirklich kreuzt? Danach werden die Grenzen eingestellt.
