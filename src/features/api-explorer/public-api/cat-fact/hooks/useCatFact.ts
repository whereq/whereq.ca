import { useQuery } from "@tanstack/react-query";
import { fetchCatFact } from "@/features/api-explorer/public-api/cat-fact/services/catFact";
import { CatFact } from "@/features/api-explorer/public-api/cat-fact/models/catFact";

export const useCatFact = () => {
  return useQuery<CatFact>({
    queryKey: ["catFact"],
    queryFn: fetchCatFact,
  });
};
