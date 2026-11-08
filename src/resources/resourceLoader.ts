import axios from "axios";
import yaml from "js-yaml";
import { TopCategory } from "@/models/EndpointCategory";

import  PUBLIC_API_YAML from "./public-api/public-api.yaml?raw";

export const loadApiCategories = async (url: string): Promise<TopCategory[]> => {
    try {
        const response = await axios.get(url);
        const data = yaml.load(response.data);
        return data as TopCategory[];
    } catch (error) {
        console.error("Error loading API categories:", error);
        return [];
    }
};

export const loadApiCategoriesLocally = async (): Promise<TopCategory[]> => {
    try {
        const data = yaml.load(PUBLIC_API_YAML);
        return data as TopCategory[];
    } catch (error) {
        console.error("Error loading API categories:", error);
        return [];
    }
};