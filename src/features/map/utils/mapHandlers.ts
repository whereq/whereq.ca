import { attachListenersToEditablePolygon } from "@/features/map/utils/mapListeners";
import { v4 as uuidv4 } from 'uuid';
import { highlightShape, highlightMarker, 
         createMarkerWithText, 
         mapDrawingModeToOverlayType, 
         saveSearchToLocalStorage, 
         makeDefaultMarkderContent,
         createMapOverlayFromPlaceResult,
         createMapOverlayFromGeocoderResult,
         getLatLngFromPosition,
         createResizableMarkerWithImgUrl} from "@/features/map/utils/mapUtils";
import { MapOverlay, MarkerIcon } from "@/features/map/types/types";
import { MapOverlayType, MapShapeType } from "@/features/map/models/MapEnum";
import { DEFAULT_CITY, DEFAULT_PROVINCE, MAP_DRAWING_COLOR, MAP_EVENT } from "@/features/map/utils/constants";
import { MarkerIconType } from "@/features/map/models/MapEnum";
import { eventEmitter } from "@/utils/eventEmitter";
import logUtil from "@/utils/logUtil";

interface HandleSearchParams {
  searchText: string;
  autoCompleteInstance: google.maps.places.Autocomplete | null;
  setPlaceMapOverlay: (place: MapOverlay | null) => void;
  setClickedOverlay: (clickedOverlay: MapOverlay | null) => void;
}

export const handleSearch = async ({
  searchText,
  autoCompleteInstance,
  setPlaceMapOverlay,
  setClickedOverlay,
}: HandleSearchParams): Promise<MapOverlay | null> => {

  let searchedPlace: MapOverlay | null = null;
  // If searchText is empty and autoCompleteInstance is valid, use the autoCompleteInstance
  if (searchText.trim() === "" && autoCompleteInstance) {
    const placeResult = autoCompleteInstance.getPlace();
    if (placeResult) {
      searchedPlace = createMapOverlayFromPlaceResult(placeResult);
      setPlaceMapOverlay(searchedPlace);
    }
  }
  // If searchText is not empty and autoCompleteInstance is valid, check if the placeResult matches the searchText
  else if (autoCompleteInstance) {
    const placeResult = autoCompleteInstance.getPlace();
    if (placeResult && placeResult.name === searchText) {
      searchedPlace = createMapOverlayFromPlaceResult(placeResult);
      setPlaceMapOverlay(searchedPlace);
    }
  }


  if (!searchedPlace) {
    const geocoder = new google.maps.Geocoder();
    const address = searchText.trim() === "" ? `${DEFAULT_CITY}` : `${searchText}, ${DEFAULT_PROVINCE}`;
    const geocoderResults = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === "OK" && results) {
          resolve(results);
        } else {
          reject(new Error(`Geocode was not successful: ${status}`));
        }
      });
    });

    if (geocoderResults[0]?.geometry?.location) {
      searchedPlace = createMapOverlayFromGeocoderResult(searchText, geocoderResults[0]);
      setPlaceMapOverlay(searchedPlace);
    }
  }

  if (searchedPlace) {
    // Reset the clickedOverlay in the overlay store 
    // so when click the MapOverlay in MyMapSection, the hook will respond
    setClickedOverlay(null); 
    saveSearchToLocalStorage(searchedPlace);
    return searchedPlace;
  }
  return null;
};

export const handlePolygonComplete = (
  polygon: google.maps.Polygon,
  mapShapeType: MapShapeType | null,
  drawingManagerRef: React.RefObject<google.maps.drawing.DrawingManager | null>,
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

  let isHighlighted = false;

  polygon.addListener(MAP_EVENT.CLICK, (event: google.maps.MapMouseEvent) => {
    event.stop();
    isHighlighted = !isHighlighted;
    highlightShape(polygon, isHighlighted);
    eventEmitter.emit("polygon-clicked", { polygon, isHighlighted });
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
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setOptions({ drawingMode: null }); // Disable drawing mode
    }
  });

  polygon.addListener("mouseout", () => {
    logUtil.log("Mouse out of the polygon");
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setOptions({ drawingMode: mapShapeType ? mapDrawingModeToOverlayType(mapShapeType) : null }); // Re-enable drawing mode
    }
  });

  const paths = polygon.getPath().getArray().map(latLng => ({ lat: latLng.lat(), lng: latLng.lng() }));
  return {
    id: uuidv4(),
    type: MapOverlayType.Polygon,
    title: "",
    description: "",
    coordinates: paths,
  };
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
  return {
    id: uuidv4(),
    type: MapOverlayType.Polyline,
    title: "",
    description: "",
    coordinates: path,
  };
};

export const handleCircleComplete = (
  circle: google.maps.Circle,
  mapShapeType: MapShapeType | null,
  drawingManagerRef: React.RefObject<google.maps.drawing.DrawingManager | null>,
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

  let isHighlighted = false;

  circle.addListener(MAP_EVENT.CLICK, (event: google.maps.MapMouseEvent) => {
    event.stop();
    isHighlighted = !isHighlighted;
    highlightShape(circle, isHighlighted);
    eventEmitter.emit("circle-clicked", { circle, isHighlighted });
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
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setOptions({ drawingMode: null }); // Disable drawing mode
    }
  });

  circle.addListener("mouseout", () => {
    logUtil.log("Mouse out of the circle");
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setOptions({ drawingMode: mapShapeType ? mapDrawingModeToOverlayType(mapShapeType) : null }); // Re-enable drawing mode
    }
  });

  const center = circle.getCenter();
  if (!center) {
    throw new Error("Circle center is null or undefined");
  }
  return {
    id: uuidv4(),
    type: MapOverlayType.Circle,
    title: "",
    description: "",
    coordinates: [{ lat: center.lat(), lng: center.lng() }],
    radius: circle.getRadius(), // Include the radius for circles
  };
};

export const handleRectangleComplete = (
  rectangle: google.maps.Rectangle,
  mapShapeType: MapShapeType | null,
  drawingManagerRef: React.RefObject<google.maps.drawing.DrawingManager | null>,
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

  let isHighlighted = false;

  rectangle.addListener(MAP_EVENT.CLICK, (event: google.maps.MapMouseEvent) => {
    event.stop();
    isHighlighted = !isHighlighted;
    highlightShape(rectangle, isHighlighted);
    eventEmitter.emit("rectangle-clicked", { rectangle, isHighlighted });
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
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setOptions({ drawingMode: null }); // Disable drawing mode
    }
  });

  rectangle.addListener("mouseout", () => {
    logUtil.log("Mouse out of the rectangle");
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setOptions({ drawingMode: mapShapeType ? mapDrawingModeToOverlayType(mapShapeType) : null }); // Re-enable drawing mode
    }
  });

  const bounds = rectangle.getBounds();
  if (!bounds) {
    throw new Error("Rectangle bounds are null or undefined");
  }
  const northeast = bounds.getNorthEast();
  const southwest = bounds.getSouthWest();
  return {
    id: uuidv4(),
    type: MapOverlayType.Rectangle,
    title: "",
    description: "",
    coordinates: [
      { lat: northeast.lat(), lng: northeast.lng() }, // Northeast corner
      { lat: southwest.lat(), lng: southwest.lng() }, // Southwest corner
    ],
  };
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
      // No changes to the marker, use the default icon
      marker.content = makeDefaultMarkderContent().element;
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

  // Add click event listener
  marker.addListener(MAP_EVENT.CLICK, () => {
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