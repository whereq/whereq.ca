import { create } from "zustand";
import { SectionType } from "@/features/react/models/ReactEnum";

interface ReactStore {
    /** Whether the demo workspace is open next to the main panel. It starts
     *  open: the demo is about the live component, so it should be on screen
     *  the moment the page loads. */
    isWorkspaceVisible: boolean;
    toggleWorkspace: () => void;
    /** The primitive whose child page is showing. */
    activeSection: SectionType;
    setActiveSection: (section: SectionType) => void;
    /** Whether the code snippets are shown under each demo. */
    showCode: boolean;
    toggleShowCode: () => void;
}

export const useReactStore = create<ReactStore>((set) => ({
    isWorkspaceVisible: true,
    toggleWorkspace: () => set((state) => ({ isWorkspaceVisible: !state.isWorkspaceVisible })),
    activeSection: SectionType.SEARCH_BOX,
    setActiveSection: (section) => set({ activeSection: section }),
    showCode: true,
    toggleShowCode: () => set((state) => ({ showCode: !state.showCode })),
}));
