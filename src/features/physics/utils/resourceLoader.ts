import axios from "axios";
// js-yaml v5 is ESM-first: the parser is a named export, there is
// no default export any more.
import { load as loadYaml } from "js-yaml";
import { ConstantModel } from "@/features/physics/models/physicsModel";

import  PHYSICAL_CONSTANTS_YAML from "../resources/constants.yaml?raw";

export const loadPhysicalConstants = async (url: string): Promise<ConstantModel[]> => {
    try {
        const response = await axios.get(url);
        const data = loadYaml(response.data);
        return data as ConstantModel[];
    } catch (error) {
        console.error("Error loading physics constants:", error);
        return [];
    }
};

export const loadPhysicalConstantsLocally = async (): Promise<ConstantModel[]> => {
    try {
        const data = loadYaml(PHYSICAL_CONSTANTS_YAML);
        return data as ConstantModel[];
    } catch (error) {
        console.error("Error loading physics constants:", error);
        return [];
    }
};