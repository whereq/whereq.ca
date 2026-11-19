/**
 * @file MapDrawingController.tsx
 * Native click-to-draw controller for the `/map` feature.
 *
 * This replaces the deprecated Google Maps Drawing library
 * (`google.maps.drawing.DrawingManager`). Google removed the DrawingManager
 * functionality from the Maps JavaScript API in v3.65.3b (4 June 2026) — the
 * served `drawing.js` now throws from the constructor on every API version
 * >= 3.65, which took the whole app down via the root ErrorBoundary the
 * moment a user picked a shape tool.
 *
 * The map feature only ever used DrawingManager as an *input device* — a
 * click-to-draw layer. Everything downstream is native `google.maps` overlay
 * API (vertex editing, per-overlay click handling, `AdvancedMarkerElement`
 * markers), and the app's own `MapOverlay` model already stores plain
 * coordinate arrays. So only the input layer had to be reimplemented; the
 * shape handlers in `utils/mapHandlers.ts` and the restore path in
 * `hooks/useOverlayManager.ts` are untouched.
 *
 * Interaction model:
 *   - Marker    — one click drops a marker.
 *   - Polyline  — click to add vertices, double click to finish.
 *   - Polygon   — click to add vertices, double click to finish (closes).
 *   - Circle    — click for the centre, click again for the edge (radius).
 *   - Rectangle — click one corner, click again for the opposite corner.
 *
 * The shape stays active afterwards, so several shapes can be drawn in a row;
 * switch back to the hand tool to stop drawing.
 */
import React, { useCallback, useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { MapShapeType, MarkerIconType } from "@/features/map/models/MapEnum";
import type { MapOverlay } from "@/features/map/types/types";
import { MAP_DRAWING_COLOR, MAP_DRAWING_PREVIEW } from "@/features/map/utils/constants";
import { useOverlayStore } from "@/features/map/store/mapStore";
import {
  handleCircleComplete,
  handleMarkerComplete,
  handlePolygonComplete,
  handlePolylineComplete,
  handleRectangleComplete,
  type MapDrawingSession,
} from "@/features/map/utils/mapHandlers";
import { makeDefaultMarkderContent } from "@/features/map/utils/mapUtils";

/**
 * A double click also fires two `click` events. Clicks that arrive within
 * this window of a completed shape are ignored, so the finishing gesture
 * cannot immediately start a new shape.
 */
const CLICK_GUARD_MS = 350;

/** Two clicks closer than this (in degrees) count as the same point. */
const SAME_POINT_EPSILON = 1e-7;

/** Minimum vertices before a path shape (polyline / polygon) can be finished. */
const MIN_PATH_POINTS = 2;

/** Mean Earth radius in metres, used by the haversine fallback. */
const EARTH_RADIUS_METERS = 6378137;

/**
 * Great-circle distance in metres between two points.
 *
 * Uses the first-party geometry library when it is loaded, and falls back to
 * a local haversine calculation otherwise, so a circle radius can always be
 * computed even if the geometry library is unavailable.
 */
const distanceBetween = (a: google.maps.LatLng, b: google.maps.LatLng): number => {
  const spherical = google.maps.geometry?.spherical;
  if (spherical?.computeDistanceBetween) {
    return spherical.computeDistanceBetween(a, b);
  }

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.lat() - a.lat());
  const dLng = toRadians(b.lng() - a.lng());
  const lat1 = toRadians(a.lat());
  const lat2 = toRadians(b.lat());

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
};

type DraftState =
  | { kind: "none" }
  | { kind: "path"; points: google.maps.LatLng[] }
  | { kind: "circle"; center: google.maps.LatLng }
  | { kind: "rectangle"; anchor: google.maps.LatLng };

type PreviewShape =
  | google.maps.Polygon
  | google.maps.Polyline
  | google.maps.Circle
  | google.maps.Rectangle;

const isSamePoint = (a: google.maps.LatLng, b: google.maps.LatLng) =>
  Math.abs(a.lat() - b.lat()) < SAME_POINT_EPSILON &&
  Math.abs(a.lng() - b.lng()) < SAME_POINT_EPSILON;

/** The shapes this controller knows how to draw. */
const DRAWABLE_SHAPES: MapShapeType[] = [
  MapShapeType.Marker,
  MapShapeType.Polyline,
  MapShapeType.Polygon,
  MapShapeType.Circle,
  MapShapeType.Rectangle,
];

