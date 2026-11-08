import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFolder,
    faBars,
    faCog,
} from "@fortawesome/free-solid-svg-icons";

import { SectionType } from "@/features/tag/models/TagEnum";
import { useTagStore } from "@/features/tag/store/tagStore";

export const Sidebar = ({
    openSettings,
}: {
    openSettings: () => void;
}) => {
    const { activeSection, setActiveSection, isWorkspaceVisible, toggleWorkspace } = useTagStore();

    const handleSectionToggle = (sectionType: SectionType) => {
        if (isWorkspaceVisible && activeSection === sectionType) {
            toggleWorkspace(); // Close the workspace if the same section is clicked again
        } else {
            setActiveSection(sectionType); // Set the active section
            if (!isWorkspaceVisible) {
                toggleWorkspace(); // Open the workspace if it's not visible
            }
        }
    };

    return (
        <div className="maps-sidebar w-16 bg-gray-800 flex flex-col 
                        items-center pt-4 text-orange-300 
                        h-full font-fira-code
                        border-r border-orange-700">

            {/* My Tags Button */}
            <button
                className="mb-4 w-10 h-10 flex 
                           items-center justify-center
                           hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition"
                onClick={() => handleSectionToggle(SectionType.MY_TAGS)}
                title={"My Tags"}
            >
                <FontAwesomeIcon
                    icon={faFolder}
                    size="lg"
                />
            </button>

            {/* WhereQ Tags Button */}
            <button
                className="mb-4 w-10 h-10 flex 
                           items-center justify-center
                           hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition"
                onClick={() => handleSectionToggle(SectionType.WHEREQ_TAGS)}
                title={"WhereQ Tags"}
            >
                <FontAwesomeIcon
                    icon={faBars}
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