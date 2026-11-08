import { create } from "zustand";
import { SectionType } from "@/features/chemistry/models/ChemistryEnum";

interface ChemistryStore {
    isWorkspaceVisible: boolean;
    toggleWorkspace: () => void;
    activeSection: SectionType;
    setActiveSection: (section: SectionType) => void;
}

export const useChemistryStore = create<ChemistryStore>((set) => ({
    isWorkspaceVisible: false,
    toggleWorkspace: () => set((state) => ({ isWorkspaceVisible: !state.isWorkspaceVisible })),
    activeSection: SectionType.PERIODIC_TABLE,
    setActiveSection: (section) => set({ activeSection: section }),
}));
