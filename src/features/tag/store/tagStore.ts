import { create } from "zustand";
import { SectionType } from "@/features/tag/models/TagEnum";

interface TagStore {
    isWorkspaceVisible: boolean;
    toggleWorkspace: () => void;
    activeSection: SectionType.MY_TAGS | SectionType.WHEREQ_TAGS;
    setActiveSection: (section: SectionType.MY_TAGS | SectionType.WHEREQ_TAGS) => void;
}

export const useTagStore = create<TagStore>((set) => ({
    isWorkspaceVisible: false,
    toggleWorkspace: () => set((state) => ({ isWorkspaceVisible: !state.isWorkspaceVisible })),
    activeSection: SectionType.MY_TAGS,
    setActiveSection: (section) => set({ activeSection: section }),
}));
