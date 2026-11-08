export interface ResponseContent {
    type: "json" | "markdown"; // Type of the response content
    content: unknown; // The actual content of the response
}