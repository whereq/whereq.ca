import { useState, useEffect, useRef } from "react";
import { loadPyodide, PyodideInterface } from "pyodide";
// react-ace@14 is published as CJS (`exports.default = ReactAce`).
// Vite's pre-bundled CJS→ESM transform makes `import X from "react-ace"`
// return the *whole* module.exports object (not the component function).
// Vite then also makes the namespace import `import * as M` give us
// `{ default: <that object> }`. The actual component is two levels deep:
// `mod.default.default`.
// (Verified at runtime: typeof mod.default === "object",
//  typeof mod.default.default === "function".)
import * as ReactAceModule from "react-ace";
const ReactAceDefault = (ReactAceModule as unknown as { default: unknown }).default;
const AceEditor = (ReactAceDefault as { default?: React.ComponentType<Record<string, unknown>> })?.default
    ?? (ReactAceDefault as React.ComponentType<Record<string, unknown>>);

// Import Ace editor modes and themes from node_modules
import "ace-builds/src-noconflict/mode-python"; // Syntax highlighting for Python
import "ace-builds/src-noconflict/mode-java"; // Syntax highlighting for Java
import "ace-builds/src-noconflict/mode-sh"; // Syntax highlighting for Bash
import "ace-builds/src-noconflict/mode-typescript"; // Syntax highlighting for TypeScript
import "ace-builds/src-noconflict/mode-javascript"; // Syntax highlighting for JavaScript
import "ace-builds/src-noconflict/theme-monokai"; // Theme for syntax highlighting

const PYODIDE_VERSION = "v0.29.3";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;

// Module-level singleton. Pyodide is heavy (~10 MB WASM + 5+ MB of stdlib
// packages on first load), so we initialise it once per browser tab and
// share the instance across re-mounts. Without this, React StrictMode
// (or any parent re-render that swaps the CodeFormatter in and out of
// the tree) will trigger a second full download and trip
// MaxListenersExceededWarning on Pyodide's internal stdout/stderr streams.
let pyodideSingleton: PyodideInterface | null = null;
let pyodideInitPromise: Promise<PyodideInterface> | null = null;

async function getPyodide(): Promise<PyodideInterface> {
    if (pyodideSingleton) return pyodideSingleton;
    if (pyodideInitPromise) return pyodideInitPromise;

    pyodideInitPromise = (async () => {
        const pyodide = await loadPyodide({ indexURL: PYODIDE_CDN });

        // Bump the max-listeners limit on Pyodide's stdout/stderr streams.
        // Each `runPythonAsync` call adds a couple of listeners for the
        // duration of the call; under StrictMode + a development server
        // that re-evaluates the module, you can blow past Node's default
        // 10-listener cap and trigger the MaxListenersExceededWarning.
        const streams = [pyodide.stdout, pyodide.stderr].filter(Boolean) as { setMaxListeners?: (n: number) => void }[];
        streams.forEach((s) => s.setMaxListeners?.(50));

        // Install `black`. `loadPackagesFromImports` reads the `import`
        // statement and resolves the right Pyodide packages; then
        // `micropip.install` pulls the pure-Python `black` wheel.
        await pyodide.loadPackage("micropip");
        await pyodide.runPythonAsync(
            "import micropip\n" +
            "await micropip.install('black')\n"
        );

        // Pre-import `black` so the first user click doesn't pay the
        // import cost.
        await pyodide.runPythonAsync("import black\n");

        pyodideSingleton = pyodide;
        return pyodide;
    })();

    try {
        return await pyodideInitPromise;
    } catch (err) {
        // If init fails, clear the promise so a retry is possible.
        pyodideInitPromise = null;
        throw err;
    }
}

