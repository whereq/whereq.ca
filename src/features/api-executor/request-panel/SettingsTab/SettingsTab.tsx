import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faToggleOn, faToggleOff } from "@fortawesome/free-solid-svg-icons";
import { 
    getLocalSettings, 
    loadDefaultLocalSettings, 
    updateLocalSetting 
} from "@/utils/localSettingsLoader";
import { RestfulEndpoint } from "@/models/RestfulEndpoint";

type SettingsTabProps = {
    restfulEndpoint?: RestfulEndpoint;
};

export const SettingsTab = ({ restfulEndpoint }: SettingsTabProps) => {
    const [rows, setRows] = useState(getLocalSettings(restfulEndpoint?.url));

    // Load default settings when the tab is activated
    useEffect(() => {
        loadDefaultLocalSettings(); // Reload default settings
        setRows(getLocalSettings(restfulEndpoint?.url)); // Fetch updated settings
    }, [restfulEndpoint?.url]); // Runs when restfulEndpoint.url changes

    const updateRow = (index: number, field: string, value: string | boolean) => {
        const updatedRows = [...rows];
        updatedRows[index] = { ...updatedRows[index], [field]: value };
        setRows(updatedRows);
        if (restfulEndpoint?.url) {
            updateLocalSetting(restfulEndpoint.url, updatedRows[index].key, updatedRows[index].value as string | boolean);
        }
    };

    return (
        <div className="settings-tab bg-gray-900 text-orange-300 font-fira-code">
            <div className="setting-panel-body p-2">
                <table className="settings-table w-full border-collapse">
                    <tbody>
                        {rows.map((row: { key: string; keyName: string; valueType: string; value: string | number | boolean }, index: number) => (
                            <tr key={row.key} className="border-b border-gray-700">
                                <td className="w-1/3 p-2">
                                    <input
                                        type="text"
                                        value={row.keyName}
                                        readOnly
                                        className="w-full bg-gray-800 text-orange-300 border-none outline-none font-fira-code"
                                    />
                                </td>
                                <td className="w-2/3 p-2">
                                    {row.valueType === "boolean" ? (
                                        <button
                                            onClick={() =>
                                                updateRow(index, "value", !(row.value as boolean))
                                            }
                                            className="toggle-button bg-transparent border-none cursor-pointer outline-none"
                                            aria-label={`Toggle ${row.keyName}`}
                                        >
                                            <FontAwesomeIcon
                                                icon={row.value ? faToggleOn : faToggleOff}
                                                className={`text-2xl ${
                                                    row.value ? "text-orange-500" : "text-gray-500"
                                                }`}
                                            />
                                        </button>
                                    ) : (
                                        <input
                                            type="text"
                                            value={row.value as string}
                                            onChange={(e) =>
                                                updateRow(index, "value", e.target.value)
                                            }
                                            className="w-full bg-gray-800 text-orange-300 border-none outline-none font-fira-code"
                                        />
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};