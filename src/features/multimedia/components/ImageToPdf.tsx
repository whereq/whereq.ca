import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowDown,
    faArrowUp,
    faDownload,
    faFilePdf,
    faImages,
    faPlus,
    faTrash,
    faTriangleExclamation,
    faUpload,
} from "@fortawesome/free-solid-svg-icons";
import { PDFDocument } from "pdf-lib";
import CustomModal from "@/components/modals/CustomModal";

/**
 * Image to PDF
 *
 * Turns a list of uploaded images (max 9) into a downloadable PDF,
 * entirely in the browser. The heavy lifting is done by `pdf-lib`,
 * a pure-JS PDF writer — no server round-trip, no headless Chrome,
 * no print dialog.
 *
 * Layouts:
 * - "one"    → one image per page, scaled to fit the page, centred.
 * - "2x2"    → four images per page in a 2×2 grid.
 * - "3x3"    → nine images per page in a 3×3 grid (the whole set on one page).
 *
 * Page sizes: A4, US Letter, or "fit to image" (the page matches the
 * first image's pixel dimensions, 1px = 1pt, capped at 1440pt).
 *
 * Image handling: PNG and JPEG are embedded losslessly as-is. Every
 * other browser-readable format (WebP, GIF, BMP, AVIF…) is re-encoded
 * to PNG through a canvas first, because pdf-lib only speaks PNG/JPEG.
 *
 * Re-upload guard: when a finished PDF is still on screen and the
 * user changes the image list (add / remove / reorder), we surface a
 * warning modal with three explicit actions — "Download previous",
 * "Discard & continue", "Cancel" — instead of silently invalidating
 * the artifact. We never use the browser's native alert/confirm.
 */

/** Hard cap on how many images can go into one document. */
const MAX_IMAGES = 9;

/** Page dimensions in PDF points (72pt = 1in). */
const PAGE_SIZES: Record<"a4" | "letter", [number, number]> = {
    a4: [595.28, 841.89],
    letter: [612, 792],
};

/** Cap for the "fit to image" page size, in points. */
const MAX_FIT_PAGE = 1440;

/** Grid geometry per layout. `perPage` drives how many images land on a page. */
const LAYOUTS: Record<LayoutKey, { cols: number; rows: number; perPage: number; label: string }> = {
    one: { cols: 1, rows: 1, perPage: 1, label: "One image per page" },
    grid2x2: { cols: 2, rows: 2, perPage: 4, label: "2 × 2 grid" },
    grid3x3: { cols: 3, rows: 3, perPage: 9, label: "3 × 3 grid" },
};

const CELL_MODES: Record<CellMode, { label: string; hint: string }> = {
    contain: { label: "Fit inside cell", hint: "Whole image visible, empty space around it." },
    cover: { label: "Fill cell", hint: "Image covers the cell, overflow is cropped." },
};

const GUTTER = 8;

type PageSizeKey = "a4" | "letter" | "fit";
type LayoutKey = "one" | "grid2x2" | "grid3x3";
type CellMode = "contain" | "cover";
type Orientation = "portrait" | "landscape";
type Status = "idle" | "building" | "done" | "error";

interface PdfImageItem {
    id: string;
    file: File;
    /** Object URL used for the on-screen thumbnail. */
    url: string;
    name: string;
    size: number;
    width: number;
    height: number;
}

interface PageDims {
    width: number;
    height: number;
}

/** Loads an <img> element from an object URL and resolves once decoded. */
const loadImageElement = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("The image could not be decoded."));
        img.src = url;
    });

/** Reads an image file, creating the object URL and measuring it. */
const readImageItem = async (file: File): Promise<PdfImageItem> => {
    const url = URL.createObjectURL(file);
    try {
        const img = await loadImageElement(url);
        return {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            file,
            url,
            name: file.name,
            size: file.size,
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
        };
    } catch (e) {
        URL.revokeObjectURL(url);
        throw e;
    }
};

/** Re-encodes any browser-readable image into PNG bytes via a canvas. */
const toPngBytes = async (item: PdfImageItem): Promise<Uint8Array> => {
    const img = await loadImageElement(item.url);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable in this browser.");
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error(`Could not convert ${item.name} to PNG.`);
    return new Uint8Array(await blob.arrayBuffer());
};

