export interface FormularModel {
  name: string;
  formula: string;
  factors: { label: string; value: number | null }[];
  result: number | null;
}