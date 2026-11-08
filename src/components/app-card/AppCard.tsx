import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Link } from "react-router-dom";
import { IconType } from "react-icons/lib";
import React from "react";

export interface AppCardProps {
  name: string;
  icon: IconDefinition | IconType;
  description: string;
  path: string;
  onClick?: () => void; // Add onClick prop
}

export const AppCard = ({ name, icon, description, path, onClick }: AppCardProps) => (
  <Link
    to={path}
    className="block p-4 border border-[rgba(168,190,216,0.12)] rounded-lg bg-[#0E141C] text-[#E9EFF6] shadow-lg hover:shadow-xl transform transition-transform hover:-translate-y-1 hover:border-[rgba(77,168,240,0.4)] focus:ring-2 focus:ring-[#4DA8F0]"
    onClick={onClick} // Call the onClick handler
  >
    <div className="flex flex-col items-center justify-between h-full">
      {/* Icon */}
      <div className="text-[#4DA8F0] text-4xl mb-3">
        {typeof icon === "object" ? (
          <FontAwesomeIcon icon={icon as IconDefinition} /> // FontAwesome Icons
        ) : (
          React.createElement(icon, {className: "w-8 h-8"}) // React Icons
        )}
      </div>

      {/* App Name */}
      <h3 className="text-xl font-bold text-center font-mono">{name}</h3>

      {/* Description */}
      <p className="text-sm text-center text-[#8b949e] mt-2 hidden">{description}</p>
    </div>
  </Link>
);

export default AppCard;
