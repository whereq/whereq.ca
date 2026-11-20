import React, { useState, useRef, useEffect } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faUndo,
    faRedo,
    faHandPointer,
    faMapMarkerAlt,
    faRuler,
    faMap,
    faTreeCity,
} from "@fortawesome/free-solid-svg-icons";
import { BASE_KEY } from "@/features/map-gl/utils/constants";
import { readGoogleMapCredentials } from "@/features/map/utils/mapCredentials";
import PlaceInfoModal from "@/features/map-gl/components/PlaceInfoModal";
import CustomModal from "@/components/modals/CustomModal"; // Import the CustomModal component
import MapSearchBox from "@/features/map/components/MapSearchBox";
import type { ResolvedMapPlace } from "@/features/map/hooks/useMapSearch";

const center = {
    lat: 43.6532,
    lng: -79.3832, // Default center: Toronto, Canada
};

const MapHandler: React.FC<{
    markerPosition: google.maps.LatLngLiteral | null;
    setIsModalOpen: (isOpen: boolean) => void;
}> = ({
    markerPosition,
    setIsModalOpen,
}) => {
    const map = useMap(); // Use the useMap hook inside the MapHandler component
    const advancedMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null); // Define advancedMarkerRef

    useEffect(() => {
        if (markerPosition && map && window.google.maps.marker) {
            if (!advancedMarkerRef.current) {
                advancedMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
                    map,
                    position: markerPosition,
                });

                const markerElement = advancedMarkerRef.current.element;
                if (markerElement) {
                    markerElement.addEventListener("click", () => {
                        setIsModalOpen(true);
                    });
                }
            } else {
                advancedMarkerRef.current.position = markerPosition;
            }
        }
    }, [markerPosition, map, setIsModalOpen]);

    return null; // This component does not render anything
};

const Maps: React.FC = () => {
    const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
    const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral | null>(null);
    const [infoWindowContent, setInfoWindowContent] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [googleMapId] = useState(() => readGoogleMapCredentials(BASE_KEY).mapId);
    const [googleMapApiKey] = useState(() => readGoogleMapCredentials(BASE_KEY).apiKey);
    const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>(center);
    const [mapZoom, setMapZoom] = useState<number>(12);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false); // State for the search modal

    const handleLayerSwitch = () => {
        setMapType((prevType) => (prevType === "roadmap" ? "satellite" : "roadmap"));
    };

    /**
     * A place was picked from the suggestion list (Places Autocomplete).
     */
    const handlePlaceSelected = (place: ResolvedMapPlace) => {
        setMarkerPosition({ lat: place.lat, lng: place.lng });
        setInfoWindowContent(place.address || "Address not available");
        saveSearchToLocalStorage(place.address || place.title);

        // Update the map center and zoom
        setMapCenter({ lat: place.lat, lng: place.lng });
        setMapZoom(15);
    };

    /**
     * Free text that matched no suggestion: geocode it.
     */
    const handleSearchText = (searchText: string) => {
        const geocoder = new google.maps.Geocoder();
        const address = searchText.trim() === "" ? "Toronto, Ontario, Canada" : `${searchText}, Ontario, Canada`;

        geocoder.geocode({ address }, (results, status) => {
            if (status === "OK" && results && results[0] && results[0].geometry && results[0].geometry.location) {
                const location = results[0].geometry.location;
                setMarkerPosition({ lat: location.lat(), lng: location.lng() });
                setInfoWindowContent(results[0].formatted_address || "Address not available");
                saveSearchToLocalStorage(results[0].formatted_address || searchText);

                // Update the map center and zoom
                setMapCenter({ lat: location.lat(), lng: location.lng() });
                setMapZoom(15);
            } else {
                console.error("Geocode was not successful for the following reason:", status);
            }
        });
    };

    const saveSearchToLocalStorage = (address: string) => {
        const MAX_RECENT_SEARCHES = 10;
        const recentSearches = JSON.parse(localStorage.getItem("recentSearches") || "[]");
        const updatedSearches = recentSearches.filter((search: string) => search !== address);
        updatedSearches.unshift(address);
        if (updatedSearches.length > MAX_RECENT_SEARCHES) {
            updatedSearches.pop();
        }
        localStorage.setItem("recentSearches", JSON.stringify(updatedSearches));
    };

    const handleSearchButtonClick = (searchText: string) => {
        if (searchText.trim() === "") {
            setIsSearchModalOpen(true); // Show the modal if the search box is empty
        } else {
            handleSearchText(searchText);
        }
    };

    return (
        <APIProvider apiKey={googleMapApiKey} libraries={["places"]}>
            <div style={{ height: "100%", width: "100%" }}>
                <Map
                    mapId={googleMapId || undefined}
                    center={mapCenter}
                    zoom={mapZoom}
                    mapTypeId={mapType}
                    disableDefaultUI={true}
                    clickableIcons={false} // Disable native POI popups
                >
                    {/* Render the MapHandler component as a child of Map */}
                    <MapHandler
                        markerPosition={markerPosition}
                        setIsModalOpen={setIsModalOpen}
                    />

                    <button
                        onClick={handleLayerSwitch}
                        className="absolute left-2 bottom-2 bg-gray-800 text-orange-500 p-1 text-sm rounded shadow hover:bg-gray-700 flex items-center"
                        title={mapType === "roadmap" ? "Switch to Satellite View" : "Switch to Roadmap View"}
                    >
                        <FontAwesomeIcon icon={mapType === "roadmap" ? faTreeCity : faMap} />
                    </button>

                    <div className="absolute top-4 left-4 flex items-center space-x-2 bg-gray-900 text-orange-500 p-2 rounded shadow-md">
                        <MapSearchBox
                            showSearchButton
                            inputClassName="w-64 rounded"
                            onSelectPlace={handlePlaceSelected}
                            onSubmitText={handleSearchButtonClick}
                        />
                        {/* NOTE: the drawing toolbar was removed from this legacy copy
                            along with the deprecated Google Maps Drawing library. The live
                            map feature lives in `features/map` — see
                            `features/map/utils/MapDrawingController.tsx`. */}
                        <div className="flex space-x-2 text-sm">
                            <button className="bg-gray-700 p-1 rounded shadow hover:bg-gray-600">
                                <FontAwesomeIcon icon={faUndo} />
                            </button>
                            <button className="bg-gray-700 p-1 rounded shadow hover:bg-gray-600">
                                <FontAwesomeIcon icon={faRedo} />
                            </button>
                            <button className="bg-gray-700 p-1 rounded shadow hover:bg-gray-600">
                                <FontAwesomeIcon icon={faHandPointer} />
                            </button>
                            <button className="bg-gray-700 p-1 rounded shadow hover:bg-gray-600">
                                <FontAwesomeIcon icon={faMapMarkerAlt} />
                            </button>
                            <button className="bg-gray-700 p-1 rounded shadow hover:bg-gray-600">
                                <FontAwesomeIcon icon={faRuler} />
                            </button>
                        </div>
                    </div>
                </Map>
            </div>

            {isModalOpen && markerPosition && infoWindowContent && (
                <PlaceInfoModal
                    content={infoWindowContent}
                    onClose={() => setIsModalOpen(false)}
                />
            )}

            <CustomModal
                isOpen={isSearchModalOpen}
                title="Search Error"
                message="Please input or select an address to search."
                onRequestClose={() => setIsSearchModalOpen(false)}
                type="error"
            />
        </APIProvider>
    );
};

export default Maps;