import { v4 as uuidv4 } from 'uuid';
import { LOCAL_STORAGE_KEYS } from "@/utils/constants";
import { isValidImageUrl } from "@/utils/utils";
import LocalStorageHelper from "@/utils/localStorageHelper";
import { MAX_RECENT_SEARCHES, MAP_LOCAL_STORAGE_KEYS, MAP_DRAWING_COLOR, MAP_CENTER } from "@/features/map/utils/constants";

// Map-related models and types
import { Map, MapMarker, MapOverlay, MarkerIcon } from "@/features/map/types/types";
import { MapType, MapShapeType, MapOverlayType, MarkerIconType } from "@/features/map/models/MapEnum";

// Other types
import { Place } from "@/features/map/types/types";

export const mapDrawingModeToOverlayType =
  (mode: MapShapeType): google.maps.drawing.OverlayType => {
    switch (mode) {
      case MapShapeType.Marker:
        return google.maps.drawing.OverlayType.MARKER;
      case MapShapeType.Polyline:
        return google.maps.drawing.OverlayType.POLYLINE;
      case MapShapeType.Polygon:
        return google.maps.drawing.OverlayType.POLYGON;
      case MapShapeType.Circle:
        return google.maps.drawing.OverlayType.CIRCLE;
      case MapShapeType.Rectangle:
        return google.maps.drawing.OverlayType.RECTANGLE;
      default:
        throw new Error(`Unsupported map drawing mode: ${mode}`);
    }
  };

export const createDrawingManager = (
  mapShapeType: MapShapeType,
): google.maps.drawing.DrawingManager => {
  return new google.maps.drawing.DrawingManager({
    drawingMode: mapDrawingModeToOverlayType(mapShapeType),
    drawingControl: false,
    polylineOptions: {
      strokeColor: "#0000FF",
      strokeOpacity: 1.0,
      strokeWeight: 4,
      clickable: true,
      editable: true,
      draggable: false,
    },
    polygonOptions: {
      fillColor: "#0000FF80",
      fillOpacity: 0.5,
      strokeColor: "#0000FF",
      strokeOpacity: 1.0,
      strokeWeight: 4,
      clickable: true,
      editable: true,
      draggable: false,
      zIndex: 9999,
    },
    circleOptions: {
      fillColor: "#0000FF80",
      fillOpacity: 0.5,
      strokeColor: "#0000FF",
      strokeOpacity: 1.0,
      strokeWeight: 4,
      clickable: true,
      editable: true,
      draggable: false,
    },
    rectangleOptions: {
      fillColor: "#0000FF80",
      fillOpacity: 0.5,
      strokeColor: "#0000FF",
      strokeOpacity: 1.0,
      strokeWeight: 4,
      clickable: true,
      editable: true,
      draggable: false,
    },
    markerOptions: {
      draggable: false,
    },
  });
};

export const highlightShape = (shape: google.maps.Polygon | 
                                      google.maps.Polyline |
                                      google.maps.Circle |
                                      google.maps.Rectangle, isHighlighted: boolean) => {
  if (isHighlighted) { // Highlight
    shape.setOptions({ strokeColor: MAP_DRAWING_COLOR.HIGHLIGHT_STROKE_COLOR, 
                       fillColor: MAP_DRAWING_COLOR.HIGHLIGHT_FILL_COLOR });
  } else { // Unhighlight
    shape.setOptions({ strokeColor: MAP_DRAWING_COLOR.DEFAULT_STROKE_COLOR,
                       fillColor: MAP_DRAWING_COLOR.DEFAULT_FILL_COLOR }); 
  }
};

export const highlightMarker = (marker: google.maps.marker.AdvancedMarkerElement, isHighlighted: boolean) => {
  if (isHighlighted) {
    // Create a highlighted PinElement
    marker.content = makeHighlightedMarkerContent().element; // Update the marker's content
  } else {
    // Create a default PinElement
    marker.content = makeDefaultMarkderContent().element; // Update the marker's content
  }
};

export const saveSearchToLocalStorage = (place: MapOverlay) => {
  const recentSearches: MapOverlay[] = LocalStorageHelper.load(MAP_LOCAL_STORAGE_KEYS.RECENT_SEARCHES) || [];

  // recentSearches.push(place);

  // Remove duplicate addresses
  const updatedSearches: MapOverlay[] =
    recentSearches.filter((search: MapOverlay) =>
      search.place_id !== place.place_id
      // || search.name !== place.name
      // || search.address !== place.address
    );

  // Add the new address to the beginning of the list
  updatedSearches.unshift(place);

  // An alternative way to memove duplicates and limit to MAX_RECENT_SEARCHES
  // const updatedSearches = recentSearches
  //     .filter((search, index, self) => 
  //         self.findIndex((s) => 
  //             s.place_id === search.place_id ||
  //             s.name === search.name ||
  //             s.address === place.address) === index)
  //     .slice(0, MAX_RECENT_SEARCHES);

  // Limit the list to the most recent 10 searches
  if (updatedSearches.length > MAX_RECENT_SEARCHES) {
    updatedSearches.pop();
  }

  // Save the updated list to local storage
  LocalStorageHelper.save(MAP_LOCAL_STORAGE_KEYS.RECENT_SEARCHES, updatedSearches);
};

