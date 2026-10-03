// Wurf-Video ansehen: Zeitlupe (0,5× / 0,25×), Endlosschleife, Speichern/Teilen.
import { log, store } from '../store.js';
import { $, showHint } from '../dom.js';
import { getClip } from '../clips.js';
import { openSheet } from './sheets.js';

const vid = $('#clipVideo');
let url = null, cur = null;

export async function openClip(en){
  let blob = null; try{ blob = await getClip(en.time); }catch(e){}
  if(!blob){ en.clip = false; store(); showHint('Video nicht mehr gespeichert (es bleiben nur die letzten 60)', 3000); return; }
  close(); cur = {en, blob}; url = URL.createObjectURL(blob);
  $('#clipTitle').textContent = `Wurf ${en.nr}${en.target ? ', ' + en.target : ''}`;
  vid.src = url; openSheet('#clipSheet'); setRate(0.5); vid.play().catch(() => {});
}
function close(){ vid.pause(); vid.removeAttribute('src'); vid.load(); if(url) URL.revokeObjectURL(url); url = null; }
function setRate(r){ vid.playbackRate = r; vid.defaultPlaybackRate = r; document.querySelectorAll('.clipbar [data-r]').forEach(b => b.classList.toggle('on', +b.dataset.r === r)); }

async function save(){
  const {en, blob} = cur, ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
  const name = `Wurf-${en.nr}-${new Date(en.time).toISOString().slice(0,10)}.${ext}`, file = new File([blob], name, {type: blob.type});
  try{ if(navigator.canShare?.({files:[file]})){ await navigator.share({files:[file], title:name}); return; } }catch(e){ if(e.name==='AbortError') return; }
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
}

export function initClipView(){
  $('#clipSheet').addEventListener('click', e => {
    const s = $('#clipSheet');
    if(e.target===s || e.target.hasAttribute('data-close')) close();
    else if(e.target.dataset.r) setRate(+e.target.dataset.r);
  });
  $('#clipSave').onclick = save;
  $('#logBody').addEventListener('click', e => {
    const k = e.target.closest('[data-clip]')?.dataset.clip; if(!k) return;
    const en = log.find(x => x.time === +k); if(en) openClip(en);
  });
}
