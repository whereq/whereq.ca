// import { useEffect, useState } from "react";
import { useState } from "react";
import { SideBar } from "@/features/map-gl/components/sidebar/Sidebar";
import { SettingPanel } from "@/features/map-gl/components/sidebar/settings-panel/SettingsPanel";
import { Workspace } from "@/features/map-gl/components/workspace/Workspace";
import Maps from "@/features/map-gl/components/Maps";

const MapsPage = () => {
    const [isWorkspaceVisible, setIsWorkspaceVisible] = useState(false);
    const [isSettingPanelVisible, setIsSettingPanelVisible] = useState(false);
    // const [apiKey, setApiKey] = useState(""); // Default to empty API key

    const toggleWorkspace = () => setIsWorkspaceVisible(!isWorkspaceVisible);
    const toggleSettingPanel = () => setIsSettingPanelVisible(!isSettingPanelVisible);

    return (
        <div className="flex h-full bg-blue-900 text-orange-300 font-fira-code">
            {/* Side Bar */}
            <SideBar
                isWorkspaceVisible={isWorkspaceVisible}
                toggleWorkspace={toggleWorkspace}
                openSettings={toggleSettingPanel}
            />

            {/* Workspace */}
            {isWorkspaceVisible && <Workspace />}

            {/* Main Panel */}
            <div
                className="flex-1 bg-gray-800 text-orange-300 h-full"
            >
                {/* Render Maps only if apiKey is not empty */}
                {/* {apiKey && <Maps />} */}
                <Maps />
            </div>

            {/* Settings Panel */}
            {isSettingPanelVisible && <SettingPanel onClose={toggleSettingPanel} />}
        </div>
    );
};

export default MapsPage;