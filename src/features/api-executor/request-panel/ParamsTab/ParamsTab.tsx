import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faMinus } from "@fortawesome/free-solid-svg-icons";
import { TAB_TYPES, PLACEHOLDERS, LABELS } from "@/utils/constants";
import LocalStorageHelper from "@/utils/localStorageHelper";

interface Row {
    selected: boolean;
    key: string;
    value: string;
    description: string;
}

export const ParamsTab = ({
    restfulEndpointUrl,
    tabType = TAB_TYPES.PARAMETERS,
    initialParams = {},
}: {
    restfulEndpointUrl: string;
    tabType?: string;
    initialParams?: Record<string, string>;
}) => {
    const [rows, setRows] = useState<Row[]>([]);
    const restfulEndpointUrlRef = useRef(restfulEndpointUrl);

    // Update the ref whenever restfulEndpointUrl changes
    useEffect(() => {
        restfulEndpointUrlRef.current = restfulEndpointUrl;
    }, [restfulEndpointUrl]);

    // Initialize rows with the passed-in initialParams
    useEffect(() => {
        const initialRows = Object.entries(initialParams).map(([key, value]) => ({
            selected: true,
            key,
            value,
            description: "",
        }));
        setRows(initialRows);
    }, [initialParams]);

    // Persist changes to local storage when rows change
    useEffect(() => {
        const params = rows
            .filter((row) => row.selected && row.key)
            .reduce((acc, row) => {
                acc[row.key] = row.value;
                return acc;
            }, {} as Record<string, string>);

        if (tabType === TAB_TYPES.PARAMETERS) {
            LocalStorageHelper.setParams(restfulEndpointUrlRef.current, params);
        } else if (tabType === TAB_TYPES.HEADERS) {
            LocalStorageHelper.setHeaders(restfulEndpointUrlRef.current, params);
        }
    }, [rows, tabType]);

    const updateRow = (index: number, field: string, value: string | boolean) => {
        setRows((prevRows) => {
            const updatedRows = [...prevRows];
            updatedRows[index] = { ...updatedRows[index], [field]: value };
            return updatedRows;
        });
    };

    const insertRow = (index: number) => {
        setRows((prevRows) => {
            const newRow = { selected: false, key: "", value: "", description: "" };
            return [
                ...prevRows.slice(0, index + 1),
                newRow,
                ...prevRows.slice(index + 1),
            ];
        });
    };

    const deleteRow = (index: number) => {
        setRows((prevRows) => prevRows.filter((_, i) => i !== index));
    };

    const toggleSelectAll = (checked: boolean) => {
        setRows((prevRows) =>
            prevRows.map((row) => ({ ...row, selected: checked }))
        );
    };

    // Use a real <table> so header columns and body columns share
    // the same column model and are guaranteed to line up — this is
    // the same pattern Postman uses for its params/headers editor.
    //
    // Column widths (Postman-style proportions):
    //   ✓ checkbox | KEY | VALUE | DESCRIPTION | ±
    //   4%         22%   30%     37%           7%
    const keyPlaceholder =
        tabType === TAB_TYPES.HEADERS
            ? PLACEHOLDERS.HEADER_NAME
            : PLACEHOLDERS.PARAM_KEY;

    return (
        <div className="params-tab bg-gray-900 text-orange-300 font-fira-code overflow-x-auto overflow-y-auto max-h-64">
            <table className="w-full table-fixed border-collapse text-sm">
                <colgroup>
                    <col style={{ width: "4%" }} />
                    <col style={{ width: "22%" }} />
                    <col style={{ width: "30%" }} />
                    <col style={{ width: "37%" }} />
                    <col style={{ width: "7%" }} />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-gray-800">
                    <tr className="text-gray-400 border-b border-gray-700">
                        <th className="h-8 px-2 text-center align-middle">
                            <input
                                type="checkbox"
                                checked={rows.length > 0 && rows.every((row) => row.selected)}
                                onChange={(e) => toggleSelectAll(e.target.checked)}
                                className="h-4 w-4 align-middle"
                            />
                        </th>
                        <th className="h-8 px-2 text-left align-middle font-normal">
                            {keyPlaceholder}
                        </th>
                        <th className="h-8 px-2 text-left align-middle font-normal">
                            {LABELS.VALUE}
                        </th>
                        <th className="h-8 px-2 text-left align-middle font-normal">
                            {LABELS.DESCRIPTION}
                        </th>
                        <th className="h-8 px-2 text-left align-middle font-normal">
                            {LABELS.ACTION}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr
                            key={index}
                            className="border-b border-gray-700 hover:bg-gray-800/40"
                        >
                            <td className="h-9 px-2 text-center align-middle">
                                <input
                                    type="checkbox"
                                    checked={row.selected}
                                    onChange={(e) =>
                                        updateRow(index, "selected", e.target.checked)
                                    }
                                    className="h-4 w-4 align-middle"
                                />
                            </td>
                            <td className="h-9 px-2 align-middle">
                                <input
                                    type="text"
                                    value={row.key}
                                    placeholder={keyPlaceholder}
                                    onChange={(e) =>
                                        updateRow(index, "key", e.target.value)
                                    }
                                    className="w-full bg-transparent border-none outline-none text-sm"
                                />
                            </td>
                            <td className="h-9 px-2 align-middle">
                                <input
                                    type="text"
                                    value={row.value}
                                    placeholder={LABELS.VALUE}
                                    onChange={(e) =>
                                        updateRow(index, "value", e.target.value)
                                    }
                                    className="w-full bg-transparent border-none outline-none text-sm"
                                />
                            </td>
                            <td className="h-9 px-2 align-middle">
                                <input
                                    type="text"
                                    value={row.description}
                                    placeholder={LABELS.DESCRIPTION}
                                    onChange={(e) =>
                                        updateRow(index, "description", e.target.value)
                                    }
                                    className="w-full bg-transparent border-none outline-none text-sm"
                                />
                            </td>
                            <td className="h-9 px-2 text-center align-middle">
                                <div className="flex items-center justify-center gap-2">
                                    <button
                                        type="button"
                                        className="icon-button text-blue-500 hover:text-blue-400"
                                        onClick={() => insertRow(index)}
                                        title="Insert row below"
                                    >
                                        <FontAwesomeIcon icon={faPlus} />
                                    </button>
                                    <button
                                        type="button"
                                        className="icon-button text-red-500 hover:text-red-400"
                                        onClick={() => deleteRow(index)}
                                        title="Delete row"
                                    >
                                        <FontAwesomeIcon icon={faMinus} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
