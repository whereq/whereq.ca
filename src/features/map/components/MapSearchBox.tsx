/**
 * @file MapSearchBox.tsx
 *
 * The `/map` search box.
 *
 * The box itself is the shared `@whereq/react` `SearchBox`: the field, the
 * magnifier (which submits), the clear button, the suggestion dropdown, the
 * keyboard navigation and the ARIA wiring all live in the library, so every
 * whereq app gets the same control instead of a copy of it.
 *
 * This file is only the map-specific glue:
 *
 *   - the predictions, fetched through the modern Places API (the
 *     `google.maps.places.Autocomplete` widget was closed to new customers on
 *     March 1, 2025 and no longer renders its list — see `hooks/useMapSearch.ts`);
 *   - what happens with the result: a picked place becomes a marker on the
 *     map, free text is geocoded by the host.
 */
import React from "react";
import { SearchBox } from "@whereq/react";
import { useMapSearch, type ResolvedMapPlace } from "@/features/map/hooks/useMapSearch";

interface MapSearchBoxProps {
    /** Called with the place the user picked from the suggestion list. */
    onSelectPlace: (place: ResolvedMapPlace) => void;
    /**
     * Called when the user submits free text (Enter, or the magnifier)
     * without picking a suggestion. The host decides what to do with it —
     * the map feature geocodes it.
     */
    onSubmitText?: (text: string) => void;
}

/**
 * The MetroUI look of the panel's search box, expressed as the library's
 * `--wq-search-*` tokens. The values are the ones the box used before it
 * moved into the library, so the panel looks exactly the same.
 */
const MAP_SEARCH_THEME = {
    fieldBg: "#1f2937",          // gray-800
    fieldBorder: "#374151",      // gray-700
    fieldBorderFocus: "rgba(249, 115, 22, 0.6)", // orange-500/60
    text: "#f0e6c8",             // metro-text
    placeholder: "#6b7280",      // gray-500
    icon: "#9ca3af",             // gray-400
    iconHover: "#f97316",        // orange-500
    listBg: "#161b27",           // gray-900 / metro-bg
    listBorder: "#374151",       // gray-700
    listText: "#f0e6c8",         // metro-text
    listDescription: "#8b949e",  // metro-text-muted
    listActiveBg: "#1f2937",     // gray-800
    listActiveText: "#fdba74",   // orange-300
    radius: "4px",               // rounded
    // shadow-xl
    shadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    fontSize: "14px",            // text-sm
};

const MapSearchBox: React.FC<MapSearchBoxProps> = ({ onSelectPlace, onSubmitText }) => {
    const {
        query,
        setQuery,
        suggestions,
        loading,
        selectSuggestion,
        applyResolvedPlace,
    } = useMapSearch();

    /**
     * A suggestion was picked: resolve it into a place and hand it to the
     * host, which drops a marker on the map.
     */
    const handleSelect = async (suggestion: { key: string }) => {
        const match = suggestions.find((item) => item.key === suggestion.key);
        if (!match) {
            return;
        }
        const resolved = await selectSuggestion(match);
        if (!resolved) {
            return;
        }
        applyResolvedPlace(resolved);
        onSelectPlace(resolved);
    };

    return (
        <SearchBox
            inputId="mapSearch"
            value={query}
            onChange={setQuery}
            loading={loading}
            placeholder="Search addresses & places"
            theme={MAP_SEARCH_THEME}
            suggestions={suggestions.map((suggestion) => ({
                key: suggestion.key,
                label: suggestion.main,
                description: suggestion.secondary,
            }))}
            onSelect={handleSelect}
            onSubmit={(text) => onSubmitText?.(text)}
        />
    );
};

export default MapSearchBox;
