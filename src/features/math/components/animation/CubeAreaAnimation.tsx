// src/features/math/components/formular-visualizer/CubeAreaVisualizer.tsx
import React, { useState, useEffect, useRef } from "react";
import { evaluate } from "mathjs";
import { useMathAnimationStore } from "@/features/math/store/mathStore";
import { FormularModel } from "@/features/math/models/MathModel";
import { CanvasUtil } from "@/features/math/utils/canvasUtil";

const CubeAreaAnimation: React.FC = () => {
    const [sideLength, setSideLength] = useState<number | null>(null);
    const [area, setArea] = useState<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [drawing, setDrawing] = useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const { isMathAnimationSettingVisible: isFormularAnimationSettingVisible } = useMathAnimationStore();

    const formularModel: FormularModel = {
        name: "Cube Area",
        formula: "A = 6a²",
        factors: [
            {
                label: "Side Length",
                value: sideLength,
            },
        ],
        result: area,
    };

    const calculateArea = (a: number) => {
        const area = evaluate("6 * a^2", { a });
        setArea(area);
    };

    const handleSideLengthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newSideLength = parseFloat(event.target.value);
        if (!isNaN(newSideLength)) {
            setSideLength(newSideLength);
            setDrawing(true);
            calculateArea(newSideLength);
        } else {
            setSideLength(null);
            setArea(null);
        }
    };

    const drawCube = (size: number) => {
        const canvas = canvasRef.current;
        if (canvas) {
            const canvasUtil = new CanvasUtil(canvas);
            const perspective = size * 0.5;

            const startX = (canvas.width - size - perspective) / 2;
            const startY = (canvas.height + size) / 2;

            const frontBottomLeft = { x: startX, y: startY };
            const frontBottomRight = { x: startX + size, y: startY };
            const frontTopLeft = { x: startX, y: startY - size };
            const frontTopRight = { x: startX + size, y: startY - size };

            const backBottomLeft = {
                x: frontBottomLeft.x + perspective,
                y: frontBottomLeft.y - perspective,
            };
            const backBottomRight = {
                x: frontBottomRight.x + perspective,
                y: frontBottomRight.y - perspective,
            };
            const backTopLeft = {
                x: frontTopLeft.x + perspective,
                y: frontTopLeft.y - perspective,
            };
            const backTopRight = {
                x: frontTopRight.x + perspective,
                y: frontTopRight.y - perspective,
            };

            canvasUtil.clearCanvas(canvas.width, canvas.height);

            // Draw front face
            canvasUtil.setLineStyle("#FDBA74", 2);
            canvasUtil.drawPolygon([frontBottomLeft, frontBottomRight, frontTopRight, frontTopLeft]);

            // Draw back face (dashed-dotted lines)
            canvasUtil.setLineStyle("#FDBA74", 2, [5, 3, 1, 3]);
            canvasUtil.drawPolygon([backBottomLeft, backBottomRight, backTopRight, backTopLeft]);

            // Draw connecting lines
            canvasUtil.setLineStyle("#FDBA74", 2);
            canvasUtil.drawLine(frontBottomLeft.x, frontBottomLeft.y, backBottomLeft.x, backBottomLeft.y);
            canvasUtil.drawLine(frontBottomRight.x, frontBottomRight.y, backBottomRight.x, backBottomRight.y);
            canvasUtil.drawLine(frontTopLeft.x, frontTopLeft.y, backTopLeft.x, backTopLeft.y);
            canvasUtil.drawLine(frontTopRight.x, frontTopRight.y, backTopRight.x, backTopRight.y);
        }
    };

    const updateCanvasSize = () => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (canvas && container) {
            const { width, height } = container.getBoundingClientRect();
            const size = Math.min(width, height);
            canvas.width = size;
            canvas.height = size;
        }
    };

    useEffect(() => {
        updateCanvasSize();
        window.addEventListener("resize", updateCanvasSize);
        return () => window.removeEventListener("resize", updateCanvasSize);
    }, []);

    useEffect(() => {
        if (drawing && sideLength !== null) {
            drawCube(sideLength);
            setDrawing(false);
        }
    }, [sideLength, drawing]);

    return (
        <div className="math-formula-Animation flex h-full">
            {/* Left Sidebar (Togglable) */}
            {isFormularAnimationSettingVisible && (
                <div className="w-1/6 bg-gray-800 p-2 border-r border-gray-700 text-left">
                    <h1 className="text-base font-bold text-orange-300">
                        {formularModel.name}
                    </h1>
                    <h2 className="text-base text-orange-300 mt-2">Formula</h2>
                    <p className="text-gray-300 pl-2">{formularModel.formula}</p>

                    <h2 className="text-base text-orange-300 mt-2">Parameters</h2>
                    {formularModel.factors.map((factor, index) => (
                        <div key={index} className="pl-2">
                            <input
                                id={factor.label.toLowerCase()}
                                type="number"
                                placeholder={factor.label}
                                value={factor.value || ""}
                                onChange={handleSideLengthChange}
                                className="w-full p-1 border border-orange-300 rounded bg-gray-700 text-gray-300"
                            />
                        </div>
                    ))}

                    <h2 className="text-lg text-orange-300 mt-2">Area</h2>
                    <p className="text-gray-300 pl-2">
                        {formularModel.result !== null ? formularModel.result.toFixed(2) : "N/A"}
                    </p>
                </div>
            )}

            {/* Right Animation Area */}
            <div
                ref={containerRef}
                className="flex-1 flex items-center justify-center p-2 relative"
            >
                <canvas
                    ref={canvasRef}
                    style={{
                        display: "block",
                    }}
                ></canvas>
            </div>
        </div>
    );
};

export default CubeAreaAnimation;