import { create } from "zustand";
import { SectionType } from "@/features/category/models/CategoryEnum";

interface CategoryStore {
    isWorkspaceVisible: boolean;
    toggleWorkspace: () => void;
    activeSection: SectionType;
    setActiveSection: (section: SectionType) => void;
}

export const useCategoryStore = create<CategoryStore>((set) => ({
    isWorkspaceVisible: false,
    toggleWorkspace: () => set((state) => ({ isWorkspaceVisible: !state.isWorkspaceVisible })),
    activeSection: SectionType.MY_CATEGORIES,
    setActiveSection: (section) => set({ activeSection: section }),
}));
