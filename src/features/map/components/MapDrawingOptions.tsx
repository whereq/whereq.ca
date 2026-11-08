/**
 * @file MapDrawingOptions.tsx
 * This is deprecated and will be removed in the future.
 * This component is responsible for rendering the drawing options on the map.
 * All of the features have been moved to the MapTools component.
 * 
 */
import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faHand,
    faShapes,
    faLocationDot,
    faBezierCurve,
    faDrawPolygon,
    faCircle,
    faSquare,
    faObjectGroup,
    faObjectUngroup,
    faSave,
} from "@fortawesome/free-solid-svg-icons";
import { MapOverlayType, OverlayModalMode } from "@/features/map/models/MapEnum";

import { useOverlayStore } from "@/features/map/store/mapStore";
import { mapOverlayToShape } from "@/features/map/utils/mapUtils";

const MapDrawingOptions: React.FC = () => {
    const { clearOverlayArrayOnMap, clearMapOverlayArrayOnMap } = useOverlayStore();
    const [drawingAction, setDrawingAction] = useState<string | null>(null);

    const { saveButtonInMapToolEnabled: saveButtonInDrawingBarEnabled, 
            drawingBarActive, 
            setDrawingBarActive, 
            activeTool, 
            setActiveTool, 
            setMapShapeType,
            setOverlayModalMode, 
            setMapOverlayArrayOnMap: setOverlayArray
        } = useOverlayStore();

    const toggleDrawingBar = () => {
        setDrawingBarActive(!drawingBarActive);
        if (drawingBarActive) {
            clearOverlayArrayOnMap();
            clearMapOverlayArrayOnMap();
            setOverlayArray([]);
        }
        setDrawingAction(drawingBarActive ? null : "handMode");
        setActiveTool(null);
    };

    const handleOptionClick = (option: MapOverlayType) => {
        setActiveTool(option);
        setDrawingAction(null);
        setMapShapeType(mapOverlayToShape(option)); // Update mapShapeType in the store
    };

    const handleDrawingAction = (action: string) => {
        if (action === "handMode") {
            setDrawingAction(action);
            setActiveTool(null); // Deselect any selected option
            setMapShapeType(null); // Reset mapShapeType
        } else {
            // Do nothing for now
        }
    };

    return (
        <div className="relative">
            <button
                className={`p-1 rounded shadow ${
                    drawingBarActive ? "bg-orange-500 text-white" : "bg-gray-700"
                } hover:bg-gray-600`}
                onClick={toggleDrawingBar}
            >
                <FontAwesomeIcon icon={faShapes} />
            </button>
            {drawingBarActive && (
                <div className="absolute top-full left-0 flex space-x-2 text-sm bg-gray-800 p-1 rounded shadow-lg mt-2">
                    {/* Add faHand button */}
                    <button
                        className={`p-1 rounded ${
                                drawingAction === "handMode" ? "bg-orange-500 text-white" : "bg-gray-700"
                            } hover:bg-gray-600`}
                        onClick={() => handleDrawingAction("handMode")}
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
                            className={`p-1 rounded ${
                                activeTool === option ? "bg-orange-500 text-white" : "bg-gray-700"
                            } hover:bg-gray-600`}
                            onClick={() => handleOptionClick(option)}
                        >
                            <FontAwesomeIcon icon={icon} title={label} />
                        </button>
                    ))}
                    <button
                        disabled={!saveButtonInDrawingBarEnabled}
                        className={`p-2 rounded ${saveButtonInDrawingBarEnabled? "bg-gray-700 hover:bg-gray-600" : "bg-gray-500 cursor-not-allowed opacity-50"
                            }`}
                        onClick={() => {
                            setOverlayModalMode(OverlayModalMode.Group)
                        }}
                    >
                        <FontAwesomeIcon icon={faObjectGroup} title="Group" />
                    </button>
                    <button
                        disabled={!saveButtonInDrawingBarEnabled}
                        className={`p-2 rounded ${saveButtonInDrawingBarEnabled? "bg-gray-700 hover:bg-gray-600" : "bg-gray-500 cursor-not-allowed opacity-50"
                            }`}
                        onClick={() => setOverlayModalMode(OverlayModalMode.Ungroup)}
                    >
                        <FontAwesomeIcon icon={faObjectUngroup} title="Ungroup" />
                    </button>
                    <button
                        disabled={!saveButtonInDrawingBarEnabled}
                        className={`p-2 rounded ${
                            saveButtonInDrawingBarEnabled? "bg-gray-700 hover:bg-gray-600" : "bg-gray-500 cursor-not-allowed opacity-50"
                        }`}
                        onClick={() => setOverlayModalMode(OverlayModalMode.Save)}
                    >
                        <FontAwesomeIcon icon={faSave} title="Save" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default MapDrawingOptions;