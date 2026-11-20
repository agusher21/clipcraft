import { useCallback, useEffect, useState } from 'react';
import { isFirebaseConfigured } from './config';
import {
  analyzeTrends,
  generatePack,
  generateThumbnail,
  probeOnDevice,
  type ClipPack,
  type EngineSource,
  type OnDeviceStatus,
} from './lib/ai';

const SAMPLE_TRANSCRIPT = `Okay so I just found the wildest thing in GTA 6. You know the scooter missions in Vice City? There's a grandma NPC who literally steals your scooter if you park it near the boardwalk. I chased her for like three minutes, she went through a food truck, jumped a fence, and then just vanished into a crowd. Rockstar really hid a whole chase scene in a random NPC. Here's the full clip and how to trigger it yourself.`;

const NICHES = ['Gaming', 'GTA 6', 'Tech', 'Education', 'Lifestyle', 'Finance', 'Fitness', 'General'];

type Badge = 'on-device' | 'cloud' | 'demo';

function EngineBadge({ source }: { source: Badge }) {
  const label =
    source === 'on-device'
      ? 'On-device · Gemini Nano'
      : source === 'cloud'
        ? 'Cloud · Gemini'
        : 'Demo · no AI connected';
  return <span className={`badge badge-${source}`}>{label}</span>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="copy-btn"
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? 'Copied ✓' : 'Copy'}
    </button>
  );
}

function Section({
  title,
  source,
  children,
}: {
  title: string;
  source: Badge | null;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      <div className="card-head">
        <h2>{title}</h2>
        {source && <EngineBadge source={source} />}
      </div>
      {children}
    </section>
  );
}

