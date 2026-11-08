import { useState } from "react";
import { Resizable } from "re-resizable";

import { usePawsStore } from "@/features/paws/store/pawsStore";
import { SectionType } from "@/features/paws/models/PawsEnum";
import { CatSection } from "@/features/paws/components/workspace/CatSection";
import { DogSection } from "@/features/paws/components/workspace/DogSection";


export const Workspace = () => {
    const { activeSection } = usePawsStore();
    const [isResizing, setIsResizing] = useState(false);

    return (
        <Resizable
            defaultSize={{ width: "15%", height: "100%" }}
            maxWidth="50%"
            enable={{ right: true }}
            className={`paw-workspace flex flex-col bg-gray-900 text-orange 
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
                {activeSection === SectionType.CAT && (
                    <CatSection />
                )}

                {activeSection === SectionType.DOG && (
                    <DogSection />
                )}

            </div>
        </Resizable>
    );
};