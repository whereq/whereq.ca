import { useEffect, useState } from "react";
import { Sidebar } from "@/features/chemistry/components/sidebar/Sidebar";
import { SettingPanel } from "@/features/chemistry/components/sidebar/settings-panel/SettingsPanel";
import { Workspace } from "@/features/chemistry/components/workspace/Workspace";
import PageLayout from "@/layouts/PageLayout";
import Chemistry from "@/features/chemistry/components/Chemistry";
import { useChemistryStore } from "@/features/chemistry/store/chemistryStore";

const ChemistryPage = () => {
    const { isWorkspaceVisible } = useChemistryStore();
    const [isSettingPanelVisible, setIsSettingPanelVisible] = useState(false);

    useEffect(() => {
        setIsSettingPanelVisible(false); 
    }, []);

    const toggleSettingPanel = () => setIsSettingPanelVisible(!isSettingPanelVisible);

    return (
        <PageLayout>
            <div className="chemistry-page flex h-full bg-gray-900 text-orange-300 font-fira-code">
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
                    <Chemistry />
                </div>

                {/* Settings Panel */}
                {isSettingPanelVisible && <SettingPanel onClose={toggleSettingPanel} />}
            </div>
        </PageLayout>
    );
};

export default ChemistryPage;