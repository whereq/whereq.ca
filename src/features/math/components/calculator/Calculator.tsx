import { useState } from "react";

const Calculator = () => {
  const [mode, setMode] = useState("Basic");
  const [display, setDisplay] = useState("");

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMode(e.target.value);
    setDisplay(""); // Clear display when mode changes
  };

  const handleButtonClick = (value: string | number) => {
    setDisplay((prev) => prev + value);
  };

  const handleCalculate = () => {
    try {
      // Use indirect eval to avoid direct eval warning while still evaluating math expressions
      const result = (0, eval)(display);
      setDisplay(result.toString());
    } catch (error) {
      setDisplay((error as Error).toString());
    }
  };

  const handleClear = () => {
    setDisplay("");
  };

  const handleAdvancedOperation = (operation: string) => {
    let result;
    switch (operation) {
      case "sqrt":
        result = Math.sqrt(parseFloat(display));
        break;
      case "square":
        result = Math.pow(parseFloat(display), 2);
        break;
      case "percent":
        result = parseFloat(display) / 100;
        break;
      default:
        result = "Error";
    }
    setDisplay(result.toString());
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 font-fire-code text-orange-500">
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
        {/* Mode Selector */}
        <select
          value={mode}
          onChange={handleModeChange}
          className="mb-4 p-2 bg-gray-700 text-orange-500 rounded"
        >
          <option value="Basic">Basic</option>
          <option value="Advanced">Advanced</option>
        </select>

        {/* Display */}
        <div className="bg-gray-700 p-3 rounded mb-4 overflow-y-auto max-h-20">
          <div className="text-right text-orange-500 text-2xl">{display}</div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-4 gap-1">
          {mode === "Basic" ? (
            <>
              {[7, 8, 9, "/"].map((value) => (
                <button
                  key={value}
                  onClick={() => handleButtonClick(value)}
                  className="p-4 bg-gray-700 text-orange-500 rounded hover:bg-gray-600"
                >
                  {value}
                </button>
              ))}
              {[4, 5, 6, "*"].map((value) => (
                <button
                  key={value}
                  onClick={() => handleButtonClick(value)}
                  className="p-4 bg-gray-700 text-orange-500 rounded hover:bg-gray-600"
                >
                  {value}
                </button>
              ))}
              {[1, 2, 3, "-"].map((value) => (
                <button
                  key={value}
                  onClick={() => handleButtonClick(value)}
                  className="p-4 bg-gray-700 text-orange-500 rounded hover:bg-gray-600"
                >
                  {value}
                </button>
              ))}
              {[0, ".", "=", "+"].map((value) => (
                <button
                  key={value}
                  onClick={
                    value === "=" ? handleCalculate : () => handleButtonClick(value)
                  }
                  className={`p-4 ${
                    value === "=" ? "bg-orange-500 text-gray-900" : "bg-gray-700 text-orange-500"
                  } rounded hover:bg-gray-600`}
                >
                  {value}
                </button>
              ))}
              <button
                onClick={handleClear}
                className="col-span-4 p-4 bg-gray-700 text-orange-500 rounded hover:bg-gray-600"
              >
                Clear
              </button>
            </>
          ) : (
            <>
              {[7, 8, 9, "√"].map((value) => (
                <button
                  key={value}
                  onClick={
                    value === "√"
                      ? () => handleAdvancedOperation("sqrt")
                      : () => handleButtonClick(value)
                  }
                  className="p-4 bg-gray-700 text-orange-500 rounded hover:bg-gray-600"
                >
                  {value}
                </button>
              ))}
              {[4, 5, 6, "^"].map((value) => (
                <button
                  key={value}
                  onClick={() => handleButtonClick(value === "^" ? "**" : value)}
                  className="p-4 bg-gray-700 text-orange-500 rounded hover:bg-gray-600"
                >
                  {value}
                </button>
              ))}
              {[1, 2, 3, "%"].map((value) => (
                <button
                  key={value}
                  onClick={
                    value === "%"
                      ? () => handleAdvancedOperation("percent")
                      : () => handleButtonClick(value)
                  }
                  className="p-4 bg-gray-700 text-orange-500 rounded hover:bg-gray-600"
                >
                  {value}
                </button>
              ))}
              {[0, ".", "=", "+"].map((value) => (
                <button
                  key={value}
                  onClick={
                    value === "=" ? handleCalculate : () => handleButtonClick(value)
                  }
                  className={`p-4 ${
                    value === "=" ? "bg-orange-500 text-gray-900" : "bg-gray-700 text-orange-500"
                  } rounded hover:bg-gray-600`}
                >
                  {value}
                </button>
              ))}
              <button
                onClick={handleClear}
                className="col-span-4 p-4 bg-gray-700 text-orange-500 rounded hover:bg-gray-600"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Calculator;