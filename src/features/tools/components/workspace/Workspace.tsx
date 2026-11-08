import { useState } from "react";
import { Resizable } from "re-resizable";

import { useToolsStore } from "@/features/tools/store/toolsStore";
import { SectionType } from "@/features/tools/models/ToolsEnum";
import { FormatterSection } from "@/features/tools/components/workspace/FormatterSection";
import { FormatConverterSection } from "@/features/tools/components/workspace/FormatConverterSection";
import { TextDiagramSection } from "@/features/tools/components/workspace/TextDiagramSection";
import { CanvasDrawingSection } from "@/features/tools/components/workspace/CanvasDrawingSection";


export const Workspace = () => {
    const { activeSection } = useToolsStore();
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
                {activeSection === SectionType.FORMATTER && (
                    <FormatterSection />
                )}

                {activeSection === SectionType.FORMAT_CONVERTER && (
                    <FormatConverterSection />
                )}

                {activeSection === SectionType.TEXT_DIAGRAM && (
                    <TextDiagramSection />
                )}

                {activeSection === SectionType.CANVAS_DRAWING&& (
                    <CanvasDrawingSection />
                )}
            </div>
        </Resizable>
    );
};