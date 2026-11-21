import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog } from "@fortawesome/free-solid-svg-icons";

import { SectionType } from "@/features/react/models/ReactEnum";
import { useReactStore } from "@/features/react/store/reactStore";
import { useNavigationStore } from "@/store/store";
import { Sub_Module_Path } from "@/features/react/utils/utils";
import { SECTION_META } from "@/features/react/utils/sections";

/**
 * The primitive rail — one button per child page.
 *
 * Clicking a button opens the workspace on that primitive and pushes
 * the child page onto the breadcrumb in the app header, exactly like
 * the other Lab features do.
 */
export const Sidebar = ({ openSettings }: { openSettings: () => void }) => {
    const { activeSection, setActiveSection, isWorkspaceVisible, toggleWorkspace } = useReactStore();
    const { setPath } = useNavigationStore();

    const handleSectionToggle = (section: SectionType) => {
        if (isWorkspaceVisible && activeSection === section) {
            toggleWorkspace(); // Close the workspace if the same section is clicked again
        } else {
            setActiveSection(section); // Set the active section
            if (!isWorkspaceVisible) {
                toggleWorkspace(); // Open the workspace if it is not visible
            }
        }
        setPath([Sub_Module_Path[section]]);
    };

    return (
        <nav className="wq-react__rail" aria-label="Library primitives">
            {Object.values(SectionType).map((section) => (
                <button
                    key={section}
                    className={`wq-react__rail-button${activeSection === section ? " is-active" : ""}`}
                    onClick={() => handleSectionToggle(section)}
                    title={SECTION_META[section].title}
                >
                    <FontAwesomeIcon icon={SECTION_META[section].icon} />
                </button>
            ))}

            <span className="wq-react__rail-separator" aria-hidden="true" />

            <button
                className="wq-react__rail-button"
                onClick={openSettings}
                title="Settings"
            >
                <FontAwesomeIcon icon={faCog} />
            </button>
        </nav>
    );
};

export default Sidebar;
