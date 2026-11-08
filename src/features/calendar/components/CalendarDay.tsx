import dayjs from "dayjs";
import Event from "@/features/calendar/model/event";

interface CalendarDayProps {
  date: dayjs.Dayjs;
  showWeekday?: boolean;
  weekday?: string;
  isNextMonth?: boolean;
  events: Event[];
}

const CalendarDay: React.FC<CalendarDayProps> = ({ date, showWeekday, weekday, isNextMonth, events }) => {
  const isCurrentDay = date.isSame(dayjs(), "day");

  // Sort events by start time
  const sortedEvents = events.sort((a, b) => dayjs(a.dtstart).diff(dayjs(b.dtstart)));

  return (
    <div className="w-full h-[4.5rem] flex flex-col p-1 items-start">
      {/* Weekday */}
      {showWeekday && (
        <div className="text-xs text-orange-300 font-bold">
          {weekday}
        </div>
      )}
      {/* Day of Month */}
      <div
        className={`flex items-center justify-center w-6 h-6 rounded-full 
                    ${isCurrentDay ? "bg-orange-500 text-gray-900" : "text-orange-400"}`}
      >
        <span className={`text-sm whitespace-nowrap ${isNextMonth && date.date() === 1 ? "pl-2" : ""}`}>
          {isNextMonth && date.date() === 1 ? date.format("MMM D") : date.format("D")}
        </span>
      </div>
      {/* Events */}
      <div className="w-full mt-1 space-y-1 text-left">
        {sortedEvents.map((event) => (
          <div
            key={event.uid}
            className="text-xs text-orange-300 truncate flex items-center" // Added flexbox
          >
            <span className="mr-1 before:content-['•'] before:text-[2rem] before:mr-0"></span>
            <span>{dayjs(event.dtstart).format("HH:mm")} {event.summary}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarDay;