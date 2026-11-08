import { useState } from "react";
import { ParamsTab } from "@/features/api-executor/request-panel/ParamsTab/ParamsTab";
import { AuthorizationTab } from "@/features/api-executor/request-panel/AuthorizationTab/AuthorizationTab";
import { BodyTab } from "@/features/api-executor/request-panel/BodyTab/BodyTab";
import { SettingsTab } from "@/features/api-executor/request-panel/SettingsTab/SettingsTab";
import { CurlTab } from "@/features/api-executor/request-panel/CurlTab/CurlTab";
import { TAB_TYPES } from "@/utils/constants";
import { RestfulEndpoint } from "@/models/RestfulEndpoint";

type RequestPanelProps = {
    restfulEndpoint?: RestfulEndpoint;
    onResize: (isResizing: boolean) => void;
    style?: React.CSSProperties; // Accept a style prop for dynamic height
    initialParams: Record<string, string>;
    initialHeaders: Record<string, string>;
};

type RequestTabKey = "params" | "authorization" | "headers" | "body" | "settings" | "curl";

export const RequestPanel = ({
    restfulEndpoint,
    style,
    initialParams,
    initialHeaders,
}: RequestPanelProps) => {
    const [selectedRequestTab, setSelectedRequestTab] = useState<RequestTabKey>("params");

    return (
        <div className="request-panel bg-gray-900 text-orange-300 ml-2 mr-1" style={style}>
            <div className="request-tabs flex border-b border-gray-700 bg-gray-800">
                {["Params", "Authorization", "Headers", "Body", "Settings", "cURL"].map((tab) => (
                    <button
                        key={tab}
                        className={`request-tab py-2 px-4 text-sm font-fira-code ${
                            selectedRequestTab === tab.toLowerCase()
                                ? "border-b-2 border-blue-500 text-blue-500 font-bold"
                                : "text-gray-400"
                        }`}
                        onClick={() => setSelectedRequestTab(tab.toLowerCase() as RequestTabKey)}
                    >
                        {tab}
                    </button>
                ))}
            </div>
            <div className="request-tab-content bg-gray-800 h-full">
                {selectedRequestTab === "params" && (
                    <ParamsTab
                        restfulEndpointUrl={restfulEndpoint?.url || ""}
                        tabType={TAB_TYPES.PARAMETERS}
                        initialParams={initialParams}
                    />
                )}
                {selectedRequestTab === "authorization" && <AuthorizationTab />}
                {selectedRequestTab === "headers" && (
                    <ParamsTab
                        restfulEndpointUrl={restfulEndpoint?.url || ""}
                        tabType={TAB_TYPES.HEADERS}
                        initialParams={initialHeaders}
                    />
                )}
                {selectedRequestTab === "body" && <BodyTab />}
                {selectedRequestTab === "settings" && <SettingsTab restfulEndpoint={restfulEndpoint} />}
                {selectedRequestTab === "curl" && ( <CurlTab restfulEndpoint={restfulEndpoint} />)}
            </div>
        </div>
    );
};