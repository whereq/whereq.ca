import React, { useState } from "react";

interface CustomRecurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDone: (recurrenceRule: string) => void;
  customModalPosition: { top: number; left: number };
}

const CustomRecurrenceModal: React.FC<CustomRecurrenceModalProps> = ({
  isOpen,
  onClose,
  onDone,
  customModalPosition,
}) => {
  const [repeatEvery, setRepeatEvery] = useState(1);
  const [repeatUnit, setRepeatUnit] = useState("day");
  const [endsOption, setEndsOption] = useState("never");
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [occurrences, setOccurrences] = useState(1);

  if (!isOpen) return null;

  const handleDone = () => {
    const recurrenceRule = `Repeat every ${repeatEvery} ${repeatUnit}(s), Ends: ${endsOption}`;
    onDone(recurrenceRule);
    onClose();
  };

  return (
    <div className="absolute bg-gray-800 w-[32rem] p-4 shadow-lg z-30" 
    style = {{
      top: customModalPosition.top,
      left: customModalPosition.left,
    }}>
      <h2 className="text-orange-300 font-semibold mb-4">Custom Recurrence</h2>
      <form className="grid gap-4">
        {/* Row 1: Repeat every */}
        <div className="grid grid-cols-[2fr_1fr_2fr] gap-2 items-center">
          <label className="text-orange-300">Repeat every</label>
          <div className="flex items-center">
            <input
              type="number"
              min="1"
              value={repeatEvery}
              onChange={(e) => setRepeatEvery(Number(e.target.value))}
              className="w-12 p-2 bg-gray-700 text-orange-300 rounded"
            />
            <div className="flex flex-col ml-2 text-orange-300">
              <button
                type="button"
                onClick={() => setRepeatEvery((prev) => Math.min(prev + 1, 99))}
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => setRepeatEvery((prev) => Math.max(prev - 1, 1))}
              >
                ▼
              </button>
            </div>
          </div>
          <select
            value={repeatUnit}
            onChange={(e) => setRepeatUnit(e.target.value)}
            className="p-2 bg-gray-700 text-orange-300 rounded"
          >
            <option value="day">day</option>
            <option value="week">week</option>
            <option value="month">month</option>
            <option value="year">year</option>
          </select>
        </div>

        {/* Row 2: Repeat on */}
        {repeatUnit === "week" && (
          <div className="grid grid-cols-[1fr_6fr] gap-2 items-center">
            <label className="text-orange-300">Repeat on</label>
            <div className="flex gap-2">
              {["S", "M", "T", "W", "T", "F", "S"].map((day) => (
                <label key={day} className="text-orange-300">
                  <input type="checkbox" className="mr-1" />
                  {day}
                </label>
              ))}
            </div>
          </div>
        )}
        {repeatUnit === "month" && (
          <div className="text-orange-300">
            Monthly on the day {new Date().getDate()}
          </div>
        )}

        {/* Row 3: Ends */}
        <div className="grid gap-2">
          <label className="text-orange-300">Ends</label>
          <div className="grid gap-1">
            <label className="text-orange-300">
              <input
                type="radio"
                name="ends"
                value="never"
                checked={endsOption === "never"}
                onChange={() => setEndsOption("never")}
              />
              Never
            </label>
            <label className="flex items-center text-orange-300">
              <input
                type="radio"
                name="ends"
                value="on"
                checked={endsOption === "on"}
                onChange={() => setEndsOption("on")}
              />
              <span className="ml-2">On</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="ml-2 p-2 bg-gray-700 text-orange-300 rounded"
              />
            </label>
            <label className="flex items-center text-orange-300">
              <input
                type="radio"
                name="ends"
                value="after"
                checked={endsOption === "after"}
                onChange={() => setEndsOption("after")}
              />
              <span className="ml-2">After</span>
              <input
                type="number"
                min="1"
                value={occurrences}
                onChange={(e) => setOccurrences(Number(e.target.value))}
                className="w-12 p-2 bg-gray-700 text-orange-300 rounded ml-2"
              />
              <span className="ml-2">occurrences</span>
              <div className="flex flex-col ml-2 text-orange-300">
                <button
                  type="button"
                  onClick={() => setOccurrences((prev) => Math.min(prev + 1, 999))}
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => setOccurrences((prev) => Math.max(prev - 1, 1))}
                >
                  ▼
                </button>
              </div>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-700 text-orange-300 px-4 py-2 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDone}
            className="bg-orange-400 text-white px-4 py-2 rounded hover:bg-orange-500"
          >
            Done
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomRecurrenceModal;
