export const ResponseHeadersTab = ({
    headers,
}: {
    headers?: Record<string, string>;
}) => {
    if (!headers || Object.keys(headers).length === 0) {
        return (
            <div className="empty-headers text-center text-gray-500 p-4 font-fira-code">
                No headers available
            </div>
        );
    }

    return (
        <div className="response-headers-tab overflow-auto max-h-full">
            <div className="grid grid-cols-[20%_auto] gap-0 text-orange-300 font-fira-code text-left">
                <div className="bg-gray-800 p-1 border border-gray-700 font-bold">Key</div>
                <div className="bg-gray-800 p-1 border border-gray-700 font-bold">Value</div>
                {Object.entries(headers).map(([key, value]) => (
                    <>
                        <div className="border border-gray-700 p-1 text-left">{key}</div>
                        <div className="border border-gray-700 p-1 text-left">{value}</div>
                    </>
                ))}
            </div>
        </div>
    );
};