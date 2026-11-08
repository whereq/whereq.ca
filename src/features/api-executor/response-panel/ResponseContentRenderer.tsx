import ReactMarkdown from "react-markdown";
import { ResponseContent } from "@/models/ResponseContent";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"; // Choose a theme you like
import remarkGfm from "remark-gfm"; // Support GitHub Flavored Markdown (tables, strikethrough, etc.)
import rehypeRaw from "rehype-raw"; // Allow rendering raw HTML within Markdown

import Code from "./Code";

export const ResponseContentRenderer = (response: ResponseContent) => {
    switch (response.type) {
        case "json":
            return (
                <div style={{ maxWidth: "100%", overflow: "auto", height: "100%" }}>
                    <SyntaxHighlighter
                        language="json"
                        style={oneDark}
                        className="response-body"
                        customStyle={{ padding: "0", margin: "0", borderRadius: "0", height: "100%" }} // Apply custom styles
                        wrapLongLines={true} // Ensures long lines are wrapped
                    >
                        {JSON.stringify(response.content, null, 2)}
                    </SyntaxHighlighter>
                </div>
            );
        case "markdown":
            return (
                <div className="markdown-content dark-theme text-left ml-2"
                    style={{ maxWidth: "100%", overflow: "auto", height: "100%" }}
                >
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                            code: Code, // Use the custom Code component
                        }}
                    >
                        {response.content as string}
                    </ReactMarkdown>
                </div>
            );
        default:
            return <div className="text-left" style={{ maxWidth: "100%", overflowX: "auto", height: "100%" }}>Unsupported response type</div>;
    }
};