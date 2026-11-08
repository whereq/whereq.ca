import { useMathStore } from "@/features/math/store/mathStore";
import { SectionType } from "@/features/math/models/MathEnum";
// import CircleAreaAnimation from "@/features/math/components/formular-Animation/CircleAreaAnimation";
import CubeAreaAnimation from "@/features/math/components/animation/CubeAreaAnimation";
import FormulaWiki from "@/features/math/components/formula/FormulaWiki";
import Calculator from "@/features/math/components/calculator/Calculator";

const Math = () => {
    const { activeSection } = useMathStore();

    return (
        <div className="math-container mx-auto h-full">
            {/* Conditionally render CircleAreaAnimation */}
            {activeSection === SectionType.MATH_ANIMATION && (
                // <CircleAreaAnimation />
                <CubeAreaAnimation />
            )}

            {activeSection === SectionType.FORMULA_CATEGORY && (
                <FormulaWiki />
            )}

            {activeSection === SectionType.CALCULATOR && (
                <Calculator />
            )}
        </div>
    );
};

export default Math;