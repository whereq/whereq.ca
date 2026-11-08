import { useQuery } from "@tanstack/react-query";
import { fetchCatFacts } from "@/features/api-explorer/public-api/cat-fact/services/catFact";
import { CatFactsResponse } from "@/features/api-explorer/public-api/cat-fact/models/catFact";

export const useCatFacts = (page : number) => {
  return useQuery<CatFactsResponse>({
    queryKey: ["catFacts", page],
    queryFn: () => fetchCatFacts(page),
  });
};
