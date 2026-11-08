import { useEffect } from "react";
import { MAP_EVENT } from "@/features/map/utils/constants";
import { handleSearch } from "@/features/map/utils/mapHandlers";
import { usePlaceStore, useOverlayStore } from "@/features/map/store/mapStore";

export const useMapSearch = (
    inputRef: React.RefObject<HTMLInputElement | null>,
    onPlaceSelected: (address: string) => void
) => {
    const { setPlaceMapOverlay } = usePlaceStore();
    const { setClickedOverlay } = useOverlayStore();

    useEffect(() => {
        let autocompleteInstance: google.maps.places.Autocomplete | null = null;
        let listener: google.maps.MapsEventListener | null = null;

        const initializeAutocomplete = () => {
            if (window.google && window.google.maps && window.google.maps.places && inputRef.current) {
                autocompleteInstance = new google.maps.places.Autocomplete(inputRef.current, {
                    types: ["geocode"],
                });

                listener = autocompleteInstance.addListener(MAP_EVENT.PLACE_CHANGED, () => {
                    const selectedPlace = autocompleteInstance?.getPlace();
                    if (selectedPlace && selectedPlace.formatted_address) {
                        onPlaceSelected(selectedPlace.formatted_address);
                        handleSearch({
                            searchText: selectedPlace.formatted_address,
                            autoCompleteInstance: autocompleteInstance,
                            setPlaceMapOverlay,
                            setClickedOverlay,
                        });
                    }
                });
            }
        };

        initializeAutocomplete();

        // Cleanup function
        return () => {
            if (listener) {
                google.maps.event.removeListener(listener);
            }
            if (autocompleteInstance) {
                autocompleteInstance.unbindAll();
            }
        };
    }, [inputRef, setPlaceMapOverlay, setClickedOverlay, onPlaceSelected]); // Removed searchText from dependencies

    return {};
};