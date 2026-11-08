export interface NetworkInformation {
    agent: string;
    responseTime: number;
    headers: Record<string, string>;
    status: string | null;
    statusText: string | null;
}