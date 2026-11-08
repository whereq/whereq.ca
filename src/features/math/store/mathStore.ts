import { create } from "zustand";
import { SectionType } from "@/features/math/models/MathEnum";

interface MathStore {
    isWorkspaceVisible: boolean;
    toggleWorkspace: () => void;
    activeSection: SectionType.MATH_ANIMATION | SectionType.CALCULATOR | SectionType.FORMULA_CATEGORY | SectionType.MATHEMATICIANS;
    setActiveSection: (section: SectionType.MATH_ANIMATION | SectionType.CALCULATOR | SectionType.FORMULA_CATEGORY | SectionType.MATHEMATICIANS) => void;
}

export const useMathStore = create<MathStore>((set) => ({
    isWorkspaceVisible: false,
    toggleWorkspace: () => set((state) => ({ isWorkspaceVisible: !state.isWorkspaceVisible })),
    activeSection: SectionType.CALCULATOR,
    setActiveSection: (section) => set({ activeSection: section }),
}));

interface MathAnimationStore {
    isMathAnimationSettingVisible: boolean;
    toggleMathAnimationSetting: () => void;
}

export const useMathAnimationStore = create<MathAnimationStore>((set) => ({
    isMathAnimationSettingVisible: false,
    toggleMathAnimationSetting: () => set((state) => ({ isMathAnimationSettingVisible: !state.isMathAnimationSettingVisible })),
}));