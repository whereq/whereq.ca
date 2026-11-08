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
import LocalStorageHelper from "@/utils/localStorageHelper";
import { BASE_KEY, GOOGLE_MAP_ID } from "@/features/map-gl/utils/constants";
import PlaceInfoModal from "@/features/map-gl/components/PlaceInfoModal";
import MapDrawingOptions from "@/features/map-gl/components/MapDrawingOptions";
import CustomModal from "@/components/modals/CustomModal"; // Import the CustomModal component
import { MAP_EVENT } from "@/features/map/utils/constants";
import logUtil from "@/utils/logUtil";

const center = {
    lat: 43.6532,
    lng: -79.3832, // Default center: Toronto, Canada
};

const MapHandler: React.FC<{
    markerPosition: google.maps.LatLngLiteral | null;
    setIsModalOpen: (isOpen: boolean) => void;
    autoCompleteRef: React.MutableRefObject<google.maps.places.Autocomplete | null>;
    setSearchText: (text: string) => void;
    handleSearch: () => void; // Add handleSearch to props
    drawingMode: string;
}> = ({
    markerPosition,
    setIsModalOpen,
    autoCompleteRef,
    setSearchText,
    handleSearch,
    drawingMode,
}) => {
    const map = useMap(); // Use the useMap hook inside the MapHandler component
    const advancedMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null); // Define advancedMarkerRef
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);

    useEffect(() => {
        const checkGoogleMapsLoaded = () => {
            if (window.google && window.google.maps && window.google.maps.places) {
                const autocompleteInstance = new google.maps.places.Autocomplete(
                    document.getElementById("mapSearch") as HTMLInputElement,
                    {
                        types: ["geocode"],
                    }
                );

                autocompleteInstance.addListener(MAP_EVENT.PLACE_CHANGED, () => {
                    const selectedPlace = autocompleteInstance.getPlace();
                    if (selectedPlace && selectedPlace.formatted_address) {
                        setSearchText(selectedPlace.formatted_address);
                        autoCompleteRef.current = autocompleteInstance;
                        handleSearch(); // Trigger search when a place is selected
                    } else {
                        console.warn("Place information is incomplete or unavailable.");
                    }
                });

                autoCompleteRef.current = autocompleteInstance;
            } else {
                setTimeout(checkGoogleMapsLoaded, 100);
            }
        };

        checkGoogleMapsLoaded();
    }, []);

    useEffect(() => {
        if (drawingMode === "lineOrShape" && map) {
            // Initialize the DrawingManager
            if (!drawingManagerRef.current) {
                drawingManagerRef.current =
                    new google.maps.drawing.DrawingManager({
                        drawingMode: google.maps.drawing.OverlayType.POLYLINE, // Default drawing mode
                        drawingControl: false, // Disable default controls
                        polylineOptions: {
                            strokeColor: "#FF0000",
                            strokeOpacity: 1.0,
                            strokeWeight: 2,
                        },
                        polygonOptions: {
                            fillColor: "#FF0000",
                            fillOpacity: 0.4,
                            strokeColor: "#FF0000",
                            strokeOpacity: 1.0,
                            strokeWeight: 2,
                        },
                        circleOptions: {
                            fillColor: "#FF0000",
                            fillOpacity: 0.5,
                            strokeColor: "#FF0000",
                            strokeOpacity: 1.0,
                            strokeWeight: 2,
                        },
                        rectangleOptions: {
                            fillColor: "#FF0000",
                            fillOpacity: 0.5,
                            strokeColor: "#FF0000",
                            strokeOpacity: 1.0,
                            strokeWeight: 2,
                        },
                    });
            }

            const drawingManager = drawingManagerRef.current;
            drawingManager.setMap(map);

            // Event listener for completed drawing
            const onOverlayComplete = (event: google.maps.drawing.OverlayCompleteEvent) => {
                if (event.type === google.maps.drawing.OverlayType.POLYLINE) {
                    const polyline = event.overlay as google.maps.Polyline;
                    logUtil.log("Polyline completed");
                    logUtil.log(polyline.getPath().getArray());
                    const polygon = event.overlay as google.maps.Polygon;
                    logUtil.log("Polygon completed");
                    logUtil.log(polygon.getPath().getArray());
                    if (event.overlay instanceof google.maps.Polygon) {
                        logUtil.log("Polygon completed");
                        logUtil.log(event.overlay.getPath().getArray());
                    }
                }
            };

            google.maps.event.addListener(drawingManager, "overlaycomplete", onOverlayComplete);

            return () => {
                drawingManager.setMap(null);
                google.maps.event.clearListeners(drawingManager, "overlaycomplete");
            };
        }
    }, [drawingMode, map]);

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
    const [searchText, setSearchText] = useState("");
    const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral | null>(null);
    const [infoWindowContent, setInfoWindowContent] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [googleMapId, setGoogleMapId] = useState<string>("");
    const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>(center);
    const [mapZoom, setMapZoom] = useState<number>(12);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false); // State for the search modal
    const [drawingMode, setDrawingMode] = useState<string>(""); // State for drawing mode

    const inputRef = useRef<HTMLInputElement | null>(null);
    const autoCompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    const handleLayerSwitch = () => {
        setMapType((prevType) => (prevType === "roadmap" ? "satellite" : "roadmap"));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            // Trigger search when Enter is pressed
            if (autoCompleteRef.current) {
                autoCompleteRef.current.getPlace();
            }
        }
    };

    const handleSearch = () => {
        if (autoCompleteRef.current) {
            const place = autoCompleteRef.current.getPlace();
            if (place && place.geometry && place.geometry.location) {
                const location = place.geometry.location;
                setMarkerPosition({ lat: location.lat(), lng: location.lng() });
                setInfoWindowContent(place.formatted_address || "Address not available");
                saveSearchToLocalStorage(place.formatted_address || searchText);

                // Update the map center and zoom
                setMapCenter({ lat: location.lat(), lng: location.lng() });
                setMapZoom(15);
                return;
            }
        }

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

    const handleSearchButtonClick = () => {
        if (searchText.trim() === "") {
            setIsSearchModalOpen(true); // Show the modal if the search box is empty
        } else {
            handleSearch();
        }
    };

    const handleDrawingOptionSelect = (option: string) => {
        setDrawingMode(option);
    };

    useEffect(() => {
        const savedSettings = LocalStorageHelper.loadSetting(BASE_KEY);
        if (savedSettings && savedSettings[GOOGLE_MAP_ID]) {
            setGoogleMapId(savedSettings[GOOGLE_MAP_ID]);
        } else {
            console.warn("Google Map ID not found in local storage.");
        }
    }, []);

    return (
        <APIProvider apiKey={googleMapId} libraries={["places", "drawing"]}>
            <div style={{ height: "100%", width: "100%" }}>
                <Map
                    mapId={googleMapId}
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
                        autoCompleteRef={autoCompleteRef}
                        setSearchText={setSearchText}
                        handleSearch={handleSearch} 
                        drawingMode={drawingMode}
                    />

                    <button
                        onClick={handleLayerSwitch}
                        className="absolute left-2 bottom-2 bg-gray-800 text-orange-500 p-1 text-sm rounded shadow hover:bg-gray-700 flex items-center"
                        title={mapType === "roadmap" ? "Switch to Satellite View" : "Switch to Roadmap View"}
                    >
                        <FontAwesomeIcon icon={mapType === "roadmap" ? faTreeCity : faMap} />
                    </button>

                    <div className="absolute top-4 left-4 flex items-center space-x-2 bg-gray-900 text-orange-500 p-2 rounded shadow-md">
                        <input
                            id="mapSearch"
                            type="text"
                            placeholder="Search Google Maps"
                            className="bg-gray-800 text-orange-500 text-sm p-1 rounded focus:outline-none w-64"
                            style={{ fontFamily: "Fira Code, monospace" }}
                            ref={inputRef}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <button
                            onClick={handleSearchButtonClick}
                            className="bg-gray-700 p-1 text-sm rounded shadow hover:bg-gray-600"
                        >
                            Search
                        </button>
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
                            <MapDrawingOptions onSelectOption={handleDrawingOptionSelect} />
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