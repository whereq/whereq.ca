import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { mapOverlayToShape } from "@/features/map/utils/mapUtils";
import logUtil from "@/utils/logUtil";
import { useMapSearch } from "@/features/map/hooks/useMapSearch"; // Import the custom hook


const MapTools : React.FC = () => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [searchText, setSearchText] = useState("");
    const autoCompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

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
    } = useOverlayStore();

    // Memoize the callback to avoid unnecessary re-renders
    const handlePlaceSelected = useCallback((address: string) => {
        setSearchText(address);
    }, []);

    // Use the custom hook for handling autocomplete and place selection
    useMapSearch(inputRef, handlePlaceSelected);

    // Handle search logic
    const _handleSearch = useCallback(() => {
        logUtil.log("Search triggered:", searchText);
        handleSearch({
            searchText,
            autoCompleteInstance: autoCompleteRef.current,
            setPlaceMapOverlay,
            setClickedOverlay,
        });
    }, [searchText, setPlaceMapOverlay, setClickedOverlay]);

    // Handle Enter key press
    const _handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            logUtil.log("Enter key pressed", searchText);
            handleSearch({
                searchText,
                autoCompleteInstance: autoCompleteRef.current,
                setPlaceMapOverlay,
                setClickedOverlay,
            });
        }
    };

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
                <input
                    id="mapSearch"
                    type="text"
                    placeholder="Search Google Maps"
                    className="bg-gray-800 text-orange-500 text-sm p-1 focus:outline-none w-64"
                    style={{ fontFamily: "Fira Code, monospace" }}
                    ref={inputRef}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={_handleKeyDown}
                />
                <button
                    onClick={_handleSearch}
                    className="bg-gray-700 p-1 text-sm hover:bg-gray-600"
                >
                    Search
                </button>
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
                        className={`p-1 rounded ${activeTool === option ? "bg-orange-500 text-white" : "bg-gray-700"
                            } hover:bg-gray-600`}
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
        </div>
    );
};

export default MapTools;