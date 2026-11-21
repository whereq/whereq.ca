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
 *
 * The shape of the box follows whereq.com's sidebar search: one bordered
 * field with a leading magnifier, a clear (×) on the right and the
 * suggestion list as a single dropdown attached to the field. The magnifier
 * is the submit control — free text is geocoded — so there is no separate
 * "Search" button sitting next to the field.
 */
import React, { useEffect, useRef } from "react";
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
    /** The input element id. */
    inputId?: string;
    placeholder?: string;
    /** Extra classes for the input element. */
    inputClassName?: string;
    /** Extra classes for the bordered field that wraps the input. */
    boxClassName?: string;
    /** Extra classes for the wrapper element. */
    className?: string;
}

/** The magnifier that submits the search. */
const SearchIcon: React.FC = () => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
    </svg>
);

const MapSearchBox: React.FC<MapSearchBoxProps> = ({
    onSelectPlace,
    onSubmitText,
    inputId = "mapSearch",
    placeholder = "Search addresses & places",
    inputClassName = "",
    // The field fills the panel it sits in — the tool bar below it sets the
    // width, and a field narrower than that leaves a dead gap on the right.
    boxClassName = "w-full",
    className = "",
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
    const inputRef = useRef<HTMLInputElement | null>(null);
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
        const text = query.trim();
        if (!text) {
            return;
        }
        onSubmitText?.(text);
    };

    /** Empty the box: the hook closes the autocomplete session with it. */
    const clear = () => {
        setQuery("");
        inputRef.current?.focus();
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
        <div ref={wrapperRef} className={`relative w-full ${className}`}>
            {/* The field: magnifier, input, clear. One bordered control, the
                way whereq.com's sidebar search reads. */}
            <div
                className={`flex items-center gap-2 rounded border border-gray-700 bg-gray-800
                            px-2 py-1.5 transition-colors focus-within:border-orange-500/60 ${boxClassName}`}
            >
                <button
                    type="button"
                    onClick={submit}
                    aria-label="Search"
                    title="Search"
                    className="shrink-0 text-gray-400 transition-colors hover:text-orange-500"
                >
                    <SearchIcon />
                </button>
                <input
                    id={inputId}
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-label={placeholder}
                    aria-activedescendant={
                        isOpen && highlightedIndex >= 0 ? `${listId}-option-${highlightedIndex}` : undefined
                    }
                    placeholder={placeholder}
                    className={`min-w-0 flex-1 bg-transparent text-left text-sm text-metro-text
                                placeholder-gray-500 focus:outline-none ${inputClassName}`}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                />
                {query && (
                    <button
                        type="button"
                        onClick={clear}
                        aria-label="Clear search"
                        title="Clear search"
                        className="shrink-0 text-base leading-none text-gray-500 transition-colors hover:text-metro-text"
                    >
                        &times;
                    </button>
                )}
            </div>

            {isOpen && (
                <ul
                    id={listId}
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto
                                rounded border border-gray-700 bg-gray-900 shadow-xl"
                >
                    {suggestions.map((suggestion, index) => (
                        <li
                            key={suggestion.key}
                            id={`${listId}-option-${index}`}
                            role="option"
                            aria-selected={index === highlightedIndex}
                            className={`cursor-pointer px-3 py-2 text-left ${
                                index === highlightedIndex
                                    ? "bg-gray-800"
                                    : "hover:bg-gray-800/60"
                            }`}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            onMouseDown={(event) => {
                                // Keep the input focused, then pick the place.
                                event.preventDefault();
                                void pick(index);
                            }}
                        >
                            <span
                                className={`block text-sm ${
                                    index === highlightedIndex ? "text-orange-300" : "text-metro-text"
                                }`}
                            >
                                {suggestion.main}
                            </span>
                            {suggestion.secondary && (
                                <span className="block text-xs text-metro-text-muted">
                                    {suggestion.secondary}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {loading && (
                <div
                    className="absolute left-0 right-0 top-full z-40 mt-1 rounded border border-gray-700
                                bg-gray-900 px-3 py-2 text-xs text-metro-text-muted shadow"
                >
                    Searching…
                </div>
            )}
        </div>
    );
};

export default MapSearchBox;
