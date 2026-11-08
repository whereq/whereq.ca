export const Module_Name = "Map";

export const MAP_CENTER = {
    lat: 43.6532,
    lng: -79.3832, // Default center: Toronto, Canada
};

export const DEFAULT_CITY = "Toronto, Ontario, Canada";
export const DEFAULT_PROVINCE = ", Ontario, Canada";

export const MAX_RECENT_SEARCHES = 100;

// Local Storage Keys
export const MAP_LOCAL_STORAGE_KEYS = {  
    BASE_KEY: "Map-Setting",
    PLACES: "PLACES",
    RECENT_SEARCHES: "RECENT_SEARCHES",
}

export const MAP_EVENT = {
    CLICK: "click",
    PLACE_CHANGED: "place_changed",
}

export const MAP_DRAWING_COLOR = {
    DEFAULT_STROKE_COLOR: "#343A40",
    DEFAULT_FILL_COLOR: "#343A4080",
    HIGHLIGHT_STROKE_COLOR: "#FFA500",
    HIGHLIGHT_FILL_COLOR: "#FFA50080",
}

// Settings
export const API_KEY = "API Key";
export const GOOGLE_MAP_ID = "Google Map ID";

// Default Marker PinElement
export const DEFAULT_MARKER_PinElement = {
    background: "#FFA500", // Orange background for default state
    borderColor: "#137333", // Green border
    glyphColor: "#FFFFFF", // White glyph (icon)
};

export const ENTRY_LIMITS = {
    MAX_TITLE_LENGTH: 37,
    MAX_TITLE_LENGTH_SMALL: 17,
};