const isDrawableShape = (shape: MapShapeType | null): shape is MapShapeType =>
  shape !== null && DRAWABLE_SHAPES.includes(shape);

const MapDrawingController: React.FC = () => {
  const map = useMap();

  const {
    mapShapeType,
    addToOverlayArrayOnMap,
    addToMapOverlayArrayOnMap,
    setSaveButtonInMapToolEnabled,
    setSelectedMarker,
    setDrawingUnavailable,
  } = useOverlayStore();

  /** Vertices collected so far for the shape being drawn. */
  const draftRef = useRef<DraftState>({ kind: "none" });
  /** The rubber-band shape shown while drawing. */
  const previewRef = useRef<PreviewShape | null>(null);
  /** False while the pointer hovers an existing shape. */
  const drawingEnabledRef = useRef(true);
  /** Timestamp before which map clicks are ignored. */
  const suppressClicksUntilRef = useRef(0);

  /**
   * Handed to the shape handlers so they can pause drawing on hover.
   * Created once, on the first render, and kept stable afterwards.
   */
  const sessionRef = useRef<MapDrawingSession>({
    setDrawingEnabled: (enabled: boolean) => {
      drawingEnabledRef.current = enabled;
    },
  });

  const clearPreview = useCallback(() => {
    previewRef.current?.setMap(null);
    previewRef.current = null;
  }, []);

  const resetDraft = useCallback(() => {
    clearPreview();
    draftRef.current = { kind: "none" };
  }, [clearPreview]);

  /** Surface a drawing failure without letting it reach the root ErrorBoundary. */
  const reportFailure = useCallback(
    (error: unknown) => {
      console.error("Map drawing failed:", error);
      resetDraft();
      setDrawingUnavailable(true);
    },
    [resetDraft, setDrawingUnavailable]
  );

  /** Commit a finished shape: style it, store it, and enable the save button. */
  const commitShape = useCallback(
    (
      overlay: MapOverlay,
      nativeOverlay:
        | google.maps.Polygon
        | google.maps.Polyline
        | google.maps.Circle
        | google.maps.Rectangle
    ) => {
      addToOverlayArrayOnMap(nativeOverlay);
      addToMapOverlayArrayOnMap(overlay);
      setSaveButtonInMapToolEnabled(true);
    },
    [addToOverlayArrayOnMap, addToMapOverlayArrayOnMap, setSaveButtonInMapToolEnabled]
  );

  const completeMarker = useCallback(
    (position: google.maps.LatLng) => {
      const advancedMarker = new google.maps.marker.AdvancedMarkerElement({
        map: map ?? null,
        position,
        content: makeDefaultMarkderContent().element,
      });

      const overlay = handleMarkerComplete(advancedMarker, () => {
        setSelectedMarker({
          id: overlay.id,
          advancedMarker,
          icon: { type: MarkerIconType.Default, content: "" },
        });
      });

      // Matches the previous DrawingManager behaviour: markers are tracked in
      // the overlay model but not in the native overlay array.
      addToMapOverlayArrayOnMap(overlay);
      setSaveButtonInMapToolEnabled(true);
    },
    [map, addToMapOverlayArrayOnMap, setSaveButtonInMapToolEnabled, setSelectedMarker]
  );

  const completePath = useCallback(
    (points: google.maps.LatLng[], shapeType: MapShapeType.Polyline | MapShapeType.Polygon) => {
      if (points.length < MIN_PATH_POINTS) {
        return;
      }

      if (shapeType === MapShapeType.Polygon) {
        const closed = [...points, points[0]];
        const polygon = new google.maps.Polygon({
          paths: closed,
          strokeColor: MAP_DRAWING_COLOR.DEFAULT_STROKE_COLOR,
          strokeWeight: 4,
          fillColor: MAP_DRAWING_COLOR.DEFAULT_FILL_COLOR,
          clickable: true,
          editable: true,
          draggable: false,
          map: map ?? null,
          zIndex: 9999,
        });
        const overlay = handlePolygonComplete(polygon, sessionRef);
        commitShape(overlay, polygon);
        return;
      }

      const polyline = new google.maps.Polyline({
        path: points,
        strokeColor: MAP_DRAWING_COLOR.DEFAULT_STROKE_COLOR,
        strokeWeight: 4,
        clickable: true,
        editable: true,
        draggable: false,
        map: map ?? null,
        zIndex: 9999,
      });
      const overlay = handlePolylineComplete(polyline);
      commitShape(overlay, polyline);
    },
    [map, commitShape]
  );

  const completeCircle = useCallback(
    (center: google.maps.LatLng, radius: number) => {
      const circle = new google.maps.Circle({
        center,
        radius,
        strokeColor: MAP_DRAWING_COLOR.DEFAULT_STROKE_COLOR,
        strokeWeight: 4,
        fillColor: MAP_DRAWING_COLOR.DEFAULT_FILL_COLOR,
        clickable: true,
        editable: true,
        draggable: false,
        map: map ?? null,
        zIndex: 9999,
      });
      const overlay = handleCircleComplete(circle, sessionRef);
      commitShape(overlay, circle);
    },
    [map, commitShape]
  );

  const completeRectangle = useCallback(
    (anchor: google.maps.LatLng, opposite: google.maps.LatLng) => {
      const rectangle = new google.maps.Rectangle({
        bounds: new google.maps.LatLngBounds(anchor, opposite),
        strokeColor: MAP_DRAWING_COLOR.DEFAULT_STROKE_COLOR,
        strokeWeight: 4,
        fillColor: MAP_DRAWING_COLOR.DEFAULT_FILL_COLOR,
        clickable: true,
        editable: true,
        draggable: false,
        map: map ?? null,
        zIndex: 9999,
      });
      const overlay = handleRectangleComplete(rectangle, sessionRef);
      commitShape(overlay, rectangle);
    },
    [map, commitShape]
  );

  /** Update the rubber band to follow the pointer. */
  const updatePreview = useCallback(
    (pointer: google.maps.LatLng) => {
      const draft = draftRef.current;
      if (draft.kind === "path" && draft.points.length > 0) {
        const path = [...draft.points, pointer];
        if (mapShapeType === MapShapeType.Polygon) {
          const preview = previewRef.current as google.maps.Polygon | null;
          if (preview) {
            preview.setPath(path);
          }
        } else {
          const preview = previewRef.current as google.maps.Polyline | null;
          if (preview) {
            preview.setPath(path);
          }
        }
      } else if (draft.kind === "circle" && map) {
        const preview = previewRef.current as google.maps.Circle | null;
        if (preview) {
          preview.setRadius(distanceBetween(draft.center, pointer));
        }
      } else if (draft.kind === "rectangle") {
        const preview = previewRef.current as google.maps.Rectangle | null;
        if (preview) {
          preview.setBounds(new google.maps.LatLngBounds(draft.anchor, pointer));
        }
      }
    },
    [map, mapShapeType]
  );

  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (!drawingEnabledRef.current) {
        return;
      }
      if (Date.now() < suppressClicksUntilRef.current) {
        return;
      }
      const point = event.latLng;
      if (!point || !mapShapeType) {
        return;
      }

      try {
        switch (mapShapeType) {
          case MapShapeType.Marker: {
            suppressClicksUntilRef.current = Date.now() + CLICK_GUARD_MS;
            completeMarker(point);
            break;
          }
          case MapShapeType.Polyline:
          case MapShapeType.Polygon: {
            const draft = draftRef.current;
            const points = draft.kind === "path" ? draft.points : [];
            const nextPoints = [...points, point];
            draftRef.current = { kind: "path", points: nextPoints };

            if (!previewRef.current) {
              const previewOptions = {
                strokeColor: MAP_DRAWING_PREVIEW.STROKE_COLOR,
                strokeWeight: MAP_DRAWING_PREVIEW.STROKE_WEIGHT,
                clickable: MAP_DRAWING_PREVIEW.CLICKABLE,
                editable: MAP_DRAWING_PREVIEW.EDITABLE,
                map: map ?? null,
                zIndex: 9998,
              };
              previewRef.current =
                mapShapeType === MapShapeType.Polygon
                  ? new google.maps.Polygon({ ...previewOptions, paths: nextPoints })
                  : new google.maps.Polyline({ ...previewOptions, path: nextPoints });
            }
            break;
          }
          case MapShapeType.Circle: {
            const draft = draftRef.current;
            if (draft.kind === "circle") {
              const radius = map ? distanceBetween(draft.center, point) : 0;
              resetDraft();
              suppressClicksUntilRef.current = Date.now() + CLICK_GUARD_MS;
              completeCircle(draft.center, radius);
            } else {
              draftRef.current = { kind: "circle", center: point };
              previewRef.current = new google.maps.Circle({
                center: point,
                radius: 0,
                strokeColor: MAP_DRAWING_PREVIEW.STROKE_COLOR,
                strokeWeight: MAP_DRAWING_PREVIEW.STROKE_WEIGHT,
                fillColor: MAP_DRAWING_PREVIEW.FILL_COLOR,
                fillOpacity: MAP_DRAWING_PREVIEW.FILL_OPACITY,
                clickable: MAP_DRAWING_PREVIEW.CLICKABLE,
                editable: MAP_DRAWING_PREVIEW.EDITABLE,
                map: map ?? null,
                zIndex: 9998,
              });
            }
            break;
          }
          case MapShapeType.Rectangle: {
            const draft = draftRef.current;
            if (draft.kind === "rectangle") {
              resetDraft();
              suppressClicksUntilRef.current = Date.now() + CLICK_GUARD_MS;
              completeRectangle(draft.anchor, point);
            } else {
              draftRef.current = { kind: "rectangle", anchor: point };
              previewRef.current = new google.maps.Rectangle({
                bounds: new google.maps.LatLngBounds(point, point),
                strokeColor: MAP_DRAWING_PREVIEW.STROKE_COLOR,
                strokeWeight: MAP_DRAWING_PREVIEW.STROKE_WEIGHT,
                fillColor: MAP_DRAWING_PREVIEW.FILL_COLOR,
                fillOpacity: MAP_DRAWING_PREVIEW.FILL_OPACITY,
                clickable: MAP_DRAWING_PREVIEW.CLICKABLE,
                editable: MAP_DRAWING_PREVIEW.EDITABLE,
                map: map ?? null,
                zIndex: 9998,
              });
            }
            break;
          }
          default:
            break;
        }
      } catch (error) {
        reportFailure(error);
      }
    },
    [
      map,
      mapShapeType,
      completeMarker,
      completeCircle,
      completeRectangle,
      resetDraft,
      reportFailure,
    ]
  );

  const handleMapDoubleClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (!drawingEnabledRef.current) {
        return;
      }
      if (mapShapeType !== MapShapeType.Polyline && mapShapeType !== MapShapeType.Polygon) {
        return;
      }

      const draft = draftRef.current;
      if (draft.kind !== "path") {
        return;
      }

      // A double click fires two `click` events at the same spot, so the last
      // vertex is usually duplicated. Drop every trailing duplicate: the
      // double click may land on the previous vertex, which would otherwise
      // leave the shape with a repeated point.
      const points = [...draft.points];
      while (
        points.length >= 2 &&
        isSamePoint(points[points.length - 1], points[points.length - 2])
      ) {
        points.pop();
      }

      event.stop();
      resetDraft();
      suppressClicksUntilRef.current = Date.now() + CLICK_GUARD_MS;

      try {
        completePath(points, mapShapeType);
      } catch (error) {
        reportFailure(error);
      }
    },
    [mapShapeType, completePath, resetDraft, reportFailure]
  );

  const handleMapMouseMove = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (!drawingEnabledRef.current || !event.latLng) {
        return;
      }
      try {
        updatePreview(event.latLng);
      } catch (error) {
        reportFailure(error);
      }
    },
    [updatePreview, reportFailure]
  );

  // Attach the map listeners for the active shape, and tear the draft down
  // whenever the active shape changes.
  useEffect(() => {
    if (!map || !isDrawableShape(mapShapeType)) {
      resetDraft();
      return;
    }

    drawingEnabledRef.current = true;

    let clickListener: google.maps.MapsEventListener | undefined;
    let doubleClickListener: google.maps.MapsEventListener | undefined;
    let mouseMoveListener: google.maps.MapsEventListener | undefined;

    try {
      clickListener = map.addListener("click", handleMapClick);
      doubleClickListener = map.addListener("dblclick", handleMapDoubleClick);
      mouseMoveListener = map.addListener("mousemove", handleMapMouseMove);
    } catch (error) {
      reportFailure(error);
    }

    return () => {
      if (clickListener) {
        google.maps.event.removeListener(clickListener);
      }
      if (doubleClickListener) {
        google.maps.event.removeListener(doubleClickListener);
      }
      if (mouseMoveListener) {
        google.maps.event.removeListener(mouseMoveListener);
      }
      resetDraft();
    };
  }, [map, mapShapeType, handleMapClick, handleMapDoubleClick, handleMapMouseMove, resetDraft, reportFailure]);

  return null;
};

export default MapDrawingController;
