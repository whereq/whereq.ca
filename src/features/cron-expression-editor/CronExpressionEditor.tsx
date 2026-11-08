// src/components/CronExpressionEditor.tsx
import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const CronExpressionEditor: React.FC = () => {
    const [startDate, setStartDate] = useState<Date | null>(new Date());
    const [repeatMethod, setRepeatMethod] = useState<string>("daily");
    const [repeatInterval, setRepeatInterval] = useState<number>(1);

    const repeatOptions = [
        { value: "daily", label: "Daily" },
        { value: "weekly", label: "Weekly" },
        { value: "monthly", label: "Monthly" },
        { value: "yearly", label: "Yearly" },
    ];

    const cronExpression = () => {
        switch (repeatMethod) {
            case "daily":
                return `0 0 */${repeatInterval} * *`;
            case "weekly":
                return `0 0 * * ${repeatInterval}`;
            case "monthly":
                return `0 0 1 */${repeatInterval} *`;
            case "yearly":
                return `0 0 1 1/${repeatInterval} *`;
            default:
                return "";
        }
    };

    return (
        <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-4">Cron Expression Editor</h1>

            {/* Start Date Picker */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                </label>
                <DatePicker
                    selected={startDate}
                    onChange={(date: Date | null) => setStartDate(date)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    dateFormat="yyyy-MM-dd"
                />
            </div>

            {/* Repeat Method */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Repeat Method
                </label>
                <select
                    value={repeatMethod}
                    onChange={(e) => setRepeatMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                    {repeatOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Repeat Interval */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Repeat Interval
                </label>
                <input
                    type="number"
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
            </div>

            {/* Cron Expression Display */}
            <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cron Expression
                </label>
                <div className="p-3 bg-gray-100 border border-gray-300 rounded-md text-sm">
                    {cronExpression()}
                </div>
            </div>
        </div>
    );
};

export default CronExpressionEditor;
