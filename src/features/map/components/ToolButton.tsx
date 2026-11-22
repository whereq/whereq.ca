/**
 * @file ToolButton.tsx
 *
 * One button in the map's tool bar.
 *
 * Every button in the bar carries a tooltip, because an icon on its own
 * does not say what it does — the bar holds a hand, five shape tools, a
 * ruler and four file actions, and they look alike.
 *
 * The tooltip is plain CSS: the wrapper is a Tailwind `group` and the
 * label appears on `group-hover`. It is positioned above the button so
 * it never covers the map underneath, and it is not interactive, so the
 * pointer never leaves the button while the label is up.
 */
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

interface ToolButtonProps {
    /** The icon to show. */
    icon: IconDefinition;
    /** The tooltip, and the accessible name of the button. */
    label: string;
    /** What the button does. */
    onClick: () => void;
    /** True when the button cannot be used right now. */
    disabled?: boolean;
    /** True when the tool is the one that is currently active. */
    active?: boolean;
    /** Extra classes for the button itself. */
    className?: string;
}

const ToolButton: React.FC<ToolButtonProps> = ({
    icon,
    label,
    onClick,
    disabled = false,
    active = false,
    className = "",
}) => (
    <span className="relative group inline-flex">
        <button
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className={`p-1 ${active ? "bg-orange-500 text-white" : "bg-gray-700"} ${
                disabled ? "cursor-not-allowed opacity-50" : "hover:bg-gray-600"
            } ${className}`}
        >
            <FontAwesomeIcon icon={icon} />
        </button>
        <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 hidden -translate-x-1/2 whitespace-nowrap border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-orange-300 shadow group-hover:block"
        >
            {label}
        </span>
    </span>
);

export default ToolButton;
