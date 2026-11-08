import React, { useState, useEffect } from "react";

interface UrlPanelProps {
    url?: string;
    onSendRequest: () => void;
}

export const UrlPanel: React.FC<UrlPanelProps> = ({ url, onSendRequest }) => {
    const [inputValue, setInputValue] = useState<string>("");
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [isValidUrl, setIsValidUrl] = useState<boolean>(false);

    useEffect(() => {
        // Set dummy URL as placeholder if `url` is empty
        if (!url && !isFocused) {
            setInputValue("");
        } else if (url) {
            setInputValue(url);
        }
    }, [url, isFocused]);

    const handleFocus = () => {
        setIsFocused(true);
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (!inputValue.trim() && !url) {
            setInputValue(""); // Reset to empty for placeholder
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        validateUrl(newValue);
    };

    const validateUrl = (value: string) => {
        const urlPattern = new RegExp(
            "^(https?://)" + // Protocol (http or https)
            "([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})" + // Domain
            "(:\\d+)?(/.*)?$", // Optional port and path
            "i"
        );
        setIsValidUrl(urlPattern.test(value));
    };

    useEffect(() => {
        // Initial validation for the passed URL prop
        if (url) {
            validateUrl(url);
        }
    }, [url]);

    return (
        <div className="flex items-center bg-gray-900 border border-gray-700 p-1 h-12 ml-2 mr-1">
            <input
                type="text"
                className={`endpoint-input flex-1 bg-gray-800 text-orange-300 placeholder-gray-500 
                    placeholder-opacity-50 py-1 px-1 
                    focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !isFocused && !inputValue ? "placeholder" : ""
                }`}
                value={inputValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={!isFocused && !inputValue ? "https://api.example.com/endpoint" : ""}
            />
            <button
                className={`send-button bg-blue-500 text-white px-4 py-1 rounded-r-md ml-1 ${
                    !isValidUrl ? "bg-gray-500 cursor-not-allowed" : "hover:bg-blue-600"
                }`}
                onClick={onSendRequest}
                disabled={!isValidUrl}
            >
                Send
            </button>
        </div>
    );
};