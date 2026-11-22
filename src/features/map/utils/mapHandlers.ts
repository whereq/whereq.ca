import { attachListenersToEditablePolygon } from "@/features/map/utils/mapListeners";
import { v4 as uuidv4 } from 'uuid';
import { highlightMarker,
         createMarkerWithText,
                saveSearchToLocalStorage,
         makeDefaultMarkderContent,
         createMapOverlayFromGeocoderResult,
         getLatLngFromPosition,
         createResizableMarkerWithImgUrl} from "@/features/map/utils/mapUtils";
import { MapOverlay, MarkerIcon } from "@/features/map/types/types";
import { MapOverlayType } from "@/features/map/models/MapEnum";
import { DEFAULT_PROVINCE, MAP_DRAWING_COLOR, MAP_EVENT } from "@/features/map/utils/constants";
import { MarkerIconType } from "@/features/map/models/MapEnum";
import { eventEmitter } from "@/utils/eventEmitter";
import { EVENT } from "@/utils/constants";
import logUtil from "@/utils/logUtil";

/**
 * The live drawing session, handed to the shape handlers so they can pause
 * drawing while the pointer is over an existing shape.
 *
 * This replaces the old `google.maps.drawing.DrawingManager` reference: the
 * deprecated Drawing library was removed from the Maps JavaScript API in
 * v3.65.3b (4 June 2026), so the map feature now drives the input layer
 * itself. See `utils/MapDrawingController.tsx`.
 */
export interface MapDrawingSession {
  /** Suspend (false) or resume (true) collecting new vertices. */
  setDrawingEnabled: (enabled: boolean) => void;
}

/**
 * True when the click that selected a shape was a shift-click.
 *
 * A plain click selects one shape and replaces the selection; a
 * shift-click adds the shape to the selection (or takes it out again).
 * That is what makes "group these two shapes" possible.
 */
const isAdditiveClick = (event: google.maps.MapMouseEvent): boolean =>
  Boolean((event.domEvent as MouseEvent | undefined)?.shiftKey);

/**
 * Announce that a shape on the map was selected.
 *
 * The shape's id travels with the event, so the listener can find the
 * model behind the native overlay.
 */
const announceSelection = (
  overlayId: string,
  event: google.maps.MapMouseEvent
) => {
  eventEmitter.emit(EVENT.MAP_OVERLAY_SELECTED, {
    overlayId,
    additive: isAdditiveClick(event),
  });
};

/**
 * Free-text search: geocode what the user typed.
 *
 * The suggestion list (Places Autocomplete) covers the places the user
 * picks; this is the fallback for plain text that matches no suggestion.
 * The client-side `Geocoder` works with a browser-referrer-restricted API
 * key, unlike the Geocoding web service, which only accepts IP-restricted
 * keys.
 *
 * Returns `null` when nothing matched - the caller shows the notice. It
 * never rejects, so neither the Search button nor the Enter key can leave an
 * unhandled rejection behind.
 */
export const handleSearch = async ({
  searchText,
  setPlaceMapOverlay,
  setClickedOverlay,
}: {
  searchText: string;
  setPlaceMapOverlay: (place: MapOverlay | null) => void;
  setClickedOverlay: (clickedOverlay: MapOverlay | null) => void;
}): Promise<MapOverlay | null> => {
  const trimmed = searchText.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const geocoder = new google.maps.Geocoder();
    // DEFAULT_PROVINCE already carries its own leading comma.
    const address = `${trimmed}${DEFAULT_PROVINCE}`;

    const geocoderResults = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === "OK" && results) {
          resolve(results);
        } else {
          reject(new Error(`Geocode was not successful: ${status}`));
        }
      });
    });

    if (!geocoderResults[0]?.geometry?.location) {
      return null;
    }

    const searchedPlace = createMapOverlayFromGeocoderResult(trimmed, geocoderResults[0]);

    // Reset the clickedOverlay in the overlay store
    // so when click the MapOverlay in MyMapSection, the hook will respond
    setClickedOverlay(null);
    setPlaceMapOverlay(searchedPlace);
    saveSearchToLocalStorage(searchedPlace);

    return searchedPlace;
  } catch {
    // No match, or the geocoder refused the request.
    return null;
  }
};

