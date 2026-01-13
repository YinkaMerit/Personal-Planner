// IndexedDB wrapper (offline-first). No dependencies.
const DB_NAME = "tee_personal_planner_db";
const DB_VERSION = 5;

const STORES = [
  "settings",
  "verse",
  "yearlyGoals",
  "quarterlyGoals",
  "monthlyGoals",
  "quarterlyRetros",
  "tasks",
  "timeBlocks",
  "dailyReviews",
  "transactions",
  "budgets",
  "contacts",
  "contactRules",
  "touchpoints",
  "biometrics",
  "workouts",
  "workoutSets",
  "prayers",
  "sermons",
  "diaryEntries"
];

function openDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      for (const s of STORES){
        if (!db.objectStoreNames.contains(s)){
          const store = db.createObjectStore(s, { keyPath: "id" });

          if (s === "tasks") store.createIndex("scheduledDate", "scheduledDate", { unique:false });
          if (s === "timeBlocks") store.createIndex("date", "date", { unique:false });
          if (s === "dailyReviews") store.createIndex("date", "date", { unique:true });
          if (s === "transactions") store.createIndex("date", "date", { unique:false });
          if (s === "budgets") store.createIndex("monthKey", "monthKey", { unique:false });
          if (s === "monthlyGoals") store.createIndex("monthKey", "monthKey", { unique:false });
          if (s === "contactRules") store.createIndex("contactId", "contactId", { unique:true });
          if (s === "touchpoints") store.createIndex("date", "date", { unique:false });
          if (s === "diaryEntries") store.createIndex("dateKey", "dateKey", { unique:false });
          if (s === "quarterlyRetros") store.createIndex("quarterlyGoalId", "quarterlyGoalId", { unique:true });
          if (s === "workoutSets") store.createIndex("workoutId", "workoutId", { unique:false });
        }
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function storeTx(db, store, mode="readonly"){
  return db.transaction(store, mode).objectStore(store);
}

export async function getAll(store){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const r = storeTx(db, store).getAll();
    r.onsuccess = () => resolve(r.result ?? []);
    r.onerror = () => reject(r.error);
  });
}

export async function put(store, obj){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const r = storeTx(db, store, "readwrite").put(obj);
    r.onsuccess = () => resolve(true);
    r.onerror = () => reject(r.error);
  });
}

export async function del(store, id){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const r = storeTx(db, store, "readwrite").delete(id);
    r.onsuccess = () => resolve(true);
    r.onerror = () => reject(r.error);
  });
}

export async function clear(store){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const r = storeTx(db, store, "readwrite").clear();
    r.onsuccess = () => resolve(true);
    r.onerror = () => reject(r.error);
  });
}

export async function exportAll(){
  const out = { __meta: { exportedAt: new Date().toISOString(), dbName: DB_NAME, version: DB_VERSION } };
  for (const s of STORES){
    out[s] = await getAll(s);
  }
  return out;
}

export async function importAll(data){
  for (const s of STORES){
    await clear(s);
    const items = Array.isArray(data[s]) ? data[s] : [];
    for (const obj of items) await put(s, obj);
  }
  return true;
}
