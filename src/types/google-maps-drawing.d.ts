/// <reference types="google.maps" />

/**
 * Local type augmentation for the deprecated Google Maps Drawing library.
 *
 * The triple-slash reference above is load-bearing: TypeScript 6 stopped
 * auto-including `@types/google.maps` from `node_modules/@types` (TS 5.9
 * still did), so without it the global `google.maps` namespace is missing
 * and every `google.maps.Map` reference fails to compile.
 *
 * `@types/google.maps` (the package `@vis.gl/react-google-maps` depends on)
 * declares `google.maps.drawing.DrawingManager` as an **empty** class because
 * Google deprecated the Drawing library in August 2025 and stopped shipping the
 * functionality with Maps JS API v3.65. The upstream types therefore dropped
 * the members the map feature still calls.
 *
 * This file restores the deprecated surface as an *interface* merged into the
 * upstream class, so the existing drawing code keeps compiling unchanged. It
 * changes no runtime behaviour — the members below are exactly what the
 * DrawingManager had before the deprecation:
 *
 *   - `setMap(map)`   — attach / detach the drawing tool from a map
 *   - `setOptions(o)` — switch the drawing mode and the overlay styles
 *   - `drawingMode`   — the active overlay type
 *
 * When the map drawing feature is migrated off the deprecated Drawing library,
 * this file can be deleted along with the code that depends on it.
 */
declare namespace google.maps.drawing {
    /** Options accepted by the deprecated `DrawingManager` constructor. */
    interface DrawingManagerOptions {
        drawingMode?: google.maps.drawing.OverlayType | null;
        drawingControl?: boolean;
        drawingControlOptions?: {
            position?: google.maps.ControlPosition;
            drawPolygon?: boolean;
            drawCircle?: boolean;
            drawRectangle?: boolean;
            drawMarker?: boolean;
            polylineOptions?: google.maps.PolylineOptions;
            polygonOptions?: google.maps.PolygonOptions;
            circleOptions?: google.maps.CircleOptions;
            rectangleOptions?: google.maps.RectangleOptions;
        };
        markerOptions?: google.maps.MarkerOptions;
        polylineOptions?: google.maps.PolylineOptions;
        polygonOptions?: google.maps.PolygonOptions;
        circleOptions?: google.maps.CircleOptions;
        rectangleOptions?: google.maps.RectangleOptions;
    }

    /**
     * Constructor signature of the deprecated `DrawingManager`.
     *
     * The upstream class is declared without a constructor, so `new
     * google.maps.drawing.DrawingManager(options)` no longer type-checks even
     * though the runtime accepts it. Call sites cast the class to this type.
     */
    type DrawingManagerConstructor = new (
        options?: google.maps.drawing.DrawingManagerOptions
    ) => google.maps.drawing.DrawingManager;

    /**
     * Event fired by the DrawingManager when an overlay is finished.
     * Also dropped from the upstream types with the DrawingManager itself.
     */
    interface OverlayCompleteEvent {
        /** The overlay type that was drawn. */
        type: string;
        /** The drawn overlay. */
        overlay:
            | google.maps.Circle
            | google.maps.Marker
            | google.maps.Polygon
            | google.maps.Polyline
            | google.maps.Rectangle;
    }

    /** The deprecated members, merged into the upstream (empty) class. */
    interface DrawingManager {
        /** Attaches the drawing tool to a map, or detaches it with `null`. */
        setMap(map: google.maps.Map | null): void;
        /** Applies drawing options (drawing mode, overlay styles). */
        setOptions(options: google.maps.drawing.DrawingManagerOptions): void;
        /** Reads back the current drawing options. */
        getOptions(): google.maps.drawing.DrawingManagerOptions;
        /** The overlay type the tool is currently drawing. */
        drawingMode: google.maps.drawing.OverlayType | null;
    }
}
