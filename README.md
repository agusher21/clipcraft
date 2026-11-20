# ClipCraft — Hybrid AI for Video Creators

> **#BuildHybridAI 2026 entry** (Devpost, $30,000) — build a Gen AI app that runs
> AI on-device when it can and falls back to the cloud when it needs to, with
> Firebase AI Logic.
>
> Submission deadline: **1 Dec 2026, 05:00 WIB** · Judging 11–17 Dec 2026 ·
> Winners ~22 Dec 2026 · Devpost: https://firebasehybridaihackathon.devpost.com/

**What it does:** paste a video transcript (or just a topic) and ClipCraft
generates 5 titles, 3 hooks and 10 hashtags — **on your device** with Gemini
Nano — then generates a thumbnail and a trend & SEO analysis **in the cloud**
with Gemini. Every result shows where it actually ran: `On-device · Gemini
Nano` or `Cloud · Gemini`.

## The hybrid split (the core of the app)

| Feature | Engine | Why |
| --- | --- | --- |
| Titles, hooks, hashtags | Hybrid — `InferenceMode.PREFER_ON_DEVICE` (Gemini Nano on-device, cloud Gemini fallback) | Fast, private, free, works offline |
| Thumbnail (Nano Banana image) | Cloud-only — `gemini-3.1-flash-image` | Image generation is **not supported on-device** |
| Trend & SEO analysis | Cloud-only — `gemini-3.5-flash-lite` | Long-form analysis exceeds what Nano is built for |

The badge on every result comes from the SDK's `inferenceSource`
(`ON_DEVICE` | `IN_CLOUD`) — never assumed. If the on-device call fails
(e.g. Nano rejects the input as too large), the app retries explicitly on the
cloud model and says so in the UI.

## Tech

- Vite + React 19 + TypeScript
- Firebase AI Logic JS SDK (`firebase/ai`, SDK v12.5.0+ — on-device
  inference requires it): `getAI`, `getGenerativeModel`, `GoogleAIBackend`,
  `InferenceMode`, `initializeDeviceModel()`, `generateContent()`,
  `response.inferenceSource`
- Firebase App Check (enforced by the AI Logic console workflow since
  July 2026) with debug-provider support for local development

## Getting started

```bash
npm install
npm run dev     # local dev server
npm run build   # type-check + production build
```

### 1. Firebase project — DONE 20 Nov 2026 (project `clipcraft-63f49`, Spark/free plan)

1. [x] Project created at https://console.firebase.google.com ("ClipCraft",
   project ID `clipcraft-63f49`, Analytics off).
2. [ ] Console → **AI Services → AI Logic → Get started** → choose the
   **Gemini Developer API** provider (free to start) and finish the guided
   workflow. **PENDING — until this is done, generation calls fail with an
   "API not enabled" error and the app falls back to clearly-labelled
   local demo output (see `src/lib/ai.ts: isApiNotEnabledError`).**
3. [x] Web app "ClipCraft Web" registered; its config is wired into
   `src/config.ts` (public web client config — apiKey is a public
   identifier, never a service-account key).
4. (Optional, for production) In **Security → App Check**, register a
   reCAPTCHA Enterprise key, add your domains, and paste its site key into
   `appCheckSiteKey` in `src/config.ts`. **NOT enforced — enforcement
   decision still pending; the debug-token path activates automatically
   in dev mode when a site key is set.**
5. (Local dev) Set `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` before
   App Check initialises (the scaffold does this automatically in dev mode
   when a site key is set), copy the debug token from the browser console,
   and register it under **Security → App Check → Apps → Manage debug
   tokens** in the Firebase console.

Without a Firebase config the app runs in **demo mode**: the full UI works
with a local template generator, and every result is labelled `Demo · no AI
connected`. The same demo fallback now also applies when Firebase is
connected but AI Logic is not enabled yet — the status bar then shows
`Firebase connected` + `AI Logic: not enabled yet`, and results are
labelled `Demo` with a note explaining how to enable it. No keys are ever
committed to this repo beyond the public web client config.

