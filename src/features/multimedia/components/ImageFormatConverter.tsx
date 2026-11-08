import { useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload, faDownload, faTrash, faImage } from "@fortawesome/free-solid-svg-icons";

/**
 * Image Format Converter
 *
 * Uses the browser's native Canvas API. No dependencies.
 * Supports converting between PNG, JPG, WebP, BMP-input (any browser-readable
 * format) and exporting as PNG, JPG, or WebP.
 *
 * For 'transparent background' output the user can pick PNG or WebP —
 * both preserve alpha. The 'flatten on color' option lets the user bake
 * transparency onto a solid color (useful for JPG output, which has no alpha).
 */
type OutputFormat = "png" | "jpeg" | "webp";

const FORMAT_MIMES: Record<OutputFormat, string> = {
    png: "image/png",
    jpeg: "image/jpeg",
    webp: "image/webp",
};

const FORMAT_EXTS: Record<OutputFormat, string> = {
    png: "png",
    jpeg: "jpg",
    webp: "webp",
};

const FORMAT_LABELS: Record<OutputFormat, string> = {
    png: "PNG (lossless, supports transparency)",
    jpeg: "JPEG (small, no transparency)",
    webp: "WebP (small, supports transparency)",
};

const ImageFormatConverter = () => {
    const [originalUrl, setOriginalUrl] = useState<string | null>(null);
    const [originalMeta, setOriginalMeta] = useState<{ name: string; size: number; width: number; height: number } | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [resultSize, setResultSize] = useState<number>(0);
    const [outputFormat, setOutputFormat] = useState<OutputFormat>("png");
    const [quality, setQuality] = useState<number>(92);
    const [flattenColor, setFlattenColor] = useState<string>("#ffffff");
    const [flattenOnExport, setFlattenOnExport] = useState<boolean>(false);
    const [resizing, setResizing] = useState<{ width: number; height: number; scale: number }>({ width: 100, height: 100, scale: 100 });
    const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const handleFile = (file: File) => {
        setResultUrl(null);
        setResultSize(0);
        setOriginalMeta({ name: file.name, size: file.size, width: 0, height: 0 });
        const url = URL.createObjectURL(file);
        setOriginalUrl(url);
        const img = new Image();
        img.onload = () => {
            setImageDimensions({ width: img.width, height: img.height });
            setOriginalMeta({ name: file.name, size: file.size, width: img.width, height: img.height });
            setResizing({ width: img.width, height: img.height, scale: 100 });
        };
        img.src = url;
    };

    const handleConvert = async () => {
        if (!originalUrl || !imageDimensions) return;
        setIsProcessing(true);
        try {
            const img = new Image();
            img.src = originalUrl;
            await new Promise<void>((res, rej) => {
                img.onload = () => res();
                img.onerror = () => rej(new Error("Image failed to load"));
            });

            const targetW = Math.round(imageDimensions.width * (resizing.scale / 100));
            const targetH = Math.round(imageDimensions.height * (resizing.scale / 100));

            const canvas = document.createElement("canvas");
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext("2d")!;

            // If flattenOnExport is on (typical for JPG output, which has no
            // alpha channel), fill with the chosen color first.
            const formatNeedsOpaque = outputFormat === "jpeg" || flattenOnExport;
            if (formatNeedsOpaque) {
                ctx.fillStyle = flattenColor;
                ctx.fillRect(0, 0, targetW, targetH);
            }

            ctx.drawImage(img, 0, 0, targetW, targetH);

            const mime = FORMAT_MIMES[outputFormat];
            const blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), mime, quality / 100));
            if (!blob) throw new Error("toBlob returned null");

            if (resultUrl) URL.revokeObjectURL(resultUrl);
            setResultUrl(URL.createObjectURL(blob));
            setResultSize(blob.size);
        } catch (e) {
            console.error(e);
            alert("Conversion failed: " + (e as Error).message);
        } finally {
            setIsProcessing(false);
        }
    };

    const reset = () => {
        if (originalUrl) URL.revokeObjectURL(originalUrl);
        if (resultUrl) URL.revokeObjectURL(resultUrl);
        setOriginalUrl(null);
        setResultUrl(null);
        setOriginalMeta(null);
        setImageDimensions(null);
        setResultSize(0);
        setResizing({ width: 100, height: 100, scale: 100 });
        if (inputRef.current) inputRef.current.value = "";
    };

    const formatBytes = (n: number) => {
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="h-full overflow-y-auto p-4 text-orange-300 font-fira-code">
            <h2 className="text-2xl font-bold mb-2">Image Format Converter</h2>
            <p className="text-sm text-gray-400 mb-4">
                Convert images between PNG, JPG, and WebP. Optionally resize, change quality, or bake a transparent background onto a solid color for JPG output.
            </p>

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
                    <p className="text-gray-400">Click to upload an image</p>
                </div>
            )}

            {originalUrl && originalMeta && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                        <h3 className="font-bold text-orange-400 mb-2">Original</h3>
                        <div className="border border-gray-700 rounded p-2 bg-gray-800">
                            <img src={originalUrl} alt="Original" className="max-w-full max-h-96 mx-auto" />
                        </div>
                        <p className="text-sm text-gray-400 mt-2">
                            <FontAwesomeIcon icon={faImage} className="mr-1" />
                            {originalMeta.name} • {originalMeta.width}×{originalMeta.height} • {formatBytes(originalMeta.size)}
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold text-orange-400 mb-2">Convert</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm mb-1">Output format</label>
                                <select
                                    value={outputFormat}
                                    onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                                    className="w-full bg-gray-800 border border-gray-700 text-orange-300 px-3 py-2 rounded"
                                >
                                    {(Object.keys(FORMAT_MIMES) as OutputFormat[]).map((f) => (
                                        <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
                                    ))}
                                </select>
                            </div>

                            {outputFormat === "jpeg" && (
                                <div className="bg-yellow-900 border border-yellow-700 text-yellow-200 p-2 rounded text-sm">
                                    JPEG doesn't support transparency. We'll auto-flatten on white below; toggle <em>Flatten on solid color</em> to change the color.
                                </div>
                            )}

                            <div>
                                <label className="block text-sm mb-1">Quality: {quality}%</label>
                                <input
                                    type="range"
                                    min="1"
                                    max="100"
                                    value={quality}
                                    onChange={(e) => setQuality(Number(e.target.value))}
                                    className="w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-sm mb-1">Scale: {resizing.scale}%</label>
                                <input
                                    type="range"
                                    min="1"
                                    max="200"
                                    value={resizing.scale}
                                    onChange={(e) => {
                                        const scale = Number(e.target.value);
                                        setResizing({
                                            width: imageDimensions ? Math.round(imageDimensions.width * (scale / 100)) : 0,
                                            height: imageDimensions ? Math.round(imageDimensions.height * (scale / 100)) : 0,
                                            scale,
                                        });
                                    }}
                                    className="w-full"
                                />
                                <p className="text-xs text-gray-400">
                                    Target: {resizing.width}×{resizing.height}px
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    id="flatten"
                                    type="checkbox"
                                    checked={flattenOnExport}
                                    onChange={(e) => setFlattenOnExport(e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <label htmlFor="flatten" className="text-sm">Flatten on solid color</label>
                                {flattenOnExport && (
                                    <input
                                        type="color"
                                        value={flattenColor}
                                        onChange={(e) => setFlattenColor(e.target.value)}
                                        className="w-8 h-8 rounded"
                                    />
                                )}
                            </div>

                            <button
                                onClick={handleConvert}
                                disabled={isProcessing}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
                            >
                                {isProcessing ? "Converting…" : "Convert"}
                            </button>
                        </div>
                    </div>

                    {resultUrl && (
                        <div className="lg:col-span-2 mt-4">
                            <h3 className="font-bold text-orange-400 mb-2">Result ({formatBytes(resultSize)})</h3>
                            <div
                                className="border border-gray-700 rounded p-2"
                                style={{
                                    backgroundImage:
                                        "linear-gradient(45deg, #444 25%, transparent 25%), linear-gradient(-45deg, #444 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #444 75%), linear-gradient(-45deg, transparent 75%, #444 75%)",
                                    backgroundSize: "20px 20px",
                                    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                                    backgroundColor: "#666",
                                }}
                            >
                                <img src={resultUrl} alt="Result" className="max-w-full max-h-96 mx-auto" />
                            </div>
                            <div className="mt-3 flex gap-2">
                                <a
                                    href={resultUrl}
                                    download={`converted.${FORMAT_EXTS[outputFormat]}`}
                                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                                >
                                    <FontAwesomeIcon icon={faDownload} /> Download {FORMAT_EXTS[outputFormat].toUpperCase()}
                                </a>
                                <button
                                    onClick={reset}
                                    className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
                                >
                                    <FontAwesomeIcon icon={faTrash} /> New image
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ImageFormatConverter;
