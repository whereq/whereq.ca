import { CategoryEnum } from "@/features/chemistry/models/ChemistryEnum";

// Define the grid template for the 18-column layout
export const PERIODIC_TABLE_18 = [
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // Period 1
    [3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 6, 7, 8, 9, 10], // Period 2
    [11, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 14, 15, 16, 17, 18], // Period 3
    [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36], // Period 4
    [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54], // Period 5
    [55, 56, 57, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86], // Period 6
    [87, 88, 89, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118], // Period 7
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Lanthanides
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Actinides
];

export const CATEGORY_COLOR_MAP: Record<CategoryEnum, string> = {
    [CategoryEnum.NobleGas]: "bg-indigo-900",
    [CategoryEnum.AlkaliMetal]: "bg-red-900",
    [CategoryEnum.AlkalineEarthMetal]: "bg-orange-900",
    [CategoryEnum.TransitionMetal]: "bg-green-900",
    [CategoryEnum.PostTransitionMetal]: "bg-blue-900",
    [CategoryEnum.Metalloid]: "bg-purple-900",
    [CategoryEnum.Nonmetal]: "bg-yellow-900",
    [CategoryEnum.Lanthanide]: "bg-pink-900",
    [CategoryEnum.Actinide]: "bg-gray-600",
    [CategoryEnum.Unknown]: "bg-gray-800",
};
