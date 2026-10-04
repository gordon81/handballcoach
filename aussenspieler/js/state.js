// Gemeinsamer Laufzeit-Zustand, den mehrere Module lesen und ändern.
// (Bewusst ein Objekt: importierte Variablen kann ein anderes Modul nicht neu zuweisen.)

export const app = {
  state: 'off',     // off | ready | runup | air | cool (siehe tracking.js)
  stateT: 0,        // Zeitpunkt des letzten Zustandswechsels (s)
  source: 'none',   // none | cam | file
  target: null,     // aktuell angesagtes Ziel
  latest: null,     // letzter erkannter Frame (fürs Zeichnen)
  marking: null,    // Punkte, während die 6-m-Linie markiert wird
  markStep: null,   // 'line' (Punkte auf der Linie) | 'inside' (Punkt im Torraum)
  pending: null,    // Ziel, das erst beim Absprung angesagt wird (Aufgabe „Entscheidung in der Luft“)
  task: null,       // laufende Aufgaben-Serie {id, run, entries[], done} (taskRun.js), null = freies Training
  holdUntil: 0      // keine Zielansage vor diesem Zeitpunkt (Anleitung der Aufgabe wird noch gesprochen)
};
