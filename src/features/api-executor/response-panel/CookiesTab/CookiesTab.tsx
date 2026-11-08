import { ResponseCookie } from "@/models/ResponseCookie";

export const CookiesTab = ({ cookies }: { cookies: ResponseCookie[] }) => {
    if (!cookies || cookies.length === 0) {
        return (
            <div className="no-cookies-message text-center text-gray-500 p-4">
                No cookies available
            </div>
        );
    }

    return (
        <div className="cookies-grid w-full text-orange-300 font-fira-code">
            {/* Grid Header */}
            <div className="grid grid-cols-7 gap-0 border-b border-gray-700 bg-gray-800">
                <div className="p-1">Name</div>
                <div className="p-1">Value</div>
                <div className="p-1">Domain</div>
                <div className="p-1">Path</div>
                <div className="p-1">Expires</div>
                <div className="p-1">HttpOnly</div>
                <div className="p-1">Secure</div>
            </div>

            {/* Grid Rows */}
            {cookies.map((cookie, index) => (
                <div key={index} className="grid grid-cols-7 gap-0 border-b border-gray-700">
                    <div className="p-1">{cookie.Name}</div>
                    <div className="p-1">{cookie.Value}</div>
                    <div className="p-1">{cookie.Domain || ""}</div>
                    <div className="p-1">{cookie.Path || ""}</div>
                    <div className="p-1">{cookie.Expires || ""}</div>
                    <div className="p-1">{cookie.HttpOnly || ""}</div>
                    <div className="p-1">{cookie.Secure || ""}</div>
                </div>
            ))}
        </div>
    );
};