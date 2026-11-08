import axios from "axios";
import yaml from "js-yaml";
import { ElementModel } from "@/features/chemistry/models/elementModel";

import  CHEMISTRY_ELEMENT_YAML from "../resources/element.yaml?raw";

export const loadElements = async (url: string): Promise<ElementModel[]> => {
    try {
        const response = await axios.get(url);
        const data = yaml.load(response.data);
        return data as ElementModel[];
    } catch (error) {
        console.error("Error loading chemistry elements:", error);
        return [];
    }
};

export const loadElementsLocally = async (): Promise<ElementModel[]> => {
    try {
        const data = yaml.load(CHEMISTRY_ELEMENT_YAML);
        return data as ElementModel[];
    } catch (error) {
        console.error("Error loading chemistry elements:", error);
        return [];
    }
};