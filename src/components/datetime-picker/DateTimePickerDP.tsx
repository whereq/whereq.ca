import React, { ChangeEventHandler, useState } from "react";
import { setHours, setMinutes } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

interface DateTimePickerProps {
  label: string;
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
}


const DateTimePickerDP: React.FC<DateTimePickerProps> = () => {
  const [selected, setSelected] = useState<Date>();
  const [timeValue, setTimeValue] = useState<string>("00:00");

  const handleTimeChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const time = e.target.value;
    if (!selected) {
      setTimeValue(time);
      return;
    }
    const [hours, minutes] = time.split(":").map((str) => parseInt(str, 10));
    const newSelectedDate = setHours(setMinutes(selected, minutes), hours);
    setSelected(newSelectedDate);
    setTimeValue(time);
  };

  const handleDaySelect = (date: Date | undefined) => {
    if (!timeValue || !date) {
      setSelected(date);
      return;
    }
    const [hours, minutes] = timeValue
      .split(":")
      .map((str) => parseInt(str, 10));
    const newDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hours,
      minutes
    );
    setSelected(newDate);
  };

  return (
    <div className="p-6 bg-gray-800 rounded shadow-lg w-full max-w-md">
      {/* Time Picker */}
      <form className="mb-4">
        <label className="block text-orange-400 font-light mb-2">
          Set the time:
          <input
            type="time"
            value={timeValue}
            onChange={handleTimeChange}
            className="w-full mt-1 p-2 bg-gray-700 text-orange-300 rounded focus:ring-2 focus:ring-orange-500 focus:outline-none font-light"
          />
        </label>
      </form>

      {/* Date Picker */}
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={handleDaySelect}
        captionLayout="dropdown"
        classNames={{
          root: "bg-gray-800 text-orange-300 rounded font-light",
          nav: "flex items-center justify-between mb-2",
          nav_button: "text-orange-300 hover:text-orange-500",
          caption: "text-orange-300 font-light flex items-center space-x-2",
          dropdown: "bg-gray-700 text-orange-300 border border-orange-500 rounded focus:ring-2 focus:ring-orange-500",
          weekdays: "grid grid-cols-7 text-orange-400 font-light text-sm mb-2",
          weekday: "text-center",
          day: "grid grid-cols-7 gap-1, text-orange-300 hover:bg-orange-500 rounded-full w-8 h-8 flex items-center justify-center",
          day_today: "font-bold text-orange-500 border border-orange-500",
          day_selected: "bg-orange-500 text-white rounded-full",
        }}
        footer={
          <div className="mt-2 text-orange-400 font-light">
            Selected date: {selected ? selected.toLocaleString() : "none"}
          </div>
        }
      />
    </div>
  );
}

export default DateTimePickerDP;