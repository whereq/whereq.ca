import { Resizable } from "re-resizable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlobe, faCopy, faTimes } from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import { ResponseCookie } from "@/models/ResponseCookie";
import { CookiesTab } from "@/features/api-executor/response-panel/CookiesTab/CookiesTab";
import { ResponseHeadersTab } from "@/features/api-executor/response-panel/Headers/ResponseHeadersTab";
import { ResponseContent } from "@/models/ResponseContent";
import { ResponseContentRenderer } from "./ResponseContentRenderer";
import { NetworkInformation } from "@/models/NetworkInformation";
import { NetworkInformationModal } from "./network-information-modal/NetworkInformationModal";

export const ResponsePanel = ({
    height,
    response,
    status,
    responseTime,
    cookies,
    headers,
    networkInformation,
}: {
    height: number;
    response: ResponseContent | null;
    status: string | null;
    responseTime: number | null;
    cookies?: ResponseCookie[];
    headers?: Record<string, string>;
    networkInformation?: NetworkInformation;
}) => {
    const [isResizing, setIsResizing] = useState(false);
    const [activeTab, setActiveTab] = useState<"Response" | "Cookies" | "Headers">("Response");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [modalContent, setModalContent] = useState("");

    const showGlobeIcon = false;

    const renderTabContent = () => {
        switch (activeTab) {
            case "Response":
                return response ? (
                    ResponseContentRenderer(response)
                ) : (
                    <div className="text-left" />
                );
            case "Cookies":
                return <CookiesTab cookies={cookies || []} />;
            case "Headers":
                return <ResponseHeadersTab headers={headers} />;
            default:
                return null;
        }
    };

    const handleCopyToClipboard = () => {
        if (response) {
            const content =
                response.type === "markdown"
                    ? response.content
                    : JSON.stringify(response.content, null, 2);
            navigator.clipboard
                .writeText(content as string)
                .then(() => {
                    setModalTitle("Success");
                    setModalContent("Copied to clipboard!");
                    setIsConfirmationModalOpen(true);
                })
                .catch(() => {
                    setModalTitle("Error");
                    setModalContent("Failed to copy!");
                    setIsConfirmationModalOpen(true);
                });
        }
    };

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);
    const closeConfirmationModal = () => setIsConfirmationModalOpen(false);

    return (
        <Resizable
            defaultSize={{ width: "100%", height: `${height}%` }}
            enable={{ top: true }}
            className={`response-panel ${isResizing ? "resizing" : ""}`}
            handleStyles={{
                top: {
                    cursor: "ns-resize",
                },
            }}
            handleClasses={{
                top: "resize-handle-top",
            }}
            onResizeStart={() => setIsResizing(true)}
            onResizeStop={() => setIsResizing(false)}
        >
            <div
                className="response-top-bar flex items-center bg-gray-700 text-orange-300 font-fira-code ml-1.5"
                style={{ width: "100%", maxWidth: "100%", minWidth: 0, height: "2.5rem" }}
            >
                <div className="response-tabs flex flex-grow border-b border-gray-700">
                    {["Response", "Cookies", "Headers"].map((tab) => (
                        <button
                            key={tab}
                            className={`response-tab px-4 py-2 ${activeTab === tab ? "active" : ""}`}
                            onClick={() => setActiveTab(tab as "Response" | "Cookies" | "Headers")}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div className="response-button-group flex items-center space-x-2 ml-auto pr-4">
                    <span className="status-code text-green-500 font-medium">{status}</span>
                    <span className="response-time text-gray-400">Time: {responseTime}ms</span>
                    <div className="icon-group flex items-center space-x-1">
                        {showGlobeIcon && (
                            <FontAwesomeIcon
                                icon={faGlobe}
                                className="response-icon cursor-pointer text-blue-500 hover:text-blue-600"
                                onMouseEnter={openModal}
                                onClick={openModal}
                            />
                        )}
                        <button
                            onClick={handleCopyToClipboard}
                            className="copy-button focus:outline-none"
                            title="Copy to Clipboard"
                        >
                            <FontAwesomeIcon icon={faCopy} className="response-icon text-blue-500 hover:text-blue-600" />
                        </button>
                    </div>
                </div>
            </div>
            <div
                className="response-tab-content flex-grow overflow-y-auto h-full bg-gray-900 text-orange-300 font-fira-code ml-1.5 pr-2"
                style={{
                    height: "calc(100% - 2.5rem)",
                    minWidth: "100%",
                    maxWidth: "100%",
                    overflow: "hidden",
                }}
            >
                {response ? renderTabContent() : <div className="response-body" />}
            </div>

            {/* Network Information Modal */}
            <NetworkInformationModal
                isOpen={isModalOpen}
                onRequestClose={closeModal}
                networkInformation={networkInformation}
            />

            {/* Confirmation Modal */}
            {isConfirmationModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-11/12 max-w-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-orange-300">{modalTitle}</h2>
                            <button
                                onClick={closeConfirmationModal}
                                className="text-gray-400 hover:text-gray-200"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                        <div className="bg-gray-700 p-4 rounded-md overflow-x-auto">
                            <pre className="text-orange-300 font-fira-code whitespace-pre-wrap break-words">
                                {modalContent}
                            </pre>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={closeConfirmationModal}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Resizable>
    );
};