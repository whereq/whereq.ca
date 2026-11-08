// src/features/math/components/formular-visualizer/CircleAreaVisualizer.tsx
import React, { useState, useEffect, useRef } from "react";
import { evaluate } from "mathjs";
import { useMathAnimationStore } from "@/features/math/store/mathStore";
import { FormularModel } from "@/features/math/models/MathModel";
import { CanvasUtil } from "@/features/math/utils/canvasUtil";

const CircleAreaAnimation: React.FC = () => {
    const [radius, setRadius] = useState<number | null>(null);
    const [area, setArea] = useState<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [drawing, setDrawing] = useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const { isMathAnimationSettingVisible: isFormularAnimationSettingVisible } = useMathAnimationStore();

    const formularModel: FormularModel = {
        name: "Circle Area",
        formula: "A = πr²",
        factors: [
            {
                label: "Radius",
                value: radius,
            },
        ],
        result: area,
    };

    const calculateArea = (r: number) => {
        const area = evaluate("pi * r^2", { r });
        setArea(area);
    };

    const handleRadiusChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newRadius = parseFloat(event.target.value);
        if (!isNaN(newRadius)) {
            setRadius(newRadius);
            setDrawing(true);
            calculateArea(newRadius);
        } else {
            setRadius(null);
            setArea(null);
        }
    };

    const drawCircleAndRadius = (r: number, progress: number) => {
        const canvas = canvasRef.current;
        if (canvas) {
            const canvasUtil = new CanvasUtil(canvas);
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            canvasUtil.clearCanvas(canvas.width, canvas.height);

            const angle = (progress * 2 * Math.PI) % (2 * Math.PI);
            const x = centerX + r * Math.cos(angle);
            const y = centerY + r * Math.sin(angle);

            canvasUtil.setLineStyle("#FDBA74", 2, [5, 5]);
            canvasUtil.drawLine(centerX, centerY, x, y);

            canvasUtil.setLineStyle("#FDBA74", 2);
            canvasUtil.drawCircle(centerX, centerY, r, 0, angle);

            if (progress === 1) {
                canvasUtil.drawCircle(centerX, centerY, r, 0, 2 * Math.PI);
            }
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
        let progress = 0;
        const duration = 2000;
        const startTime = Date.now();

        const animate = () => {
            const currentTime = Date.now();
            const elapsedTime = currentTime - startTime;
            progress = Math.min(elapsedTime / duration, 1);
            if (radius !== null) {
                drawCircleAndRadius(radius, progress);
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setDrawing(false);
            }
        };

        if (drawing && radius !== null) {
            animate();
        }
    }, [radius, drawing]);

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
                                onChange={handleRadiusChange}
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

export default CircleAreaAnimation;