import { LocalSetting } from "@/models/LocalSetting"
import { DEFAULT_LOCAL_SETTINGS } from "./constants";
import { LOCAL_SETTINGS_ENDPOINT } from "./constants";

export const loadDefaultLocalSettings = () => {
    return [...DEFAULT_LOCAL_SETTINGS];
};


/**
 * Get local settings for a given endpoint URL.
 * 1. If `endpointUrl` is invalid, return an empty array.
 * 2. If no settings exist for the URL, save default settings to local storage and return them.
 * 3. If settings exist, return them.
 */
export const getLocalSettings = (endpointUrl: string | undefined): LocalSetting[] => {
    if (!endpointUrl) {
        return [];
    }

    const settings = localStorage.getItem(LOCAL_SETTINGS_ENDPOINT);
    const parsedSettings = settings ? JSON.parse(settings) : {};

    if (!parsedSettings[endpointUrl]) {
        // No settings for this URL; initialize with defaults
        const defaultSettings = loadDefaultLocalSettings();
        parsedSettings[endpointUrl] = defaultSettings;
        localStorage.setItem(LOCAL_SETTINGS_ENDPOINT, JSON.stringify(parsedSettings));
        return defaultSettings;
    }

    // Return existing settings for the endpoint URL
    return parsedSettings[endpointUrl];
};


export const updateLocalSetting = (endpointUrl: string, key: string, value: string | boolean) => {
    const settings = localStorage.getItem(LOCAL_SETTINGS_ENDPOINT);
    const parsedSettings = settings ? JSON.parse(settings) : {};

    // Find or initialize settings for the endpoint
    if (!parsedSettings[endpointUrl]) {
        parsedSettings[endpointUrl] = loadDefaultLocalSettings();
    }

    const updatedSettings = parsedSettings[endpointUrl].map((row: LocalSetting) =>
        row.key === key ? { ...row, value } : row
    );

    parsedSettings[endpointUrl] = updatedSettings;
    localStorage.setItem(LOCAL_SETTINGS_ENDPOINT, JSON.stringify(parsedSettings));
};