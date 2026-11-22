import React, { useCallback, useEffect, useRef, useState } from "react";
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
import ToolButton from "@/features/map/components/ToolButton";
import type { ResolvedMapPlace } from "@/features/map/hooks/useMapSearch";
import { overlaysToGeoJson, parseShapeDocument, GeoJsonError } from "@/features/map/utils/geoJson";
import { downloadShapeDocument } from "@/features/map/utils/shapeTransfer";
import {
    deleteSelectedOverlays,
    hasGroupToUngroup,
    ungroupOverlays,
} from "@/features/map/utils/mapShapeActions";
import { eventEmitter } from "@/utils/eventEmitter";
import { EVENT } from "@/utils/constants";
import CustomModal from "@/components/modals/CustomModal";

/**
 * How long the tool bar waits for the drawing controller to report back
 * before it gives up on the answer. The controller answers immediately, so
 * this only ever fires when the map is not there at all.
 */
const IMPORT_ANSWER_TIMEOUT_MS = 3000;

/**
 * How long the tool bar waits for the map's picture. The map answers as
 * soon as it has one, so this only ever fires when the map is not there.
 */
const CAPTURE_ANSWER_TIMEOUT_MS = 8000;

/** The id of the ruler tool in the tool bar's active-tool state. */
const RULER_TOOL = "ruler";


