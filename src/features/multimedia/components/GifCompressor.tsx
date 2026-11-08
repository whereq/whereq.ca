import { useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload, faDownload, faImage } from "@fortawesome/free-solid-svg-icons";
// @ts-expect-error - gif.js has no types
import GIF from "gif.js";
// @ts-expect-error - gifuct-js has no first-class types
import { parseGIF, decompressFrames } from "gifuct-js";
import CustomModal from "@/components/modals/CustomModal";

/**
 * GIF Compressor
 *
 * Decodes every frame of an input GIF with gifuct-js (a pure-JS LZW
 * decoder), then re-encodes with gif.js at a lower color quality /
 * smaller dimensions. Three knobs:
 *   - Scale: downsample the GIF (linear scaling).
 *   - Frame skip: drop every Nth frame (e.g., 2 = keep half the frames).
 *   - Quality: gif.js quality parameter (1 = best, 20 = worst, default 10).
 *
 * Output size is unpredictable, but typically halves for scale=50 or
 * frameSkip=2, and halves again for quality=20.
 *
 * Re-upload guard: when the user has a compressed result on screen
 * and picks a new GIF (or hits the re-upload button), we surface a
 * warning modal instead of silently wiping the previous result. Same
 * pattern as VideoToGif — see that file for the full UX rationale.
 * We never use the browser's native alert/confirm.
 */

type Status = "idle" | "decoding" | "encoding" | "done" | "error";

interface GifMeta {
    name: string;
    size: number;
    width: number;
    height: number;
    frameCount: number;
}

/** Decoded frame shape from gifuct-js. We only use a subset of the
 *  fields, but the type is wide so any future field we need (e.g.
 *  `disposalType === 3` for "restore to previous") is already there. */
interface DecodedFrame {
    dims: { width: number; height: number; top: number; left: number };
    patch: Uint8ClampedArray;
    delay: number;
    disposalType: number;
}

/** Holds the decoded frames + dimensions between the file-pick step
 *  (which decodes) and the compress step (which re-encodes). Stored
 *  in a useRef — frames are large and we don't want them in React
 *  state, which would trigger re-renders on every assignment. */
interface DecodeCache {
    frames?: DecodedFrame[];
    width?: number;
    height?: number;
}

