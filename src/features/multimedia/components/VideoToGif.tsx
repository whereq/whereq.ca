import { useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faUpload,
    faDownload,
    faFilm,
} from "@fortawesome/free-solid-svg-icons";
// @ts-expect-error - gif.js has no types
import GIF from "gif.js";
import CustomModal from "@/components/modals/CustomModal";

/**
 * Video to GIF
 *
 * Decodes frames from a <video> element by seeking to timestamps and
 * drawing onto a canvas, then encodes the captured frames into a GIF
 * using gif.js (LZW encoder in a Web Worker — won't block the UI).
 *
 * Performance: a 5-second clip at 10 fps takes ~10–20 seconds to encode
 * on a typical laptop. The "every Nth frame" slider trades smoothness
 * for speed. Maximum output size is capped at 480px wide to keep GIFs
 * shareable; larger GIFs are scaled down to fit.
 *
 * Re-upload guard: when the user has a successful conversion on screen
 * and picks a new video (or hits the re-upload button), we surface a
 * warning modal instead of silently wiping the previous result. The
 * modal gives three explicit actions — "Download previous" (save it
 * first, then load the new video), "Discard" (load the new video
 * immediately, the old GIF URL is revoked), or "Cancel" (keep
 * everything as-is). We never use the browser's native alert/confirm.
 */

type Status = "idle" | "ready" | "encoding" | "done" | "error";

interface VideoMeta {
    name: string;
    size: number;
    width: number;
    height: number;
    duration: number;
}

/** State captured when a file is picked but the user hasn't decided
 *  what to do with the previous result yet. Held in a ref so the pick
 *  handler can read it from a callback that fires before the state
 *  update. */
interface PendingFile {
    file: File;
    objectUrl: string;
}