const MapTools : React.FC = () => {
    /** Short notice under the toolbar (e.g. "no match found"). */
    const [searchNotice, setSearchNotice] = useState<string | null>(null);
    /** The hidden file picker the import button opens. */
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    /** True while the "delete this shape?" question is on screen. */
    const [isDeleteQuestionOpen, setIsDeleteQuestionOpen] = useState(false);

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
        selectedOverlayArray,
        toolNotice,
        setToolNotice,
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
            setToolNotice("There is nothing to export yet - draw a polygon or a polyline first.");
            return;
        }

        downloadShapeDocument(shapeDocument);
        setToolNotice(
            `Exported ${shapeDocument.features.length} shape${shapeDocument.features.length === 1 ? "" : "s"}.`
        );
    }, [setToolNotice]);

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
        setToolNotice(null);

        if (!file) {
            return;
        }

        try {
            const text = await file.text();
            const { shapes, skipped } = parseShapeDocument(text);

            if (shapes.length === 0) {
                setToolNotice("That file has no polygons or polylines in it.");
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
                setToolNotice("The map did not answer - try again in a moment.");
                return;
            }

            if (drawn === 0) {
                setToolNotice("The map is not ready yet, so the shapes were not drawn.");
                return;
            }

            setToolNotice(
                `Added ${drawn} shape${drawn === 1 ? "" : "s"} to the map${suffix}`
            );
        } catch (error) {
            setToolNotice(
                error instanceof GeoJsonError
                    ? error.message
                    : "That file could not be read."
            );
        }
    }, [setToolNotice]);

    /**
     * Ask for the map's picture.
     *
     * The tool bar cannot reach the map either, so the request goes over
     * the event bus and the drawing controller — which owns the map —
     * takes the picture and answers with the result.
     */
    const handleCaptureMap = useCallback(() => {
        setToolNotice("Taking the picture…");

        const onCaptured = ({ message }: { ok: boolean; message: string }) => {
            window.clearTimeout(timeout);
            eventEmitter.off<{ ok: boolean; message: string }>(
                EVENT.MAP_CAPTURE_DONE,
                onCaptured
            );
            setToolNotice(message);
        };

        let timeout = 0;

        eventEmitter.on<{ ok: boolean; message: string }>(
            EVENT.MAP_CAPTURE_DONE,
            onCaptured
        );

        timeout = window.setTimeout(() => {
            eventEmitter.off<{ ok: boolean; message: string }>(
                EVENT.MAP_CAPTURE_DONE,
                onCaptured
            );
            setToolNotice((current) =>
                current === "Taking the picture…" ? "The map did not answer - try again in a moment." : current
            );
        }, CAPTURE_ANSWER_TIMEOUT_MS);

        eventEmitter.emit(EVENT.MAP_CAPTURE_REQUEST);
    }, [setToolNotice]);

    /** Group the selected shapes under one name. */
    const handleGroup = useCallback(() => {
        if (selectedOverlayArray.length < 2) {
            setToolNotice("Select two or more shapes to group them - hold shift to pick more than one.");
            return;
        }
        setOverlayModalMode(OverlayModalMode.Group);
    }, [selectedOverlayArray.length, setOverlayModalMode, setToolNotice]);

    /** Take a group apart again. */
    const handleUngroup = useCallback(() => {
        const released = ungroupOverlays();
        setToolNotice(
            released > 0
                ? `Let ${released} shape${released === 1 ? "" : "s"} out of the group.`
                : "There is no group to take apart."
        );
    }, [setToolNotice]);

    /** Delete the selected shapes, after asking. */
    const handleConfirmDelete = useCallback(() => {
        const deleted = deleteSelectedOverlays();
        setToolNotice(
            deleted > 0
                ? `Deleted ${deleted} shape${deleted === 1 ? "" : "s"}.`
                : "There was nothing to delete."
        );
    }, [setToolNotice]);

    useEffect(() => {        if (mapToolMode === MapToolMode.Hand) {
            setActiveTool(null);
            setMapShapeType(null);
        }
    }, [mapToolMode, setActiveTool, setMapShapeType]);

    const handleDrawingOptionClick = (option: MapOverlayType) => {
        setActiveTool(option);
        setMapToolMode(MapToolMode.Draw);
        setMapShapeType(mapOverlayToShape(option)); // Update mapShapeType in the store
    };

    /** The ruler measures between two points; it draws no shape. */
    const handleRulerClick = () => {
        const next = activeTool === RULER_TOOL ? null : RULER_TOOL;
        setActiveTool(next);
        setMapShapeType(null);
        setMapToolMode(MapToolMode.Draw);
        setToolNotice(
            next
                ? "Click two points on the map to measure the distance between them."
                : null
        );
    };

    const handleMapToolMode = (action: MapToolMode) => {
        if (action === MapToolMode.Hand) {
            setMapToolMode(action);
            setActiveTool(null); // Deselect any selected option
            setMapShapeType(null); // Reset mapShapeType
            setToolNotice(null);
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
            <div className="flex flex-wrap items-center gap-y-1 space-x-1 text-sm bg-gray-800 p-1">
                <ToolButton
                    icon={faHand}
                    label="Pan the map"
                    onClick={() => handleMapToolMode(MapToolMode.Hand)}
                    active={mapToolMode === MapToolMode.Hand}
                />
                {[
                    { option: MapOverlayType.Marker, icon: faLocationDot, label: "Drop a marker" },
                    { option: MapOverlayType.Polyline, icon: faBezierCurve, label: "Draw a polyline" },
                    { option: MapOverlayType.Polygon, icon: faDrawPolygon, label: "Draw a polygon" },
                    { option: MapOverlayType.Circle, icon: faCircle, label: "Draw a circle" },
                    { option: MapOverlayType.Rectangle, icon: faSquare, label: "Draw a rectangle" },
                ].map(({ option, icon, label }) => (
                    <ToolButton
                        key={option}
                        icon={icon}
                        label={label}
                        disabled={drawingUnavailable}
                        active={activeTool === option}
                        onClick={() => handleDrawingOptionClick(option)}
                    />
                ))}
                <ToolButton
                    icon={faRuler}
                    label="Measure a distance"
                    onClick={handleRulerClick}
                    active={activeTool === RULER_TOOL}
                />
                <ToolButton
                    icon={faObjectGroup}
                    label="Group the selected shapes"
                    onClick={handleGroup}
                    disabled={selectedOverlayArray.length < 2}
                />
                <ToolButton
                    icon={faObjectUngroup}
                    label="Take a group apart"
                    onClick={handleUngroup}
                    disabled={!hasGroupToUngroup()}
                />
                <ToolButton
                    icon={faRemove}
                    label="Delete the selected shapes"
                    onClick={() => setIsDeleteQuestionOpen(true)}
                    disabled={selectedOverlayArray.length === 0}
                />
                <ToolButton
                    icon={faSave}
                    label="Save the drawing to My Map"
                    onClick={() => setOverlayModalMode(OverlayModalMode.Save)}
                    disabled={!saveButtonInMapToolEnabled}
                />
                <ToolButton
                    icon={faCamera}
                    label="Take a picture of the map"
                    onClick={handleCaptureMap}
                />
                <ToolButton
                    icon={faFileExport}
                    label="Export the shapes as a JSON file"
                    onClick={handleExportShapes}
                />
                <ToolButton
                    icon={faFileImport}
                    label="Draw the shapes held in a JSON file"
                    onClick={() => fileInputRef.current?.click()}
                />
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
            {toolNotice && (
                <div className="bg-gray-900 text-orange-300 text-xs px-2 py-1 rounded shadow">
                    {toolNotice}
                </div>
            )}

            <CustomModal
                isOpen={isDeleteQuestionOpen}
                onRequestClose={() => setIsDeleteQuestionOpen(false)}
                type="warning"
                title="Delete the selected shapes?"
                message={
                    selectedOverlayArray.length === 1
                        ? "This shape will be taken off the map. Saved copies in My Map are kept."
                        : `These ${selectedOverlayArray.length} shapes will be taken off the map. Saved copies in My Map are kept.`
                }
                actions={[
                    {
                        label: "Cancel",
                        onClick: () => setIsDeleteQuestionOpen(false),
                        className: "bg-gray-700 hover:bg-gray-600 text-white px-5 py-2 transition-colors duration-200",
                    },
                    {
                        label: "Delete",
                        onClick: handleConfirmDelete,
                        className: "bg-red-500 hover:bg-red-600 text-white px-5 py-2 transition-colors duration-200",
                    },
                ]}
            />
        </div>
    );
};

export default MapTools;
