// Feste Werte: KI-Bibliothek, Modelle, Körperpunkte und Standard-Einstellungen.

// KI-Bibliothek und Modelle: shared/js/pose.js.

const Q = new URLSearchParams(globalThis.location?.search ?? '');   // ohne location (Node-Tests): Standard
// Demo-Modus (gezeichnete Halle, simulierte Person statt Kamera und KI): Seite mit ?demo=1 öffnen.
export const DEMO = Q.has('demo');
// Rückraum-Modus (?rr=1): dieselbe App für den Sprungwurf aus dem Rückraum. 9-m-Linie statt 6-m-Linie, eigener Speicher,
// zusätzlich Drei-Schritt-Rhythmus und Abwurf im höchsten Punkt; die Drehung zählt hier nicht.
export const RR = Q.has('rr');
// Texte, die sich zwischen Außen und Rückraum unterscheiden.
export const TXT = RR ? {
  app:'Rückraum-Coach', sub:'Sprungwurf aus 9–10 m: Absprung, Schritte, Abwurf im höchsten Punkt', line:'9-m-Linie', lineSay:'Neun-Meter-Linie',
  insideLabel:'Tor', insideTap:'1 Punkt Richtung Tor (innerhalb der 9 m) antippen', insideSay:'zwei Schritte Richtung Tor gehen',
  tapHint:'beim Bogen 4–6, gestrichelte Linie: auf die Striche tippen', profile:'Rückraum', report:'Rückraum-Training'
} : {
  app:'Außenwurf-Coach', sub:'Zielansage, Technik-Check und Feedback per Sprache', line:'6-m-Linie', lineSay:'Sechs-Meter-Linie',
  insideLabel:'Torraum', insideTap:'1 Punkt im Torraum antippen', insideSay:'zwei Schritte in den Torraum gehen',
  tapHint:'beim Bogen 4–6', profile:null, report:'Außenwurf-Training'
};

// MediaPipe-Pose-Indizes der Punkte, die die Prüfungen brauchen.
export const L = {nose:0,lSh:11,rSh:12,lEl:13,rEl:14,lWr:15,rWr:16,lHip:23,rHip:24,lAnk:27,rAnk:28,lHeel:29,rHeel:30,lToe:31,rToe:32};
// Verbindungen für das gezeichnete Skelett.
export const BONES = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[27,29],[29,31],[27,31],[28,30],[30,32],[28,32]];

export const DEF = {hand:'R', pos:'LA', camPos:'base', lines:{}, mode:'auto', pause:4, callMin:1, callMax:5, sens:'mid', clips:true, camera:'environment', model:'lite', line:null, session:null, task:'free', taskHist:{}, rings:{}, ringSize:0.02, throwDist:7,
  targets:[{name:'Orange kurz',on:true},{name:'Orange lang',on:true},{name:'Blau kurz',on:true},{name:'Blau lang',on:true}]};

// Kamerapositionen (Einrichtung). Jede Position hat ihre eigene Linie (settings.lines).
export const CAM_POS = RR ? {
  base: {name:'1 · Schräg vorn', where:'Seitlich vor dem Rückraum, etwa auf Höhe der 7-m-Linie am Rand, erhöht (1,5–2 m). 9-m-Linie, Anlauf und Absprung im Bild.'}
} : {
  base: {name:'1 · Grundlinie', where:'Auf der Grundlinie zwischen 6-m-Linie und Tor, erhöht (1,5–2 m), schräg auf die Absprungzone.'},
  court: {name:'2 · Feld mit Tor', where:'Im Feld hinter dem 7-m-Punkt, zur anderen Seite versetzt, erhöht (1,5–2 m). Tor und Absprungzone im Bild.'}
};

// Grenzwerte der Prüfungen in Körperlängen (KL = Schulter–Knöchel) bzw. Grad. Nach den ersten Hallentests
// anpassen: die Messwerte jedes Wurfs stehen im Training-Fenster und im Bericht (siehe brain.md, Kalibrieren).
export const TH = {jumpHigh:0.25, jumpMid:0.17, rot:25, rotWrongSide:35, leanUpright:15, leanForward:25, leanStrong:35,
  // Halbe Linienbreite (2,5 cm bei ~140 cm KL): ein Fuß weniger weit vor der markierten Linienmitte steht auf der Linie = Übertritt.
  lineHalf:0.018,
  // Aufgabe „Absprung an der Linie“: geschafft, wenn der Fuß höchstens so weit vor der Linie abspringt (KL, ~30 cm).
  taskLineFar:-0.2,
  // Aufgabe „Wurfhöhe auf Ansage“ (Handgelenk im Wurf-Frame, KL): „Hoch“ = über der Nase um mehr als taskHighArm;
  // „Hüfte“ = unter der Wurfschulter (taskHipShoulder) und nicht tiefer als taskHipLow unter der Hüfte.
  taskHighArm:0, taskHipShoulder:0, taskHipLow:-0.1,
  // Aufgabe „Serie unter Ermüdung“: Sprunghöhe der letzten 5 Würfe mindestens so viel vom Schnitt der ersten 5.
  taskTiredKeep:0.9,
  // Aufgabe „Winkel vergrößern“: Flug im Bild mindestens so viel Grad gegen den Anlauf nach innen gedreht.
  taskFlyAng:20,
  // Aufgabe „Gegenstoß auf Zeit“: höchstens so viele Sekunden vom Ruf bis zum Absprung (persönlich, nach dem Hallentest anpassen).
  taskBreakMax:4.0,
  // Aufgabe „Kreisläufer“: mindestens so weit (°) gedreht, damit die Richtung zählt.
  taskTurnMin:60,
  // Rückraum: Abwurf höchstens so weit (s) vom höchsten Punkt der Hüfte (im Demo: sauber ≤ 0,03 s, zu spät 0,18 s); Schritte vor dem Absprung (Bodenkontakte), die als Rhythmus gelten.
  peakDt:0.15, steps:3};
// Abweichende Grenzen je Kameraposition (sonst TH). Position 2 sieht den Sprung von der Seite und misst ihn größer:
// auf Position 1 läuft der Spieler in der Luft auf die erhöhte Kamera zu, die Hüfte sinkt im Bild (im Demo ~1,5× weniger).
export const TH_POS = {court:{jumpHigh:0.36, jumpMid:0.30}};
// Rückraum: Kamera schräg von vorn, der Spieler springt auf sie zu, die Hüfte steigt im Bild weniger (im Demo 0,21 statt 0,32).
export const TH_RR = {jumpHigh:0.19, jumpMid:0.13};
// Vorzeichen der Hüft-Drehung aus den worldLandmarks, damit + = Drehung nach links (aus Sicht des Spielers). Im Demo
// bestimmt; ob MediaPipe in der Halle dieselbe Richtung liefert, zeigt der Hallentest (Kreisläufer).
export const TURN_SIGN = 1;
// Für die cm-Angaben angenommene Körperlänge (Schulter–Knöchel eines Erwachsenen).
export const KL_CM = 140;
