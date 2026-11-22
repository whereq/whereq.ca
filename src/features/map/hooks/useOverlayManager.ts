import { useCallback } from "react";
import { MapOverlay } from "@/features/map/types/types";
import { calculateMapOverlayBounds } from "@/features/map/utils/mapUtils";
import { MapOverlayType } from "@/features/map/models/MapEnum";
import { MAP_DRAWING_COLOR } from "@/features/map/utils/constants";
import { useOverlayStore } from "@/features/map/store/mapStore";
import { eventEmitter } from "@/utils/eventEmitter";
import { EVENT } from "@/utils/constants";
import { updateMarkerIcon } from "@/features/map/utils/mapHandlers";
import logUtil from "@/utils/logUtil";

/**
 * Announce that a shape on the map was selected.
 *
 * A plain click selects the shape and nothing else; a shift-click adds it
 * to the selection or takes it out again. That is what makes "group these
 * two shapes" possible.
 */
const announceSelection = (overlayId: string, event: google.maps.MapMouseEvent) => {
    eventEmitter.emit(EVENT.MAP_OVERLAY_SELECTED, {
        overlayId,
        additive: Boolean((event.domEvent as MouseEvent | undefined)?.shiftKey),
    });
};

export const useOverlayManager = (mapRef: React.RefObject<google.maps.Map | null>) => {
    const {
        addToOverlayArrayOnMap,
        clearOverlayArrayOnMap,
        clearMapOverlayArrayOnMap,
        registerNativeOverlay,
    } = useOverlayStore();

    const drawOverlays = useCallback((overlays: MapOverlay[]) => {
        if (!mapRef.current) {
            console.error("Map reference is not available.");
            return;
        }

        const drawSingleOverlay = (overlay: MapOverlay) => {
            if (!overlay.coordinates) {
                console.error("Overlay coordinates are missing.");
                return;
            }

            switch (overlay.type) {
                case MapOverlayType.Marker: {
                    const advancedMarker = new google.maps.marker.AdvancedMarkerElement({
                        map: mapRef.current,
                        position: overlay.coordinates[0],
                        // Makes the marker clickable and keyboard reachable;
                        // the click arrives as the `gmp-click` event.
                        gmpClickable: true,
                    });

                    // `addEventListener("click", ...)` on the marker's DOM
                    // element is deprecated by Google - the marker itself is
                    // the event target, and the event is `gmp-click`.
                    advancedMarker.addEventListener("gmp-click", () => {
                        // Do nothing for now
                        logUtil.log("Marker clicked");
                    });

                    // Update the marker icon no matter newly created or existing marker
                    if (overlay.icon) {
                        updateMarkerIcon(advancedMarker, overlay.icon);
                    }
                    addToOverlayArrayOnMap(advancedMarker);
                    registerNativeOverlay(overlay.id, advancedMarker);
                    break;
                }
                case MapOverlayType.Polygon: {
                    const polygon = new google.maps.Polygon({
                        paths: overlay.coordinates,
                        strokeColor: MAP_DRAWING_COLOR.DEFAULT_STROKE_COLOR,
                        strokeWeight: 4,
                        fillColor: MAP_DRAWING_COLOR.DEFAULT_FILL_COLOR,
                        editable: true,
                        draggable: false,
                        map: mapRef.current,
                        zIndex: 9999,
                    });

                    polygon.addListener("click", (event: google.maps.MapMouseEvent) => {
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
                    });

                    polygon.addListener("mouseout", () => {
                        logUtil.log("Mouse out of the polygon");
                    });

                    addToOverlayArrayOnMap(polygon);
                    registerNativeOverlay(overlay.id, polygon);
                    break;
                }

                case MapOverlayType.Polyline: {
                    const polyline = new google.maps.Polyline({
                        path: overlay.coordinates,
                        strokeColor: MAP_DRAWING_COLOR.DEFAULT_STROKE_COLOR,
                        strokeWeight: 4,
                        editable: true,
                        draggable: false,
                        map: mapRef.current,
                        zIndex: 9999,
                    });

                    polyline.addListener("click", (event: google.maps.MapMouseEvent) => {
                        event.stop();
                        announceSelection(overlay.id, event);
                    });

                    addToOverlayArrayOnMap(polyline);
                    registerNativeOverlay(overlay.id, polyline);
                    break;
                }

                case MapOverlayType.Circle:
                    if (overlay.coordinates.length === 1 && overlay.radius) {
                        const circle = new google.maps.Circle({
                            center: overlay.coordinates[0],
                            radius: overlay.radius,
                            strokeColor: MAP_DRAWING_COLOR.DEFAULT_STROKE_COLOR,
                            strokeWeight: 4,
                            fillColor: MAP_DRAWING_COLOR.DEFAULT_FILL_COLOR,
                            editable: true,
                            draggable: false,
                            map: mapRef.current,
                            zIndex: 9999,
                        });

                        circle.addListener("click", (event: google.maps.MapMouseEvent) => {
                            event.stop();
                            announceSelection(overlay.id, event);
                        });

                        addToOverlayArrayOnMap(circle);
                        registerNativeOverlay(overlay.id, circle);
                    } else {
                        console.error("Circle overlay requires exactly one coordinate and a radius.");
                    }
                    break;

                case MapOverlayType.Rectangle:
                    if (overlay.coordinates.length === 2) {
                        const rectangle = new google.maps.Rectangle({
                            bounds: new google.maps.LatLngBounds(
                                overlay.coordinates[0],
                                overlay.coordinates[1]
                            ),
                            strokeColor: MAP_DRAWING_COLOR.DEFAULT_STROKE_COLOR,
                            strokeWeight: 4,
                            fillColor: MAP_DRAWING_COLOR.DEFAULT_FILL_COLOR,
                            editable: true,
                            draggable: false,
                            map: mapRef.current,
                            zIndex: 9999,
                        });

                        rectangle.addListener("click", (event: google.maps.MapMouseEvent) => {
                            event.stop();
                            announceSelection(overlay.id, event);
                        });

                        addToOverlayArrayOnMap(rectangle);
                        registerNativeOverlay(overlay.id, rectangle);
                    } else {
                        console.error("Rectangle overlay requires exactly two coordinates.");
                    }
                    break;

                default:
                    console.error(`Unsupported overlay type: ${overlay.type}`);
                    break;
            }
        };

        const processOverlay = (overlay: MapOverlay) => {
            if (overlay.isParent && overlay.children) {
                overlay.children.forEach((child) => processOverlay(child));
            } else {
                drawSingleOverlay(overlay);
            }
        };

        // Clear existing overlays
        clearOverlayArrayOnMap();
        clearMapOverlayArrayOnMap();

        // Draw new overlays
        overlays.forEach((overlay) => processOverlay(overlay));

        // Calculate bounds and adjust the map's view
        const bounds = calculateMapOverlayBounds(overlays);
        if (!bounds.isEmpty()) {
            mapRef.current.fitBounds(bounds);
            // mapRef.current.setZoom(15); // Set a reasonable zoom level for multiple overlays
        } else {
            // If bounds are empty (e.g., only a single Marker), center the map on the Marker's coordinate
            const firstOverlay = overlays[0];
            if (firstOverlay?.type === MapOverlayType.Marker && firstOverlay.coordinates?.length === 1) {
                mapRef.current.setCenter(firstOverlay.coordinates[0]);
                mapRef.current.setZoom(15); // Set a reasonable zoom level for a single Marker
            }
        }
    }, [
        mapRef,
        addToOverlayArrayOnMap,
        clearOverlayArrayOnMap,
        clearMapOverlayArrayOnMap,
        registerNativeOverlay,
    ]);

    return { drawOverlays };
};