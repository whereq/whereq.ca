import { loadElementsLocally } from "@/features/chemistry/utils/resourceLoader";
import { ElementModel } from "@/features/chemistry/models/elementModel";
import { useEffect, useState } from "react";
import { PERIODIC_TABLE_18, CATEGORY_COLOR_MAP } from "@/features/chemistry/utils/chemistryUtils";
import ElementGroupLegend from "@/features/chemistry/components/ElementGroupLegend";
import React from "react";

const PeriodicTable18 = () => {
  const [elements, setElements] = useState<ElementModel[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Loading state
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null); // Track hovered category

  useEffect(() => {
    const fetchElements = async () => {
      const elements = await loadElementsLocally();
      setElements(elements);
      setIsLoading(false); // Set loading to false after fetching
    };
    fetchElements();
  }, []);

  // Render loading state if elements are not fetched yet
  if (isLoading) {
    return (
      <div className="font-fira-code bg-gray-900 text-orange-400 flex items-center justify-center h-screen">
        <span className="text-lg">Loading periodic table...</span>
      </div>
    );
  }

  return (
    <div className="font-fira-code bg-gray-900 text-orange-400">
      {/* Element Group Legend */}
      <ElementGroupLegend
        hoveredCategory={hoveredCategory}
        onHoverCategory={setHoveredCategory}
      />

      {/* Group Header and Periodic Table Container */}
      <div className="grid grid-cols-19 gap-[1px] border border-orange-700">
        {/* Top-Left Cell with Diagonal Split */}
        <div
          className="relative flex items-center justify-center p-0 border min-h-[3rem] border-gray-700 bg-gray-800"
          style={{
            gridRow: 1, // Place in the first row
            gridColumn: 1, // Place in the first column
          }}
        >
          {/* Diagonal Line */}
          <div
            className="absolute inset-0 bg-gray-700"
            style={{
              clipPath: "polygon(0 0, 100% 100%, 0 100%)",
            }}
          ></div>
          {/* Group Text */}
          <span className="absolute top-1 right-1 text-xs font-bold">Group</span>
          {/* Period Text */}
          <span className="absolute bottom-1 left-1 text-xs font-bold text-left">Period</span>
        </div>

        {/* Group Header */}
        {Array.from({ length: 18 }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-center p-1 border border-gray-700 bg-gray-800"
            style={{
              gridRow: 1, // Place all header cells in the first row
              gridColumn: i + 2, // Place each cell in its respective column (starting from column 2)
            }}
          >
            <span className="text-lg font-bold">{i + 1}</span>
          </div>
        ))}

        {/* Periodic Table Grid */}
        {PERIODIC_TABLE_18.map((row, rowIndex) => (
          <React.Fragment key={`row-${rowIndex}`}> {/* Use React.Fragment with key */}
            {/* Period Label */}
            <div
              className="flex items-center justify-center p-0 border border-gray-700 bg-gray-800"
              style={{
                gridRow: rowIndex + 2, // Rows start from 2 (below the header)
                gridColumn: 1, // Place in the first column
              }}
            >
              <span className="text-lg font-bold">{rowIndex < 7 ? rowIndex + 1 : ""}</span>
            </div>

            {/* Periodic Table Cells */}
            {row.map((atomicNumber, colIndex) => {
              let element: ElementModel | undefined;

              // Handle Lanthanides and Actinides rows
              if (rowIndex === 7 || rowIndex === 8) {
                const category = rowIndex === 7 ? "Lanthanide" : "Actinide";
                element = elements.find(
                  (e) => e.category === category && e.group === colIndex + 1
                );
              } else {
                // Handle other rows
                element = elements.find((e) => e.atomicNumber === atomicNumber);
              }

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`relative p-1 border border-gray-700 ${
                    element ? CATEGORY_COLOR_MAP[element.category] : "bg-transparent"
                  } hover:bg-gray-700 transition-colors ${
                    hoveredCategory && element?.category === hoveredCategory
                      ? "outline outline-2 outline-orange-400 outline-offset-[-2px]" // Use outline for highlight
                      : ""
                  }`}
                  style={{
                    gridRow: rowIndex + 2, // Rows start from 2 (below the header)
                    gridColumn: colIndex + 2, // Columns start from 2 (after the "Period" column)
                  }}
                  title={element ? `${element.name} (${element.symbol})` : ""}
                >
                  {element && (
                    <>
                      <span className="absolute top-1 left-1 text-xs font-bold">
                        {element.atomicNumber}
                      </span>
                      <span className="flex items-center justify-center h-full text-lg font-bold">
                        {element.symbol}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default PeriodicTable18;