import React, { useState } from "react";
import DateTimePickerDP from "@/components/datetime-picker/DateTimePickerDP";

interface EventCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  top: number;
  left: number;
}

const EventCreationModalDP: React.FC<EventCreationModalProps> = ({ isOpen, onClose, top, left }) => {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  if (!isOpen) return null;

  return (
    <div
      className="absolute bg-gray-800 w-[27rem] p-4 shadow-lg z-20 font-fira-code"
      style={{ top: `${top}px`, left: `${left}px` }}
    >
      <h2 className="text-orange-300 font-semibold mb-4">Create Event</h2>
      <form>
        <div className="mb-4">
          <label className="block text-orange-400 mb-2">Summary</label>
          <input
            type="text"
            className="w-full p-2 bg-gray-700 text-orange-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          </div>
          <DateTimePickerDP
            label="Start Date"
            selectedDate={startDate}
            onDateChange={setStartDate}
          />
          <DateTimePickerDP
            label="End Date"
            selectedDate={endDate}
            onDateChange={setEndDate}
          />
          <div className="mb-4">
            <label className="block text-orange-400 mb-2">End Date</label>
            <input type="datetime-local" className="w-full p-2 bg-gray-700 text-orange-300 rounded" />
          </div>
          <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-700 text-orange-300 px-4 py-2 rounded mr-2 hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-orange-400 text-white px-4 py-2 rounded hover:bg-orange-500"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
};

export default EventCreationModalDP;