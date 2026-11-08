import { create } from "zustand";
import { SectionType } from "@/features/multimedia/models/MultimediaEnum";

interface MultimediaStore {
    isWorkspaceVisible: boolean;
    toggleWorkspace: () => void;
    activeSection: SectionType;
    setActiveSection: (section: SectionType) => void;
}

export const useMultimediaStore = create<MultimediaStore>((set) => ({
    isWorkspaceVisible: false,
    toggleWorkspace: () => set((state) => ({ isWorkspaceVisible: !state.isWorkspaceVisible })),
    // Default to a working tool. YouTube Capture was the previous
    // default but is temporarily hidden (see Sidebar.tsx); we still
    // leave the YOUTUBE_CAPTURE enum value in the store so a stale
    // localStorage value doesn't crash the renderer.
    activeSection: SectionType.BACKGROUND_REMOVER,
    setActiveSection: (section) => set({ activeSection: section }),
}));
