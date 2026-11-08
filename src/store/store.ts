import { create } from "zustand";
import { ModalInfo } from "@/components/modals/types"
import { APPLICATION_NAME } from "@/utils/constants";

interface AppStore {
    isAppDrawerOpen: boolean;
    setAppDrawerOpen: (isOpen: boolean) => void;
    toggleAppDrawer: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
    isAppDrawerOpen: false,
    setAppDrawerOpen: (isOpen) => set({ isAppDrawerOpen: isOpen }),
    toggleAppDrawer: () => set((state) => ({ isAppDrawerOpen: !state.isAppDrawerOpen })),
}));

interface NavigationState {
  path: string[];
  setPath: (newPath: string[]) => void;
  pushPath: (newSegment: string) => void; // Add a new segment to the path
  popPath: () => void; // Remove the last segment from the path
  resetPath: () => void; // Reset the path to the initial state
}

export const useNavigationStore = create<NavigationState>((set) => ({
  path: [], // Initial path
  setPath: (newPath) =>
    set({
      path: [...newPath.filter((segment) => segment !== APPLICATION_NAME)],
    }),
  pushPath: (newSegment) =>
    set((state) => ({
      path: [...state.path, newSegment],
    })),
  popPath: () =>
    set((state) => ({
      path: state.path.length > 1 ? state.path.slice(0, -1) : state.path,
    })),
  resetPath: () => set({ path: [] }), // Reset to initial state
}));

interface ModalStore {
    modalInfo: ModalInfo;
    setModalInfo: (info: ModalInfo) => void;
}

export const useModalStore = create<ModalStore>((set) => ({
    modalInfo: {isOpen: false, message: ""},
    setModalInfo: (info) => set({ modalInfo: info }),
}));