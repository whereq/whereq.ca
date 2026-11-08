import { MapOverlayType, MapShapeType } from "@/features/map/models/MapEnum";
import { mapOverlayToShape } from "@/features/map/utils/mapUtils";


export const handleLayerSwitch = (
    mapRef: React.RefObject<google.maps.Map | null>,
    mapType: "roadmap" | "satellite",
    setMapType: (type: "roadmap" | "satellite") => void
) => {
    if (mapRef.current) {
        const newType = mapType === "roadmap" ? "satellite" : "roadmap";
        mapRef.current.setMapTypeId(newType);
        setMapType(newType);
    }
};

export const handleDrawingOptionSelect = (
    option: MapOverlayType | null,
    setMapShapeType: (shape: MapShapeType | null) => void
) => {
    setMapShapeType(mapOverlayToShape(option));
};
