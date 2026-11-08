import { useEffect, useState } from "react";
import { Sidebar } from "@/features/physics/components/sidebar/Sidebar";
import { SettingPanel } from "@/features/physics/components/sidebar/settings-panel/SettingsPanel";
import { Workspace } from "@/features/physics/components/workspace/Workspace";
import PageLayout from "@/layouts/PageLayout";
import Physics from "@/features/physics/components/Physics";
import { usePhysicsStore } from "@/features/physics/store/physicsStore";

const PhysicsPage = () => {
    const { isWorkspaceVisible } = usePhysicsStore();
    const [isSettingPanelVisible, setIsSettingPanelVisible] = useState(false);

    useEffect(() => {
        setIsSettingPanelVisible(false); 
    }, []);

    const toggleSettingPanel = () => setIsSettingPanelVisible(!isSettingPanelVisible);

    return (
        <PageLayout>
            <div className="physics-page flex h-full bg-gray-900 text-orange-300 font-fira-code overflow-hidden">
                {/* Side Bar */}
                <Sidebar
                    openSettings={toggleSettingPanel}
                />

                {/* Workspace */}
                {isWorkspaceVisible && <Workspace />}

                {/* Main Panel */}
                <div
                    className="flex-1 bg-gray-800 text-orange-300 h-full overflow-hidden"
                >
                    <Physics />
                </div>

                {/* Settings Panel */}
                {isSettingPanelVisible && <SettingPanel onClose={toggleSettingPanel} />}
            </div>
        </PageLayout>
    );
};

export default PhysicsPage;