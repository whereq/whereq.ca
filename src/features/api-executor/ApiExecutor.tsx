import { useEffect, useState } from "react";
import { RestfulEndpoint } from "@/models/RestfulEndpoint";
import { TitleBar } from "./title-bar/TitleBar";
import { UrlPanel } from "./request-panel/UrlPanel/UrlPanel";
import { RequestPanel } from "@/features/api-executor/request-panel/RequestPanel";
import { ResponseContent } from "@/models/ResponseContent";
import { ResponsePanel } from "@/features/api-executor/response-panel/ResponsePanel";
import { ResponseCookie } from "@/models/ResponseCookie";
import { sendRequest } from "./apiExecutorUtil"; // Import sendRequest
import { NetworkInformation } from "@/models/NetworkInformation";
import LocalStorageHelper from "@/utils/localStorageHelper"; // Import LocalStorageHelper

export const ApiExecutor = ({ endpoint }: { endpoint?: RestfulEndpoint | null }) => {
    const [updatedParams, setUpdatedParams] = useState<Record<string, string>>({});
    const [updatedHeaders, setUpdatedHeaders] = useState<Record<string, string>>({});
    const [updatedUrl, setUpdatedUrl] = useState(endpoint?.url || "");
    const [requestPanelHeight, setRequestPanelHeight] = useState(30);
    const [isResizing, setIsResizing] = useState(false);
    const [response, setResponse] = useState<ResponseContent | null>(null);
    const [cookies, setCookies] = useState<ResponseCookie[]>([]);
    const [headers, setHeaders] = useState<Record<string, string>>({});
    const [status, setStatus] = useState<string | null>(null);
    const [responseTime, setResponseTime] = useState<number | null>(null);
    const [networkInfo, setNetworkInfo] = useState<NetworkInformation | undefined>(undefined);

    // Load params and headers from local storage based on endpoint.url
    useEffect(() => {
        if (endpoint) {
            const storedParams = LocalStorageHelper.getParams(endpoint.url);
            const params = storedParams ? storedParams : endpoint.params || {};
            // Save default params to local storage if not found
            if (!storedParams) {
                LocalStorageHelper.setParams(endpoint.url, params);
            }

            // Save default headers to local storage if not found
            const storedHeaders = LocalStorageHelper.getHeaders(endpoint.url);
            const headers = storedHeaders ? storedHeaders : endpoint.headers || {};
            if (!storedHeaders) {
                LocalStorageHelper.setHeaders(endpoint.url, headers);
            }

            setUpdatedParams(params);
            setUpdatedHeaders(headers);
            setUpdatedUrl(endpoint.url.toString());
            setResponse(null);

            
        } else {
            setUpdatedUrl("");
            setUpdatedParams({});
            setUpdatedHeaders({});
            setResponse(null);
        }
    }, [endpoint]);

    const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing) return;
        const panel = document.querySelector(".api-executor") as HTMLElement;
        const totalHeight = panel.getBoundingClientRect().height;
        const newMiddleHeight = ((e.clientY - panel.offsetTop) / totalHeight) * 100;
        if (newMiddleHeight > 10 && newMiddleHeight < 80) {
            setRequestPanelHeight(newMiddleHeight);
        }
    };

    const stopResizing = () => {
        setIsResizing(false);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", stopResizing);
    };

    const startResizing = () => {
        setIsResizing(true);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", stopResizing);
    };

    const handleSendRequest = async () => {
        if (!endpoint) return;

        let evaluatedUrl = endpoint.url;
        const pathParamRegex = /\{(\w+)\}/g;

        evaluatedUrl = evaluatedUrl.replace(pathParamRegex, (_, paramName) => {
            return updatedParams[paramName] || `{${paramName}}`;
        });

        const updatedEndpoint = {
            ...endpoint,
            url: evaluatedUrl,
        };

        // Use params and headers from local storage or fallback to defaults
        const storedParams = LocalStorageHelper.getParams(endpoint.url);
        const storedHeaders = LocalStorageHelper.getHeaders(endpoint.url);

        const params = storedParams ? storedParams : endpoint.params || {};
        const headers = storedHeaders ? storedHeaders : endpoint.headers || {};

        const result = await sendRequest(updatedEndpoint, params, headers);

        if (result.error) {
            setResponse({ type: "markdown", content: result.error });
            setStatus(result.status);
        } else {
            setResponse({ type: "json", content: result.data });
            setCookies(result.cookies || []);
            setHeaders(result.networkInformation?.headers || {});
            setStatus(result.networkInformation?.status ?? null);
            setResponseTime(result.networkInformation?.responseTime || 0);
            setNetworkInfo(result.networkInformation || undefined);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-800 text-orange font-fira-code">
            <TitleBar title={endpoint?.title || "Select an endpoint to start"} />
            <UrlPanel url={updatedUrl} onSendRequest={handleSendRequest} />
            <RequestPanel
                restfulEndpoint={endpoint ?? undefined}
                onResize={startResizing}
                style={{ height: `${requestPanelHeight}%` }}
                initialParams={updatedParams}
                initialHeaders={updatedHeaders}
            />
            <ResponsePanel
                height={100 - requestPanelHeight}
                response={response}
                cookies={cookies}
                headers={headers}
                status={status}
                responseTime={responseTime}
                networkInformation={networkInfo}
            />
        </div>
    );
};