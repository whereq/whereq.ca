import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import { useMapStore, usePlaceStore } from "@/features/map/store/mapStore";
import { handleCopy } from "@/utils/utils";
import { useExistingMap } from "@/features/map/hooks/useMap";
import { ENTRY_LIMITS } from "@/features/map/utils/constants";

export const MyPlacesSection = () => {
    const {
        existingMap,
        setExistingMap,
        clearAllPlaces,
        deletePlace,
    } = useMapStore();

    const {
        setPlaceMapOverlay,
    } = usePlaceStore();

    useExistingMap(setExistingMap);

    return (
        <div className="maps-recent-searches flex flex-col border-b border-gray-700 h-full">
            {/* Section Header */}
            <div className="flex justify-between items-center p-2 bg-gray-800">
                <h3 className="text-sm font-semibold text-orange-300">Saved Places</h3>
                <button
                    onClick={clearAllPlaces}
                    className="text-sm text-red-500 hover:text-red-700"
                    title="Clear All My Saved Places"
                >
                    <FontAwesomeIcon icon={faTrashAlt} />
                </button>
            </div>

            {/* My Place List */}
            <div className="flex-1 overflow-y-auto">
                {existingMap?.placeArray.map((place) => (
                    <div
                        key={place.id}
                        className="relative group p-2 text-sm text-left truncate hover:bg-gray-700 cursor-pointer border-b border-gray-600"
                        title={place.title}
                        onClick={() => {
                            setPlaceMapOverlay(place)
                        }}
                    >
                        {place.title && place.title.length >
                            ENTRY_LIMITS.MAX_TITLE_LENGTH_SMALL ?
                            `${place.title.substring(0, ENTRY_LIMITS.MAX_TITLE_LENGTH_SMALL)}...` :
                            place.title || ''}

                        <div className="absolute top-2 right-2 flex gap-2">
                            <button
                                className="text-orange-400 hover:text-blue-500"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(place, "Place copied to clipboard");
                                }}
                            >
                                <FontAwesomeIcon icon={faCopy} />
                            </button>
                            <button
                                className="text-orange-400 hover:text-red-500"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deletePlace(place.id);
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