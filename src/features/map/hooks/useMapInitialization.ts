import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import LocalStorageHelper from "@/utils/localStorageHelper";
import { LOCAL_STORAGE_KEYS } from "@/utils/constants";
import { Map } from "@/features/map/types/types";
import { MapType } from "@/features/map/models/MapEnum";

export const useMapInitialization = () => {

    useEffect(() => {
        const loadMapObjectFromLocalStorage = (): Map => {
            const existingMap: Map = LocalStorageHelper.load(LOCAL_STORAGE_KEYS.MAP) || {
                id: uuidv4(),
                type: MapType.Default,
                title: "Default Map",
                description: "Default map description",
                overlayArray: [],
                placeArray: [],
            };
            return existingMap;
        };

        loadMapObjectFromLocalStorage();
    }, []);
};

