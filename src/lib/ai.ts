/**
 * ClipCraft AI engine — Firebase AI Logic (Gemini Developer API backend).
 *
 * THE HYBRID SPLIT (this is the core of the app):
 * - Titles / hooks / hashtags run on the HYBRID model
 *   (`InferenceMode.PREFER_ON_DEVICE`): Gemini Nano on the user's device
 *   when available (Chrome desktop 139+), cloud Gemini otherwise. The
 *   response's `inferenceSource` (`ON_DEVICE` | `IN_CLOUD`) is read from
 *   the SDK and shown as a badge — never assumed.
 * - Thumbnail generation runs on the CLOUD-ONLY Nano Banana image model
 *   (`gemini-3.1-flash-image`): image generation is not supported
 *   on-device, so this is always labelled "Cloud".
 * - Trend & SEO analysis runs on the CLOUD-ONLY text model
 *   (`gemini-3.5-flash-lite`): multi-paragraph analysis exceeds what the
 *   on-device model is good at, so it is routed to the cloud by design.
 *
 * Docs:
 * - Hybrid web quickstart: https://firebase.google.com/docs/ai-logic/hybrid/web/get-started
 * - Inference source: https://firebase.google.com/docs/ai-logic/hybrid/web/configuration-options
 * - Nano Banana images: https://firebase.google.com/docs/ai-logic/generate-images-gemini
 * - App Check debug provider: https://firebase.google.com/docs/app-check/web/debug-provider
 */

import {
  getGenerativeModel,
  InferenceMode,
  ResponseModality,
  type GenerativeModel,
} from 'firebase/ai';
import { CLOUD_IMAGE_MODEL, CLOUD_TEXT_MODEL } from '../config';
import { getFirebaseAI } from './firebase';
import { generateDemoPack } from './demo';

export interface ClipPack {
  titles: string[];
  hooks: string[];
  hashtags: string[];
}

export type EngineSource = 'on-device' | 'cloud' | 'demo';

export interface PackResult {
  pack: ClipPack;
  source: EngineSource;
  /** Human-readable note, e.g. why the cloud fallback was used. */
  note?: string;
  /** True when the AI calls failed because AI Logic is not enabled in
   *  the Firebase project yet — the pack is local demo output. */
  aiLogicNotEnabled?: boolean;
}

/** Shown when AI Logic is not enabled in the project yet. */
export const AI_LOGIC_NOT_ENABLED_NOTE =
  'Firebase is connected, but AI Logic is not enabled in this project yet — ' +
  'enable it in the Firebase console (AI Services → AI Logic → Get started, ' +
  'Gemini Developer API). These results are local demo output.';

export const AI_LOGIC_NOT_ENABLED_ERROR =
  'Firebase AI Logic is not enabled in this project yet — enable it in the ' +
  'Firebase console (AI Services → AI Logic), then try again.';

/**
 * Detect the "API not enabled" failure (Google Cloud returns 403 with
 * "has not been used … before or it is disabled" when the Firebase AI
 * Logic / Generative Language API is not enabled in the project).
 * Only this error triggers the honest demo fallback — any other failure
 * (network, quota, bad input) still surfaces as a real error.
 */
export function isApiNotEnabledError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes('has not been used') || msg.includes('is disabled') || msg.includes('api not enabled')) {
    return true;
  }
  return (
    msg.includes('permission_denied') &&
    (msg.includes('firebaseailogic') || msg.includes('generativelanguage') || msg.includes('ai logic'))
  );
}

export interface GenerateInput {
  topic: string;
  niche: string;
  transcript: string;
}

export type OnDeviceStatus =
  | 'available'
  | 'downloading'
  | 'downloadable'
  | 'unavailable'
  | 'unsupported';

/** On-device Nano has a small context window — keep prompts short. */
const HYBRID_MAX_CHARS = 3000;
const CLOUD_MAX_CHARS = 8000;

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

