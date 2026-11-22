/**
 * @file mapShapeActions.ts
 *
 * The operations the tool bar performs on the shapes that are on the map.
 *
 * They all work on the **model** — `mapOverlayArrayOnMap`, the array of
 * `MapOverlay` objects that mirrors what is drawn on the map. The live
 * Google Maps objects are taken off the map through the registry in the
 * overlay store, which ties a shape's id to the object behind it.
 *
 * The model and the native overlays are two parallel lists that do not
 * share an index (a marker is in the model but not in the native list),
 * which is exactly why the registry exists.
 */
import { v4 as uuidv4 } from "uuid";
import type {
    MapOverlay,
    NativeMapOverlay,
    DeletedShape,
    DeletedShapeRecord,
} from "@/features/map/types/types";
import { useOverlayStore } from "@/features/map/store/mapStore";

/** Take a native overlay off the map. */
const detachFromMap = (native: NativeMapOverlay | undefined): void => {
    if (!native) {
        return;
    }
    if (native instanceof google.maps.marker.AdvancedMarkerElement) {
        native.map = null;
        return;
    }
    native.setMap(null);
};

/** Put a native overlay back on the map. */
const attachToMap = (native: NativeMapOverlay, map: google.maps.Map): void => {
    if (native instanceof google.maps.marker.AdvancedMarkerElement) {
        native.map = map;
        return;
    }
    native.setMap(map);
};

/**
 * Delete the selected shapes: off the map, and out of the model.
 *
 * What was removed is recorded on the undo stack, so the visitor can put
 * the very same shapes back: the live objects are kept, so a shape comes
 * back exactly as it was, with the vertices the visitor dragged.
 *
 * The saved copies in "My Map" are left alone — those are a separate
 * collection.
 *
 * Returns how many shapes were deleted.
 */
export const deleteSelectedOverlays = (): number => {
    const {
        selectedOverlayArray,
        mapOverlayArrayOnMap,
        nativeOverlayRegistry,
        overlayArrayOnMap,
        setMapOverlayArrayOnMap,
        setOverlayArrayOnMap,
        removeNativeOverlay,
        setSelectedOverlayArray,
        pushUndoRecord,
    } = useOverlayStore.getState();

    const ids = selectedOverlayArray.map((overlay) => overlay.id);
    if (ids.length === 0) {
        return 0;
    }

    // Remember what is about to go, and where it was, so it can go back
    // exactly as it was.
    const shapes: DeletedShape[] = [];

    ids.forEach((id) => {
        const index = mapOverlayArrayOnMap.findIndex((overlay) => overlay.id === id);
        if (index === -1) {
            return;
        }

        const overlay = mapOverlayArrayOnMap[index];
        const native = nativeOverlayRegistry[id];

        shapes.push({
            overlay,
            index,
            native,
            // A marker is tracked in the model but not in the native list.
            wasInNativeList: native ? overlayArrayOnMap.includes(native) : false,
        });
    });

    if (shapes.length === 0) {
        return 0;
    }

    // The objects that are about to go are the very objects in the native
    // list, so identity is enough to recognise them.
    const removedNatives = shapes
        .map((shape) => shape.native)
        .filter((native): native is NativeMapOverlay => Boolean(native));

    ids.forEach((id) => {
        const native = nativeOverlayRegistry[id];
        if (native) {
            detachFromMap(native);
        }
        removeNativeOverlay(id);
    });

    setOverlayArrayOnMap((state) => state.filter((native) => !removedNatives.includes(native)));
    setMapOverlayArrayOnMap(mapOverlayArrayOnMap.filter((overlay) => !ids.includes(overlay.id)));
    setSelectedOverlayArray([]);

    const record: DeletedShapeRecord = { shapes };
    pushUndoRecord(record);

    return shapes.length;
};

/**
 * Put the most recent deletion back.
 *
 * The shapes go back where they were, the live objects go back on the map,
 * and they come back selected — so the visitor can see what came back.
 *
 * Returns how many shapes were put back, or 0 when there was nothing to
 * undo.
 */
