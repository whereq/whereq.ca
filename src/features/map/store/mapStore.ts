import { create } from "zustand";
import { Place } from "@/features/map/types/types";
import { Map, MapOverlay, MapMarker, NativeMapOverlay, DeletedShapeRecord } from "@/features/map/types/types";
import { MapShapeType, MapToolMode, OverlayModalMode, SectionType } from "@/features/map/models/MapEnum";
import LocalStorageHelper from "@/utils/localStorageHelper";
import { LOCAL_STORAGE_KEYS } from "@/utils/constants";
import { loadMapObjectFromLocalStorage } from "@/features/map/utils/mapUtils";

/**
 * How many deletions can be undone.
 *
 * Every entry keeps the live Google Maps objects of the shapes it deleted,
 * so the stack is bounded rather than unbounded: a long drawing session
 * must not hold on to every shape that was ever removed.
 */
const UNDO_STACK_LIMIT = 20;

interface MapStore {
    isWorkspaceVisible: boolean;
    toggleWorkspace: () => void;
    activeSection: SectionType.MY_PLACES | SectionType.MY_MAP | SectionType.RECENT_SEARCHES | null;
    setActiveSection: (section: SectionType.MY_PLACES | SectionType.MY_MAP | SectionType.RECENT_SEARCHES | null) => void;
    showExistingMap: boolean;
    toggleExistingMap: () => void;
    markerPosition: google.maps.LatLngLiteral | null;
    setMarkerPosition: (position: google.maps.LatLngLiteral | null) => void;
    place: Place | null;
    setPlace: (place: Place | null) => void;
    infoWindowContent: string | null;
    setInfoWindowContent: (content: string | null) => void;
    isMarkerCustomizeModalOpen: boolean;
    showMarkerCustomizeModal: (isOpen: boolean) => void;
    existingMap: Map; // Add existingMap to the store
    setExistingMap: (map: Map) => void; // Add setExistingMap action
    updateExistingMapPlace: (place: MapOverlay) => void; // Add action to update a place in existingMap
    clearAllPlaces: () => void; // Add action to clear all places
    deletePlace: (placeId: string) => void; // Add action to delete a place
    updateExistingMapOverlayArray: (mapOverlay: MapOverlay) => void; // Add action to update a place in existingMap
    clearAllMapOverlays: () => void; // Add action to clear all places
    deleteMapOverlay: (id: string) => void; // Add action to delete a place
}

export const useMapStore = create<MapStore>((set) => ({
    isWorkspaceVisible: false,
    toggleWorkspace: () => set((state) => ({ isWorkspaceVisible: !state.isWorkspaceVisible })),
    activeSection: null,
    setActiveSection: (section) => set({ activeSection: section }),
    showExistingMap: false,
    toggleExistingMap: () => set((state) => ({ showExistingMap: !state.showExistingMap })),
    markerPosition: null,
    setMarkerPosition: (position) => set({ markerPosition: position }),
    place: null,
    setPlace: (place: Place | null) => set({ place: place }),
    infoWindowContent: null,
    setInfoWindowContent: (content) => set({ infoWindowContent: content }),
    isMarkerCustomizeModalOpen: false,
    showMarkerCustomizeModal: (isOpen) => set({ isMarkerCustomizeModalOpen: isOpen }),
    existingMap: loadMapObjectFromLocalStorage(), // Initialize existingMap 
    setExistingMap: (map) => set({ existingMap: map }), // Set existingMap
    updateExistingMapPlace: (place) =>
        set((state) => {
            if (!state.existingMap) 
                return state;

            if (!state.existingMap.placeArray) {
                state.existingMap.placeArray = [];
            }
            const existingIndex = state.existingMap.placeArray.findIndex((p) => p.id === place.id);
            const updatedPlaceArray =
                existingIndex !== -1
                    ? state.existingMap.placeArray.map((p, index) => (index === existingIndex ? place : p))
                    : [...state.existingMap.placeArray, place];
            const updatedMap = { ...state.existingMap, placeArray: updatedPlaceArray };
            LocalStorageHelper.save(LOCAL_STORAGE_KEYS.MAP, updatedMap);
            return { existingMap: updatedMap };
        }),
    clearAllPlaces: () =>
        set((state) => {
            if (!state.existingMap) return state;
            const updatedMap = { ...state.existingMap, placeArray: [] };
            LocalStorageHelper.save(LOCAL_STORAGE_KEYS.MAP, updatedMap);
            return { existingMap: updatedMap };
        }),
    deletePlace: (placeId) =>
        set((state) => {
            if (!state.existingMap) return state;
            if (!state.existingMap.placeArray) {
                state.existingMap.placeArray = [];
                return state;
            }
            const updatedPlaceArray = state.existingMap.placeArray.filter((p) => p.place_id !== placeId);
            const updatedMap = { ...state.existingMap, placeArray: updatedPlaceArray };
            LocalStorageHelper.save(LOCAL_STORAGE_KEYS.MAP, updatedMap);
            return { existingMap: updatedMap };
        }),

    updateExistingMapOverlayArray: (mapOverlay) =>
        set((state) => {
            if (!state.existingMap) 
                return state;

            if (!state.existingMap.overlayArray) {
                state.existingMap.overlayArray= [];
            }
            const existingIndex = 
                state.existingMap.overlayArray.findIndex((mo) => 
                    mo.id === mapOverlay.id);

            const updatedMapOverlayArray =
                existingIndex !== -1
                    ? state.existingMap.overlayArray.map((mo, index) => 
                        (index === existingIndex ? mapOverlay: mo))
                    : [...state.existingMap.overlayArray, mapOverlay];
            
            const updatedMap = { ...state.existingMap, overlayArray: updatedMapOverlayArray};
            LocalStorageHelper.save(LOCAL_STORAGE_KEYS.MAP, updatedMap);
            return { existingMap: updatedMap };
        }),

    clearAllMapOverlays: () =>
        set((state) => {
            if (!state.existingMap) return state;
            const updatedMap = { ...state.existingMap, overlayArray: [] };
            LocalStorageHelper.save(LOCAL_STORAGE_KEYS.MAP, updatedMap);
            return { existingMap: updatedMap };
        }),

    deleteMapOverlay: (overlayId) =>
        set((state) => {
            if (!state.existingMap) return state;
            if (!state.existingMap.overlayArray) {
                state.existingMap.overlayArray = [];
                return state;
            }
            const updatedPlaceArray = state.existingMap.overlayArray.filter((p) => p.id !== overlayId);
            const updatedMap = { ...state.existingMap, overlayArray: updatedPlaceArray };
            LocalStorageHelper.save(LOCAL_STORAGE_KEYS.MAP, updatedMap);
            return { existingMap: updatedMap };
        }),
}));