### 2. On-device model (Gemini Nano)

On-device inference works on **Chrome desktop 139+** only, and the model
must be downloaded once:

1. Enable `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`.
2. Restart Chrome, open DevTools → Console, run
   `await LanguageModel.availability()` — it should report `available`,
   `downloading` or `downloadable`.
3. If `downloadable`, run `await LanguageModel.create()` to start the
   download (needs disk space).

ClipCraft calls `model.initializeDeviceModel()` on the Generate click (it
must run after a user interaction) and shows the download progress on the
button. On any other browser the app labels results as cloud — nothing
pretends to be local.

### 3. Google Account Quota (optional, for cloud features)

The hackathon offers a Google Account Quota for cloud features like image
generation. Sprint 3 (final): request by **Wed 25 Nov, 10:00 PT**
(26 Nov 01:00 WIB) via https://forms.gle/uPcDhaYW3iVo2AYw5 — account sent
Fri 27 Nov, valid 4 days, requires photo ID + selfie verification. Sprint 2
already closed (18 Nov). Without a quota, stay on-device / within free text
inference limits.

## Verified API surface (read 20 Nov 2026)

- Hybrid web quickstart — https://firebase.google.com/docs/ai-logic/hybrid/web/get-started
- Hybrid config (inference modes, `inferenceSource`, default cloud model) —
  https://firebase.google.com/docs/ai-logic/hybrid/web/configuration-options
- Nano Banana image generation — https://firebase.google.com/docs/ai-logic/generate-images-gemini
- App Check debug provider — https://firebase.google.com/docs/app-check/web/debug-provider
- Firebase blog: hybrid inference — https://firebase.blog/posts/2025/10/understand-ai-logic-hybrid-inference
- Hackathon resources — https://firebasehybridaihackathon.devpost.com/resources

Key facts verified from those docs:

- `getGenerativeModel(ai, { mode: InferenceMode.PREFER_ON_DEVICE })` — no
  model name; on-device Nano when available, cloud fallback otherwise.
  Modes: `PREFER_ON_DEVICE`, `ONLY_ON_DEVICE`, `PREFER_IN_CLOUD`,
  `ONLY_IN_CLOUD`.
- `model.initializeDeviceModel(progressCb)` — must be called after/on a
  user interaction and before `generateContent()`.
- `result.response.inferenceSource` returns `ON_DEVICE` or `IN_CLOUD`
  (JS SDK v12.5.0+).
- On-device supports **single-turn text generation only (no chat)**,
  text-only or text+image (JPEG/PNG) input, and structured output (JSON).
  Default cloud fallback model is `gemini-3.5-flash-lite` (JS SDK v13.0.0+).
- **Not supported on-device** (cloud fallback available, `ONLY_ON_DEVICE`
  throws): image generation (Nano Banana), audio/video/PDF inputs, files
  via URL, multi-turn chat, tools/function calling, Grounding.
- On-device needs Chrome desktop 139+ and disk space for the model
  download; AI monitoring in the Firebase console shows no data for
  on-device inference.

## Status

- [x] Scaffold: Vite + React + TS, Firebase AI Logic hybrid engine, demo
  mode, polished dark UI (English)
- [x] `npm run build` passes
- [x] Firebase project `clipcraft-63f49` + real config in `src/config.ts`
      (wired 20 Nov 2026)
- [ ] Enable AI Logic in the console (Gemini Developer API provider) —
      until then the app falls back to labelled demo output
- [ ] Live test on desktop Chrome 139+ with Gemini Nano (verify the
      on-device badge appears)
- [ ] Deploy (Firebase Hosting or Vercel) + live URL for judges
- [ ] Demo video ≤ 3 min (YouTube, public, English)
- [ ] Devpost submission (public repo + video + description + platform:
      Web/Chrome) by 1 Dec 2026 05:00 WIB

## License

MIT — see [LICENSE](LICENSE).