export const restoreDeletedShapes = (map: google.maps.Map): number => {
    const {
        popUndoRecord,
        setMapOverlayArrayOnMap,
        setOverlayArrayOnMap,
        registerNativeOverlay,
        setSelectedOverlayArray,
    } = useOverlayStore.getState();

    const record = popUndoRecord();
    if (!record || record.shapes.length === 0) {
        return 0;
    }

    // The live objects go back on the map, and into the registry that ties
    // them to the model.
    record.shapes.forEach((shape) => {
        if (!shape.native) {
            return;
        }
        attachToMap(shape.native, map);
        registerNativeOverlay(shape.overlay.id, shape.native);
    });

    // The ones that were in the native overlay list go back into it.
    const nativeList = record.shapes
        .filter((shape) => shape.wasInNativeList && shape.native)
        .map((shape) => shape.native as NativeMapOverlay);

    if (nativeList.length > 0) {
        setOverlayArrayOnMap((state) => [...state, ...nativeList]);
    }

    // The model entries go back where they were. They are put back from the
    // earliest index upwards, so each one lands in the place it used to
    // hold even when several of them come back at once.
    const restored = [...record.shapes].sort((a, b) => a.index - b.index);

    setMapOverlayArrayOnMap((current) => {
        const next = [...current];
        restored.forEach((shape) => {
            next.splice(Math.min(shape.index, next.length), 0, shape.overlay);
        });
        return next;
    });

    // They come back selected, so the visitor sees what came back.
    setSelectedOverlayArray(restored.map((shape) => shape.overlay));

    return restored.length;
};

/**
 * Put the selected shapes into a new group.
 *
 * A group is a model-level container: the shapes stay on the map exactly
 * as they were, they are simply held together under one name. That is
 * what the saved map already knows how to draw (`isParent` + `children`).
 *
 * Returns the new group, or `null` when there is nothing to group.
 */
export const groupSelectedOverlays = (
    title: string,
    description: string
): MapOverlay | null => {
    const {
        selectedOverlayArray,
        mapOverlayArrayOnMap,
        setMapOverlayArrayOnMap,
        setSelectedOverlayArray,
    } = useOverlayStore.getState();

    const ids = selectedOverlayArray.map((overlay) => overlay.id);
    const children = mapOverlayArrayOnMap.filter((overlay) => ids.includes(overlay.id));

    // A group of one is not a group.
    if (children.length < 2) {
        return null;
    }

    const parent: MapOverlay = {
        id: uuidv4(),
        isParent: true,
        title,
        description,
        children,
    };

    setMapOverlayArrayOnMap([
        ...mapOverlayArrayOnMap.filter((overlay) => !ids.includes(overlay.id)),
        parent,
    ]);
    setSelectedOverlayArray([]);

    return parent;
};

/**
 * Take a group apart again.
 *
 * The group that is taken apart is the selected one, or — because a group
 * has no shape of its own on the map and cannot be clicked — the most
 * recent group in the drawing.
 *
 * Returns how many shapes were let out of the group.
 */
export const ungroupOverlays = (): number => {
    const {
        selectedOverlayArray,
        mapOverlayArrayOnMap,
        setMapOverlayArrayOnMap,
        setSelectedOverlayArray,
    } = useOverlayStore.getState();

    const groups = mapOverlayArrayOnMap.filter((overlay) => overlay.isParent && overlay.children);
    const parent =
        selectedOverlayArray.find((overlay) => overlay.isParent && overlay.children) ??
        groups[groups.length - 1];

    if (!parent || !parent.children) {
        return 0;
    }

    const index = mapOverlayArrayOnMap.findIndex((overlay) => overlay.id === parent.id);
    const rest = mapOverlayArrayOnMap.filter((overlay) => overlay.id !== parent.id);

    // The shapes go back where the group was.
    setMapOverlayArrayOnMap([
        ...rest.slice(0, index),
        ...parent.children,
        ...rest.slice(index),
    ]);
    setSelectedOverlayArray([]);

    return parent.children.length;
};

/**
 * True when the drawing holds at least one group that can be taken apart.
 */
export const hasGroupToUngroup = (): boolean => {
    const { selectedOverlayArray, mapOverlayArrayOnMap } = useOverlayStore.getState();
    if (selectedOverlayArray.some((overlay) => overlay.isParent && overlay.children)) {
        return true;
    }
    return mapOverlayArrayOnMap.some((overlay) => overlay.isParent && overlay.children);
};
