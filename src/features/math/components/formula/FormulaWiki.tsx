import React from "react";
import MathJaxRenderer from "@/utils/MathJaxRenderer"; 

interface FormulaModel {
  name: string; // Name of the formula
  author: string; // Author of the formula
  formula: string; // Mathematical representation of the formula (in LaTeX)
  description: string; // Brief description of the formula
  variables: {
    [key: string]: {
      label: string; // Human-readable label for the variable
      value: number | null; // Current value of the variable (can be null if not set)
      description: string; // Description of the variable's role in the formula
    };
  };
  result: number | null; // Computed result of the formula
}

// Example: Euler's Formula (e^(iπ) + 1 = 0)
const eulersFormula: FormulaModel = {
  name: "Euler's Formula",
  author: "Leonhard Euler",
  formula: "e^{i\\pi} + 1 = 0", // LaTeX representation of the formula
  description:
    "Euler's formula is a mathematical equation that establishes a deep relationship between exponential functions, trigonometric functions, and complex numbers.",
  variables: {
    e: {
      label: "Euler's Number (e)",
      value: Math.E, // Euler's number (approximately 2.71828)
      description: "The base of the natural logarithm, a fundamental constant in mathematics.",
    },
    i: {
      label: "Imaginary Unit (i)",
      value: null, // Imaginary unit (√-1), not a numeric value
      description: "The imaginary unit, representing the square root of -1.",
    },
    π: {
      label: "Pi (π)",
      value: Math.PI, // Pi (approximately 3.14159)
      description: "The ratio of a circle's circumference to its diameter, a fundamental constant in mathematics.",
    },
  },
  result: 0, // The result of Euler's formula is always 0
};

const FormulaWiki: React.FC = () => {
  return (
    <div className="bg-gray-900 text-orange-400 font-fira-code p-4 rounded-lg border border-gray-700 text-left">
      {/* Formula Name */}
      <h1 className="text-2xl font-bold mb-4">{eulersFormula.name}</h1>

      {/* Author */}
      <p className="text-sm text-orange-300 mb-2">By: {eulersFormula.author}</p>

      {/* Formula */}
      <div className="bg-gray-800 p-3 rounded-md mb-4">
        <MathJaxRenderer formula={eulersFormula.formula} displayMode={true} /> 
      </div>

      {/* Description */}
      <p className="text-sm text-orange-300 mb-4">{eulersFormula.description}</p>

      {/* Variables */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Variables</h2>
        <div className="space-y-2">
          {Object.entries(eulersFormula.variables).map(([key, variable]) => (
            <div key={key} className="bg-gray-800 p-2 rounded-md text-left">
              <p className="text-sm text-orange-400">
                <strong>{variable.label}:</strong> {variable.value !== null ? variable.value : "N/A"}
              </p>
              <p className="text-xs text-orange-300">{variable.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Result */}
      <div className="bg-gray-800 p-3 rounded-md text-left">
        <p className="text-sm text-orange-400">
          <strong>Result:</strong> {eulersFormula.result !== null ? eulersFormula.result : "N/A"}
        </p>
      </div>
    </div>
  );
};

export default FormulaWiki;