export const mapOverlayToShape = (option: MapOverlayType | null): MapShapeType | null => {
  switch (option) {
    case MapOverlayType.Marker:
      return MapShapeType.Marker;
    case MapOverlayType.Polyline:
      return MapShapeType.Polyline;
    case MapOverlayType.Polygon:
      return MapShapeType.Polygon;
    case MapOverlayType.Circle:
      return MapShapeType.Circle;
    case MapOverlayType.Rectangle:
      return MapShapeType.Rectangle;
    case MapOverlayType.Ground:
      return MapShapeType.Ground;
    case MapOverlayType.Custom:
      return MapShapeType.Custom;
    case null:
      return null;
    default:
      throw new Error(`Unsupported map overlay type: ${option}`);
  }
};

export const loadMapObjectFromLocalStorage = (): Map => {
  // Load or initialize the Map object from local storage
  const mapObject = LocalStorageHelper.load(LOCAL_STORAGE_KEYS.MAP) as Map;
  return mapObject || {
    id: uuidv4(), // Generate a unique ID
    type: MapType.Default, // Assuming a default type
    title: "Default Map",
    description: "Default Map Description",
    overlayArray: [],
    placeArray: [],
  };
}

/**
 * Calculate the bounds of an overlay or an array of overlays.
 */
export const calculateMapOverlayBounds = (overlays: MapOverlay[]): google.maps.LatLngBounds => {
  const bounds = new google.maps.LatLngBounds();

  const processOverlay = (overlay: MapOverlay) => {
    // Handle Marker type (single coordinate)
    if (overlay.type === MapOverlayType.Marker && overlay.coordinates && overlay.coordinates.length === 1) {
      bounds.extend(overlay.coordinates[0]); // Extend bounds with the single coordinate
    }
    // Handle Polygon type (multiple coordinates)
    else if (overlay.type === MapOverlayType.Polygon && overlay.coordinates) {
      overlay.coordinates.forEach((coord) => bounds.extend(coord));
    }
    // Handle Polyline type (multiple coordinates)
    else if (overlay.type === MapOverlayType.Polyline && overlay.coordinates) {
      overlay.coordinates.forEach((coord) => bounds.extend(coord));
    }

    // Recursively process child overlays if the overlay is a parent
    if (overlay.isParent && overlay.children) {
      overlay.children.forEach((child) => processOverlay(child));
    }
  };

  // Process all overlays
  overlays.forEach((overlay) => processOverlay(overlay));
  return bounds;
};

/**
 * Calculate the bounds of an overlay or an array of overlays.
 * @param overlays - Array of overlays (AdvancedMarkerElement, Polygon, Polyline, Circle, Rectangle).
 * @returns A `google.maps.LatLngBounds` object representing the bounds of the overlays.
 */
export const calculateOverlayBounds = (
  overlays: (
    | google.maps.marker.AdvancedMarkerElement
    | google.maps.Polygon
    | google.maps.Polyline
    | google.maps.Circle
    | google.maps.Rectangle
  )[]
): google.maps.LatLngBounds => {
  const bounds = new google.maps.LatLngBounds();

  overlays.forEach((overlay) => {
    if (overlay instanceof google.maps.marker.AdvancedMarkerElement) {
      // Handle AdvancedMarkerElement
      const position = overlay.position;
      if (position) {
        bounds.extend(position);
      }
    } else if (overlay instanceof google.maps.Polygon) {
      // Handle Polygon
      const paths = overlay.getPaths();
      paths.forEach((path) => {
        path.getArray().forEach((latLng) => bounds.extend(latLng));
      });
    } else if (overlay instanceof google.maps.Polyline) {
      // Handle Polyline
      const path = overlay.getPath();
      path.getArray().forEach((latLng) => bounds.extend(latLng));
    } else if (overlay instanceof google.maps.Circle) {
      // Handle Circle
      const center = overlay.getCenter();
      const radius = overlay.getRadius();
      if (center && radius) {
        const circleBounds = new google.maps.Circle({ center, radius }).getBounds();
        if (circleBounds) {
          bounds.union(circleBounds);
        }
      }
    } else if (overlay instanceof google.maps.Rectangle) {
      // Handle Rectangle
      const rectangleBounds = overlay.getBounds();
      if (rectangleBounds) {
        bounds.union(rectangleBounds);
      }
    }
  });

  return bounds;
};

