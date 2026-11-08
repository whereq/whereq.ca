import { useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload, faDownload, faCircleExclamation, faTrash } from "@fortawesome/free-solid-svg-icons";
import { removeBackground } from "@imgly/background-removal";

/**
 * Image Background Remover
 *
 * Uses @imgly/background-removal — runs the ISNet/U2-Net family of
 * segmentation models in WebAssembly + ONNX Runtime Web, fully in browser.
 * First run downloads the model (~10 MB) and caches it. Subsequent runs
 * are much faster.
 *
 * Output: PNG with transparent background.
 */
const BackgroundRemover = () => {
    const [originalUrl, setOriginalUrl] = useState<string | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [progress, setProgress] = useState<number>(0);
    const [status, setStatus] = useState<"idle" | "loading-model" | "processing" | "done" | "error">("idle");
    const [error, setError] = useState<string | null>(null);
    const [originalSize, setOriginalSize] = useState<number>(0);
    const [resultSize, setResultSize] = useState<number>(0);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const handleFile = async (file: File) => {
        setError(null);
        setResultUrl(null);
        setProgress(0);
        setStatus("loading-model");
        setOriginalSize(file.size);
        const objUrl = URL.createObjectURL(file);
        setOriginalUrl(objUrl);

        try {
            const blob = await removeBackground(file, {
                progress: (key: string, current: number, total: number) => {
                    if (total > 0) {
                        setProgress(Math.round((current / total) * 100));
                    }
                    if (key === "compute:download") setStatus("loading-model");
                    if (key === "compute:inference") setStatus("processing");
                },
            });
            const resultBlob = new Blob([await blob.arrayBuffer()], { type: "image/png" });
            setResultUrl(URL.createObjectURL(resultBlob));
            setResultSize(resultBlob.size);
            setProgress(100);
            setStatus("done");
        } catch (e) {
            console.error(e);
            setError("Background removal failed. Make sure the model can load (network access on first run).");
            setStatus("error");
        }
    };

    const reset = () => {
        if (originalUrl) URL.revokeObjectURL(originalUrl);
        if (resultUrl) URL.revokeObjectURL(resultUrl);
        setOriginalUrl(null);
        setResultUrl(null);
        setProgress(0);
        setStatus("idle");
        setError(null);
        setOriginalSize(0);
        setResultSize(0);
        if (inputRef.current) inputRef.current.value = "";
    };

    const formatBytes = (n: number) => {
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="h-full overflow-y-auto p-4 text-orange-300 font-fira-code">
            <h2 className="text-2xl font-bold mb-2">Image Background Remover</h2>
            <p className="text-sm text-gray-400 mb-4">
                Removes the background from a JPG/PNG/WebP image and outputs a PNG with a transparent background.
                Runs entirely in your browser — the first request downloads a ~10 MB model, then it's cached for next time.
            </p>

            <div className="bg-yellow-900 border border-yellow-700 text-yellow-200 p-3 rounded mb-4 text-sm">
                <FontAwesomeIcon icon={faCircleExclamation} className="mr-2" />
                <strong>First run:</strong> model download can take 10–30 seconds on a slow connection. After that it's near-instant.
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                }}
            />

            {!originalUrl && (
                <div
                    onClick={() => inputRef.current?.click()}
                    className="border-2 border-dashed border-gray-700 rounded p-12 text-center cursor-pointer hover:border-orange-500 transition"
                >
                    <FontAwesomeIcon icon={faUpload} size="3x" className="text-gray-500 mb-3" />
                    <p className="text-gray-400">Click to upload an image (JPG, PNG, WebP)</p>
                </div>
            )}

            {originalUrl && (
                <>
                    {(status === "loading-model" || status === "processing") && (
                        <div className="mb-4">
                            <div className="flex justify-between text-sm text-orange-400 mb-1">
                                <span>{status === "loading-model" ? "Loading model…" : "Removing background…"}</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-700 rounded overflow-hidden">
                                <div className="h-full bg-orange-500 transition-all" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-900 border border-red-700 text-red-200 p-3 rounded mb-4 text-sm">{error}</div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <h3 className="font-bold text-orange-400 mb-2">Original ({formatBytes(originalSize)})</h3>
                            <div className="border border-gray-700 rounded p-2 bg-gray-800">
                                <img src={originalUrl} alt="Original" className="max-w-full max-h-96 mx-auto" />
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-orange-400 mb-2">
                                Result {resultUrl && `(${formatBytes(resultSize)})`}
                            </h3>
                            <div
                                className="border border-gray-700 rounded p-2 min-h-32 flex items-center justify-center"
                                style={{
                                    backgroundImage:
                                        "linear-gradient(45deg, #444 25%, transparent 25%), linear-gradient(-45deg, #444 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #444 75%), linear-gradient(-45deg, transparent 75%, #444 75%)",
                                    backgroundSize: "20px 20px",
                                    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                                    backgroundColor: "#666",
                                }}
                            >
                                {resultUrl ? (
                                    <img src={resultUrl} alt="Result" className="max-w-full max-h-96 mx-auto" />
                                ) : (
                                    <span className="text-gray-400 text-sm">
                                        {status === "processing" ? "Processing…" : status === "loading-model" ? "Loading model…" : "—"}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {resultUrl && (
                            <a
                                href={resultUrl}
                                download="background-removed.png"
                                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                            >
                                <FontAwesomeIcon icon={faDownload} /> Download PNG
                            </a>
                        )}
                        <button
                            onClick={reset}
                            className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
                        >
                            <FontAwesomeIcon icon={faTrash} /> New image
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default BackgroundRemover;
