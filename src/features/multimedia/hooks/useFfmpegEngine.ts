/**
 * useFfmpegEngine — shared FFmpeg.wasm engine for all Multimedia
 * tools. Owns the FFmpeg instance, the load lifecycle, and the
 * log / progress event wiring.
 *
 * ## Why a module-level singleton?
 *
 * `@ffmpeg/ffmpeg@0.12.x` ships a ~30 MB WASM core. If every
 * tool that uses FFmpeg (VideoSplitter, AudioVideoMerger,
 * GifMaker, …) called `new FFmpeg()` on mount, switching
 * between them in the sidebar would re-download the core each
 * time. The fix is to keep the FFmpeg instance at module scope
 * — the first tool to mount loads it, every subsequent mount
 * reuses the same instance.
 *
 * ## Why the React state is NOT a singleton
 *
 * Each component still owns its own `status` / `progress` /
 * `error` React state. The module-level FFmpeg instance is
 * shared, but each consumer tracks its own view of "is the
 * engine ready yet?" — the React-friendly shape. The hook
 * subscribes to a small event bus on the singleton and
 * republishes the state into the component's local state.
 *
 * The user's experience: open VideoSplitter, wait 5s for
 * the 30MB download. Switch to AudioVideoMerger — the engine
 * is already there, no second download. Switch back to
 * VideoSplitter — still no second download. The component
 * remounts, the hook sees the instance is already loaded,
 * sets `status = "loaded"` immediately.
 *
 * ## Why the log handler is at debug level
 *
 * See references/ffmpeg-progress-feedback.md. The pattern
 * is canonical across the codebase: log at console.debug so
 * it doesn't spam the console for normal use, but enable
 * the "Verbose" filter in DevTools to see what ffmpeg is
 * doing when an operation hangs.
 */
