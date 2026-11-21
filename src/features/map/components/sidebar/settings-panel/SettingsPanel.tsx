import { useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faUndo, faSave, faTrash } from "@fortawesome/free-solid-svg-icons";
import CustomModal from "@/components/modals/CustomModal"; // Import the reusable modal
import { API_KEY, GOOGLE_MAP_ID, MAP_LOCAL_STORAGE_KEYS } from "@/features/map/utils/constants";
import {
    hasDeploymentMapCredentials,
    readDeploymentMapCredentials,
    readGoogleMapCredentials,
    readSavedMapCredentials,
} from "@/features/map/utils/mapCredentials";
import LocalStorageHelper from "@/utils/localStorageHelper";

type Row = {
    selected: boolean;
    key: string;
    value: string;
    description: string;
    /** Shown while the field is empty. Never stored. */
    placeholder: string;
}

export const SettingPanel = ({ onClose }: { onClose: () => void }) => {
    // The saved Google Maps API key and map ID are read up front, so the
    // fields start out filled in.
    //
    // The credentials are read through the shared resolver, so a key that was
    // saved in the "Google Map ID" field (the historical mix-up) is shown in
    // the API key row instead of being lost.
    const [rows, setRows] = useState<Row[]>(() => {
        const { apiKey, mapId } = readGoogleMapCredentials();
        return [
            {
                selected: false,
                key: API_KEY,
                value: apiKey,
                description: "Your Google Map API Key",
                placeholder: "Enter Your Google Map API Key",
            },
            {
                selected: false,
                key: GOOGLE_MAP_ID,
                value: mapId,
                description: "Your Google Map ID",
                placeholder: "Enter Your Google Map ID",
            },
        ];
    });
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    // True while the map is running on the shared WhereQ key that ships with
    // the site, rather than on a key the visitor entered themselves.
    const [isUsingSharedKey] = useState(
        () => hasDeploymentMapCredentials() && readSavedMapCredentials().apiKey === ""
    );
    // The credentials as they are currently stored, used to detect whether a
    // save actually changed the key or the map ID.
    //
    // This deliberately tracks the *saved* credentials only, not the effective
    // ones: the deployment's own key and map ID are not "the user's settings",
    // so saving them back must not look like a change.
    const savedCredentialsRef = useRef(readSavedMapCredentials());
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

    /** Empty the selected fields. The change is applied when the user saves. */
    const handleClearSelected = () => {
        const selectedCount = rows.filter((row) => row.selected).length;
        if (selectedCount === 0) {
            return;
        }
        setRows((prevRows) =>
            prevRows.map((row) => (row.selected ? { ...row, value: "" } : row))
        );
        setUnsavedChanges(true);
        setModalInfo({
            isOpen: true,
            title: "Cleared",
            message: `${selectedCount === 1 ? "1 field has" : `${selectedCount} fields have`} been emptied. Press Save to apply.`,
        });
    };

    const handleSave = () => {
        const deployment = readDeploymentMapCredentials();

        const settingsToSave = rows.reduce((acc, row) => {
            acc[row.key] = row.value.trim();
            return acc;
        }, {} as Record<string, string>);

        // A field that still holds the deployment's own value is not copied
        // into this browser's storage. Storing it would freeze a private copy
        // of the shared key here, and that copy would keep winning over the
        // deployment value even after the deployment key is rotated. Leaving
        // the field empty keeps this browser following the deployment.
        const storedApiKey = deployment.apiKey && settingsToSave[API_KEY] === deployment.apiKey
            ? ""
            : settingsToSave[API_KEY];
        const storedMapId = deployment.mapId && settingsToSave[GOOGLE_MAP_ID] === deployment.mapId
            ? ""
            : settingsToSave[GOOGLE_MAP_ID];

        LocalStorageHelper.saveSetting(MAP_LOCAL_STORAGE_KEYS.BASE_KEY, {
            ...settingsToSave,
            [API_KEY]: storedApiKey,
            [GOOGLE_MAP_ID]: storedMapId,
        });
        setUnsavedChanges(false);

        const previous = savedCredentialsRef.current;
        const next = {
            apiKey: storedApiKey,
            mapId: storedMapId,
        };
        savedCredentialsRef.current = next;

        // Only an effective change matters: the map is loaded once per page
        // load, so it only needs a reload when the key or the map ID that will
        // actually be used differs from the one in use now.
        const effectiveBefore = {
            apiKey: previous.apiKey || deployment.apiKey,
            mapId: previous.mapId || deployment.mapId,
        };
        const effectiveAfter = {
            apiKey: next.apiKey || deployment.apiKey,
            mapId: next.mapId || deployment.mapId,
        };

        if (effectiveBefore.apiKey !== effectiveAfter.apiKey || effectiveBefore.mapId !== effectiveAfter.mapId) {
            // The Maps JavaScript API is loaded only once per page load, so a
            // new key or map ID only takes effect after a reload.
            setModalInfo({
                isOpen: true,
                title: "Saved Changes",
                message: "Your settings have been saved. Reload the page to load the map with them.",
                isConfirmDialog: true,
                confirmAction: () => window.location.reload(),
                cancelAction: () => setModalInfo({ isOpen: false, message: "" }),
            });
            return;
        }

        setModalInfo({
            isOpen: true,
            title: "Saved Changes",
            message: "Settings have been saved successfully.",
        });
    };

    const handleRevert = () => {
        const { apiKey, mapId } = readGoogleMapCredentials();
        setRows((prevRows) =>
            prevRows.map((row) => {
                const savedValue = row.key === API_KEY ? apiKey : mapId;
                return { ...row, value: savedValue };
            })
        );
        setUnsavedChanges(false);
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

    const allSelected = rows.length > 0 && rows.every((row) => row.selected);
    const anySelected = rows.some((row) => row.selected);

    return (
        <div className="fixed top-15 left-12 right-12 h-[calc(100%-76px)] flex flex-col overflow-hidden border border-gray-700 bg-gray-900 text-left">

            <div className="shrink-0 border-b border-gray-700 bg-gray-900 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-bold text-orange-400">Important Notice</h2>
                    {isUsingSharedKey && (
                        <span className="rounded border border-green-500/40 bg-green-500/10 px-2 py-0.5 text-xs text-green-300">
                            Using the shared WhereQ key
                        </span>
                    )}
                </div>
                {/* A measure limit keeps the line length readable instead of
                    letting the text run the full width of a wide screen. */}
                <div className="max-w-4xl space-y-2 text-sm leading-relaxed text-gray-300">
                    <p>
                        The <span className="font-semibold text-orange-400">WhereQ Map Application</span> is built on
                        <span className="font-bold text-blue-400"> Google Maps</span> technology.
                        {isUsingSharedKey ? (
                            <>
                                {" "}It is running on the shared
                                <span className="font-semibold text-yellow-400"> WhereQ Maps key</span>, so the map works
                                straight away - there is nothing you have to do.
                            </>
                        ) : (
                            <>
                                {" "}To use this application, a valid
                                <span className="font-semibold text-yellow-400"> Google Maps API Key</span> and
                                <span className="font-semibold text-yellow-400"> Map ID</span> are required.
                            </>
                        )}
                    </p>
                    <p>
                        You can keep using the shared key, or enter your own
                        <span className="font-semibold text-yellow-400"> API Key</span> and
                        <span className="font-semibold text-yellow-400"> Map ID</span> in the settings section below to use
                        them instead. Your own values are stored only in your browser's
                        <span className="font-semibold text-blue-400"> local storage</span>, and they take precedence over
                        the shared key.
                        <span className="font-semibold text-orange-400">WhereQ</span> does not access, store, or share any
                        <span className="font-bold text-red-400"> personal information</span> or data from your device under any circumstances.
                    </p>
                    <p>
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
            </div>

            {/* Header and buttons */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-700 bg-gray-900 px-4 py-2">
                <h2 className="text-lg">Settings</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleClearSelected}
                        disabled={!anySelected}
                        className="text-orange hover:text-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
                        title="Clear the selected fields"
                        aria-label="Clear the selected fields"
                    >
                        <FontAwesomeIcon icon={faTrash} />
                    </button>
                    <button
                        onClick={handleRevert}
                        className="text-orange hover:text-yellow-400"
                        title="Revert"
                        aria-label="Revert to the saved settings"
                    >
                        <FontAwesomeIcon icon={faUndo} />
                    </button>
                    <button
                        onClick={handleSave}
                        className="text-orange hover:text-yellow-400"
                        title="Save"
                        aria-label="Save the settings"
                    >
                        <FontAwesomeIcon icon={faSave} />
                    </button>
                    <button
                        onClick={handleClose}
                        className="text-orange hover:text-yellow-400"
                        title="Close"
                        aria-label="Close the settings panel"
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
            </div>

            {/* Settings table */}
            <div className="flex-grow overflow-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="bg-gray-800 text-orange-300">
                            <th scope="col" className="sticky top-0 z-10 w-12 border border-gray-700 bg-gray-800 px-2 py-2 text-center">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={(e) => toggleSelectAll(e.target.checked)}
                                    className="w-4 h-4 mx-auto"
                                    aria-label="Select all settings"
                                />
                            </th>
                            <th scope="col" className="sticky top-0 z-10 w-[18%] border border-gray-700 bg-gray-800 px-3 py-2 text-left">
                                Key
                            </th>
                            <th scope="col" className="sticky top-0 z-10 w-[42%] border border-gray-700 bg-gray-800 px-3 py-2 text-left">
                                Value
                            </th>
                            <th scope="col" className="sticky top-0 z-10 w-[40%] border border-gray-700 bg-gray-800 px-3 py-2 text-left">
                                Description
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={row.key} className="bg-gray-900 hover:bg-gray-800/60">
                                <td className="border border-gray-700 px-2 py-1 text-center">
                                    <input
                                        type="checkbox"
                                        checked={row.selected}
                                        onChange={(e) => updateRow(index, "selected", e.target.checked)}
                                        className="w-4 h-4"
                                        aria-label={`Select ${row.key}`}
                                    />
                                </td>
                                <th scope="row" className="border border-gray-700 px-3 py-1 text-left font-normal text-orange">
                                    {row.key}
                                </th>
                                <td className="border border-gray-700 px-3 py-1">
                                    <input
                                        type="text"
                                        value={row.value}
                                        placeholder={row.placeholder}
                                        onChange={(e) => updateRow(index, "value", e.target.value)}
                                        className="w-full min-w-0 bg-transparent text-orange outline-none focus:text-yellow-300 placeholder:text-gray-500"
                                        aria-label={`${row.key} value`}
                                        spellCheck={false}
                                        autoComplete="off"
                                    />
                                </td>
                                <td className="border border-gray-700 px-3 py-1">
                                    <input
                                        type="text"
                                        value={row.description}
                                        onChange={(e) => updateRow(index, "description", e.target.value)}
                                        className="w-full min-w-0 bg-transparent text-orange outline-none"
                                        aria-label={`${row.key} description`}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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
