import { useState } from "react";
import { Sidebar } from "@/features/tag/components/sidebar/Sidebar";
import { SettingPanel } from "@/features/tag/components/sidebar/settings-panel/SettingsPanel";
import { Workspace } from "@/features/tag/components/workspace/Workspace";
import PageLayout from "@/layouts/PageLayout";
import Tag from "@/features/tag/components/Tag";
import { useTagStore } from "@/features/tag/store/tagStore";

const TagPage = () => {
    const { isWorkspaceVisible } = useTagStore();
    const [isSettingPanelVisible, setIsSettingPanelVisible] = useState(false);

    const toggleSettingPanel = () => setIsSettingPanelVisible(!isSettingPanelVisible);

    return (
        <PageLayout>
            <div className="tag-page flex h-full bg-gray-900 text-orange-300 font-fira-code">
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
                    <Tag />
                </div>

                {/* Settings Panel */}
                {isSettingPanelVisible && <SettingPanel onClose={toggleSettingPanel} />}
            </div>
        </PageLayout>
    );
};

export default TagPage;