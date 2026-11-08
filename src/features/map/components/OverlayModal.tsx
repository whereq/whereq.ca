import React, { useState } from "react";
import { Map, MapOverlay } from "@/features/map/types/types";
import { MapToolMode, OverlayModalMode } from "@/features/map/models/MapEnum";
import LocalStorageHelper from "@/utils/localStorageHelper";
import { v4 as uuidv4 } from 'uuid';
import { LOCAL_STORAGE_KEYS } from "@/utils/constants";
import { loadMapObjectFromLocalStorage } from "@/features/map/utils/mapUtils";

import { useMapToolStore, useOverlayStore } from "@/features/map/store/mapStore";

const OverlayModal: React.FC = () => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const { setMapToolMode } = useMapToolStore();

    const { overlayModalMode, 
            mapOverlayArrayOnMap: overlayArray, 
            selectedOverlayArray, 
            setOverlayModalMode,
            setSaveButtonInMapToolEnabled } = useOverlayStore();

    const overlayArrayToUse = 
        overlayModalMode === OverlayModalMode.Group ? 
        selectedOverlayArray : 
        overlayArray;

    const handleSave = () => {
        const existingMap: Map = loadMapObjectFromLocalStorage();

        if (title.trim() && description.trim()) {
            if (!overlayArrayToUse || overlayArrayToUse.length === 0) {
                return; // Do nothing if there are no overlays to process
            }

            if (overlayArrayToUse.length === 1) {
                // If there is only one overlay, update its title and description
                const singleOverlay = overlayArrayToUse[0];
                singleOverlay.title = title;
                singleOverlay.description = description;

                // Check if the single overlay already exists in the overlayArray
                const existingOverlayIndex = existingMap.overlayArray.findIndex(
                    (overlay) => overlay.id === singleOverlay.id
                );

                if (existingOverlayIndex !== -1) {
                    // Replace the existing overlay
                    existingMap.overlayArray[existingOverlayIndex] = singleOverlay;
                } else {
                    // Add the new overlay to the overlayArray
                    existingMap.overlayArray.push(singleOverlay);
                }
            } else {
                // If there are multiple overlays, create a parent overlay
                const parentOverlay: MapOverlay = {
                    id: uuidv4(), // Generate a unique ID for the parent overlay
                    isParent: true,
                    title,
                    description,
                    children: overlayArrayToUse, // Assign the overlays as children
                };

                // Check if the parent overlay already exists in the overlayArray
                const existingOverlayIndex = 
                    existingMap.overlayArray.findIndex((overlay) => overlay.id === parentOverlay.id
                );

                if (existingOverlayIndex !== -1) {
                    // Replace the existing parent overlay
                    existingMap.overlayArray[existingOverlayIndex] = parentOverlay;
                } else {
                    // Add the new parent overlay to the overlayArray
                    existingMap.overlayArray.push(parentOverlay);
                }
            }

            // Save the updated Map object to local storage
            LocalStorageHelper.save(LOCAL_STORAGE_KEYS.MAP, existingMap);
            setSaveButtonInMapToolEnabled(false);
            setMapToolMode(MapToolMode.Hand);
        }
        setOverlayModalMode(null);
    };

    const handleClose = () => {
        setOverlayModalMode(null);
    }

    if (!overlayModalMode) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-96">
                <h2 className="text-xl font-bold mb-4 text-orange-500">
                    {overlayModalMode === OverlayModalMode.Group ? 
                        "Group Selected Overlays" : 
                        "Save Overlays"}
                </h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="mt-1 p-2 w-full bg-gray-700 text-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Enter title"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 p-2 w-full bg-gray-700 text-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Enter description"
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OverlayModal;