const CodeFormatter = () => {
    const [originalCode, setOriginalCode] = useState("");
    const [formattedCode, setFormattedCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [pyodide, setPyodide] = useState<PyodideInterface | null>(pyodideSingleton);
    const [language, setLanguage] = useState("python");
    const initStartedRef = useRef(false);

    useEffect(() => {
        // Skip if we already kicked off init in this render pass.
        // (StrictMode runs effects twice in dev; the singleton guard
        //  above already deduplicates the network work.)
        if (initStartedRef.current) return;
        initStartedRef.current = true;

        (async () => {
            try {
                const instance = await getPyodide();
                setPyodide(instance);
            } catch (err) {
                setError("Failed to load Pyodide or black. Check your network connection.");
                console.error(err);
            }
        })();

        // No teardown: the Pyodide instance is a singleton that lives for
        // the lifetime of the page. Killing it on every unmount would
        // force a re-download the next time the user navigates back.
    }, []);

    const handleFormatCode = async () => {
        if (!originalCode.trim()) {
            setError("Please enter some code to format.");
            return;
        }
        if (!pyodide) {
            setError("Pyodide is not loaded yet.");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            if (language === "python") {
                // Pass the user code as a real Python variable rather than
                // string-interpolating it into a triple-quoted block. This
                // avoids a whole class of escaping bugs (backslashes, ${},
                // triple-quote sequences inside the user's code).
                pyodide.globals.set("user_source", originalCode);
                const result = await pyodide.runPythonAsync(
                    "import black\n" +
                    "black.format_str(user_source, mode=black.Mode())\n"
                );
                setFormattedCode(String(result));
            } else {
                setFormattedCode(originalCode);
            }
        } catch (err) {
            setError("Failed to format the code. Please check the input.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full w-full bg-gray-900 font-fira-code text-orange-300 p-0 m-0 flex flex-col overflow-hidden">
            {/* Horizontal Bar */}
            <div className="flex-none p-1 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <select
                        className="bg-gray-700 text-orange-300 p-1 rounded-md w-32"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                    >
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="bash">Bash</option>
                        <option value="typescript">TypeScript</option>
                        <option value="javascript">JavaScript</option>
                    </select>

                    {error && (
                        <div className="bg-red-500 text-white px-2 py-1 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    {!pyodide && !error && (
                        <div className="bg-yellow-500 text-white px-2 py-1 rounded-md text-sm">
                            Loading Pyodide...
                        </div>
                    )}
                </div>

                <button
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-400"
                    onClick={handleFormatCode}
                    disabled={isLoading || !pyodide}
                >
                    {isLoading ? "Formatting..." : "Format Code"}
                </button>
            </div>

            {/* Grid Container */}
            <div className="grid grid-cols-2 gap-[1px] flex-grow min-h-0">
                {/* Left Box - Original Code */}
                <div className="h-full bg-gray-800 overflow-hidden flex flex-col">
                    <div className="flex-grow relative h-full overflow-hidden">
                        {/* Parent div for line numbers and Ace editor */}
                        <div className="h-full flex overflow-y-auto">
                            {/* Line Numbers */}
                            <div className="w-8 bg-gray-700 text-gray-400 text-right pr-2 select-none">
                                {originalCode.split("\n").map((_, index) => (
                                    <div key={index} style={{ lineHeight: "1.5" }}>
                                        {index + 1}
                                    </div>
                                ))}
                            </div>
                            {/* Ace Editor */}
                            <div className="flex-1">
                                <AceEditor
                                    mode={language} // Set the language mode
                                    theme="monokai" // Set the theme
                                    value={originalCode}
                                    onChange={(code) => setOriginalCode(code)}
                                    placeholder={`Paste your unformatted ${language} code here...`}
                                    fontSize={14} // Set font size
                                    showGutter={false} // Hide the default gutter (line numbers)
                                    width="100%"
                                    height="100%"
                                    style={{
                                        backgroundColor: "#1F2937", // Tailwind's bg-gray-800
                                        color: "#FBBF24", // Tailwind's text-orange-300
                                    }}
                                    setOptions={{
                                        showLineNumbers: false, // Hide line numbers
                                        useWorker: false, // Disable worker for performance
                                        scrollPastEnd: false, // Disable scrolling past the end
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Box - Formatted Code */}
                <div className="h-full bg-gray-800 overflow-hidden flex flex-col">
                    <div className="flex-grow relative h-full overflow-hidden">
                        {/* Parent div for line numbers and Ace editor */}
                        <div className="h-full flex overflow-y-auto">
                            {/* Line Numbers */}
                            <div className="w-8 bg-gray-700 text-gray-400 text-right pr-2 select-none">
                                {formattedCode.split("\n").map((_, index) => (
                                    <div key={index} style={{ lineHeight: "1.5" }}>
                                        {index + 1}
                                    </div>
                                ))}
                            </div>
                            {/* Ace Editor */}
                            <div className="flex-1">
                                <AceEditor
                                    mode={language} // Set the language mode
                                    theme="monokai" // Set the theme
                                    value={formattedCode}
                                    onChange={(code) => setFormattedCode(code)}
                                    placeholder={`Formatted ${language} code will appear here...`}
                                    fontSize={14} // Set font size
                                    showGutter={false} // Hide the default gutter (line numbers)
                                    readOnly // Make the editor read-only
                                    width="100%"
                                    height="100%"
                                    style={{
                                        backgroundColor: "#1F2937", // Tailwind's bg-gray-800
                                        color: "#FBBF24", // Tailwind's text-orange-300
                                    }}
                                    setOptions={{
                                        showLineNumbers: false, // Hide line numbers
                                        useWorker: false, // Disable worker for performance
                                        scrollPastEnd: false, // Disable scrolling past the end
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CodeFormatter;
