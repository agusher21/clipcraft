/**
 * ClipCraft configuration.
 *
 * Firebase is intentionally NOT configured in this scaffold: creating the
 * Firebase project needs Toni's Google sign-in in the Firebase console.
 *
 * To connect the real AI:
 *   1. Create a Firebase project at https://console.firebase.google.com
 *   2. Console → AI Services → AI Logic → Get started → choose the
 *      "Gemini Developer API" provider (free to start) and finish the
 *      guided workflow (it enforces Firebase App Check).
 *   3. Register a Web app in the project and paste its config below.
 *   4. (Optional) In App Check, register a reCAPTCHA Enterprise key and
 *      paste its site key into `appCheckSiteKey` below. For local dev,
 *      register a debug token instead — see README.md.
 */

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export const firebaseConfig: FirebaseWebConfig = {
  // TODO(developer): replace with your Firebase project's web config.
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.firebasestorage.app',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

/** reCAPTCHA Enterprise site key for App Check. Leave empty to skip App Check. */
export const appCheckSiteKey = '';

/**
 * Cloud models (Gemini Developer API backend).
 * - Text: the default cloud fallback for hybrid mode is gemini-3.5-flash-lite
 *   (Firebase JS SDK v13.0.0+). We name it explicitly so the cloud path is
 *   deterministic on any SDK version.
 * - Image: Nano Banana image model for thumbnail generation (cloud-only;
 *   image generation is NOT supported on-device — see README.md).
 */
export const CLOUD_TEXT_MODEL = 'gemini-3.5-flash-lite';
export const CLOUD_IMAGE_MODEL = 'gemini-3.1-flash-image';

export function isFirebaseConfigured(): boolean {
  return (
    firebaseConfig.apiKey !== 'YOUR_API_KEY' &&
    firebaseConfig.projectId !== 'YOUR_PROJECT_ID' &&
    firebaseConfig.appId !== 'YOUR_APP_ID'
  );
}
