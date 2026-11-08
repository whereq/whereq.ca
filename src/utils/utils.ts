import { AppEvent } from "@/models/AppEvent";
import { EventCategory } from "@/models/enums/AppEventEnums";
import { v4 as uuidv4 } from 'uuid';
import { LOCAL_APP_EVENTS } from "@/utils/constants";
import logUtil from "@/utils/logUtil";

export const isValidImageUrl = (url: string): boolean => {
    try {
        // Check if the URL is valid
        const parsedUrl = new URL(url);

        // Ensure the URL uses a supported protocol (http or https)
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return false;
        }

        // Optionally, validate the file extension (e.g., .jpg, .png, etc.)
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const fileExtension = parsedUrl.pathname.substring(parsedUrl.pathname.lastIndexOf('.')).toLowerCase();
        if (!allowedExtensions.includes(fileExtension)) {
            return false;
        }

        // Optionally, validate the domain (e.g., allow only specific trusted domains)
        // const allowedDomains = ['trusted-domain.com', 'another-trusted-domain.com'];
        // if (!allowedDomains.includes(parsedUrl.hostname)) {
            // return false;
        // }

        return true;
    } catch (error) {
        // If URL parsing fails, it's invalid
        logUtil.log(error);
        return false;
    }
};


// Handle copying any object to clipboard
export const handleCopy = <T,>(object: T, successMessage: string) => {
    // Copy the object as JSON to the clipboard
    navigator.clipboard.writeText(JSON.stringify(object, null, 2));
    // Dispatch a notification event
    const event: AppEvent = {
        id: uuidv4(),
        category: EventCategory.MAP,
        message: successMessage,
        timestamp: Date.now(),
    };
    window.dispatchEvent(new CustomEvent(LOCAL_APP_EVENTS, { detail: event }));
};

export const routeTitles: Record<string, string> = {
  "/": "Universe",
  "/lab": "Lab",
  "/event-board": "App Event Board",
  "/about": "About",
  "/contact": "Contact",
  "/signin": "Sign In/Sign Up",
  "/api-explorer": "API Explorer",
  "/map": "Map",
  "/calendar": "Calendar",
  "/tools": "Tools",
  "/tag": "Tag",
  "/category": "Category",
  "/math": "Math",
  "/physics": "Physics",
  "/chemistry": "Chemistry",
  "/academy": "Academy",
  "/paws": "Paws",
};