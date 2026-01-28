// Firebase Realtime Database Sync Module
// Enables sharing your planner with another person (partner/family)

let firebaseApp = null;
let firebaseDb = null;
let syncEnabled = false;
let myUserId = null;
let partnerId = null;
let partnerListener = null;
let partnerData = null;
let onPartnerUpdate = null;

// Stores to sync (schedule-related only for privacy)
const SYNC_STORES = [
  "tasks",
  "timeBlocks",
  "yearlyGoals",
  "quarterlyGoals",
  "monthlyGoals"
];

// Initialize Firebase with user's config
export async function initFirebase(config) {
  if (!config || !config.apiKey || !config.databaseURL) {
    console.log("Firebase config incomplete");
    return false;
  }
  
  try {
    // Dynamically load Firebase SDK
    if (!window.firebase) {
      await loadFirebaseSDK();
    }
    
    // Initialize app if not already
    if (!firebaseApp) {
      firebaseApp = firebase.initializeApp(config, 'tee-planner-sync');
      firebaseDb = firebase.database(firebaseApp);
    }
    
    return true;
  } catch (e) {
    console.error("Firebase init error:", e);
    return false;
  }
}

// Load Firebase SDK dynamically
function loadFirebaseSDK() {
  return new Promise((resolve, reject) => {
    if (window.firebase) {
      resolve();
      return;
    }
    
    const script1 = document.createElement('script');
    script1.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
    script1.onload = () => {
      const script2 = document.createElement('script');
      script2.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js';
      script2.onload = resolve;
      script2.onerror = reject;
      document.head.appendChild(script2);
    };
    script1.onerror = reject;
    document.head.appendChild(script1);
  });
}

// Generate a unique user ID or get existing one
export function getOrCreateUserId() {
  let id = localStorage.getItem('tee_planner_user_id');
  if (!id) {
    id = 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('tee_planner_user_id', id);
  }
  return id;
}

// Generate a simple shareable code from user ID
export function generateShareCode(userId) {
  // Create a short, easy to share code
  const hash = userId.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  return Math.abs(hash).toString(36).toUpperCase().substr(0, 6);
}

// Get user ID from share code (stored mapping in Firebase)
export async function getUserIdFromCode(code) {
  if (!firebaseDb) return null;
  
  try {
    const snapshot = await firebaseDb.ref(`shareCodes/${code.toUpperCase()}`).once('value');
    return snapshot.val();
  } catch (e) {
    console.error("Error getting user from code:", e);
    return null;
  }
}

// Register your share code
export async function registerShareCode(userId) {
  if (!firebaseDb) return null;
  
  const code = generateShareCode(userId);
  try {
    await firebaseDb.ref(`shareCodes/${code}`).set(userId);
    return code;
  } catch (e) {
    console.error("Error registering share code:", e);
    return null;
  }
}

// Upload your data to Firebase
export async function uploadMyData(userId, data) {
  if (!firebaseDb || !userId) return false;
  
  try {
    const syncData = {};
    for (const store of SYNC_STORES) {
      if (data[store]) {
        syncData[store] = data[store];
      }
    }
    syncData.lastUpdated = Date.now();
    syncData.displayName = data.displayName || 'Partner';
    
    await firebaseDb.ref(`users/${userId}`).set(syncData);
    return true;
  } catch (e) {
    console.error("Upload error:", e);
    return false;
  }
}

// Subscribe to partner's data
export function subscribeToPartner(partnerUserId, callback) {
  if (!firebaseDb || !partnerUserId) return false;
  
  // Unsubscribe from previous partner
  if (partnerListener) {
    firebaseDb.ref(`users/${partnerId}`).off('value', partnerListener);
  }
  
  partnerId = partnerUserId;
  onPartnerUpdate = callback;
  
  partnerListener = firebaseDb.ref(`users/${partnerUserId}`).on('value', (snapshot) => {
    partnerData = snapshot.val();
    if (onPartnerUpdate && partnerData) {
      onPartnerUpdate(partnerData);
    }
  });
  
  return true;
}

// Unsubscribe from partner
export function unsubscribeFromPartner() {
  if (firebaseDb && partnerId && partnerListener) {
    firebaseDb.ref(`users/${partnerId}`).off('value', partnerListener);
  }
  partnerId = null;
  partnerListener = null;
  partnerData = null;
  onPartnerUpdate = null;
}

// Get partner's current data
export function getPartnerData() {
  return partnerData;
}

// Check if sync is active
export function isSyncEnabled() {
  return syncEnabled && firebaseDb !== null;
}

// Enable sync
export function enableSync(userId) {
  myUserId = userId;
  syncEnabled = true;
}

// Disable sync
export function disableSync() {
  unsubscribeFromPartner();
  syncEnabled = false;
  myUserId = null;
}

// Get sync status
export function getSyncStatus() {
  return {
    enabled: syncEnabled,
    myUserId,
    partnerId,
    hasPartnerData: partnerData !== null,
    partnerName: partnerData?.displayName || null,
    partnerLastUpdated: partnerData?.lastUpdated || null
  };
}
