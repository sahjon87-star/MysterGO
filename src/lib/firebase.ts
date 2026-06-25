import { initializeApp } from "firebase/app";
import { 
  GoogleAuthProvider, 
  browserLocalPersistence, 
  indexedDBLocalPersistence,
  initializeAuth,
  getAuth
} from "firebase/auth";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";
import { getStorage } from "firebase/storage";

// Since firebase-applet-config.json might be deleted or absent, we define a safe fallback configuration
const firebaseAppletConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  firestoreDatabaseId: import.meta.env.VITE_FIRESTORE_DATABASE_ID || ""
};

// User's custom production/staging Firebase configuration (rajmistri-1)
const USER_CUSTOM_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBMcpr3SmsHgh6rYFlHoKHsK4JkIDJNiBY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "rajmistri-1.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://rajmistri-1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "rajmistri-1",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "rajmistri-1.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "331898998990",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:331898998990:web:79144c83397b99e9dfc09f"
};

// Permanent config as requested to ensure stability
const appletCfg = firebaseAppletConfig as any;
const FALLBACK_CONFIG = {
  apiKey: appletCfg.apiKey || USER_CUSTOM_CONFIG.apiKey,
  authDomain: appletCfg.authDomain || USER_CUSTOM_CONFIG.authDomain,
  databaseURL: appletCfg.databaseURL || USER_CUSTOM_CONFIG.databaseURL,
  projectId: appletCfg.projectId || USER_CUSTOM_CONFIG.projectId,
  storageBucket: appletCfg.storageBucket || USER_CUSTOM_CONFIG.storageBucket,
  messagingSenderId: appletCfg.messagingSenderId || USER_CUSTOM_CONFIG.messagingSenderId,
  appId: appletCfg.appId || USER_CUSTOM_CONFIG.appId,
  firestoreDatabaseId: appletCfg.firestoreDatabaseId || ""
};

// By default we prioritize the custom rajmistri-1 database provided by the user
const SELECTED_BASE_CONFIG = import.meta.env.VITE_USE_APPLET_CONFIG === "true" 
  ? FALLBACK_CONFIG 
  : USER_CUSTOM_CONFIG;

// Merge environment variables with base selection
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || SELECTED_BASE_CONFIG.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || SELECTED_BASE_CONFIG.authDomain,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || (SELECTED_BASE_CONFIG as any).databaseURL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || SELECTED_BASE_CONFIG.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || SELECTED_BASE_CONFIG.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || SELECTED_BASE_CONFIG.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || SELECTED_BASE_CONFIG.appId,
  firestoreDatabaseId: (firebaseAppletConfig as any).firestoreDatabaseId || ""
};

// Check if critical config is actually present
export const isConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.appId &&
  firebaseConfig.apiKey !== 'UNDEFINED'
);

if (!isConfigured) {
  console.warn("Firebase Configuration Missing! Please check your environment variables or firebase-applet-config.json.");
}

const app = initializeApp(isConfigured ? firebaseConfig : {
  apiKey: "AIza" + "0".repeat(35),
  authDomain: "unconfigured.firebaseapp.com",
  projectId: "unconfigured-project",
  storageBucket: "unconfigured.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
});

// Initialize Auth with explicit persistence for better stability, falling back defensively to standard getAuth if needed
let authInstance: any;
try {
  const persistences = [];
  if (typeof indexedDBLocalPersistence !== "undefined" && indexedDBLocalPersistence) {
    persistences.push(indexedDBLocalPersistence);
  }
  if (typeof browserLocalPersistence !== "undefined" && browserLocalPersistence) {
    persistences.push(browserLocalPersistence);
  }
  
  if (persistences.length > 0) {
    authInstance = initializeAuth(app, {
      persistence: persistences
    });
  } else {
    authInstance = getAuth(app);
  }
} catch (error) {
  console.warn("initializeAuth failed setup, falling back to basic getAuth:", error);
  authInstance = getAuth(app);
}

export const auth = authInstance;

// Use initializeFirestore with modern persistent cache, ensuring we don't pass an empty database ID
const cleanDbId = (firebaseConfig as any).firestoreDatabaseId && (firebaseConfig as any).firestoreDatabaseId.trim() !== ""
  ? (firebaseConfig as any).firestoreDatabaseId
  : undefined;

let firestoreInstance: any;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    experimentalForceLongPolling: true,
  }, cleanDbId);
} catch (error) {
  console.warn("initializeFirestore failed, falling back to default database initialization:", error);
  try {
    firestoreInstance = initializeFirestore(app, {
      localCache: memoryLocalCache(),
      experimentalForceLongPolling: true,
    });
  } catch (err) {
    console.error("Critical Firestore init failure:", err);
    // If it still fails, try once more with absolutely minimal settings
    firestoreInstance = initializeFirestore(app, {});
  }
}

export const db = firestoreInstance;

export const messaging = typeof window !== 'undefined' && isConfigured ? getMessaging(app) : null;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
let firebaseStorage: any = null;
try {
  firebaseStorage = getStorage(app);
} catch (e) {
  console.warn("Firebase Storage initialization skipped or unavailable:", e);
}
export { firebaseStorage as storage };
