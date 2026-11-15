// Partner sync: share your schedule with one other planner.
// Both planners enter the same pairing code. Each uploads a copy of its schedule to a small
// Cloudflare Worker (cloudflare/partner-sync) and reads the other's. Only a hash of the code
// leaves the phone, and only the stores listed below are shared.

const SYNC_URL = "https://tees-planner-sync.yinkadev.workers.dev";
const CFG_KEY = "tpp_sync";
const PARTNER_KEY = "tpp_sync_partner";

// Stores to sync (schedule-related only for privacy)
export const SYNC_STORES = [
  "tasks",
  "timeBlocks",
  "yearlyGoals",
  "quarterlyGoals",
  "monthlyGoals"
];

let partnerData = null;
let lastUploaded = "";   // JSON of the last copy sent, to skip uploads when nothing changed
let lastError = "";

try{ partnerData = JSON.parse(localStorage.getItem(PARTNER_KEY) || "null"); }catch(_){}

// { code, name, at } - the pairing code is kept out of the planner's database so it never ends up in a backup file
export function syncConfig(){
  try{
    const c = JSON.parse(localStorage.getItem(CFG_KEY) || "null") || {};
    return { code: c.code || "", name: c.name || "", at: c.at || 0 };
  }catch(_){
    return { code: "", name: "", at: 0 };
  }
}

export function setSyncConfig(cfg){
  try{ localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); }catch(_){}
}

// Switch sync off and remove this planner's copy from the sync service
export async function disconnect(){
  const cfg = syncConfig();
  if (cfg.code){
    try{ await fetch(`${SYNC_URL}/v1/pair/${await pairHash(cfg.code)}/${getOrCreateUserId()}`, { method: "DELETE" }); }catch(_){}
  }
  try{ localStorage.removeItem(CFG_KEY); localStorage.removeItem(PARTNER_KEY); }catch(_){}
  partnerData = null;
  lastUploaded = "";
  lastError = "";
}

export function isSyncEnabled(){
  return !!syncConfig().code;
}

// Generate a unique id for this planner or get the existing one
export function getOrCreateUserId(){
  let id = localStorage.getItem("tee_planner_user_id");
  if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)){
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    id = "user_" + [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem("tee_planner_user_id", id);
  }
  return id;
}

// A new pairing code, e.g. K7QM-3XWD-9FHT. No 0/O or 1/I so it is easy to read out.
export function newPairCode(){
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = [...bytes].map(b => alphabet[b % alphabet.length]);
  return [chars.slice(0,4), chars.slice(4,8), chars.slice(8,12)].map(g => g.join("")).join("-");
}

export function normalizeCode(code){
  return String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function pairHash(code){
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("tees-planner:" + normalizeCode(code)));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// Upload this planner's copy. `data` is the output of exportAll(). Returns { ok, error? }.
export async function upload(data, { force = false, keepalive = false } = {}){
  const cfg = syncConfig();
  if (!cfg.code) return { ok: false, error: "not_set_up" };

  const copy = { displayName: cfg.name || "Partner" };
  for (const store of SYNC_STORES) copy[store] = Array.isArray(data[store]) ? data[store] : [];
  const fingerprint = JSON.stringify(copy);
  if (!force && fingerprint === lastUploaded) return { ok: true, skipped: true };
  copy.lastUpdated = Date.now();

  try{
    const res = await fetch(`${SYNC_URL}/v1/pair/${await pairHash(cfg.code)}/${getOrCreateUserId()}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(copy),
      keepalive
    });
    if (res.status === 409){ lastError = "That code is already used by two other planners. Create a new one."; return { ok: false, error: "pair_full" }; }
    if (!res.ok){ lastError = "Couldn't reach the sync service."; return { ok: false, error: "http_" + res.status }; }
    lastUploaded = fingerprint;
    lastError = "";
    setSyncConfig({ ...cfg, at: Date.now() });
    return { ok: true, ...(await res.json()) };
  }catch(_){
    lastError = navigator.onLine === false ? "Offline. Your changes will be shared when you're back online." : "Couldn't reach the sync service.";
    return { ok: false, error: "network" };
  }
}

// Fetch the partner's latest copy. Returns true when it changed.
export async function fetchPartner(){
  const cfg = syncConfig();
  if (!cfg.code) return false;
  try{
    const res = await fetch(`${SYNC_URL}/v1/pair/${await pairHash(cfg.code)}?me=${getOrCreateUserId()}`);
    if (!res.ok) return false;
    const { partner } = await res.json();
    const changed = JSON.stringify(partner) !== JSON.stringify(partnerData);
    partnerData = partner || null;
    try{ localStorage.setItem(PARTNER_KEY, JSON.stringify(partnerData)); }catch(_){}
    return changed;
  }catch(_){
    return false;
  }
}

// Partner's current data (last fetched copy; kept for offline)
export function getPartnerData(){
  return partnerData;
}

export function getSyncStatus(){
  const cfg = syncConfig();
  return {
    enabled: !!cfg.code,
    lastUploadedAt: cfg.at || null,
    hasPartnerData: partnerData !== null,
    partnerName: partnerData?.displayName || null,
    partnerLastUpdated: partnerData?.lastUpdated || null,
    error: lastError
  };
}
