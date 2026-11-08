import { useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFlask,
  faHexagonNodes,
  faMap,
  faCalendar,
  faGraduationCap,
  faPaw,
  faTags,
  faTableCells,
  faInfinity,
  faScrewdriverWrench,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";

import { GiMaterialsScience, GiAcid  } from "react-icons/gi";
import React from "react";

import { useAppStore } from "@/store/store";

export const AppLauncher = () => {
  const launcherRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const { isAppDrawerOpen, setAppDrawerOpen, toggleAppDrawer } = useAppStore();

  useEffect(() => {
    if (!isAppDrawerOpen) return;

    const adjustPosition = () => {
      if (launcherRef.current && menuRef.current) {
        const buttonRect = launcherRef.current.getBoundingClientRect();
        const menuRect = menuRef.current.getBoundingClientRect();

        // Ensure the dropdown opens left-aligned
        if (buttonRect.left + menuRect.width > window.innerWidth) {
          menuRef.current.style.right = "0";
          menuRef.current.style.left = "auto";
        } else {
          menuRef.current.style.left = "0";
          menuRef.current.style.right = "auto";
        }
      }
    };

    adjustPosition();
    window.addEventListener("resize", adjustPosition);
    return () => window.removeEventListener("resize", adjustPosition);
  }, [isAppDrawerOpen]);

  // App List with routes
  const apps = [
    { name: "Lab", icon: faFlask, path: "/lab" },
    { name: "API Exp", icon: faHexagonNodes, path: "/api-explorer" },
    { name: "Map", icon: faMap, path: "/map" },
    { name: "Calendar", icon: faCalendar, path: "/calendar" },
    { name: "Tools", icon: faScrewdriverWrench, path: "/tools" },
    { name: "Tags", icon: faTags, path: "/tag" },
    { name: "Categories", icon: faTableCells, path: "/category" },
    { name: "Math", icon: faInfinity, path: "/math" },
    { name: "Physics", icon: GiMaterialsScience, path: "/physics" },
    { name: "Chemistry", icon: GiAcid, path: "/chemistry" },
    { name: "Academy", icon: faGraduationCap, path: "/academy" },
    { name: "Paws", icon: faPaw, path: "/paws" },
  ];

  return (
    <div className="relative" ref={launcherRef}>
      {/* Nine-Dot Button */}
      <button
        className="flex items-center justify-center w-[1.5rem] h-[1.5rem] rounded-full bg-orange-300 hover:bg-orange-400"
        onClick={toggleAppDrawer}
        aria-label="App Launcher"
      >
        <div className="grid grid-cols-3 gap-[1px]">
          {[...Array(9)].map((_, index) => (
            <div
              key={index}
              className="w-1 h-1 rounded-full bg-gray-700"
            ></div>
          ))}
        </div>
      </button>

      {/* Dropdown Menu */}
      {isAppDrawerOpen && (
        <div
          ref={menuRef}
          className="absolute mt-2 w-64 bg-gray-700 shadow-lg rounded-lg z-50 overflow-hidden"
        >
          <div className="grid grid-cols-3 gap-4 p-4">
            {apps.map((app, index) => (
              <Link
                key={index}
                to={app.path}
                onClick={() => setAppDrawerOpen(false)}
                className="flex flex-col items-center text-center hover:bg-orange-400 p-2 rounded"
              >
                {typeof app.icon === "object" ? (
                  <FontAwesomeIcon icon={app.icon as IconDefinition}
                    className="text-orange-300 text-2xl mb-1" /> // FontAwesome Icons

                ) : (
                  React.createElement(app.icon, { className: "w-6 h-6" }) // React Icons
                )}

                <span className="text-orange-300 text-sm truncate">
                  {app.name}
                </span>
                <span className="absolute bg-orange-900 text-orange-300 text-xs p-1 
                                 rounded shadow-md opacity-0 pointer-events-none transition-opacity">
                  {app.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
