import axios from "axios";
import { CatFact, CatFactsResponse, CatBreedsResponse } from "@/features/api-explorer/public-api/cat-fact/models/catFact";

// Fetch a list of cat breeds
export const fetchCatBreeds = async (page: number): Promise<CatBreedsResponse> => {
  const endpoint = `https://catfact.ninja/breeds?page=${page}`;
  const { data } = await axios.get(endpoint);
  return data;
};

// Fetch a random cat fact
export const fetchCatFact = async (): Promise<CatFact> => {
  const endpoint = `https://catfact.ninja/fact`;
  const { data } = await axios.get(endpoint);
  return data;
};

// Fetch a list of cat facts
export const fetchCatFacts = async (page: number): Promise<CatFactsResponse> => {
  const endpoint = `https://catfact.ninja/facts?page=${page}`;
  const { data } = await axios.get(endpoint);
  return data;
};