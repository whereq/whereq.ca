import { useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { useMapStore, useOverlayStore, usePlaceStore } from "@/features/map/store/mapStore";
import { loadMapObjectFromLocalStorage } from "@/features/map/utils/mapUtils";
import { Map, MapOverlay } from "@/features/map/types/types";
import { MAP_CENTER } from "@/features/map/utils/constants";
import { updateMarkerIcon } from "@/features/map/utils/mapHandlers";
import { MarkerIconType } from "@/features/map/models/MapEnum";

// Load My Places from local storage when the component mounts
export const useExistingMap = (
    setExistingMap: (map: Map) => void
) => {
    useEffect(() => {
        const loadMap = () => {
            setExistingMap(loadMapObjectFromLocalStorage());
        };
        loadMap();
    }, [setExistingMap]);
}

export const useHandleSelectedPlace = (
    mapRef: React.RefObject<google.maps.Map | null>,
) => {
    const { placeMapOverlay } = usePlaceStore();

    useEffect(() => {
        if (!mapRef.current || !placeMapOverlay) return;
        const coordinate = placeMapOverlay.coordinates ? 
                placeMapOverlay.coordinates[0] : 
                { lat: MAP_CENTER.lat, lng: MAP_CENTER.lng };
        const position = { lat: coordinate.lat, lng: coordinate.lng };
        mapRef.current.panTo(position);
        mapRef.current.setZoom(15);
    }, [placeMapOverlay, mapRef]);
};

export const useHandleOverlayToggling = (
    mapRef: React.RefObject<google.maps.Map | null>,
    drawOverlays: (overlays: MapOverlay[]) => void,
    clearOverlayArrayOnMap: () => void,
    clearMapOverlayArrayOnMap: () => void
) => {
    const { showExistingMap } = useMapStore();

    useEffect(() => {
        if (!mapRef.current) return;

        if (showExistingMap) {
            const existingMap = loadMapObjectFromLocalStorage();
            drawOverlays(existingMap.overlayArray);
        } else {
            clearOverlayArrayOnMap();
            clearMapOverlayArrayOnMap();
        }
    }, [showExistingMap, mapRef, drawOverlays, clearOverlayArrayOnMap, clearMapOverlayArrayOnMap]);
};

export const useHandleClickedOverlay = (
    mapRef: React.RefObject<google.maps.Map | null>,
    drawOverlays: (overlays: MapOverlay[]) => void,
    clearOverlayArrayOnMap: () => void,
    clearMapOverlayArrayOnMap: () => void
) => {
    const { clickedOverlay, isOverlayVisible } = useOverlayStore();

    useEffect(() => {
        if (!mapRef.current || !clickedOverlay) return;

        if (isOverlayVisible) {
            drawOverlays([clickedOverlay]);
        } else {
            clearOverlayArrayOnMap();
            clearMapOverlayArrayOnMap();
        }
    }, [clickedOverlay, isOverlayVisible, mapRef, drawOverlays, clearOverlayArrayOnMap, clearMapOverlayArrayOnMap]);
};

export const useHandleAdvancedMarker = (
    mapRef: React.RefObject<google.maps.Map | null>,
) => {
    const advancedMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
    const isDirtyMarkerRef = useRef(false); // Use a ref to track isDirtyMarker
    const { showMarkerCustomizeModal } = useMapStore();
    const { placeMapOverlay } = usePlaceStore();
    const { setSelectedMarker } = useOverlayStore();

    // Sync the ref with the state
    useEffect(() => {
        let marker: google.maps.marker.AdvancedMarkerElement | null = null;
        let handleClick: (() => void) | null = null;

        if (placeMapOverlay && mapRef.current && window.google.maps.marker) {
            const latLng: google.maps.LatLngLiteral =
                placeMapOverlay.coordinates ?
                    placeMapOverlay.coordinates[0] :
                    { lat: MAP_CENTER.lat, lng: MAP_CENTER.lng };

            // Create a new marker if it doesn't exist
            if (!advancedMarkerRef.current) {
                advancedMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
                    map: mapRef.current,
                    position: new google.maps.LatLng(latLng.lat, latLng.lng),
                    // Makes the marker clickable and keyboard reachable; the
                    // click arrives as the `gmp-click` event.
                    gmpClickable: true,
                });
            } else {
                advancedMarkerRef.current.position =
                    new google.maps.LatLng(latLng.lat, latLng.lng);
            }

            marker = advancedMarkerRef.current;

            // `addEventListener("click", ...)` on the marker's DOM element is
            // deprecated by Google ("Please use addEventListener('gmp-click',
            // ...)"), and so is `AdvancedMarkerElement.element`. The marker
            // itself is the event target.
            handleClick = () => {
                if (advancedMarkerRef.current && !isDirtyMarkerRef.current) {
                    const mapMarker = {
                        id: placeMapOverlay.id || uuidv4(),
                        advancedMarker: advancedMarkerRef.current,
                        icon: placeMapOverlay.icon || { type: MarkerIconType.Default, content: "" },
                        // mapOverlay: placeMapOverlay,
                    };
                    setSelectedMarker(mapMarker); // Store the marker reference
                }
                showMarkerCustomizeModal(true);
            };
            marker.addEventListener("gmp-click", handleClick);

            // Update the marker icon no matter newly created or existing marker
            if (placeMapOverlay.icon) {
                updateMarkerIcon(advancedMarkerRef.current, placeMapOverlay.icon);
            }
        }

        // Cleanup function to remove the event listener
        return () => {
            if (marker && handleClick) {
                marker.removeEventListener("gmp-click", handleClick);
            }
        };
    }, [placeMapOverlay,
        mapRef, 
        showMarkerCustomizeModal, 
        setSelectedMarker]);

    return advancedMarkerRef;
};