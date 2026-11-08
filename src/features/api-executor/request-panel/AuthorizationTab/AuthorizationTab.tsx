import { useState } from "react";
import { ApiKeyAuth } from "./ApiKeyAuth"; // Import the new component

export const AuthorizationTab = () => {
    const [authType, setAuthType] = useState("No Auth");

    const renderAuthInputs = () => {
        switch (authType) {
            case "Basic Auth":
                return (
                    <div className="auth-inputs flex flex-col gap-2">
                        <input
                            type="text"
                            placeholder="Username"
                            className="border border-gray-700 bg-gray-800 text-orange-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            className="border border-gray-700 bg-gray-800 text-orange-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                );
            case "Bearer Token":
                return (
                    <div className="auth-inputs">
                        <input
                            type="text"
                            placeholder="Token"
                            className="border border-gray-700 bg-gray-800 text-orange-300 p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                );
            case "API Key":
                return <ApiKeyAuth />; // Use the new ApiKeyAuth component
            default:
                return null;
        }
    };

    return (
        <div className="authorization-tab flex h-full bg-gray-900 text-orange-300 font-fira-code">
            {/* Left Part: Auth Type Selector */}
            <div className="auth-type-selector w-1/3 p-4 border-r border-gray-700">
                <label className="block text-gray-400 font-semibold mb-2">
                    Auth Type:
                </label>
                <select
                    value={authType}
                    onChange={(e) => setAuthType(e.target.value)}
                    className="border border-gray-700 bg-gray-800 text-orange-300 p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="No Auth">No Auth</option>
                    <option value="Basic Auth">Basic Auth</option>
                    <option value="Bearer Token">Bearer Token</option>
                    <option value="API Key">API Key</option>
                </select>
            </div>

            {/* Right Part: Dynamic Auth Inputs */}
            <div className="auth-inputs-container w-2/3 p-4 overflow-y-auto">
                {renderAuthInputs()}
            </div>
        </div>
    );
};