/**
 * @file useMapSearch.ts
 *
 * Places Autocomplete for the `/map` search box — modern API only.
 *
 * `google.maps.places.Autocomplete` was closed to new customers on
 * March 1, 2025. Google still loads the class and still answers its
 * prediction requests, but it no longer renders the suggestion list: the
 * `.pac-container` stays empty and `display:none`, so the user gets a search
 * box that silently drops every suggestion.
 *
 * The replacement is `AutocompleteSuggestion.fetchAutocompleteSuggestions`,
 * which returns the predictions as plain data. We render the list ourselves
 * (see `components/MapSearchBox.tsx`), which also lets the UI follow the
 * MetroUI dark palette instead of the stock Google dropdown.
 *
 * Billing: Places Autocomplete is a billable API. Every keystroke is one
 * request unless it is covered by an autocomplete session token, so a token
 * is opened on the first keystroke and kept until a place is picked (or the
 * box is emptied). One search session is billed as one request.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

/** One entry in the suggestion list. */
export interface MapSuggestion {
    /** Stable React key — the Google place id. */
    key: string;
    /** The place name ("Cafe"). */
    main: string;
    /** The disambiguating context ("Toronto, ON, Canada"). */
    secondary: string;
    /** The Google prediction, needed to resolve the place on selection. */
    prediction: google.maps.places.PlacePrediction;
}

/** A prediction resolved into a coordinate pair. */
export interface ResolvedMapPlace {
    /** The place name. */
    title: string;
    /** The formatted address. */
    address: string;
    lat: number;
    lng: number;
    /** The Google place id. */
    placeId: string;
}

/** How long the box waits after the last keystroke before asking Google. */
const DEFAULT_DEBOUNCE_MS = 250;

/** How many suggestions are shown at most. */
const MAX_SUGGESTIONS = 6;

export const useMapSearch = (debounceMs: number = DEFAULT_DEBOUNCE_MS) => {
    const placesLib = useMapsLibrary("places");

    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<MapSuggestion[]>([]);
    const [loading, setLoading] = useState(false);

    /** One autocomplete session per search, so the whole session is billed once. */
    const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
    /** Guards against a slow, older response overwriting a newer one. */
    const requestIdRef = useRef(0);
    /** Set when the query was changed by the app itself (selection), not by typing. */
    const skipNextFetchRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        // Every query change invalidates the request that may still be in
        // flight, so a slow answer for an older query can never land.
        const requestId = ++requestIdRef.current;

        const input = query.trim();

        // The app just filled the box in (a place was picked): the query is no
        // longer a user request, so it must not trigger another lookup.
        if (skipNextFetchRef.current) {
            skipNextFetchRef.current = false;
            return;
        }

        // An empty box ends the session.
        if (!input) {
            sessionRef.current = null;
            return;
        }

        timerRef.current = setTimeout(async () => {
            // The Places library may still be loading, or the browser may not
            // have it at all.
            if (!placesLib?.AutocompleteSuggestion) {
                if (requestId === requestIdRef.current) {
                    setSuggestions([]);
                    setLoading(false);
                }
                return;
            }

            try {
                if (!sessionRef.current && placesLib.AutocompleteSessionToken) {
                    sessionRef.current = new placesLib.AutocompleteSessionToken();
                }

                const { suggestions: results } =
                    await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
                        input,
                        sessionToken: sessionRef.current ?? undefined,
                    });

                // A newer keystroke already went out — this answer is stale.
                if (requestId !== requestIdRef.current) {
                    return;
                }

                const list: MapSuggestion[] = results
                    .map((result) => result.placePrediction)
                    .filter((prediction): prediction is google.maps.places.PlacePrediction => !!prediction)
                    .slice(0, MAX_SUGGESTIONS)
                    .map((prediction) => ({
                        key: prediction.placeId,
                        main: prediction.mainText?.text ?? prediction.text.text,
                        secondary: prediction.secondaryText?.text ?? "",
                        prediction,
                    }));

                setSuggestions(list);
            } catch {
                if (requestId !== requestIdRef.current) {
                    return;
                }
                // A failed prediction call must not break the search box.
                setSuggestions([]);
            } finally {
                if (requestId === requestIdRef.current) {
                    setLoading(false);
                }
            }
        }, debounceMs);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [query, placesLib, debounceMs]);

    /**
     * The query the user typed. Everything that clears the suggestion list
     * happens here rather than in an effect, so the list never lags behind
     * the text in the box.
     */
    const updateQuery = useCallback((value: string) => {
        setQuery(value);

        if (value.trim()) {
            setLoading(true);
            return;
        }

        // An empty box closes the session and the list.
        sessionRef.current = null;
        setSuggestions([]);
        setLoading(false);
    }, []);

    /**
     * Resolve a prediction into coordinates.
     *
     * `toPlace()` + `fetchFields()` is the modern equivalent of the old
     * `getPlace()`: it returns the place fields (location, address) and ends
     * the autocomplete session, so the whole search is billed as one session.
     */
    const selectSuggestion = useCallback(async (suggestion: MapSuggestion): Promise<ResolvedMapPlace | null> => {
        try {
            const place = suggestion.prediction.toPlace();
            await place.fetchFields({
                fields: ["id", "displayName", "formattedAddress", "location"],
            });

            const location = place.location;
            if (!location) {
                return null;
            }

            const resolved: ResolvedMapPlace = {
                title: place.displayName || suggestion.main,
                address: place.formattedAddress || suggestion.secondary,
                lat: location.lat(),
                lng: location.lng(),
                placeId: place.id || suggestion.prediction.placeId,
            };

            // Picking a place ends the session; the next keystroke opens a new one.
            sessionRef.current = null;
            setSuggestions([]);
            setLoading(false);

            return resolved;
        } catch {
            return null;
        }
    }, []);

    /** Put the resolved place into the input without triggering a new lookup. */
    const applyResolvedPlace = useCallback((place: ResolvedMapPlace) => {
        skipNextFetchRef.current = true;
        setQuery(place.address || place.title);
    }, []);

    return {
        query,
        setQuery: updateQuery,
        suggestions,
        loading,
        selectSuggestion,
        applyResolvedPlace,
    };
};
