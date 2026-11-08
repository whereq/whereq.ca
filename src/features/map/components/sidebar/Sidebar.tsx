import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faMapLocation,
    faMap,
    faArrowsToDot,
    faClockRotateLeft,
    faCog,
} from "@fortawesome/free-solid-svg-icons";

import { useMapStore } from "@/features/map/store/mapStore";
import { SectionType } from "@/features/map/models/MapEnum";

export const Sidebar = ({
    openSettings,
}: {
    openSettings: () => void;
}) => {
    const { activeSection, setActiveSection, isWorkspaceVisible, toggleWorkspace } = useMapStore();

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
            {/* My Place Button */}
            <button
                className="mb-4 w-10 h-10 flex 
                           items-center justify-center
                           hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition"
                onClick={() => handleSectionToggle(SectionType.MY_PLACES)}
                title={"Saved"}
            >
                <FontAwesomeIcon
                    icon={faMapLocation}
                    size="lg"
                />
            </button>

            {/* My Map Button */}
            <button
                className="mb-4 w-10 h-10 flex 
                           items-center justify-center hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition font-fira-code"
                title="My Map"
                onClick={() => handleSectionToggle(SectionType.MY_MAP)}
            >
                <FontAwesomeIcon icon={faMap} size="lg" />
            </button>

            {/* POIs Button */}
            <button
                className="mb-4 w-10 h-10 flex 
                           items-center justify-center hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition font-fira-code"
                title="Points of Interest (POIs)"
            >
                <FontAwesomeIcon icon={faArrowsToDot} size="lg" />
            </button>

            {/* Recents Button */}
            <button
                className="mb-4 w-10 h-10 flex 
                           items-center justify-center hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition font-fira-code"
                title="Recents"
                onClick={() => handleSectionToggle(SectionType.RECENT_SEARCHES)}
            >
                <FontAwesomeIcon icon={faClockRotateLeft} size="lg" />
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