import React, { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faRuler,
    faHand,
    faLocationDot,
    faBezierCurve,
    faDrawPolygon,
    faCircle,
    faSquare,
    faObjectGroup,
    faObjectUngroup,
    faRemove,
    faSave,
    faCamera,
} from "@fortawesome/free-solid-svg-icons";
import { usePlaceStore, useMapToolStore, useOverlayStore } from "@/features/map/store/mapStore";
import { handleSearch } from "@/features/map/utils/mapHandlers";
import { MapOverlayType, MapToolMode, OverlayModalMode } from "@/features/map/models/MapEnum";
import {
    createMapOverlayFromResolvedPlace,
    mapOverlayToShape,
    saveSearchToLocalStorage,
} from "@/features/map/utils/mapUtils";
import MapSearchBox from "@/features/map/components/MapSearchBox";
import type { ResolvedMapPlace } from "@/features/map/hooks/useMapSearch";


const MapTools : React.FC = () => {
    /** Short notice under the toolbar (e.g. "no match found"). */
    const [searchNotice, setSearchNotice] = useState<string | null>(null);

    const { placeMapOverlay, setPlaceMapOverlay } = usePlaceStore();
    const { mapToolMode, setMapToolMode } = useMapToolStore();
    const { 
        activeTool, 
        setActiveTool, 
        setMapShapeType,
        setOverlayModalMode, 
        saveButtonInMapToolEnabled, 
        addToMapOverlayArrayOnMap,
        setClickedOverlay,
        drawingUnavailable,
    } = useOverlayStore();

    /**
     * A place was picked from the suggestion list: turn it into an overlay so
     * the map drops a marker, pans there and stores it in the recent searches.
     */
    const handlePlaceSelected = useCallback((place: ResolvedMapPlace) => {
        const overlay = createMapOverlayFromResolvedPlace(place);
        setPlaceMapOverlay(overlay);
        setClickedOverlay(null);
        saveSearchToLocalStorage(overlay);
        setSearchNotice(null);
    }, [setPlaceMapOverlay, setClickedOverlay]);

    /**
     * Free text that matched no suggestion: geocode it.
     */
    const handleSearchText = useCallback(async (text: string) => {
        const result = await handleSearch({
            searchText: text,
            setPlaceMapOverlay,
            setClickedOverlay,
        });
        setSearchNotice(result ? null : "No match found for that search.");
    }, [setPlaceMapOverlay, setClickedOverlay]);

    // Handle placeSearchResult changes
    useEffect(() => {
        if (placeMapOverlay) {
            addToMapOverlayArrayOnMap(placeMapOverlay);
        } 
    }, [placeMapOverlay, addToMapOverlayArrayOnMap]);

    const handleToolClick = (tool: string) => {
        setActiveTool((prev) => (prev === tool ? null : tool));
    };

    useEffect(() => {
        if (mapToolMode === MapToolMode.Hand) {
            setActiveTool(null);
            setMapShapeType(null);
        } 
    }, [mapToolMode, setActiveTool, setMapShapeType]);

    const handleDrawingOptionClick = (option: MapOverlayType) => {
        setActiveTool(option);
        setMapToolMode(MapToolMode.Draw);
        setMapShapeType(mapOverlayToShape(option)); // Update mapShapeType in the store
    };

    const handleMapToolMode = (action: MapToolMode) => {
        if (action === MapToolMode.Hand) {
            setMapToolMode(action);
            setActiveTool(null); // Deselect any selected option
            setMapShapeType(null); // Reset mapShapeType
        } else {
            // Do nothing if the action is not Hand
        }
    };

    return (
        <div className="absolute top-0 left-0 flex flex-col items-start 
                        space-y-1 bg-gray-900 text-orange-500 p-1">
            <div className="flex items-center space-x-1">
                <MapSearchBox
                    showSearchButton
                    onSelectPlace={handlePlaceSelected}
                    onSubmitText={handleSearchText}
                />
            </div>
            <div className="flex space-x-1 text-sm bg-gray-800 p-1">
                <button
                    className={`p-1 ${mapToolMode === MapToolMode.Hand ? "bg-orange-500 text-white" : "bg-gray-700"
                        } hover:bg-gray-600`}
                    onClick={() => handleMapToolMode(MapToolMode.Hand)}
                >
                    <FontAwesomeIcon icon={faHand} title="Hand Mode" />
                </button>
                {[
                    { option: MapOverlayType.Marker, icon: faLocationDot, label: "Marker" },
                    { option: MapOverlayType.Polyline, icon: faBezierCurve, label: "Polyline" },
                    { option: MapOverlayType.Polygon, icon: faDrawPolygon, label: "Polygon" },
                    { option: MapOverlayType.Circle, icon: faCircle, label: "Circle" },
                    { option: MapOverlayType.Rectangle, icon: faSquare, label: "Rectangle" },
                ].map(({ option, icon, label }) => (
                    <button
                        key={option}
                        disabled={drawingUnavailable}
                        className={`p-1 rounded ${activeTool === option ? "bg-orange-500 text-white" : "bg-gray-700"
                            } ${drawingUnavailable ? "cursor-not-allowed opacity-50" : "hover:bg-gray-600"}`}
                        onClick={() => handleDrawingOptionClick(option)}
                    >
                        <FontAwesomeIcon icon={icon} title={label} />
                    </button>
                ))}
                {[
                    { tool: "ruler", icon: faRuler },
                ].map(({ tool, icon }) => (
                    <button
                        disabled={true}
                        key={tool}
                        className={`p-1 bg-gray-500 cursor-not-allowed opacity-50`}
                        onClick={() => handleToolClick(tool)}
                    >
                        <FontAwesomeIcon icon={icon} />
                    </button>))
                }
                <button
                    disabled={!saveButtonInMapToolEnabled}
                    className={`p-1 ${saveButtonInMapToolEnabled?
                        "bg-gray-700 hover:bg-gray-600" :
                        "bg-gray-500 cursor-not-allowed opacity-50"
                        }`}
                    onClick={() => {
                        setOverlayModalMode(OverlayModalMode.Group)
                    }}
                >
                    <FontAwesomeIcon icon={faObjectGroup} title="Group" />
                </button>
                <button
                    disabled={!saveButtonInMapToolEnabled}
                    className={`p-1 ${saveButtonInMapToolEnabled?
                        "bg-gray-700 hover:bg-gray-600" :
                        "bg-gray-500 cursor-not-allowed opacity-50"
                        }`}
                    onClick={() => setOverlayModalMode(OverlayModalMode.Ungroup)}
                >
                    <FontAwesomeIcon icon={faObjectUngroup} title="Ungroup" />
                </button>
                <button
                    disabled={!saveButtonInMapToolEnabled}
                    className={`p-1 ${saveButtonInMapToolEnabled?
                            "bg-gray-700 hover:bg-gray-600" :
                            "bg-gray-500 cursor-not-allowed opacity-50"
                        }`}
                    onClick={() => setOverlayModalMode(OverlayModalMode.Save)}
                >
                    <FontAwesomeIcon icon={faRemove} title="Delete" />
                </button>
                <button
                    disabled={!saveButtonInMapToolEnabled}
                    className={`p-1 ${saveButtonInMapToolEnabled?
                        "bg-gray-700 hover:bg-gray-600" :
                        "bg-gray-500 cursor-not-allowed opacity-50"
                        }`}
                    onClick={() => setOverlayModalMode(OverlayModalMode.Save)}
                >
                    <FontAwesomeIcon icon={faSave} title="Save" />
                </button>
                <button
                    disabled={!saveButtonInMapToolEnabled}
                    className={`p-1 ${saveButtonInMapToolEnabled?
                        "bg-gray-700 hover:bg-gray-600" :
                        "bg-gray-500 cursor-not-allowed opacity-50"
                        }`}
                    onClick={() => setOverlayModalMode(OverlayModalMode.Save)}
                >
                    <FontAwesomeIcon icon={faCamera} title="Capture Map" />
                </button>
            </div>
            {drawingUnavailable && (
                <div className="bg-gray-900 text-orange-300 text-xs px-2 py-1 rounded shadow">
                    Drawing tools are unavailable right now. Try again in a moment.
                </div>
            )}
            {searchNotice && (
                <div className="bg-gray-900 text-orange-300 text-xs px-2 py-1 rounded shadow">
                    {searchNotice}
                </div>
            )}
        </div>
    );
};

export default MapTools;