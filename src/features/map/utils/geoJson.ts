/**
 * @file geoJson.ts
 *
 * The interchange format for the map feature's drawn shapes.
 *
 * The document is **GeoJSON** (RFC 7946) — the interchange standard for
 * geographic data — with two deliberate choices:
 *
 *   1. GeoJSON orders a position as `[longitude, latitude]`, the opposite of
 *      the `{lat, lng}` literals the Maps API uses. Every conversion in this
 *      file goes through `toGeoJsonPosition` / `fromGeoJsonPosition`, so the
 *      flip happens in exactly one place.
 *   2. A GeoJSON `FeatureCollection` may carry foreign members (RFC 7946
 *      §6.1). The `whereq` member holds this app's own metadata — the schema
 *      version, the export time and the shape count — so a consumer can tell
 *      a whereq export from any other GeoJSON file without the document
 *      losing its standard shape.
 *
 * Only the two path shapes are exchanged: `Polygon` (GeoJSON) ←→
 * `MapOverlayType.Polygon` and `LineString` (GeoJSON) ←→
 * `MapOverlayType.Polyline`. Markers, circles and rectangles are left out on
 * purpose — they are not paths, and a circle has no GeoJSON equivalent.
 *
 * The reader is forgiving about the *document* and strict about the
 * *geometry*: a file that is not GeoJSON at all is rejected with a message
 * the visitor can act on, while a single feature that cannot be used is
 * skipped and counted, so one bad shape never costs the visitor the rest.
 */
import { MapOverlayType, MapShapeType } from "@/features/map/models/MapEnum";
import type { MapOverlay } from "@/features/map/types/types";
import { MAP_DRAWING_COLOR } from "@/features/map/utils/constants";

/** The app that wrote the document. */
export const GEOJSON_APP = "whereq.ca";

/** The version of this document shape. Bump it when the schema changes. */
export const GEOJSON_SCHEMA_VERSION = "1.0";

/** The GeoJSON geometry types this feature exchanges. */
export type GeoJsonGeometryType = "Polygon" | "LineString";

/** The styling hints carried alongside a shape. */
export interface GeoJsonProperties {
    /** The shape's name in the app. */
    name?: string;
    /** The shape's description in the app. */
    description?: string;
    /** The stroke colour the shape was drawn with. */
    strokeColor?: string;
    /** The stroke weight the shape was drawn with. */
    strokeWeight?: number;
    /** The fill colour the shape was drawn with (polygons only). */
    fillColor?: string;
}

/** One shape in the document. */
export interface GeoJsonFeature {
    type: "Feature";
    id?: string;
    geometry: {
        type: GeoJsonGeometryType;
        /** `Polygon`: an array of rings. `LineString`: an array of positions. */
        coordinates: number[][][] | number[][];
    };
    properties: GeoJsonProperties;
}

/** The document the map feature writes and reads. */
export interface GeoJsonDocument {
    type: "FeatureCollection";
    features: GeoJsonFeature[];
    /** Foreign member (RFC 7946 §6.1) with this app's own metadata. */
    whereq: {
        app: string;
        version: string;
        exportedAt: string;
        shapeCount: number;
    };
}

/**
 * A shape that was read from a document and is ready to be drawn.
 *
 * It is deliberately *not* a `MapOverlay`: the drawing controller builds the
 * overlay (with its own id and its listeners) when it draws the shape.
 */
export interface ShapeToImport {
    type: MapShapeType.Polygon | MapShapeType.Polyline;
    coordinates: google.maps.LatLngLiteral[];
    title?: string;
    description?: string;
}

/** What a document yielded: the usable shapes and the ones that were skipped. */
export interface ParsedShapeDocument {
    shapes: ShapeToImport[];
    /** How many features could not be used, and why they were dropped. */
    skipped: number;
}

/** Thrown when a file is not a shape document at all. */
export class GeoJsonError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "GeoJsonError";
    }
}

/** A GeoJSON position: `[longitude, latitude]`. */
type GeoJsonPosition = [number, number];

const LATITUDE_LIMIT = 90;
const LONGITUDE_LIMIT = 180;

/** `{lat, lng}` → `[lng, lat]`. */
const toGeoJsonPosition = (latLng: google.maps.LatLngLiteral): GeoJsonPosition => [
    latLng.lng,
    latLng.lat,
];

/** `[lng, lat]` → `{lat, lng}`. */
const fromGeoJsonPosition = (position: number[]): google.maps.LatLngLiteral => {
    const [lng, lat] = position;
    return { lat, lng };
};

