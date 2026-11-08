import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashAlt } from "@fortawesome/free-solid-svg-icons";

export const PeriodicTableSection = () => {

    return (
        <div className="paws-cats flex flex-col border-b border-gray-700">
            {/* Section Header */}
            <div className="flex justify-between items-center p-2 bg-gray-800">
                <h3 className="text-sm font-semibold">Periodic Table</h3>
                <button
                    onClick={() => console.log('Periodic Table Cleared')}
                    className="text-sm text-red-500 hover:text-red-700"
                    title="Clear Periodic Table"
                >
                    <FontAwesomeIcon icon={faTrashAlt} />
                </button>
            </div>
        </div>
    );
};