/// <reference types="vite/client" />

/**
 * Chrome's built-in Prompt API (Gemini Nano) is not in TypeScript's DOM lib yet.
 * Declared here so the on-device availability probe type-checks.
 * Docs: https://developer.chrome.com/docs/ai/prompt-api
 */
declare global {
  interface LanguageModelAvailability {
    availability(): Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>;
  }
  var LanguageModel: LanguageModelAvailability | undefined;
}

export {};
