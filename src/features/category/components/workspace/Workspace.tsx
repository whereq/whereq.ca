import { useState } from "react";
import { Resizable } from "re-resizable";

import { useCategoryStore } from "@/features/category/store/categoryStore";
import { SectionType } from "@/features/category/models/CategoryEnum";
import { MyCategorySection } from "@/features/category/components/workspace/MyCategorySection";
import { WhereQCategorySection } from "@/features/category/components/workspace/WhereQCategorySection";


export const Workspace = () => {
    const { activeSection } = useCategoryStore();
    const [isResizing, setIsResizing] = useState(false);

    return (
        <Resizable
            defaultSize={{ width: "15%", height: "100%" }}
            maxWidth="50%"
            enable={{ right: true }}
            className={`category-workspace flex flex-col bg-gray-900 text-orange 
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
            {/* Conditionally Render Sections */}
            <div className="flex-1 overflow-hidden">
                {activeSection === SectionType.MY_CATEGORIES && (
                    <MyCategorySection />
                )}

                {activeSection === SectionType.WHEREQ_CATEGORIES&& (
                    <WhereQCategorySection />
                )}

            </div>
        </Resizable>
    );
};