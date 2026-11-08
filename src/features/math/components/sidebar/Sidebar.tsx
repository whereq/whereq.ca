import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCalculator,
    faChessKing,
    faCog,
} from "@fortawesome/free-solid-svg-icons";

import { useMathStore } from "@/features/math/store/mathStore";
import MathAnimationIcon from "@/features/math/icons/MathAnimationIcon"; // Import the SVG
import FormulaCategoryIcon from "@/features/math/icons/FormulaCategoryIcon"; // Import the SVG

import { SectionType } from "@/features/math/models/MathEnum";

export const Sidebar = ({
    openSettings,
}: {
    openSettings: () => void;
}) => {
    const { activeSection, setActiveSection, isWorkspaceVisible, toggleWorkspace } = useMathStore();

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
        <div className="math-sidebar w-16 bg-gray-800 flex flex-col 
                        items-center pt-4 text-orange-300 
                        h-full font-fira-code
                        border-r border-orange-700">



            {/* Formular Animation Button */}
            <button
                className="mb-4 w-10 h-10 flex 
                           items-center justify-center
                           hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition"
                onClick={() => handleSectionToggle(SectionType.MATH_ANIMATION)}
                title={"Formular Animation"}
            >
                <MathAnimationIcon className="w-5 h-5" /> 
            </button>

            {/* Calculator Button */}
            <button
                className="mb-4 w-10 h-10 flex 
                           items-center justify-center
                           hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition"
                onClick={() => handleSectionToggle(SectionType.CALCULATOR)}
                title={"Calculator"}
            >
                <FontAwesomeIcon
                    icon={faCalculator}
                    size="lg"
                />
            </button>

            {/* Text Diagram Button */}
            <button
                className="mb-4 w-10 h-10 flex 
                           items-center justify-center
                           hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition"
                onClick={() => handleSectionToggle(SectionType.FORMULA_CATEGORY)}
                title={"Formula Category"}
            >
                <FormulaCategoryIcon className="w-5 h-5" /> 
            </button>

            {/* Mathematicians */}
            <button
                className="mb-4 w-10 h-10 flex 
                           items-center justify-center
                           hover:text-orange-400 hover:bg-gray-700 
                           rounded-md transition"
                onClick={() => handleSectionToggle(SectionType.MATHEMATICIANS)}
                title={"Mathematicians"}
            >
                <FontAwesomeIcon
                    icon={faChessKing}
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