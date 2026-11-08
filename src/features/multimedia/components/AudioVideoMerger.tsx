import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faUpload,
    faDownload,
    faFilm,
    faMusic,
    faCircleInfo,
    faCircleExclamation,
} from "@fortawesome/free-solid-svg-icons";
// @ffmpeg/ffmpeg types are no longer needed in this file — the
// FFmpeg instance is owned by useFfmpegEngine.
import { fetchFile } from "@ffmpeg/util";
import { useFfmpegEngine } from "@/features/multimedia/hooks/useFfmpegEngine";
import CustomModal from "@/components/modals/CustomModal";

/**
 * Audio + Video Merger
 *
 * Combines a user-supplied video file with a user-supplied audio file
 * into a single MP4 (H.264 + AAC) using ffmpeg.wasm. The merge runs
 * entirely in the browser; no upload, no backend.
 *
 * Length-mismatch strategy. The four edge cases the user can hit:
 *
 *   1. video == audio duration: trivial — replace the audio track,
 *      keep the video frames, done.
 *   2. video < audio duration: two reasonable choices —
 *      (a) trim the audio to the video length (most common, what
 *          users usually want when replacing a video's original
 *          audio with a shorter music clip or voiceover that
 *          happens to be longer), or (b) loop the video to match
 *          (rare, requires freezing the last frame and extending).
 *   3. video > audio duration: two reasonable choices —
 *      (a) pad the audio with silence to the video length (default
 *          — typical for "music for a longer video"), or (b) trim
 *      the video to the audio length.
 *   4. duration unknown (e.g. live stream): fall back to whichever
 *      of the two is known, or trim to the shorter known value.
 *
 * We expose four explicit strategies (radio buttons) so the user
 * always knows which one is being applied, rather than silently
 * picking one for them. The UI also live-previews the resulting
 * duration so the user can sanity-check their choice.
 *
 * Why re-encode instead of stream-copy. The simplest possible
 * ffmpeg merge is `-c:v copy -c:a copy` (no re-encode, near-instant),
 * but it only works when both inputs are already in the target
 * container's preferred codecs (H.264 video + AAC audio). If the
 * user picks a WebM (VP9/Opus) or MKV (any codec) video, or an MP3
 * audio, the stream copy will fail at the muxing step. We always
 * re-encode to H.264/AAC so the output plays everywhere. The
 * `ultrafast` preset + CRF 23 keeps it fast enough for short
 * clips; for very long videos (5+ min) the user will notice the
 * wait.
 *
 * Re-upload guard. When the user has a successful merge on screen
 * and picks a new input (video or audio), we surface the standard
 * "replace current result?" warning modal (Cancel / Discard &
 * continue / Download previous) instead of silently wiping the
 * blob URL. The previous-result pattern is the same one used by
 * VideoToGif, VideoSplitter, and GifCompressor.
 */

type Status = "idle" | "ready" | "merging" | "done" | "error";
/** What to do when the two input durations differ. */
type LengthMode = "shortest" | "longest" | "trim-to-video" | "trim-to-audio";

interface VideoMeta {
    name: string;
    size: number;
    width: number;
    height: number;
    duration: number;
}

interface AudioMeta {
    name: string;
    size: number;
    duration: number;
}

/** A file the user just picked but hasn't been committed yet
 *  (because we're showing the "previous result will be lost" prompt).
 *  `kind` tracks which input slot the new file is for. */
interface PendingFile {
    kind: "video" | "audio";
    file: File;
    objectUrl: string;
}

