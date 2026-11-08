import { CategoryEnum } from "@/features/chemistry/models/ChemistryEnum";

export interface ElementModel {
  atomicNumber: number; // Atomic number of the element
  symbol: string; // Chemical symbol of the element
  name: string; // Name of the element
  category: CategoryEnum; // Category of the element (e.g., Halogen, Alkali Metal, etc.)
  atomicMass: number; // Atomic mass of the element
  row: number; // Row (period) in the periodic table
  group: number; // Group (column) in the periodic table
  electronConfiguration: string; // Electron configuration of the element
}