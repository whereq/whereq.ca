export interface RestfulEndpoint {
    title: string;
    url: string;
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";
    requiresCredentials?: boolean;
    params?: Record<string, string>;
    headers?: Record<string, string>;
    body?: string;
    authorization?: {
        type: "Bearer" | "Basic" | "API Key" | "None";
        token?: string;
    };
    settings?: {
        timeout?: number; // In milliseconds
        retry?: number;
    };
    tags?: string[];
    category?: string[];
}
