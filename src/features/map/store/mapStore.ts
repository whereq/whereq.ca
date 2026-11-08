import { create } from "zustand";
import { Place } from "@/features/map/types/types";
import { Map, MapOverlay, MapMarker } from "@/features/map/types/types";
import { MapShapeType, MapToolMode, OverlayModalMode, SectionType } from "@/features/map/models/MapEnum";
import LocalStorageHelper from "@/utils/localStorageHelper";
import { LOCAL_STORAGE_KEYS } from "@/utils/constants";
import { loadMapObjectFromLocalStorage } from "@/features/map/utils/mapUtils";

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

    mapOverlayArrayOnMap: MapOverlay[];
    setMapOverlayArrayOnMap: (overlayArray: MapOverlay[] | ((prev: MapOverlay[]) => MapOverlay[])) => void;
    addToMapOverlayArrayOnMap: (overlay: MapOverlay) => void;
    clearMapOverlayArrayOnMap: () => void; // Clear the overlay array on the map

    selectedOverlayArray: MapOverlay[];
    setSelectedOverlayArray: (overlayArray: MapOverlay[] | ((prev: MapOverlay[]) => MapOverlay[])) => void;
    toggleOverlayVisibility: () => void;

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
        google.maps.Rectangle)[]) => void;
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

export const useOverlayStore = create<OverlayStore>((set) => ({
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

    selectedMarker: null,
    setSelectedMarker: (mapMarker) => set({ selectedMarker: mapMarker }),

    overlayArrayOnMap: [],
    setOverlayArrayOnMap: (overlayArray) => set({ overlayArrayOnMap: overlayArray }),
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
        return { overlayArrayOnMap: [] };
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