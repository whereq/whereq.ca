import { useEffect, useState } from "react";
import { loadPhysicalConstantsLocally } from "@/features/physics/utils/resourceLoader";
import { ConstantModel } from "@/features/physics/models/physicsModel";
import MathJaxRenderer from "@/utils/MathJaxRenderer";

// Updated sanitizeSymbol function to handle ħc correctly
const sanitizeSymbol = (symbol: string) => {
  return symbol
    .replace(/ħc/g, "\\hbar c")  // Ensure ħc becomes \hbar c
    .replace(/ħ/g, "\\hbar");     // Replace Unicode ħ with LaTeX \hbar
};

const ConstantTable = () => {
  const [constants, setConstants] = useState<ConstantModel[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Loading state

  useEffect(() => {
    const fetchConstants = async () => {
      const constants = await loadPhysicalConstantsLocally();
      setConstants(constants);
      setIsLoading(false); // Set loading to false after fetching
    };
    fetchConstants();
  }, []);

  // Render loading state if elements are not fetched yet
  if (isLoading) {
    return (
      <div className="font-fira-code bg-gray-900 text-orange-400 flex items-center justify-center h-full">
        <span className="text-lg">Loading physical constants...</span>
      </div>
    );
  }

  return (
    <div className="font-fira-code bg-gray-900 text-orange-400 flex flex-col h-full overflow-hidden">
      {/* Grid Header */}
      <div className="grid grid-cols-[2fr_7fr_10fr_10fr_7fr] gap-[1px] bg-gray-800 sticky top-0 z-10 p-2 flex-none border-b border-orange-700">
        <div className="font-bold">Symbol</div>
        <div className="font-bold">Formula</div>
        <div className="font-bold">Quantity</div>
        <div className="font-bold">Value</div>
        <div className="font-bold">Relative Standard Uncertainty</div>
      </div>

      {/* Grid Body */}
      <div className="overflow-y-auto flex-grow min-h-0 text-left">
        {constants.map((constant, index) => (
          <div key={index} className="grid grid-cols-[2fr_7fr_10fr_10fr_7fr] gap-[1px]">
            {/* Symbol */}
            <div className="bg-gray-800 pl-4 p-2 border-l border-gray-700 border-t">
              <MathJaxRenderer formula={sanitizeSymbol(constant.symbol)} displayMode={true} />
            </div>

            {/* Formula */}
            <div className="bg-gray-800 pl-2 pt-2 border-l border-gray-700 border-t">
              {constant.formula ? <MathJaxRenderer formula={sanitizeSymbol(constant.formula)} displayMode={true} /> : ""}
            </div>

            {/* Quantity */}
            <div className="bg-gray-800 border-l border-gray-700 border-t pl-2 pt-2">{constant.quantity}</div>

            {/* Value */}
            <div className="bg-gray-800 border-l border-gray-700 border-t pl-2 pt-2">{constant.value}</div>

            {/* Relative Standard Uncertainty */}
            <div className="bg-gray-800 border-l border-gray-700 border-t pl-2 pt-2">
              {constant.relativeStandardUncertainty}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConstantTable;