const VideoToGif = () => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    /** File the user just picked but hasn't been committed yet (because
     *  we're showing a "previous result will be lost" prompt). */
    const pendingFileRef = useRef<PendingFile | null>(null);

    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [meta, setMeta] = useState<VideoMeta | null>(null);
    const [gifUrl, setGifUrl] = useState<string | null>(null);
    const [gifSize, setGifSize] = useState<number>(0);
    const [progress, setProgress] = useState<number>(0);
    const [status, setStatus] = useState<Status>("idle");
    const [error, setError] = useState<string | null>(null);
    const [fps, setFps] = useState<number>(10);
    const [startTime, setStartTime] = useState<number>(0);
    const [endTime, setEndTime] = useState<number>(0);
    const [maxWidth, setMaxWidth] = useState<number>(480);
    /** True when the warning modal is open. */
    const [showResetWarning, setShowResetWarning] = useState<boolean>(false);

    /**
     * Fully resets the component back to the empty state, revoking
     * any outstanding object URLs. Called when the user picks a new
     * video after discarding (or downloading) the previous one.
     */
    const resetForNewVideo = (file: File, objectUrl: string) => {
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        if (gifUrl) URL.revokeObjectURL(gifUrl);
        setGifUrl(null);
        setGifSize(0);
        setStatus("idle");
        setError(null);
        setProgress(0);
        setStartTime(0);
        setEndTime(0);
        setVideoUrl(objectUrl);
        setMeta({ name: file.name, size: file.size, width: 0, height: 0, duration: 0 });
        if (inputRef.current) inputRef.current.value = "";
    };

    /**
     * Entry point when the user picks a file via the hidden <input>.
     * If there's no previous result, commit immediately. If there IS
     * a previous result, stash the file in a ref and show the warning
     * modal so the user can decide what to do.
     */
    const handleFileChosen = (file: File) => {
        // If a previous file pick is still pending in the ref, revoke
        // its blob URL — it's been superseded by this new pick. The
        // user will see the new file's details in the warning modal.
        if (pendingFileRef.current) {
            URL.revokeObjectURL(pendingFileRef.current.objectUrl);
            pendingFileRef.current = null;
        }
        const objectUrl = URL.createObjectURL(file);
        const hasPreviousResult = status === "done" && !!gifUrl;
        if (hasPreviousResult) {
            pendingFileRef.current = { file, objectUrl };
            setShowResetWarning(true);
            return;
        }
        resetForNewVideo(file, objectUrl);
    };

    /**
     * User picked "Download previous" in the warning modal: trigger a
     * browser download of the existing GIF (so they can keep it), then
     * load the new file. The download is dispatched from a click on a
     * hidden <a> — standard browser pattern, no prompts.
     */
    const handleDownloadPreviousAndContinue = () => {
        if (gifUrl && pendingFileRef.current) {
            const a = document.createElement("a");
            a.href = gifUrl;
            a.download = "output.gif";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
        applyPendingFile();
    };

    /** User picked "Discard" in the warning modal: just load the new
     *  file. The previous GIF URL is revoked inside resetForNewVideo. */
    const handleDiscardPreviousAndContinue = () => {
        applyPendingFile();
    };

    const applyPendingFile = () => {
        const pending = pendingFileRef.current;
        if (!pending) return;
        resetForNewVideo(pending.file, pending.objectUrl);
        pendingFileRef.current = null;
    };

    const onVideoMeta = () => {
        const v = videoRef.current;
        if (!v || !meta) return;
        setMeta({ ...meta, width: v.videoWidth, height: v.videoHeight, duration: v.duration });
        setStartTime(0);
        setEndTime(Math.min(v.duration, 5));
    };

    const seekTo = (time: number): Promise<void> =>
        new Promise((res) => {
            const v = videoRef.current!;
            const onSeeked = () => {
                v.removeEventListener("seeked", onSeeked);
                res();
            };
            v.addEventListener("seeked", onSeeked);
            v.currentTime = Math.max(0, Math.min(time, v.duration));
            // Safety: if seek fails, resolve after 1s
            setTimeout(() => {
                v.removeEventListener("seeked", onSeeked);
                res();
            }, 1000);
        });

    const handleEncode = async () => {
        const v = videoRef.current;
        const c = canvasRef.current;
        if (!v || !c || !meta || endTime <= startTime) {
            setError("Pick a valid time range first.");
            setStatus("error");
            return;
        }
        setError(null);
        setStatus("encoding");
        setProgress(0);
        setGifUrl(null);

        try {
            const outputW = Math.min(meta.width, maxWidth);
            const outputH = Math.round((outputW / meta.width) * meta.height);
            c.width = outputW;
            c.height = outputH;
            const ctx = c.getContext("2d")!;
            const frameDelayMs = 1000 / fps;
            const frames: { data: Uint8ClampedArray; delay: number }[] = [];

            // Capture frames by seeking through the video
            const totalFrames = Math.max(1, Math.floor((endTime - startTime) * fps));
            for (let i = 0; i < totalFrames; i++) {
                const t = startTime + i / fps;
                await seekTo(t);
                ctx.drawImage(v, 0, 0, outputW, outputH);
                const imageData = ctx.getImageData(0, 0, outputW, outputH);
                frames.push({ data: imageData.data, delay: frameDelayMs });
                setProgress(Math.round(((i + 1) / totalFrames) * 50));
            }

            // Encode with gif.js
            const gif = new GIF({
                workers: 2,
                quality: 10,
                width: outputW,
                height: outputH,
                workerScript: "/gif.worker.js",
            });

            frames.forEach((f) => {
                // gif.js wants an ImageData-like object
                const imgData = new ImageData(new Uint8ClampedArray(f.data), outputW, outputH);
                gif.addFrame(imgData, { delay: f.delay });
            });

            gif.on("progress", (p: number) => {
                setProgress(50 + Math.round(p * 50));
            });
            gif.on("finished", (blob: Blob) => {
                setGifUrl(URL.createObjectURL(blob));
                setGifSize(blob.size);
                setProgress(100);
                setStatus("done");
            });
            gif.render();
        } catch (e) {
            console.error(e);
            setError("Encoding failed: " + (e as Error).message);
            setStatus("error");
        }
    };

    const formatBytes = (n: number) => {
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="h-full overflow-y-auto p-4 text-orange-300 font-fira-code">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold">Video to GIF</h2>
                {/* Re-upload button: always visible once any video is
                    loaded. Pushing the same hidden input so the user
                    can re-pick without reloading the page. */}
                {videoUrl && (
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
                Convert short video clips to animated GIFs — runs entirely in your browser, no upload.
            </p>

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

            {!videoUrl && (
                <div
                    onClick={() => inputRef.current?.click()}
                    className="border-2 border-dashed border-gray-700 rounded p-12 text-center cursor-pointer hover:border-orange-500 transition"
                >
                    <FontAwesomeIcon icon={faUpload} size="3x" className="text-gray-500 mb-3" />
                    <p className="text-gray-400">Click to upload a video (MP4, WebM, MOV…)</p>
                </div>
            )}

            {videoUrl && meta && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            controls
                            onLoadedMetadata={onVideoMeta}
                            className="w-full max-h-96 bg-black rounded border border-gray-700"
                        />
                        <p className="text-sm text-gray-400 mt-2">
                            <FontAwesomeIcon icon={faFilm} className="mr-1" />
                            {meta.name} • {meta.width}×{meta.height} • {meta.duration.toFixed(1)}s • {formatBytes(meta.size)}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm mb-1">Start: {startTime.toFixed(2)}s</label>
                            <input
                                type="range"
                                min="0"
                                max={meta.duration || 1}
                                step="0.1"
                                value={startTime}
                                onChange={(e) => setStartTime(Math.min(Number(e.target.value), endTime))}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm mb-1">End: {endTime.toFixed(2)}s</label>
                            <input
                                type="range"
                                min="0"
                                max={meta.duration || 1}
                                step="0.1"
                                value={endTime}
                                onChange={(e) => setEndTime(Math.max(Number(e.target.value), startTime))}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm mb-1">Frames per second: {fps}</label>
                            <input type="range" min="1" max="24" value={fps} onChange={(e) => setFps(Number(e.target.value))} className="w-full" />
                        </div>
                        <div>
                            <label className="block text-sm mb-1">Max width: {maxWidth}px</label>
                            <input type="range" min="120" max="960" step="20" value={maxWidth} onChange={(e) => setMaxWidth(Number(e.target.value))} className="w-full" />
                        </div>

                        {status === "encoding" && (
                            <div>
                                <div className="flex justify-between text-sm text-orange-400 mb-1">
                                    <span>Encoding…</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="w-full h-2 bg-gray-700 rounded overflow-hidden">
                                    <div className="h-full bg-orange-500 transition-all" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-900 border border-red-700 text-red-200 p-3 rounded text-sm">{error}</div>
                        )}

                        <button
                            onClick={handleEncode}
                            disabled={status === "encoding" || endTime <= startTime}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
                        >
                            {status === "encoding" ? "Encoding…" : "Convert to GIF"}
                        </button>
                    </div>

                    {gifUrl && (
                        <div className="lg:col-span-2 mt-4">
                            <h3 className="font-bold text-orange-400 mb-2">Result ({formatBytes(gifSize)})</h3>
                            <div className="border border-gray-700 rounded p-2 bg-gray-800">
                                <img src={gifUrl} alt="GIF" className="max-w-full mx-auto" />
                            </div>
                            <a
                                href={gifUrl}
                                download="output.gif"
                                className="mt-3 inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                            >
                                <FontAwesomeIcon icon={faDownload} /> Download GIF
                            </a>
                        </div>
                    )}
                </div>
            )}

            <canvas ref={canvasRef} className="hidden" />

            {/* Warning modal: shown when the user picks a new video
                while a successful result is still on screen. Uses the
                reusable CustomModal with the new `warning` type and
                the new `actions` array (three explicit choices, not
                a single OK button). */}
            <CustomModal
                isOpen={showResetWarning}
                onRequestClose={() => {
                    // The "Cancel" path goes through here: just throw
                    // away the stashed file and close the modal.
                    if (pendingFileRef.current) {
                        URL.revokeObjectURL(pendingFileRef.current.objectUrl);
                        pendingFileRef.current = null;
                    }
                    if (inputRef.current) inputRef.current.value = "";
                    setShowResetWarning(false);
                }}
                title="Replace current video?"
                type="warning"
                actions={[
                    {
                        label: "Cancel",
                        className:
                            "bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 transition-colors duration-200",
                        onClick: () => {
                            if (pendingFileRef.current) {
                                URL.revokeObjectURL(pendingFileRef.current.objectUrl);
                                pendingFileRef.current = null;
                            }
                            if (inputRef.current) inputRef.current.value = "";
                        },
                    },
                    {
                        label: "Discard & continue",
                        className:
                            "bg-red-600 hover:bg-red-700 text-white px-4 py-2 transition-colors duration-200",
                        onClick: handleDiscardPreviousAndContinue,
                    },
                    {
                        label: "Download previous",
                        className:
                            "bg-green-600 hover:bg-green-700 text-white px-4 py-2 transition-colors duration-200",
                        onClick: handleDownloadPreviousAndContinue,
                    },
                ]}
            >
                <div className="space-y-3">
                    <p>
                        You have a converted GIF that hasn't been downloaded yet. If you
                        continue, that result will be lost from this page.
                    </p>
                    {gifUrl && gifSize > 0 && (
                        <div className="bg-gray-800 border border-gray-700 rounded p-3 text-sm">
                            <div className="flex items-center gap-2 text-orange-400 font-bold mb-1">
                                <FontAwesomeIcon icon={faFilm} />
                                Current result
                            </div>
                            <div className="text-gray-300">output.gif</div>
                            <div className="text-gray-400">Size: {formatBytes(gifSize)}</div>
                        </div>
                    )}
                    <p className="text-gray-400 text-sm">
                        Choose <span className="text-green-400 font-bold">Download previous</span> to
                        save the current GIF first, <span className="text-red-400 font-bold">Discard &amp; continue</span> to
                        throw it away, or <span className="text-white font-bold">Cancel</span> to keep everything as-is.
                    </p>
                </div>
            </CustomModal>
        </div>
    );
};

export default VideoToGif;
