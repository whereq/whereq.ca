import { create } from "zustand";
import { SectionType } from "@/features/physics/models/PhysicsEnum";

interface PhysicsStore {
    isWorkspaceVisible: boolean;
    setWorkspaceVisible: (visible: boolean) => void;
    toggleWorkspace: () => void;
    activeSection: SectionType;
    setActiveSection: (section: SectionType) => void;
}

export const usePhysicsStore = create<PhysicsStore>((set) => ({
    isWorkspaceVisible: false,
    setWorkspaceVisible: (visible) => set({ isWorkspaceVisible: visible }),
    toggleWorkspace: () => set((state) => ({ isWorkspaceVisible: !state.isWorkspaceVisible })),
    activeSection: SectionType.CONSTANTS,
    setActiveSection: (section) => set({ activeSection: section }),
}));
