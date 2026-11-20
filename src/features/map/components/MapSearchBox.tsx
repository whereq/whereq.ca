/**
 * @file MapSearchBox.tsx
 *
 * The `/map` search box: an input plus a suggestion list rendered by us.
 *
 * The suggestion list used to be Google's own dropdown (the
 * `google.maps.places.Autocomplete` widget). That widget was closed to new
 * customers on March 1, 2025 and no longer renders its list, so the
 * predictions are fetched through the modern API (`useMapSearch`) and drawn
 * here — which also keeps the panel in the MetroUI dark palette.
 */
import React, { useEffect, useRef } from "react";
import { useMapSearch, type ResolvedMapPlace } from "@/features/map/hooks/useMapSearch";

interface MapSearchBoxProps {
    /** Called with the place the user picked from the suggestion list. */
    onSelectPlace: (place: ResolvedMapPlace) => void;
    /**
     * Called when the user submits free text (Enter, or the Search button)
     * without picking a suggestion. The host decides what to do with it —
     * the map feature geocodes it.
     */
    onSubmitText?: (text: string) => void;
    /** The input element id. */
    inputId?: string;
    placeholder?: string;
    /** Extra classes for the input element. */
    inputClassName?: string;
    /** Extra classes for the wrapper element. */
    className?: string;
    /** Show a Search button next to the input. */
    showSearchButton?: boolean;
}

const MapSearchBox: React.FC<MapSearchBoxProps> = ({
    onSelectPlace,
    onSubmitText,
    inputId = "mapSearch",
    placeholder = "Search Google Maps",
    inputClassName = "w-64",
    className = "",
    showSearchButton = false,
}) => {
    const {
        query,
        setQuery,
        suggestions,
        loading,
        highlightedIndex,
        setHighlightedIndex,
        selectSuggestion,
        applyResolvedPlace,
        clearSuggestions,
        moveHighlight,
    } = useMapSearch();

    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const listId = `${inputId}-suggestions`;

    /** Pick a suggestion and hand the resolved place to the host. */
    const pick = async (index: number) => {
        const suggestion = suggestions[index];
        if (!suggestion) {
            return;
        }
        const resolved = await selectSuggestion(suggestion);
        if (!resolved) {
            return;
        }
        applyResolvedPlace(resolved);
        onSelectPlace(resolved);
    };

    /** Submit whatever is in the box: a suggestion if one is picked, free text otherwise. */
    const submit = () => {
        if (suggestions.length > 0 && highlightedIndex >= 0) {
            void pick(highlightedIndex);
            return;
        }
        onSubmitText?.(query.trim());
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                moveHighlight(1);
                break;
            case "ArrowUp":
                event.preventDefault();
                moveHighlight(-1);
                break;
            case "Enter":
                event.preventDefault();
                submit();
                break;
            case "Escape":
                event.preventDefault();
                clearSuggestions();
                break;
            default:
                break;
        }
    };

    // Close the list when the user clicks anywhere else.
    useEffect(() => {
        const onPointerDown = (event: MouseEvent) => {
            if (!wrapperRef.current?.contains(event.target as Node)) {
                clearSuggestions();
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [clearSuggestions]);

    const isOpen = suggestions.length > 0;

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <div className="flex items-center space-x-1">
                <input
                    id={inputId}
                    type="text"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={
                        isOpen && highlightedIndex >= 0 ? `${listId}-option-${highlightedIndex}` : undefined
                    }
                    placeholder={placeholder}
                    className={`bg-gray-800 text-orange-500 text-sm p-1 focus:outline-none ${inputClassName}`}
                    style={{ fontFamily: "Fira Code, monospace" }}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                />
                {showSearchButton && (
                    <button
                        type="button"
                        onClick={submit}
                        className="bg-gray-700 p-1 text-sm hover:bg-gray-600"
                    >
                        Search
                    </button>
                )}
            </div>

            {isOpen && (
                <ul
                    id={listId}
                    role="listbox"
                    className="absolute left-0 top-full mt-1 z-50 w-64 max-h-64 overflow-y-auto rounded border border-orange-500/40 bg-gray-900 shadow-lg"
                >
                    {suggestions.map((suggestion, index) => (
                        <li
                            key={suggestion.key}
                            id={`${listId}-option-${index}`}
                            role="option"
                            aria-selected={index === highlightedIndex}
                            className={`cursor-pointer px-2 py-1 text-sm ${
                                index === highlightedIndex
                                    ? "bg-gray-700 text-orange-300"
                                    : "text-gray-300 hover:bg-gray-800"
                            }`}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            onMouseDown={(event) => {
                                // Keep the input focused, then pick the place.
                                event.preventDefault();
                                void pick(index);
                            }}
                        >
                            <span className="block text-orange-400">{suggestion.main}</span>
                            {suggestion.secondary && (
                                <span className="block text-xs text-gray-400">{suggestion.secondary}</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {loading && (
                <div className="absolute left-0 top-full mt-1 z-40 rounded bg-gray-900 px-2 py-1 text-xs text-gray-400 shadow">
                    Searching…
                </div>
            )}
        </div>
    );
};

export default MapSearchBox;
