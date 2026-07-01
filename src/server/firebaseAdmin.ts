import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import dotenv from "dotenv";

dotenv.config();

let adminApp: any = null;

export function getAdminApp() {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApp();
    return adminApp;
  }

  // Prevent firebase-admin initialization crash due to auto-reading invalid DATABASE_URL or FIREBASE_DATABASE_URL env vars
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("https://")) {
    delete process.env.DATABASE_URL;
  }
  if (process.env.FIREBASE_DATABASE_URL && !process.env.FIREBASE_DATABASE_URL.startsWith("https://")) {
    delete process.env.FIREBASE_DATABASE_URL;
  }

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "rajmistri-1";
  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      credential = cert(serviceAccount);
    } catch (e) {
      console.warn("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY");
    }
  }

  adminApp = initializeApp({
    projectId: projectId,
    ...(credential ? { credential } : {})
  });
  return adminApp;
}

export function getDbAdmin() {
  const app = getAdminApp();
  const databaseId = process.env.VITE_FIRESTORE_DATABASE_ID || process.env.FIRESTORE_DATABASE_ID;
  const cleanDbId = (databaseId && databaseId.trim() !== "" && databaseId !== "undefined" && databaseId !== "null") ? databaseId.trim() : null;
  return cleanDbId ? getFirestore(app, cleanDbId) : getFirestore(app);
}

export function getAuthAdmin() {
  return getAuth(getAdminApp());
}

export { FieldValue };