export interface PlaceStore {
    placeMapOverlay: MapOverlay | null;
    setPlaceMapOverlay: (place: MapOverlay | null) => void;
}

export const usePlaceStore = create<PlaceStore>((set) => ({
    placeMapOverlay: null,
    setPlaceMapOverlay: (place) => set({ placeMapOverlay: place }),
}));

export interface MapToolStore {
    mapToolMode: MapToolMode;
    setMapToolMode: (mode: MapToolMode) => void;
}

export const useMapToolStore = create<MapToolStore>((set) => ({
    mapToolMode: MapToolMode.Hand,
    setMapToolMode: (mode) => set({ mapToolMode: mode }),
}));

export interface OverlayStore {
    clickedOverlay: MapOverlay | null;
    setClickedOverlay: (overlay: MapOverlay | null) => void;
    isOverlayVisible: boolean;
    activeTool: string | null;
    drawingBarActive: boolean;
    saveButtonInMapToolEnabled: boolean;
    setSaveButtonInMapToolEnabled: (enabled: boolean) => void;
    overlayModalMode: OverlayModalMode | null;
    mapShapeType: MapShapeType | null; // Add mapShapeType
    selectedMarker: MapMarker | null;
    setSelectedMarker: (marker: MapMarker) => void;
    setActiveTool: (activeTool: string | null | ((prev: string | null) => string | null)) => void;
    setDrawingBarActive: (active: boolean) => void;
    setOverlayModalMode: (mode: OverlayModalMode | null) => void;
    setMapShapeType: (shapeType: MapShapeType | null) => void; // Add setter for mapShapeType
    /**
     * True when the drawing tools could not be started (for example because
     * the Google Maps API rejected the request). The toolbar greys the shape
     * buttons out and shows a short notice instead of letting the failure
     * take down the app.
     */
    drawingUnavailable: boolean;
    setDrawingUnavailable: (unavailable: boolean) => void;

    /**
     * The notice shown under the tool bar.
     *
     * It lives in the store rather than in the tool bar's own state
     * because the actions that raise it are spread over several
     * components: the tool bar, the overlay modal and the drawing
     * controller all report back to the same place.
     */
    toolNotice: string | null;
    setToolNotice: (notice: string | null | ((prev: string | null) => string | null)) => void;

    mapOverlayArrayOnMap: MapOverlay[];
    setMapOverlayArrayOnMap: (overlayArray: MapOverlay[] | ((prev: MapOverlay[]) => MapOverlay[])) => void;
    addToMapOverlayArrayOnMap: (overlay: MapOverlay) => void;
    clearMapOverlayArrayOnMap: () => void; // Clear the overlay array on the map

