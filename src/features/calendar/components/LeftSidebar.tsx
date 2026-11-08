import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faChevronDown, faChevronUp, faCaretDown } from "@fortawesome/free-solid-svg-icons";
import MiniCalendar from "@/features/calendar/components/MiniCalendar";
import EventCreationModal from "@/features/calendar/components/EventCreationModal";
import Event from "@/features/calendar/model/event";

import { useEventStore } from "@/features/calendar/store/calendarStore";

const LeftSidebar: React.FC = () => {
  const [isMyCalendarsOpen, setIsMyCalendarsOpen] = useState(true);
  const [isOtherCalendarsOpen, setIsOtherCalendarsOpen] = useState(true);
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const { addEvent } = useEventStore();

  const handleCreateEvent = (event: Event) => {
    addEvent(event);
  };


  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const createButtonRef = useRef<HTMLButtonElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCreateDropdownOpen(false);
      }
    };

    // Attach the event listener
    document.addEventListener("mousedown", handleClickOutside);

    // Clean up the event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleEventClick = () => {
    setIsCreateDropdownOpen(false);
    setIsEventModalOpen(true);
  };

  // Calculate the position of the dropdown button
  const getCreateButtonPosition = () => {
    if (createButtonRef.current) {
      const rect = createButtonRef.current.getBoundingClientRect();
      return {
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      };
    }
    return { top: 0, left: 0 };
  };

  const { top, left } = getCreateButtonPosition();

  return (
    <div className="w-[15rem] text-left bg-gray-900 flex flex-col font-fira-code text-sm">
      {/* Part 1: Top Bar with Create Button */}
      <div className="p-2 border-b border-gray-700 relative" ref={dropdownRef}>
        <button
          ref={createButtonRef}
          className="flex items-center text-orange-300 hover:text-orange-400"
          onClick={() => setIsCreateDropdownOpen(!isCreateDropdownOpen)}
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          <span>Create</span>
          <FontAwesomeIcon icon={faCaretDown} className="ml-2" />
        </button>
        {/* Dropdown List */}
        {isCreateDropdownOpen && (
          <div className="absolute left-0 mt-2 w-full bg-gray-800 border border-gray-700 
                          rounded-lg shadow-lg z-10">
            <ul>
              <li className="p-2 text-orange-400 hover:bg-gray-700 cursor-pointer" onClick={handleEventClick}>
                Event
              </li>
              <li className="p-2 text-orange-400 hover:bg-gray-700 cursor-pointer">
                Task
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Part 2: Mini Full Month Calendar */}
      <MiniCalendar />

      {/* Part 3: My Calendars */}
      <div className="p-2 border-b border-gray-700">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-orange-300 font-semibold">My Calendars</h3>
          <button
            onClick={() => setIsMyCalendarsOpen(!isMyCalendarsOpen)}
            className="text-orange-300 hover:text-orange-400"
          >
            <FontAwesomeIcon icon={isMyCalendarsOpen ? faChevronUp : faChevronDown} />
          </button>
        </div>
        {isMyCalendarsOpen && (
          <ul>
            <li className="text-orange-400 mb-2">Calendar 1</li>
            <li className="text-orange-400 mb-2">Calendar 2</li>
          </ul>
        )}
      </div>

      {/* Part 4: Other Calendars */}
      <div className="p-2">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-orange-300 font-semibold">Other Calendars</h3>
          <button
            onClick={() => setIsOtherCalendarsOpen(!isOtherCalendarsOpen)}
            className="text-orange-300 hover:text-orange-400"
          >
            <FontAwesomeIcon icon={isOtherCalendarsOpen ? faChevronUp : faChevronDown} />
          </button>
        </div>
        {isOtherCalendarsOpen && (
          <ul>
            <li className="text-orange-400 mb-2">Calendar A</li>
            <li className="text-orange-400 mb-2">Calendar B</li>
          </ul>
        )}
      </div>

      {/* Event Creation Modal */}
      <EventCreationModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        top={top}
        left={left}
        onCreate={handleCreateEvent}
      />
    </div>
  );
};

export default LeftSidebar;