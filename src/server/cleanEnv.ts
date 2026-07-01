import dotenv from "dotenv";
dotenv.config();

// Prevent firebase-admin initialization crash due to auto-reading invalid DATABASE_URL or FIREBASE_DATABASE_URL env vars
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("https://")) {
  console.log("[CleanEnv] Removing non-Firebase DATABASE_URL to prevent firebase-admin crash.");
  delete process.env.DATABASE_URL;
}
if (process.env.FIREBASE_DATABASE_URL && !process.env.FIREBASE_DATABASE_URL.startsWith("https://")) {
  console.log("[CleanEnv] Removing non-Firebase FIREBASE_DATABASE_URL to prevent firebase-admin crash.");
  delete process.env.FIREBASE_DATABASE_URL;
}
