// Zugriff auf feste Seitenelemente und die Hinweis-Einblendung.

export const $ = s => document.querySelector(s);
export const video = $('#video'), canvas = $('#overlay'), ctx = canvas.getContext('2d');

let hintTimer = null;
export function showHint(t, ms){ const h=$('#hint'); h.textContent=t; h.style.display='block'; clearTimeout(hintTimer); if(ms) hintTimer=setTimeout(hideHint, ms); }
export function hideHint(){ $('#hint').style.display='none'; }