import { useEffect, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

export type FfmpegEngineStatus = "loading" | "loaded" | "error";

const FFMPEG_CORE_BASE = "/ffmpeg-core";
const FFMPEG_CORE_VERSION = "0.12.9";
// unpkg fallback if the local files weren't copied to public/ffmpeg-core/
const FFMPEG_CORE_CDN = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;

/* ────────────────────────────────────────────────────────────────── */
/* Module-level singleton state                                        */
/* ────────────────────────────────────────────────────────────────── */

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;
const subscribers: Set<(s: FfmpegEngineStatus) => void> = new Set();
let currentStatus: FfmpegEngineStatus = "loading";

/** Try the local /ffmpeg-core/ffmpeg-core.js first, then fall
 *  back to the unpkg CDN. Returns a Blob URL for the core JS
 *  (and the wasm URL the FFmpeg constructor needs). */
async function resolveCoreUrls(): Promise<{ coreURL: string; wasmURL: string }> {
    try {
        const probe = await fetch(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, { method: "HEAD" });
        if (probe.ok) {
            return {
                coreURL: `${FFMPEG_CORE_BASE}/ffmpeg-core.js`,
                wasmURL: `${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`,
            };
        }
    } catch {
        // fall through to CDN
    }
    return {
        coreURL: `${FFMPEG_CORE_CDN}/ffmpeg-core.js`,
        wasmURL: `${FFMPEG_CORE_CDN}/ffmpeg-core.wasm`,
    };
}

/** Update currentStatus AND notify all subscribers. */
function setStatus(s: FfmpegEngineStatus) {
    currentStatus = s;
    subscribers.forEach((cb) => cb(s));
}

async function loadEngine(): Promise<FFmpeg> {
    // The SharedArrayBuffer check is the same as the per-component
    // check; it has to happen here (at the load site) because the
    // engine instantiation is what fails without SAB.
    if (typeof SharedArrayBuffer === "undefined" || !window.crossOriginIsolated) {
        throw new Error(
            "SharedArrayBuffer is not available. This page must be served with COOP/COEP headers. " +
                "Vite dev server sets them automatically; production hosting must set " +
                "'Cross-Origin-Opener-Policy: same-origin' and " +
                "'Cross-Origin-Embedder-Policy: require-corp' on the response."
        );
    }
    const { coreURL, wasmURL } = await resolveCoreUrls();
    const [coreBlob, wasmBlob] = await Promise.all([
        toBlobURL(coreURL, "text/javascript"),
        toBlobURL(wasmURL, "application/wasm"),
    ]);

    const inst = new FFmpeg();
    // The log handler is wired ONCE per instance, not per consumer.
    // See the comment at the top of the file for why this is at
    // console.debug.
    inst.on("log", ({ message }: { message: string }) => {
        console.debug("[ffmpeg]", message);
    });

    await inst.load({ coreURL: coreBlob, wasmURL: wasmBlob });
    ffmpegInstance = inst;
    return inst;
}

/** Get the singleton FFmpeg instance, loading it on first call.
 *  Subsequent calls return the same instance. */
export function getFfmpegInstance(): Promise<FFmpeg> {
    if (ffmpegInstance) return Promise.resolve(ffmpegInstance);
    if (loadPromise) return loadPromise;
    setStatus("loading");
    loadPromise = loadEngine()
        .then((inst) => {
            setStatus("loaded");
            return inst;
        })
        .catch((err) => {
            console.error("FFmpeg load failed:", err);
            setStatus("error");
            // Reset so a future mount can try again (e.g. the user
            // fixes their COOP/COEP config and reloads).
            loadPromise = null;
            throw err;
        });
    return loadPromise;
}

/** Subscribe to engine status changes. Used by useFfmpegEngine
 *  to mirror the singleton's status into component-local state. */
function subscribeStatus(cb: (s: FfmpegEngineStatus) => void): () => void {
    subscribers.add(cb);
    // Fire once immediately so the consumer gets the current state
    // without having to wait for a transition.
    cb(currentStatus);
    return () => {
        subscribers.delete(cb);
    };
}

/* ────────────────────────────────────────────────────────────────── */
/* The hook                                                            */
/* ────────────────────────────────────────────────────────────────── */

export interface FfmpegEngine {
    /** The FFmpeg instance, null until the engine is loaded. */
    ffmpeg: FFmpeg | null;
    /** Current load state. */
    status: FfmpegEngineStatus;
    /** Last reported progress percentage (0–100), useful for
     *  showing engine-load progress to the user. */
    progress: number;
    /** Error from the load, or null. */
    error: Error | null;
}

export function useFfmpegEngine(): FfmpegEngine {
    const [status, setLocalStatus] = useState<FfmpegEngineStatus>(currentStatus);
    const [error, setError] = useState<Error | null>(null);
    // We don't need a real progress state for engine loading — the
    // loading is binary (loading / loaded / error). The 0/100 is
    // just for any UI that wants to show "Loading…" with a
    // pulsing bar. If a tool needs the engine's progress EVENT
    // (re-encoding progress), it should subscribe to its own
    // FFmpeg instance directly — the hook is only for engine
    // load lifecycle.
    const [progress] = useState<number>(0);

    // Subscribe to the singleton's status changes and mirror
    // them into local state so React re-renders correctly.
    // The FFmpeg instance itself is read directly from
    // module scope (`ffmpegInstance`) by the consumer when
    // needed — no ref needed.
    useEffect(() => {
        let cancelled = false;
        const unsubscribe = subscribeStatus((s) => {
            if (!cancelled) setLocalStatus(s);
        });
        // If the instance is already loaded but our local
        // status is still "loading" (e.g. a different
        // component loaded it before this one mounted),
        // getFfmpegInstance() resolves immediately. The
        // subscribe callback fired the current value already,
        // so local state should already be in sync — but call
        // it again to be safe.
        getFfmpegInstance().catch((e) => {
            if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
        });
        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, []);

    return {
        ffmpeg: ffmpegInstance,
        status,
        progress,
        error,
    };
}
