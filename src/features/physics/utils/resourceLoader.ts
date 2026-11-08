import axios from "axios";
import yaml from "js-yaml";
import { ConstantModel } from "@/features/physics/models/physicsModel";

import  PHYSICAL_CONSTANTS_YAML from "../resources/constants.yaml?raw";

export const loadPhysicalConstants = async (url: string): Promise<ConstantModel[]> => {
    try {
        const response = await axios.get(url);
        const data = yaml.load(response.data);
        return data as ConstantModel[];
    } catch (error) {
        console.error("Error loading physics constants:", error);
        return [];
    }
};

export const loadPhysicalConstantsLocally = async (): Promise<ConstantModel[]> => {
    try {
        const data = yaml.load(PHYSICAL_CONSTANTS_YAML);
        return data as ConstantModel[];
    } catch (error) {
        console.error("Error loading physics constants:", error);
        return [];
    }
};