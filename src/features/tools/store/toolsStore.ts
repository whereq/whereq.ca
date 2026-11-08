import { create } from "zustand";
import { SectionType } from "@/features/tools/models/ToolsEnum";

interface ToolsStore {
    isWorkspaceVisible: boolean;
    toggleWorkspace: () => void;
    activeSection: SectionType.FORMATTER | SectionType.FORMAT_CONVERTER | SectionType.TEXT_DIAGRAM | SectionType.CANVAS_DRAWING;
    setActiveSection: (section: SectionType.FORMATTER | SectionType.FORMAT_CONVERTER | SectionType.TEXT_DIAGRAM | SectionType.CANVAS_DRAWING) => void;
}

export const useToolsStore = create<ToolsStore>((set) => ({
    isWorkspaceVisible: false,
    toggleWorkspace: () => set((state) => ({ isWorkspaceVisible: !state.isWorkspaceVisible })),
    activeSection: SectionType.FORMATTER,
    setActiveSection: (section) => set({ activeSection: section }),
}));
