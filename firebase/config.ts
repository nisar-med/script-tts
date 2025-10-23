import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

// Load Firebase configuration from environment variables.
// This application runs in an environment where `process.env` variables are
// substituted at build time. These keys are visible in the client-side code,
// which is standard and secure for Firebase client-side SDKs.
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// A check to see if the environment variables are populated and not placeholders.
export const isFirebaseConfigured =
    firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('YOUR_');

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
    } catch (e) {
        console.error("Error initializing Firebase. Please check your configuration.", e);
    }
} else {
    console.warn("Firebase is not configured. Please create a .env file with your Firebase project configuration to enable authentication.");
}

// Export auth, which will be null if not configured. The app will handle this gracefully.
export { auth };