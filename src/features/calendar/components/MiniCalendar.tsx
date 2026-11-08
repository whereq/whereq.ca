import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretLeft, faCaretRight } from "@fortawesome/free-solid-svg-icons";
import dayjs from "dayjs";

const MiniCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(dayjs());

  // Generate the calendar grid for the current month
  const startOfMonth = currentDate.startOf("month");
  const daysInMonth = currentDate.daysInMonth();
  const startDay = startOfMonth.day(); // Day of the week for the first day of the month (0 = Sunday)

  // Generate the calendar grid with 42 cells (6 rows x 7 columns)
  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    if (i < startDay) {
      // Leave the beginning cells empty
      return null;
    } else if (i >= startDay + daysInMonth) {
      // Days from the next month
      return startOfMonth.add(daysInMonth + (i - startDay - daysInMonth), "day");
    }
    return startOfMonth.add(i - startDay, "day"); // Days of the current month
  });

  // Navigate to the previous month
  const handlePrevMonth = () => {
    setCurrentDate(currentDate.subtract(1, "month"));
  };

  // Navigate to the next month
  const handleNextMonth = () => {
    setCurrentDate(currentDate.add(1, "month"));
  };

  return (
    <div className="p-2 border-b border-gray-700">
      {/* Month Navigation */}
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={handlePrevMonth}
          className="text-orange-300 hover:text-orange-400"
        >
          <FontAwesomeIcon icon={faCaretLeft} />
        </button>
        <div className="text-center text-orange-300 font-semibold">
          {currentDate.format("MMMM YYYY")}
        </div>
        <button
          onClick={handleNextMonth}
          className="text-orange-300 hover:text-orange-400"
        >
          <FontAwesomeIcon icon={faCaretRight} />
        </button>
      </div>
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Weekday Headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center text-orange-300 text-xs">
            {day}
          </div>
        ))}
        {/* Calendar Days */}
        {calendarDays.map((date, i) => (
          <div
            key={i}
            className={`text-center text-sm p-1 rounded-full 
                        ${date?.isSame(dayjs(), "day") ? "bg-orange-500 text-gray-900" : "text-orange-400"}
                        ${date ? "hover:bg-gray-700 hover:text-orange-400" : ""}`}
          >
            {date ? date.format("D") : ""}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MiniCalendar;