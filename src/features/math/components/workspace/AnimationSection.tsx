import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSquareCaretLeft,
    faSquareCaretRight,
    faTrashAlt,
} from "@fortawesome/free-solid-svg-icons";
import { useMathAnimationStore } from "@/features/math/store/mathStore";

export const AnimationSection = () => {
    const { isMathAnimationSettingVisible, toggleMathAnimationSetting } = useMathAnimationStore();

    return (
        <div className="math-animation-section flex flex-col border-b border-gray-700">
            {/* Section Header */}
            <div className="flex justify-between items-center bg-gray-800">
                <h3 className="text-sm pl-2 font-semibold">Animations</h3>
                <div className="flex items-center">
                    <button
                        className="w-10 h-10 flex items-center justify-center
                                   hover:text-orange-400 hover:bg-gray-700 
                                   rounded-md transition"
                        onClick={toggleMathAnimationSetting}
                        title={isMathAnimationSettingVisible ? "Hide Math Animation Settings" : "Show Math Animation Settings"}
                    >
                        <FontAwesomeIcon
                            icon={isMathAnimationSettingVisible ? faSquareCaretLeft : faSquareCaretRight}
                            size="lg"
                        />
                    </button>
                    <button
                        onClick={() => console.log('Math Animation Cleared')}
                        className="text-sm pr-2 text-red-500 hover:text-red-700"
                        title="Clear Animations"
                    >
                        <FontAwesomeIcon icon={faTrashAlt} />
                    </button>
                </div>
            </div>
        </div>
    );
};