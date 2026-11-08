declare global {
    interface Window {
        google?: {
            maps?: Record<string, unknown>;
        };
    }
}

export {};