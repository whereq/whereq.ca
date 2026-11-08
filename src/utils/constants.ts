import { LocalSetting } from "@/models/LocalSetting";

export const TAB_TYPES = {
    PARAMETERS: "Parameters",
    HEADERS: "Headers",
};

export const PLACEHOLDERS = {
    HEADER_NAME: "Header Name",
    PARAM_KEY: "Key",
};

export const LABELS = {
    VALUE: "Value",
    DESCRIPTION: "Description",
    ACTION: "Action",
    RESPONSE: "Response",
};

export const DEFAULT_ROW = {
    SELECTED: false,
    KEY: "",
    VALUE: "",
    DESCRIPTION: "",
};

export const RESPONSE_TYPE = {
    JSON: "json",
    TEXT: "text",
    MARKDOWN: "markdown",
    BLOB: "blob",
    ARRAY_BUFFER: "arrayBuffer",
}

export const APPLICATION_NAME = 'WhereQ Lab';
export const LOCAL_STORAGE_APPLICATION_NAME = 'WhereQ_App_Hub';

export const PUBLIC_API_YAML = "https://github.com/whereq/whereq.ca/blob/main/src/resources/public-api/public-api.yaml";

export const LOCAL_SETTINGS_ENDPOINT = "Local_Settings_Endpoint";
export const GLOBAL_SETTINGS = "Global_Settings";
export const GLOBAL_SETTINGS_KEYS = {  
    HTTP_PROXY: "HTTP Proxy",
}

export const LOCAL_SETTINGS_KEYS = {  
    PROXY_REQUEST: "Proxy Request",
    HTTP_PROXY: "HTTP Proxy",
    API_TIMEOUT: "api_timeout",
    Enable_SSL_Certificate_Verification: "Enable SSL Certificate Verification",
    Automatically_Follow_Redirects: "Automatically Follow Redirects",
    Maximum_Number_of_Redirects: "Maximum Number of Redirects",
}

export const DEFAULT_LOCAL_SETTINGS: LocalSetting[] = [
    {
        key: LOCAL_SETTINGS_KEYS.PROXY_REQUEST,
        keyName: "Proxy Request",
        value: false,
        valueType: "boolean",
    },
    {
        key: LOCAL_SETTINGS_KEYS.HTTP_PROXY,
        keyName: "HTTP Proxy",
        value: "http://127.0.0.1:7777",
        valueType: "string",
    },
    {
        key: LOCAL_SETTINGS_KEYS.API_TIMEOUT,
        keyName: "API Timeout (ms)",
        value: "5000",
        valueType: "number",
    },
];

export const EVENT = {
    MAP_WORKSPACE_MY_MAP_CLICK: "map_workspace_my_map_click",
}

export const LOCAL_APP_EVENTS = "Local_App_Events";
export const LOCAL_APP_EVENTS_KEYS = {
    MAP: "Map",
    REQUEST: "Request",
    RESPONSE: "Response",
    ERROR: "Error",
}
export const LOCAL_STORAGE_KEYS = {
    PARAMS: "params",
    HEADERS: "headers",
    ENDPOINT: "endpoint",
    LOCAL_SETTINGS: "localSettings",
    LOCAL_APP_EVENTS: LOCAL_APP_EVENTS,
    MAP: "Map",
}

export const CORS_HINT =
    `
## Troubleshooting Steps
1. **Endpoint Availability**: 
   - The error most likely relates to the endpoint you are trying to request being unavailable. 
   - Try opening the endpoint URL directly in your browser to see if it is still accessible.

2. **CORS Restrictions**:
   - If the endpoint is accessible in the browser, the issue might be due to CORS (Cross-Origin Resource Sharing) restrictions.
   - Refer to [https://whereq.github.io/2024/12/19/Run-a-Proxy-Server-with-cors-anywhere/](https://whereq.github.io/2024/12/19/Run-a-Proxy-Server-with-cors-anywhere/) to set up a local proxy server.
   - Once the proxy is set up, modify your request to use the proxy URL.

3. **Network Issues**:
   - Ensure your network connection is stable and that there are no firewall or proxy restrictions blocking the request.
`;