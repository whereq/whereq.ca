export interface CatFact {
  fact: string; // The actual fact about cats
  length: number; // The length of the fact
}

export interface CatFactsResponse {
  current_page: number;
  last_page: number;
  data: CatFact[];
}

export interface CatBreed {
    breed: string;
    country: string;
    origin: string;
    coat: string;
    pattern: string;
}

export interface CatBreedsResponse {
    current_page: number;
    last_page: number;
    data: CatBreed[];
}
