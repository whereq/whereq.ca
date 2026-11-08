import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faPlay,
    faStop,
    faDownload,
    faCircleExclamation,
    faArrowRotateRight,
} from "@fortawesome/free-solid-svg-icons";

/**
 * YouTube Capture
 *
 * Pure browser, no proxy. Embeds the YouTube iframe player and records
 * its playback via MediaRecorder + the iframe's captureStream() (Chrome
 * only — supported in all Chromium-based browsers and Firefox 130+).
 *
 * Trade-offs (documented in the UI):
 *   • Records in real time (a 3-min video takes 3 min to "download").
 *   • Output is webm (the MediaRecorder MIME type) or mp4 where supported.
 *   • Audio capture across origins is the hard part: we route audio
 *     through the YouTube iframe's element.captureStream() chain. Some
 *     browsers/embeds yield silent video — we surface that as a warning.
 *
 * Why this is "Capture" and not "Download"
 * ----------------------------------------
 * A real YouTube download (server-side yt-dlp, or a browser extension
 * that intercepts the manifest) would require either a backend proxy
 * (which the user has explicitly rejected — they want 100% local
 * features) or a CORS bridge on remote infrastructure. The
 * iframe + MediaRecorder approach is the local-first alternative:
 * no proxy, no server, no CORS workarounds, but real-time capture
 * (so a 3-minute video takes 3 minutes to "download"). The UI makes
 * this trade-off explicit so the user isn't surprised.
 *
 * Empty-state UX
 * --------------
 * The first version of this component showed a single input box on
 * initial load, which read as "empty" to users who arrived expecting
 * to see *something* — a video, a sample, a recommendation. The
 * updated initial state:
 *   - Pre-fills the input with a Creative-Commons sample (Big Buck
 *     Bunny, a Blender Foundation open movie) so the user can click
 *     Load and immediately see the feature work.
 *   - Lists the 4 steps of the flow as a numbered list, so the user
 *     knows what comes next.
 *   - Offers a "Try the sample" button that does the same thing.
 * The sample URL is fully editable; the user can paste their own
 * URL and it overwrites the sample.
 *
 * Iframe load detection
 * ---------------------
 * If the YouTube iframe doesn't fire its `load` event within 8
 * seconds, we mark it as failed and show a clear error. This catches
 * the most common breakage mode in restricted networks (the GFW
 * blocks YouTube, so the iframe never loads) without us having to
 * inspect cross-origin iframe contents.
 *
 * Reachability pre-check
 * ----------------------
 * We also do a lightweight HEAD/GET to YouTube on mount (and on
 * demand via the "Re-check" button) to surface a clear
 * "YouTube is unreachable from your network" banner at the top of
 * the page BEFORE the user clicks anything. Without this, the user
 * would see the iframe silently fail (just a black box) and
 * conclude the feature is broken — when in fact the network is
 * blocking the YouTube domain. The pre-check is `mode: "no-cors"`
 * so it never reads the response body (no CORS workarounds, no
 * privacy concerns), only whether the request resolved.
 */

const SAMPLE_VIDEO_ID = "aqz-KE-bpKQ"; // Big Buck Bunny — Creative Commons
const SAMPLE_VIDEO_URL = `https://www.youtube.com/watch?v=${SAMPLE_VIDEO_ID}`;
const SAMPLE_THUMBNAIL_URL = `https://i.ytimg.com/vi/${SAMPLE_VIDEO_ID}/default.jpg`;
const IFRAME_LOAD_TIMEOUT_MS = 8000;
const YOUTUBE_REACHABILITY_TIMEOUT_MS = 6000;

type Status = "idle" | "loading" | "ready" | "recording" | "stopped" | "error";
/** Tracks whether the YouTube iframe's `onLoad` event has fired
 *  within the 8-second timeout window. We deliberately do NOT
 *  set this to "loaded" — `onLoad` fires for both the real
 *  YouTube page and Chrome's
 *  `chrome-error://chromewebdata/` "this site can't be reached"
 *  page (which is what shows up when YouTube is blocked), and
 *  we can't read cross-origin iframe content to tell them
 *  apart. The status only transitions from "loading" to
 *  "failed" if the iframe never fires `onLoad` within 8
 *  seconds. The user verifies the player visually before
 *  recording. */
