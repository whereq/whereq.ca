import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashAlt } from "@fortawesome/free-solid-svg-icons";

export const FormatConverterSection = () => {

    return (
        <div className="tag-whereq-tag flex flex-col border-b border-gray-700">
            {/* Section Header */}
            <div className="flex justify-between items-center p-2 bg-gray-800">
                <h3 className="text-sm font-semibold">WhereQ Tags</h3>
                <button
                    onClick={() => console.log('WhereQ Tags Cleared')}
                    className="text-sm text-red-500 hover:text-red-700"
                    title="Clear WhereQ Tags"
                >
                    <FontAwesomeIcon icon={faTrashAlt} />
                </button>
            </div>
        </div>
    );
};