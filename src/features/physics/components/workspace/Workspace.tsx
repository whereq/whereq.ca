import { useState } from "react";
import { Resizable } from "re-resizable";

import { usePhysicsStore } from "@/features/physics/store/physicsStore";
import { SectionType } from "@/features/physics/models/PhysicsEnum";
import { MechanicsSection } from "@/features/physics/components/workspace/MechanicsSection";
import { ElectricsSection } from "@/features/physics/components/workspace/ElectricsSection";


export const Workspace = () => {
    const { activeSection } = usePhysicsStore();
    const [isResizing, setIsResizing] = useState(false);

    return (
        <Resizable
            defaultSize={{ width: "15%", height: "100%" }}
            maxWidth="50%"
            enable={{ right: true }}
            className={`physics-workspace flex flex-col bg-gray-900 text-orange 
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
                {activeSection === SectionType.MECHANICS && (
                    <MechanicsSection />
                )}

                {activeSection === SectionType.ELECTRICS && (
                    <ElectricsSection />
                )}

            </div>
        </Resizable>
    );
};