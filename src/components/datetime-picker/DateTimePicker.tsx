import React, { useState } from "react";
import { DayPicker } from "react-day-picker";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarAlt, faClock } from "@fortawesome/free-solid-svg-icons";
import "react-day-picker/dist/style.css";

interface DateTimePickerProps {
  label: string;
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({ label, selectedDate, onDateChange }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [time, setTime] = useState("00:00:00");

  const handleDayClick = (day: Date) => {
    const [hours, minutes, seconds] = time.split(":");
    const newDate = new Date(day);
    newDate.setHours(parseInt(hours, 10));
    newDate.setMinutes(parseInt(minutes, 10));
    newDate.setSeconds(parseInt(seconds, 10));
    onDateChange(newDate);
    setShowPicker(false);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTime(newTime);
    if (selectedDate) {
      const [hours, minutes, seconds] = newTime.split(":");
      const newDate = new Date(selectedDate);
      newDate.setHours(parseInt(hours, 10));
      newDate.setMinutes(parseInt(minutes, 10));
      newDate.setSeconds(parseInt(seconds, 10));
      onDateChange(newDate);
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "mm/dd/yyyy HH:mm:ss";
    const pad = (num: number) => num.toString().padStart(2, "0");
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  return (
    <div className="mb-4">
      <label className="block text-orange-400 mb-2">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={selectedDate ? formatDate(selectedDate) : "mm/dd/yyyy HH:mm:ss"}
          readOnly
          className="w-full p-2 bg-gray-700 text-orange-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 cursor-pointer"
          onClick={() => setShowPicker(!showPicker)}
        />
        <FontAwesomeIcon
          icon={faCalendarAlt}
          className="absolute right-3 top-3 text-orange-300 cursor-pointer"
          onClick={() => setShowPicker(!showPicker)}
        />
        {showPicker && (
          <div className="absolute z-10 mt-2 bg-gray-700 rounded shadow-lg w-[32rem] flex">
            {/* Date Picker Section */}
            <div className="w-1/2 p-4">
<DayPicker
  mode="single"
  required={true}
  selected={selectedDate}
  onSelect={handleDayClick}
  captionLayout="dropdown"
  classNames={{
    root: "bg-gray-700 text-orange-300 rounded",
    nav: "flex items-center justify-between mb-2",
    nav_button: "text-orange-300 hover:text-orange-500",
    caption: "text-orange-300 font-light flex items-center space-x-2",
    dropdown: "bg-gray-800 text-orange-300 border border-orange-500 rounded focus:ring-2 focus:ring-orange-500",
    weekdays: "grid grid-cols-7 text-orange-400 font-light text-sm mb-2", // Corrected weekdays layout
    weekday: "text-center",
    day: "grid grid-cols-7 gap-1",
    day_today: "font-bold text-orange-500 border border-orange-500",
    day_selected: "bg-orange-500 text-white rounded-full",
  }}
/>

            </div>

            {/* Time Picker Section */}
            <div className="w-1/2 p-4 border-l border-gray-600 flex flex-col items-center">
              <div className="text-orange-300 mb-2 font-light">Select Time</div>
              <FontAwesomeIcon icon={faClock} className="text-orange-300 text-2xl mb-4" />
              <input
                type="time"
                value={time}
                onChange={handleTimeChange}
                step="1"
                className="w-full p-2 bg-gray-700 text-orange-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DateTimePicker;
