import React from "react";
import Modal from "react-modal";
import { NetworkInformation } from "@/models/NetworkInformation";

import "./networkInformationModal.css";

interface NetworkInfoModalProps {
    isOpen: boolean;
    onRequestClose: () => void;
    networkInformation?: NetworkInformation;
}

export const NetworkInformationModal: React.FC<NetworkInfoModalProps> = ({
    isOpen,
    onRequestClose,
    networkInformation,
}) => {
    if (!networkInformation) return null;

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onRequestClose}
            contentLabel="Network Information"
            className="network-information-modal"
            overlayClassName="network-information-overlay"
            shouldCloseOnOverlayClick={true}
        >
            <div className="modal-header">
                <h2>Network Information</h2>
                <button onClick={onRequestClose} className="close-button">
                    &times;
                </button>
            </div>
            <div className="modal-body">
                <table className="network-information-table">
                    <tbody>
                        <tr>
                            <th>Agent</th>
                            <td>{networkInformation.agent}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </Modal>
    );
};