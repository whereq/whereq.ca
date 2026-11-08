import React, { useEffect, useRef } from "react";
import logUtil from "@/utils/logUtil";

interface DeleteMenuProps {
  map: google.maps.Map;
  path: google.maps.MVCArray<google.maps.LatLng>;
  vertex: number;
  position: google.maps.LatLng;
  onClose: () => void; // Callback when the menu closes
}

const DeleteMenu: React.FC<DeleteMenuProps> = ({ map, path, vertex, position, onClose }) => {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const closeMenu = () => {
      if (menuRef.current && menuRef.current.parentNode) {
        menuRef.current.parentNode.removeChild(menuRef.current);
      }
      onClose(); // Notify parent component that the menu is closed
    };

    // Create the menu div
    const menuDiv = document.createElement("div");
    menuDiv.className = "delete-menu";
    menuDiv.innerHTML = "Delete";
    menuDiv.style.position = "absolute";
    menuDiv.style.background = "white";
    menuDiv.style.border = "1px solid #ccc";
    menuDiv.style.padding = "8px";
    menuDiv.style.cursor = "pointer";
    menuDiv.style.boxShadow = "2px 2px 5px rgba(0, 0, 0, 0.2)";
    menuDiv.style.zIndex = "10000"; // Ensure it's above other elements

    // Handle delete logic
    const handleDelete = () => {
      if (path && vertex !== undefined) {
        path.removeAt(vertex); // Remove the vertex
      }
      closeMenu(); // Close the menu after deletion
    };

    menuDiv.addEventListener("click", handleDelete);

    // Attach the div to the map
    const panes = new google.maps.OverlayView().getPanes();
    if (panes) {
      panes.floatPane.appendChild(menuDiv); // Add to the floatPane
    }

    // Save the menu div reference
    menuRef.current = menuDiv;

    // Adjust menu position
    const projection = new google.maps.OverlayView().getProjection();
    if (projection) {
      const point = projection.fromLatLngToDivPixel(position)!;
      logUtil.log(point); // Debugging: Log the position
      menuDiv.style.top = `${point.y}px`;
      menuDiv.style.left = `${point.x}px`;
    }

    // Close the menu when clicking outside
    const handleOutsideClick = (event: Event) => {
      if (event.target !== menuDiv) {
        closeMenu();
      }
    };

    // Use standard addEventListener instead of google.maps.event.addDomListener
    map.getDiv().addEventListener("mousedown", handleOutsideClick, true);

    return () => {
      // Cleanup
      menuDiv.removeEventListener("click", handleDelete);
      map.getDiv().removeEventListener("mousedown", handleOutsideClick, true); // Remove the event listener
      if (menuRef.current && menuRef.current.parentNode) {
        menuRef.current.parentNode.removeChild(menuRef.current);
      }
      menuRef.current = null;
    };
  }, [map, path, vertex, position, onClose]);

  return null; // The menu is rendered directly on the DOM, not as part of React's render tree
};

export default DeleteMenu;