export default function App() {
  const [topic, setTopic] = useState('Grandma stole my scooter in GTA 6');
  const [niche, setNiche] = useState('GTA 6');
  const [transcript, setTranscript] = useState('');
  const [pack, setPack] = useState<ClipPack | null>(null);
  const [packSource, setPackSource] = useState<EngineSource | null>(null);
  const [packNote, setPackNote] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [thumbnailPrompt, setThumbnailPrompt] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);

  const [trend, setTrend] = useState<string | null>(null);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);

  const [onDevice, setOnDevice] = useState<OnDeviceStatus>('unsupported');
  const [online, setOnline] = useState(navigator.onLine);
  const firebaseReady = isFirebaseConfigured();

  useEffect(() => {
    void probeOnDevice().then(setOnDevice);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) {
      setError('Give your video a topic first.');
      return;
    }
    setError(null);
    setPackNote(null);
    setGenerating(true);
    setDownloadProgress(null);
    try {
      const result = await generatePack(
        { topic: topic.trim(), niche, transcript: transcript.trim() },
        (fraction) => setDownloadProgress(Math.round(fraction * 100)),
      );
      setPack(result.pack);
      setPackSource(result.source);
      setPackNote(result.note ?? null);
      setThumbnail(null);
      setThumbnailPrompt(null);
      setTrend(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed. Please try again.');
    } finally {
      setGenerating(false);
      setDownloadProgress(null);
    }
  }, [topic, niche, transcript]);

  const handleThumbnail = useCallback(async () => {
    if (!pack) return;
    setThumbnailLoading(true);
    setThumbnailError(null);
    try {
      const result = await generateThumbnail(pack.titles[0] ?? topic, topic);
      setThumbnailPrompt(result.prompt);
      if (result.imageUrl) {
        setThumbnail(result.imageUrl);
      } else {
        setThumbnailError(result.error ?? 'Thumbnail generation failed.');
      }
    } catch (e) {
      setThumbnailError(e instanceof Error ? e.message : 'Thumbnail generation failed.');
    } finally {
      setThumbnailLoading(false);
    }
  }, [pack, topic]);

  const handleTrends = useCallback(async () => {
    if (!pack) return;
    setTrendLoading(true);
    setTrendError(null);
    try {
      const result = await analyzeTrends(
        { topic: topic.trim(), niche, transcript: transcript.trim() },
        pack,
      );
      if (result.text) {
        setTrend(result.text);
      } else {
        setTrendError(result.error ?? 'Trend analysis failed.');
      }
    } catch (e) {
      setTrendError(e instanceof Error ? e.message : 'Trend analysis failed.');
    } finally {
      setTrendLoading(false);
    }
  }, [pack, topic, niche, transcript]);

  const onDeviceLabel: Record<OnDeviceStatus, string> = {
    available: 'On-device Nano: ready',
    downloading: 'On-device Nano: downloading…',
    downloadable: 'On-device Nano: ready to download',
    unavailable: 'On-device Nano: unavailable',
    unsupported: 'On-device Nano: not supported in this browser',
  };

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-inner">
          <div className="logo">
            <span className="logo-mark">✂️</span>
            <span className="logo-name">ClipCraft</span>
          </div>
          <p className="tagline">
            Hybrid AI for video creators — titles, hooks and hashtags written{' '}
            <strong>on your device</strong>, thumbnails and trend analysis in{' '}
            <strong>the cloud</strong>.
          </p>
          <div className="status-row">
            <span className={`pill ${firebaseReady ? 'pill-ok' : 'pill-warn'}`}>
              {firebaseReady ? '● Firebase connected' : '● Demo mode — Firebase not connected'}
            </span>
            <span className={`pill ${onDevice === 'available' ? 'pill-ok' : 'pill-dim'}`}>
              ● {onDeviceLabel[onDevice]}
            </span>
            <span className={`pill ${online ? 'pill-ok' : 'pill-warn'}`}>
              ● {online ? 'Online' : 'Offline'}
            </span>
          </div>
          {!firebaseReady && (
            <p className="demo-note">
              Demo mode: results below are generated locally so you can try the UI.
              Connect a Firebase project (see README) to use real Gemini Nano on-device
              and cloud Gemini.
            </p>
          )}
        </div>
      </header>

      <main className="main">
        <section className="card">
          <div className="card-head">
            <h2>Your video</h2>
          </div>
          <label className="field">
            <span>Topic / working title</span>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Grandma stole my scooter in GTA 6"
            />
          </label>
          <label className="field">
            <span>Niche</span>
            <select value={niche} onChange={(e) => setNiche(e.target.value)}>
              {NICHES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Transcript (optional — paste your video transcript or notes)</span>
            <textarea
              rows={7}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste the transcript of your clip here. The on-device model reads the first ~3,000 characters; the cloud reads more."
            />
          </label>
          <div className="actions">
            <button
              className="btn-primary"
              type="button"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating
                ? downloadProgress !== null
                  ? `Preparing on-device model… ${downloadProgress}%`
                  : 'Generating…'
                : '⚡ Generate titles, hooks & hashtags'}
            </button>
            <button
              className="btn-ghost"
              type="button"
              onClick={() => setTranscript(SAMPLE_TRANSCRIPT)}
            >
              Try a sample transcript
            </button>
          </div>
          {error && <p className="error">{error}</p>}
          {packNote && <p className="note">{packNote}</p>}
        </section>

        {pack && packSource && (
          <>
            <Section title="Titles — pick one" source={packSource}>
              <ol className="result-list">
                {pack.titles.map((t) => (
                  <li key={t}>
                    <span>{t}</span>
                    <CopyButton text={t} />
                  </li>
                ))}
              </ol>
            </Section>

            <Section title="Hooks — first 3 seconds" source={packSource}>
              <ol className="result-list">
                {pack.hooks.map((h) => (
                  <li key={h}>
                    <span>“{h}”</span>
                    <CopyButton text={h} />
                  </li>
                ))}
              </ol>
            </Section>

            <Section title="Hashtags" source={packSource}>
              <div className="hashtags">
                {pack.hashtags.map((h) => (
                  <button
                    key={h}
                    type="button"
                    className="hashtag"
                    onClick={() => void navigator.clipboard.writeText(`#${h}`)}
                    title="Click to copy"
                  >
                    #{h}
                  </button>
                ))}
              </div>
              <button
                className="btn-ghost"
                type="button"
                onClick={() =>
                  void navigator.clipboard.writeText(pack.hashtags.map((h) => `#${h}`).join(' '))
                }
              >
                Copy all hashtags
              </button>
            </Section>

            <Section title="Thumbnail — generated in the cloud" source="cloud">
              <p className="hint">
                Image generation is cloud-only: Gemini Nano Banana cannot generate
                images on-device, so this always runs in the cloud.
              </p>
              {thumbnail ? (
                <img className="thumbnail" src={thumbnail} alt="Generated video thumbnail" />
              ) : (
                <div className="thumb-placeholder">No thumbnail yet</div>
              )}
              {thumbnailPrompt && <p className="prompt-line">Prompt: {thumbnailPrompt}</p>}
              {thumbnailError && <p className="error">{thumbnailError}</p>}
              <button
                className="btn-primary"
                type="button"
                onClick={handleThumbnail}
                disabled={thumbnailLoading || !firebaseReady}
              >
                {thumbnailLoading ? 'Generating thumbnail…' : '🖼️ Generate thumbnail'}
              </button>
              {!firebaseReady && (
                <p className="hint">Connect Firebase to enable cloud thumbnail generation.</p>
              )}
            </Section>

            <Section title="Trend & SEO analysis — cloud" source="cloud">
              <p className="hint">
                Long-form analysis runs in the cloud by design — it exceeds what the
                on-device model is built for.
              </p>
              {trend && <p className="trend-text">{trend}</p>}
              {trendError && <p className="error">{trendError}</p>}
              <button
                className="btn-primary"
                type="button"
                onClick={handleTrends}
                disabled={trendLoading || !firebaseReady}
              >
                {trendLoading ? 'Analyzing…' : '📈 Analyze trends & SEO'}
              </button>
              {!firebaseReady && (
                <p className="hint">Connect Firebase to enable cloud trend analysis.</p>
              )}
            </Section>
          </>
        )}
      </main>

      <footer className="footer">
        <h3>How the hybrid split works</h3>
        <ul>
          <li>
            <strong>On-device (Gemini Nano, Chrome 139+ desktop):</strong> titles, hooks
            and hashtags — fast, private, free, works offline. Firebase AI Logic
            routes here first with <code>InferenceMode.PREFER_ON_DEVICE</code>.
          </li>
          <li>
            <strong>Cloud (Gemini):</strong> thumbnail image generation (Nano Banana)
            and trend analysis — capabilities Nano cannot do on-device.
          </li>
          <li>
            Every result shows where it actually ran, read from the SDK&apos;s{' '}
            <code>inferenceSource</code> — never assumed.
          </li>
        </ul>
        <p>
          Built with Firebase AI Logic for #BuildHybridAI 2026 ·{' '}
          <a href="https://github.com/agusher21/clipcraft">github.com/agusher21/clipcraft</a>
        </p>
      </footer>
    </div>
  );
}
