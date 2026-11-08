import { usePhysicsStore } from "@/features/physics/store/physicsStore";
import { SectionType } from "@/features/physics/models/PhysicsEnum";
import ConstantTable from "@/features/physics/components/ConstantTable";
const Physics = () => {
    const { activeSection } = usePhysicsStore();
    return (
        <div className="physics-container mx-auto h-full overflow-hidden">
            {/* Conditionally render */}
            {activeSection === SectionType.CONSTANTS && (
                <ConstantTable />
            )}
        </div>
    );
};

export default Physics;