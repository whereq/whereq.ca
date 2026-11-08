import { create } from "zustand";
import { SectionType } from "@/features/paws/models/PawsEnum";

interface PawsStore {
    isWorkspaceVisible: boolean;
    toggleWorkspace: () => void;
    activeSection: SectionType;
    setActiveSection: (section: SectionType) => void;
}

export const usePawsStore = create<PawsStore>((set) => ({
    isWorkspaceVisible: false,
    toggleWorkspace: () => set((state) => ({ isWorkspaceVisible: !state.isWorkspaceVisible })),
    activeSection: SectionType.CAT,
    setActiveSection: (section) => set({ activeSection: section }),
}));