    selectedOverlayArray: MapOverlay[];
    setSelectedOverlayArray: (overlayArray: MapOverlay[] | ((prev: MapOverlay[]) => MapOverlay[])) => void;
    toggleOverlayVisibility: () => void;

    /**
     * The live Google Maps object behind each shape, keyed by the shape's id.
     *
     * The model (`mapOverlayArrayOnMap`) and the native overlays
     * (`overlayArrayOnMap`) are two parallel lists that do not share an
     * index — a marker, for instance, is in the model but not in the
     * native list. The registry is what ties them together, so a shape can
     * be taken off the map by id.
     */
    nativeOverlayRegistry: Record<string, NativeMapOverlay>;
    registerNativeOverlay: (id: string, overlay: NativeMapOverlay) => void;
    removeNativeOverlay: (id: string) => void;
    clearNativeOverlayRegistry: () => void;

    /**
     * The deletions that can still be undone, oldest first.
     *
     * Each entry holds the shapes that were taken off the map *and* the
     * live objects behind them, so undo puts the very same shapes back
     * rather than redrawing them from the model.
     */
    undoStack: DeletedShapeRecord[];
    pushUndoRecord: (record: DeletedShapeRecord) => void;
    /** Take the most recent deletion off the stack and return it. */
    popUndoRecord: () => DeletedShapeRecord | undefined;
    clearUndoStack: () => void;

    overlayArrayOnMap: (
        google.maps.marker.AdvancedMarkerElement |
        google.maps.Polygon |
        google.maps.Polyline |
        google.maps.Circle |
        google.maps.Rectangle)[];
    setOverlayArrayOnMap: (overlayArray: (
        google.maps.marker.AdvancedMarkerElement |
        google.maps.Polygon |
        google.maps.Polyline |
        google.maps.Circle |
        google.maps.Rectangle)[] | ((prev: (
        google.maps.marker.AdvancedMarkerElement |
        google.maps.Polygon |
        google.maps.Polyline |
        google.maps.Circle |
        google.maps.Rectangle)[]) => (
        google.maps.marker.AdvancedMarkerElement |
        google.maps.Polygon |
        google.maps.Polyline |
        google.maps.Circle |
        google.maps.Rectangle)[])) => void;
    addToOverlayArrayOnMap: (overlay: 
        google.maps.marker.AdvancedMarkerElement |
        google.maps.Polygon | 
        google.maps.Polyline | 
        google.maps.Circle | 
        google.maps.Rectangle) => void;
    deleteOverlayOnMap: (id: string) => void; // Clear the overlay array on the map
    clearOverlayArrayOnMap: () => void; // Clear the overlay array on the map
    clearOverlayArrayFromMap: () => void; // Clear the overlay array in the map object in local storage 
    deleteOveryFromMap: (id: string) => void; // Delete an overlay from the map object in local storage
}

