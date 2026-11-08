import { useEffect, useState } from "react";
import { Sidebar } from "@/features/paws/components/sidebar/Sidebar";
import { SettingPanel } from "@/features/paws/components/sidebar/settings-panel/SettingsPanel";
import { Workspace } from "@/features/paws/components/workspace/Workspace";
import PageLayout from "@/layouts/PageLayout";
import Paws from "@/features/paws/components/Paws";
import { usePawsStore } from "@/features/paws/store/pawsStore";

const PawsPage = () => {
    const { isWorkspaceVisible } = usePawsStore();
    const [isSettingPanelVisible, setIsSettingPanelVisible] = useState(false);

    useEffect(() => {
        setIsSettingPanelVisible(false); 
    }, []);

    const toggleSettingPanel = () => setIsSettingPanelVisible(!isSettingPanelVisible);

    return (
        <PageLayout>
            <div className="paw-page flex h-full bg-gray-900 text-orange-300 font-fira-code">
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
                    <Paws />
                </div>

                {/* Settings Panel */}
                {isSettingPanelVisible && <SettingPanel onClose={toggleSettingPanel} />}
            </div>
        </PageLayout>
    );
};

export default PawsPage;