import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faDrawPolygon,
    faCheck,
    faCar,
    faBiking,
    faWalking,
} from "@fortawesome/free-solid-svg-icons";

interface MapDrawingOptionsProps {
    onSelectOption: (option: string) => void;
}

const MapDrawingOptions: React.FC<MapDrawingOptionsProps> = ({ onSelectOption }) => {
    const [mapDrawingOptionsVisible, setMapDrawingOptionsVisible] = useState(false);

    const toggleMapDrawingOptions = () => {
        setMapDrawingOptionsVisible((prev) => !prev);
    };

    const handleOptionClick = (option: string) => {
        onSelectOption(option);
        setMapDrawingOptionsVisible(false);
    };

    return (
        <div className="relative">
            <button
                className="bg-gray-700 p-1 rounded shadow hover:bg-gray-600"
                onClick={toggleMapDrawingOptions}
            >
                <FontAwesomeIcon icon={faDrawPolygon} />
            </button>
            {/* Dropdown */}
            {mapDrawingOptionsVisible && (
                <div
                    className="absolute mt-2 left-0 bg-gray-800 border border-gray-700 text-orange-500 rounded shadow-lg z-10"
                    style={{ fontFamily: "Fira Code, monospace", minWidth: "fit-content" }}
                >
                    <ul className="p-2 space-y-2">
                        <li
                            className="flex items-center p-2 hover:bg-gray-700 rounded cursor-pointer"
                            onClick={() => handleOptionClick("lineOrShape")}
                        >
                            <div className="flex items-center w-full">
                                <div className="w-3 flex justify-end">
                                    <FontAwesomeIcon icon={faCheck} />
                                </div>
                                <span className="ml-2 w-36 text-left">Add line or shape</span>
                            </div>
                        </li>
                        <li
                            className="flex items-center p-2 hover:bg-gray-700 rounded cursor-pointer"
                            onClick={() => handleOptionClick("drivingRoute")}
                        >
                            <div className="flex items-center w-full">
                                <div className="w-3 flex justify-end">
                                    <FontAwesomeIcon icon={faCar} />
                                </div>
                                <span className="ml-2">Add driving route</span>
                            </div>
                        </li>
                        <li
                            className="flex items-center p-2 hover:bg-gray-700 rounded cursor-pointer"
                            onClick={() => handleOptionClick("bikingRoute")}
                        >
                            <div className="flex items-center w-full">
                                <div className="w-3 flex justify-end">
                                    <FontAwesomeIcon icon={faBiking} />
                                </div>
                                <span className="ml-2">Add biking route</span>
                            </div>
                        </li>
                        <li
                            className="flex items-center p-2 hover:bg-gray-700 rounded cursor-pointer"
                            onClick={() => handleOptionClick("walkingRoute")}
                        >
                            <div className="flex items-center w-full">
                                <div className="w-3 flex justify-end">
                                    <FontAwesomeIcon icon={faWalking} />
                                </div>
                                <span className="ml-2">Add walking route</span>
                            </div>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default MapDrawingOptions;