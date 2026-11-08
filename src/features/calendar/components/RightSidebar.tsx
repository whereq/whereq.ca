import React from "react";

import {
  faListCheck,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const RightSidebar: React.FC = () => {
    return (
        <div className="w-12 bg-gray-900 p-4">
            <FontAwesomeIcon
                icon={faListCheck}
                className="text-orange-300 text-2xl mb-1"
            />
        </div>
    );
};

export default RightSidebar;
