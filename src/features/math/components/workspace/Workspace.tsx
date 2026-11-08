import { useState } from "react";
import { Resizable } from "re-resizable";

import { useMathStore } from "@/features/math/store/mathStore";
import { SectionType } from "@/features/math/models/MathEnum";
import { AnimationSection } from "@/features/math/components/workspace/AnimationSection";
import { CalculatorSection } from "@/features/math/components/workspace/CalculatorSection";
import { FormulaCategorySection } from "@/features/math/components/workspace/FormulaCategorySection";
import { MathematicianSection } from "@/features/math/components/workspace/MathematicianSection";


export const Workspace = () => {
    const { activeSection } = useMathStore();
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
                {activeSection === SectionType.MATH_ANIMATION && (
                    <AnimationSection />
                )}

                {activeSection === SectionType.CALCULATOR && (
                    <CalculatorSection />
                )}

                {activeSection === SectionType.FORMULA_CATEGORY && (
                    <FormulaCategorySection />
                )}

                {activeSection === SectionType.MATHEMATICIANS && (
                    <MathematicianSection />
                )}
            </div>
        </Resizable>
    );
};