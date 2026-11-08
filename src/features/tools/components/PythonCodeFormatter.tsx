import { useState, useEffect } from "react";
import { loadPyodide, PyodideInterface } from "pyodide"; // Import Pyodide
import Editor from "react-simple-code-editor";
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-python"; // Syntax highlighting for Python
import "prismjs/themes/prism-okaidia.css"; // Theme for syntax highlighting

const PythonCodeFormatter = () => {
  const [originalCode, setOriginalCode] = useState("");
  const [formattedCode, setFormattedCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [pyodide, setPyodide] = useState<PyodideInterface | null>(null);

  // Load Pyodide and install black
  useEffect(() => {
    let pyodideInstance: PyodideInterface | null = null;

    const loadPyodideAndBlack = async () => {
      try {
        // Load Pyodide from local files
        pyodideInstance = await loadPyodide({
          indexURL: "../../../libs/pyodide/", // Path to your self-hosted Pyodide files
        });

        // Install black
        await pyodideInstance.loadPackage("micropip");
        await pyodideInstance.runPythonAsync(`
import micropip
await micropip.install('black')
`);

        setPyodide(pyodideInstance);
      } catch (err) {
        setError("Failed to load Pyodide or black.");
        console.error(err);
      }
    };

    loadPyodideAndBlack();

    // Cleanup function to unload Pyodide when the component unmounts
    return () => {
      if (pyodideInstance) {
        // Clean up Pyodide resources
        pyodideInstance.runPythonAsync(`
import sys
sys.modules.clear()
`);
        setPyodide(null);
      }
    };
  }, []);

  // Function to handle formatting
  const handleFormatCode = async () => {
    if (!originalCode.trim()) {
      setError("Please enter some Python code to format.");
      return;
    }

    if (!pyodide) {
      setError("Pyodide is not loaded yet.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Format the code using black
      const formattedCode = await pyodide.runPythonAsync(`
import black
formatted_code = black.format_str("""${originalCode.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\${/g, "\\${")}""", mode=black.Mode())
formatted_code
`);

      setFormattedCode(formattedCode);
    } catch (err) {
      setError("Failed to format the code. Please check the input.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 font-fira-code text-orange-300 p-0 m-0 flex flex-col overflow-hidden">
      {/* Grid Container */}
      <div className="grid grid-cols-2 gap-[1px] flex-grow min-h-0">
        {/* Left Box - Original Code */}
        <div className="h-full bg-gray-800 overflow-hidden flex flex-col">
          <div className="flex-grow relative">
            {/* Line Numbers */}
            <div className="absolute top-0 left-0 h-full w-8 bg-gray-700 text-gray-400 text-right pr-2 pt-2 select-none">
              {originalCode.split("\n").map((_, index) => (
                <div key={index}>{index + 1}</div>
              ))}
            </div>
            {/* Code Editor */}
            <div className="pl-10"> {/* Add padding to avoid overlap with line numbers */}
              <Editor
                value={originalCode}
                onValueChange={(code) => setOriginalCode(code)}
                highlight={(code) => highlight(code, languages.python, "python")}
                padding={10}
                className="w-full h-full bg-gray-800 text-orange-300 resize-none outline-none border-none scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 whitespace-pre overflow-x-auto"
                placeholder="Paste your unformatted Python code here..."
                style={{
                  fontFamily: '"Fira Code", monospace',
                  fontSize: "14px",
                  lineHeight: "1.5",
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Box - Formatted Code */}
        <div className="h-full bg-gray-800 overflow-hidden flex flex-col">
          <div className="flex-grow relative">
            {/* Line Numbers */}
            <div className="absolute top-0 left-0 h-full w-8 bg-gray-700 text-gray-400 text-right pr-2 pt-2 select-none">
              {formattedCode.split("\n").map((_, index) => (
                <div key={index}>{index + 1}</div>
              ))}
            </div>
            {/* Code Editor */}
            <div className="pl-10"> {/* Add padding to avoid overlap with line numbers */}
              <Editor
                value={formattedCode}
                onValueChange={(code) => setFormattedCode(code)}
                highlight={(code) => highlight(code, languages.python, "python")}
                padding={10}
                className="w-full h-full bg-gray-800 text-orange-300 resize-none outline-none border-none scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 whitespace-pre overflow-x-auto"
                placeholder="Formatted Python code will appear here..."
                readOnly
                style={{
                  fontFamily: '"Fira Code", monospace',
                  fontSize: "14px",
                  lineHeight: "1.5",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Button and Messages Container */}
      <div className="flex-none p-4 bg-gray-800 border-t border-gray-700">
        {/* Format Button */}
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-400"
          onClick={handleFormatCode}
          disabled={isLoading || !pyodide}
        >
          {isLoading ? "Formatting..." : "Format Code"}
        </button>

        {/* Error Message */}
        {error && (
          <div className="ml-4 bg-red-500 text-white px-4 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Pyodide Loading Message */}
        {!pyodide && (
          <div className="ml-4 bg-yellow-500 text-white px-4 py-2 rounded-lg">
            Loading Pyodide...
          </div>
        )}
      </div>
    </div>
  );
};

export default PythonCodeFormatter;