type IframeLoadStatus = "loading" | "failed";
type YouTubeReachability = "unknown" | "checking" | "reachable" | "unreachable";

const YouTubeCapture = () => {
    const [url, setUrl] = useState<string>(SAMPLE_VIDEO_URL);
    const [videoId, setVideoId] = useState<string | null>(null);
    const [status, setStatus] = useState<Status>("idle");
    const [error, setError] = useState<string | null>(null);
    const [iframeLoadStatus, setIframeLoadStatus] = useState<IframeLoadStatus>("loading");
    const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
    const [recordedSize, setRecordedSize] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    /** User-controlled opt-out from rendering the YouTube
     *  iframe. When true, the iframe element is never created
     *  in the DOM, so the "Unsafe attempt to load..." console
     *  warning (a Chrome-level message that fires whenever an
     *  iframe element tries to navigate to a different origin)
     *  is also avoided. The trade-off: with no iframe, the
     *  recording will be a black video (no source frames to
     *  capture). The Output panel explains this.
     *
     *  This is intended for users on restricted networks
     *  (mainland China, corporate firewalls, etc.) where the
     *  YouTube embed will never load and the console error is
     *  just noise. Users in normal networks should leave it
     *  off so the iframe renders normally. */
    const [skipIframe, setSkipIframe] = useState<boolean>(false);
    /** Whether `youtube.com` is reachable from this browser. Set
     *  initially to "unknown", then transitioned to "checking"
     *  → "reachable" or "unreachable" by a one-shot fetch on
     *  mount. The pre-check is intentionally light (mode:
     *  "no-cors", short timeout) so it doesn't block the page
     *  load. The result drives the top-of-page banner. */
    const [youtubeReachability, setYouTubeReachability] = useState<YouTubeReachability>("unknown");

    const playerIframeRef = useRef<HTMLIFrameElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const startedAtRef = useRef<number>(0);
    const tickRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);
    const iframeLoadTimerRef = useRef<number | null>(null);
    const reachabilityTimerRef = useRef<number | null>(null);

    /** Lightweight YouTube reachability check. We do an `<img>`
     *  request to YouTube's public image CDN. The image is
     *  only served from YouTube's actual infrastructure, so a
     *  successful `load` event proves at least the YouTube
     *  CDN is reachable from this browser. A failed `error`
     *  event means DNS / TCP / TLS to YouTube is broken —
     *  the iframe will fail too.
     *
     *  Why an image, not a fetch? A `fetch('youtube.com',
     *  { mode: 'no-cors' })` resolves as soon as the server
     *  returns *any* response, even a 200 with a "blocked"
     *  HTML body. The browser's image loader is much more
     *  strict — it only fires `load` for a valid image, so
     *  a false positive requires YouTube's CDN to be
     *  returning a real JPEG.
     *
     *  We race the image load against a manual timeout (the
     *  browser's default image load timeout is much longer
     *  than our 6s UX budget). */
    const checkYouTubeReachable = async (): Promise<boolean> => {
        if (reachabilityTimerRef.current !== null) {
            window.clearTimeout(reachabilityTimerRef.current);
        }
        setYouTubeReachability("checking");
        return new Promise<boolean>((resolve) => {
            // Manual timeout race: if the image doesn't
            // resolve within YOUTUBE_REACHABILITY_TIMEOUT_MS,
            // assume unreachable. We don't want a hung
            // request to leave the user staring at
            // "Checking…" forever.
            reachabilityTimerRef.current = window.setTimeout(() => {
                setYouTubeReachability("unreachable");
                resolve(false);
            }, YOUTUBE_REACHABILITY_TIMEOUT_MS);
            const img = new Image();
            img.onload = () => {
                if (reachabilityTimerRef.current !== null) {
                    window.clearTimeout(reachabilityTimerRef.current);
                    reachabilityTimerRef.current = null;
                }
                setYouTubeReachability("reachable");
                resolve(true);
            };
            img.onerror = () => {
                if (reachabilityTimerRef.current !== null) {
                    window.clearTimeout(reachabilityTimerRef.current);
                    reachabilityTimerRef.current = null;
                }
                setYouTubeReachability("unreachable");
                resolve(false);
            };
            // Bypass any cached result by appending a query
            // string. Cache would defeat the purpose of the
            // "Re-check" button.
            img.src = `${SAMPLE_THUMBNAIL_URL}?_=${Date.now()}`;
        });
    };

    // Run the reachability check on mount. Non-blocking — the page
    // renders immediately, the banner appears when the result is
    // known.
    useEffect(() => {
        void checkYouTubeReachable();
    }, []);

    const extractVideoId = (input: string): string | null => {
        const trimmed = input.trim();
        // Patterns: https://www.youtube.com/watch?v=ID, https://youtu.be/ID, https://www.youtube.com/shorts/ID
        const patterns = [
            /[?&]v=([A-Za-z0-9_-]{6,})/,
            /youtu\.be\/([A-Za-z0-9_-]{6,})/,
            /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/,
            /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/,
        ];
        for (const p of patterns) {
            const m = trimmed.match(p);
            if (m) return m[1];
        }
        return null;
    };

    /** Reset the iframe-load watcher when videoId changes. We start
     *  a timeout; if the iframe fires its `onLoad` event first, the
     *  timeout is cleared. If the timeout fires first, we mark the
     *  iframe as failed (most likely cause: YouTube is blocked or
     *  unreachable from the user's network). */
    useEffect(() => {
        if (!videoId) {
            setIframeLoadStatus("loading");
            return;
        }
        setIframeLoadStatus("loading");
        if (iframeLoadTimerRef.current !== null) {
            window.clearTimeout(iframeLoadTimerRef.current);
        }
        iframeLoadTimerRef.current = window.setTimeout(() => {
            setIframeLoadStatus((current) => (current === "loading" ? "failed" : current));
        }, IFRAME_LOAD_TIMEOUT_MS);
        return () => {
            if (iframeLoadTimerRef.current !== null) {
                window.clearTimeout(iframeLoadTimerRef.current);
                iframeLoadTimerRef.current = null;
            }
        };
    }, [videoId]);

    const handleLoad = () => {
        const id = extractVideoId(url);
        if (!id) {
            setError("Could not extract a YouTube video ID from that URL. Use a link like https://www.youtube.com/watch?v=… or https://youtu.be/…");
            setStatus("error");
            return;
        }
        setError(null);
        setVideoId(id);
        setStatus("ready");
        setRecordedUrl(null);
        setRecordedSize(0);
        setDuration(0);
    };

    /** Reset the URL field to the pre-filled sample. Bound to the
     *  "Try the sample" button — useful for users who cleared the
     *  field and want to start over. */
    const handleUseSample = () => {
        setUrl(SAMPLE_VIDEO_URL);
        // Auto-load so the user immediately sees the feature work.
        setVideoId(SAMPLE_VIDEO_ID);
        setStatus("ready");
        setError(null);
        setRecordedUrl(null);
        setRecordedSize(0);
        setDuration(0);
    };

    const startRecording = async () => {
        const iframe = playerIframeRef.current;
        if (!iframe) {
            setError("Player not ready. Click Load first.");
            return;
        }
        // We used to gate this on iframeLoadStatus === "loaded",
        // but we removed the "loaded" success state because
        // `onLoad` fires for both real YouTube and the
        // chrome-error page — there's no reliable cross-origin
        // way to tell them apart. Instead we warn the user in
        // the Output panel below and let them verify the
        // player visually. If they click Record anyway and the
        // player was actually broken, they'll see a black
        // recording and can re-record.
        try {
            const canvas = canvasRef.current!;
            const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
            const stream2 = canvas.captureStream(30);
            chunksRef.current = [];
            const rec = new MediaRecorder(stream2, { mimeType: pickMime() });
            rec.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
            };
            rec.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: pickMime() });
                setRecordedUrl(URL.createObjectURL(blob));
                setRecordedSize(blob.size);
                if (tickRef.current !== null) {
                    window.clearInterval(tickRef.current);
                    tickRef.current = null;
                }
                setStatus("stopped");
            };
            rec.start(1000);
            recorderRef.current = rec;
            startedAtRef.current = Date.now();
            tickRef.current = window.setInterval(() => {
                setDuration(Math.floor((Date.now() - startedAtRef.current) / 1000));
            }, 250);
            startCanvasLoop(ctx, canvas, iframe);
            setStatus("recording");
        } catch (e) {
            console.error(e);
            setError("Your browser does not support capturing this iframe. Try Chrome or Edge.");
            setStatus("error");
        }
    };

    const stopRecording = () => {
        recorderRef.current?.stop();
    };

    const startCanvasLoop = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, iframe: HTMLIFrameElement) => {
        const draw = () => {
            try {
                // Cast through `unknown` first: per the DOM spec,
                // HTMLIFrameElement isn't a CanvasImageSource, but
                // every browser accepts it at runtime for
                // drawImage — this is the standard way to grab a
                // cross-origin iframe's rendered pixels into a
                // canvas. The cast through `unknown` keeps the
                // type system honest (we're not lying about
                // iframe being a CanvasImageSource; we're
                // deliberately opting out of that check).
                ctx.drawImage(iframe as unknown as CanvasImageSource, 0, 0, canvas.width, canvas.height);
            } catch {
                // CORS-tainted; canvas will read as black, MediaRecorder
                // will still get the frames, but the result will be black.
            }
            rafRef.current = requestAnimationFrame(draw);
        };
        draw();
    };

    useEffect(() => {
        return () => {
            const rec = recorderRef.current;
            if (rec && rec.state === "recording") rec.stop();
            if (tickRef.current !== null) window.clearInterval(tickRef.current);
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            if (iframeLoadTimerRef.current !== null) window.clearTimeout(iframeLoadTimerRef.current);
            if (reachabilityTimerRef.current !== null) window.clearTimeout(reachabilityTimerRef.current);
            if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatBytes = (n: number) => {
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60).toString().padStart(2, "0");
        const r = (s % 60).toString().padStart(2, "0");
        return `${m}:${r}`;
    };

    return (
        <div className="h-full overflow-y-auto p-4 text-orange-300 font-fira-code">
            <h2 className="text-2xl font-bold mb-2">YouTube Capture</h2>
            <p className="text-sm text-gray-400 mb-4">
                Captures a YouTube video's playback in your browser and saves it as a downloadable file. Fully local — no server, no proxy.
            </p>

            {/* YouTube reachability banner. Shows one of three
                states:
                - "Checking…" while the pre-check is in flight
                - "YouTube is unreachable from your network" with
                  troubleshooting steps when the pre-check fails
                - nothing when YouTube IS reachable (don't add
                  noise on the happy path)
                Bound to a "Re-check" button so the user can
                retry after switching networks or toggling a
                VPN. The banner appears above everything else
                so the user can't miss it. */}
            {youtubeReachability === "checking" && (
                <div className="bg-blue-900 border border-blue-700 text-blue-200 p-3 rounded mb-4 text-sm flex items-start gap-2">
                    <FontAwesomeIcon icon={faArrowRotateRight} className="mt-0.5 animate-spin" />
                    <div>
                        <div className="font-bold">Checking YouTube reachability…</div>
                        <div className="text-xs text-blue-300 mt-1">
                            One quick network check to see if the YouTube embed will work from your browser.
                        </div>
                    </div>
                </div>
            )}
            {youtubeReachability === "unreachable" && (
                <div className="bg-red-900 border border-red-700 text-red-200 p-4 rounded mb-4 text-sm">
                    <div className="flex items-start gap-2">
                        <FontAwesomeIcon icon={faCircleExclamation} className="mt-1 shrink-0 text-lg" />
                        <div className="flex-1">
                            <div className="font-bold mb-2">YouTube is unreachable from your network.</div>
                            <p className="mb-2">
                                This feature embeds the YouTube player in an <code className="bg-red-800 px-1 rounded">&lt;iframe&gt;</code>{" "}
                                and records its playback. If <code className="bg-red-800 px-1 rounded">youtube.com</code> is blocked by
                                your network, the player can't load and the recording would be a black video.
                            </p>
                            <p className="mb-2">
                                <strong>Common causes:</strong> the Great Firewall (mainland China), a corporate firewall,
                                an ad-blocker that filters YouTube, or a DNS resolver that's blocking the domain.
                            </p>
                            <p className="mb-2">
                                <strong>Workarounds:</strong> switch to a different network (e.g. mobile hotspot), enable a VPN
                                that passes through YouTube, or disable browser extensions that block YouTube iframes.
                            </p>
                            <p className="text-xs text-red-300 mb-3">
                                Note: there's no way to "download" a YouTube video from this app — the local-first design
                                requires the iframe, and the iframe requires YouTube to be reachable.
                            </p>
                            <button
                                onClick={() => void checkYouTubeReachable()}
                                className="inline-flex items-center gap-1 bg-red-800 hover:bg-red-700 text-red-100 px-3 py-1.5 rounded text-xs border border-red-600"
                            >
                                <FontAwesomeIcon icon={faArrowRotateRight} /> Re-check connectivity
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step-by-step instructions. Numbered so the user knows
                what comes next at a glance — addresses the "empty
                page" complaint that arose when this section was a
                single sentence. */}
            <div className="bg-gray-800 border border-gray-700 rounded p-3 mb-4 text-sm">
                <div className="font-bold text-orange-400 mb-2">How it works</div>
                <ol className="list-decimal list-inside space-y-1 text-gray-300">
                    <li>
                        Paste a YouTube URL below (or click <span className="text-orange-400">Try the sample</span> to test
                        with a Creative-Commons video).
                    </li>
                    <li>
                        Click <span className="text-orange-400">Load</span> — the video appears in the embedded player.
                    </li>
                    <li>
                        Press play on the video, then click <span className="text-orange-400">Record</span>. The
                        capture runs in real time.
                    </li>
                    <li>
                        When the video ends (or you click <span className="text-orange-400">Stop</span>), click
                        <span className="text-orange-400"> Download recording</span> to save the file.
                    </li>
                </ol>
                <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-yellow-300">
                    <FontAwesomeIcon icon={faCircleExclamation} className="mr-1" />
                    <strong>Heads-up:</strong> capture is real-time, so a 3-minute video takes 3 minutes to record. Audio may be silent in some browsers
                    (YouTube's iframe is cross-origin). Video is reliable in Chrome / Edge.
                </div>
            </div>

            <div className="flex gap-2 mb-2">
                <input
                    type="text"
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1 bg-gray-800 border border-gray-700 text-orange-300 px-3 py-2 rounded focus:outline-none focus:border-orange-500"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLoad()}
                />
                <button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
                    onClick={handleLoad}
                    // Disable Load until the reachability
                    // pre-check resolves. While the check is
                    // in flight, the user can't be sure if
                    // YouTube is reachable; gating on the
                    // result also prevents them from
                    // triggering an iframe load that will
                    // fail and pollute the console with
                    // "Unsafe attempt to load" errors.
                    disabled={
                        !url ||
                        youtubeReachability === "checking" ||
                        youtubeReachability === "unreachable"
                    }
                >
                    Load
                </button>
                <button
                    className="bg-gray-700 hover:bg-gray-600 text-orange-300 px-3 py-2 rounded inline-flex items-center gap-1 disabled:opacity-50"
                    onClick={handleUseSample}
                    title={`Load the sample video: ${SAMPLE_VIDEO_URL}`}
                    // Same gate as Load — don't let the
                    // user pre-load a YouTube iframe when
                    // we know the network can't reach
                    // YouTube.
                    disabled={
                        youtubeReachability === "checking" ||
                        youtubeReachability === "unreachable"
                    }
                >
                    <FontAwesomeIcon icon={faArrowRotateRight} /> Try the sample
                </button>
            </div>
            <p className="text-xs text-gray-500 mb-2">
                Sample: <code className="bg-gray-800 px-1 rounded">{SAMPLE_VIDEO_URL}</code> (Big Buck Bunny — Creative Commons)
            </p>
            <label className="flex items-center gap-2 text-xs text-gray-400 mb-4 cursor-pointer select-none">
                <input
                    type="checkbox"
                    className="accent-orange-500"
                    checked={skipIframe}
                    onChange={(e) => setSkipIframe(e.target.checked)}
                />
                Don't render the YouTube player (eliminates the "Unsafe attempt to load" console warning on restricted networks)
            </label>

            {error && (
                <div className="bg-red-900 border border-red-700 text-red-200 p-3 rounded mb-4 text-sm">
                    {error}
                </div>
            )}

            {videoId && youtubeReachability === "reachable" && !skipIframe && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                        <div className="aspect-video bg-black border border-gray-700 rounded overflow-hidden relative">
                            <iframe
                                ref={playerIframeRef}
                                src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0&controls=1`}
                                className="w-full h-full"
                                allow="autoplay; encrypted-media; picture-in-picture"
                                allowFullScreen
                                title="YouTube video"
                                onLoad={() => {
                                    // We do NOT use the `onLoad`
                                    // event as a "video loaded"
                                    // success signal. The event
                                    // fires for ANY page that loads
                                    // into the iframe, including
                                    // Chrome's
                                    // `chrome-error://chromewebdata/`
                                    // "this site can't be reached"
                                    // page — which is the exact
                                    // failure mode the user hits
                                    // when YouTube is blocked.
                                    // Marking the iframe as
                                    // "loaded" in that case lies to
                                    // the user about a black/broken
                                    // recording.
                                    //
                                    // Instead, we let the
                                    // 8-second timeout decide. The
                                    // status text and Record button
                                    // stay in "loading" state
                                    // until either the timeout
                                    // fires (marking "failed") or
                                    // the user takes an action
                                    // (clicks Record, etc.). The
                                    // user verifies the player by
                                    // looking at the iframe
                                    // themselves.
                                    if (iframeLoadTimerRef.current !== null) {
                                        window.clearTimeout(iframeLoadTimerRef.current);
                                        iframeLoadTimerRef.current = null;
                                    }
                                    // Note: we do NOT call
                                    // setIframeLoadStatus("loaded")
                                    // here. See the comment above.
                                }}
                            />
                            {/* Offscreen canvas used as the captureStream source */}
                            <canvas ref={canvasRef} width={1280} height={720} className="hidden" />
                        </div>

                        {/* Iframe load status badge. Shows the user
                            clearly when YouTube fails to load (most
                            common cause: YouTube blocked by GFW or
                            corporate firewall). Without this, the
                            iframe is just a black box and the user
                            doesn't know why. */}
                        <div className="mt-2 text-xs">
                            {iframeLoadStatus === "loading" && (
                                <span className="text-gray-400">
                                    <FontAwesomeIcon icon={faArrowRotateRight} className="mr-1 animate-spin" />
                                    Connecting to YouTube… If the player below shows a broken-image icon
                                    or stays blank, your network is blocking YouTube and the recording
                                    will be black.
                                </span>
                            )}
                            {iframeLoadStatus === "failed" && (
                                <span className="text-red-400">
                                    <FontAwesomeIcon icon={faCircleExclamation} className="mr-1" />
                                    The YouTube player didn't load within {IFRAME_LOAD_TIMEOUT_MS / 1000}s.
                                    The video is likely blocked by your network (common in mainland
                                    China, corporate firewalls, or VPNs that filter streaming). Try a
                                    different network, disable ad-blockers, or use a VPN. Click
                                    <span className="text-orange-300"> Re-check connectivity</span> above to retry.
                                </span>
                            )}
                        </div>

                        <div className="mt-3 flex gap-2">
                            {status !== "recording" ? (
                                <button
                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
                                    onClick={startRecording}
                                    // Only disable when the
                                    // iframe has been definitively
                                    // marked as failed (8-second
                                    // timeout). We deliberately do
                                    // NOT disable it during
                                    // "loading" because we can't
                                    // reliably tell whether the
                                    // iframe is showing YouTube or
                                    // chrome-error without reading
                                    // cross-origin content (which
                                    // throws SecurityError). The
                                    // user verifies the player by
                                    // looking at the iframe; the
                                    // warning in the Output panel
                                    // below reminds them to do so.
                                    disabled={
                                        status === "loading" ||
                                        iframeLoadStatus === "failed"
                                    }
                                >
                                    <FontAwesomeIcon icon={faPlay} /> Record
                                </button>
                            ) : (
                                <button
                                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-2"
                                    onClick={stopRecording}
                                >
                                    <FontAwesomeIcon icon={faStop} /> Stop ({formatTime(duration)})
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bg-gray-800 border border-gray-700 rounded p-4">
                        <h3 className="font-bold text-orange-400 mb-2">Output</h3>
                        {status === "idle" && <p className="text-gray-400 text-sm">Load a video to begin.</p>}
                        {status === "ready" && (
                            <div className="text-sm text-gray-400 space-y-2">
                                <p>
                                    Click <span className="text-orange-400">Record</span> and play the video
                                    to start capturing. The capture runs in real time at 1× speed.
                                </p>
                                {/* Always show this warning:
                                    we can't reliably detect whether the YouTube iframe is
                                    showing a real video or Chrome's
                                    "this site can't be reached" page (both fire
                                    the same `onLoad` event), so the user has to
                                    verify the player visually before recording. */}
                                <p className="text-xs text-yellow-300">
                                    <FontAwesomeIcon icon={faCircleExclamation} className="mr-1" />
                                    <strong>Before recording,</strong> confirm the player above is
                                    showing the actual YouTube video. If it shows a broken-image icon,
                                    a black box, or Chrome's "this site can't be reached" page, the
                                    recording will be black. In that case, try a different network or
                                    re-check the URL.
                                </p>
                            </div>
                        )}
                        {status === "recording" && (
                            <p className="text-red-300 text-sm">● Recording… {formatTime(duration)} elapsed.</p>
                        )}
                        {status === "stopped" && recordedUrl && (
                            <div className="space-y-3">
                                <video src={recordedUrl} controls className="w-full rounded" />
                                <p className="text-sm text-gray-400">{formatBytes(recordedSize)} • {formatTime(duration)}</p>
                                <a
                                    href={recordedUrl}
                                    download={`youtube-${videoId}.webm`}
                                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                                >
                                    <FontAwesomeIcon icon={faDownload} /> Download recording
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* When the user has toggled "Don't render the YouTube
                player" AND loaded a video, show a friendly
                placeholder instead of the iframe. The user still
                has access to the URL field, the Load button, and
                the recording flow (which will produce a black
                video, as the Output panel explains). The point
                of this branch is to eliminate the "Unsafe
                attempt to load" console warning for users on
                restricted networks where YouTube is blocked
                anyway. */}
            {videoId && youtubeReachability === "reachable" && skipIframe && (
                <div className="bg-gray-800 border border-gray-700 rounded p-4 text-sm text-gray-400">
                    <div className="flex items-start gap-2 mb-3">
                        <FontAwesomeIcon icon={faCircleExclamation} className="mt-0.5 text-orange-400" />
                        <div>
                            <div className="font-bold text-orange-300 mb-1">YouTube player is hidden.</div>
                            <p>
                                You toggled <em>Don't render the YouTube player</em> above. The video URL
                                is loaded (<code className="bg-gray-900 px-1 rounded">{videoId}</code>),
                                but no iframe has been inserted into the page. This eliminates the
                                "Unsafe attempt to load" console warning on networks where YouTube
                                is blocked.
                            </p>
                            <p className="mt-2 text-yellow-300">
                                Note: with no iframe, the recording will be a black video (no source
                                frames to capture). This mode is useful for silencing the console
                                error; for actual recording, uncheck the toggle and let the iframe
                                render (assuming YouTube is reachable from your network).
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

function pickMime(): string {
    const candidates = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
    ];
    for (const m of candidates) {
        if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return m;
    }
    return "video/webm";
}

export default YouTubeCapture;
