import LocalStorageHelper from "@/utils/localStorageHelper";
import { API_KEY, GOOGLE_MAP_ID, MAP_LOCAL_STORAGE_KEYS } from "@/features/map/utils/constants";

/**
 * Google API keys always start with "AIza". Map IDs are hex strings, so this
 * prefix is enough to tell the two settings apart.
 */
const GOOGLE_API_KEY_PREFIX = "AIza";

export type GoogleMapCredentials = {
    /** The Google Maps API key used to load the Maps JavaScript API. */
    apiKey: string;
    /** The cloud-based map styling map ID. Optional. */
    mapId: string;
};

/**
 * Read the Google Maps credentials from local storage.
 *
 * This has to be a *synchronous* read: the Maps JavaScript API is loaded
 * exactly once, by `<APIProvider>`, on the first render of the map page. If
 * the API key is not known at that moment the script is requested without a
 * key, and the API refuses every later request ("ApiProjectMapError").
 * Reading the key in an effect is therefore too late.
 *
 * The settings panel has always asked for both an API key and a map ID, but
 * for a long time the page only ever read the "Google Map ID" field and used
 * it as the API key. Some browsers therefore have an API key stored in the
 * map ID field. Both fields are inspected here and the key is recovered from
 * whichever one actually holds a key.
 */
export const readGoogleMapCredentials = (baseKey: string = MAP_LOCAL_STORAGE_KEYS.BASE_KEY): GoogleMapCredentials => {
    const savedSettings = LocalStorageHelper.loadSetting(baseKey);
    if (!savedSettings) {
        return { apiKey: "", mapId: "" };
    }

    const savedApiKey = (savedSettings[API_KEY] || "").trim();
    const savedMapId = (savedSettings[GOOGLE_MAP_ID] || "").trim();

    // A key saved in the map ID field (the historical mix-up) is a key, not a
    // map ID, so it must not be passed on as one.
    const mapIdLooksLikeKey = savedMapId.startsWith(GOOGLE_API_KEY_PREFIX);
    const apiKey = savedApiKey || (mapIdLooksLikeKey ? savedMapId : "");
    const mapId = mapIdLooksLikeKey ? "" : savedMapId;

    return { apiKey, mapId };
};
