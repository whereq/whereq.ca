/**
 * @file shapeTransfer.ts
 *
 * The browser side of the shape exchange: writing the JSON document to disk
 * and naming the file.
 */
import type { GeoJsonDocument } from "@/features/map/utils/geoJson";

/**
 * The name of the downloaded file: `whereq-shapes-2026-11-21.json`.
 *
 * The date is in the file name so a folder of exports stays sortable.
 */
export const buildShapeFileName = (date: Date = new Date()): string => {
    const stamp = date.toISOString().slice(0, 10);
    return `whereq-shapes-${stamp}.json`;
};

/**
 * Save the document as a JSON file.
 *
 * The object URL is released a moment after the click: the browser has to
 * pick the download up first, and a URL that is revoked too early cancels it.
 */
export const downloadShapeDocument = (
    shapeDocument: GeoJsonDocument,
    fileName: string = buildShapeFileName()
): void => {
    const blob = new Blob([JSON.stringify(shapeDocument, null, 2)], {
        type: "application/geo+json",
    });
    const url = URL.createObjectURL(blob);

    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = "noopener";
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