/**
 * Crops an image to a target aspect ratio (centre crop) and returns
 * PNG bytes. Used by the "fill cell" grid mode, where the PDF has no
 * clipping primitive — the crop has to happen in pixels.
 */
const cropToPngBytes = async (item: PdfImageItem, targetRatio: number): Promise<Uint8Array> => {
    const img = await loadImageElement(item.url);
    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    const srcRatio = srcW / srcH;

    let sx = 0;
    let sy = 0;
    let sw = srcW;
    let sh = srcH;
    if (srcRatio > targetRatio) {
        sw = srcH * targetRatio;
        sx = (srcW - sw) / 2;
    } else {
        sh = srcW / targetRatio;
        sy = (srcH - sh) / 2;
    }

    const outW = Math.max(1, Math.min(2400, Math.round(sw)));
    const outH = Math.max(1, Math.round(outW / targetRatio));
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable in this browser.");
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error(`Could not crop ${item.name}.`);
    return new Uint8Array(await blob.arrayBuffer());
};

const ImageToPdf = () => {
    const [images, setImages] = useState<PdfImageItem[]>([]);
    const [pageSize, setPageSize] = useState<PageSizeKey>("a4");
    const [orientation, setOrientation] = useState<Orientation>("portrait");
    const [layout, setLayout] = useState<LayoutKey>("one");
    const [cellMode, setCellMode] = useState<CellMode>("contain");
    const [margin, setMargin] = useState(24);

    const [status, setStatus] = useState<Status>("idle");
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfSize, setPdfSize] = useState(0);
    const [pageCount, setPageCount] = useState(0);

    const [showReplaceWarning, setShowReplaceWarning] = useState(false);

    const inputRef = useRef<HTMLInputElement | null>(null);
    /** The action to run once the user resolves the replace warning. */
    const pendingActionRef = useRef<(() => void) | null>(null);
    /** Mirrors `images` so the unmount cleanup can revoke every URL. */
    const imagesRef = useRef<PdfImageItem[]>([]);
    /** Slots claimed by in-flight image loads (see `addImages`). */
    const reservedRef = useRef(0);
    /** Mirrors `pdfUrl` for the same reason. */
    const pdfUrlRef = useRef<string | null>(null);

    /**
     * The single writer for the image list. Keeping the ref in sync
     * synchronously means the cap check in `addImages` never reads a
     * stale count, even while a previous load is still decoding.
     */
    const commitImages = (updater: (prev: PdfImageItem[]) => PdfImageItem[]) => {
        const next = updater(imagesRef.current);
        imagesRef.current = next;
        setImages(next);
    };

    useEffect(() => {
        pdfUrlRef.current = pdfUrl;
    }, [pdfUrl]);

    // Blob URLs leak across hot reloads unless we revoke them explicitly.
    useEffect(() => {
        return () => {
            imagesRef.current.forEach((item) => URL.revokeObjectURL(item.url));
            if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
        };
    }, []);

    const formatBytes = (n: number) => {
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    };

    /** Drops the finished PDF (revoking its URL) and returns to a clean slate. */
    const clearResult = () => {
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
        setPdfSize(0);
        setPageCount(0);
    };

    /**
     * Runs `action` immediately unless a finished PDF is still on screen.
     * In that case we ask first — the artifact would otherwise go stale
     * without the user noticing.
     */
    const requestChange = (action: () => void) => {
        if (pdfUrl) {
            pendingActionRef.current = action;
            setShowReplaceWarning(true);
            return;
        }
        action();
    };

    const addImages = async (fileList: File[]) => {
        const picked = fileList.filter((f) => f.type.startsWith("image/"));
        if (picked.length === 0) {
            setNotice("Those files aren't images. Pick PNG, JPEG, WebP, GIF, or BMP files.");
            return;
        }

        const room = MAX_IMAGES - (imagesRef.current.length + reservedRef.current);
        if (room <= 0) {
            setNotice(`The limit is ${MAX_IMAGES} images per document. Remove one to add another.`);
            return;
        }

        const accepted = picked.slice(0, room);
        const dropped = picked.length - accepted.length;

        // Reserve the slots before the async reads so a second, faster
        // pick can't slip past the cap while these are still decoding.
        reservedRef.current += accepted.length;

        const loaded: PdfImageItem[] = [];
        try {
            for (const file of accepted) {
                try {
                    loaded.push(await readImageItem(file));
                } catch {
                    // Unreadable image (corrupt file, unsupported codec) — skip it.
                }
            }
        } finally {
            reservedRef.current -= accepted.length;
        }

        if (loaded.length === 0) {
            setNotice("None of those images could be read.");
            return;
        }

        setNotice(
            dropped > 0
                ? `Only ${accepted.length} image(s) were added — the limit is ${MAX_IMAGES}.`
                : null
        );
        commitImages((prev) => [...prev, ...loaded].slice(0, MAX_IMAGES));
        setError(null);
        setStatus("idle");
    };

    const removeImage = (id: string) => {
        requestChange(() => {
            commitImages((prev) => {
                const target = prev.find((i) => i.id === id);
                if (target) URL.revokeObjectURL(target.url);
                return prev.filter((i) => i.id !== id);
            });
            setStatus("idle");
        });
    };

    const moveImage = (index: number, direction: -1 | 1) => {
        requestChange(() => {
            commitImages((prev) => {
                const target = index + direction;
                if (target < 0 || target >= prev.length) return prev;
                const next = [...prev];
                const [moved] = next.splice(index, 1);
                next.splice(target, 0, moved);
                return next;
            });
            setStatus("idle");
        });
    };

    const clearAll = () => {
        requestChange(() => {
            commitImages((prev) => {
                prev.forEach((item) => URL.revokeObjectURL(item.url));
                return [];
            });
            setNotice(null);
            setError(null);
            setStatus("idle");
        });
        if (inputRef.current) inputRef.current.value = "";
    };

    /** Page dimensions for the current options and the images on the page. */
    const computePageDims = (chunk: PdfImageItem[]): PageDims => {
        if (layout === "one" && pageSize === "fit") {
            const first = chunk[0];
            const longest = Math.max(first.width, first.height) || 1;
            const scale = Math.min(1, MAX_FIT_PAGE / longest);
            return { width: first.width * scale, height: first.height * scale };
        }
        const key = pageSize === "fit" ? "a4" : pageSize;
        const [w, h] = PAGE_SIZES[key];
        return orientation === "portrait" ? { width: w, height: h } : { width: h, height: w };
    };

    const buildPdf = async () => {
        if (images.length === 0) {
            setError("Add at least one image first.");
            setStatus("error");
            return;
        }

        setStatus("building");
        setError(null);
        setNotice(null);

        try {
            const doc = await PDFDocument.create();
            doc.setTitle("WhereQ Image to PDF");
            doc.setProducer("WhereQ Lab — Image to PDF");
            doc.setCreator("WhereQ Lab");

            const { cols, rows, perPage } = LAYOUTS[layout];
            // "Fit to image" only makes sense for one image per page.
            const effectiveMargin = layout === "one" && pageSize === "fit" ? 0 : margin;

            for (let i = 0; i < images.length; i += perPage) {
                const chunk = images.slice(i, i + perPage);
                const dims = computePageDims(chunk);
                const page = doc.addPage([dims.width, dims.height]);
                const contentW = dims.width - effectiveMargin * 2;
                const contentH = dims.height - effectiveMargin * 2;

                if (layout === "one") {
                    const item = chunk[0];
                    const embedded =
                        item.file.type === "image/png"
                            ? await doc.embedPng(new Uint8Array(await item.file.arrayBuffer()))
                            : item.file.type === "image/jpeg"
                              ? await doc.embedJpg(new Uint8Array(await item.file.arrayBuffer()))
                              : await doc.embedPng(await toPngBytes(item));

                    const scale = Math.min(contentW / embedded.width, contentH / embedded.height);
                    const w = embedded.width * scale;
                    const h = embedded.height * scale;
                    page.drawImage(embedded, {
                        x: effectiveMargin + (contentW - w) / 2,
                        y: effectiveMargin + (contentH - h) / 2,
                        width: w,
                        height: h,
                    });
                    continue;
                }

                const cellW = (contentW - GUTTER * (cols - 1)) / cols;
                const cellH = (contentH - GUTTER * (rows - 1)) / rows;

                for (let c = 0; c < chunk.length; c++) {
                    const item = chunk[c];
                    const col = c % cols;
                    const row = Math.floor(c / cols);
                    const x = effectiveMargin + col * (cellW + GUTTER);
                    // PDF origin is bottom-left, so the first row is the top one.
                    const y = dims.height - effectiveMargin - (row + 1) * cellH - row * GUTTER;

                    if (cellMode === "cover") {
                        const cropped = await doc.embedPng(await cropToPngBytes(item, cellW / cellH));
                        page.drawImage(cropped, { x, y, width: cellW, height: cellH });
                    } else {
                        const embedded =
                            item.file.type === "image/png"
                                ? await doc.embedPng(new Uint8Array(await item.file.arrayBuffer()))
                                : item.file.type === "image/jpeg"
                                  ? await doc.embedJpg(new Uint8Array(await item.file.arrayBuffer()))
                                  : await doc.embedPng(await toPngBytes(item));
                        const scale = Math.min(cellW / embedded.width, cellH / embedded.height);
                        const w = embedded.width * scale;
                        const h = embedded.height * scale;
                        page.drawImage(embedded, {
                            x: x + (cellW - w) / 2,
                            y: y + (cellH - h) / 2,
                            width: w,
                            height: h,
                        });
                    }
                }
            }

            const bytes = await doc.save();
            const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
            clearResult();
            setPdfUrl(URL.createObjectURL(blob));
            setPdfSize(blob.size);
            setPageCount(Math.ceil(images.length / perPage));
            setStatus("done");
        } catch (e) {
            console.error(e);
            setError("Could not build the PDF: " + (e as Error).message);
            setStatus("error");
        }
    };

    const handleDownload = () => {
        if (!pdfUrl) return;
        const a = document.createElement("a");
        a.href = pdfUrl;
        a.download = "whereq-images.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    /* ---- replace-warning modal actions ---- */

    const handleDiscardAndContinue = () => {
        clearResult();
        const pending = pendingActionRef.current;
        pendingActionRef.current = null;
        setShowReplaceWarning(false);
        if (pending) pending();
    };

    const handleDownloadPreviousAndContinue = () => {
        handleDownload();
        clearResult();
        const pending = pendingActionRef.current;
        pendingActionRef.current = null;
        setShowReplaceWarning(false);
        if (pending) pending();
    };

    const handleCancelChange = () => {
        pendingActionRef.current = null;
        setShowReplaceWarning(false);
        if (inputRef.current) inputRef.current.value = "";
    };

    const isFitMode = layout === "one" && pageSize === "fit";

    return (
        <div className="h-full overflow-y-auto p-4 text-orange-300 font-fira-code">
            <h2 className="text-2xl font-bold mb-2">Image to PDF</h2>
            <p className="text-sm text-gray-400 mb-4">
                Build a PDF from up to {MAX_IMAGES} images. Everything runs in your browser — nothing
                is uploaded to a server.
            </p>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    // Reset the input so picking the same file again still
                    // fires a change event. The File objects are already
                    // captured, so clearing the input value is harmless.
                    if (inputRef.current) inputRef.current.value = "";
                    if (files.length > 0) requestChange(() => void addImages(files));
                }}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ---------- source images ---------- */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-orange-400">
                            <FontAwesomeIcon icon={faImages} className="mr-1" />
                            Images
                        </h3>
                        <span className="text-sm text-gray-400">
                            {images.length} / {MAX_IMAGES}
                        </span>
                    </div>

                    <div
                        onClick={() => inputRef.current?.click()}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const files = Array.from(e.dataTransfer.files ?? []);
                            if (files.length > 0) requestChange(() => void addImages(files));
                        }}
                        className={`border-2 border-dashed rounded p-8 text-center cursor-pointer transition ${
                            isDragging
                                ? "border-orange-500 bg-gray-700"
                                : "border-gray-700 hover:border-orange-500"
                        }`}
                    >
                        <FontAwesomeIcon icon={faUpload} size="2x" className="text-gray-500 mb-2" />
                        <p className="text-gray-400">Click to upload or drop images here</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPEG, WebP, GIF, BMP — up to {MAX_IMAGES} files</p>
                    </div>

                    {notice && (
                        <div className="mt-3 bg-yellow-900/40 border border-yellow-700/60 text-yellow-200 p-2 rounded text-sm flex items-start gap-2">
                            <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5" />
                            <span>{notice}</span>
                        </div>
                    )}

                    {images.length > 0 && (
                        <ul className="mt-3 space-y-2">
                            {images.map((item, index) => (
                                <li
                                    key={item.id}
                                    className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded p-2"
                                >
                                    <span className="text-gray-500 text-xs w-4 text-right">{index + 1}</span>
                                    <img
                                        src={item.url}
                                        alt={item.name}
                                        className="w-14 h-14 object-cover rounded bg-gray-900"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="truncate text-sm text-orange-300">{item.name}</div>
                                        <div className="text-xs text-gray-400">
                                            {item.width}×{item.height} • {formatBytes(item.size)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => moveImage(index, -1)}
                                            disabled={index === 0}
                                            title="Move up"
                                            className="p-2 rounded text-gray-300 hover:text-orange-400 hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
                                        >
                                            <FontAwesomeIcon icon={faArrowUp} />
                                        </button>
                                        <button
                                            onClick={() => moveImage(index, 1)}
                                            disabled={index === images.length - 1}
                                            title="Move down"
                                            className="p-2 rounded text-gray-300 hover:text-orange-400 hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
                                        >
                                            <FontAwesomeIcon icon={faArrowDown} />
                                        </button>
                                        <button
                                            onClick={() => removeImage(item.id)}
                                            title="Remove image"
                                            className="p-2 rounded text-gray-300 hover:text-red-400 hover:bg-gray-700"
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    {images.length > 0 && (
                        <button
                            onClick={clearAll}
                            className="mt-3 inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
                        >
                            <FontAwesomeIcon icon={faTrash} /> Clear all
                        </button>
                    )}
                </div>

                {/* ---------- options + output ---------- */}
                <div>
                    <h3 className="font-bold text-orange-400 mb-2">Layout</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm mb-1">Page style</label>
                            <select
                                value={layout}
                                onChange={(e) => setLayout(e.target.value as LayoutKey)}
                                className="w-full bg-gray-800 border border-gray-700 text-orange-300 px-3 py-2 rounded"
                            >
                                {(Object.keys(LAYOUTS) as LayoutKey[]).map((key) => (
                                    <option key={key} value={key}>
                                        {LAYOUTS[key].label}
                                        {LAYOUTS[key].perPage > 1
                                            ? ` (${LAYOUTS[key].perPage} per page)`
                                            : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm mb-1">Page size</label>
                            <select
                                value={pageSize}
                                onChange={(e) => setPageSize(e.target.value as PageSizeKey)}
                                className="w-full bg-gray-800 border border-gray-700 text-orange-300 px-3 py-2 rounded"
                            >
                                <option value="a4">A4</option>
                                <option value="letter">US Letter</option>
                                <option value="fit" disabled={layout !== "one"}>
                                    Fit to image{layout !== "one" ? " (one image per page only)" : ""}
                                </option>
                            </select>
                        </div>

                        {layout === "one" && (
                            <div>
                                <label className="block text-sm mb-1">Orientation</label>
                                <div className="flex gap-2">
                                    {(["portrait", "landscape"] as Orientation[]).map((o) => (
                                        <button
                                            key={o}
                                            onClick={() => setOrientation(o)}
                                            disabled={pageSize === "fit"}
                                            className={`flex-1 px-3 py-2 rounded border text-sm capitalize ${
                                                orientation === o
                                                    ? "bg-orange-500 text-white border-orange-500"
                                                    : "bg-gray-800 border-gray-700 text-orange-300 hover:border-orange-500"
                                            } disabled:opacity-40 disabled:hover:border-gray-700`}
                                        >
                                            {o}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {layout !== "one" && (
                            <div>
                                <label className="block text-sm mb-1">Cell fill</label>
                                <div className="flex gap-2">
                                    {(Object.keys(CELL_MODES) as CellMode[]).map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => setCellMode(m)}
                                            title={CELL_MODES[m].hint}
                                            className={`flex-1 px-3 py-2 rounded border text-sm ${
                                                cellMode === m
                                                    ? "bg-orange-500 text-white border-orange-500"
                                                    : "bg-gray-800 border-gray-700 text-orange-300 hover:border-orange-500"
                                            }`}
                                        >
                                            {CELL_MODES[m].label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">{CELL_MODES[cellMode].hint}</p>
                            </div>
                        )}

                        {!isFitMode && (
                            <div>
                                <label className="block text-sm mb-1">Margin: {margin}pt</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="72"
                                    step="4"
                                    value={margin}
                                    onChange={(e) => setMargin(Number(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                        )}

                        <button
                            onClick={() => void buildPdf()}
                            disabled={status === "building" || images.length === 0}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <FontAwesomeIcon icon={faFilePdf} />
                            {status === "building" ? "Building PDF…" : "Create PDF"}
                        </button>

                        {status === "building" && (
                            <div className="h-1 w-full bg-gray-700 rounded overflow-hidden">
                                <div className="h-full w-1/3 bg-orange-500 animate-indeterminate" />
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-900/40 border border-red-700/60 text-red-200 p-2 rounded text-sm">
                                {error}
                            </div>
                        )}
                    </div>

                    {pdfUrl && status === "done" && (
                        <div className="mt-4 border border-gray-700 rounded p-3 bg-gray-800">
                            <div className="flex items-center gap-2 text-orange-400 font-bold mb-1">
                                <FontAwesomeIcon icon={faFilePdf} /> PDF ready
                            </div>
                            <div className="text-sm text-gray-300">
                                whereq-images.pdf • {pageCount} page{pageCount === 1 ? "" : "s"} •{" "}
                                {formatBytes(pdfSize)}
                            </div>
                            <div className="mt-3 flex gap-2">
                                <button
                                    onClick={handleDownload}
                                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                                >
                                    <FontAwesomeIcon icon={faDownload} /> Download PDF
                                </button>
                                <button
                                    onClick={clearAll}
                                    className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
                                >
                                    <FontAwesomeIcon icon={faPlus} /> Start over
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <CustomModal
                isOpen={showReplaceWarning}
                onRequestClose={handleCancelChange}
                title="Change the image list?"
                type="warning"
                actions={[
                    {
                        label: "Cancel",
                        className:
                            "bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 transition-colors duration-200",
                        onClick: handleCancelChange,
                    },
                    {
                        label: "Discard & continue",
                        className:
                            "bg-red-600 hover:bg-red-700 text-white px-4 py-2 transition-colors duration-200",
                        onClick: handleDiscardAndContinue,
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
                        You have a PDF that hasn&apos;t been downloaded yet. Changing the image list
                        will replace that result.
                    </p>
                    {pdfUrl && (
                        <div className="bg-gray-800 border border-gray-700 rounded p-3 text-sm">
                            <div className="flex items-center gap-2 text-orange-400 font-bold mb-1">
                                <FontAwesomeIcon icon={faFilePdf} />
                                Current result
                            </div>
                            <div className="text-gray-300">whereq-images.pdf</div>
                            <div className="text-gray-400">
                                {pageCount} page{pageCount === 1 ? "" : "s"} • {formatBytes(pdfSize)}
                            </div>
                        </div>
                    )}
                    <p className="text-gray-400 text-sm">
                        Choose <span className="text-green-400 font-bold">Download previous</span> to save
                        it first,{" "}
                        <span className="text-red-400 font-bold">Discard &amp; continue</span> to throw it
                        away, or <span className="text-white font-bold">Cancel</span> to keep everything as-is.
                    </p>
                </div>
            </CustomModal>
        </div>
    );
};

export default ImageToPdf;
