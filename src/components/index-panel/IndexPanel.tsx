import { useState } from "react";
import { Resizable } from "re-resizable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faPlus,
    faEllipsisH,
    faChevronDown,
    faChevronRight,
    faFolderClosed,
    faFolderOpen,
} from "@fortawesome/free-solid-svg-icons";
import { TopCategory } from "@/models/EndpointCategory";

export const IndexPanel = ({
    panels,
    selectedPanel,
    setSelectedPanel,
}: {
    panels: TopCategory[];
    selectedPanel: string;
    setSelectedPanel: (panel: string) => void;
}) => {
    const [filterText, setFilterText] = useState("");
    const [isResizing, setIsResizing] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [expandedIndexes, setExpandedIndexes] = useState<Set<string>>(new Set());

    const toggleExpand = (set: Set<string>, key: string, setFn: React.Dispatch<React.SetStateAction<Set<string>>>) => {
        const newSet = new Set(set);
        if (newSet.has(key)) {
            newSet.delete(key);
        } else {
            newSet.add(key);
        }
        setFn(newSet);
    };

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
            {/* Updated Container for Button and Input */}
            <div className="p-2 flex items-center gap-2 bg-gray-800 text-orange">
                {/* Button with Fixed Width */}
                <button className="text-lg hover:text-blue-500 flex-shrink-0">
                    <FontAwesomeIcon icon={faPlus} title="Add New Panel" />
                </button>

                {/* Input Field that Shrinks Dynamically */}
                <input
                    type="text"
                    className="flex-grow min-w-[50px] px-2 py-1 text-sm 
                       border border-gray-600 rounded focus:border-blue-500 focus:outline-none
                       overflow-hidden"
                    placeholder="Filter..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                />
            </div>

            <ul className="overflow-y-auto text-sm">
                {panels
                    .filter((topCategory) =>
                        topCategory.name.toLowerCase().includes(filterText.toLowerCase())
                    )
                    .map((topCategory) => (
                        <li key={topCategory.name}>
                            <div
                                className="flex items-center p-2 
                                           cursor-pointer hover:bg-gray-700 whitespace-nowrap"
                                onClick={() =>
                                    toggleExpand(expandedCategories, topCategory.name, setExpandedCategories)
                                }
                            >
                                <FontAwesomeIcon
                                    icon={
                                        expandedCategories.has(topCategory.name)
                                            ? faChevronDown
                                            : faChevronRight
                                    }
                                    className="mr-2 text-orange"
                                />
                                <FontAwesomeIcon
                                    icon={
                                        expandedCategories.has(topCategory.name)
                                            ? faFolderOpen
                                            : faFolderClosed
                                    }
                                    className="mr-2 text-blue-400"
                                />
                                <span>{topCategory.name}</span>
                            </div>
                            {expandedCategories.has(topCategory.name) && (
                                <ul className="ml-4">
                                    {topCategory.categories.map((category) => (
                                        <li key={category.name}>
                                            <div
                                                className="flex items-center p-2 cursor-pointer hover:bg-gray-700 whitespace-nowrap"
                                                onClick={() =>
                                                    toggleExpand(
                                                        expandedCategories,
                                                        category.name,
                                                        setExpandedCategories
                                                    )
                                                }
                                            >
                                                <FontAwesomeIcon
                                                    icon={
                                                        expandedCategories.has(category.name)
                                                            ? faChevronDown
                                                            : faChevronRight
                                                    }
                                                    className="mr-2 text-orange"
                                                />
                                                <FontAwesomeIcon
                                                    icon={
                                                        expandedCategories.has(category.name)
                                                            ? faFolderOpen
                                                            : faFolderClosed
                                                    }
                                                    className="mr-2 text-blue-400"
                                                />
                                                <span>{category.name}</span>
                                            </div>
                                            {expandedCategories.has(category.name) && (
                                                <ul className="ml-4">
                                                    {category.restfulEndpointGroups.map((restfulEndpointGroup) => (
                                                        <li key={restfulEndpointGroup.name}>
                                                            <div
                                                                className="flex items-center p-2 cursor-pointer hover:bg-gray-700 whitespace-nowrap"
                                                                onClick={() =>
                                                                    toggleExpand(
                                                                        expandedIndexes,
                                                                        restfulEndpointGroup.name,
                                                                        setExpandedIndexes
                                                                    )
                                                                }
                                                            >
                                                                <FontAwesomeIcon
                                                                    icon={
                                                                        expandedIndexes.has(restfulEndpointGroup.name)
                                                                            ? faChevronDown
                                                                            : faChevronRight
                                                                    }
                                                                    className="mr-2 text-orange"
                                                                />
                                                                <FontAwesomeIcon
                                                                    icon={
                                                                        expandedIndexes.has(restfulEndpointGroup.name)
                                                                            ? faFolderOpen
                                                                            : faFolderClosed
                                                                    }
                                                                    className="mr-2 text-blue-400"
                                                                />
                                                                <span>{restfulEndpointGroup.name}</span>
                                                            </div>
                                                            {expandedIndexes.has(restfulEndpointGroup.name) && (
                                                                <ul className="ml-4">
                                                                    {restfulEndpointGroup.restfulEndpoints.map(
                                                                        (endpoint, i) => (
                                                                            <li
                                                                                key={i}
                                                                                className={`flex items-center justify-between p-2 cursor-pointer hover:bg-gray-700 whitespace-nowrap  ${
                                                                                    selectedPanel === endpoint.title
                                                                                        ? "bg-gray-700 border-l-4 border-blue-500"
                                                                                        : ""
                                                                                }`}
                                                                                onClick={() =>
                                                                                    setSelectedPanel(endpoint.title)
                                                                                }
                                                                            >
                                                                                <span
                                                                                    className={`mr-2 text-xs uppercase font-bold ${
                                                                                        endpoint.method.toLowerCase() ===
                                                                                        "get"
                                                                                            ? "text-green-500"
                                                                                            : endpoint.method.toLowerCase() ===
                                                                                              "post"
                                                                                            ? "text-blue-500"
                                                                                            : endpoint.method.toLowerCase() ===
                                                                                              "put"
                                                                                            ? "text-yellow-500"
                                                                                            : "text-red-500"
                                                                                    }`}
                                                                                >
                                                                                    {endpoint.method}
                                                                                </span>
                                                                                <span className="flex-grow text-left">
                                                                                    {endpoint.title}
                                                                                </span>
                                                                                <FontAwesomeIcon
                                                                                    icon={faEllipsisH}
                                                                                    className="text-gray-500 hover:text-gray-300"
                                                                                    title="Options"
                                                                                />
                                                                            </li>
                                                                        )
                                                                    )}
                                                                </ul>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
            </ul>
        </Resizable>
    );
};
