import { useEffect, useState } from "react";
import { Sidebar } from "@/features/category/components/sidebar/Sidebar";
import { SettingPanel } from "@/features/category/components/sidebar/settings-panel/SettingsPanel";
import { Workspace } from "@/features/category/components/workspace/Workspace";
import PageLayout from "@/layouts/PageLayout";
import Category from "@/features/category/components/Category";
import { useCategoryStore } from "@/features/category/store/categoryStore";

const CategoryPage = () => {
    const { isWorkspaceVisible } = useCategoryStore();
    const [isSettingPanelVisible, setIsSettingPanelVisible] = useState(false);

    useEffect(() => {
        setIsSettingPanelVisible(false); 
    }, []);

    const toggleSettingPanel = () => setIsSettingPanelVisible(!isSettingPanelVisible);

    return (
        <PageLayout>
            <div className="category-page flex h-full bg-gray-900 text-orange-300 font-fira-code">
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
                    <Category />
                </div>

                {/* Settings Panel */}
                {isSettingPanelVisible && <SettingPanel onClose={toggleSettingPanel} />}
            </div>
        </PageLayout>
    );
};

export default CategoryPage;