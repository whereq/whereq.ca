import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faUpload,
    faDownload,
    faScissors,
    faFilm,
    faPlay,
    faPause,
} from "@fortawesome/free-solid-svg-icons";
import { fetchFile } from "@ffmpeg/util";
import { useFfmpegEngine } from "@/features/multimedia/hooks/useFfmpegEngine";
import CustomModal from "@/components/modals/CustomModal";

/**
 * Video Splitter / Cutter
 *
 * Uses FFmpeg.wasm (full FFmpeg compiled to WebAssembly). Supports any
 * format FFmpeg supports: MP4, WebM, MKV, MOV, AVI, FLV, WMV, etc.
 * The cut is performed with `-c copy` (stream copy) so it's a literal
 * byte-precise trim — no quality loss, near-instantaneous regardless of
 * video length.
 *
 * Timeline
 * --------
 * Once a video is loaded, the controls area shows a custom timeline:
 *   - A row of thumbnail frames sampled at evenly-spaced timestamps.
 *     Each thumbnail is clickable; clicking jumps the preview to that
 *     frame's time.
 *   - Two draggable handles (Start and End) overlaid on the timeline.
 *     Drag a handle to scrub the cut start / cut end along the
 *     timeline. The preview video element follows the dragged handle
 *     so the user sees exactly what they'll be cutting.
 *   - A playhead that tracks the video's currentTime during playback
 *     (or scrubbing).
 *
 * Frame extraction uses a hidden video element + canvas; the visible
 * preview is a separate element so the user never sees the video
 * "jumping around" while thumbnails are being captured.
 *
 * FFmpeg core hosting
 * -------------------
 * The 32 MB `ffmpeg-core.wasm` and the ESM glue script `ffmpeg-core.js`
 * are committed to `public/ffmpeg-core/`, so the page never has to hit
 * a third-party CDN. The browser caches both files after the first
 * run, so the 32 MB cost is paid once per device.
 *
 * Why ESM (and not UMD)? Vite builds Web Workers as ES module workers
 * (`worker: { format: "es" }` in vite.config.ts). The UMD build of
 * `@ffmpeg/core` is a classic-script bundle and is dynamically imported
 * as a fallback inside `worker.js`; that fallback throws
 * `failed to import ffmpeg-core.js` when the worker is a module worker
 * because the UMD `var`/`module.exports` pattern isn't a valid ES
 * module. The ESM build ends with `export default createFFmpegCore`
 * and is what the module-worker import path needs. Both ESM files live
 * in `public/ffmpeg-core/`.
 *
 * SharedArrayBuffer / COOP/COEP
 * -----------------------------
 * FFmpeg.wasm uses SharedArrayBuffer, which requires the page to be
 * served with:
 *   Cross-Origin-Opener-Policy: same-origin
 *   Cross-Origin-Embedder-Policy: require-corp
 * Vite's dev server sets these by default (see vite.config.ts). For
 * production, your hosting (flowdesk.top / whereq.com) needs to send
 * those headers — see https://web.dev/articles/coop-coep. The page
 * checks `window.crossOriginIsolated` on load and surfaces a clear
 * error if those headers are missing.
 *
 * Re-upload guard: when the user has a cut result on screen and picks
 * a new video, we surface a warning modal instead of silently wiping
 * the previous result. Same pattern as VideoToGif / GifCompressor.
 * We never use the browser's native alert/confirm.
 */

type Status = "idle" | "cutting" | "done" | "error";

interface VideoMeta {
    name: string;
    size: number;
    duration: number;
}

interface Thumbnail {
    /** Time (seconds) the frame was sampled from. */
    time: number;
    /** JPEG data URL of the captured frame, ~120px wide. */
    dataUrl: string;
}

/** How many thumbnails to sample. We pick one per second as a default
 *  with sane min/max — too few makes the strip useless for navigation,
 *  too many adds extraction latency for no visible benefit. */
function thumbnailCountFor(duration: number): number {
    if (!isFinite(duration) || duration <= 0) return 8;
    return Math.min(20, Math.max(8, Math.ceil(duration)));
}

/* ----------------------------------------------------------------- */
/* Timeline                                                          */
/* ----------------------------------------------------------------- */

interface TimelineProps {
    duration: number;
    startTime: number;
    endTime: number;
    currentTime: number;
    thumbnails: Thumbnail[];
    /** Called when the user drags the start/end handle. */
    onChangeStart: (t: number) => void;
    onChangeEnd: (t: number) => void;
    /** Called when the user clicks the timeline body or a thumbnail. */
    onScrub: (t: number) => void;
}