export const useOverlayStore = create<OverlayStore>((set, get) => ({
    clickedOverlay: null,
    setClickedOverlay: (overlay) => set({ clickedOverlay: overlay, isOverlayVisible: true }),
    isOverlayVisible: false,
    toggleOverlayVisibility: () => set((state) => ({ isOverlayVisible: !state.isOverlayVisible })),
    activeTool: null,
    setActiveTool: (activeTool) => set((state) => ({
        activeTool: typeof activeTool === "function" ? activeTool(state.activeTool) : activeTool,
    })),
    drawingBarActive: false,
    setDrawingBarActive: (active) => set({ drawingBarActive: active }),
    saveButtonInMapToolEnabled: false,
    setSaveButtonInMapToolEnabled: (enabled) => set({ saveButtonInMapToolEnabled: enabled }),
    mapShapeType: null, // Initialize mapShapeType
    setMapShapeType: (shapeType) => set({ mapShapeType: shapeType }), // Setter for mapShapeType
    overlayModalMode: null,
    setOverlayModalMode: (mode: OverlayModalMode | null) => set({ overlayModalMode: mode }),
    drawingUnavailable: false,
    setDrawingUnavailable: (unavailable) => set({ drawingUnavailable: unavailable }),
    toolNotice: null,
    setToolNotice: (notice) => set((state) => ({
        toolNotice: typeof notice === "function" ? notice(state.toolNotice) : notice,
    })),

    mapOverlayArrayOnMap: [],
    setMapOverlayArrayOnMap: (overlayArray) => set((state) => ({
        mapOverlayArrayOnMap: typeof overlayArray === "function" ? overlayArray(state.mapOverlayArrayOnMap) : overlayArray,
    })),

    addToMapOverlayArrayOnMap: (overlay) => {
        // Update the state
        set((state) => {
            if (!state.mapOverlayArrayOnMap) {
                state.mapOverlayArrayOnMap = [];
            }

            // Check if an overlay with the same ID already exists
            const existingOverlayIndex = state.mapOverlayArrayOnMap.findIndex(
                (existingOverlay) => existingOverlay.id === overlay.id
            );

            // If an overlay with the same ID exists, replace it
            if (existingOverlayIndex !== -1) {
                const updatedOverlayArray = [...state.mapOverlayArrayOnMap];
                updatedOverlayArray[existingOverlayIndex] = overlay;
                return {
                    mapOverlayArrayOnMap: updatedOverlayArray,
                };
            }

            // If no overlay with the same ID exists, add the new overlay
            return {
                mapOverlayArrayOnMap: [...state.mapOverlayArrayOnMap, overlay],
            };
        });
    },

    clearMapOverlayArrayOnMap: () => set(() => {
        return { mapOverlayArrayOnMap: [] };
    }),

    selectedOverlayArray: [],
    setSelectedOverlayArray: (overlayArray) => set((state) => ({
        selectedOverlayArray: typeof overlayArray === "function" ? overlayArray(state.selectedOverlayArray) : overlayArray,
    })),

    nativeOverlayRegistry: {},
    registerNativeOverlay: (id, overlay) => set((state) => ({
        nativeOverlayRegistry: { ...state.nativeOverlayRegistry, [id]: overlay },
    })),
    removeNativeOverlay: (id) => set((state) => {
        const registry = { ...state.nativeOverlayRegistry };
        delete registry[id];
        return { nativeOverlayRegistry: registry };
    }),
    clearNativeOverlayRegistry: () => set({ nativeOverlayRegistry: {} }),

    undoStack: [],
    pushUndoRecord: (record) => set((state) => ({
        // The stack is bounded: a long drawing session should not keep every
        // deleted shape alive forever.
        undoStack: [...state.undoStack, record].slice(-UNDO_STACK_LIMIT),
    })),
    popUndoRecord: () => {
        const stack = get().undoStack;
        if (stack.length === 0) {
            return undefined;
        }
        set({ undoStack: stack.slice(0, -1) });
        return stack[stack.length - 1];
    },
    clearUndoStack: () => set({ undoStack: [] }),

    selectedMarker: null,
    setSelectedMarker: (mapMarker) => set({ selectedMarker: mapMarker }),

    overlayArrayOnMap: [],
    setOverlayArrayOnMap: (overlayArray) => set((state) => ({
        overlayArrayOnMap: typeof overlayArray === "function"
            ? overlayArray(state.overlayArrayOnMap)
            : overlayArray,
    })),
    addToOverlayArrayOnMap: (overlay) => set((state) => ({ 
        overlayArrayOnMap: [...state.overlayArrayOnMap, overlay] 
    })),
    deleteOverlayOnMap: (id) => set((state) => {
        // const mapOverlay = state.mapOverlayArrayOnMap.find((overlay) => overlay.id === id);
        // if (mapOverlay && state.overlayArrayOnMap) {
        //     state.overlayArrayOnMap.find((overlay) => overlay.id === id)?.setMap(null);
        // }
        const updatedOverlayArray = state.mapOverlayArrayOnMap.filter((overlay) => overlay.id !== id);
        LocalStorageHelper.save(LOCAL_STORAGE_KEYS.MAP, { ...state, overlayArray: updatedOverlayArray });
        return { mapOverlayArrayOnMap: updatedOverlayArray };
    }),
    clearOverlayArrayOnMap: () => set((state) => {
        if (state.overlayArrayOnMap) {
            state.overlayArrayOnMap.forEach((overlay) => {
                if (overlay instanceof google.maps.marker.AdvancedMarkerElement) {
                    overlay.map = null;
                } else {
                    overlay.setMap(null); // Remove the overlay from the map
                }
            });
        }
        // The whole drawing was thrown away: the live objects behind it are
        // gone, so the registry must not keep pointing at them and there is
        // nothing left to put back.
        return { overlayArrayOnMap: [], nativeOverlayRegistry: {}, undoStack: [] };
    }),
    clearOverlayArrayFromMap: () => set((state) => {
        LocalStorageHelper.save(LOCAL_STORAGE_KEYS.MAP, { ...state, overlayArray: [] });
        return { mapOverlayArrayOnMap: [] };
    }),
    deleteOveryFromMap: (id) => set((state) => {
        const updatedOverlayArray = state.mapOverlayArrayOnMap.filter((overlay) => overlay.id !== id);
        LocalStorageHelper.save(LOCAL_STORAGE_KEYS.MAP, { ...state, overlayArray: updatedOverlayArray });
        return { mapOverlayArrayOnMap: updatedOverlayArray };
    }),
}));