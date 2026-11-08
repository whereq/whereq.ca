import { useToolsStore } from "@/features/tools/store/toolsStore";
import { SectionType } from "@/features/tools/models/ToolsEnum";
import CodeFormatter from "@/features/tools/components/CodeFormatter";
// import PythonCodeFormatter from "@/features/tools/components/PythonCodeFormatter";
// import PythonCodeFormatterTA from "@/features/tools/components/PythonCodeFormatterTA";
const Tools = () => {
    const { activeSection } = useToolsStore();
    return (
        <div className="tools-container mx-auto h-full">
           {SectionType.FORMATTER === activeSection && <CodeFormatter /> } 
           {/* {SectionType.FORMATTER === activeSection && <PythonCodeFormatter /> }  */}
           {/* {SectionType.FORMATTER === activeSection && <PythonCodeFormatterTA /> }  */}
        </div>
    );
};

export default Tools;