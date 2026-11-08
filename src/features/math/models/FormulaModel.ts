export interface FormulaModel {
  name: string; // Name of the formula
  author: string; // Author of the formula
  formula: string; // Mathematical representation of the formula
  description: string; // Brief description of the formula
  variables: {
    [key: string]: {
      label: string; // Human-readable label for the variable
      value: number | null; // Current value of the variable (can be null if not set)
      description: string; // Description of the variable's role in the formula
    };
  };
  result: number | null; // Computed result of the formula
}