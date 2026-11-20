import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getAI, GoogleAIBackend, type AI } from 'firebase/ai';
import { appCheckSiteKey, firebaseConfig, isFirebaseConfigured } from '../config';

let app: FirebaseApp | null = null;
let ai: AI | null = null;

/**
 * Initialise Firebase (only when a real config is present) and the
 * Firebase AI Logic service on the Gemini Developer API backend.
 *
 * App Check: enforced by the AI Logic console workflow since July 2026.
 * - Production: pass a reCAPTCHA Enterprise site key via `appCheckSiteKey`.
 * - Local dev: set `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` before
 *   initializeAppCheck and register the debug token shown in the console
 *   under Security → App Check → Apps → Manage debug tokens.
 *   (https://firebase.google.com/docs/app-check/web/debug-provider)
 * Returns null when Firebase is not configured — the app then runs in
 * demo mode (see src/lib/demo.ts).
 */
export function getFirebaseAI(): AI | null {
  if (!isFirebaseConfigured()) return null;
  if (ai) return ai;

  app = initializeApp(firebaseConfig);

  if (appCheckSiteKey) {
    if (import.meta.env.DEV) {
      // Debug provider for local development (bypasses attestation while
      // App Check enforcement stays on). The token must be safelisted in
      // the Firebase console, otherwise requests are rejected.
      (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } else if (import.meta.env.DEV) {
    console.warn(
      '[ClipCraft] App Check is not configured (no reCAPTCHA Enterprise site key). ' +
        'Cloud calls will fail once App Check is enforced. See README.md.',
    );
  }

  ai = getAI(app, { backend: new GoogleAIBackend() });
  return ai;
}
