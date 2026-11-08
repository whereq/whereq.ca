export interface ModalInfo {
    isOpen: boolean;
    title?: string;
    message: string;
    confirmAction?: () => void;
    cancelAction?: () => void;
    isConfirmDialog?: boolean;
}