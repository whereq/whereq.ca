import { mathjax } from "mathjax-full/js/mathjax";
import { TeX } from "mathjax-full/js/input/tex";
import { SVG } from "mathjax-full/js/output/svg";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html";

// Initialize MathJax
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const tex = new TeX({ packages: ["base"] }); // Pass packages as an array
const svg = new SVG({ fontCache: "local" }); // Use local font cache

const html = mathjax.document("", { InputJax: tex, OutputJax: svg });

/**
 * Renders a LaTeX formula to an SVG string.
 * @param formula - The LaTeX formula to render.
 * @param displayMode - Whether to render in display mode (block) or inline.
 * @returns The rendered SVG as a string.
 */
export const renderFormula = (formula: string, displayMode: boolean = false): string => {
  const output = html.convert(formula, { display: displayMode });
  return adaptor.innerHTML(output);
};