export const makeDefaultMarkderContent = (): google.maps.marker.PinElement => {
  return new google.maps.marker.PinElement({
    background: "rgba(0, 0, 255, 0.7)", // Blue background for highlighted state
    borderColor: "#FFFF00", // Yellow border
    glyphColor: "#FFA500", // Orange glyph (icon)
    scale: 2.0, // 1.5 times the size of the default marker
  });
}

export const makeHighlightedMarkerContent = (): google.maps.marker.PinElement => {
  return new google.maps.marker.PinElement({
    background: "#FFA500", // Orange background for default state
    borderColor: "#137333", // Green border
    glyphColor: "#FFFFFF", // White glyph (icon)
    scale: 2.0, // 1.5 times the size of the default marker
  });
}

export const createMarkerWithText = (text: string) => {
  const parser = new DOMParser();
  const pinSvgString = createSvg(text);
  const pinSvg = parser.parseFromString(pinSvgString, "image/svg+xml").documentElement;
  return pinSvg;
}

export const createSvg = (text: string): string => {
  // Ensure the input text's maximum length is 37 characters
  const truncatedText = text.length > 37 ? `${text.substring(0, 37)}...` : text;

  // Calculate the rectangle's width based on the text length
  const textWidth = truncatedText.length * 8; // Approximate width based on font size (8px per character)
  const rectWidth = textWidth + 40; // Add padding (10px on each side)
  const rectHeight = 40; // Fixed height based on single character's height (18px font size + padding)

  // Calculate the text position to center it in the rectangle
  const textX = rectWidth / 2;
  const textY = rectHeight / 2 + 6; // Adjusted for proper vertical centering

  // Define the rounded corner radius
  const cornerRadius = 5;

  // Define the path for the rounded rectangle with an arrow at the bottom
  const pathData = `
    M ${cornerRadius},0
    H ${rectWidth - cornerRadius}
    Q ${rectWidth},0 ${rectWidth},${cornerRadius}
    V ${rectHeight - cornerRadius}
    Q ${rectWidth},${rectHeight} ${rectWidth - cornerRadius},${rectHeight}
    H ${rectWidth / 2 + 5}
    L ${rectWidth / 2},${rectHeight + 10}
    L ${rectWidth / 2 - 5},${rectHeight}
    H ${cornerRadius}
    Q 0,${rectHeight} 0,${rectHeight - cornerRadius}
    V ${cornerRadius}
    Q 0,0 ${cornerRadius},0
    Z
  `;

  // Create the SVG
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${rectWidth}" height="${rectHeight + 10}" viewBox="0 0 ${rectWidth} ${rectHeight + 10}">
      <!-- Rounded rectangle with arrow at the bottom -->
      <path d="${pathData}" fill="#374151" fill-opacity="0.9" stroke="#ff0" stroke-width="2" />
      <!-- Text centered in the rectangle -->
      <text x="${textX}" y="${textY}" text-anchor="middle" font-size="18" fill="#ff7f50" dominant-baseline="text-top">${truncatedText}</text>
    </svg>`;
};

export const createMarkerWithImgUrl = (url: string) => {
  // Validate the URL to ensure it's safe
  if (!isValidImageUrl(url)) {
    console.error('Invalid or unsafe image URL:', url);
    return null;
  }

  // Create an image element with the specified URL
  const img = document.createElement("img");
  img.src = url;
  return img;
}

export const createResizableMarkerWithImgUrl = (icon: MarkerIcon) => {
  // Validate the URL to ensure it's safe
  if (icon.content && !isValidImageUrl(icon.content)) {
    return null;
  }

  // Create the resizable container with the image
  const resizableContainer = document.createElement('div');
  resizableContainer.style.position = 'relative';
  resizableContainer.style.display = 'inline-block';
  // resizableContainer.style.width = '50px'; // Initial width
  // resizableContainer.style.height = '50px'; // Initial height
  resizableContainer.style.resize = 'both'; // Enable resizing
  resizableContainer.style.overflow = 'auto'; // Ensure content fits during resize

  // Create an image element with the specified URL
  const img = document.createElement("img");
  img.src = icon.content;
  // Set the width and height of the image based on the provided percentages
  if (icon.widthPercent) {
    img.style.width = `${icon.widthPercent}%`;
  } else {
    img.style.width = '100%'; // Default to 100% if widthPercent is not provided
  }

  if (icon.heightPercent) {
    img.style.height = `${icon.heightPercent}%`;
  } else {
    img.style.height = '100%'; // Default to 100% if heightPercent is not provided
  }

  // Append the image to the resizable container
  resizableContainer.appendChild(img);
  return resizableContainer;
}

export const getLatLngFromPosition = (position: unknown) => {
  if (position) {
    if (position instanceof google.maps.LatLng) {
      // If position is a google.maps.LatLng object
      return { lat: position.lat(), lng: position.lng() };
    } else if ((position as google.maps.LatLngLiteral).lat !== undefined) {
      // If position is a google.maps.LatLngLiteral
      const latLngLiteral = position as google.maps.LatLngLiteral;
      return { lat: latLngLiteral.lat, lng: latLngLiteral.lng };
    }
  } 
  return { lat: MAP_CENTER.lat, lng: MAP_CENTER.lng };
}

export const createPlaceFromGeocoderResult = (
  searchText: string,
  geocoderResult: google.maps.GeocoderResult
): Place => {
  return {
    id: uuidv4(),
    place_id: geocoderResult.place_id || uuidv4(),
    name: searchText,
    address: geocoderResult.formatted_address || "",
    lat: geocoderResult.geometry ?.location?.lat() || 0,
    lng: geocoderResult.geometry ?.location?.lng() || 0,
    icon: {type: MarkerIconType.Default, content: ""},
    url: "",
  }
}

export const createPlaceFromPlaceResult = (placeResult: google.maps.places.PlaceResult): Place => {
  return {
    id: uuidv4(),
    place_id: placeResult.place_id || uuidv4(),
    name: placeResult.name || "",
    address: placeResult.formatted_address || "",
    lat: placeResult.geometry?.location?.lat() || 0,
    lng: placeResult.geometry?.location?.lng() || 0,
    icon: {type: MarkerIconType.Default, content: ""},
    url: placeResult.url || "",
  }
}

export const createPlaceFromPosition = (position: google.maps.LatLngLiteral): Place => {
  return {
    id: uuidv4(),
    place_id: uuidv4(),
    name: "",
    address: "",
    lat: position.lat,
    lng: position.lng,
    icon: {type: MarkerIconType.Default, content: ""},
    url: ''
  }
}

export const createMapOverlayFromGeocoderResult = (
  searchText: string,
  geocoderResult: google.maps.GeocoderResult
): MapOverlay => {
  return {
    id: uuidv4(),
    isParent: false,
    place_id: geocoderResult.place_id || uuidv4(),
    title: searchText,
    type: MapOverlayType.Marker,  
    address: geocoderResult.formatted_address || "",
    coordinates: [{ lat: geocoderResult.geometry?.location?.lat() || MAP_CENTER.lat, 
                    lng: geocoderResult.geometry?.location?.lng() || MAP_CENTER.lng }], // Set the coordinates array with the lat and lng from the Place object
    icon: {type: MarkerIconType.Default, content: ""},
    url: "",
  }
}

export const createMapOverlayFromPlaceResult = (placeResult: google.maps.places.PlaceResult): MapOverlay => {
  return {
    id: uuidv4(),
    isParent: false,
    place_id: placeResult.place_id || uuidv4(),
    title: placeResult.name || "",
    type: MapOverlayType.Marker,  
    address: placeResult.formatted_address || "",
    coordinates: [{ lat: placeResult.geometry?.location?.lat() || MAP_CENTER.lat, 
                    lng: placeResult.geometry?.location?.lng() || MAP_CENTER.lng }], // Set the coordinates array with the lat and lng from the Place object
    icon: {type: MarkerIconType.Default, content: ""},
    url: placeResult.url || "",
  }
}

export const createMapOverlayFromPlace = (place: Place): MapOverlay => {
  const mapOverlay: MapOverlay = {
    id: place.id || uuidv4(), // Generate a unique ID for the overlay
    isParent: false, // Set isParent to false
    place_id: place.place_id, // Use the place_id from the Place object
    type: MapOverlayType.Marker, // Set the type to Marker
    title: place.name, // Use the name from the Place object as the title
    description: place.description || '', // Use the description from the Place object (if available)
    coordinates: [{ lat: place.lat, lng: place.lng }], // Set the coordinates array with the lat and lng from the Place object
    icon: place.icon, // Use the icon from the Place object
  };

  return mapOverlay;
}

export const createMapOverlayFromMapMarker = (mapMarker: MapMarker): MapOverlay => {
  const position = mapMarker.advancedMarker.position;
  const positionCoordinate = getLatLngFromPosition(position);

  const mapOverlay: MapOverlay = {
    id: mapMarker.id || uuidv4(), // Generate a unique ID for the overlay
    isParent: false, // Set isParent to false
    place_id: mapMarker.id, // Use the place_id from the Place object
    type: MapOverlayType.Marker, // Set the type to Marker
    title: '', // Use the name from the Place object as the title
    description: '', // Use the description from the Place object (if available)
    coordinates: [{ lat: positionCoordinate.lat, lng: positionCoordinate.lng }], // Set the coordinates array with the lat and lng from the Place object
    icon: mapMarker.icon, // Use the icon from the Place object
  };

  return mapOverlay;
}