const AudioVideoMerger = () => {
    // FFmpeg state. The engine is a module-level singleton shared
    // across all Multimedia tools (see useFfmpegEngine). Switching
    // to/from VideoSplitter or the new GifMaker doesn't re-download
    // the 30 MB core. The "loaded / loading / error" indicator
    // is per-component so the UI can react to the singleton's
    // status.
    const { ffmpeg, status: ffmpegStatus } = useFfmpegEngine();
    // The hook fires the log handler; we wire the per-component
    // progress handler here. See the same pattern in VideoSplitter
    // for the listener-leak trade-off discussion.
    useEffect(() => {
        if (!ffmpeg) return;
        const handler = ({ progress: p }: { progress: number }) => {
            const pct = Math.round(p * 100);
            setProgress(pct);
        };
        ffmpeg.on("progress", handler);
    }, [ffmpeg]);

    // File inputs
    const videoInputRef = useRef<HTMLInputElement | null>(null);
    const audioInputRef = useRef<HTMLInputElement | null>(null);
    /** The <video> element used as a preview AND for duration probing. */
    const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
    /** The <audio> element used for duration probing. No preview needed
     *  for audio (the play control in the input slot is enough). */
    const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
    /** File the user just picked but hasn't been committed yet. */
    const pendingFileRef = useRef<PendingFile | null>(null);

    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null);
    const [audioMeta, setAudioMeta] = useState<AudioMeta | null>(null);

    // User options
    const [lengthMode, setLengthMode] = useState<LengthMode>("shortest");

    // Processing
    const [status, setStatus] = useState<Status>("idle");
    const [progress, setProgress] = useState(0);
    /**
     * Sub-phase of the current merge. Tracks the slow steps
     * of the operation (writing each input file to the
     * virtual FS, the actual libx264 re-encode, reading the
     * result) so the UI can show meaningful "what's it doing
     * right now" labels + an indeterminate progress bar when
     * no real progress events are firing. The merge re-encodes
     * (unlike the cut's stream-copy), so real progress events
     * DO fire during the encoding phase — the phase label just
     * makes the silent parts (file writes, result read) also
     * visible.
     */
    const [mergePhase, setMergePhase] = useState<
        "writing-video" | "writing-audio" | "encoding" | "reading" | null
    >(null);
    const [error, setError] = useState<string | null>(null);
    const [outputUrl, setOutputUrl] = useState<string | null>(null);
    const [outputSize, setOutputSize] = useState(0);
    const [outputFileName, setOutputFileName] = useState<string>("merged.mp4");

    const [showResetWarning, setShowResetWarning] = useState<boolean>(false);

    /* -------------------------------------------------------------- */
    /* FFmpeg bootstrap                                                */
    /* -------------------------------------------------------------- */

    // Engine load is handled by useFfmpegEngine above.

    /* -------------------------------------------------------------- */
    /* File pick / state setters                                      */
    /* -------------------------------------------------------------- */

    /** Read a video file's metadata via a hidden <video> element.
     *  Returns the dimensions and duration; throws on failure. */
    const probeVideo = (file: File): Promise<VideoMeta> =>
        new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const v = document.createElement("video");
            v.preload = "metadata";
            v.muted = true;
            v.src = url;
            v.onloadedmetadata = () => {
                const meta: VideoMeta = {
                    name: file.name,
                    size: file.size,
                    width: v.videoWidth || 0,
                    height: v.videoHeight || 0,
                    duration: isFinite(v.duration) ? v.duration : 0,
                };
                URL.revokeObjectURL(url);
                resolve(meta);
            };
            v.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error("Could not read video metadata — the file may be an unsupported format or corrupted."));
            };
        });

    /** Read an audio file's metadata via a hidden <audio> element. */
    const probeAudio = (file: File): Promise<AudioMeta> =>
        new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const a = document.createElement("audio");
            a.preload = "metadata";
            a.src = url;
            a.onloadedmetadata = () => {
                const meta: AudioMeta = {
                    name: file.name,
                    size: file.size,
                    duration: isFinite(a.duration) ? a.duration : 0,
                };
                URL.revokeObjectURL(url);
                resolve(meta);
            };
            a.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error("Could not read audio metadata — the file may be an unsupported format or corrupted."));
            };
        });

    /** Commit a new video file. Resets output state, kicks off metadata probe. */
    const loadVideoFile = (file: File) => {
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        setOutputUrl(null);
        setOutputSize(0);
        setError(null);
        setProgress(0);
        setStatus("idle");

        const url = URL.createObjectURL(file);
        setVideoFile(file);
        setVideoUrl(url);
        setVideoMeta({ name: file.name, size: file.size, width: 0, height: 0, duration: 0 });
        probeVideo(file)
            .then((meta) => {
                setVideoMeta(meta);
            })
            .catch((e) => {
                console.error(e);
                setError(e instanceof Error ? e.message : String(e));
                setStatus("error");
            })
            .finally(() => {
                if (videoInputRef.current) videoInputRef.current.value = "";
            });
    };

    /** Commit a new audio file. Resets output state, kicks off metadata probe. */
    const loadAudioFile = (file: File) => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        setOutputUrl(null);
        setOutputSize(0);
        setError(null);
        setProgress(0);
        setStatus("idle");

        const url = URL.createObjectURL(file);
        setAudioFile(file);
        setAudioUrl(url);
        setAudioMeta({ name: file.name, size: file.size, duration: 0 });
        probeAudio(file)
            .then((meta) => {
                setAudioMeta(meta);
            })
            .catch((e) => {
                console.error(e);
                setError(e instanceof Error ? e.message : String(e));
                setStatus("error");
            })
            .finally(() => {
                if (audioInputRef.current) audioInputRef.current.value = "";
            });
    };

    /** Entry point when the user picks a video file. If a previous
     *  merge result is on screen, stash and prompt; otherwise commit. */
    const handleVideoChosen = (file: File) => {
        // If a previous pick is still pending, revoke its blob URL.
        if (pendingFileRef.current) {
            URL.revokeObjectURL(pendingFileRef.current.objectUrl);
            pendingFileRef.current = null;
        }
        const objectUrl = URL.createObjectURL(file);
        const hasPreviousResult = status === "done" && !!outputUrl;
        if (hasPreviousResult) {
            pendingFileRef.current = { kind: "video", file, objectUrl };
            setShowResetWarning(true);
            return;
        }
        loadVideoFile(file);
    };

    /** Entry point when the user picks an audio file. Same pattern
     *  as handleVideoChosen; only the kind tag differs. */
    const handleAudioChosen = (file: File) => {
        if (pendingFileRef.current) {
            URL.revokeObjectURL(pendingFileRef.current.objectUrl);
            pendingFileRef.current = null;
        }
        const objectUrl = URL.createObjectURL(file);
        const hasPreviousResult = status === "done" && !!outputUrl;
        if (hasPreviousResult) {
            pendingFileRef.current = { kind: "audio", file, objectUrl };
            setShowResetWarning(true);
            return;
        }
        loadAudioFile(file);
    };

    /** "Cancel" path from the warning modal: drop the stashed file. */
    const handleCancelReplace = () => {
        if (pendingFileRef.current) {
            URL.revokeObjectURL(pendingFileRef.current.objectUrl);
            pendingFileRef.current = null;
        }
        if (videoInputRef.current) videoInputRef.current.value = "";
        if (audioInputRef.current) audioInputRef.current.value = "";
        setShowResetWarning(false);
    };

    /** "Download previous" path: save the existing merged file, then load the new input. */
    const handleDownloadPreviousAndContinue = () => {
        if (outputUrl && pendingFileRef.current) {
            const a = document.createElement("a");
            a.href = outputUrl;
            a.download = outputFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
        applyPendingFile();
    };

    /** "Discard & continue" path: just load the new input. */
    const handleDiscardPreviousAndContinue = () => {
        applyPendingFile();
    };

    const applyPendingFile = () => {
        const pending = pendingFileRef.current;
        if (!pending) return;
        if (pending.kind === "video") {
            loadVideoFile(pending.file);
        } else {
            loadAudioFile(pending.file);
        }
        pendingFileRef.current = null;
        setShowResetWarning(false);
    };

    /* -------------------------------------------------------------- */
    /* Merge                                                           */
    /* -------------------------------------------------------------- */

    /**
     * Build the ffmpeg argv for a merge of (video, audio) → output,
     * given the user-selected length-mismatch strategy.
     *
     *  - shortest:    output = min(video, audio). One stream is
     *                 truncated at the shorter boundary.
     *  - longest:     output = max(video, audio). The shorter
     *                 stream is padded — audio with `apad` (silence),
     *                 video with `tpad` (cloned last frame).
     *  - trim-to-X:   output = X duration, hard cut.
     *
     * Codec: H.264 video (`libx264`, `ultrafast` preset, CRF 23) +
     * AAC audio (192 kbps). Re-encoding both streams guarantees
     * the output MP4 plays on every modern browser and OS, at
     * the cost of being slower than `-c copy` stream copy.
     */
    const buildArgs = (
        videoFileName: string,
        audioFileName: string,
        outputFileName: string,
        mode: LengthMode,
        videoDuration: number,
        audioDuration: number,
    ): string[] => {
        const args: string[] = ["-i", videoFileName, "-i", audioFileName];

        if (mode === "longest" && videoDuration > 0 && audioDuration > 0) {
            // Both streams are padded up to the longer of the two.
            // The filter graph names the outputs [v] and [a] which
            // we then map into the output. We use a long
            // `stop_duration` on `tpad` so the video's last frame
            // is cloned for the entire pad window, and rely on
            // `-t` to truncate the result to the exact target.
            const target = Math.max(videoDuration, audioDuration);
            args.push(
                "-filter_complex",
                `[1:a]apad[a];[0:v]tpad=stop_mode=clone:stop_duration=99999[v]`,
                "-map", "[v]", "-map", "[a]",
                "-t", String(target),
            );
        } else if (mode === "trim-to-video" && videoDuration > 0) {
            args.push("-map", "0:v:0", "-map", "1:a:0", "-t", String(videoDuration));
        } else if (mode === "trim-to-audio" && audioDuration > 0) {
            args.push("-map", "0:v:0", "-map", "1:a:0", "-t", String(audioDuration));
        } else {
            // `shortest` is the catch-all / default. Also covers
            // unknown durations — ffmpeg falls back to whichever
            // input finishes first, which is fine.
            args.push("-map", "0:v:0", "-map", "1:a:0", "-shortest");
        }

        args.push(
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            outputFileName,
        );
        return args;
    };

    /** Compute the resulting output duration for a given lengthMode
     *  + input durations. Used to live-preview the choice in the
     *  UI. Returns null if the input durations are unknown. */
    const computeOutputDuration = (): number | null => {
        if (!videoMeta || !audioMeta) return null;
        if (videoMeta.duration <= 0 || audioMeta.duration <= 0) return null;
        switch (lengthMode) {
            case "shortest":
                return Math.min(videoMeta.duration, audioMeta.duration);
            case "longest":
                return Math.max(videoMeta.duration, audioMeta.duration);
            case "trim-to-video":
                return videoMeta.duration;
            case "trim-to-audio":
                return audioMeta.duration;
        }
    };

    const handleMerge = async () => {
        if (!ffmpeg) {
            setError("Engine not ready yet. If this persists, try refreshing the page.");
            setStatus("error");
            return;
        }
        if (!videoFile || !audioFile) {
            setError("Pick a video file and an audio file first.");
            setStatus("error");
            return;
        }
        if (!videoMeta || !audioMeta) {
            setError("Still reading file metadata. Wait a moment and try again.");
            setStatus("error");
            return;
        }

        setError(null);
        setStatus("merging");
        setProgress(0);
        setMergePhase("writing-video");
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        setOutputUrl(null);
        setOutputSize(0);

        // Pick a stable output filename. The input video's basename
        // is used so the user can tell which merged file corresponds
        // to which source video at a glance.
        const base = videoMeta.name.replace(/\.[^.]+$/, "") || "merged";
        const outName = `${base}-merged.mp4`;
        setOutputFileName(outName);

        // ffmpeg.wasm requires ASCII-only filenames in its virtual
        // FS. Strip non-ASCII from the input filenames to dodge the
        // "Invalid data found when processing input" surprise.
        const safeVideoName = "video" + getExt(videoFile.name);
        const safeAudioName = "audio" + getExt(audioFile.name);

        try {
            const inst = ffmpeg;
            await inst.writeFile(safeVideoName, await fetchFile(videoFile));
            setMergePhase("writing-audio");
            await inst.writeFile(safeAudioName, await fetchFile(audioFile));

            const args = buildArgs(
                safeVideoName,
                safeAudioName,
                outName,
                lengthMode,
                videoMeta.duration,
                audioMeta.duration,
            );
            // ffmpeg.wasm expects an ExecOptions object (so the
            // lib knows which input names to clean up) rather
            // than a bare string[].
            setMergePhase("encoding");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (inst as any).exec(args);

            setMergePhase("reading");
            const data = await inst.readFile(outName);
            // `data` is a Uint8Array; wrap it in a Blob and create
            // a URL for the <video> preview / download.
            const blob = new Blob([data as Uint8Array], { type: "video/mp4" });
            const url = URL.createObjectURL(blob);
            setOutputUrl(url);
            setOutputSize(blob.size);
            setStatus("done");
            setProgress(100);
            setMergePhase(null);

            // Clean up the virtual FS so the next merge starts
            // fresh (otherwise a follow-up merge of different
            // files with the same names would read the cached
            // copy from the previous run).
            try {
                await inst.deleteFile(safeVideoName);
                await inst.deleteFile(safeAudioName);
                await inst.deleteFile(outName);
            } catch {
                // Cleanup failures are non-fatal — the next
                // writeFile would overwrite anyway.
            }
        } catch (e) {
            console.error("Merge failed:", e);
            const msg = e instanceof Error ? e.message : String(e);
            setError(`Merge failed: ${msg}`);
            setStatus("error");
            setMergePhase(null);
        }
    };

    /** Reset the whole component back to the empty state. */
    const handleClear = () => {
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        if (pendingFileRef.current) {
            URL.revokeObjectURL(pendingFileRef.current.objectUrl);
            pendingFileRef.current = null;
        }
        setVideoFile(null);
        setAudioFile(null);
        setVideoUrl(null);
        setAudioUrl(null);
        setVideoMeta(null);
        setAudioMeta(null);
        setOutputUrl(null);
        setOutputSize(0);
        setOutputFileName("merged.mp4");
        setError(null);
        setProgress(0);
        setMergePhase(null);
        setStatus("idle");
        if (videoInputRef.current) videoInputRef.current.value = "";
        if (audioInputRef.current) audioInputRef.current.value = "";
    };

    /** Trigger a browser download of the merged MP4. */
    const handleDownload = () => {
        if (!outputUrl) return;
        const a = document.createElement("a");
        a.href = outputUrl;
        a.download = outputFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    /* -------------------------------------------------------------- */
    /* Cleanup on unmount                                              */
    /* -------------------------------------------------------------- */

    // Cleanup on unmount. This is a "fire once on unmount"
    // pattern, NOT a "fire when deps change" pattern — the
    // cleanup's job is to revoke whatever URLs happen to exist
    // at unmount time. If we put the URLs in the deps array, the
    // effect would re-run on every URL change, revoking URLs
    // that the live UI still depends on. Hence the disable.
    useEffect(() => {
        return () => {
            if (videoUrl) URL.revokeObjectURL(videoUrl);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            if (outputUrl) URL.revokeObjectURL(outputUrl);
            if (pendingFileRef.current) URL.revokeObjectURL(pendingFileRef.current.objectUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* -------------------------------------------------------------- */
    /* Derived UI state                                                */
    /* -------------------------------------------------------------- */

    const outputDuration = computeOutputDuration();
    const lengthMismatch =
        videoMeta && audioMeta && videoMeta.duration > 0 && audioMeta.duration > 0 &&
        Math.abs(videoMeta.duration - audioMeta.duration) > 0.05;
    const ready = videoFile && audioFile && ffmpegStatus === "loaded" && status !== "merging";
    const showWarning =
        ffmpegStatus === "error" && status === "idle" && (videoFile || audioFile);

    /* -------------------------------------------------------------- */
    /* Render                                                          */
    /* -------------------------------------------------------------- */

    return (
        <div className="h-full overflow-y-auto p-4 text-orange-300 font-fira-code">
            <h2 className="text-2xl font-bold mb-2">Audio + Video Merger</h2>
            <p className="text-sm text-gray-400 mb-4">
                Replace a video's audio track with any audio file — runs entirely in your browser, no upload.
            </p>

            {ffmpegStatus === "loading" && (
                <div className="bg-blue-900 border border-blue-700 text-blue-200 p-3 rounded mb-4 text-sm">
                    Loading video engine…
                </div>
            )}

            {showWarning && (
                <div className="bg-yellow-900/40 border border-yellow-700/60 text-yellow-200 p-3 rounded mb-4 text-sm flex items-start gap-2">
                    <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5 shrink-0" />
                    <div>
                        The video engine isn't available in this browser, so the merge step won't work. The
                        file-pick and previews below still work. Try refreshing the page or opening this
                        app in a regular browser tab.
                    </div>
                </div>
            )}

            {/* Two-up grid: video on the left, audio on the right.
                Stacks vertically on small screens. */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {/* ---- Video input ---- */}
                <div>
                    <h3 className="font-bold text-orange-300 mb-2 flex items-center gap-2">
                        <FontAwesomeIcon icon={faFilm} /> Video
                    </h3>
                    <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleVideoChosen(f);
                        }}
                    />
                    {!videoUrl && (
                        <div
                            onClick={() => videoInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-700 rounded p-8 text-center cursor-pointer hover:border-orange-500 transition h-48 flex flex-col items-center justify-center"
                        >
                            <FontAwesomeIcon icon={faUpload} size="2x" className="text-gray-500 mb-2" />
                            <p className="text-gray-400 text-sm">Click to upload a video (MP4, WebM, MOV, MKV…)</p>
                        </div>
                    )}
                    {videoUrl && videoMeta && (
                        <div className="space-y-2">
                            <video
                                ref={videoPreviewRef}
                                src={videoUrl}
                                controls
                                className="w-full rounded bg-black"
                                style={{ maxHeight: "240px" }}
                            />
                            <div className="bg-gray-800 border border-gray-700 rounded p-2 text-xs text-gray-300">
                                <div className="font-mono truncate" title={videoMeta.name}>
                                    {videoMeta.name}
                                </div>
                                <div className="text-gray-400 flex gap-3 mt-1 flex-wrap">
                                    <span>{formatBytes(videoMeta.size)}</span>
                                    {videoMeta.width > 0 && <span>{videoMeta.width}×{videoMeta.height}</span>}
                                    {videoMeta.duration > 0 && (
                                        <span>{formatTimeHMS(videoMeta.duration)}</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => videoInputRef.current?.click()}
                                    className="mt-2 text-orange-400 hover:text-orange-300 text-xs underline"
                                >
                                    Replace
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ---- Audio input ---- */}
                <div>
                    <h3 className="font-bold text-orange-300 mb-2 flex items-center gap-2">
                        <FontAwesomeIcon icon={faMusic} /> Audio
                    </h3>
                    <input
                        ref={audioInputRef}
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleAudioChosen(f);
                        }}
                    />
                    {!audioUrl && (
                        <div
                            onClick={() => audioInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-700 rounded p-8 text-center cursor-pointer hover:border-orange-500 transition h-48 flex flex-col items-center justify-center"
                        >
                            <FontAwesomeIcon icon={faUpload} size="2x" className="text-gray-500 mb-2" />
                            <p className="text-gray-400 text-sm">Click to upload audio (MP3, WAV, AAC, OGG…)</p>
                        </div>
                    )}
                    {audioUrl && audioMeta && (
                        <div className="space-y-2">
                            <audio
                                ref={audioPreviewRef}
                                src={audioUrl}
                                controls
                                className="w-full"
                            />
                            <div className="bg-gray-800 border border-gray-700 rounded p-2 text-xs text-gray-300">
                                <div className="font-mono truncate" title={audioMeta.name}>
                                    {audioMeta.name}
                                </div>
                                <div className="text-gray-400 flex gap-3 mt-1 flex-wrap">
                                    <span>{formatBytes(audioMeta.size)}</span>
                                    {audioMeta.duration > 0 && (
                                        <span>{formatTimeHMS(audioMeta.duration)}</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => audioInputRef.current?.click()}
                                    className="mt-2 text-orange-400 hover:text-orange-300 text-xs underline"
                                >
                                    Replace
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Length-mismatch strategy. Only shown when both files
                have known durations AND they differ by more than
                50ms (rounding tolerance). The four options
                correspond to the four edge cases described in the
                file header. */}
            {lengthMismatch && (
                <div className="bg-gray-800 border border-gray-700 rounded p-4 mb-4">
                    <h3 className="font-bold text-orange-300 mb-2 flex items-center gap-2">
                        <FontAwesomeIcon icon={faCircleInfo} />
                        The video and audio have different lengths. How should the merge handle it?
                    </h3>
                    <div className="space-y-2 text-sm">
                        <LengthOption
                            mode="shortest"
                            label="Trim to shorter"
                            description="Output ends at the shorter of the two — no padding, no looping."
                            checked={lengthMode === "shortest"}
                            onChange={() => setLengthMode("shortest")}
                        />
                        <LengthOption
                            mode="longest"
                            label="Pad to longer"
                            description={`Output runs for the longer one — fills the gap with silence (audio) or a frozen last frame (video).`}
                            checked={lengthMode === "longest"}
                            onChange={() => setLengthMode("longest")}
                        />
                        <LengthOption
                            mode="trim-to-video"
                            label="Trim to video length"
                            description={`Cut the audio at ${formatTimeHMS(videoMeta!.duration)} to match the video.`}
                            checked={lengthMode === "trim-to-video"}
                            onChange={() => setLengthMode("trim-to-video")}
                        />
                        <LengthOption
                            mode="trim-to-audio"
                            label="Trim to audio length"
                            description={`Cut the video at ${formatTimeHMS(audioMeta!.duration)} to match the audio.`}
                            checked={lengthMode === "trim-to-audio"}
                            onChange={() => setLengthMode("trim-to-audio")}
                        />
                    </div>
                    {outputDuration !== null && (
                        <div className="mt-3 text-xs text-gray-400">
                            Resulting duration: <span className="text-orange-400 font-bold">{formatTimeHMS(outputDuration)}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Action row: Merge button + Clear button + progress. */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <button
                    onClick={handleMerge}
                    disabled={!ready}
                    className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded transition-colors duration-200"
                >
                    {status === "merging" ? "Merging…" : "Merge"}
                </button>
                <button
                    onClick={handleClear}
                    disabled={!videoFile && !audioFile && !outputUrl}
                    className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white px-4 py-2 rounded transition-colors duration-200"
                >
                    Clear
                </button>
                {status === "merging" && (
                    <div className="flex-1 min-w-[200px]">
                        <div className="flex justify-between text-xs text-orange-300 mb-1">
                            <span>
                                {mergePhase === "writing-video" && "Loading video into engine…"}
                                {mergePhase === "writing-audio" && "Loading audio into engine…"}
                                {mergePhase === "encoding" && "Encoding…"}
                                {mergePhase === "reading" && "Reading result…"}
                                {!mergePhase && "Preparing…"}
                            </span>
                            <span>
                                {progress > 0 ? `${progress}%` : ""}
                            </span>
                        </div>
                        <div className="w-full h-2 bg-gray-700 rounded overflow-hidden relative">
                            {progress > 0 ? (
                                <div
                                    className="h-full bg-orange-500 transition-all duration-200"
                                    style={{ width: `${progress}%` }}
                                />
                            ) : (
                                // Indeterminate animation for the
                                // file-write phases (no progress
                                // events fire during writeFile),
                                // and as a fallback if the
                                // encoding phase ever fails to
                                // emit progress. The sliding bar
                                // gives the user visual feedback
                                // that work is happening without
                                // claiming a specific percentage.
                                <div className="absolute top-0 left-0 h-full w-1/3 bg-orange-500/70 animate-indeterminate rounded" />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="bg-red-900/40 border border-red-700/60 text-red-200 p-3 rounded mb-4 text-sm flex items-start gap-2">
                    <FontAwesomeIcon icon={faCircleExclamation} className="mt-0.5 shrink-0" />
                    <div>{error}</div>
                </div>
            )}

            {/* Output preview + download. Shown once the merge
                succeeds. The <video controls> lets the user play
                the merged result in place; the download link
                below saves it. */}
            {outputUrl && (
                <div className="bg-gray-800 border border-gray-700 rounded p-4">
                    <h3 className="font-bold text-orange-400 mb-2">Result</h3>
                    <video src={outputUrl} controls className="w-full rounded bg-black mb-3" style={{ maxHeight: "360px" }} />
                    <div className="flex items-center gap-3 text-sm flex-wrap">
                        <button
                            onClick={handleDownload}
                            className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded transition-colors duration-200"
                        >
                            <FontAwesomeIcon icon={faDownload} /> Download
                        </button>
                        <span className="text-gray-400 font-mono">{outputFileName}</span>
                        <span className="text-gray-500">·</span>
                        <span className="text-gray-400">{formatBytes(outputSize)}</span>
                        {outputDuration !== null && (
                            <>
                                <span className="text-gray-500">·</span>
                                <span className="text-gray-400">{formatTimeHMS(outputDuration)}</span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* "Replace current result?" warning modal. Triggered
                when the user picks a new video or audio while a
                previous merged result is on screen. Three
                explicit actions: Cancel / Discard & continue /
                Download previous. Same pattern as VideoToGif /
                GifCompressor / VideoSplitter. */}
            <CustomModal
                isOpen={showResetWarning}
                onRequestClose={handleCancelReplace}
                title="Replace current result?"
                type="warning"
                actions={[
                    {
                        label: "Cancel",
                        className: "bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 transition-colors duration-200",
                        onClick: handleCancelReplace,
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
                        You have a merged video that hasn't been downloaded yet. If you continue, that
                        result will be lost from this page.
                    </p>
                    {outputUrl && outputSize > 0 && (
                        <div className="bg-gray-800 border border-gray-700 rounded p-3 text-sm">
                            <div className="flex items-center gap-2 text-orange-400 font-bold mb-1">
                                <FontAwesomeIcon icon={faFilm} />
                                Current result
                            </div>
                            <div className="text-gray-300 font-mono">{outputFileName}</div>
                            <div className="text-gray-400">Size: {formatBytes(outputSize)}</div>
                        </div>
                    )}
                    <p className="text-gray-400 text-sm">
                        Choose <span className="text-green-400 font-bold">Download previous</span> to
                        save the current file first, <span className="text-red-400 font-bold">Discard &amp; continue</span> to
                        throw it away, or <span className="text-white font-bold">Cancel</span> to keep everything as-is.
                    </p>
                </div>
            </CustomModal>
        </div>
    );
};

/** A single length-mismatch option. Inline subcomponent for the
 *  four-up radio group. */
const LengthOption = ({
    label,
    description,
    checked,
    onChange,
}: {
    mode: LengthMode;
    label: string;
    description: string;
    checked: boolean;
    onChange: () => void;
}) => (
    <label className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-gray-700/40 transition-colors">
        <input
            type="radio"
            name="length-mode"
            checked={checked}
            onChange={onChange}
            className="mt-1 accent-orange-500"
        />
        <div>
            <div className="font-bold text-orange-300">{label}</div>
            <div className="text-gray-400 text-xs">{description}</div>
        </div>
    </label>
);

/** Lower-case file extension (".mp4", ".mp3", ...). */
function getExt(name: string): string {
    const m = name.match(/\.[^.]+$/);
    return m ? m[0].toLowerCase() : "";
}

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

function formatBytes(b: number): string {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default AudioVideoMerger;
