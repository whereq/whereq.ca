import { NetworkInformation } from "@/models/NetworkInformation";
import { ResponseCookie } from "@/models/ResponseCookie";
import { RestfulEndpoint } from "@/models/RestfulEndpoint";
import { CORS_HINT } from "@/utils/constants";
import { GLOBAL_SETTINGS_KEYS, LOCAL_SETTINGS_KEYS } from "@/utils/constants";
import { getLocalSettings } from "@/utils/localSettingsLoader";

// Utility function to parse cookies from a Set-Cookie header
export const parseCookies = (cookieHeader: string): ResponseCookie[] => {
    return cookieHeader.split(";").map((cookieStr) => {
        const [nameValue, ...attributes] = cookieStr.split(";").map((s) => s.trim());
        const [name, value] = nameValue.split("=");
        const cookie: ResponseCookie = { Name: name, Value: value };

        attributes.forEach((attr) => {
            const [attrKey, attrValue] = attr.split("=");
            switch (attrKey.toLowerCase()) {
                case "domain":
                    cookie.Domain = attrValue;
                    break;
                case "path":
                    cookie.Path = attrValue;
                    break;
                case "expires":
                    cookie.Expires = attrValue;
                    break;
                case "httponly":
                    cookie.HttpOnly = "true";
                    break;
                case "secure":
                    cookie.Secure = "true";
                    break;
                default:
                    break;
            }
        });

        return cookie;
    });
};

// Function to build the request options
export const buildRequestOptions = (endpoint: RestfulEndpoint, updatedHeaders: Record<string, string>): RequestInit => {
    const options: RequestInit = {
        method: endpoint.method,
        headers: { ...updatedHeaders },
        body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
    };

    // Add authorization header if present
    if (endpoint.authorization?.type === "Bearer" && endpoint.authorization.token) {
        options.headers = {
            ...options.headers,
            Authorization: `Bearer ${endpoint.authorization.token}`,
        };

        // Include credentials if authorization is used
        options.credentials = "include";
    }

    // Only add `credentials` if explicitly required (e.g., when cookies are needed)
    if (endpoint.requiresCredentials) {
        options.credentials = "include";
    }

    return options;
};

// Function to handle errors and return troubleshooting steps
export const handleError = () => {
    return CORS_HINT;
};

/**
 * Popup a modal to inform the user of an error.
 */
const showModal = (message: string) => {
    // Replace this with your modal implementation
    alert(message);
};

// Function to send the request
export const sendRequest = async (
    endpoint: RestfulEndpoint,
    updatedParams: Record<string, string>,
    updatedHeaders: Record<string, string>
) => {
    try {
        const startTime = Date.now();
        let proxyUrl: string | null = null;

        // Fetch local settings for the given endpoint URL
        const localSettings = getLocalSettings(endpoint.url);

        // Check if proxy request is enabled in local settings
        const proxyRequestSetting = localSettings.find(
            (setting) => setting.key === LOCAL_SETTINGS_KEYS.PROXY_REQUEST
        );
        const isProxyEnabled = proxyRequestSetting?.value === true;

        if (isProxyEnabled) {
            // Get the local HTTP proxy setting
            const localProxySetting = localSettings.find(
                (setting) => setting.key === LOCAL_SETTINGS_KEYS.HTTP_PROXY
            );
            proxyUrl = localProxySetting?.value as string;

            if (!proxyUrl) {
                // Fallback to global HTTP proxy setting
                const globalSettings = localStorage.getItem(GLOBAL_SETTINGS_KEYS.HTTP_PROXY);
                proxyUrl = globalSettings ? JSON.parse(globalSettings) : null;

                if (!proxyUrl) {
                    // Popup modal if no valid proxy is available
                    showModal(
                        "Proxy request was enabled, but no valid proxy is configured in local or global settings."
                    );
                    return {
                        error: "No valid proxy available.",
                        status: "Status: Error",
                    };
                }
            }

            // Ensure the proxy URL ends with a '/'
            if (proxyUrl && !proxyUrl.endsWith('/')) {
                proxyUrl += '/';
            }
        }

        // Replace placeholders in the endpoint URL with values from updatedParams
        const pathParamRegex = /\{(\w+)\}/g; // Match placeholders like {paramName}
        const evaluatedUrl = endpoint.url.replace(pathParamRegex, (_, paramName) => {
            return updatedParams[paramName] || `{${paramName}}`; // Replace with value if available, otherwise leave the placeholder
        });

        const url = new URL(evaluatedUrl);

        // Append updated query parameters to the URL
        Object.keys(updatedParams).forEach((key) =>
            url.searchParams.append(key, updatedParams[key])
        );

        // If a proxy URL is available, use it to fetch the target URL
        const fetchUrl = proxyUrl ? proxyUrl + url : url.toString();

        const options = buildRequestOptions(endpoint, updatedHeaders);
        const res = await fetch(fetchUrl, options);

        if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
        }

        const data = await res.json();
        const cookieHeader = res.headers.get("set-cookie");
        const parsedCookies = cookieHeader ? parseCookies(cookieHeader) : [];

        const headers: Record<string, string> = {};
        res.headers.forEach((value, key) => {
            headers[key] = value;
        });

        const responseTime = Date.now() - startTime;
        const networkInformation: NetworkInformation = {
            agent: navigator.userAgent,
            responseTime: responseTime,
            headers: headers,
            status: res.status.toString(),
            statusText: res.statusText,
        };

        return {
            data,
            cookies: parsedCookies,
            networkInformation,
        };
    } catch (error) {
        console.error(error);
        return {
            error: handleError(),
            status: "Status: Error",
        };
    }
};
