import React from "react";
import Calendar from "@/features/calendar/components/Calendar";
import LeftSidebar from "@/features/calendar/components/LeftSidebar";
// import LeftSidebarDP from "@/features/calendar/components/LeftSidebarDP";
import RightSidebar from "@/features/calendar/components/RightSidebar";


const CalendarPage: React.FC = () => {

  return (
    <div className="flex flex-col h-full bg-gray-900 font-fira-code text-orange-500">
      {/* Main Area */}
      <div className="flex h-full bg-gray-800">
        {/* Left Sidebar */}
        <LeftSidebar />
        {/* <LeftSidebarDP /> */}

        {/* Middle Calendar Area */}
        <div className="flex-grow bg-gray-800 p-2">
          <Calendar />
        </div>

        {/* Right Sidebar */}
        <RightSidebar />
      </div>
    </div>
  );
};

export default CalendarPage;
