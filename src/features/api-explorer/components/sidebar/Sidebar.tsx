import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSquareCaretRight, faSquareCaretLeft, faCog } from "@fortawesome/free-solid-svg-icons";

export const SideBar = ({
    isIndexPanelVisible,
    toggleIndexPanel,
    openSettings,
}: {
    isIndexPanelVisible: boolean;
    toggleIndexPanel: () => void;
    openSettings: () => void;
}) => {
    return (
        <div className="w-12 bg-gray-800 flex flex-col 
                        items-center pt-4 text-orange-300 h-full font-fira-code">
            {/* Toggle Index Panel Button */}
            <button
                className="mb-4 w-10 h-10 flex 
                           items-center justify-center
                           hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition"
                onClick={toggleIndexPanel}
                title={isIndexPanelVisible ? "Hide Index Panel" : "Show Index Panel"}
            >
                <FontAwesomeIcon
                    icon={isIndexPanelVisible ? faSquareCaretLeft : faSquareCaretRight}
                    size="lg"
                />
            </button>

            {/* Settings Button */}
            <button
                className="w-10 h-10 flex 
                           items-center justify-center hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition font-fira-code"
                onClick={openSettings}
                title="Open Settings"
            >
                <FontAwesomeIcon icon={faCog} size="lg" />
            </button>
        </div>
    );
};