/**
 * The signed area of a ring (the shoelace formula).
 *
 * Positive means the ring winds counter-clockwise. `x` is longitude and `y`
 * is latitude, so the sign matches the GeoJSON convention directly.
 */
const signedArea = (ring: GeoJsonPosition[]): number => {
    let sum = 0;
    for (let index = 0; index < ring.length; index++) {
        const [x1, y1] = ring[index];
        const [x2, y2] = ring[(index + 1) % ring.length];
        sum += x1 * y2 - x2 * y1;
    }
    return sum / 2;
};

/**
 * RFC 7946 §3.1.6 asks exterior rings to wind counter-clockwise. The map
 * draws a ring in click order, so the winding is whatever the visitor did —
 * it is normalised here, which keeps the export usable by the GIS tools that
 * care about the right-hand rule.
 */
const ensureCounterClockwise = (ring: GeoJsonPosition[]): GeoJsonPosition[] =>
    signedArea(ring) < 0 ? [...ring].reverse() : ring;

const isClosedRing = (ring: GeoJsonPosition[]): boolean =>
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1];

const closeRing = (ring: GeoJsonPosition[]): GeoJsonPosition[] =>
    isClosedRing(ring) ? ring : [...ring, ring[0]];

/** Drop a point that repeats the one before it. */
const dropRepeatedPoints = (positions: GeoJsonPosition[]): GeoJsonPosition[] =>
    positions.filter((position, index) => {
        if (index === 0) {
            return true;
        }
        const [lng, lat] = position;
        const [previousLng, previousLat] = positions[index - 1];
        return lng !== previousLng || lat !== previousLat;
    });

/** A position is usable when it is a pair of finite numbers in range. */
const isValidPosition = (value: unknown): value is number[] => {
    if (!Array.isArray(value) || value.length < 2) {
        return false;
    }
    const [lng, lat] = value;
    return (
        typeof lng === "number" &&
        typeof lat === "number" &&
        Number.isFinite(lng) &&
        Number.isFinite(lat) &&
        Math.abs(lat) <= LATITUDE_LIMIT &&
        Math.abs(lng) <= LONGITUDE_LIMIT
    );
};

/**
 * Turn the map's overlays into a GeoJSON document.
 *
 * Only polygons and polylines are written; every other overlay (a marker, a
 * circle, a rectangle) is left out, because those are not paths.
 */
export const overlaysToGeoJson = (
    overlays: MapOverlay[],
    exportedAt: Date = new Date()
): GeoJsonDocument => {
    const features: GeoJsonFeature[] = [];

    overlays.forEach((overlay) => {
        const coordinates = overlay.coordinates ?? [];
        if (coordinates.length === 0) {
            return;
        }

        const properties: GeoJsonProperties = {
            name: overlay.title || undefined,
            description: overlay.description || undefined,
            strokeColor: MAP_DRAWING_COLOR.DEFAULT_STROKE_COLOR,
            strokeWeight: 4,
        };

        if (overlay.type === MapOverlayType.Polygon) {
            const ring = coordinates.map(toGeoJsonPosition);
            features.push({
                type: "Feature",
                id: overlay.id,
                geometry: {
                    type: "Polygon",
                    coordinates: [ensureCounterClockwise(closeRing(ring))],
                },
                properties: { ...properties, fillColor: MAP_DRAWING_COLOR.DEFAULT_FILL_COLOR },
            });
            return;
        }

        if (overlay.type === MapOverlayType.Polyline) {
            features.push({
                type: "Feature",
                id: overlay.id,
                geometry: {
                    type: "LineString",
                    coordinates: coordinates.map(toGeoJsonPosition),
                },
                properties,
            });
        }
    });

    return {
        type: "FeatureCollection",
        features,
        whereq: {
            app: GEOJSON_APP,
            version: GEOJSON_SCHEMA_VERSION,
            exportedAt: exportedAt.toISOString(),
            shapeCount: features.length,
        },
    };
};

/**
 * Collect the features of a document.
 *
 * A `FeatureCollection` is the canonical form, but a single `Feature`, a
 * bare geometry and a plain array of either are all accepted — the file may
 * well have come from another tool.
 */
const collectFeatures = (input: unknown): unknown[] => {
    if (Array.isArray(input)) {
        return input;
    }

    if (!input || typeof input !== "object") {
        throw new GeoJsonError("That file does not contain any shapes.");
    }

    const candidate = input as { type?: unknown; features?: unknown };

    if (candidate.type === "FeatureCollection") {
        if (!Array.isArray(candidate.features)) {
            throw new GeoJsonError("That file's shape list is broken.");
        }
        return candidate.features;
    }

    // A GeoJSON document always names its type. A file without one is not a
    // shape file at all, and saying so is more useful than reporting that it
    // holds no shapes.
    if (typeof candidate.type !== "string") {
        throw new GeoJsonError("That file is not a shapes file.");
    }

    return [input];
};

