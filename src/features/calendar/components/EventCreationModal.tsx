import React, { useState, useEffect, useRef } from "react";
import CustomRecurrenceModal from "@/features/calendar/components/CustomRecurrenceModal";
import Event from "@/features/calendar/model/event";

interface EventCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  top: number;
  left: number;
  onCreate: (event: Event) => void;
}

const EventCreationModal: React.FC<EventCreationModalProps> = ({
  isOpen,
  onClose,
  top,
  left,
  onCreate,
}) => {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [rrule, setRrule] = useState("Does not repeat");
  const [description, setDescription] = useState("");
  const [isCustomRecurrenceOpen, setCustomRecurrenceOpen] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const [customModalPosition, setCustomModalPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const formatDate = (date: Date) => date.toISOString().split("T")[0];
    const formatTime = (date: Date) => {
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      return `${hours}:${minutes}:${seconds}`;
    };

    setStartDate(formatDate(now));
    setStartTime(formatTime(now));
    setEndDate(formatDate(oneHourLater));
    setEndTime(formatTime(oneHourLater));
  }, []);

  const handleOpenCustomRecurrence = () => {
    if (modalRef.current) {
      const modalRect = modalRef.current.getBoundingClientRect();
      setCustomModalPosition({
        top: modalRect.bottom, // Position below the EventCreationModal
        left: modalRect.left, // Align with the left of the EventCreationModal
      });
    }
    setCustomRecurrenceOpen(true);
  };

  const handleTimeChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    const [hours, minutes, seconds] = value.split(":");
    const formattedTime = `${hours}:${minutes}:${seconds || "00"}`;
    setter(formattedTime);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const event: Event = {
      uid: crypto.randomUUID(),
      dtstamp: new Date(),
      dtstart: new Date(`${startDate}T${startTime}`),
      dtend: new Date(`${endDate}T${endTime}`),
      summary: title,
      description: description || undefined,
      rrule: rrule === "Does not repeat" ? undefined : rrule,
      organizer: { email: "example@domain.com" }, // Organizer logic is skipped for simplicity.
    };

    // Pass the event to the parent component
    onCreate(event);
    onClose();
  };

  return (
    <>
      {/* EventCreationModal */}
      <div
        ref={modalRef}
        className="absolute bg-gray-800 w-[36rem] p-4 shadow-lg z-20 font-fira-code"
        style={{ top: `${top}px`, left: `${left}px` }}
      >
        {isCustomRecurrenceOpen && (
          <div className="absolute inset-0 bg-black bg-opacity-50 z-10 pointer-events-none" />
        )}

        <h2 className="text-orange-300 font-semibold mb-4">Create Event</h2>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {/* Title */}
          <input
            type="text"
            placeholder="Add title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 bg-gray-700 text-orange-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            required
          />

          {/* Dates and Times */}
          <div className="grid grid-cols-[5fr_5fr_1fr_5fr_5fr] items-center gap-1">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[8rem] p-2 bg-gray-700 text-orange-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <input
              type="time"
              value={startTime}
              onChange={handleTimeChange(setStartTime)}
              className="w-[8rem] p-2 bg-gray-700 text-orange-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              step="1"
            />
            <div className="flex items-center justify-center text-orange-400">to</div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[8rem] p-2 bg-gray-700 text-orange-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <input
              type="time"
              value={endTime}
              onChange={handleTimeChange(setEndTime)}
              className="w-[8rem] p-2 bg-gray-700 text-orange-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              step="1"
            />
          </div>

          {/* All Day and Repeat */}
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="all-day"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="all-day" className="text-orange-300">
                All day
              </label>
            </div>
            <select
              value={rrule}
              onChange={(e) => {
                const value = e.target.value;
                setRrule(value);
                if (value === "Custom...") {
                  handleOpenCustomRecurrence();
                }
              }}
              className="p-2 bg-gray-700 text-orange-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option>Does not repeat</option>
              <option>Daily</option>
              <option>Every weekday</option>
              <option>Custom...</option>
            </select>
          </div>

          {/* Description */}
          <textarea
            placeholder="Add event details"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 bg-gray-700 text-orange-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />

          {/* Buttons */}
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

      {/* Custom Recurrence Modal */}
      {isCustomRecurrenceOpen && (
        <CustomRecurrenceModal
          isOpen={isCustomRecurrenceOpen}
          onClose={() => setCustomRecurrenceOpen(false)}
          onDone={(recurrenceRule) => {
            setRrule(recurrenceRule);
            setCustomRecurrenceOpen(false);
          }}
          customModalPosition={customModalPosition}
        />
      )}
    </>
  );
};

export default EventCreationModal;
