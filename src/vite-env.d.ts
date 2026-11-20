/// <reference types="vite/client" />

/**
 * Chrome's built-in Prompt API (Gemini Nano) is not in TypeScript's DOM lib yet.
 * Declared here so the on-device availability probe type-checks.
 * Docs: https://developer.chrome.com/docs/ai/prompt-api
 */
declare global {
  interface LanguageModelSession {
    prompt(input: string): Promise<string>;
  }
  interface LanguageModelExpectedInput {
    type: string;
    languages?: string[];
  }
  interface LanguageModelAvailabilityOptions {
    expectedInputs?: LanguageModelExpectedInput[];
    expectedOutputs?: LanguageModelExpectedInput[];
  }
  interface LanguageModelAvailability {
    availability(
      options?: LanguageModelAvailabilityOptions,
    ): Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>;
    create(): Promise<LanguageModelSession>;
  }
  var LanguageModel: LanguageModelAvailability | undefined;
}

export {};
