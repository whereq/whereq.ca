import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import { MapOverlay } from "@/features/map/types/types";
import { usePlaceStore, useMapStore, useOverlayStore } from "@/features/map/store/mapStore";
import { useExistingMap } from "@/features/map/hooks/useMap";
import { eventEmitter } from "@/utils/eventEmitter";
import { EVENT } from "@/utils/constants";
import { ENTRY_LIMITS } from "@/features/map/utils/constants";

export const MyMapSection = () => {
    const {
        existingMap,
        setExistingMap,
        clearAllMapOverlays,
        deleteMapOverlay,
    } = useMapStore();

    const { toggleOverlayVisibility, 
            clearOverlayArrayOnMap,
            deleteOverlayOnMap } = useOverlayStore();

    const { placeMapOverlay } = usePlaceStore();

    useExistingMap(setExistingMap);

    const clearOverlayArray = () => {
        clearOverlayArrayOnMap();
        clearAllMapOverlays();
    };

    const handleOverlayClick = (overlay: MapOverlay) => {
        if (placeMapOverlay?.id === overlay.id) {
            // Toggle visibility if the same overlay is clicked again
            toggleOverlayVisibility();
        } else {
            // setClickedOverlay(overlay);
            eventEmitter.emit(EVENT.MAP_WORKSPACE_MY_MAP_CLICK, 
                { clickedOverlay: overlay });
        }
    };

    return (
        <div className="maps-my-map flex flex-col border-b border-gray-700">
            {/* Section Header */}
            <div className="flex justify-between items-center p-2 bg-gray-800">
                <h3 className="text-sm font-semibold">My Map</h3>
                <button
                    onClick={clearOverlayArray}
                    className="text-sm text-red-500 hover:text-red-700"
                    title="Clear Local Map"
                >
                    <FontAwesomeIcon icon={faTrashAlt} />
                </button>
            </div>

            {/* My Map Overlays List */}
            <div className="flex flex-col overflow-y-auto text-left">
                {existingMap?.overlayArray.map((overlay) => (
                    <div
                        key={overlay.id}
                        className="relative group p-2 text-sm truncate hover:bg-gray-700 cursor-pointer"
                        title={overlay.title}
                        onClick={() => handleOverlayClick(overlay)}
                    >
                        {overlay.title && overlay.title.length > 
                            ENTRY_LIMITS.MAX_TITLE_LENGTH_SMALL ? 
                            `${overlay.title.substring(0, ENTRY_LIMITS.MAX_TITLE_LENGTH_SMALL)}...` : overlay.title || ''}
                        <div className="absolute top-2 right-2 flex gap-2">
                            <button
                                className="text-orange-400 hover:text-blue-500"
                            >
                                <FontAwesomeIcon icon={faCopy} />
                            </button>
                            <button
                                className="text-orange-400 hover:text-red-500"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteOverlayOnMap(overlay.id);
                                    deleteMapOverlay(overlay.id);
                                }}
                            >
                                <FontAwesomeIcon icon={faTrashAlt} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};