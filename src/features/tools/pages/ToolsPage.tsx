import { useState } from "react";
import { Sidebar } from "@/features/tools/components/sidebar/Sidebar";
import { SettingPanel } from "@/features/tools/components/sidebar/settings-panel/SettingsPanel";
import { Workspace } from "@/features/tools/components/workspace/Workspace";
import PageLayout from "@/layouts/PageLayout";
import Tools from "@/features/tools/components/Tools";
import { useToolsStore } from "@/features/tools/store/toolsStore";

const ToolsPage = () => {
    const { isWorkspaceVisible } = useToolsStore();
    const [isSettingPanelVisible, setIsSettingPanelVisible] = useState(false);

    const toggleSettingPanel = () => setIsSettingPanelVisible(!isSettingPanelVisible);

    return (
        <PageLayout>
            <div className="tools-page flex h-full bg-gray-900 text-orange-300 font-fira-code">
                {/* Side Bar */}
                <Sidebar
                    openSettings={toggleSettingPanel}
                />

                {/* Workspace */}
                {isWorkspaceVisible && <Workspace />}

                {/* Main Panel */}
                <div
                    className="flex-1 bg-gray-800 text-orange-300 h-full"
                >
                    <Tools />
                </div>

                {/* Settings Panel */}
                {isSettingPanelVisible && <SettingPanel onClose={toggleSettingPanel} />}
            </div>
        </PageLayout>
    );
};

export default ToolsPage;