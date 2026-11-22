/**
 * @file mapCapture.ts
 *
 * Capture the map view as a picture.
 *
 * The map is painted into one or more canvases inside the map's own
 * element. Compositing those canvases onto a single canvas and handing
 * that to the browser as a download is the whole trick — Google's tiles
 * are served with CORS headers, so the canvas can be read back (a
 * tainted canvas would make `toDataURL` throw).
 */
import { downloadDataUrl } from "@/features/map/utils/shapeTransfer";

/**
 * The name of the captured picture: `whereq-map-2026-11-21.png`.
 */
export const buildMapFileName = (date: Date = new Date()): string => {
    const stamp = date.toISOString().slice(0, 10);
    return `whereq-map-${stamp}.png`;
};

/**
 * Draw the map's canvases onto one canvas and return it as a PNG data URL.
 *
 * Returns `null` when the map has nothing to capture yet.
 */
export const captureMapImage = (map: google.maps.Map): string | null => {
    const container = map.getDiv();
    if (!container) {
        return null;
    }

    const bounds = container.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) {
        return null;
    }

    const canvases = Array.from(container.querySelectorAll("canvas"));
    if (canvases.length === 0) {
        return null;
    }

    const ratio = window.devicePixelRatio || 1;
    const output = document.createElement("canvas");
    output.width = Math.round(bounds.width * ratio);
    output.height = Math.round(bounds.height * ratio);

    const context = output.getContext("2d");
    if (!context) {
        return null;
    }

    // The app's own background, so a transparent map does not come out as
    // a black rectangle.
    context.fillStyle = "#161b27";
    context.fillRect(0, 0, output.width, output.height);

    canvases.forEach((canvas) => {
        const canvasBounds = canvas.getBoundingClientRect();
        if (canvasBounds.width === 0 || canvasBounds.height === 0) {
            return;
        }
        try {
            context.drawImage(
                canvas,
                (canvasBounds.left - bounds.left) * ratio,
                (canvasBounds.top - bounds.top) * ratio,
                canvasBounds.width * ratio,
                canvasBounds.height * ratio
            );
        } catch (error) {
            console.error("Could not copy the map canvas:", error);
        }
    });

    try {
        return output.toDataURL("image/png");
    } catch (error) {
        console.error("Could not read the map canvas:", error);
        return null;
    }
};

/**
 * Capture the map and save it as a PNG file.
 *
 * Returns true when the picture was written.
 */
export const captureAndDownloadMap = (
    map: google.maps.Map,
    fileName: string = buildMapFileName()
): boolean => {
    const dataUrl = captureMapImage(map);
    if (!dataUrl) {
        return false;
    }
    downloadDataUrl(dataUrl, fileName);
    return true;
};