export const handlePolygonComplete = (
  polygon: google.maps.Polygon,
  drawingSessionRef: React.RefObject<MapDrawingSession | null>,
): MapOverlay => {
  polygon.setOptions({
    fillColor: MAP_DRAWING_COLOR.DEFAULT_FILL_COLOR,
    strokeColor: MAP_DRAWING_COLOR.DEFAULT_STROKE_COLOR,
    strokeWeight: 4,
    clickable: true,
    editable: true,
    draggable: false,
    zIndex: 9999,
  });

  attachListenersToEditablePolygon(polygon);

  const paths = polygon.getPath().getArray().map(latLng => ({ lat: latLng.lat(), lng: latLng.lng() }));

  // The overlay is built before the listeners are attached: the click
  // handler has to know which shape it belongs to.
  const overlay: MapOverlay = {
    id: uuidv4(),
    type: MapOverlayType.Polygon,
    title: "",
    description: "",
    coordinates: paths,
  };

  polygon.addListener(MAP_EVENT.CLICK, (event: google.maps.MapMouseEvent) => {
    event.stop();
    announceSelection(overlay.id, event);
  });

  polygon.addListener("dblclick", (event: google.maps.MapMouseEvent) => {
    event.stop();
    logUtil.log("Double-click on polygon");
  });

  polygon.addListener("rightclick", (event: google.maps.PolyMouseEvent) => {
    event.stop();
    if (event.vertex !== undefined) {
      const vertexIndex = event.vertex;
      if (vertexIndex !== undefined) {
        logUtil.log(`Right-click on vertex ${vertexIndex}`);
      }
    }
  });

  polygon.addListener("mouseover", () => {
    logUtil.log("Mouse over the polygon");
    drawingSessionRef.current?.setDrawingEnabled(false); // Pause drawing while over a shape
  });

  polygon.addListener("mouseout", () => {
    logUtil.log("Mouse out of the polygon");
    drawingSessionRef.current?.setDrawingEnabled(true); // Resume drawing
  });

  return overlay;
};

export const handlePolylineComplete = (
  polyline: google.maps.Polyline
): MapOverlay => {
  polyline.setOptions({
    strokeColor: MAP_DRAWING_COLOR.DEFAULT_STROKE_COLOR,
    strokeWeight: 4,
    editable: true,
    draggable: false,
  });

  const path = polyline.getPath().getArray().map(latLng => ({ lat: latLng.lat(), lng: latLng.lng() }));

  const overlay: MapOverlay = {
    id: uuidv4(),
    type: MapOverlayType.Polyline,
    title: "",
    description: "",
    coordinates: path,
  };

  // A polyline used to have no click handler at all, so it could not be
  // picked on the map like the other shapes.
  polyline.addListener(MAP_EVENT.CLICK, (event: google.maps.MapMouseEvent) => {
    event.stop();
    announceSelection(overlay.id, event);
  });

  return overlay;
};

export const handleCircleComplete = (
  circle: google.maps.Circle,
  drawingSessionRef: React.RefObject<MapDrawingSession | null>,
): MapOverlay => {
  circle.setOptions({
    fillColor: MAP_DRAWING_COLOR.DEFAULT_FILL_COLOR,
    strokeColor: MAP_DRAWING_COLOR.DEFAULT_STROKE_COLOR,
    strokeWeight: 4,
    clickable: true,
    editable: true,
    draggable: false,
    zIndex: 9999,
  });

  const center = circle.getCenter();
  if (!center) {
    throw new Error("Circle center is null or undefined");
  }

  const overlay: MapOverlay = {
    id: uuidv4(),
    type: MapOverlayType.Circle,
    title: "",
    description: "",
    coordinates: [{ lat: center.lat(), lng: center.lng() }],
    radius: circle.getRadius(), // Include the radius for circles
  };

  circle.addListener(MAP_EVENT.CLICK, (event: google.maps.MapMouseEvent) => {
    event.stop();
    announceSelection(overlay.id, event);
  });

  circle.addListener("dblclick", (event: google.maps.MapMouseEvent) => {
    event.stop();
  });

  circle.addListener("rightclick", (event: google.maps.MapMouseEvent) => {
    event.stop();
    logUtil.log("Right-click on circle");
  });

  circle.addListener("mouseover", () => {
    logUtil.log("Mouse over the circle");
    drawingSessionRef.current?.setDrawingEnabled(false); // Pause drawing while over a shape
  });

  circle.addListener("mouseout", () => {
    logUtil.log("Mouse out of the circle");
    drawingSessionRef.current?.setDrawingEnabled(true); // Resume drawing
  });

  return overlay;
};

