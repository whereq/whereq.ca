import { create } from "zustand";
import { persist } from "zustand/middleware";
import Event from "@/features/calendar/model/event";

import { CALENDAR_LOCAL_STORAGE_KEYS } from "@/features/calendar/utils/constants";
import LocalStorageHelper from "@/utils/localStorageHelper";

interface EventStore {
  events: Event[];
  addEvent: (event: Event) => void;
  fetchEvents: () => void;
}

export const useEventStore = create<EventStore>()(
  persist(
    (set) => ({
      events: [],
      addEvent: (event) => {
        LocalStorageHelper.save(CALENDAR_LOCAL_STORAGE_KEYS.EVENTS, JSON.stringify(event));
        set((state) => ({ events: [...state.events, event] }));
      },
      fetchEvents: () => {
        const events = Object.keys(localStorage).reduce((acc, key) => {
          if (key.startsWith(window.location.href)) {
            const event = JSON.parse(localStorage.getItem(key) || "{}");
            acc.push(event);
          }
          return acc;
        }, [] as Event[]);
        set({ events });
      },
    }),
    {
      name: "event-storage", // Unique name for local storage
    }
  )
);