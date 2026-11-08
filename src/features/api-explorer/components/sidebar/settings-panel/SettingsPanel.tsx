import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faUndo, faSave } from "@fortawesome/free-solid-svg-icons";
import Modal from "react-modal";
import { GLOBAL_SETTINGS } from "@/utils/constants";
import { GLOBAL_SETTINGS_KEYS } from "@/utils/constants";

export const SettingPanel = ({ onClose }: { onClose: () => void }) => {
    const [rows, setRows] = useState([
        { selected: false, key: GLOBAL_SETTINGS_KEYS.HTTP_PROXY, value: "http://127.0.0.1:7777", description: "Your Local Http Proxy" },
    ]);
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [modalInfo, setModalInfo] = useState<{
        isOpen: boolean;
        title?: string;
        message: string;
        confirmAction?: () => void;
        cancelAction?: () => void;
        isConfirmDialog?: boolean;
    }>({
        isOpen: false,
        message: "",
    });

    useEffect(() => {
        const savedSettings = localStorage.getItem(GLOBAL_SETTINGS);
        if (savedSettings) {
            setRows(JSON.parse(savedSettings));
        }
    }, []);

    const updateRow = (index: number, field: string, value: string | boolean) => {
        setRows((prevRows) => {
            const updatedRows = [...prevRows];
            updatedRows[index] = { ...updatedRows[index], [field]: value };
            return updatedRows;
        });
        setUnsavedChanges(true);
    };

    const toggleSelectAll = (checked: boolean) => {
        setRows((prevRows) =>
            prevRows.map((row) => ({ ...row, selected: checked }))
        );
        setUnsavedChanges(true);
    };

    const handleSave = () => {
        localStorage.setItem(GLOBAL_SETTINGS, JSON.stringify(rows));
        setUnsavedChanges(false);
        setModalInfo({
            isOpen: true,
            title: "Saved Changes",
            message: "Settings have been saved successfully.",
        });
    };

    const handleRevert = () => {
        const savedSettings = localStorage.getItem(GLOBAL_SETTINGS);
        if (savedSettings) {
            setRows(JSON.parse(savedSettings));
            setUnsavedChanges(false);
        }
        setModalInfo({
            isOpen: true,
            message: "Settings restored from saved version!",
        });
    };

    const handleClose = () => {
        if (unsavedChanges) {
            setModalInfo({
                isOpen: true,
                message: "You have unsaved changes. Are you sure you want to close?",
                isConfirmDialog: true,
                confirmAction: () => {
                    setModalInfo({ isOpen: false, message: "" });
                    onClose();
                },
                cancelAction: () => setModalInfo({ isOpen: false, message: "" }),
            });
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed 
                top-12 left-12 
                w-[calc(100%-3.25rem)] h-[calc(100vh-30rem)]
                bg-gray-900
                text-orange font-fira flex flex-col 
                border-2 border-gray-700">
            <div className="flex justify-between items-center px-4 py-2 bg-gray-900 border-b border-gray-700">
                <h2 className="text-lg">Settings</h2>
                <div className="flex gap-2">
                    <button
                        onClick={handleRevert}
                        className="text-orange hover:text-yellow-400"
                        title="Revert"
                    >
                        <FontAwesomeIcon icon={faUndo} />
                    </button>
                    <button
                        onClick={handleSave}
                        className="text-orange hover:text-yellow-400"
                        title="Save"
                    >
                        <FontAwesomeIcon icon={faSave} />
                    </button>
                    <button
                        onClick={handleClose}
                        className="text-orange hover:text-yellow-400"
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
            </div>
            <div className="flex-grow overflow-y-auto">
                <div className="grid grid-cols-[5%,20%,35%,40%] gap-0 border border-gray-700">
                    <div className="bg-gray-800 text-center font-bold border border-gray-700">
                        <input
                            type="checkbox"
                            checked={rows.every((row) => row.selected)}
                            onChange={(e) => toggleSelectAll(e.target.checked)}
                            className="w-4 h-4 mx-auto"
                        />
                    </div>
                    <div className="bg-gray-800 text-center font-bold border border-gray-700">Key</div>
                    <div className="bg-gray-800 text-center font-bold border border-gray-700">Value</div>
                    <div className="bg-gray-800 text-center font-bold border border-gray-700">Description</div>
                    {rows.map((row, index) => (
                        <>
                            <div key={`select-${index}`} className="border border-gray-700 flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    checked={row.selected}
                                    onChange={(e) =>
                                        updateRow(index, "selected", e.target.checked)
                                    }
                                    className="w-4 h-4"
                                />
                            </div>
                            <div key={`key-${index}`} className="border border-gray-700 flex items-center px-2">
                                <input
                                    type="text"
                                    value={row.key}
                                    readOnly
                                    className="w-full bg-transparent text-orange outline-none"
                                />
                            </div>
                            <div key={`value-${index}`} className="border border-gray-700 flex items-center px-2">
                                <input
                                    type="text"
                                    value={row.value}
                                    onChange={(e) =>
                                        updateRow(index, "value", e.target.value)
                                    }
                                    className="w-full bg-transparent text-orange outline-none"
                                />
                            </div>
                            <div key={`desc-${index}`} className="border border-gray-700 flex items-center px-2">
                                <input
                                    type="text"
                                    value={row.description}
                                    onChange={(e) =>
                                        updateRow(index, "description", e.target.value)
                                    }
                                    className="w-full bg-transparent text-orange outline-none"
                                />
                            </div>
                        </>
                    ))}
                </div>
            </div>
            <Modal
                isOpen={modalInfo.isOpen}
                onRequestClose={() => setModalInfo({ isOpen: false, message: "" })}
                className="bg-gray-800 p-4 rounded-md"
                overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
            >
                <div className="text-orange text-center font-bold mb-2">{modalInfo.title}</div>
                <div
                    className="text-white"
                    dangerouslySetInnerHTML={{ __html: modalInfo.message }}
                ></div>
                <div className="flex justify-end gap-2 mt-4">
                    {modalInfo.isConfirmDialog && modalInfo.cancelAction && (
                        <button
                            onClick={modalInfo.cancelAction}
                            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
                        >
                            Cancel
                        </button>
                    )}
                    {modalInfo.isConfirmDialog && modalInfo.confirmAction && (
                        <button
                            onClick={modalInfo.confirmAction}
                            className="bg-orange hover:bg-yellow-500 text-black px-4 py-2 rounded"
                        >
                            Confirm
                        </button>
                    )}
                    {!modalInfo.isConfirmDialog && (
                        <button
                            onClick={() => setModalInfo({ isOpen: false, message: "" })}
                            className="bg-orange hover:bg-yellow-500 text-black px-4 py-2 rounded"
                        >
                            OK
                        </button>
                    )}
                </div>
            </Modal>
        </div>
    );
};
