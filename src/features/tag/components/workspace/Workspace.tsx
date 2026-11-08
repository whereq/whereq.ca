import { useState } from "react";
import { Resizable } from "re-resizable";

import { useTagStore } from "@/features/tag/store/tagStore";
import { SectionType } from "@/features/tag/models/TagEnum";
import { MyTagSection } from "@/features/tag/components/workspace/MyTagSection";
import { FormatConverterSection } from "@/features/tag/components/workspace/WhereQTagSection";


export const Workspace = () => {
    const { activeSection } = useTagStore();
    const [isResizing, setIsResizing] = useState(false);

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
            {/* Conditionally Render Sections */}
            <div className="flex-1 overflow-hidden">
                {activeSection === SectionType.MY_TAGS && (
                    <MyTagSection />
                )}

                {activeSection === SectionType.WHEREQ_TAGS && (
                    <FormatConverterSection />
                )}

            </div>
        </Resizable>
    );
};