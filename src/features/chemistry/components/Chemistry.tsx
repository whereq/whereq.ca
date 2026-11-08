import { useChemistryStore } from "@/features/chemistry/store/chemistryStore";
import { SectionType } from "@/features/chemistry/models/ChemistryEnum";
// import PeriodicTable32 from "@/features/chemistry/components/PeriodicTable32";
import PeriodicTable18 from "@/features/chemistry/components/PeriodicTable18";
const Chemistry = () => {
    const { activeSection } = useChemistryStore();
    return (
        <div className="math-container mx-auto h-full">
            {/* Conditionally render */}
            {activeSection === SectionType.PERIODIC_TABLE && (
                // <PeriodicTable32 />
                <PeriodicTable18 />
            )}
        </div>
    );
};

export default Chemistry;