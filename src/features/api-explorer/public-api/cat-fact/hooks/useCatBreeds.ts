import { useQuery } from "@tanstack/react-query";
import { fetchCatBreeds } from "@/features/api-explorer/public-api/cat-fact/services/catFact";
import { CatBreedsResponse } from "@/features/api-explorer/public-api/cat-fact/models/catFact";

export const useCatBreeds = (page : number) => {
  return useQuery<CatBreedsResponse>({
    queryKey: ["catBreeds", page],
    queryFn: () => fetchCatBreeds(page),
  });
};
