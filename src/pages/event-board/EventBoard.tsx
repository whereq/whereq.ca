import { useState } from "react";
import PageLayout from "@/layouts/PageLayout";
import { AppEvent } from "@/models/AppEvent";
import LocalStorageHelper from "@/utils/localStorageHelper";
import { LOCAL_STORAGE_KEYS } from "@/utils/constants";
import CodeModal from "@/components/modals/CodeModal";

const EventBoard = () => {
  // Load app events from local storage
  const savedEvents: AppEvent[] = LocalStorageHelper.load(LOCAL_STORAGE_KEYS.LOCAL_APP_EVENTS) || [];

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 20;

  // Modal state
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Calculate the events to display on the current page
  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = savedEvents.slice(indexOfFirstEvent, indexOfLastEvent);

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Handle row click
  const handleRowClick = (event: AppEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  return (
    <PageLayout>
      {/* Event Grid */}
      <div className="bg-gray-800 text-orange-300 rounded-lg shadow-sm overflow-hidden">
        {/* Grid Header */}
        <div className="grid grid-cols-[10%_75%_15%] gap-4 p-3 bg-gray-700 text-sm font-semibold uppercase border-b border-gray-600">
          <div className="border-r border-gray-600">Category</div>
          <div className="border-r border-gray-600">Message</div>
          <div className="text-center">Timestamp</div>
        </div>

        {/* Grid Rows */}
        <div className="divide-y divide-gray-700">
          {currentEvents.map((event) => (
            <div
              key={event.id}
              className="grid grid-cols-[10%_75%_15%] gap-4 p-2 hover:bg-gray-750 transition-colors border-b border-gray-600 cursor-pointer"
              onClick={() => handleRowClick(event)}
            >
              <div className="text-sm border-r border-gray-600">{event.category}</div>
              <div className="text-sm text-left border-r border-gray-600 truncate" title={event.message}>
                {event.message}
              </div>
              <div className="text-sm text-center pr-2">{new Date(event.timestamp).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-center mt-4 space-x-2">
        {Array.from({ length: Math.ceil(savedEvents.length / eventsPerPage) }, (_, i) => (
          <button
            key={i + 1}
            onClick={() => paginate(i + 1)}
            className={`px-3 py-1 rounded transition-colors ${
              currentPage === i + 1
                ? "bg-blue-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Custom Modal for Event Details */}
      {selectedEvent && (
        <CodeModal
          isOpen={isModalOpen}
          title="Event Details"
          language="json"
          content={JSON.stringify(selectedEvent, null, 2)} // Convert event to JSON string
          onRequestClose={closeModal}
        />
      )}
    </PageLayout>
  );
};

export default EventBoard;