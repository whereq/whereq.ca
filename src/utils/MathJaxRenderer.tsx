import React, { useEffect, useRef } from "react";
import { renderFormula } from "./mathJaxSetup";

interface MathJaxRendererProps {
  formula: string; // LaTeX formula to render
  displayMode?: boolean; // Whether to render in display mode (block) or inline
}

const MathJaxRenderer: React.FC<MathJaxRendererProps> = ({ formula, displayMode = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Render the formula when it changes
  useEffect(() => {
    if (containerRef.current) {
      // Clear the container before rendering
      containerRef.current.innerHTML = "";

      // Render the LaTeX formula using MathJax
      const svgContent = renderFormula(formula, displayMode);

      // Append the SVG content to the container
      containerRef.current.innerHTML = svgContent;
    }
  }, [formula, displayMode]);

  return <div ref={containerRef} className="inline-block" />;
};

export default MathJaxRenderer;