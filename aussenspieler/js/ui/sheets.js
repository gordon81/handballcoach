// Ausklapp-Fenster öffnen; schließen per ✕ oder Tippen auf den dunklen Rand.
import { $ } from '../dom.js';

export function openSheet(id){ $(id).hidden = false; }
export function initSheets(){
  document.querySelectorAll('.sheet').forEach(s => {
    s.addEventListener('click', e => { if(e.target===s || e.target.hasAttribute('data-close')) s.hidden = true; });
  });
}
