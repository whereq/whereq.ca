import React, { useState, useEffect } from "react";
import { useMapStore, useOverlayStore, usePlaceStore } from "@/features/map/store/mapStore";
import { v4 as uuidv4 } from 'uuid';
import { MarkerIconType, MarkerAction } from "@/features/map/models/MapEnum";
import { updateMarkerIcon } from "@/features/map/utils/mapHandlers";
import { MapOverlay } from "@/features/map/types/types";
import { ENTRY_LIMITS } from "@/features/map/utils/constants";

const MarkerOverlayModal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MarkerAction>(MarkerAction.CUSTOMIZE);
  const [iconType, setIconType] = useState<MarkerIconType>(MarkerIconType.Default);
  const [iconContent, setIconContent] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isTitleInvalid, setIsTitleInvalid] = useState(false);
  const [iconWidthPercent, setIconWidthPercent] = useState(100); // Default to 100% width
  const [iconHeightPercent, setIconHeightPercent] = useState(100); // Default to 100% height

  const { placeMapOverlay, setPlaceMapOverlay } = usePlaceStore();
  const { showMarkerCustomizeModal, updateExistingMapPlace, updateExistingMapOverlayArray } = useMapStore();
  const { selectedMarker, setSelectedMarker, addToMapOverlayArrayOnMap } = useOverlayStore();

  // Load existing values from selectedMarker and 
  // existingMap.placeArray when the component mounts or selectedMarker changes
  useEffect(() => {
    if (selectedMarker) {
      // Load title and description from existingMap.placeArray if available
      if (placeMapOverlay) {
        setTitle(placeMapOverlay.title || "");
        setDescription(placeMapOverlay.description || "");
        setIconType(placeMapOverlay.icon?.type || MarkerIconType.Default);
        setIconContent(placeMapOverlay.icon?.content || "");
        setIconWidthPercent(placeMapOverlay.icon?.widthPercent || 100);
        setIconHeightPercent(placeMapOverlay.icon?.heightPercent || 100);
      } else {
        // If no existing place is found, reset title and description
        setTitle("");
        setDescription("");
        setIconType(MarkerIconType.Default);
        setIconContent("");
        setIconWidthPercent(100);
        setIconHeightPercent(100);
      }
    }
  }, [placeMapOverlay, selectedMarker]);

  const handleSave = () => {
    if (activeTab === MarkerAction.SAVE && !title.trim()) {
      // If title is empty, mark it as invalid and block saving
      setIsTitleInvalid(true);
      return;
    }

    if (selectedMarker) {
      selectedMarker.icon = { type: iconType, content: iconContent };
      if (iconType === MarkerIconType.Url) {
        selectedMarker.icon.widthPercent = iconWidthPercent;
        selectedMarker.icon.heightPercent = iconHeightPercent;
      }
      updateMarkerIcon(selectedMarker.advancedMarker, selectedMarker.icon);

      // Update the marker's data in the overlay array (if needed)
      const updatedMarker = {
        ...selectedMarker,
        icon: selectedMarker.icon,
      };
      setSelectedMarker(updatedMarker);

      const updatedPlaceMapOverlay: MapOverlay = {
        ...placeMapOverlay,
        title,
        description,
        icon: selectedMarker.icon,
        id: placeMapOverlay?.id || uuidv4(), // Ensure id is always a string
      }

      // Update the place in the existingMap using the store
      setPlaceMapOverlay(updatedPlaceMapOverlay);
      updateExistingMapPlace(updatedPlaceMapOverlay);
      updateExistingMapOverlayArray(updatedPlaceMapOverlay);
      addToMapOverlayArrayOnMap(updatedPlaceMapOverlay);
      showMarkerCustomizeModal(false);
    }
  };

  const handleClose = () => {
    showMarkerCustomizeModal(false);
  };

  const getPlaceholder = () => {
    switch (iconType) {
      case MarkerIconType.Text:
        return `Enter up to ${ENTRY_LIMITS.MAX_TITLE_LENGTH} characters`;
      case MarkerIconType.Url:
        return "Enter icon URL";
      default:
        return "";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 bg-opacity-50 p-6 rounded-lg shadow-lg w-96 text-left min-h-[400px] flex flex-col">
        {/* Tab Navigation */}
        <div className="flex space-x-4 mb-4 border-b border-gray-600">
          <button
            onClick={() => setActiveTab(MarkerAction.CUSTOMIZE)}
            className={`pb-2 focus:outline-none ${activeTab === MarkerAction.CUSTOMIZE
                ? "border-b-2 border-orange-500 text-orange-500"
                : "text-gray-300"
              }`}
          >
            Customize Your Marker
          </button>
          <button
            onClick={() => setActiveTab(MarkerAction.SAVE)}
            className={`pb-2 focus:outline-none ${activeTab === MarkerAction.SAVE
                ? "border-b-2 border-orange-500 text-orange-500"
                : "text-gray-300"
              }`}
          >
            Save Your Search
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          {activeTab === MarkerAction.CUSTOMIZE && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Icon Type</label>
                <select
                  value={iconType}
                  onChange={(e) => {
                    setIconType(e.target.value as MarkerIconType);
                    setIconContent(""); // Reset icon value on type change
                  }}
                  className="mt-1 p-2 w-full bg-gray-700 bg-opacity-50 text-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value={MarkerIconType.Default}>Default</option>
                  <option value={MarkerIconType.Text}>Text</option>
                  <option value={MarkerIconType.Url}>URL</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Icon Content</label>
                <input
                  type="text"
                  value={iconContent}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (iconType === MarkerIconType.Text && value.length > ENTRY_LIMITS.MAX_TITLE_LENGTH) return;
                    setIconContent(value);
                  }}
                  className="mt-1 p-2 w-full bg-gray-700 bg-opacity-50 text-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder={getPlaceholder()}
                />
                {iconType === MarkerIconType.Url && (
                  <p className="text-sm text-yellow-500 mt-1">
                    Using external images carries risks. Proceed with caution.
                  </p>
                )}

                {/* Sliders for URL icon type */}
                {iconType === MarkerIconType.Url && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300">
                        Icon Width: {iconWidthPercent}%
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="200"
                        value={iconWidthPercent}
                        onChange={(e) => setIconWidthPercent(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300">
                        Icon Height: {iconHeightPercent}%
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="200"
                        value={iconHeightPercent}
                        onChange={(e) => setIconHeightPercent(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === MarkerAction.SAVE && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setIsTitleInvalid(false); // Reset invalid state on change
                  }}
                  className={`mt-1 p-2 w-full bg-gray-700 bg-opacity-50 text-gray-300 rounded focus:outline-none focus:ring-2 ${
                    isTitleInvalid ? "focus:ring-red-500 border-red-500" : "focus:ring-orange-500"
                  }`}
                  placeholder="Enter title"
                />
                {isTitleInvalid && (
                  <p className="text-sm text-red-500 mt-1">Title is required.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 p-2 w-full bg-gray-700 bg-opacity-50 text-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter description"
                />
              </div>
            </div>
          )}
        </div>

        {/* Shared Buttons */}
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

export default MarkerOverlayModal;