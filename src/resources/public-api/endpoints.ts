import { TopCategory } from "@/models/EndpointCategory";
import { RestfulEndpoint } from "@/models/RestfulEndpoint";

export const catFact: RestfulEndpoint[] = [
    {
        title: "Cat Breeds",
        url: "https://catfact.ninja/breeds",
        method: "GET",
        params: { limit: "10" },
        headers: { "Content-Type": "application/json" },
    },
    {
        title: "Cat Facts",
        url: "https://catfact.ninja/facts",
        method: "GET",
        params: { max_length: "", limit: "10" },
        headers: { "Content-Type": "application/json" },
    },
    {
        title: "Cat Fact",
        url: "https://catfact.ninja/fact",
        method: "GET",
        params: { max_length: "" },
        headers: { "Content-Type": "application/json" },
    },
];

export const dogBreeds: RestfulEndpoint[] = [
    {
        title: "Dog Breeds",
        url: "https://dog.ceo/api/breeds/list/all",
        method: "GET",
        params: { },
        headers: { "Content-Type": "application/json" },
    },
    {
        title: "Dog Random Image",
        url: "https://dog.ceo/api/breeds/image/random",
        method: "GET",
        params: { },
        headers: { "Content-Type": "application/json" },
    },
];

export const petFoodFacts: RestfulEndpoint[] = [
    {
        title: "Open Pet Food Facts",
        url: "https://world.openpetfoodfacts.org/api/v0/product/20106836.json",
        method: "GET",
        params: { },
        headers: { "Content-Type": "application/json" },
    },
];

export const ipify: RestfulEndpoint[] = [
    {
        title: "My IP Address",
        url: "https://api.ipify.org/?format=json",
        method: "GET",
        params: { },
        headers: { "Content-Type": "application/json" },
    },
];

// The unofficial API for everything related to Ghibli Studios.
// https://ghibli.rest/ 
export const ghibli: RestfulEndpoint[] = [
    {
        title: "Films",
        url: "https://ghibli.rest/films",
        method: "GET",
        params: { },
        headers: { "Content-Type": "application/json" },
    },
    {
        title: "Film",
        url: "https://ghibli.rest/films",
        method: "GET",
        params: { id: "d6bd6efc-37b2-4c40-b092-367cea8c88fe"},
        headers: { "Content-Type": "application/json" },
    },
    {
        title: "Locations",
        url: "https://ghibli.rest/locations",
        method: "GET",
        params: { },
        headers: { "Content-Type": "application/json" },
    },
    {
        title: "Location",
        url: "https://ghibli.rest/locations",
        method: "GET",
        params: { id: "11014596-71b0-4b3e-b8c0-1c4b15f28b9a"},
        headers: { "Content-Type": "application/json" },
    },
    {
        title: "People",
        url: "https://ghibli.rest/people",
        method: "GET",
        params: { },
        headers: { "Content-Type": "application/json" },
    },
    {
        title: "People by ID",
        url: "https://ghibli.rest/locations",
        method: "GET",
        params: { id: "267649ac-fb1b-11eb-9a03-0242ac130003"},
        headers: { "Content-Type": "application/json" },
    },
    {
        title: "Species",
        url: "https://ghibli.rest/species",
        method: "GET",
        params: { },
        headers: { "Content-Type": "application/json" },
    },
    {
        title: "Species by ID",
        url: "https://ghibli.rest/species",
        method: "GET",
        params: { id: "af3910a6-429f-4c74-9ad5-dfe1c4aa04f2"},
        headers: { "Content-Type": "application/json" },
    },
    {
        title: "Vehicles",
        url: "https://ghibli.rest/vehicles",
        method: "GET",
        params: { },
        headers: { "Content-Type": "application/json" },
    },
    {
        title: "Vehicle",
        url: "https://ghibli.rest/vehicles",
        method: "GET",
        params: { id: "4e09b023-f650-4747-9ab9-eacf14540cfb"},
        headers: { "Content-Type": "application/json" },
    },
];


// Export a merged array combining all endpoints
export const publicApiEndpoints: RestfulEndpoint[] = [
    ...catFact,
    ...dogBreeds,
    ...petFoodFacts,
    ...ipify,
    ...ghibli,
];

export const publicApiCategories: TopCategory[] = [
    {
        name: "Animal",
        categories: [
            {
                name: "Cat Information",
                restfulEndpointGroups: [
                    {
                        name: "Cat Fact Ninja",
                        restfulEndpoints: catFact,
                    },
                ],
            },
            {
                name: "Dog Information",
                restfulEndpointGroups: [
                    {
                        name: "Dog Breeds",
                        restfulEndpoints: dogBreeds,
                    },
                ],
            },
            {
                name: "Open Pet Food Facts",
                restfulEndpointGroups: [
                    {
                        name: "Pet Food Facts",
                        restfulEndpoints: petFoodFacts,
                    },
                ],
            },
        ],
    },
    {
        name: "Animation",
        categories: [
            {
                name: "Ghibli Studios",
                restfulEndpointGroups: [
                    {
                        name: "Ghibli",
                        restfulEndpoints: ghibli,
                    },
                ],
            },
        ]
    },
    {
        name: "Others",
        categories: [
            {
                name: "Uncategorized",
                restfulEndpointGroups: [
                    {
                        name: "My IP Address",
                        restfulEndpoints: ipify,
                    },
                ],
            },
        ],
    },
];
