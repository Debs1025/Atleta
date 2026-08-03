import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import path from 'path';

// Load service account key
const serviceAccountPath = path.resolve(__dirname, '..', 'serviceAccountKey.json');

// Initialize Firebase Admin SDK (only if not already initialized)
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccountPath),
  });
}

// Export Firestore and Auth instances
export const db = getFirestore();
export const auth = getAuth();
