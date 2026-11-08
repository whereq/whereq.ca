import { MarkerIconType } from '@/features/map/models/MapEnum';
import { MapOverlayType } from "@/features/map/models/MapEnum";
import { MapType } from "@/features/map/models/MapEnum";

/**
 * The Place interface represents a place object that can be displayed on the map.
 * It's depraecated and should be replaced with the MapOverlay interface for now to 
 * reduce the complexity of the application.
 */
export interface Place {
  id: string;
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  icon: MarkerIcon;
  url: string;
  description?: string;
}

/**
 * Represents a map object with overlays and places.
 * It works like a database in browser's local storage.
 * 
 * There should be only one map object in the application's local storage.
 */
export interface Map {
    id: string; // Unique identifier for the overlay
    type: MapType;
    title: string; // Title of the overlay
    description: string; // Description of the overlay
    overlayArray: MapOverlay[]; // Array of overlays related to the map
    placeArray: MapOverlay[]; // Array of overlays(places) related to the map
}

export interface MapOverlay {
    id: string; // Unique identifier for the overlay
    place_id?: string; // Unique identifier for the place
    isParent?: boolean; // Indicates whether this is a parent overlay
    type?: MapOverlayType; // Type of the overlay (required for child overlays)
    address?: string; // Address of the overlay
    title?: string; // Title of the overlay
    description?: string; // Description of the overlay
    coordinates?: google.maps.LatLngLiteral[]; // Array of coordinates (required for child overlays)
    children?: MapOverlay[]; // Array of child overlays (required for parent overlays)
    icon?: MarkerIcon; // Icon for the overlay
    url?: string; // URL for the overlay
    radius?: number; // Radius for circles
}

export interface MarkerIcon {
    type: MarkerIconType;
    content: string;
    widthPercent?: number;
    heightPercent?: number;
}

export interface MapMarker {
    id: string;
    advancedMarker: google.maps.marker.AdvancedMarkerElement;
    icon: MarkerIcon;
    // mapOverlay: MapOverlay; // Reverse binding to the MapOverlay 
}