import { ReactNode, useEffect, useState } from "react";
import { AppEvent } from "@/models/AppEvent";
import LocalStorageHelper from "@/utils/localStorageHelper";
import { LOCAL_APP_EVENTS, LOCAL_STORAGE_KEYS } from "@/utils/constants";

const PageLayout = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<AppEvent[]>([]);

  useEffect(() => {
    const handleEvent = (event: CustomEvent<AppEvent>) => {
      const newEvent = event.detail;

      // Add new event to notifications
      setNotifications((prev) => [newEvent, ...prev]);

      // Save new event to local storage at the beginning of the array
      const existingEvents = LocalStorageHelper.load<AppEvent[]>(LOCAL_STORAGE_KEYS.LOCAL_APP_EVENTS) || [];
      LocalStorageHelper.save(LOCAL_STORAGE_KEYS.LOCAL_APP_EVENTS, [newEvent, ...existingEvents]);

      // Remove notification after 2 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((e) => e.id !== newEvent.id));
      }, 2000);
    };

    // Add and clean up event listener
    window.addEventListener(LOCAL_APP_EVENTS, handleEvent as EventListener);
    return () => {
      window.removeEventListener(LOCAL_APP_EVENTS, handleEvent as EventListener);
    };
  }, []);

  return (
    <div className="main-layout h-full bg-gray-900 text-orange-300 font-fira-code overflow-hidden">
      {/* Notification Container */}
      <div className="fixed top-12 right-4 z-50 space-y-2 overflow-hidden">
        {notifications.map((event) => (
          <div
            key={event.id}
            className="p-4 bg-gray-800 text-orange-500 rounded shadow-lg animate-fade-in"
          >
            {event.message}
          </div>
        ))}
      </div>

      {/* Main Content */}
      {children}
    </div>
  );
};

export default PageLayout;