export const handleRectangleComplete = (
  rectangle: google.maps.Rectangle,
  drawingSessionRef: React.RefObject<MapDrawingSession | null>,
): MapOverlay => {
  rectangle.setOptions({
    fillColor: MAP_DRAWING_COLOR.DEFAULT_FILL_COLOR,
    strokeColor: MAP_DRAWING_COLOR.DEFAULT_STROKE_COLOR,
    strokeWeight: 4,
    clickable: true,
    editable: true,
    draggable: false,
    zIndex: 9999,
  });

  rectangle.addListener(MAP_EVENT.CLICK, (event: google.maps.MapMouseEvent) => {
    event.stop();
    announceSelection(overlay.id, event);
  });

  rectangle.addListener("dblclick", (event: google.maps.MapMouseEvent) => {
    event.stop();
  });

  rectangle.addListener("rightclick", (event: google.maps.MapMouseEvent) => {
    event.stop();
    logUtil.log("Right-click on rectangle");
  });

  rectangle.addListener("mouseover", () => {
    logUtil.log("Mouse over the rectangle");
    drawingSessionRef.current?.setDrawingEnabled(false); // Pause drawing while over a shape
  });

  rectangle.addListener("mouseout", () => {
    logUtil.log("Mouse out of the rectangle");
    drawingSessionRef.current?.setDrawingEnabled(true); // Resume drawing
  });

  const bounds = rectangle.getBounds();
  if (!bounds) {
    throw new Error("Rectangle bounds are null or undefined");
  }
  const northeast = bounds.getNorthEast();
  const southwest = bounds.getSouthWest();

  const overlay: MapOverlay = {
    id: uuidv4(),
    type: MapOverlayType.Rectangle,
    title: "",
    description: "",
    coordinates: [
      { lat: northeast.lat(), lng: northeast.lng() }, // Northeast corner
      { lat: southwest.lat(), lng: southwest.lng() }, // Southwest corner
    ],
  };

  return overlay;
};

export const updateMarkerIcon = (
  marker: google.maps.marker.AdvancedMarkerElement,
  icon: MarkerIcon,
) => {
  switch (icon.type) {
    case MarkerIconType.Text:
      marker.content = createMarkerWithText(icon.content);
      break;
    case MarkerIconType.Url:
      // marker.content = createMarkerWithImgUrl(icon.content);
      marker.content = createResizableMarkerWithImgUrl(icon);
      break;
    case MarkerIconType.Default:
      // The PinElement itself is the content: `PinElement.element` is deprecated
      // by Google ("Please use the PinElement directly").
      marker.content = makeDefaultMarkderContent();
      break;
    default:
      throw new Error("Invalid marker icon type");
  }
};

/**
 * Use callback function to inform the parent component of the double-click event 
 * instead of using eventEmitter according to the relationship between the components.
 * @param marker 
 * @param onClick 
 * @returns 
 */
export const handleMarkerComplete = (
  marker: google.maps.marker.AdvancedMarkerElement,
  onClick: (marker: google.maps.marker.AdvancedMarkerElement, isHighlighted: boolean) => void,
): MapOverlay => {
  let isHighlighted = false;

  // Add click event listener.
  // The marker itself is the event target and the event is `gmp-click`;
  // `addListener("click")` on an advanced marker is the deprecated form.
  // `gmpClickable` has to be on for the event to fire at all.
  marker.gmpClickable = true;
  marker.addEventListener("gmp-click", () => {
    isHighlighted = !isHighlighted;
    highlightMarker(marker, isHighlighted);
    onClick(marker, isHighlighted); // Call the onClick callback
  });

  // Ensure the position is treated as a google.maps.LatLng object
  // Handle the position property correctly
  const positionCoordinate = getLatLngFromPosition(marker.position);

  return {
    id: uuidv4(),
    type: MapOverlayType.Marker,
    title: "",
    description: "",
    coordinates: [positionCoordinate],
  };
};