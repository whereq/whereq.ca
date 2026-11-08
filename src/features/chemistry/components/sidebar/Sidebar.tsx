import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCog,
} from "@fortawesome/free-solid-svg-icons";

import { SectionType } from "@/features/chemistry/models/ChemistryEnum";
import { useChemistryStore } from "@/features/chemistry/store/chemistryStore";
import PeriodicTableIcon from "@/features/chemistry/icons/PeriodicTableIcon";
import { GiSoapExperiment } from "react-icons/gi";

export const Sidebar = ({
    openSettings,
}: {
    openSettings: () => void;
}) => {
    const { activeSection, setActiveSection, isWorkspaceVisible, toggleWorkspace } = useChemistryStore();

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
        <div className="chemistry-sidebar w-16 bg-gray-800 flex flex-col 
                        items-center pt-4 text-orange-300 
                        h-full font-fira-code
                        border-r border-orange-700">

            {/* Cat Button */}
            <button
                className="mb-4 w-10 h-10 flex 
                           items-center justify-center
                           hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition"
                onClick={() => handleSectionToggle(SectionType.PERIODIC_TABLE)}
                title={"Periodic Table"}
            >
                <PeriodicTableIcon />
            </button>

            {/* Button */}
            <button
                className="mb-4 w-10 h-10 flex 
                           items-center justify-center
                           hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition"
                onClick={() => handleSectionToggle(SectionType.EXPERIMENTS)}
                title={"Experiments"}
            >
                <GiSoapExperiment className="w-6 h-6" />
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