/** Read the geometry and the properties of one feature. */
const readFeature = (item: unknown): { geometry: unknown; properties: GeoJsonProperties } => {
    if (!item || typeof item !== "object") {
        return { geometry: null, properties: {} };
    }

    const candidate = item as { type?: unknown; geometry?: unknown; properties?: unknown };

    if (candidate.type === "Feature") {
        const properties =
            candidate.properties && typeof candidate.properties === "object"
                ? (candidate.properties as GeoJsonProperties)
                : {};
        return { geometry: candidate.geometry ?? null, properties };
    }

    // A bare geometry.
    return { geometry: item, properties: {} };
};

/** Build one shape from a GeoJSON ring. */
const shapeFromRing = (ring: unknown[]): ShapeToImport | null => {
    const positions = ring.filter(isValidPosition).map((position) => [
        position[0],
        position[1],
    ] as GeoJsonPosition);

    const unique = dropRepeatedPoints(positions);
    if (unique.length < 3) {
        return null;
    }

    // The closing point repeats the first one: it is not a vertex of its own,
    // so a ring needs three *distinct* points to be a polygon.
    const vertices = isClosedRing(unique) ? unique.slice(0, -1) : unique;
    if (vertices.length < 3) {
        return null;
    }

    const closed = closeRing(unique);
    return {
        type: MapShapeType.Polygon,
        coordinates: closed.map(fromGeoJsonPosition),
    };
};

/** Build one shape from a GeoJSON line. */
const shapeFromLine = (line: unknown[]): ShapeToImport | null => {
    const positions = line.filter(isValidPosition).map((position) => [
        position[0],
        position[1],
    ] as GeoJsonPosition);

    const unique = dropRepeatedPoints(positions);
    if (unique.length < 2) {
        return null;
    }

    return {
        type: MapShapeType.Polyline,
        coordinates: unique.map(fromGeoJsonPosition),
    };
};

/**
 * Read a shape document.
 *
 * Throws a {@link GeoJsonError} when the file is not a shape document at all;
 * features that cannot be used are skipped and counted instead.
 */
export const parseShapeDocument = (text: string): ParsedShapeDocument => {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        throw new GeoJsonError("That file is not valid JSON.");
    }

    const items = collectFeatures(parsed);
    const shapes: ShapeToImport[] = [];
    let skipped = 0;

    items.forEach((item) => {
        const { geometry, properties } = readFeature(item);

        if (!geometry || typeof geometry !== "object") {
            skipped += 1;
            return;
        }

        const candidate = geometry as { type?: unknown; coordinates?: unknown };
        const coordinates = candidate.coordinates;

        if (!Array.isArray(coordinates)) {
            skipped += 1;
            return;
        }

        const title = typeof properties.name === "string" ? properties.name : undefined;
        const description =
            typeof properties.description === "string" ? properties.description : undefined;

        if (candidate.type === "Polygon") {
            // Only the outer ring is used: the map cannot draw a hole.
            const shape = shapeFromRing(coordinates[0] as unknown[]);
            if (!shape) {
                skipped += 1;
                return;
            }
            shapes.push({ ...shape, title, description });
            return;
        }

        if (candidate.type === "LineString") {
            const shape = shapeFromLine(coordinates);
            if (!shape) {
                skipped += 1;
                return;
            }
            shapes.push({ ...shape, title, description });
            return;
        }

        if (candidate.type === "MultiPolygon") {
            // A multi-polygon becomes one overlay per polygon.
            let added = 0;
            coordinates.forEach((polygon) => {
                if (!Array.isArray(polygon)) {
                    return;
                }
                const shape = shapeFromRing(polygon[0] as unknown[]);
                if (shape) {
                    shapes.push({ ...shape, title, description });
                    added += 1;
                }
            });
            if (added === 0) {
                skipped += 1;
            }
            return;
        }

        if (candidate.type === "MultiLineString") {
            let added = 0;
            coordinates.forEach((line) => {
                if (!Array.isArray(line)) {
                    return;
                }
                const shape = shapeFromLine(line);
                if (shape) {
                    shapes.push({ ...shape, title, description });
                    added += 1;
                }
            });
            if (added === 0) {
                skipped += 1;
            }
            return;
        }

        // A point, or a geometry type this feature does not draw.
        skipped += 1;
    });

    return { shapes, skipped };
};
