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
import type { MapOverlay, NativeMapOverlay } from "@/features/map/types/types";
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

/**
 * Delete the selected shapes: off the map, and out of the model.
 *
 * Returns how many shapes were deleted. The saved copies in "My Map" are
 * left alone — those are a separate collection.
 */
export const deleteSelectedOverlays = (): number => {
    const {
        selectedOverlayArray,
        mapOverlayArrayOnMap,
        nativeOverlayRegistry,
        setMapOverlayArrayOnMap,
        setOverlayArrayOnMap,
        removeNativeOverlay,
        setSelectedOverlayArray,
    } = useOverlayStore.getState();

    const ids = selectedOverlayArray.map((overlay) => overlay.id);
    if (ids.length === 0) {
        return 0;
    }

    // The objects that are about to go are the very objects in the native
    // list, so identity is enough to recognise them.
    const removedNatives = ids
        .map((id) => nativeOverlayRegistry[id])
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

    return ids.length;
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
