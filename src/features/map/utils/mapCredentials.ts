import LocalStorageHelper from "@/utils/localStorageHelper";
import { API_KEY, GOOGLE_MAP_ID, MAP_LOCAL_STORAGE_KEYS } from "@/features/map/utils/constants";

/**
 * Google API keys always start with "AIza". Map IDs are hex strings, so this
 * prefix is enough to tell the two settings apart.
 */
const GOOGLE_API_KEY_PREFIX = "AIza";

/**
 * The key and the map ID the deployment itself is built with.
 *
 * Vite bakes `VITE_*` variables into the client bundle, so these are public
 * values - exactly like the API key in any browser application. They are the
 * *fallback*: a key the visitor saved in the settings panel always wins, and
 * these are only used when nothing has been saved.
 *
 * Set them as build-time environment variables of the deployment:
 *   Vercel project -> Settings -> Environment Variables
 *     VITE_GOOGLE_MAPS_API_KEY = AIza...
 *     VITE_GOOGLE_MAPS_MAP_ID  = <map id>
 * A change only reaches the site with the next build, because the values are
 * baked into the bundle.
 */
const DEFAULT_API_KEY = ((import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || "").trim();
const DEFAULT_MAP_ID = ((import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined) || "").trim();

export type GoogleMapCredentials = {
    /** The Google Maps API key used to load the Maps JavaScript API. */
    apiKey: string;
    /** The cloud-based map styling map ID. Optional. */
    mapId: string;
};

/**
 * The credentials the visitor saved in this browser, ignoring the deployment
 * defaults. Empty strings mean "nothing saved".
 *
 * The settings panel has always asked for both an API key and a map ID, but
 * for a long time the page only ever read the "Google Map ID" field and used
 * it as the API key. Some browsers therefore have an API key stored in the
 * map ID field. Both fields are inspected here and the key is recovered from
 * whichever one actually holds a key.
 */
export const readSavedMapCredentials = (): GoogleMapCredentials => {
    const savedSettings = LocalStorageHelper.loadSetting(MAP_LOCAL_STORAGE_KEYS.BASE_KEY);

    const savedApiKey = (savedSettings?.[API_KEY] || "").trim();
    const savedMapId = (savedSettings?.[GOOGLE_MAP_ID] || "").trim();

    // A key saved in the map ID field (the historical mix-up) is a key, not a
    // map ID, so it must not be passed on as one.
    const mapIdLooksLikeKey = savedMapId.startsWith(GOOGLE_API_KEY_PREFIX);

    return {
        apiKey: savedApiKey || (mapIdLooksLikeKey ? savedMapId : ""),
        mapId: mapIdLooksLikeKey ? "" : savedMapId,
    };
};

/**
 * The credentials the map page should use: what the visitor saved, or the
 * deployment's own key and map ID when they saved nothing.
 *
 * This has to be a *synchronous* read: the Maps JavaScript API is loaded
 * exactly once, by `<APIProvider>`, on the first render of the map page. If
 * the API key is not known at that moment the script is requested without a
 * key, and the API refuses every later request ("ApiProjectMapError").
 * Reading the key in an effect is therefore too late.
 */
export const readGoogleMapCredentials = (): GoogleMapCredentials => {
    const saved = readSavedMapCredentials();

    return {
        apiKey: saved.apiKey || DEFAULT_API_KEY,
        mapId: saved.mapId || DEFAULT_MAP_ID,
    };
};

/** The key and map ID the deployment itself was built with. */
export const readDeploymentMapCredentials = (): GoogleMapCredentials => ({
    apiKey: DEFAULT_API_KEY,
    mapId: DEFAULT_MAP_ID,
});

/** True when the deployment ships a key of its own. */
export const hasDeploymentMapCredentials = (): boolean => DEFAULT_API_KEY !== "";
