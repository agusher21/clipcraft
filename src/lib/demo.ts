/**
 * Demo generator — a local, template-based fallback used ONLY when Firebase
 * is not configured (see src/config.ts).
 *
 * This is NOT AI. It exists so the UI can be exercised end-to-end without
 * keys, and every result it produces is labelled "DEMO" in the UI. As soon
 * as a Firebase project is connected, the real Firebase AI Logic engine
 * (src/lib/ai.ts) takes over and this module is never called.
 */

import type { ClipPack } from './ai';

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with',
  'is', 'are', 'was', 'were', 'it', 'this', 'that', 'i', 'you', 'we', 'they',
  'my', 'your', 'his', 'her', 'our', 'their', 'at', 'by', 'from', 'as', 'be',
]);

function keywords(text: string, max = 6): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words) {
    if (!seen.has(w)) {
      seen.add(w);
      out.push(w);
      if (out.length >= max) break;
    }
  }
  return out;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function generateDemoPack(topic: string, transcript: string, niche: string): ClipPack {
  const keys = keywords(`${topic} ${transcript}`, 6);
  const k1 = titleCase(keys[0] ?? topic);
  const k2 = titleCase(keys[1] ?? 'Video');
  const k3 = titleCase(keys[2] ?? 'Guide');
  const nicheLabel = niche && niche !== 'General' ? ` for ${niche}` : '';

  return {
    titles: [
      `${k1} — The Truth Nobody Tells You${nicheLabel}`,
      `I Tried ${k1} So You Don't Have To`,
      `${k1} in 60 Seconds (${k2} Explained)`,
      `5 ${k2} Mistakes That Kill Your ${k3}`,
      `Why Everyone Is Wrong About ${k1}`,
    ],
    hooks: [
      `Stop scrolling — this ${k1.toLowerCase()} trick changes everything.`,
      `If you only watch one thing about ${k2.toLowerCase()} today, make it this.`,
      `I spent a week on ${k3.toLowerCase()} so you don't have to.`,
    ],
    hashtags: [
      ...keys.map((k) => k.replace(/-/g, '')),
      'creator',
      'youtube',
      'shorts',
      'gta6',
      'viral',
      'tips',
    ].slice(0, 10),
  };
}

export function demoThumbnailPrompt(title: string): string {
  return `DEMO thumbnail concept for "${title}": bold text, high contrast, one shocked face, 16:9. (Connect Firebase to generate a real thumbnail with cloud AI.)`;
}
