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
    RestoredOverlay,
    UndoAction,
    UndoRecord,
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
    const shapes: RestoredOverlay[] = [];

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
            // The shape is about to be taken off the map.
            wasDetached: true,
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

    // Only the shapes that were actually found in the drawing are taken off
    // the map. A shape that is inside a group is not in the drawing's own
    // list, so it is not in this record — and it must not be taken off the
    // map either, or it would be lost with no way to put it back.
    shapes.forEach((shape) => {
        if (shape.native) {
            detachFromMap(shape.native);
            removeNativeOverlay(shape.overlay.id);
        }
    });

    setOverlayArrayOnMap((state) => state.filter((native) => !removedNatives.includes(native)));
    setMapOverlayArrayOnMap(mapOverlayArrayOnMap.filter((overlay) => !ids.includes(overlay.id)));
    setSelectedOverlayArray([]);

    const record: UndoRecord = { action: "delete", restored: shapes, removedIds: [] };
    pushUndoRecord(record);

    return shapes.length;
};

/**
 * Take the last change back.
 *
 * A deletion puts the live objects back on the map; a grouping and an
 * ungrouping leave the map alone and only change the model, because the
 * shapes stay on the map in both cases.
 *
 * The model goes back to where it was: the entries the change added come
 * out, and the entries it took away go back where they were.
 *
 * Returns what was undone, or `null` when there was nothing to undo.
 */
export const undoLastChange = (
    map: google.maps.Map
): { count: number; action: UndoAction } | null => {
    const {
        popUndoRecord,
        setMapOverlayArrayOnMap,
        setOverlayArrayOnMap,
        registerNativeOverlay,
        setSelectedOverlayArray,
    } = useOverlayStore.getState();

    const record = popUndoRecord();
    if (!record || record.restored.length === 0) {
        return null;
    }

    // The model goes back to where it was. The entries are put back from
    // the earliest index upwards, so each one lands in the place it used
    // to hold even when several of them come back at once.
    const restored = [...record.restored].sort((a, b) => a.index - b.index);

    setMapOverlayArrayOnMap((current) => {
        const next = current.filter((overlay) => !record.removedIds.includes(overlay.id));
        restored.forEach((entry) => {
            next.splice(Math.min(entry.index, next.length), 0, entry.overlay);
        });
        return next;
    });

    // The live objects that were taken off the map go back on it. The ones
    // that were never taken off (a grouping leaves the map alone) are left
    // exactly where they are.
    const nativeList: NativeMapOverlay[] = [];

    restored.forEach((entry) => {
        if (!entry.native || !entry.wasDetached) {
            return;
        }
        attachToMap(entry.native, map);
        registerNativeOverlay(entry.overlay.id, entry.native);
        if (entry.wasInNativeList) {
            nativeList.push(entry.native);
        }
    });

    if (nativeList.length > 0) {
        setOverlayArrayOnMap((state) => [...state, ...nativeList]);
    }

    // The shapes that came back are selected, so the visitor sees them. A
    // group has no shape of its own on the map, so it is not selected.
    setSelectedOverlayArray(
        restored.filter((entry) => entry.native).map((entry) => entry.overlay)
    );

    return { count: restored.length, action: record.action };
};

/**
 * What the notice says after a change was taken back.
 *
 * The three actions are told apart, because "the shapes are back" means
 * something different for a deletion than for a grouping.
 */
export const describeUndo = ({
    count,
    action,
}: {
    count: number;
    action: UndoAction;
}): string => {
    if (action === "group") {
        return `The ${count} shape${count === 1 ? " is" : "s are"} out of the group again.`;
    }

    if (action === "ungroup") {
        return "The group is together again.";
    }

    return `Put ${count} shape${count === 1 ? "" : "s"} back on the map.`;
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
        nativeOverlayRegistry,
        setMapOverlayArrayOnMap,
        setSelectedOverlayArray,
        pushUndoRecord,
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

    // Remember where each shape used to sit, so the grouping can be taken
    // apart again. The shapes stay on the map, so nothing is detached.
    const restored: RestoredOverlay[] = children.map((child) => ({
        overlay: child,
        index: mapOverlayArrayOnMap.findIndex((overlay) => overlay.id === child.id),
        native: nativeOverlayRegistry[child.id],
        wasDetached: false,
    }));

    setMapOverlayArrayOnMap([
        ...mapOverlayArrayOnMap.filter((overlay) => !ids.includes(overlay.id)),
        parent,
    ]);
    setSelectedOverlayArray([]);

    pushUndoRecord({
        action: "group",
        restored,
        removedIds: [parent.id],
    });

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
        pushUndoRecord,
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

    // Remember the group, so it can be put back together again. The shapes
    // stayed on the map all along, so nothing is detached.
    pushUndoRecord({
        action: "ungroup",
        restored: [{ overlay: parent, index, wasDetached: false }],
        removedIds: parent.children.map((child) => child.id),
    });

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
