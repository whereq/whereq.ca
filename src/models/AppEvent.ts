import { Action, EventCategory, State, Status } from "@/models/enums/AppEventEnums";

export interface AppEvent {
    id: string; // Unique identifier for the event
    category: EventCategory; // Event category (e.g., "notification", "error")
    action?: Action; // Event action (e.g., "COPY", "DELETE")
    state?: State; // Event state (e.g., "pending")
    status?: Status; // Event status (e.g., "SUCCESS", "FAILED")
    message: string; // Event message to display
    timestamp: number; // Timestamp of when the event occurred
}