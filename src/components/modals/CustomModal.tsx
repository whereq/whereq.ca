import React from "react";
import Modal from "react-modal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faExclamationCircle,
    faCheckCircle,
    faInfoCircle,
    faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";

/**
 * Visual variant of the modal. Drives the icon + title color.
 *
 * - info (default): blue/neutral informational message
 * - success: positive confirmation (e.g. operation completed)
 * - warning: cautionary message that needs the user's attention before
 *            they proceed (e.g. "uploading a new file will discard the
 *            current result" — the typical case where we need an
 *            explicit choice instead of a destructive default)
 * - error: failure message
 */
export type CustomModalType = "info" | "success" | "warning" | "error";

/**
 * One action button in the modal footer. Each action is fully customisable
 * so the parent can choose labels, colors, and behavior. The order of
 * actions in the array determines the visual order from left to right
 * (destructive / cancel-style actions go on the left, primary actions
 * on the right, per common UI conventions).
 */
export interface CustomModalAction {
    label: string;
    onClick: () => void;
    /** Tailwind classes for the button. Defaults to "bg-orange-500 ...". */
    className?: string;
    /**
     * If true, the modal also closes when this action is clicked (in
     * addition to running the onClick handler). Defaults to true.
     * Set to false if your onClick does its own modal state update.
     */
    autoClose?: boolean;
}

interface ModalProps {
    isOpen: boolean;
    title?: string;
    /**
     * Plain-text or HTML message shown in the body. Rendered via
     * dangerouslySetInnerHTML so callers can pass simple markup.
     * If `children` is provided, that wins and `message` is ignored —
     * use children for richer content (lists, formatted values, etc.).
     */
    message?: string;
    /**
     * Rich body content. Takes precedence over `message`. Use this when
     * you need to show structured data (e.g. a filename + size pair in
     * a list, or a small preview).
     */
    children?: React.ReactNode;
    /** @deprecated Use `actions` instead. Kept for the existing map/calendar flows. */
    confirmAction?: () => void;
    /** @deprecated Use `actions` instead. Kept for the existing map/calendar flows. */
    cancelAction?: () => void;
    /** @deprecated Use `actions` instead. Kept for the existing map/calendar flows. */
    isConfirmDialog?: boolean;
    onRequestClose: () => void;
    type?: CustomModalType;
    /**
     * Custom footer action buttons. When provided, this takes precedence
     * over the legacy confirmAction/cancelAction/isConfirmDialog flow.
     * Each action renders as a button on the right side of the footer.
     */
    actions?: CustomModalAction[];
}

const CustomModal: React.FC<ModalProps> = ({
    isOpen,
    title,
    message,
    children,
    confirmAction,
    cancelAction,
    isConfirmDialog = false,
    onRequestClose,
    type = "info",
    actions,
}) => {
    const getIcon = () => {
        switch (type) {
            case "success":
                return faCheckCircle;
            case "warning":
                return faExclamationTriangle;
            case "error":
                return faExclamationCircle;
            case "info":
            default:
                return faInfoCircle;
        }
    };

    const getTitleColor = () => {
        switch (type) {
            case "success":
                return "text-green-500";
            case "warning":
                return "text-yellow-400";
            case "error":
                return "text-red-400";
            case "info":
            default:
                return "text-orange-500";
        }
    };

    const defaultActionClass =
        "bg-orange-500 hover:bg-orange-600 text-black px-5 py-2 transition-colors duration-200";

    // Compute the actions to render. Prefer the new `actions` prop;
    // fall back to the legacy confirm/cancel flow for existing consumers.
    const resolvedActions: CustomModalAction[] = actions
        ? actions
        : isConfirmDialog
          ? [
                ...(cancelAction
                    ? [
                          {
                              label: "Cancel",
                              onClick: cancelAction,
                              className:
                                  "bg-gray-700 hover:bg-gray-600 text-white px-5 py-2 transition-colors duration-200",
                          },
                      ]
                    : []),
                ...(confirmAction
                    ? [
                          {
                              label: "Confirm",
                              onClick: confirmAction,
                              className: defaultActionClass,
                          },
                      ]
                    : []),
            ]
          : [
                {
                    label: "OK",
                    onClick: onRequestClose,
                    className: defaultActionClass,
                },
            ];

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onRequestClose}
            className="bg-gray-900 p-6 border border-gray-700 shadow-lg font-firacode max-w-md w-full mx-4"
            overlayClassName="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50"
        >
            {/* Title Area */}
            <div
                className={`flex items-center gap-2 mb-4 font-bold text-xl border-b border-gray-700 pb-2 ${getTitleColor()}`}
            >
                <FontAwesomeIcon icon={getIcon()} className="text-lg" />
                {title}
            </div>

            {/* Message Content Area */}
            {children ? (
                <div className="text-orange-300 my-4 border-b border-gray-700 pb-4">{children}</div>
            ) : (
                <div
                    className="text-orange-300 my-4 border-b border-gray-700 pb-4"
                    dangerouslySetInnerHTML={{ __html: message ?? "" }}
                />
            )}

            {/* Footer Action Buttons */}
            {resolvedActions.length > 0 && (
                <div className="flex justify-end gap-3 mt-4">
                    {resolvedActions.map((a, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                a.onClick();
                                if (a.autoClose !== false) onRequestClose();
                            }}
                            className={a.className ?? defaultActionClass}
                        >
                            {a.label}
                        </button>
                    ))}
                </div>
            )}
        </Modal>
    );
};

export default CustomModal;
