import React, { useState, useRef, useEffect } from "react";
import { Map, useMap } from "@vis.gl/react-google-maps";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMap, faTreeCity } from "@fortawesome/free-solid-svg-icons";
import { MAP_CENTER, } from "@/features/map/utils/constants";
import MapDrawingManager from "@/features/map/utils/MapDrawingManager";
import MapTools from "@/features/map/components/MapTools";
import OverlayModal from "@/features/map/components/OverlayModal";
import { MapToolMode, OverlayModalMode } from "@/features/map/models/MapEnum";
import MarkerOverlayModal from "@/features/map/components/MarkerOverlayModal";
import { useOverlayManager } from "@/features/map/hooks/useOverlayManager";
import { useMapInitialization } from "@/features/map/hooks/useMapInitialization";
import { handleLayerSwitch } from "@/features/map/utils/mapEventHandlers";
import { calculateOverlayBounds } from "@/features/map/utils/mapUtils";
import { eventEmitter } from "@/utils/eventEmitter";

import {
    useHandleSelectedPlace,
    useHandleOverlayToggling,
    useHandleClickedOverlay,
    useLoadGoogleMapId,
    useHandleAdvancedMarker
} from "@/features/map/hooks/useMap";
import { useMapStore, usePlaceStore, useMapToolStore, useOverlayStore } from "@/features/map/store/mapStore";
import { useModalStore } from "@/store/store";
import CustomModal from "@/components/modals/CustomModal";
import { EVENT } from "@/utils/constants";
import { MapOverlay } from "@/features/map/types/types";

/**
 * Inner component that lives inside <Map> and can therefore call useMap()
 * to get a handle to the live google.maps.Map instance. All the legacy
 * hooks take this map instance directly (instead of a RefObject), so we
 * pass it down via prop-drilling here.
 */
const MapInner: React.FC<{
    mapType: "roadmap" | "satellite";
    setMapType: (t: "roadmap" | "satellite") => void;
    setGoogleMapId: (id: string) => void;
}> = ({ mapType, setMapType, setGoogleMapId }) => {
    const map = useMap();
    const mapRef = useRef<google.maps.Map | null>(null);

    useEffect(() => {
        mapRef.current = map ?? null;
    }, [map]);

    const { drawOverlays } = useOverlayManager(mapRef);
    const { setMapToolMode } = useMapToolStore();
    const {
        clearOverlayArrayOnMap, clearMapOverlayArrayOnMap,
        saveButtonInMapToolEnabled: saveButtonInDrawingBarEnabled,
        setClickedOverlay,
        setSaveButtonInMapToolEnabled: setSaveButtonInDrawingBarEnabled,
        overlayArrayOnMap
    } = useOverlayStore();
    const { setModalInfo } = useModalStore();

    useMapInitialization();

    useHandleSelectedPlace(mapRef);
    useHandleOverlayToggling(mapRef, drawOverlays, clearOverlayArrayOnMap, clearMapOverlayArrayOnMap);
    useHandleClickedOverlay(mapRef, drawOverlays, clearOverlayArrayOnMap, clearMapOverlayArrayOnMap);
    useLoadGoogleMapId(setGoogleMapId);
    useHandleAdvancedMarker(mapRef);

    // Listen for the workspace item click event
    useEffect(() => {
        const handleWorkspaceItemClick = ({ clickedOverlay }: { clickedOverlay: MapOverlay }) => {
            if (saveButtonInDrawingBarEnabled) {
                setModalInfo({
                    isOpen: true,
                    title: "Unsaved Changes",
                    message: "You have unsaved changes. Do you want to continue?",
                    isConfirmDialog: true,
                    confirmAction: () => {
                        clearOverlayArrayOnMap();
                        clearMapOverlayArrayOnMap();
                        setClickedOverlay(clickedOverlay);
                        setMapToolMode(MapToolMode.Hand);
                        setSaveButtonInDrawingBarEnabled(false);
                        setModalInfo({ isOpen: false, message: "" });
                    },
                    cancelAction: () => {
                        if (overlayArrayOnMap && overlayArrayOnMap.length > 0) {
                            const bounds = calculateOverlayBounds(overlayArrayOnMap);
                            if (mapRef.current && !bounds.isEmpty()) {
                                mapRef.current.fitBounds(bounds);
                            }
                        }
                        setModalInfo({ isOpen: false, message: "" });
                    },
                });
            } else {
                clearOverlayArrayOnMap();
                clearMapOverlayArrayOnMap();
                setClickedOverlay(clickedOverlay);
            }
        };

        eventEmitter.on<{ clickedOverlay: MapOverlay }>(EVENT.MAP_WORKSPACE_MY_MAP_CLICK, handleWorkspaceItemClick);

        return () => {
            eventEmitter.off(EVENT.MAP_WORKSPACE_MY_MAP_CLICK, handleWorkspaceItemClick);
        };
    }, [
        clearOverlayArrayOnMap,
        clearMapOverlayArrayOnMap,
        overlayArrayOnMap,
        setModalInfo,
        setClickedOverlay,
        setMapToolMode,
        saveButtonInDrawingBarEnabled,
        setSaveButtonInDrawingBarEnabled,
    ]);

    if (!map) {
        // <Map> not yet ready; nothing to render inside it
        return null;
    }

    return (
        <>
            <button
                onClick={() => handleLayerSwitch(mapRef, mapType, setMapType)}
                className="absolute left-2 bottom-2 bg-gray-800 text-orange-500 p-1 text-sm rounded shadow hover:bg-gray-700 flex items-center z-10"
                title={mapType === "roadmap" ? "Switch to Satellite View" : "Switch to Roadmap View"}
            >
                <FontAwesomeIcon icon={mapType === "roadmap" ? faTreeCity : faMap} />
            </button>

            <MapTools />
            <MapDrawingManager mapRef={mapRef} />
        </>
    );
};

const Maps: React.FC = () => {
    const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
    const [googleMapId, setGoogleMapId] = useState<string>("");

    const { isMarkerCustomizeModalOpen } = useMapStore();
    const { placeMapOverlay } = usePlaceStore();
    const { overlayModalMode } = useOverlayStore();
    const { modalInfo, setModalInfo } = useModalStore();

    return (
        <>
            <div className="relative h-full w-full">
                <Map
                    mapId={googleMapId}
                    center={MAP_CENTER}
                    zoom={12}
                    mapTypeId={mapType}
                    disableDefaultUI={true}
                    clickableIcons={false}
                    disableDoubleClickZoom={true}
                    defaultZoom={12}
                >
                    <MapInner
                        mapType={mapType}
                        setMapType={setMapType}
                        setGoogleMapId={setGoogleMapId}
                    />
                </Map>
            </div>

            {isMarkerCustomizeModalOpen && (placeMapOverlay) && (
                <MarkerOverlayModal />
            )}

            {(overlayModalMode === OverlayModalMode.Group ||
                overlayModalMode === OverlayModalMode.Ungroup ||
                overlayModalMode === OverlayModalMode.Save) && <OverlayModal />}

            <CustomModal
                isOpen={modalInfo.isOpen}
                onRequestClose={() => setModalInfo({ isOpen: false, message: "" })}
                title={modalInfo.title}
                message={modalInfo.message}
                confirmAction={modalInfo.confirmAction}
                cancelAction={modalInfo.cancelAction}
                isConfirmDialog={modalInfo.isConfirmDialog}
            />
        </>
    );
};

export default Maps;
