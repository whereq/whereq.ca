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
    faFileExport,
    faFileImport,
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
import { overlaysToGeoJson, parseShapeDocument, GeoJsonError } from "@/features/map/utils/geoJson";
import { downloadShapeDocument } from "@/features/map/utils/shapeTransfer";
import { eventEmitter } from "@/utils/eventEmitter";
import { EVENT } from "@/utils/constants";

/**
 * How long the tool bar waits for the drawing controller to report back
 * before it gives up on the answer. The controller answers immediately, so
 * this only ever fires when the map is not there at all.
 */
const IMPORT_ANSWER_TIMEOUT_MS = 3000;


const MapTools : React.FC = () => {
    /** Short notice under the toolbar (e.g. "no match found"). */
    const [searchNotice, setSearchNotice] = useState<string | null>(null);
    /** Notice about the last import or export. */
    const [transferNotice, setTransferNotice] = useState<string | null>(null);
    /** The hidden file picker the import button opens. */
    const fileInputRef = useRef<HTMLInputElement | null>(null);

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

    /**
     * Write the drawn polygons and polylines to a JSON file.
     *
     * The file is a GeoJSON document, so it opens in any mapping tool that
     * speaks GeoJSON.
     */
    const handleExportShapes = useCallback(() => {
        const { mapOverlayArrayOnMap } = useOverlayStore.getState();
        const shapeDocument = overlaysToGeoJson(mapOverlayArrayOnMap);

        if (shapeDocument.features.length === 0) {
            setTransferNotice("There is nothing to export yet - draw a polygon or a polyline first.");
            return;
        }

        downloadShapeDocument(shapeDocument);
        setTransferNotice(
            `Exported ${shapeDocument.features.length} shape${shapeDocument.features.length === 1 ? "" : "s"}.`
        );
    }, []);

    /**
     * Read a JSON file and draw the polygons and polylines it holds.
     *
     * The tool bar sits outside the <Map> subtree and cannot reach the live
     * map, so the shapes are handed over the event bus; the drawing
     * controller picks them up and draws them.
     *
     * The notice waits for the controller's answer, so it reports what the
     * map really did rather than what the file asked for.
     */
    const handleImportFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        // Clear the input, so the same file can be chosen again later.
        event.target.value = "";
        setTransferNotice(null);

        if (!file) {
            return;
        }

        try {
            const text = await file.text();
            const { shapes, skipped } = parseShapeDocument(text);

            if (shapes.length === 0) {
                setTransferNotice("That file has no polygons or polylines in it.");
                return;
            }

            const suffix =
                skipped > 0 ? `; ${skipped} could not be read.` : ".";

            // Wait for the drawing controller to say how many shapes it drew.
            const drawn = await new Promise<number>((resolve) => {
                let timeout = 0;

                const onImportDone = ({ drawn: count }: { drawn: number }) => {
                    window.clearTimeout(timeout);
                    eventEmitter.off<{ drawn: number }>(
                        EVENT.MAP_IMPORT_SHAPES_DONE,
                        onImportDone
                    );
                    resolve(count);
                };

                eventEmitter.on<{ drawn: number }>(
                    EVENT.MAP_IMPORT_SHAPES_DONE,
                    onImportDone
                );

                timeout = window.setTimeout(() => {
                    eventEmitter.off<{ drawn: number }>(
                        EVENT.MAP_IMPORT_SHAPES_DONE,
                        onImportDone
                    );
                    resolve(-1);
                }, IMPORT_ANSWER_TIMEOUT_MS);

                eventEmitter.emit(EVENT.MAP_IMPORT_SHAPES, { shapes });
            });

            if (drawn < 0) {
                setTransferNotice("The map did not answer - try again in a moment.");
                return;
            }

            if (drawn === 0) {
                setTransferNotice("The map is not ready yet, so the shapes were not drawn.");
                return;
            }

            setTransferNotice(
                `Added ${drawn} shape${drawn === 1 ? "" : "s"} to the map${suffix}`
            );
        } catch (error) {
            setTransferNotice(
                error instanceof GeoJsonError
                    ? error.message
                    : "That file could not be read."
            );
        }
    }, []);

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
        // z-20 keeps the tool bar and the suggestion list above the map:
        // this container is a sibling of <Map>, whose own wrapper sits at
        // z-index 0, so the whole subtree paints over the map surface.
        // `items-stretch` makes the search field span the full width of the
        // panel — the tool bar below it sets that width, so the two line up
        // instead of the field leaving a gap on the right.
        <div className="absolute top-0 left-0 z-20 flex flex-col items-stretch
                        space-y-1 bg-gray-900 text-orange-500 p-1">
            <div className="flex w-full items-stretch">
                <MapSearchBox
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
                <button
                    className="p-1 bg-gray-700 hover:bg-gray-600"
                    onClick={handleExportShapes}
                    title="Export the drawn polygons and polylines as a JSON file"
                >
                    <FontAwesomeIcon icon={faFileExport} title="Export shapes" />
                </button>
                <button
                    className="p-1 bg-gray-700 hover:bg-gray-600"
                    onClick={() => fileInputRef.current?.click()}
                    title="Draw the polygons and polylines held in a JSON file"
                >
                    <FontAwesomeIcon icon={faFileImport} title="Import shapes" />
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,application/geo+json,.json,.geojson"
                    className="hidden"
                    onChange={handleImportFile}
                />
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
            {transferNotice && (
                <div className="bg-gray-900 text-orange-300 text-xs px-2 py-1 rounded shadow">
                    {transferNotice}
                </div>
            )}
        </div>
    );
};

export default MapTools;