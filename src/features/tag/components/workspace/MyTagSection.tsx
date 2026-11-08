import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashAlt } from "@fortawesome/free-solid-svg-icons";

export const MyTagSection = () => {

    return (
        <div className="tag-my-tag flex flex-col border-b border-gray-700">
            {/* Section Header */}
            <div className="flex justify-between items-center p-2 bg-gray-800">
                <h3 className="text-sm font-semibold">My Tags</h3>
                <button
                    onClick={() => console.log('My Tags Cleared')}
                    className="text-sm text-red-500 hover:text-red-700"
                    title="Clear My Tags"
                >
                    <FontAwesomeIcon icon={faTrashAlt} />
                </button>
            </div>
        </div>
    );
};