/** Probe Chrome's built-in Prompt API (Gemini Nano) availability. */
export async function probeOnDevice(): Promise<OnDeviceStatus> {
  try {
    if (typeof LanguageModel === 'undefined') return 'unsupported';
    const status = await LanguageModel.availability();
    return status;
  } catch {
    return 'unsupported';
  }
}

function buildPackPrompt(input: GenerateInput): string {
  const excerpt = truncate(input.transcript, HYBRID_MAX_CHARS);
  return [
    'You are ClipCraft, an assistant for YouTube and Shorts creators.',
    `Video topic: ${input.topic}`,
    `Niche: ${input.niche}`,
    excerpt
      ? `Transcript excerpt:\n${excerpt}`
      : 'No transcript was provided — base everything on the topic.',
    '',
    'Return ONLY a JSON object with exactly this shape (no markdown, no extra text):',
    '{"titles": ["...", "...", "...", "...", "..."], "hooks": ["...", "...", "..."], "hashtags": ["...", "..."]}',
    'Rules:',
    '- titles: exactly 5, punchy, under 60 characters, curiosity-driven, no clickbait lies.',
    '- hooks: exactly 3, spoken first-3-seconds lines that stop the scroll.',
    '- hashtags: exactly 10, lowercase, no "#" symbol, mix of niche and broad tags.',
  ].join('\n');
}

