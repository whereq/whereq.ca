import React from "react";
import ReactDOM from "react-dom";

interface DialogProps {
    isOpen: boolean;
    title?: string;
    message?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    children?: React.ReactNode; // For custom content inside the dialog
}

export const Dialog: React.FC<DialogProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = "Confirm",
    cancelText = "Cancel",
    children,
}) => {
    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-96 p-6">
                {title && (
                    <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
                )}
                {message && (
                    <p className="text-gray-600 text-sm mb-4">{message}</p>
                )}
                {children}
                <div className="flex justify-end gap-4 mt-4">
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded"
                        >
                            {cancelText}
                        </button>
                    )}
                    {onConfirm && (
                        <button
                            onClick={onConfirm}
                            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
                        >
                            {confirmText}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};