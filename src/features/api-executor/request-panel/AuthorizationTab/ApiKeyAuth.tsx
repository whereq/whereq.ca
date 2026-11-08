import { useState } from "react";

export const ApiKeyAuth = () => {
    const [key, setKey] = useState("");
    const [value, setValue] = useState("");
    const [addTo, setAddTo] = useState("Header");

    return (
        <div className="api-key-auth flex flex-col gap-4">
            <input
                type="text"
                placeholder="Key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="border border-gray-700 bg-gray-800 text-orange-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
                type="text"
                placeholder="Value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="border border-gray-700 bg-gray-800 text-orange-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div>
                <label className="block text-gray-400 font-semibold mb-2 text-left">
                    Add to:
                </label>
                <select
                    value={addTo}
                    onChange={(e) => setAddTo(e.target.value)}
                    className="border border-gray-700 bg-gray-800 text-orange-300 p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="Header">Header</option>
                    <option value="Query Params">Query Params</option>
                </select>
            </div>
        </div>
    );
};