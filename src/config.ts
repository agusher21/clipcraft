/**
 * ClipCraft configuration.
 *
 * Firebase project wired 20 Nov 2026: "ClipCraft", project ID
 * `clipcraft-63f49` (Spark/free plan, Analytics off), web app
 * "ClipCraft Web" registered. This is the public WEB client config —
 * it is designed to be embedded in client code (the apiKey is a public
 * identifier, not a secret). Never add service-account keys here.
 *
 * Still pending: enabling AI Logic in the console (Console → AI Services
 * → AI Logic → Get started → "Gemini Developer API" provider). Until
 * that is done, generation calls fail with an "API not enabled" error
 * and the app falls back to clearly-labelled local demo output
 * (see src/lib/ai.ts: isApiNotEnabledError).
 *
 * App Check: NOT enforced — no reCAPTCHA Enterprise site key is set
 * (enforcement decision still pending). The debug-token path in
 * src/lib/firebase.ts activates automatically in dev mode when a site
 * key is added; see README.md.
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
  apiKey: 'AIzaSyCacbt24X0AV8CDhngDylXquv7H45QnSuc',
  authDomain: 'clipcraft-63f49.firebaseapp.com',
  projectId: 'clipcraft-63f49',
  storageBucket: 'clipcraft-63f49.firebasestorage.app',
  messagingSenderId: '78926681484',
  appId: '1:78926681484:web:b64c7b166509c47e3872a9',
};

/** reCAPTCHA Enterprise site key for App Check. Leave empty to skip App Check. */
export const appCheckSiteKey = '6Lc_likuAAAAAMUlXUwkOgUGU_Ke9MtFNDuPeLvx';

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
