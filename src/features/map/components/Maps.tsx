import React, { useState, useRef, useEffect, useCallback } from "react";
import { Map, useMap } from "@vis.gl/react-google-maps";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMap, faTreeCity } from "@fortawesome/free-solid-svg-icons";
import { MAP_CENTER, } from "@/features/map/utils/constants";
import MapDrawingController from "@/features/map/utils/MapDrawingController";
import MapTools from "@/features/map/components/MapTools";
import OverlayModal from "@/features/map/components/OverlayModal";
import { MapToolMode, OverlayModalMode } from "@/features/map/models/MapEnum";
import MarkerOverlayModal from "@/features/map/components/MarkerOverlayModal";
import { useOverlayManager } from "@/features/map/hooks/useOverlayManager";
import { useMapInitialization } from "@/features/map/hooks/useMapInitialization";
import { handleLayerSwitch } from "@/features/map/utils/mapEventHandlers";
import { calculateOverlayBounds } from "@/features/map/utils/mapUtils";
import { readGoogleMapCredentials } from "@/features/map/utils/mapCredentials";
import { eventEmitter } from "@/utils/eventEmitter";

import {
    useHandleSelectedPlace,
    useHandleOverlayToggling,
    useHandleClickedOverlay,
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
}> = ({ mapType, setMapType }) => {
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

            <MapDrawingController />
        </>
    );
};

/**
 * How long the map may stay without a single rendered tile before the
 * "still loading" notice appears.
 *
 * A vector map fetches its renderer and its style from Google before the
 * first tile is drawn, so the first tile can take a while. This is only the
 * point where the app stops waiting silently and tells the user that
 * something is happening.
 */
const MAP_LOADING_HINT_MS = 8000;

/**
 * How long the map may stay empty before the notice turns into a "this did
 * not work" message with a way out.
 */
const MAP_STALLED_MS = 20000;

const Maps: React.FC = () => {
    const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
    // Read the map ID synchronously, during the first render. The map is
    // created by <Map> as soon as it mounts, so a map ID that arrives later
    // would only be applied after the map was built without one - and Google
    // then refuses to render advanced markers on it.
    const [googleMapId] = useState(() => readGoogleMapCredentials().mapId);

    /**
     * True until the map has drawn its first tile.
     *
     * The map surface is an empty grey box while Google is still fetching the
     * renderer and the map style, and a visitor cannot tell that apart from a
     * broken map. The notice below the tools makes the difference visible.
     */
    const [hasRenderedTiles, setHasRenderedTiles] = useState(false);
    /** True once the map has been waiting longer than the notice threshold. */
    const [isLoadingSlowly, setIsLoadingSlowly] = useState(false);
    /** True once the map has been empty long enough to count as stalled. */
    const [hasStalled, setHasStalled] = useState(false);

    const { isMarkerCustomizeModalOpen } = useMapStore();
    const { placeMapOverlay } = usePlaceStore();
    const { overlayModalMode } = useOverlayStore();
    const { modalInfo, setModalInfo } = useModalStore();

    const handleTilesLoaded = useCallback(() => {
        setHasRenderedTiles(true);
        setIsLoadingSlowly(false);
        setHasStalled(false);
    }, []);

    // The notice only appears if the map is still waiting after the
    // threshold. A map that is ready never shows it.
    useEffect(() => {
        if (hasRenderedTiles) {
            return;
        }
        const timer = setTimeout(() => setIsLoadingSlowly(true), MAP_LOADING_HINT_MS);
        return () => clearTimeout(timer);
    }, [hasRenderedTiles]);

    // A map that stays empty this long is not coming back on its own: the
    // browser may have dropped the request for the map renderer. Reloading
    // the page is the only reliable way to start over.
    useEffect(() => {
        if (hasRenderedTiles) {
            return;
        }
        const timer = setTimeout(() => setHasStalled(true), MAP_STALLED_MS);
        return () => clearTimeout(timer);
    }, [hasRenderedTiles]);

    /** Start the map over. */
    const handleReloadMap = useCallback(() => {
        window.location.reload();
    }, []);

    return (
        <>
            <div className="relative h-full w-full">
                {/*
                    The camera is set with `defaultCenter` / `defaultZoom`,
                    NOT with `center` / `zoom`.

                    `center` and `zoom` are *controlled* props: the library
                    re-applies them on every render of the <Map> component and
                    snaps the camera back whenever the live map differs from
                    the props (see `use-map-camera-params.ts`). That silently
                    undid every programmatic camera move the app makes - the
                    search result's `panTo` + `setZoom(15)`, and the overlay
                    code's `fitBounds` - so a search resolved the address but
                    the map never moved and no marker was shown.
                */}
                <Map
                    mapId={googleMapId || undefined}
                    defaultCenter={MAP_CENTER}
                    defaultZoom={12}
                    mapTypeId={mapType}
                    disableDefaultUI={true}
                    clickableIcons={false}
                    disableDoubleClickZoom={true}
                    onTilesLoaded={handleTilesLoaded}
                >
                    <MapInner
                        mapType={mapType}
                        setMapType={setMapType}
                    />
                </Map>

                {/*
                    The search box and the tool bar sit *outside* the <Map>
                    subtree on purpose. Inside it they share the library's
                    z-index:0 wrapper, so their own z-index cannot lift the
                    suggestion list above the map's own layers (which reach
                    z-index 1000002 on a vector map). Out here they are
                    siblings of the map, and the list paints over it.
                */}
                <MapTools />

                {/*
                    The map is still fetching its renderer and style. Show
                    that, instead of leaving an empty grey box that looks
                    broken.
                */}
                {!hasRenderedTiles && isLoadingSlowly && !hasStalled && (
                    <div className="absolute bottom-2 left-1/2 z-30 -translate-x-1/2 rounded bg-gray-900 px-3 py-1 text-xs text-orange-300 shadow">
                        Loading the map…
                    </div>
                )}

                {/*
                    The map stayed empty. The browser can drop the request for
                    Google's map renderer, and only a fresh page load starts
                    that request again - so offer exactly that.
                */}
                {!hasRenderedTiles && hasStalled && (
                    <div className="absolute bottom-2 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded bg-gray-900 px-3 py-1 text-xs text-orange-300 shadow">
                        <span>The map didn&apos;t load.</span>
                        <button
                            onClick={handleReloadMap}
                            className="rounded border border-orange-400 px-2 py-0.5 text-orange-400 hover:bg-orange-400 hover:text-gray-900"
                        >
                            Try again
                        </button>
                    </div>
                )}
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
