import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import { useEffect, useState } from "react";
import { MapOverlay } from "@/features/map/types/types";
import LocalStorageHelper from "@/utils/localStorageHelper";
import { ENTRY_LIMITS, MAP_LOCAL_STORAGE_KEYS } from "@/features/map/utils/constants";
import { handleCopy } from "@/utils/utils";
import { usePlaceStore } from "@/features/map/store/mapStore";

export const RecentSearchesSection = () => {
    const [recentSearches, setRecentSearches] = useState<MapOverlay[]>([]);
    const { setPlaceMapOverlay } = usePlaceStore();

    // Load My Places from local storage when the component mounts
    useEffect(() => {
        const loadedSearches: MapOverlay[] = LocalStorageHelper.load(MAP_LOCAL_STORAGE_KEYS.RECENT_SEARCHES) || [];
        setRecentSearches(loadedSearches);
    }, []);

    // Clear all recent searches from local storage
    const clearRecentSearches = () => {
        LocalStorageHelper.save(MAP_LOCAL_STORAGE_KEYS.RECENT_SEARCHES, []);
        setRecentSearches([]);
    };

        // Handle deleting a place from recent searches
    const handleDelete = (placeId: string) => {
        const updatedSearches = recentSearches.filter((place) => place.place_id !== placeId);
        LocalStorageHelper.save(MAP_LOCAL_STORAGE_KEYS.RECENT_SEARCHES, updatedSearches);
        setRecentSearches(updatedSearches);
    };

    return (
        <div className="maps-recent-searches flex flex-col border-b border-gray-700 h-full">
            {/* Section Header */}
            <div className="flex justify-between items-center p-2 bg-gray-800">
                <h3 className="text-sm font-semibold text-orange-300">Recent Searches</h3>
                <button
                    onClick={clearRecentSearches}
                    className="text-sm text-red-500 hover:text-red-700"
                    title="Clear All Recent Searches"
                >
                    <FontAwesomeIcon icon={faTrashAlt} />
                </button>
            </div>

            {/* Recent Searches List */}
            <div className="flex-1 overflow-y-auto">
                {recentSearches.map((place) => (
                    place.title && (
                        <div
                            key={place.place_id}
                            className="relative group p-2 text-sm text-left truncate hover:bg-gray-700 cursor-pointer border-b border-gray-600"
                            title={place.title}
                            onClick={() => setPlaceMapOverlay(place)}
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
                                        handleDelete(place.id);
                                    }}
                                >
                                    <FontAwesomeIcon icon={faTrashAlt} />
                                </button>
                            </div>
                        </div>
                    )
                ))}
            </div>
        </div>
    );
};