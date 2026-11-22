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
import { captureAndDownloadMap } from "@/features/map/utils/mapCapture";
import { restoreDeletedShapes } from "@/features/map/utils/mapShapeActions";
import type { ShapeToImport } from "@/features/map/utils/geoJson";
import { eventEmitter } from "@/utils/eventEmitter";
import { EVENT } from "@/utils/constants";

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
 * The id of the ruler tool in the tool bar's active-tool state.
 *
 * The ruler measures between two points; it draws no shape, so it has no
 * shape type of its own.
 */
const RULER_TOOL = "ruler";

/**
 * A distance in metres, as a person would say it out loud.
 */
const formatDistance = (metres: number): string => {
    if (metres < 1000) {
        return `${Math.round(metres)} m`;
    }
    return `${(metres / 1000).toFixed(2)} km`;
};

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

/**
 * Give a freshly drawn overlay its name and description.
 *
 * The name has to be set *before* the overlay goes into the store: the
 * workspace list reads the stored objects, so a name written afterwards
 * would never show up.
 */
const applyDetails = (
  overlay: MapOverlay,
  details?: { title?: string; description?: string }
): void => {
  if (!details) {
    return;
  }
  overlay.title = details.title ?? "";
  overlay.description = details.description ?? "";
};

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
    activeTool,
    addToOverlayArrayOnMap,
    addToMapOverlayArrayOnMap,
    registerNativeOverlay,
    setSaveButtonInMapToolEnabled,
    setSelectedMarker,
    setDrawingUnavailable,
    setToolNotice,
  } = useOverlayStore();

  /** Vertices collected so far for the shape being drawn. */
  const draftRef = useRef<DraftState>({ kind: "none" });
  /** The rubber-band shape shown while drawing. */
  const previewRef = useRef<PreviewShape | null>(null);
  /** False while the pointer hovers an existing shape. */
  const drawingEnabledRef = useRef(true);
  /** Timestamp before which map clicks are ignored. */
  const suppressClicksUntilRef = useRef(0);
  /** The first point of the measurement the ruler is making. */
  const rulerStartRef = useRef<google.maps.LatLng | null>(null);
  /** The line drawn between the two measured points. */
  const rulerLineRef = useRef<google.maps.Polyline | null>(null);
  /** The bubble that shows the measured distance. */
  const rulerInfoRef = useRef<google.maps.InfoWindow | null>(null);

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
      // The registry ties the shape's id to the object behind it, so the
      // shape can be taken off the map by id later.
      registerNativeOverlay(overlay.id, nativeOverlay);
      setSaveButtonInMapToolEnabled(true);
    },
    [
      addToOverlayArrayOnMap,
      addToMapOverlayArrayOnMap,
      registerNativeOverlay,
      setSaveButtonInMapToolEnabled,
    ]
  );

  const completeMarker = useCallback(
    (position: google.maps.LatLng) => {
      const advancedMarker = new google.maps.marker.AdvancedMarkerElement({
        map: map ?? null,
        position,
        // The PinElement itself is the content: `PinElement.element` is
        // deprecated by Google ("Please use the PinElement directly").
        content: makeDefaultMarkderContent(),
        // Makes the marker clickable and keyboard reachable; the click
        // arrives as the `gmp-click` event.
        gmpClickable: true,
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
      registerNativeOverlay(overlay.id, advancedMarker);
      setSaveButtonInMapToolEnabled(true);
    },
    [
      map,
      addToMapOverlayArrayOnMap,
      registerNativeOverlay,
      setSaveButtonInMapToolEnabled,
      setSelectedMarker,
    ]
  );

  const completePath = useCallback(
    (
      points: google.maps.LatLng[],
      shapeType: MapShapeType.Polyline | MapShapeType.Polygon,
      /** The name and the description the shape should carry. */
      details?: { title?: string; description?: string }
    ): MapOverlay | null => {
      if (points.length < MIN_PATH_POINTS) {
        return null;
      }

      if (shapeType === MapShapeType.Polygon) {
        // A ring that already ends where it starts (a shape that came from a
        // file) must not be closed a second time: that would leave a duplicate
        // vertex on the editable polygon.
        const first = points[0];
        const last = points[points.length - 1];
        const alreadyClosed = first.lat() === last.lat() && first.lng() === last.lng();
        const closed = alreadyClosed ? [...points] : [...points, first];
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
        applyDetails(overlay, details);
        commitShape(overlay, polygon);
        return overlay;
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
      applyDetails(overlay, details);
      commitShape(overlay, polyline);
      return overlay;
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

  /**
   * The ruler measures between two points.
   *
   * The first click sets the start, the second one measures the distance
   * and shows it. The line and the bubble are the ruler's own: they are
   * not part of the drawing, so they never reach the overlay model.
   */
  const measureTo = useCallback(
    (point: google.maps.LatLng) => {
      const start = rulerStartRef.current;

      if (!start) {
        rulerStartRef.current = point;
        setToolNotice("Now click the other end of the measurement.");
        return;
      }

      rulerStartRef.current = null;

      const metres = distanceBetween(start, point);

      // The line between the two points.
      rulerLineRef.current?.setMap(null);
      rulerLineRef.current = new google.maps.Polyline({
        path: [start, point],
        strokeColor: MAP_DRAWING_COLOR.HIGHLIGHT_STROKE_COLOR,
        strokeWeight: 4,
        clickable: false,
        editable: false,
        map: map ?? null,
        zIndex: 10000,
      });

      // The distance, in a bubble halfway along the line.
      if (!rulerInfoRef.current) {
        rulerInfoRef.current = new google.maps.InfoWindow();
      }
      const middle = new google.maps.LatLng(
        (start.lat() + point.lat()) / 2,
        (start.lng() + point.lng()) / 2
      );
      rulerInfoRef.current.setContent(
        `<div style="font-family:monospace;font-weight:bold;color:#161b27">${formatDistance(metres)}</div>`
      );
      rulerInfoRef.current.setPosition(middle);
      if (map) {
        rulerInfoRef.current.open(map);
      }

      setToolNotice(`The distance is ${formatDistance(metres)}.`);
    },
    [map, setToolNotice]
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
      if (!point) {
        return;
      }

      // The ruler measures; it draws no shape.
      if (activeTool === RULER_TOOL) {
        try {
          measureTo(point);
        } catch (error) {
          reportFailure(error);
        }
        return;
      }

      if (!mapShapeType) {
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

            const previewOptions = {
              strokeColor: MAP_DRAWING_PREVIEW.STROKE_COLOR,
              strokeWeight: MAP_DRAWING_PREVIEW.STROKE_WEIGHT,
              fillColor: MAP_DRAWING_PREVIEW.FILL_COLOR,
              fillOpacity: MAP_DRAWING_PREVIEW.FILL_OPACITY,
              clickable: MAP_DRAWING_PREVIEW.CLICKABLE,
              editable: MAP_DRAWING_PREVIEW.EDITABLE,
              map: map ?? null,
              zIndex: 9998,
            };

            if (!previewRef.current) {
              previewRef.current =
                mapShapeType === MapShapeType.Polygon
                  ? new google.maps.Polygon({ ...previewOptions, paths: nextPoints })
                  : new google.maps.Polyline({ ...previewOptions, path: nextPoints });
            } else {
              // The preview has to keep up with the draft on every click, not
              // only when the pointer moves: a preview that is out of step
              // with the draft sits on the map as a shape of its own, and it
              // swallows the clicks meant for the shapes underneath it.
              if (mapShapeType === MapShapeType.Polygon) {
                (previewRef.current as google.maps.Polygon).setPath(nextPoints);
              } else {
                (previewRef.current as google.maps.Polyline).setPath(nextPoints);
              }
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
      activeTool,
      measureTo,
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
  //
  // The ruler is a tool too: it has no shape type, but it still needs the
  // click listener to know where the measurement starts and ends.
  useEffect(() => {
    const isRulerActive = activeTool === RULER_TOOL;

    if (!map || (!isDrawableShape(mapShapeType) && !isRulerActive)) {
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
  }, [
    map,
    mapShapeType,
    activeTool,
    handleMapClick,
    handleMapDoubleClick,
    handleMapMouseMove,
    resetDraft,
    reportFailure,
  ]);

  /**
   * Take the ruler's line and bubble away when the ruler is put down.
   */
  useEffect(() => {
    if (activeTool === RULER_TOOL) {
      return;
    }
    rulerStartRef.current = null;
    rulerLineRef.current?.setMap(null);
    rulerLineRef.current = null;
    rulerInfoRef.current?.close();
  }, [activeTool]);

  /**
   * The undo stack belongs to the drawing.
   *
   * When the map goes away, the live objects it held go with it, so there
   * is nothing left to put back. The cleanup is deliberately in an effect
   * of its own: an effect that depends on the map would also run its
   * cleanup every time the map instance changes identity.
   */
  useEffect(() => {
    return () => {
      useOverlayStore.getState().clearUndoStack();
    };
  }, []);

  /**
   * Put the last deleted shapes back.
   *
   * The tool bar cannot reach the map, so it asks over the event bus and
   * this controller — which owns the map — puts the shapes back on it. The
   * shapes come back as the very same live objects they were, so a polygon
   * returns with the vertices the visitor dragged.
   */
  useEffect(() => {
    const handleUndoRequest = () => {
      if (useOverlayStore.getState().undoStack.length === 0) {
        eventEmitter.emit(EVENT.MAP_UNDO_DONE, {
          ok: false,
          restored: 0,
          message: "There is nothing to undo.",
        });
        return;
      }

      if (!map) {
        eventEmitter.emit(EVENT.MAP_UNDO_DONE, {
          ok: false,
          restored: 0,
          message: "The map is not ready yet, so the shapes could not be put back.",
        });
        return;
      }

      try {
        const restored = restoreDeletedShapes(map);

        eventEmitter.emit(EVENT.MAP_UNDO_DONE, {
          ok: restored > 0,
          restored,
          message:
            restored > 0
              ? `Put ${restored} shape${restored === 1 ? "" : "s"} back on the map.`
              : "There was nothing to undo.",
        });
      } catch (error) {
        console.error("Could not put the deleted shapes back:", error);
        eventEmitter.emit(EVENT.MAP_UNDO_DONE, {
          ok: false,
          restored: 0,
          message: "The shapes could not be put back.",
        });
      }
    };

    eventEmitter.on(EVENT.MAP_UNDO_REQUEST, handleUndoRequest);

    return () => {
      eventEmitter.off(EVENT.MAP_UNDO_REQUEST, handleUndoRequest);
    };
  }, [map]);

  /**
   * Take a picture of the map.
   *
   * The tool bar cannot reach the map, so it asks over the event bus and
   * this controller — which owns the map — takes the picture and answers.
   */
  useEffect(() => {
    const handleCaptureRequest = () => {
      if (!map) {
        eventEmitter.emit(EVENT.MAP_CAPTURE_DONE, {
          ok: false,
          message: "The map is not ready yet, so there is no picture to take.",
        });
        return;
      }

      try {
        const saved = captureAndDownloadMap(map);
        eventEmitter.emit(EVENT.MAP_CAPTURE_DONE, {
          ok: saved,
          message: saved
            ? "The map was saved as a picture."
            : "The map could not be captured.",
        });
      } catch (error) {
        console.error("Could not capture the map:", error);
        eventEmitter.emit(EVENT.MAP_CAPTURE_DONE, {
          ok: false,
          message: "The map could not be captured.",
        });
      }
    };

    eventEmitter.on(EVENT.MAP_CAPTURE_REQUEST, handleCaptureRequest);

    return () => {
      eventEmitter.off(EVENT.MAP_CAPTURE_REQUEST, handleCaptureRequest);
    };
  }, [map]);

  /**
   * Draw shapes that were read from a JSON file.
   *
   * The tool bar lives outside the <Map> subtree, so it cannot reach the
   * live map instance; it sends the shapes over the event bus instead and
   * this controller — which owns the map — draws them with exactly the same
   * code path a hand-drawn shape goes through.
   *
   * The answer travels back the same way: the tool bar says "added N
   * shapes" only after this controller reports how many it really drew, so
   * a map that is not ready cannot be mistaken for a successful import.
   */
  useEffect(() => {
    const handleImportShapes = ({ shapes }: { shapes: ShapeToImport[] }) => {
      if (!map || shapes.length === 0) {
        eventEmitter.emit<{ drawn: number }>(EVENT.MAP_IMPORT_SHAPES_DONE, { drawn: 0 });
        return;
      }

      let drawn = 0;

      try {
        const bounds = new google.maps.LatLngBounds();

        shapes.forEach((shape) => {
          const points = shape.coordinates.map(
            (coordinate) => new google.maps.LatLng(coordinate.lat, coordinate.lng)
          );
          const shapeType =
            shape.type === MapShapeType.Polygon
              ? MapShapeType.Polygon
              : MapShapeType.Polyline;
          // The name and the description travel with the shape.
          const overlay = completePath(points, shapeType, {
            title: shape.title,
            description: shape.description,
          });

          if (overlay) {
            drawn += 1;
          }

          points.forEach((point) => bounds.extend(point));
        });

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds);
        }
      } catch (error) {
        reportFailure(error);
      } finally {
        eventEmitter.emit<{ drawn: number }>(EVENT.MAP_IMPORT_SHAPES_DONE, { drawn });
      }
    };

    eventEmitter.on<{ shapes: ShapeToImport[] }>(EVENT.MAP_IMPORT_SHAPES, handleImportShapes);

    return () => {
      eventEmitter.off<{ shapes: ShapeToImport[] }>(EVENT.MAP_IMPORT_SHAPES, handleImportShapes);
    };
  }, [map, completePath, reportFailure]);

  return null;
};

export default MapDrawingController;
