import { useEffect, useState } from "react";
import dayjs from "dayjs";
import CalendarHeader from "@/features/calendar/components/CalendarHeader";
import CalendarDay from "@/features/calendar/components/CalendarDay";

import { useEventStore } from "@/features/calendar/store/calendarStore";


const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(dayjs());

  const { events, fetchEvents } = useEventStore();

  const startOfMonth = currentDate.startOf("month");
  const daysInMonth = currentDate.daysInMonth();
  const startDay = startOfMonth.day(); // Day of the week for the first day of the month (0 = Sunday)

  // Fetch events from local storage on initial load
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Generate the calendar grid with 42 cells (6 rows x 7 columns)
  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    if (i < startDay) {
      // Days from the previous month
      return startOfMonth.subtract(startDay - i, "day");
    } else if (i >= startDay + daysInMonth) {
      // Days from the next month
      return startOfMonth.add(daysInMonth + (i - startDay - daysInMonth), "day");
    }
    return startOfMonth.add(i - startDay, "day"); // Days of the current month
  });

  const handleNextMonth = () => {
    setCurrentDate(currentDate.add(1, "month"));
  };

  const handlePrevMonth = () => {
    setCurrentDate(currentDate.subtract(1, "month"));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-2 border-b border-sky-300">
        <CalendarHeader
          currentDate={currentDate}
          onNext={handleNextMonth}
          onPrev={handlePrevMonth}
        />
      </div>

      {/* Calendar Grid */}
      <div
        className="grid grid-cols-7 gap-1 flex-grow"
        style={{
          display: "grid",
          gridTemplateRows: "repeat(6, 1fr)", // 6 rows to fit the calendar grid
        }}
      >
        {calendarDays.map((date, i) => (
          <div
            key={i}
            className="bg-gray-700 text-orange-400 flex"
          >
            <CalendarDay
              date={date}
              showWeekday={i < 7} // Show weekday only for the first 7 days
              weekday={i < 7 ? dayjs().startOf("week").add(i, "day").format("ddd") : undefined} // Calculate weekday for the first row
              isNextMonth={i >= startDay + daysInMonth} // Mark dates from the next month
              events={events.filter((event) => dayjs(event.dtstart).isSame(date, "day"))}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;