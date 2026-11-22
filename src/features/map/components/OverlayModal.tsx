import React, { useState } from "react";
import { Map, MapOverlay } from "@/features/map/types/types";
import { MapToolMode, OverlayModalMode } from "@/features/map/models/MapEnum";
import LocalStorageHelper from "@/utils/localStorageHelper";
import { v4 as uuidv4 } from 'uuid';
import { LOCAL_STORAGE_KEYS } from "@/utils/constants";
import { loadMapObjectFromLocalStorage } from "@/features/map/utils/mapUtils";
import { groupSelectedOverlays } from "@/features/map/utils/mapShapeActions";

import { useMapStore, useMapToolStore, useOverlayStore } from "@/features/map/store/mapStore";

/**
 * The dialog that names a group of shapes or saves the drawing.
 *
 * It used to open the same "Save Overlays" form for every action — the
 * delete button and the capture button included, which is why pressing
 * them produced a dialog about saving. There are only two dialogs now:
 * one for naming a group, one for saving the drawing.
 */
const OverlayModal: React.FC = () => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const { setMapToolMode } = useMapToolStore();
    const { setExistingMap } = useMapStore();

    const {
        overlayModalMode,
        mapOverlayArrayOnMap,
        setMapOverlayArrayOnMap,
        setOverlayModalMode,
        setSaveButtonInMapToolEnabled,
        setToolNotice,
    } = useOverlayStore();

    /**
     * Put the selected shapes into a group under the given name.
     *
     * The shapes stay on the map exactly as they were — a group is a
     * container in the app's own model, not a new shape.
     */
    const handleGroup = (trimmedTitle: string, trimmedDescription: string) => {
        const group = groupSelectedOverlays(trimmedTitle, trimmedDescription);

        if (!group) {
            setToolNotice("Select two or more shapes to group them - hold shift to pick more than one.");
            return;
        }

        setToolNotice(
            `Grouped ${group.children?.length ?? 0} shapes as "${trimmedTitle}".`
        );
        setOverlayModalMode(null);
    };

    /**
     * Save the drawing into "My Map", under the given name.
     *
     * One shape is saved as itself; several are saved as one entry that
     * holds them together, which is how the saved map already knows how
     * to draw a group.
     */
    const handleSave = (trimmedTitle: string, trimmedDescription: string) => {
        const existingMap: Map = loadMapObjectFromLocalStorage();

        if (!mapOverlayArrayOnMap || mapOverlayArrayOnMap.length === 0) {
            setToolNotice("There is nothing to save yet.");
            setOverlayModalMode(null);
            return;
        }

        if (mapOverlayArrayOnMap.length === 1) {
            // If there is only one overlay, update its title and description
            const singleOverlay: MapOverlay = {
                ...mapOverlayArrayOnMap[0],
                title: trimmedTitle,
                description: trimmedDescription,
            };

            // The shape on the map carries the name too.
            setMapOverlayArrayOnMap(
                mapOverlayArrayOnMap.map((overlay) =>
                    overlay.id === singleOverlay.id ? singleOverlay : overlay
                )
            );

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
                title: trimmedTitle,
                description: trimmedDescription,
                children: mapOverlayArrayOnMap, // Assign the overlays as children
            };

            existingMap.overlayArray.push(parentOverlay);
        }

        // Save the updated Map object to local storage
        LocalStorageHelper.save(LOCAL_STORAGE_KEYS.MAP, existingMap);
        // And let "My Map" know that it has something new to show.
        setExistingMap(existingMap);

        setSaveButtonInMapToolEnabled(false);
        setMapToolMode(MapToolMode.Hand);
        setToolNotice(`Saved "${trimmedTitle}" to My Map.`);
        setOverlayModalMode(null);
    };

    const handleClose = () => {
        setOverlayModalMode(null);
    };

    if (!overlayModalMode) return null;

    const isGroupMode = overlayModalMode === OverlayModalMode.Group;

    const handleSubmit = () => {
        const trimmedTitle = title.trim();

        if (!trimmedTitle) {
            setToolNotice(isGroupMode ? "Give the group a name." : "Give the drawing a name.");
            return;
        }

        const trimmedDescription = description.trim();

        if (isGroupMode) {
            handleGroup(trimmedTitle, trimmedDescription);
            return;
        }

        handleSave(trimmedTitle, trimmedDescription);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-96 text-left">
                <h2 className="text-xl font-bold mb-4 text-orange-500">
                    {isGroupMode ? "Group Selected Overlays" : "Save Overlays"}
                </h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300">
                            {isGroupMode ? "Group name" : "Name"}
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="mt-1 p-2 w-full bg-gray-700 text-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder={isGroupMode ? "Enter group name" : "Enter title"}
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
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                    >
                        {isGroupMode ? "Group" : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OverlayModal;
