import { useState } from "react";
import { Resizable } from "re-resizable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

import { useMapStore } from "@/features/map/store/mapStore";

import { SectionType } from "@/features/map/models/MapEnum";

import { MyPlacesSection } from "@/features/map/components/workspace/MyPlacesSection"; 
import { RecentSearchesSection } from "@/features/map/components/workspace/RecentSearchesSection"; 
import { MyMapSection } from "@/features/map/components/workspace/MyMapSection"; 

export const Workspace = () => {
    const [filterText, setFilterText] = useState("");
    const [isResizing, setIsResizing] = useState(false);

    const { activeSection } = useMapStore(); // Get active section from the store

    return (
        <Resizable
            defaultSize={{ width: "15%", height: "100%" }}
            maxWidth="50%"
            enable={{ right: true }}
            className={`maps-workspace flex flex-col bg-gray-900 text-orange 
                        font-fira-code h-full overflow-hidden ${
                isResizing ? "border-r-2 border-orange" : ""
            }`}
            handleStyles={{ 
                right: { 
                    cursor: "ew-resize", 
                    width: "8px" 
                }
            }}
            handleClasses={{ right: "bg-blue-500 hover:bg-blue-700" }}
            onResizeStart={() => setIsResizing(true)}
            onResizeStop={() => setIsResizing(false)}
        >
            {/* Search Bar */}
            <div className="p-2 flex items-center gap-2 bg-gray-800 text-orange border-b border-orange-700">
                <button className="text-lg hover:text-blue-500">
                    <FontAwesomeIcon icon={faPlus} title="Add New Panel" />
                </button>
                <input
                    type="text"
                    className="flex-grow px-2 py-1 text-sm 
                               border border-gray-600 rounded focus:border-blue-500 focus:outline-none"
                    placeholder={
                        activeSection === SectionType.MY_PLACES ? 'Search Your Places...' :
                        activeSection === SectionType.MY_MAP ? 'Search Your Maps...' :
                        activeSection === SectionType.RECENT_SEARCHES ? 'Search Your Searches...' :
                                    'Search Your Maps...' // Default placeholder
                    }
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                />
            </div>

            {/* Conditionally Render Sections */}
            <div className="flex-1 overflow-hidden">
                {activeSection === SectionType.MY_PLACES && (
                    <MyPlacesSection />
                )}

                {activeSection === SectionType.MY_MAP && (
                    <MyMapSection />
                )}

                {activeSection === SectionType.RECENT_SEARCHES && (
                    <RecentSearchesSection />
                )}
            </div>
        </Resizable>
    );
};