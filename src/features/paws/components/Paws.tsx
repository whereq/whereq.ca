import { usePawsStore } from "@/features/paws/store/pawsStore";
const Paws = () => {
    const { activeSection } = usePawsStore();
    return (
        <div className="paw-container mx-auto h-full">
            <h1 className="text-4xl mb-4">Paws Page</h1>
            <p className="text-lg">WhereQ Paws</p>
            <p className="text-lg"> The active section is: {activeSection}</p>
        </div>
    );
};

export default Paws;