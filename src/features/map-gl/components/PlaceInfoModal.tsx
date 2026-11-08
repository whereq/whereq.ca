import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

interface PlaceInfoModalProps {
    content: string;
    onClose: () => void;
}

const PlaceInfoModal: React.FC<PlaceInfoModalProps> = ({ content, onClose }) => {
    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
            onClick={onClose} // Close modal when clicking outside
        >
            <div
                className="bg-[#2c3e50] text-[#fbbf24] p-6 rounded-lg shadow-lg max-w-sm w-full"
                style={{ fontFamily: "Fira Code, monospace" }}
                onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside
            >
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-[#e74c3c] hover:text-[#c0392b]"
                >
                    <FontAwesomeIcon icon={faTimes} />
                </button>
                <div className="text-sm">{content}</div>
            </div>
        </div>
    );
};

export default PlaceInfoModal;