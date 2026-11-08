import { useCategoryStore } from "@/features/category/store/categoryStore";
const Category = () => {
    const { activeSection } = useCategoryStore();
    return (
        <div className="category-container mx-auto h-full">
            <h1 className="text-4xl mb-4">Category Page</h1>
            <p className="text-lg">WhereQ Category: Your one-stop shop for bookmark organization.</p>
            <p className="text-lg"> The active section is: {activeSection}</p>
        </div>
    );
};

export default Category;