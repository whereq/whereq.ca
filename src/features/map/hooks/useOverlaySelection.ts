/**
 * @file useOverlaySelection.ts
 *
 * Keeps the shape selection and the highlight on the map in step.
 *
 * Clicking a shape on the map selects it; a shift-click adds it to the
 * selection (or takes it out again), which is what makes "group these two
 * shapes" possible. The selection itself lives in the overlay store, so
 * every tool bar button can ask what is selected.
 *
 * The highlight follows the selection rather than living in the click
 * handler of each shape: a shape that was selected, then deleted, must
 * not keep its orange outline, and a shape that was drawn while another
 * one was selected must not look selected either.
 */
import { useEffect } from "react";
import { useOverlayStore } from "@/features/map/store/mapStore";
import { eventEmitter } from "@/utils/eventEmitter";
import { EVENT } from "@/utils/constants";
import { highlightShape } from "@/features/map/utils/mapUtils";
import { findOverlayLocation } from "@/features/map/utils/overlayTree";

export const useOverlaySelection = () => {
    const { selectedOverlayArray, nativeOverlayRegistry } = useOverlayStore();

    /**
     * A shape on the map was clicked.
     *
     * The event carries the shape's id; the model behind it is looked up
     * in the store, because the native overlay knows nothing about the
     * app's own model. The lookup walks the whole tree, so a shape that
     * sits inside a group can be picked like any other.
     */
    useEffect(() => {
        const handleOverlaySelected = ({
            overlayId,
            additive,
        }: {
            overlayId: string;
            additive: boolean;
        }) => {
            const { mapOverlayArrayOnMap, selectedOverlayArray: current } =
                useOverlayStore.getState();

            const model = findOverlayLocation(mapOverlayArrayOnMap, overlayId)?.overlay;
            if (!model) {
                return;
            }

            if (!additive) {
                // A plain click selects this shape and nothing else.
                useOverlayStore.getState().setSelectedOverlayArray([model]);
                return;
            }

            // A shift-click adds the shape, or takes it out again.
            const isSelected = current.some((overlay) => overlay.id === overlayId);
            useOverlayStore.getState().setSelectedOverlayArray(
                isSelected
                    ? current.filter((overlay) => overlay.id !== overlayId)
                    : [...current, model]
            );
        };

        eventEmitter.on<{ overlayId: string; additive: boolean }>(
            EVENT.MAP_OVERLAY_SELECTED,
            handleOverlaySelected
        );

        return () => {
            eventEmitter.off<{ overlayId: string; additive: boolean }>(
                EVENT.MAP_OVERLAY_SELECTED,
                handleOverlaySelected
            );
        };
    }, []);

    /**
     * The highlight follows the selection.
     *
     * Markers keep their own highlight (they open their own dialog when
     * they are clicked), so they are left alone here.
     */
    useEffect(() => {
        const selectedIds = new Set(selectedOverlayArray.map((overlay) => overlay.id));

        Object.entries(nativeOverlayRegistry).forEach(([id, native]) => {
            if (native instanceof google.maps.marker.AdvancedMarkerElement) {
                return;
            }
            highlightShape(native, selectedIds.has(id));
        });
    }, [selectedOverlayArray, nativeOverlayRegistry]);
};
