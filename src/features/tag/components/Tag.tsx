import { useTagStore } from "@/features/tag/store/tagStore";
const Tag = () => {
    const { activeSection } = useTagStore();
    return (
        <div className="tag-container mx-auto h-full">
            <h1 className="text-4xl mb-4">Tag Page</h1>
            <p className="text-lg">WhereQ Tag: Your one-stop shop for tag organization.</p>
            <p className="text-lg"> The active section is: {activeSection}</p>
        </div>
    );
};

export default Tag;