import { useCallback } from "react";
import { MapOverlay } from "@/features/map/types/types";
import { calculateMapOverlayBounds, highlightShape } from "@/features/map/utils/mapUtils";
import { MapOverlayType } from "@/features/map/models/MapEnum";
import { MAP_DRAWING_COLOR, MAP_EVENT } from "@/features/map/utils/constants";
import { useOverlayStore } from "@/features/map/store/mapStore";
import { eventEmitter } from "@/utils/eventEmitter";
import { updateMarkerIcon } from "@/features/map/utils/mapHandlers";
import logUtil from "@/utils/logUtil";

export const useOverlayManager = (mapRef: React.RefObject<google.maps.Map | null>) => {
    const { addToOverlayArrayOnMap, clearOverlayArrayOnMap, clearMapOverlayArrayOnMap } = useOverlayStore();

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
                    });

                    const markerElement = advancedMarker.element;
                    if (markerElement) {
                        markerElement.addEventListener(MAP_EVENT.CLICK, () => {
                            // Do nothing for now
                            logUtil.log("Marker clicked");
                        });
                    }

                    // Update the marker icon no matter newly created or existing marker
                    if (overlay.icon) {
                        updateMarkerIcon(advancedMarker, overlay.icon);
                    }
                    addToOverlayArrayOnMap(advancedMarker);
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

                    let isHighlighted = false;
                    polygon.addListener("click", (event: google.maps.MapMouseEvent) => {
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
                    });

                    polygon.addListener("mouseout", () => {
                        logUtil.log("Mouse out of the polygon");
                    });

                    addToOverlayArrayOnMap(polygon);
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

                    polyline.addListener("click", () => {
                        // Handle polyline click
                    });

                    addToOverlayArrayOnMap(polyline);
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

                        circle.addListener("click", () => {
                            // Handle circle click
                        });

                        addToOverlayArrayOnMap(circle);
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

                        rectangle.addListener("click", () => {
                            // Handle rectangle click
                        });

                        addToOverlayArrayOnMap(rectangle);
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
    }, [mapRef, addToOverlayArrayOnMap, clearOverlayArrayOnMap, clearMapOverlayArrayOnMap]);

    return { drawOverlays };
};