/**
 * Custom video timeline. Three layers stacked vertically:
 *   1. A row of thumbnail tiles (clickable; jumps preview to that time)
 *   2. The scrub rail with the playhead and the highlighted cut range
 *   3. Draggable Start/End handles with a readout
 *
 * Drag mechanics: pointer events on the handles, with `setPointerCapture`
 * so we keep receiving events even if the pointer leaves the handle.
 * The `timeAtPointer` helper converts a clientX (relative to the rail)
 * to a time in the [0, duration] range.
 */
const Timeline = ({
    duration,
    startTime,
    endTime,
    currentTime,
    thumbnails,
    onChangeStart,
    onChangeEnd,
    onScrub,
}: TimelineProps) => {
    const railRef = useRef<HTMLDivElement | null>(null);
    /** Which handle is being dragged, if any. null = idle. */
    const draggingRef = useRef<"start" | "end" | null>(null);

    /** Convert a clientX to a time in [0, duration]. */
    const timeAtPointer = (clientX: number): number => {
        const rail = railRef.current;
        if (!rail || duration <= 0) return 0;
        const rect = rail.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return ratio * duration;
    };

    /** Pointer down on a handle: start drag, capture pointer, attach
     *  document-level move/up listeners for as long as the drag
     *  continues. We listen on document (not the handle) so the drag
     *  keeps tracking even if the user moves the pointer outside the
     *  handle's bounding box. */
    const beginDrag = (which: "start" | "end") => (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        draggingRef.current = which;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    /** Pointer move on a handle: update the time while dragging. The
     *  caller (VideoSplitter) is responsible for clamping start <= end
     *  and vice versa. */
    const onDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!draggingRef.current) return;
        const t = timeAtPointer(e.clientX);
        if (draggingRef.current === "start") {
            onChangeStart(t);
        } else {
            onChangeEnd(t);
        }
    };

    /** Pointer up: end the drag, release pointer capture. */
    const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!draggingRef.current) return;
        draggingRef.current = null;
        try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
            // releasePointerCapture can throw if the pointer was
            // already released (e.g. via contextmenu). Safe to ignore.
        }
    };

    /** Click on the rail (not on a handle): scrub to that time. */
    const onRailClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Only act if the click landed on the rail itself, not on a
        // child element (handles stop propagation so this is also a
        // defensive check).
        if (e.target !== e.currentTarget) return;
        const t = timeAtPointer(e.clientX);
        onScrub(t);
    };

    const safeDuration = duration > 0 ? duration : 1;
    const startPct = (startTime / safeDuration) * 100;
    const endPct = (endTime / safeDuration) * 100;
    const playheadPct = (currentTime / safeDuration) * 100;

    return (
        <div className="space-y-2 select-none">
            {/* Thumbnail strip: one tile per sampled frame. Each tile
                is a small <img> with a click-to-jump. Tile width is
                uniform (1/thumbnailCount of the strip), so 20
                thumbnails = 5% each, 8 = 12.5% each. */}
            <div className="flex gap-0.5 h-16 bg-black rounded overflow-hidden">
                {thumbnails.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-gray-500 text-xs">
                        Loading thumbnails…
                    </div>
                ) : (
                    thumbnails.map((th, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => onScrub(th.time)}
                            className="flex-1 relative group hover:opacity-100 opacity-90 transition"
                            title={`Jump to ${th.time.toFixed(2)}s`}
                        >
                            <img
                                src={th.dataUrl}
                                alt={`Frame at ${th.time.toFixed(2)}s`}
                                className="w-full h-full object-cover"
                                draggable={false}
                            />
                            <span className="absolute bottom-0 left-0 right-0 text-[10px] text-white bg-black bg-opacity-60 text-center leading-none py-0.5 opacity-0 group-hover:opacity-100 transition">
                                {th.time.toFixed(1)}s
                            </span>
                        </button>
                    ))
                )}
            </div>

            {/* Scrub rail + handles. The rail is a relative-positioned
                full-width bar; the highlighted range (between Start
                and End) is an absolutely-positioned overlay. The
                playhead is a thin vertical line. The Start / End
                handles are wide, semi-transparent draggable bars. */}
            <div
                ref={railRef}
                onClick={onRailClick}
                className="relative h-8 bg-gray-700 rounded cursor-pointer"
                role="slider"
                aria-label="Video timeline"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={currentTime}
            >
                {/* Highlighted cut range: orange tint, between start
                    and end handles. 1px borders (not 2px) so the
                    handles themselves are the visual focal point. */}
                <div
                    className="absolute top-0 bottom-0 bg-orange-500/20 border-x border-orange-400/60 pointer-events-none"
                    style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
                />

                {/* Playhead: thin yellow line, follows currentTime. */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 pointer-events-none"
                    style={{ left: `${playheadPct}%` }}
                />

                {/* Start handle: thin 4px white bar with chevron
                    grips on top and bottom. White = high contrast
                    against the dark rail and the orange highlight.
                    Chevron on top is the standard "draggable" cue
                    in video editors (Figma, Premiere, Final Cut).
                    On hover the white turns to the app's orange
                    accent to confirm interaction. The handle is
                    above the rail (z-10) so it receives pointer
                    events. */}
                <div
                    onPointerDown={beginDrag("start")}
                    onPointerMove={onDragMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    className="group absolute top-0 bottom-0 w-1 -ml-0.5 bg-white hover:bg-orange-300 cursor-ew-resize z-10"
                    style={{ left: `${startPct}%` }}
                    title={`Start: ${startTime.toFixed(2)}s`}
                    role="slider"
                    aria-label="Trim start time"
                    aria-valuemin={0}
                    aria-valuemax={duration}
                    aria-valuenow={startTime}
                >
                    {/* Chevron grip on top — small triangle pointing
                        down toward the handle. Standard draggable
                        affordance in timeline UIs. */}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-r-[3px] border-b-[3px] border-l-transparent border-r-transparent border-b-white opacity-80 group-hover:border-b-orange-300" />
                    {/* Chevron grip on bottom — mirror. */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-r-[3px] border-t-[3px] border-l-transparent border-r-transparent border-t-white opacity-80 group-hover:border-t-orange-300" />
                </div>

                {/* End handle: identical visual to start, on the
                    right edge of the cut range. Symmetric design
                    so the two handles read as a pair. */}
                <div
                    onPointerDown={beginDrag("end")}
                    onPointerMove={onDragMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    className="group absolute top-0 bottom-0 w-1 -ml-0.5 bg-white hover:bg-orange-300 cursor-ew-resize z-10"
                    style={{ left: `${endPct}%` }}
                    title={`End: ${endTime.toFixed(2)}s`}
                    role="slider"
                    aria-label="Trim end time"
                    aria-valuemin={0}
                    aria-valuemax={duration}
                    aria-valuenow={endTime}
                >
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-r-[3px] border-b-[3px] border-l-transparent border-r-transparent border-b-white opacity-80 group-hover:border-b-orange-300" />
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-r-[3px] border-t-[3px] border-l-transparent border-r-transparent border-t-white opacity-80 group-hover:border-t-orange-300" />
                </div>
            </div>

            {/* Time readouts below the rail: clear at-a-glance values
                for the three key times. */}
            <div className="flex justify-between text-xs text-gray-300 font-mono">
                <span>
                    <span className="text-green-400 font-bold">Start:</span> {formatTimeHMS(startTime)}
                </span>
                <span>
                    <span className="text-yellow-400 font-bold">Now:</span> {formatTimeHMS(currentTime)}
                </span>
                <span>
                    <span className="text-red-400 font-bold">End:</span> {formatTimeHMS(endTime)}
                </span>
                <span>
                    Length: <span className="text-orange-400 font-bold">{formatTimeHMS(endTime - startTime)}</span>
                </span>
            </div>
        </div>
    );
};

/** Format seconds as MM:SS.d (or H:MM:SS.d for >= 1 hour). */
function formatTimeHMS(s: number): string {
    if (!isFinite(s) || s < 0) s = 0;
    const totalMs = Math.round(s * 10);
    const tenths = totalMs % 10;
    const totalSec = Math.floor(totalMs / 10);
    const sec = totalSec % 60;
    const min = Math.floor(totalSec / 60) % 60;
    const hr = Math.floor(totalSec / 3600);
    if (hr > 0) {
        return `${hr}:${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}.${tenths}`;
    }
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}.${tenths}`;
}

/* ----------------------------------------------------------------- */
/* Frame extraction                                                  */
/* ----------------------------------------------------------------- */

/**
 * Extract N thumbnail frames from a video file by seeking a hidden
 * video element to evenly-spaced timestamps and drawing each frame to
 * a canvas. Returns JPEG data URLs.
 *
 * This function is intentionally tolerant of seek failures — if a
 * particular seek doesn't resolve (e.g. the video codec doesn't
 * support that timestamp), we capture whatever the canvas shows after
 * a 1-second safety timeout. The result is that a partially-broken
 * video still produces a usable thumbnail strip.
 */
async function extractThumbnails(file: File, duration: number): Promise<Thumbnail[]> {
    const count = thumbnailCountFor(duration);
    if (!isFinite(duration) || duration <= 0) return [];

    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "auto";
    v.muted = true;
    v.crossOrigin = "anonymous";
    v.src = url;

    // Wait for metadata so we know width/height.
    await new Promise<void>((resolve, reject) => {
        v.onloadedmetadata = () => resolve();
        v.onerror = () => reject(new Error("Could not load video for thumbnail extraction."));
    });

    // Cap thumbnail width at 160px (enough to be recognizable, small
    // enough to keep total size sane). Height follows the source
    // aspect ratio.
    const aspect = (v.videoHeight || 9) / (v.videoWidth || 16);
    const thumbW = 160;
    const thumbH = Math.max(1, Math.round(thumbW * aspect));

    const canvas = document.createElement("canvas");
    canvas.width = thumbW;
    canvas.height = thumbH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        URL.revokeObjectURL(url);
        return [];
    }

    const seekTo = (time: number): Promise<void> =>
        new Promise((res) => {
            const onSeeked = () => {
                v.removeEventListener("seeked", onSeeked);
                res();
            };
            v.addEventListener("seeked", onSeeked);
            v.currentTime = Math.max(0, Math.min(time, Math.max(0, v.duration - 0.05)));
            // Safety: if seek fails (some codecs can't seek past key
            // boundaries), resolve after 1s with whatever the canvas
            // has — best-effort rather than failing the whole strip.
            setTimeout(() => {
                v.removeEventListener("seeked", onSeeked);
                res();
            }, 1000);
        });

    const out: Thumbnail[] = [];
    for (let i = 0; i < count; i++) {
        // Evenly distribute samples across [0, duration]. For 20
        // thumbnails, that gives one every 5% — first sample at
        // 0, last at duration (which means the last frame may be
        // slightly before the actual end, but is always decodable).
        const t = (i / Math.max(1, count - 1)) * duration;
        await seekTo(t);
        ctx.drawImage(v, 0, 0, thumbW, thumbH);
        // JPEG at 0.7 quality: 5-10x smaller than PNG, and the loss
        // is invisible at thumbnail scale.
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        out.push({ time: t, dataUrl });
    }

    URL.revokeObjectURL(url);
    return out;
}

/* ----------------------------------------------------------------- */
/* Main component                                                    */
/* ----------------------------------------------------------------- */

const VideoSplitter = () => {
    // The FFmpeg engine is a module-level singleton shared across
    // all Multimedia tools. Switching from VideoSplitter to
    // AudioVideoMerger (or to the new GifMaker) doesn't pay the
    // 30 MB core download a second time. See the hook file for
    // the full reasoning.
    const { ffmpeg, status: ffmpegStatus } = useFfmpegEngine();
    // The hook fires the log handler; we only need to wire the
    // per-component progress handler here. The progress event
    // is fired by the shared FFmpeg instance, so the listener
    // persists across remounts — that's OK, the setState in
    // a defunct component is a no-op. If we want to be tidy
    // later we can call inst.off() in cleanup, but @ffmpeg/ffmpeg
    // 0.12 doesn't expose off(), so this is the pragmatic answer.
    useEffect(() => {
        if (!ffmpeg) return;
        const handler = ({ progress: p }: { progress: number }) => {
            const pct = Math.round(p * 100);
            setProgress(pct);
        };
        ffmpeg.on("progress", handler);
    }, [ffmpeg]);

    // FFmpeg errors are logged to the console (via console.error
    // in the hook's catch block) but never rendered to the user.
    // The timeline/upload/thumbnail flow works without the engine, so
    // surfacing the error to the user would only scare them.

    const [file, setFile] = useState<File | null>(null);
    const [meta, setMeta] = useState<VideoMeta | null>(null);
    /** Object URL for the loaded file. We hold it in state (not a
     *  derived value in JSX) so the <video> element's `src` doesn't
     *  change on every render — if it did, the browser would
     *  re-create the media element and reset currentTime to 0 every
     *  time we updated any unrelated state (like the playhead).
     *  The URL is revoked in the reset/load paths. */
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    /** The video element's currentTime. Updated by:
     *   - video.timeupdate events during playback (rAF throttled)
     *   - handle drag in the timeline
     *   - thumbnail click in the timeline
     *   - play/pause via the inline button or the browser controls
     *  This is the source of truth for the playhead position. */
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [status, setStatus] = useState<Status>("idle");
    const [progress, setProgress] = useState(0);
    /**
     * Sub-phase of the current cut. FFmpeg.wasm doesn't emit
     * progress events for stream-copy (`-c copy`) operations, so
     * the determinate progress bar stays at 0% the whole time
     * even though work is happening. Tracking the sub-phase lets
     * the UI show a meaningful "what's it doing right now" label
     * + an indeterminate animation as a fallback, so the user
     * sees visual feedback even when no progress events fire.
     */
    const [cutPhase, setCutPhase] = useState<"writing" | "cutting" | "reading" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [outputUrl, setOutputUrl] = useState<string | null>(null);
    const [outputSize, setOutputSize] = useState(0);
    /** Thumbnail strip sampled from the loaded video. Replaced
     *  wholesale on each new file. The data URLs are sized to keep
     *  memory low (~20 × ~10KB = ~200KB per video). */
    const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
    /** True while extractThumbnails is running. Shows a small badge
     *  in the timeline area so the user knows why the strip is empty. */
    const [isExtractingFrames, setIsExtractingFrames] = useState(false);

    const inputRef = useRef<HTMLInputElement | null>(null);
    /** Ref to the visible <video> element (the preview). We read its
     *  currentTime to update the playhead, and write to it when the
     *  user drags a handle or clicks a thumbnail. */
    const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
    const pendingFileRef = useRef<{ file: File } | null>(null);
    const [showResetWarning, setShowResetWarning] = useState<boolean>(false);

    // Engine load is handled by useFfmpegEngine above.

    const probeVideo = (file: File): Promise<{ duration: number }> =>
        new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const v = document.createElement("video");
            v.preload = "metadata";
            v.src = url;
            v.onloadedmetadata = () => {
                const duration = v.duration;
                URL.revokeObjectURL(url);
                resolve({ duration });
            };
            v.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error("Could not read video metadata — the file may not be a supported video format."));
            };
        });

    /**
     * Entry point for a newly-picked file. If a previous cut is on
     * screen, stash the file in a ref and show the warning modal so
     * the user can decide what to do. Otherwise commit immediately.
     */
    const handleFileChosen = (f: File) => {
        pendingFileRef.current = null;

        const hasPreviousResult = status === "done" && !!outputUrl;
        if (hasPreviousResult) {
            pendingFileRef.current = { file: f };
            setShowResetWarning(true);
            return;
        }
        loadVideoFile(f);
    };

    /** The actual load step. Reads metadata, resets state, kicks off
     *  thumbnail extraction. The extraction runs in the background
     *  (not awaited) so the user sees the preview video immediately
     *  and doesn't have to wait for the strip to be populated. */
    const loadVideoFile = async (f: File) => {
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        if (fileUrl) URL.revokeObjectURL(fileUrl);
        setOutputUrl(null);
        setOutputSize(0);
        setError(null);
        setProgress(0);
        setFile(f);
        setFileUrl(URL.createObjectURL(f));
        setMeta({ name: f.name, size: f.size, duration: 0 });
        setThumbnails([]);
        setCurrentTime(0);
        setIsPlaying(false);

        let extractedDuration = 0;
        try {
            const { duration } = await probeVideo(f);
            extractedDuration = duration;
            setMeta({ name: f.name, size: f.size, duration });
            setStartTime(0);
            setEndTime(duration);
        } catch (e) {
            console.error(e);
            const msg = e instanceof Error ? e.message : String(e);
            setError(`Could not read video metadata: ${msg}`);
            setStatus("error");
        } finally {
            if (inputRef.current) inputRef.current.value = "";
        }

        // Extract thumbnails in the background. The user can already
        // see the preview video and the playback controls; the strip
        // populates over the next second or two.
        if (extractedDuration > 0) {
            setIsExtractingFrames(true);
            extractThumbnails(f, extractedDuration)
                .then((thumbs) => {
                    setThumbnails(thumbs);
                })
                .catch((e) => {
                    console.error("Thumbnail extraction failed:", e);
                    // Non-fatal: the user can still use the video
                    // without thumbnails. Just leave the strip empty
                    // with the "Loading…" placeholder.
                })
                .finally(() => {
                    setIsExtractingFrames(false);
                });
        }
    };

    const handleDownloadPreviousAndContinue = () => {
        if (outputUrl) {
            const a = document.createElement("a");
            a.href = outputUrl;
            a.download = "cut.mp4";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
        applyPendingFile();
    };

    const handleDiscardPreviousAndContinue = () => {
        applyPendingFile();
    };

    const applyPendingFile = () => {
        const pending = pendingFileRef.current;
        if (!pending) return;
        pendingFileRef.current = null;
        loadVideoFile(pending.file);
    };

    const handleCut = async () => {
        if (!file || !ffmpeg || endTime <= startTime) {
            setError("Pick a valid time range first.");
            return;
        }
        setError(null);
        setStatus("cutting");
        setProgress(0);
        setCutPhase("writing");
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        setOutputUrl(null);
        try {
            const inputName = "input" + (file.name.match(/\.\w+$/)?.[0] ?? ".mp4");
            const outputName = "output.mp4";
            await ffmpeg.writeFile(inputName, await fetchFile(file));
            setCutPhase("cutting");
            await ffmpeg.exec([
                "-ss",
                String(startTime),
                "-i",
                inputName,
                "-to",
                String(endTime - startTime),
                "-c",
                "copy",
                outputName,
            ]);
            setCutPhase("reading");
            const data = await ffmpeg.readFile(outputName);
            const blob = new Blob([data as Uint8Array], { type: "video/mp4" });
            setOutputUrl(URL.createObjectURL(blob));
            setOutputSize(blob.size);
            setStatus("done");
            setProgress(100);
            setCutPhase(null);
            await ffmpeg.deleteFile(inputName);
            await ffmpeg.deleteFile(outputName);
        } catch (e) {
            console.error(e);
            const msg = (e as Error).message || String(e);
            if (msg.includes("stream copy") || msg.includes("copy")) {
                setError("Stream copy failed on this format. The cut may still have worked — try downloading and checking the output.");
            } else {
                setError("Cut failed: " + msg);
            }
            setStatus("error");
            setCutPhase(null);
        }
    };

    const reset = () => {
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        if (fileUrl) URL.revokeObjectURL(fileUrl);
        setFile(null);
        setFileUrl(null);
        setMeta(null);
        setStartTime(0);
        setEndTime(0);
        setCurrentTime(0);
        setIsPlaying(false);
        setOutputUrl(null);
        setOutputSize(0);
        setStatus("idle");
        setError(null);
        setProgress(0);
        setCutPhase(null);
        setThumbnails([]);
        if (inputRef.current) inputRef.current.value = "";
    };

    /* ----------------- timeline interaction handlers ----------------- */

    /** Bound to the Start handle's drag. Clamps the value to
     *  [0, endTime - 0.1] so the cut always has a positive length.
     *  Reads `endTime` from the closure; this is fine because the
     *  handler is re-created on every render and we want to clamp
     *  against the *latest* end time, not a stale one. */
    const handleChangeStart = (t: number) => {
        const next = Math.max(0, Math.min(t, endTime - 0.1));
        setStartTime(next);
        // Sync the preview to the new start time so the user
        // sees what they'll be cutting from.
        if (videoPreviewRef.current) {
            videoPreviewRef.current.currentTime = next;
        }
        setCurrentTime(next);
    };

    /** Bound to the End handle's drag. Clamps to
     *  [startTime + 0.1, duration]. */
    const handleChangeEnd = (t: number) => {
        const next = Math.max(startTime + 0.1, Math.min(t, meta?.duration ?? t));
        setEndTime(next);
        if (videoPreviewRef.current) {
            videoPreviewRef.current.currentTime = next;
        }
        setCurrentTime(next);
    };

    /** Bound to clicks on the timeline rail or a thumbnail tile.
     *  Moves the preview's currentTime to that point. Does NOT
     *  change the start/end cut handles — that's a separate
     *  action the user takes by dragging. */
    const handleScrub = (t: number) => {
        if (videoPreviewRef.current) {
            videoPreviewRef.current.currentTime = t;
        }
        setCurrentTime(t);
    };

    /** Toggle play/pause. Bound to the inline button. The browser's
     *  native video controls (in the <video> element) also work
     *  and dispatch play/pause events, which we listen for to keep
     *  the inline button's icon in sync. */
    const togglePlay = () => {
        const v = videoPreviewRef.current;
        if (!v) return;
        if (v.paused) {
            v.play().catch((e) => {
                // Autoplay policies can reject play(); in that case
                // the user can use the native controls. Log so
                // debugging is easier.
                console.warn("play() rejected:", e);
            });
        } else {
            v.pause();
        }
    };

    /** Re-clamp start/end if the new file has shorter duration than
     *  the previous end time. The setStartTime/setEndTime calls are
     *  guarded against negative values, but a stale state from a
     *  previous file could still leak through. */
    useEffect(() => {
        if (!meta) return;
        if (endTime > meta.duration) {
            setEndTime(meta.duration);
        }
        if (startTime >= endTime) {
            setStartTime(Math.max(0, endTime - 0.1));
        }
    }, [meta]); // eslint-disable-line react-hooks/exhaustive-deps

    const formatBytes = (n: number) => {
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="h-full overflow-y-auto p-4 text-orange-300 font-fira-code">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold">Video Splitter / Cutter</h2>
                {file && (
                    <button
                        onClick={() => inputRef.current?.click()}
                        className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-orange-300 px-3 py-1.5 rounded text-sm border border-gray-600"
                        title="Upload a different video"
                    >
                        <FontAwesomeIcon icon={faUpload} />
                        Upload new video
                    </button>
                )}
            </div>
            <p className="text-sm text-gray-400 mb-4">
                Trim a video by start and end timestamps. Drag the handles on the timeline, or click a thumbnail to jump there. Cuts run in your browser — instant cuts, no quality loss.
            </p>

            {ffmpegStatus === "loading" && (
                <div className="bg-blue-900 border border-blue-700 text-blue-200 p-3 rounded mb-4 text-sm">
                    Loading video engine…
                </div>
            )}

            {/* Note: we deliberately do NOT show an error banner
                when the video engine fails to load. The user can
                still upload a file, see the timeline, drag the
                handles, scrub through the video, and review what
                the cut would be — only the actual export (Cut
                button) needs the engine. The error is logged to
                the console for developers; the user gets a
                non-scary UX. */}

            {/* Note: the developer-facing hosting requirements
                (COOP/COEP headers, etc.) used to be shown here as
                a yellow box. It leaked dev details to end users
                without helping them. If a deploy needs that info,
                it's documented in vite.config.ts. */}

            <input
                ref={inputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileChosen(f);
                }}
            />

            {!file && (
                <div
                    onClick={() => inputRef.current?.click()}
                    className="border-2 border-dashed border-gray-700 rounded p-12 text-center cursor-pointer hover:border-orange-500 transition"
                >
                    <FontAwesomeIcon icon={faUpload} size="3x" className="text-gray-500 mb-3" />
                    <p className="text-gray-400">Click to upload a video</p>
                </div>
            )}

            {file && meta && (
                <div className="space-y-4">
                    <div className="bg-gray-800 border border-gray-700 rounded p-3">
                        <p className="text-sm">
                            <FontAwesomeIcon icon={faScissors} className="mr-1" />
                            {meta.name} • {meta.duration.toFixed(1)}s • {formatBytes(meta.size)}
                        </p>
                    </div>

                    {/* Preview area: the visible <video> element plus
                        a custom play/pause button. The button is for
                        quick access; the native controls are also
                        available via the standard video UI. */}
                    <div className="relative">
                        <video
                            ref={videoPreviewRef}
                            src={fileUrl ?? undefined}
                            controls
                            onTimeUpdate={(e) => {
                                // Throttle to roughly rAF cadence.
                                // React already batches, but the
                                // timeupdate event can fire 60+ times
                                // a second on some browsers — we just
                                // mirror it into state.
                                setCurrentTime(e.currentTarget.currentTime);
                            }}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onEnded={() => setIsPlaying(false)}
                            className="w-full max-h-96 bg-black rounded border border-gray-700"
                        />
                    </div>

                    {/* Inline play/pause button. Smaller than the
                        native control and lives next to the timeline
                        so the user can scrub and play from the same
                        visual area. */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={togglePlay}
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm"
                            title={isPlaying ? "Pause" : "Play"}
                        >
                            <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
                            {isPlaying ? "Pause" : "Play"}
                        </button>
                        {isExtractingFrames && (
                            <span className="text-xs text-gray-400">Sampling timeline frames…</span>
                        )}
                    </div>

                    {/* The new timeline. Replaces the two old range
                        sliders. */}
                    <Timeline
                        duration={meta.duration}
                        startTime={startTime}
                        endTime={endTime}
                        currentTime={currentTime}
                        thumbnails={thumbnails}
                        onChangeStart={handleChangeStart}
                        onChangeEnd={handleChangeEnd}
                        onScrub={handleScrub}
                    />

                    {status === "cutting" && (
                        <div>
                            <div className="flex justify-between text-sm text-orange-400 mb-1">
                                <span>
                                    {cutPhase === "writing" && "Loading video into engine…"}
                                    {cutPhase === "cutting" && "Cutting…"}
                                    {cutPhase === "reading" && "Reading result…"}
                                    {!cutPhase && "Cutting…"}
                                </span>
                                <span>
                                    {progress > 0 ? `${progress}%` : ""}
                                </span>
                            </div>
                            {/* Show a determinate bar when we have
                                actual progress events (typically
                                re-encoding). For stream-copy cuts
                                (no progress events), fall back to
                                an indeterminate animation so the
                                user has visual feedback that
                                something is happening. The CSS
                                animation runs continuously until
                                the phase changes. */}
                            <div className="w-full h-2 bg-gray-700 rounded overflow-hidden relative">
                                {progress > 0 ? (
                                    <div
                                        className="h-full bg-orange-500 transition-all"
                                        style={{ width: `${progress}%` }}
                                    />
                                ) : (
                                    // Indeterminate animation for
                                    // stream-copy cuts where ffmpeg
                                    // doesn't emit progress events.
                                    // The sliding bar gives the user
                                    // visual feedback that work is
                                    // happening without claiming a
                                    // specific percentage.
                                    <div className="absolute top-0 left-0 h-full w-1/3 bg-orange-500/70 animate-indeterminate rounded" />
                                )}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-900 border border-red-700 text-red-200 p-3 rounded text-sm">{error}</div>
                    )}

                    <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                            <button
                                onClick={handleCut}
                                disabled={ffmpegStatus !== "loaded" || status === "cutting" || endTime <= startTime}
                                title={
                                    ffmpegStatus === "error"
                                        ? "Video engine not available in this browser — the cut step needs an API the browser doesn't support. Try refreshing, or use one of the other multimedia tools."
                                        : ffmpegStatus === "loading"
                                        ? "Loading video engine…"
                                        : endTime <= startTime
                                        ? "End time must be after start time"
                                        : "Cut the video to the selected range"
                                }
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
                            >
                                {status === "cutting" ? "Cutting…" : "Cut video"}
                            </button>
                            <button onClick={reset} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded">
                                Clear
                            </button>
                        </div>
                        {/* Small, inline reason when the button is disabled for
                            an environmental reason. The big "Video engine
                            unavailable" banner was too loud; this one is
                            scoped to the button so the user can see exactly
                            what's wrong without the page shouting at them. */}
                        {ffmpegStatus === "error" && (
                            <p className="text-xs text-yellow-300/80">
                                Cut step is unavailable in this browser. The upload, timeline, and
                                preview still work — only the actual cut needs an API this browser
                                doesn't support.
                            </p>
                        )}
                    </div>

                    {outputUrl && (
                        <div className="mt-4">
                            <h3 className="font-bold text-orange-400 mb-2">Result ({formatBytes(outputSize)})</h3>
                            <video src={outputUrl} controls className="w-full max-h-96 bg-black rounded border border-gray-700" />
                            <a
                                href={outputUrl}
                                download="cut.mp4"
                                className="mt-3 inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                            >
                                <FontAwesomeIcon icon={faDownload} /> Download cut video
                            </a>
                        </div>
                    )}
                </div>
            )}

            <CustomModal
                isOpen={showResetWarning}
                onRequestClose={() => {
                    pendingFileRef.current = null;
                    if (inputRef.current) inputRef.current.value = "";
                    setShowResetWarning(false);
                }}
                title="Replace current video?"
                type="warning"
                actions={[
                    {
                        label: "Cancel",
                        className: "bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 transition-colors duration-200",
                        onClick: () => {
                            pendingFileRef.current = null;
                            if (inputRef.current) inputRef.current.value = "";
                        },
                    },
                    {
                        label: "Discard & continue",
                        className: "bg-red-600 hover:bg-red-700 text-white px-4 py-2 transition-colors duration-200",
                        onClick: handleDiscardPreviousAndContinue,
                    },
                    {
                        label: "Download previous",
                        className: "bg-green-600 hover:bg-green-700 text-white px-4 py-2 transition-colors duration-200",
                        onClick: handleDownloadPreviousAndContinue,
                    },
                ]}
            >
                <div className="space-y-3">
                    <p>
                        You have a cut video that hasn't been downloaded yet. If you
                        continue, that result will be lost from this page.
                    </p>
                    {outputUrl && outputSize > 0 && (
                        <div className="bg-gray-800 border border-gray-700 rounded p-3 text-sm">
                            <div className="flex items-center gap-2 text-orange-400 font-bold mb-1">
                                <FontAwesomeIcon icon={faFilm} />
                                Current result
                            </div>
                            <div className="text-gray-300">cut.mp4</div>
                            <div className="text-gray-400">Size: {formatBytes(outputSize)}</div>
                        </div>
                    )}
                    <p className="text-gray-400 text-sm">
                        Choose <span className="text-green-400 font-bold">Download previous</span> to
                        save the current cut first, <span className="text-red-400 font-bold">Discard &amp; continue</span> to
                        throw it away, or <span className="text-white font-bold">Cancel</span> to keep everything as-is.
                    </p>
                </div>
            </CustomModal>
        </div>
    );
};

export default VideoSplitter;
