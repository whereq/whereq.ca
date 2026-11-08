import { useState } from "react";
import { Resizable } from "re-resizable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faPlus,
} from "@fortawesome/free-solid-svg-icons";

export const Workspace = () => {
    const [filterText, setFilterText] = useState("");
    const [isResizing, setIsResizing] = useState(false);


    return (
        <Resizable
            defaultSize={{ width: "15%", height: "100%" }}
            maxWidth="50%"
            enable={{ right: true }}
            className={`flex flex-col bg-gray-900 text-orange 
                        font-fira-code h-full ${
                isResizing ? "border-r-2 border-orange" : ""
            }`}
            handleStyles={{ 
                right: { 
                    cursor: "ew-resize", 
                    width: "8px" 
                }
            }}
            handleClasses={{ right: "bg-blue-500 hover:bg-blue-700" }}
            onResizeStart={() => setIsResizing(true)}
            onResizeStop={() => setIsResizing(false)}
        >
            <div className="p-2 flex items-center gap-2 bg-gray-800 text-orange">
                <button className="text-lg hover:text-blue-500">
                    <FontAwesomeIcon icon={faPlus} title="Add New Panel" />
                </button>
                <input
                    type="text"
                    className="flex-grow px-2 py-1 text-sm 
                               border border-gray-600 rounded focus:border-blue-500 focus:outline-none"
                    placeholder="Search Your Maps..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                />
            </div>
        </Resizable>
    );
};
