import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const targetProjectId = process.env.FIREBASE_PROJECT_ID || '';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || (targetProjectId ? `${targetProjectId}.firebaseapp.com` : ''),
  projectId: targetProjectId,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || (targetProjectId ? `${targetProjectId}.appspot.com` : ''),
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.FIREBASE_APP_ID || '',
};

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const clientAuth = getAuth(firebaseApp);
export default firebaseApp;
