import { useState, useEffect } from "react";

import { SideBar } from "@/features/api-explorer/components/sidebar/Sidebar";
import { IndexPanel } from "@/components/index-panel/IndexPanel";

import { RestfulEndpoint } from "@/models/RestfulEndpoint";
import { ApiExecutor } from "@/features/api-executor/ApiExecutor";

import { loadApiCategoriesLocally } from "@/resources/resourceLoader";
import { SettingPanel } from "@/features/api-explorer/components/sidebar/settings-panel/SettingsPanel";

import { TopCategory } from "@/models/EndpointCategory";

const ApiExplorerPage = () => {
    const [isIndexPanelVisible, setIsIndexPanelVisible] = useState(true);
    const [isSettingPanelVisible, setIsSettingPanelVisible] = useState(false);
    const [selectedEndpoint, setSelectedEndpoint] = useState<RestfulEndpoint | null>(null);
    const [panels, setPanels] = useState<TopCategory[]>([]);

    useEffect(() => {
        const fetchCategories = async () => {
            const categories = await loadApiCategoriesLocally();
            setPanels(categories);
        };
        fetchCategories();
    }, []);

    const toggleIndexPanel = () => setIsIndexPanelVisible(!isIndexPanelVisible);
    const toggleSettingPanel = () => setIsSettingPanelVisible(!isSettingPanelVisible);

    return (
        <div className="flex h-full bg-blue-900 text-orange-300 font-fira-code">
            {/* Side Bar */}
            <SideBar
                isIndexPanelVisible={isIndexPanelVisible}
                toggleIndexPanel={toggleIndexPanel}
                openSettings={toggleSettingPanel}
            />

            {/* Index Panel */}
            {isIndexPanelVisible && (
                <IndexPanel
                    panels={panels}
                    selectedPanel={selectedEndpoint?.title || ""}
                    setSelectedPanel={(endpointTitle: string) => {
                        const allEndpoints = panels.flatMap((panel) =>
                            panel.categories.flatMap((category) =>
                                category.restfulEndpointGroups.flatMap((index) => index.restfulEndpoints)
                            )
                        );
                        const selected = allEndpoints.find(
                            (endpoint) => endpoint.title === endpointTitle
                        );
                        setSelectedEndpoint(selected || null);
                    }}
                />
            )}

            {/* Main Panel */}
            <div className="flex-1 bg-gray-800 text-orange-300 h-full"
                // style={{ maxWidth: isIndexPanelVisible ? "calc(100vw - 3rem - 15vw)" : "calc(100vw - 3rem)" }}>
                style={{ maxWidth: `calc(100vw - 3rem - 15vw)`, minWidth: 0 }}>
                <ApiExecutor endpoint={selectedEndpoint || undefined} />
            </div>

            {/* Settings Panel */}
            {isSettingPanelVisible && <SettingPanel onClose={toggleSettingPanel} />}
        </div>
    );
};

export default ApiExplorerPage;