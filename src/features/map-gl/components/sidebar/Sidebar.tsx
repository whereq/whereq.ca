import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSquareCaretRight,
    faSquareCaretLeft,
    faCog,
    faMap,
    faLocationDot,
    faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";

export const SideBar = ({
    isWorkspaceVisible,
    toggleWorkspace,
    openSettings,
}: {
    isWorkspaceVisible: boolean;
    toggleWorkspace: () => void;
    openSettings: () => void;
}) => {
    return (
        <div className="w-16 bg-gray-800 flex flex-col 
                        items-center pt-4 text-orange-300 h-full font-fira-code">
            {/* Toggle Workspace Panel Button */}
            <button
                className="mb-4 w-10 h-10 flex 
                           items-center justify-center
                           hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition"
                onClick={toggleWorkspace}
                title={isWorkspaceVisible ? "Hide Workspace" : "Show Workspace"}
            >
                <FontAwesomeIcon
                    icon={isWorkspaceVisible ? faSquareCaretLeft : faSquareCaretRight}
                    size="lg"
                />
            </button>

            {/* My Map Button */}
            <button
                className="mb-4 w-10 h-10 flex 
                           items-center justify-center hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition font-fira-code"
                title="My Map"
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
                <FontAwesomeIcon icon={faLocationDot} size="lg" />
            </button>

            {/* Recents Button */}
            <button
                className="mb-4 w-10 h-10 flex 
                           items-center justify-center hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition font-fira-code"
                title="Recents"
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
