import axios from "axios";
// js-yaml v5 is ESM-first: the parser is a named export, there is
// no default export any more.
import { load as loadYaml } from "js-yaml";
import { ElementModel } from "@/features/chemistry/models/elementModel";

import  CHEMISTRY_ELEMENT_YAML from "../resources/element.yaml?raw";

export const loadElements = async (url: string): Promise<ElementModel[]> => {
    try {
        const response = await axios.get(url);
        const data = loadYaml(response.data);
        return data as ElementModel[];
    } catch (error) {
        console.error("Error loading chemistry elements:", error);
        return [];
    }
};

export const loadElementsLocally = async (): Promise<ElementModel[]> => {
    try {
        const data = loadYaml(CHEMISTRY_ELEMENT_YAML);
        return data as ElementModel[];
    } catch (error) {
        console.error("Error loading chemistry elements:", error);
        return [];
    }
};