import { CategoryEnum } from "@/features/chemistry/models/ChemistryEnum";

export class CategoryModel {
  category: CategoryEnum;

  constructor(category: CategoryEnum) {
    this.category = category;
  }
}