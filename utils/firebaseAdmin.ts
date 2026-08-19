import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import path from 'path';
import fs from 'fs';

function getFirebaseCredential() {
  // 1. Check for JSON string in environment variable (Ideal for Vercel)
  const envServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (envServiceAccount) {
    try {
      const parsed = JSON.parse(envServiceAccount);
      return cert(parsed);
    } catch (e) {
      console.warn('⚠️ Could not parse FIREBASE_SERVICE_ACCOUNT as JSON, checking fallback...');
    }
  }

  // 2. Check for individual environment variables (Vercel standard)
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    return cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    });
  }

  // 3. Check for local serviceAccountKey.json file (Local development)
  const serviceAccountPath = path.resolve(__dirname, '..', 'serviceAccountKey.json');
  if (fs.existsSync(serviceAccountPath)) {
    return cert(serviceAccountPath);
  }

  console.warn('⚠️ No Firebase Admin credentials found! Ensure FIREBASE_SERVICE_ACCOUNT is set in Vercel.');
  return undefined;
}

// Initialize Firebase Admin SDK (only if not already initialized)
if (!getApps().length) {
  const credential = getFirebaseCredential();
  if (credential) {
    initializeApp({
      credential,
    });
  } else {
    initializeApp();
  }
}

// Export Firestore and Auth instances
export const db = getFirestore();
export const auth = getAuth();
