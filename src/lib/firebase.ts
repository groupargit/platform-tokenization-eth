import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getAnalytics, Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const requiredFields = ['apiKey', 'databaseURL', 'projectId'] as const;
const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

export const isFirebaseConfigured = missingFields.length === 0;

let app: FirebaseApp | null = null;
let database: Database | null = null;
let analytics: Analytics | null = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    
    database = getDatabase(app);
    
    analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
  }
} else {
  if (import.meta.env.DEV) {
    console.warn(
      `⚠️ some services are not configured.\n` +
      `\nThe application will continue to work, but some features will be disabled.`
    );
  }
}

export { database, analytics };
export default app;
