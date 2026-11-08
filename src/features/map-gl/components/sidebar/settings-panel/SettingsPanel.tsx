import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faUndo, faSave } from "@fortawesome/free-solid-svg-icons";
import CustomModal from "@/components/modals/CustomModal"; // Import the reusable modal
import { GLOBAL_SETTINGS } from "@/utils/constants";
import { API_KEY, BASE_KEY, GOOGLE_MAP_ID } from "@/features/map-gl/utils/constants";
import LocalStorageHelper from "@/utils/localStorageHelper";
import React from "react";

type Row = {
    selected: boolean;
    key: string;
    value: string;
    description: string;
}

export const SettingPanel = ({ onClose }: { onClose: () => void }) => {
    const [rows, setRows] = useState<Row[]>([
        { selected: false, key: API_KEY, value: "", description: "Your Google Map API Key" },
        { selected: false, key: GOOGLE_MAP_ID, value: "", description: "Your Google Map ID" },
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

    // Load Google Maps API Key and Map ID from local storage
    useEffect(() => {
        const loadGoogleMapApiKey = async () => {
            const savedSettings = LocalStorageHelper.loadSetting(BASE_KEY);
            if (savedSettings && savedSettings[API_KEY]) {
                setRows((prevRows) =>
                    prevRows.map((row) => {
                        const savedValue = savedSettings?.[row.key];
                        const defaultValue = row.key === API_KEY ? "Enter Your Google Map API Key" : "Enter Your Google Map ID";
                        return {
                            ...row,
                            value: savedValue || defaultValue,
                        };
                    })
                );
            } 
        };

        loadGoogleMapApiKey();
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
        const settingsToSave = rows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {} as Record<string, string>);
        LocalStorageHelper.saveSetting(BASE_KEY, settingsToSave);
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

    // Handle focus on the "Value" cell
    const handleFocus = (index: number) => {
        const key = rows[index].key;
        switch (key) {
            case API_KEY:
                if (rows[index].value === "Enter Your Google Map API Key") {
                    updateRow(index, "value", "");
                }
                break;
            case GOOGLE_MAP_ID:
                if (rows[index].value === "Enter Your Google Map ID") {
                    updateRow(index, "value", "");
                }
                break;
            default:
                break;
        }
    };

    // Handle blur on the "Value" cell
    const handleBlur = (index: number) => {
        const key = rows[index].key;
        switch (key) {
            case API_KEY:
                if (!rows[index].value) {
                    updateRow(index, "value", "Enter Your Google Map API Key");
                }
                break;
            case GOOGLE_MAP_ID:
                if (!rows[index].value) {
                    updateRow(index, "value", "Enter Your Google Map ID");
                }
                break;
            default:
                break;
        }
    };

    return (
        <div className="fixed top-15 left-12 w-[calc(100%-3rem)] h-[calc(100%-76px)] bg-black text-orange font-fira flex flex-col border border-gray-700">

            <div className="flex flex-col p-4 bg-gray-900 border border-gray-700 rounded-lg">
                <h2 className="text-lg font-bold text-orange-400 mb-2">Important Notice</h2>
                <p className="text-sm text-gray-300 mb-2">
                    The <span className="font-semibold text-orange-400">WhereQ Map Application</span> is built on
                    <span className="font-bold text-blue-400"> Google Maps</span> technology. To use this application,
                    a valid <span className="font-semibold text-yellow-400">Google Maps API Key</span> and
                    <span className="font-semibold text-yellow-400"> Map ID</span> are required.
                </p>
                <p className="text-sm text-gray-300 mb-2">
                    Please enter your own <span className="font-semibold text-yellow-400">API Key</span> and
                    <span className="font-semibold text-yellow-400">Map ID</span> in the settings section below.
                    All data is securely stored in your browser's
                    <span className="font-semibold text-blue-400"> local storage</span>.
                    <span className="font-semibold text-orange-400">WhereQ</span> does not access, store, or share any
                    <span className="font-bold text-red-400"> personal information</span> or data from your device under any circumstances.
                </p>
                <p className="text-sm text-gray-300 mb-2">
                    For more details, please refer to the following guide:
                    <a
                        href="https://whereq.github.io/2025/01/08/Building-a-Google-Maps-Application-with-React-and-TypeScript/"
                        className="text-blue-400 underline hover:text-blue-300 font-semibold"
                    >
                        Apply Google Maps API Key and Create a Map ID
                    </a>
                    .
                </p>
            </div>

            {/* Header and buttons */}
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

            {/* Settings table */}
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
                        <React.Fragment key={index}>
                            <div className="border border-gray-700 flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    checked={row.selected}
                                    onChange={(e) => updateRow(index, "selected", e.target.checked)}
                                    className="w-4 h-4"
                                />
                            </div>
                            <div className="border border-gray-700 flex items-center px-2">
                                <input
                                    type="text"
                                    value={row.key}
                                    readOnly
                                    className="w-full bg-transparent text-orange outline-none"
                                />
                            </div>
                            <div className="border border-gray-700 bg-gray-900 flex items-center px-2">
                                <input
                                    type="text"
                                    value={row.value}
                                    onChange={(e) => updateRow(index, "value", e.target.value)}
                                    onFocus={() => handleFocus(index)}
                                    onBlur={() => handleBlur(index)}
                                    className={`w-full bg-transparent outline-none ${row.value === "Enter Your Google Map API Key"
                                            ? "text-gray-500 italic"
                                            : "text-orange"
                                        }`}

                                />
                            </div>

                            <div className="border border-gray-700 flex items-center px-2">
                                <input
                                    type="text"
                                    value={row.description}
                                    onChange={(e) => updateRow(index, "description", e.target.value)}
                                    className="w-full bg-transparent text-orange outline-none"
                                />
                            </div>
                        </React.Fragment>
                    ))}
                </div>
            </div>

            <CustomModal
                isOpen={modalInfo.isOpen}
                onRequestClose={() => setModalInfo({ isOpen: false, message: "" })}
                title={modalInfo.title}
                message={modalInfo.message}
                confirmAction={modalInfo.confirmAction}
                cancelAction={modalInfo.cancelAction}
                isConfirmDialog={modalInfo.isConfirmDialog}
            />
        </div>
    );
};