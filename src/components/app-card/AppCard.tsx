import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Link } from "react-router-dom";
import { IconType } from "react-icons/lib";
import React from "react";
import { Tag } from "@whereq/react";
import "./app-card.css";

export interface AppCardProps {
  name: string;
  icon: IconDefinition | IconType;
  description: string;
  path: string;
  /** Optional category shown as a small tag in the card footer. */
  category?: string;
  onClick?: () => void; // Add onClick prop
}

export const AppCard = ({ name, icon, description, path, category, onClick }: AppCardProps) => (
  <Link
    to={path}
    className="app-card"
    onClick={onClick} // Call the onClick handler
  >
    {/* Icon */}
    <span className="app-card__tile">
      {typeof icon === "object" ? (
        <FontAwesomeIcon icon={icon as IconDefinition} className="app-card__icon" />
      ) : (
        React.createElement(icon, { className: "app-card__icon" })
      )}
    </span>

    {/* App Name */}
    <h3 className="app-card__name">{name}</h3>

    {/* Description */}
    <p className="app-card__desc">{description}</p>

    {/* Category */}
    {category && (
      <div className="app-card__foot">
        <Tag className="app-card__tag">{category}</Tag>
      </div>
    )}
  </Link>
);

export default AppCard;
