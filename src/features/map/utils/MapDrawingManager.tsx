import React, { useEffect, useRef } from "react";
import { v4 as uuidv4 } from 'uuid';
import { createDrawingManager, makeDefaultMarkderContent } from "@/features/map/utils/mapUtils";
import { MapOverlay } from "@/features/map/types/types";
import { useOverlayStore } from "@/features/map/store/mapStore";
import { handleCircleComplete, 
         handleMarkerComplete, 
         handlePolygonComplete, 
         handlePolylineComplete, 
         handleRectangleComplete } from "@/features/map/utils/mapHandlers";
import { eventEmitter } from "@/utils/eventEmitter";
import { MapOverlayType, MarkerIconType } from "@/features/map/models/MapEnum";

type MapDrawingManagerProps = {
  mapRef: React.RefObject<google.maps.Map | null>;
};

const MapDrawingManager: React.FC<MapDrawingManagerProps> = ({
  mapRef,
}) => {
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const { setOverlayModalMode, 
          setSaveButtonInMapToolEnabled: setSaveButtonInDrawingBarEnabled, 
          mapShapeType, 
          addToMapOverlayArrayOnMap, 
          setSelectedOverlayArray, 
          setSelectedMarker, 
          addToOverlayArrayOnMap } = useOverlayStore();

  // Listen for the polygon-clicked event
  useEffect(() => {
    const handlePolygonClicked = (
      { polygon, isHighlighted }: { polygon: google.maps.Polygon, isHighlighted: boolean }
    ) => {
      const paths = polygon.getPath().getArray().map(latLng => ({ lat: latLng.lat(), lng: latLng.lng() }));
      const overlay: MapOverlay = {
        id: uuidv4(),
        type: MapOverlayType.Polygon,
        title: "",
        description: "",
        coordinates: paths,
      };

      setSelectedOverlayArray((prev) => {
        if (isHighlighted) {
          return [...prev, overlay]; // Add to selected overlays
        } else {
          return prev.filter((o) => o.id !== overlay.id); // Remove from selected overlays
        }
      });
    };

    eventEmitter.on<{ polygon: google.maps.Polygon; isHighlighted: boolean }>("polygon-clicked", handlePolygonClicked);

    return () => {
      eventEmitter.off("polygon-clicked", handlePolygonClicked);
    };
  }, [setSelectedOverlayArray]);

  useEffect(() => {
    if (mapRef.current && !drawingManagerRef.current && mapShapeType) {
      const manager = createDrawingManager(mapShapeType);

      manager.setMap(mapRef.current);
      drawingManagerRef.current = manager;

      // Define the polygon complete callback after drawingManagerRef is initialized
      const handlePolygonCompleteCallback = (polygon: google.maps.Polygon) => {
        const overlay = handlePolygonComplete(polygon, mapShapeType, drawingManagerRef);
        addToOverlayArrayOnMap(polygon);
        addToMapOverlayArrayOnMap(overlay);
        setSaveButtonInDrawingBarEnabled(true);
      };

      // Define the poline complete callback after drawingManagerRef is initialized
      const handlePolylineCompleteCallback = (polyline: google.maps.Polyline) => {
        const overlay = handlePolylineComplete(polyline);
        addToOverlayArrayOnMap(polyline);
        addToMapOverlayArrayOnMap(overlay);
        setSaveButtonInDrawingBarEnabled(true);
      };

      const handleCircleCompleteCallback = (circle: google.maps.Circle) => {
        const overlay = handleCircleComplete(circle, mapShapeType, drawingManagerRef);
        addToOverlayArrayOnMap(circle);
        addToMapOverlayArrayOnMap(overlay);
        setSaveButtonInDrawingBarEnabled(true);
      };

      const handleRectangleCompleteCallback = (rectangle: google.maps.Rectangle) => {
        const overlay = handleRectangleComplete(rectangle, mapShapeType, drawingManagerRef);
        addToOverlayArrayOnMap(rectangle);
        addToMapOverlayArrayOnMap(overlay);
        setSaveButtonInDrawingBarEnabled(true);
      };

      // Define the marker complete callback after drawingManagerRef is initialized
      const handleMarkerCompleteCallback = (marker: google.maps.Marker) => {
        marker.setMap(null); // Remove the marker from the map
        const advancedMarker = new google.maps.marker.AdvancedMarkerElement({
          map: mapRef.current,
          position: marker.getPosition(),
          content: makeDefaultMarkderContent().element,
        });
        // setSelectedMarker({ marker: advancedMarker}); // Store the marker reference
        // setOverlayModalMode(OverlayModalMode.Marker);
        const overlay = handleMarkerComplete(
          advancedMarker,
          () => {
            const mapMarker = {
              id: overlay.id,
              advancedMarker: advancedMarker,
              icon: { type: MarkerIconType.Default, content: "" },
            };
            setSelectedMarker(mapMarker); // Store the marker reference
          });
        addToMapOverlayArrayOnMap(overlay)
        setSaveButtonInDrawingBarEnabled(true);
      };

      google.maps.event.addListener(manager, "polygoncomplete", handlePolygonCompleteCallback);
      google.maps.event.addListener(manager, "polylinecomplete", handlePolylineCompleteCallback);
      google.maps.event.addListener(manager, "circlecomplete", handleCircleCompleteCallback);
      google.maps.event.addListener(manager, "rectanglecomplete", handleRectangleCompleteCallback);
      google.maps.event.addListener(manager, "markercomplete", handleMarkerCompleteCallback);

      return () => {
        manager.setMap(null);
        drawingManagerRef.current = null;
        // eventEmitter.off("marker-dblclick", handleMarkerDoubleClick);
      };
    }
  }, [mapRef, 
      mapShapeType, 
      addToMapOverlayArrayOnMap,
      setSaveButtonInDrawingBarEnabled, 
      setOverlayModalMode, 
      setSelectedMarker,
      addToOverlayArrayOnMap]);

  return null;
};

export default MapDrawingManager;