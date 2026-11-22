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

/**
 * The live Google Maps object that backs a `MapOverlay`.
 *
 * The model (`MapOverlay`) and the native overlay are two separate things:
 * the model is what the app stores and persists, the native overlay is
 * what is actually drawn on the map. The overlay store keeps a registry
 * that ties them together by id, so a shape can be removed from the map
 * by id.
 */
export type NativeMapOverlay =
    | google.maps.marker.AdvancedMarkerElement
    | google.maps.Polygon
    | google.maps.Polyline
    | google.maps.Circle
    | google.maps.Rectangle;

/**
 * What an undo record undoes.
 *
 * - `delete` — shapes were taken off the map;
 * - `group` — shapes were put into a group;
 * - `ungroup` — a group was taken apart.
 */
export type UndoAction = "delete" | "group" | "ungroup";

/**
 * One model entry that goes back where it used to be.
 *
 * The live object is kept, not thrown away: a deleted shape is only taken
 * off the map (`setMap(null)`), so the same object can be put back exactly
 * as it was — with the vertices the visitor dragged, and with the name it
 * was given.
 */
export interface RestoredOverlay {
    /** The model entry that goes back. */
    overlay: MapOverlay;
    /** Where it sat in the drawing before the change. */
    index: number;
    /** The live object behind it, when there was one. */
    native?: NativeMapOverlay;
    /**
     * True when the change took the live object off the map.
     *
     * A deletion does; grouping and ungrouping do not — the shapes stay on
     * the map in both cases, only the model changes.
     */
    wasDetached?: boolean;
    /** True when the live object was in the native overlay list. */
    wasInNativeList?: boolean;
}

/**
 * A change to the drawing that can be undone.
 *
 * The overlay store keeps a stack of these, so the visitor can walk back
 * through the changes one at a time.
 */
export interface UndoRecord {
    /** What was done, so the notice can say it. */
    action: UndoAction;
    /**
     * The model entries that go back, and where they came from.
     *
     * They are put back from the earliest index upwards, so each one lands
     * in the place it used to hold even when several of them come back at
     * once.
     */
    restored: RestoredOverlay[];
    /**
     * The ids of the model entries that have to go away again.
     *
     * Undoing a group takes the group out; undoing an ungroup takes the
     * shapes that were let out of it back into the group.
     */
    removedIds: string[];
}

export interface MapMarker {
    id: string;
    advancedMarker: google.maps.marker.AdvancedMarkerElement;
    icon: MarkerIcon;
    // mapOverlay: MapOverlay; // Reverse binding to the MapOverlay 
}