const GifCompressor = () => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    /** Module-level non-reactive cache. Decoded frames can be tens of
     *  MB; we never want them in React state, just held across the
     *  pick → compress → reset lifecycle. */
    const decodeCacheRef = useRef<DecodeCache>({});

    const [originalMeta, setOriginalMeta] = useState<GifMeta | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [resultSize, setResultSize] = useState<number>(0);
    const [progress, setProgress] = useState<number>(0);
    const [status, setStatus] = useState<Status>("idle");
    const [error, setError] = useState<string | null>(null);
    const [scale, setScale] = useState<number>(100);
    const [frameSkip, setFrameSkip] = useState<number>(1);
    const [quality, setQuality] = useState<number>(10);
    /** True when the "previous result will be lost" warning modal is
     *  open. The pending file is held in a ref to avoid React state
     *  update timing issues (the input change handler can fire
     *  before any state we set here is visible to the modal). */
    const [showResetWarning, setShowResetWarning] = useState<boolean>(false);
    const pendingFileRef = useRef<{ file: File; objectUrl: string } | null>(null);

    /**
     * Entry point for a newly-picked file. If a previous compressed
     * result is on screen, stash the file in a ref and show the
     * warning modal so the user can decide what to do. Otherwise
     * commit immediately.
     */
    const handleFileChosen = (file: File) => {
        // If a previous pick is still pending in the ref, revoke its
        // blob URL — it has been superseded by this new pick. Avoids
        // leaking the first one if the user changes their mind.
        if (pendingFileRef.current) {
            URL.revokeObjectURL(pendingFileRef.current.objectUrl);
            pendingFileRef.current = null;
        }
        const objectUrl = URL.createObjectURL(file);
        const hasPreviousResult = status === "done" && !!resultUrl;
        if (hasPreviousResult) {
            pendingFileRef.current = { file, objectUrl };
            setShowResetWarning(true);
            return;
        }
        decodeFile(file);
    };

    /**
     * The actual decode step. Reads the file, runs gifuct-js, and
     * stores the result in decodeCacheRef. Sets status to "idle"
     * (ready for compress) on success, "error" otherwise.
     */
    const decodeFile = async (file: File) => {
        // Wipe any previous state up front, so the user sees the
        // "decoding..." state immediately, not the old result.
        if (resultUrl) URL.revokeObjectURL(resultUrl);
        setResultUrl(null);
        setResultSize(0);
        setError(null);
        setProgress(0);
        setStatus("decoding");
        setOriginalMeta({ name: file.name, size: file.size, width: 0, height: 0, frameCount: 0 });
        decodeCacheRef.current = {};

        try {
            const buf = await file.arrayBuffer();
            const gif = parseGIF(buf);
            // gifuct-js's TS types claim `decompressFrames(gif, true)`
            // returns `ParsedFrame[]` (without `patch`) even though the
            // second arg means "return patches". The runtime actually
            // does include `patch` — that's the whole point of `true`.
            // We cast through `unknown` to silence the type error
            // without lying to ourselves about the cast.
            const frames = decompressFrames(gif, true) as unknown as DecodedFrame[];
            if (frames.length === 0) {
                throw new Error("GIF parsed but contained no frames (the file may be corrupt or empty).");
            }
            decodeCacheRef.current = {
                frames,
                width: gif.lsd.width,
                height: gif.lsd.height,
            };
            setOriginalMeta({
                name: file.name,
                size: file.size,
                width: gif.lsd.width,
                height: gif.lsd.height,
                frameCount: frames.length,
            });
            setStatus("idle");
        } catch (e) {
            console.error(e);
            const msg = e instanceof Error ? e.message : String(e);
            setError(`Could not parse the GIF: ${msg}. Make sure it's a valid GIF file.`);
            setStatus("error");
        } finally {
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    /** "Download previous" in the warning modal: trigger a browser
     *  download of the existing compressed GIF, then load the new
     *  file. The download is dispatched from a click on a hidden
     *  <a> — standard browser pattern, no prompts. */
    const handleDownloadPreviousAndContinue = () => {
        if (resultUrl) {
            const a = document.createElement("a");
            a.href = resultUrl;
            a.download = "compressed.gif";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
        applyPendingFile();
    };

    /** "Discard" in the warning modal: just load the new file. The
     *  previous result URL is revoked inside resetForNewFile. */
    const handleDiscardPreviousAndContinue = () => {
        applyPendingFile();
    };

    const applyPendingFile = () => {
        const pending = pendingFileRef.current;
        if (!pending) return;
        pendingFileRef.current = null;
        decodeFile(pending.file);
    };

    const handleCompress = async () => {
        const cache = decodeCacheRef.current;
        if (!cache.frames || !cache.width || !cache.height) {
            // Distinct message: "you clicked Compress without uploading"
            // vs. "you uploaded but the decode failed". We can tell
            // them apart by checking if there's a meta (the upload
            // succeeded) but no cache (the decode failed).
            if (originalMeta) {
                setError("Upload succeeded but frame decode failed — see the message above. Try a different GIF.");
            } else {
                setError("No decoded frames. Upload a GIF first.");
            }
            return;
        }
        setError(null);
        setStatus("encoding");
        setProgress(0);
        // Revoke any previous result URL up front so a re-compress
        // with different settings doesn't leak the old blob.
        if (resultUrl) URL.revokeObjectURL(resultUrl);
        setResultUrl(null);

        try {
            const outputW = Math.max(1, Math.round(cache.width * (scale / 100)));
            const outputH = Math.max(1, Math.round(cache.height * (scale / 100)));

            // Apply disposal: each frame's `disposalType` tells us how to
            // combine it with the canvas. The simplest portable approach:
            // maintain a working canvas, draw frame on top, add to gif.js.
            const canvas = document.createElement("canvas");
            canvas.width = cache.width;
            canvas.height = cache.height;
            const ctx = canvas.getContext("2d")!;

            const keptFrames = cache.frames.filter((_, i) => i % frameSkip === 0);

            const gif = new GIF({
                workers: 2,
                quality,
                width: outputW,
                height: outputH,
                workerScript: "/gif.worker.js",
            });

            // Scale to output via a temp canvas
            const scaleCanvas = document.createElement("canvas");
            scaleCanvas.width = outputW;
            scaleCanvas.height = outputH;
            const scaleCtx = scaleCanvas.getContext("2d")!;

            for (let i = 0; i < keptFrames.length; i++) {
                const f = keptFrames[i];
                // Handle disposal
                if (f.disposalType === 2) {
                    ctx.clearRect(0, 0, cache.width, cache.height);
                }
                // Apply frame patch to the working canvas
                const patch = f.patch;
                const dim = f.dims;
                const imageData = ctx.createImageData(dim.width, dim.height);
                imageData.data.set(patch);
                ctx.putImageData(imageData, dim.left, dim.top);
                // Scale down
                scaleCtx.fillStyle = "#000";
                scaleCtx.fillRect(0, 0, outputW, outputH);
                scaleCtx.drawImage(canvas, 0, 0, outputW, outputH);
                const finalImage = scaleCtx.getImageData(0, 0, outputW, outputH);
                gif.addFrame(finalImage, { delay: f.delay || 100 });
                setProgress(Math.round(((i + 1) / keptFrames.length) * 50));
            }

            gif.on("progress", (p: number) => setProgress(50 + Math.round(p * 50)));
            gif.on("finished", (blob: Blob) => {
                setResultUrl(URL.createObjectURL(blob));
                setResultSize(blob.size);
                setProgress(100);
                setStatus("done");
            });
            gif.render();
        } catch (e) {
            console.error(e);
            setError("Compression failed: " + (e as Error).message);
            setStatus("error");
        }
    };

    const reset = () => {
        if (resultUrl) URL.revokeObjectURL(resultUrl);
        setResultUrl(null);
        setResultSize(0);
        setOriginalMeta(null);
        setStatus("idle");
        setError(null);
        setProgress(0);
        decodeCacheRef.current = {};
        if (inputRef.current) inputRef.current.value = "";
    };

    const formatBytes = (n: number) => {
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    };

    const ratio = originalMeta && resultSize ? ((resultSize / originalMeta.size) * 100).toFixed(0) : null;

    return (
        <div className="h-full overflow-y-auto p-4 text-orange-300 font-fira-code">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold">GIF Compressor</h2>
                {/* Re-upload button: visible once any GIF is loaded.
                    Pushing the same hidden input so the user can
                    re-pick without reloading the page. */}
                {originalMeta && (
                    <button
                        onClick={() => inputRef.current?.click()}
                        className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-orange-300 px-3 py-1.5 rounded text-sm border border-gray-600"
                        title="Upload a different GIF"
                    >
                        <FontAwesomeIcon icon={faUpload} />
                        Upload new GIF
                    </button>
                )}
            </div>
            <p className="text-sm text-gray-400 mb-4">
                Shrinks an animated GIF by reducing resolution, dropping frames, or lowering color quality — all in your browser, no upload.
            </p>

            <input
                ref={inputRef}
                type="file"
                accept="image/gif"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileChosen(f);
                }}
            />

            {!originalMeta && (
                <div
                    onClick={() => inputRef.current?.click()}
                    className="border-2 border-dashed border-gray-700 rounded p-12 text-center cursor-pointer hover:border-orange-500 transition"
                >
                    <FontAwesomeIcon icon={faUpload} size="3x" className="text-gray-500 mb-3" />
                    <p className="text-gray-400">Click to upload a GIF</p>
                </div>
            )}

            {originalMeta && (
                <div className="space-y-4">
                    <div className="bg-gray-800 border border-gray-700 rounded p-3">
                        <p className="text-sm">
                            <FontAwesomeIcon icon={faImage} className="mr-1" />
                            {originalMeta.name} • {originalMeta.width}×{originalMeta.height} • {originalMeta.frameCount} frames • {formatBytes(originalMeta.size)}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm mb-1">Scale: {scale}%</label>
                            <input type="range" min="10" max="100" step="5" value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-full" />
                        </div>
                        <div>
                            <label className="block text-sm mb-1">Frame skip: keep 1 in {frameSkip}</label>
                            <input type="range" min="1" max="8" value={frameSkip} onChange={(e) => setFrameSkip(Number(e.target.value))} className="w-full" />
                        </div>
                        <div>
                            <label className="block text-sm mb-1">Quality: {quality} (lower = smaller)</label>
                            <input type="range" min="1" max="20" value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full" />
                        </div>
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

                    <div className="flex gap-2">
                        <button
                            onClick={handleCompress}
                            disabled={status === "encoding" || status === "decoding"}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
                        >
                            {status === "encoding" ? "Compressing…" : "Compress"}
                        </button>
                        <button onClick={reset} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded">
                            Clear
                        </button>
                    </div>

                    {resultUrl && (
                        <div className="mt-4">
                            <h3 className="font-bold text-orange-400 mb-2">
                                Result: {formatBytes(resultSize)} ({ratio}% of original)
                            </h3>
                            <div className="border border-gray-700 rounded p-2 bg-gray-800">
                                <img src={resultUrl} alt="Compressed GIF" className="max-w-full mx-auto" />
                            </div>
                            <a
                                href={resultUrl}
                                download="compressed.gif"
                                className="mt-3 inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                            >
                                <FontAwesomeIcon icon={faDownload} /> Download compressed GIF
                            </a>
                        </div>
                    )}
                </div>
            )}

            {/* Warning modal: shown when the user picks a new GIF while
                a compressed result is still on screen. Same pattern as
                VideoToGif — see the rationale there. */}
            <CustomModal
                isOpen={showResetWarning}
                onRequestClose={() => {
                    // The "Cancel" path goes through here: throw away
                    // the stashed file and close the modal.
                    if (pendingFileRef.current) {
                        URL.revokeObjectURL(pendingFileRef.current.objectUrl);
                        pendingFileRef.current = null;
                    }
                    if (inputRef.current) inputRef.current.value = "";
                    setShowResetWarning(false);
                }}
                title="Replace current GIF?"
                type="warning"
                actions={[
                    {
                        label: "Cancel",
                        className: "bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 transition-colors duration-200",
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
                        You have a compressed GIF that hasn't been downloaded yet. If you
                        continue, that result will be lost from this page.
                    </p>
                    {resultUrl && resultSize > 0 && (
                        <div className="bg-gray-800 border border-gray-700 rounded p-3 text-sm">
                            <div className="flex items-center gap-2 text-orange-400 font-bold mb-1">
                                <FontAwesomeIcon icon={faImage} />
                                Current result
                            </div>
                            <div className="text-gray-300">compressed.gif</div>
                            <div className="text-gray-400">Size: {formatBytes(resultSize)}{ratio ? ` (${ratio}% of original)` : ""}</div>
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

export default GifCompressor;
