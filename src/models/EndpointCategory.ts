import { RestfulEndpoint } from "./RestfulEndpoint";

// TopCategory Model
export interface TopCategory {
    name: string;
    categories: Category[];
}

// Category Model
export interface Category {
    name: string;
    restfulEndpointGroups: RestfulEndpointGroup[];
}

// Index Model
export interface RestfulEndpointGroup{
    name: string;
    restfulEndpoints: RestfulEndpoint[];
}