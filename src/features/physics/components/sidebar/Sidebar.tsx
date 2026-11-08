import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCog,
} from "@fortawesome/free-solid-svg-icons";

import { SectionType } from "@/features/physics/models/PhysicsEnum";
import { usePhysicsStore } from "@/features/physics/store/physicsStore";
import PhysicsMechanicsIcon from "@/features/physics/icons/PhysicsMechanicsIcon";
import { GiElectric } from "react-icons/gi";
import { TbMathPi } from "react-icons/tb";

export const Sidebar = ({
    openSettings,
}: {
    openSettings: () => void;
}) => {
    const { activeSection, setActiveSection, isWorkspaceVisible, setWorkspaceVisible, toggleWorkspace } = usePhysicsStore();

    const handleSectionToggle = (sectionType: SectionType) => {
        if (SectionType.CONSTANTS === sectionType) {
            setWorkspaceVisible(false); // Close the workspace if the constants section is clicked
            setActiveSection(sectionType); // Set the active section
        } else if (isWorkspaceVisible && activeSection === sectionType) {
            toggleWorkspace(); // Close the workspace if the same section is clicked again
        } else {
            setActiveSection(sectionType); // Set the active section
            if (!isWorkspaceVisible) {
                toggleWorkspace(); // Open the workspace if it's not visible
            }
        }
    };

    return (
        <div className="physics-sidebar w-16 bg-gray-800 flex flex-col 
                        items-center pt-4 text-orange-300 
                        h-full font-fira-code
                        border-r border-orange-700">

            {/* Constants Button */}
            <button
                className="mb-4 w-10 h-10 flex 
                           items-center justify-center
                           hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition"
                onClick={() => handleSectionToggle(SectionType.CONSTANTS)}
                title={"Constants"}
            >
                <TbMathPi />
            </button>

            {/* Mechanics Button */}
            <button
                className="mb-4 w-10 h-10 flex 
                           items-center justify-center
                           hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition"
                onClick={() => handleSectionToggle(SectionType.MECHANICS)}
                title={"Mechanics"}
            >
                <PhysicsMechanicsIcon />
            </button>

            {/* Electrics Button */}
            <button
                className="mb-4 w-10 h-10 flex 
                           items-center justify-center
                           hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition"
                onClick={() => handleSectionToggle(SectionType.ELECTRICS)}
                title={"Electrics"}
            >
                <GiElectric className="w-6 h-6" />
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