function parsePack(text: string): ClipPack | null {
  try {
    // Strip markdown fences if the model wrapped the JSON.
    const json = text.replace(/```json|```/g, '').trim();
    const start = json.indexOf('{');
    const end = json.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    const parsed = JSON.parse(json.slice(start, end + 1)) as Partial<ClipPack>;
    if (
      !Array.isArray(parsed.titles) ||
      !Array.isArray(parsed.hooks) ||
      !Array.isArray(parsed.hashtags)
    ) {
      return null;
    }
    return {
      titles: parsed.titles.filter((t): t is string => typeof t === 'string').slice(0, 5),
      hooks: parsed.hooks.filter((t): t is string => typeof t === 'string').slice(0, 3),
      hashtags: parsed.hashtags
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.replace(/^#/, '').toLowerCase())
        .slice(0, 10),
    };
  } catch {
    return null;
  }
}

function sourceFromResponse(response: { inferenceSource?: string }): EngineSource {
  return response.inferenceSource === 'ON_DEVICE' ? 'on-device' : 'cloud';
}

/**
 * Generate titles, hooks and hashtags.
 * Hybrid path first (on-device Nano, cloud fallback via the SDK). If the
 * hybrid call itself throws (e.g. Nano rejects the input as too large —
 * PREFER_ON_DEVICE does not catch QuotaExceededError on its own), retry
 * explicitly on the cloud-only model and say so in the note.
 */
export async function generatePack(
  input: GenerateInput,
  onDeviceProgress?: (fraction: number) => void,
): Promise<PackResult> {
  const ai = getFirebaseAI();
  if (!ai) {
    return { pack: generateDemoPack(input.topic, input.transcript, input.niche), source: 'demo' };
  }

  const prompt = buildPackPrompt(input);
  const hybrid: GenerativeModel = getGenerativeModel(ai, {
    mode: InferenceMode.PREFER_ON_DEVICE,
    generationConfig: { responseMimeType: 'application/json' },
  });

  try {
    // Must be called after/on a user interaction (the Generate click) and
    // before any generateContent call. Starts the Nano download if needed.
    await hybrid.initializeDeviceModel((fraction) => onDeviceProgress?.(fraction));

    const result = await hybrid.generateContent(prompt);
    const text = result.response.text();
    const pack = parsePack(text);
    if (!pack) throw new Error('Model returned unparseable output.');
    return { pack, source: sourceFromResponse(result.response) };
  } catch (err) {
    // Explicit cloud retry — the badge must reflect where the answer
    // actually came from.
    try {
      const cloud = getGenerativeModel(ai, {
        model: CLOUD_TEXT_MODEL,
        generationConfig: { responseMimeType: 'application/json' },
      });
      const cloudPrompt = buildPackPrompt({
        ...input,
        transcript: truncate(input.transcript, CLOUD_MAX_CHARS),
      });
      const result = await cloud.generateContent(cloudPrompt);
      const pack = parsePack(result.response.text());
      if (!pack) throw err;
      return {
        pack,
        source: 'cloud',
        note:
          'On-device generation failed (' +
          (err instanceof Error ? err.message : 'unknown error') +
          '), so Firebase AI Logic answered in the cloud instead.',
      };
    } catch (cloudErr) {
      // AI Logic not enabled in the project yet: fall back to clearly
      // labelled local demo output instead of a raw API error.
      if (isApiNotEnabledError(cloudErr) || isApiNotEnabledError(err)) {
        return {
          pack: generateDemoPack(input.topic, input.transcript, input.niche),
          source: 'demo',
          aiLogicNotEnabled: true,
          note: AI_LOGIC_NOT_ENABLED_NOTE,
        };
      }
      throw cloudErr;
    }
  }
}

export interface ThumbnailResult {
  imageUrl: string | null;
  /** The prompt that was sent (shown so the user can iterate on it). */
  prompt: string;
  error?: string;
}

/** Thumbnail image generation — cloud-only by design (Nano Banana). */
export async function generateThumbnail(title: string, topic: string): Promise<ThumbnailResult> {
  const ai = getFirebaseAI();
  const prompt =
    `YouTube thumbnail, 16:9, bold and high-contrast, for a video titled "${title}" ` +
    `about ${topic}. One expressive face on the right, large readable text on the left, ` +
    `vibrant colours, no watermark.`;
  if (!ai) {
    return { imageUrl: null, prompt, error: 'Firebase is not connected yet — connect it to generate a real thumbnail.' };
  }

  const imageModel = getGenerativeModel(ai, {
    model: CLOUD_IMAGE_MODEL,
    generationConfig: { responseModalities: [ResponseModality.TEXT, ResponseModality.IMAGE] },
  });
  let result;
  try {
    result = await imageModel.generateContent(prompt);
  } catch (err) {
    if (isApiNotEnabledError(err)) {
      return { imageUrl: null, prompt, error: AI_LOGIC_NOT_ENABLED_ERROR };
    }
    throw err;
  }
  const parts = result.response.inlineDataParts() ?? [];
  const imagePart = parts.find((p) => p.inlineData.mimeType.startsWith('image/'));
  if (!imagePart) {
    return { imageUrl: null, prompt, error: 'The cloud model did not return an image. Try again.' };
  }
  return {
    imageUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
    prompt,
  };
}

export interface TrendResult {
  text: string;
  error?: string;
}

/** Trend & SEO analysis — cloud-only by design (long-form analysis). */
export async function analyzeTrends(input: GenerateInput, pack: ClipPack): Promise<TrendResult> {
  const ai = getFirebaseAI();
  if (!ai) {
    return {
      text: '',
      error: 'Firebase is not connected yet — connect it to run the cloud trend analysis.',
    };
  }
  const cloud = getGenerativeModel(ai, { model: CLOUD_TEXT_MODEL });
  const prompt = [
    'You are ClipCraft, an assistant for YouTube and Shorts creators.',
    `Video topic: ${input.topic} (niche: ${input.niche}).`,
    `Working titles: ${pack.titles.join(' | ')}`,
    `Hashtags: ${pack.hashtags.join(', ')}.`,
    truncate(input.transcript, CLOUD_MAX_CHARS)
      ? `Transcript excerpt:\n${truncate(input.transcript, CLOUD_MAX_CHARS)}`
      : '',
    '',
    'Write a short trend & SEO analysis (max 180 words, plain text, short paragraphs):',
    '1. Which title is strongest for click-through and why (1-2 sentences).',
    '2. Two search phrases viewers would actually type to find this video.',
    '3. One trend angle or related topic worth a follow-up video.',
  ].join('\n');
  try {
    const result = await cloud.generateContent(prompt);
    return { text: result.response.text() };
  } catch (err) {
    if (isApiNotEnabledError(err)) {
      return { text: '', error: AI_LOGIC_NOT_ENABLED_ERROR };
    }
    throw err;
  }
}
