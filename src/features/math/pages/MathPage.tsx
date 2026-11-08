import { useEffect, useState } from "react";
import { Sidebar } from "@/features/math/components/sidebar/Sidebar";
import { SettingPanel } from "@/features/math/components/sidebar/settings-panel/SettingsPanel";
import { Workspace } from "@/features/math/components/workspace/Workspace";
import PageLayout from "@/layouts/PageLayout";
import Math from "@/features/math/components/Math";
import { useMathStore } from "@/features/math/store/mathStore";

const MathPage = () => {
    const { isWorkspaceVisible } = useMathStore();
    const [isSettingPanelVisible, setIsSettingPanelVisible] = useState(false);

    useEffect(() => {
        setIsSettingPanelVisible(false); 
    }, []);

    const toggleSettingPanel = () => setIsSettingPanelVisible(!isSettingPanelVisible);

    return (
        <PageLayout>
            <div className="math-page flex h-full bg-gray-900 text-orange-300 font-fira-code">
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
                    <Math />
                </div>

                {/* Settings Panel */}
                {isSettingPanelVisible && <SettingPanel onClose={toggleSettingPanel} />}
            </div>
        </PageLayout>
    );
};

export default MathPage;