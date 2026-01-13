export function uuid(){
  const a = crypto.getRandomValues(new Uint8Array(16));
  a[6] = (a[6] & 0x0f) | 0x40;
  a[8] = (a[8] & 0x3f) | 0x80;
  const hex = [...a].map(b => b.toString(16).padStart(2,"0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export function startOfDay(d){
  const x = new Date(d);
  x.setHours(0,0,0,0);
  return x;
}

export function dayKey(d){
  return startOfDay(d).toISOString().slice(0,10);
}

export function monthKey(d){
  return startOfDay(d).toISOString().slice(0,7);
}

export function addDays(d, n){
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function clamp(n, a, b){
  return Math.max(a, Math.min(b, n));
}

export function formatDate(d){
  const x = new Date(d);
  return x.toLocaleDateString(undefined, { weekday:"short", year:"numeric", month:"short", day:"numeric" });
}

export function formatShort(d){
  const x = new Date(d);
  return x.toLocaleDateString(undefined, { year:"numeric", month:"short", day:"numeric" });
}

export function minsToHHMM(mins){
  const h = String(Math.floor(mins/60)).padStart(2,"0");
  const m = String(mins%60).padStart(2,"0");
  return `${h}:${m}`;
}

export function hhmmToMins(hhmm){
  const [h,m] = String(hhmm || "09:00").split(":").map(Number);
  return clamp((h||0)*60 + (m||0), 0, 1439);
}

export function weekday1to7(d){
  const w = new Date(d).getDay(); // 0..6
  return w === 0 ? 1 : w+1; // Sun=1
}

export function weekStart(d, monday=true){
  const x = startOfDay(d);
  const js = x.getDay();
  const startJs = monday ? 1 : 0;
  let diff = js - startJs;
  if (diff < 0) diff += 7;
  x.setDate(x.getDate() - diff);
  return x;
}
