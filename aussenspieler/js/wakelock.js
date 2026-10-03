// Bildschirm während des Trainings wach halten.

let wake = null;
export async function keepAwake(){ try{ wake = await navigator.wakeLock?.request('screen'); }catch(e){} }
export function releaseWake(){ try{ wake?.release(); }catch(e){} wake=null; }
