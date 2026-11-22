/**
 * @file overlayTree.ts
 *
 * The drawing's own model is a tree, not a list.
 *
 * The shapes that are drawn sit in `mapOverlayArrayOnMap`, but a group
 * holds its shapes in `children` instead — so a grouped shape is *not* in
 * the drawing's own list. These helpers walk that tree, so a shape can be
 * found, taken out and put back wherever it really is.
 *
 * They are pure: they take an array and return a new one, and they never
 * touch the store or the map.
 */
import type { MapOverlay } from "@/features/map/types/types";

/**
 * Where a shape sits in the drawing.
 */
export interface OverlayLocation {
    /** The shape itself. */
    overlay: MapOverlay;
    /**
     * The group it sits in, when it is inside one.
     *
     * A shape at the top of the drawing has no group.
     */
    group?: MapOverlay;
    /** Its place in that list: the group's children, or the drawing's own list. */
    index: number;
}

/**
 * True when the shape is somewhere in the tree.
 */
export const containsOverlay = (overlays: MapOverlay[], id: string): boolean =>
    overlays.some(
        (overlay) =>
            overlay.id === id ||
            (overlay.isParent && overlay.children
                ? containsOverlay(overlay.children, id)
                : false)
    );

/**
 * Find a shape in the drawing, wherever it sits.
 *
 * A shape inside a group is in the group's `children`, so the tree has to
 * be searched — otherwise a grouped shape could never be picked.
 */
export const findOverlayLocation = (
    overlays: MapOverlay[],
    id: string
): OverlayLocation | undefined => {
    const index = overlays.findIndex((overlay) => overlay.id === id);
    if (index !== -1) {
        return { overlay: overlays[index], index };
    }

    for (const group of overlays) {
        if (!group.isParent || !group.children) {
            continue;
        }

        const found = findOverlayLocation(group.children, id);
        if (found) {
            // The group the shape was found in is the one it sits in.
            return { ...found, group };
        }
    }

    return undefined;
};

/**
 * Every shape in the drawing, in the order they are drawn.
 *
 * The shapes at the top come first, then the shapes inside each group.
 */
export const collectOverlays = (overlays: MapOverlay[]): MapOverlay[] =>
    overlays.flatMap((overlay) =>
        overlay.isParent && overlay.children?.length
            ? collectOverlays(overlay.children)
            : [overlay]
    );

/**
 * Take a shape out of the drawing, wherever it sits.
 *
 * The array is returned unchanged when the shape is not in it.
 */
export const removeOverlayFromTree = (
    overlays: MapOverlay[],
    id: string
): MapOverlay[] => {
    if (!containsOverlay(overlays, id)) {
        return overlays;
    }

    const index = overlays.findIndex((overlay) => overlay.id === id);
    if (index !== -1) {
        return overlays.filter((overlay) => overlay.id !== id);
    }

    return overlays.map((overlay) => {
        if (!overlay.isParent || !overlay.children) {
            return overlay;
        }
        return { ...overlay, children: removeOverlayFromTree(overlay.children, id) };
    });
};

/**
 * Put a shape back into the drawing, where it used to be.
 *
 * When the shape came out of a group, it goes back into that group at the
 * place it held. When the group is gone by then, the shape goes back to
 * the top of the drawing instead — it is better to have the shape back in
 * the wrong place than to lose it.
 */
export const insertOverlayIntoTree = (
    overlays: MapOverlay[],
    overlay: MapOverlay,
    containerId: string | undefined,
    index: number
): MapOverlay[] => {
    if (!containerId) {
        const next = [...overlays];
        next.splice(Math.min(index, next.length), 0, overlay);
        return next;
    }

    const groupIndex = overlays.findIndex((entry) => entry.id === containerId);
    if (groupIndex !== -1) {
        const group = overlays[groupIndex];
        const children = [...(group.children ?? [])];
        children.splice(Math.min(index, children.length), 0, overlay);
        return overlays.map((entry, i) =>
            i === groupIndex ? { ...group, children } : entry
        );
    }

    // The group is deeper in the tree. The call returns the very same
    // array when it found nothing, so the identity tells us whether it did.
    for (let i = 0; i < overlays.length; i++) {
        const group = overlays[i];
        if (!group.isParent || !group.children) {
            continue;
        }

        const children = insertOverlayIntoTree(
            group.children,
            overlay,
            containerId,
            index
        );

        if (children !== group.children) {
            const next = [...overlays];
            next[i] = { ...group, children };
            return next;
        }
    }

    return overlays;
};
