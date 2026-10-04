// Texte für Rückmeldung: Bezeichnungen, Priorität der Fehler und Tipps/Übungen.
import { settings } from './store.js';
import { RR } from './config.js';

// Rückraum: „over“ heißt dort „innerhalb der 9 m abgesprungen“; dazu Schritte (steps) und Abwurf im höchsten Punkt (peak).
export const LABEL_BAD = {over:RR ? 'Absprung zu nah (innerhalb 9 m)' : 'Übertritt', leg:'Falsches Sprungbein', arm:'Wurfarm zu spät oben', rot:'Zu wenig Körperdrehung', jump:'Sprung zu flach', lean:'Oberkörper zu früh vorn',
  steps:'Schrittrhythmus', peak:'Abwurf nicht im höchsten Punkt'};
export const LABEL_GOOD = {over:RR ? 'Absprung vor der 9-m-Linie' : 'Kein Übertritt', leg:'Richtiges Sprungbein', arm:'Wurfarm früh oben', rot:'Gute Körperdrehung', jump:'Starker Sprung', lean:'Stabiler Oberkörper',
  steps:'Dreischritt sauber', peak:'Abwurf im höchsten Punkt'};
// Reihenfolge: der erste gefundene Fehler wird als Tipp angesagt.
export const PRIO = RR ? ['over','leg','steps','arm','peak','jump','lean'] : ['over','leg','arm','rot','jump','lean'];
// „Falsche Seite“: Rechtshänder auf Rechtsaußen bzw. Linkshänder auf Linksaußen. Im Rückraum gibt es das nicht.
export const wrongSide = () => !RR && (settings.hand==='R') === (settings.pos==='RA');

export function tips(){
  const R = settings.hand==='R', bein = R ? 'links' : 'rechts', ws = wrongSide();
  return {
    over: RR ? {short:'Zu nah. Weiter hinten abspringen.', tip:'Für den Rückraumwurf vor der 9-m-Linie abspringen: den Anlauf weiter hinten beginnen und den Abstand nicht im Sprung verschenken.', drill:'Hütchen einen Meter hinter die 9-m-Linie stellen und genau dort abspringen, 10 Wiederholungen.'}
      : {short:'Übertritt. Etwas früher abspringen.', tip:'Etwas früher abspringen: den letzten Schritt kürzer setzen oder den Anlauf weiter außen beginnen.', drill:'Markierung 20–30 cm vor die 6-m-Linie legen und genau dort abspringen, 10 Wiederholungen.'},
    leg:{short:`Falsches Bein. Mit ${bein} abspringen.`, tip:`Als ${R?'Rechtshänder':'Linkshänder'} mit ${bein} abspringen. Rhythmus im Kopf: ${R?'links, rechts, links hoch':'rechts, links, rechts hoch'}.`, drill:'Nur Anlauf und Absprung ohne Ball, 10× langsam, dann im Spieltempo.'},
    arm:{short:'Arm früher hoch.', tip:'Den Ball schon im vorletzten Schritt hochnehmen, damit der Ellbogen beim Absprung über der Schulter ist.', drill:'Ball über dem Kopf halten und nur Anlauf, Sprung und Landung üben, 10×.'},
    rot:{short: ws ? 'Mehr zum Tor aufdrehen.' : 'Mehr aus dem Rumpf drehen.',
      tip: ws ? `Als ${R?'Rechtshänder auf Rechtsaußen':'Linkshänder auf Linksaußen'} in der Luft deutlich zum Tor aufdrehen: Wurfschulter weit zurück, Rücklage nutzen, dann über die Schulter zum Tor werfen.`
              : 'Die Wurfschulter beim Absprung zurücknehmen und in der Luft die Schultern gegen die Hüfte zum Tor aufdrehen. Die Kraft kommt aus dem Rumpf.',
      drill:'Rotationswürfe mit dem Medizinball gegen die Wand, 3×10. Danach Sprungwürfe nur mit Fokus aufs Aufdrehen.'},
    jump:{short:'Knie hoch, höher springen.', tip:'Das Schwungbein-Knie aktiv nach oben ziehen und den letzten Schritt explosiv setzen.', drill:'Einbeinige Sprünge auf einen Kasten und Hopserlauf, 3×8 je Bein.'},
    steps:{short:'Drei Schritte, dann hoch.', tip:`Rhythmus: Ball fangen, drei Schritte (${R ? 'links, rechts, links' : 'rechts, links, rechts'}) und mit dem dritten abspringen.`, drill:'Dreischritt ohne Ball über Markierungen am Boden, 10×, dann mit Ball.'},
    peak:{short:'Im höchsten Punkt werfen.', tip:'Erst hochspringen, dann werfen: der Ball soll die Hand verlassen, wenn du oben bist, nicht im Steigen oder schon im Fallen.', drill:'Sprungwürfe über eine Zauberschnur in Hüfthöhe, 3×8.'},
    lean:{short:'Oberkörper aufrichten.', tip:'Nach dem Absprung den Oberkörper aufrichten, Wurfschulter zurück, Blick zum Ziel. Erst mit dem Abwurf nach vorn klappen, nicht schon in der Luft nach vorn fallen.', drill:'Sprungwürfe auf einen Weichboden: bewusst aufrecht in die Wurfauslage, dann werfen.'}
  };
}
