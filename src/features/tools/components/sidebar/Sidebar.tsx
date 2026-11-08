import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCode,
    faRightLeft,
    faDiagramProject,
    faPalette,
    faCog,
} from "@fortawesome/free-solid-svg-icons";

import { SectionType } from "@/features/tools/models/ToolsEnum";
import { useToolsStore } from "@/features/tools/store/toolsStore";
import { useNavigationStore } from "@/store/store"; // Import the navigation store
import { Sub_Module_Path } from "@/features/tools/utils/utils";

export const Sidebar = ({
    openSettings,
}: {
    openSettings: () => void;
}) => {
    const { activeSection, setActiveSection, isWorkspaceVisible, toggleWorkspace } = useToolsStore();
    const { setPath } = useNavigationStore(); // Get the pushPath and popPath functions from the store

    const handleSectionToggle = (sectionType: SectionType) => {
        if (isWorkspaceVisible && activeSection === sectionType) {
            toggleWorkspace(); // Close the workspace if the same section is clicked again
        } else {
            setActiveSection(sectionType); // Set the active section
            if (!isWorkspaceVisible) {
                toggleWorkspace(); // Open the workspace if it's not visible
            }

            const pathArray = [Sub_Module_Path[sectionType]]; // Create a new path array
            setPath(pathArray); // Set the new path
        }
    };

    return (
        <div className="maps-sidebar w-16 bg-gray-800 flex flex-col 
                        items-center pt-4 text-orange-300 
                        h-full font-fira-code
                        border-r border-orange-700">

            {/* Formatter Button */}
            <button
                className="mb-4 w-10 h-10 flex 
                           items-center justify-center
                           hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition"
                onClick={() => handleSectionToggle(SectionType.FORMATTER)}
                title={"Formatter"}
            >
                <FontAwesomeIcon
                    icon={faCode}
                    size="lg"
                />
            </button>

            {/* Format Converter Button */}
            <button
                className="mb-4 w-10 h-10 flex 
                           items-center justify-center
                           hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition"
                onClick={() => handleSectionToggle(SectionType.FORMAT_CONVERTER)}
                title={"Format Converter"}
            >
                <FontAwesomeIcon
                    icon={faRightLeft}
                    size="lg"
                />
            </button>

            {/* Text Diagram Button */}
            <button
                className="mb-4 w-10 h-10 flex 
                           items-center justify-center
                           hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition"
                onClick={() => handleSectionToggle(SectionType.TEXT_DIAGRAM)}
                title={"Text Diagram"}
            >
                <FontAwesomeIcon
                    icon={faDiagramProject}
                    size="lg"
                />
            </button>

            {/* Canvas Drawing Button */}
            <button
                className="mb-4 w-10 h-10 flex 
                           items-center justify-center
                           hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition"
                onClick={() => handleSectionToggle(SectionType.CANVAS_DRAWING)}
                title={"Saved"}
            >
                <FontAwesomeIcon
                    icon={faPalette}
                    size="lg"
                />
            </button>

            {/* Settings Button */}
            <button
                className="w-10 h-10 flex 
                           items-center justify-center hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition font-fira-code"
                onClick={openSettings}
                title="Settings"
            >
                <FontAwesomeIcon icon={faCog} size="lg" />
            </button>
        </div>
    );
};