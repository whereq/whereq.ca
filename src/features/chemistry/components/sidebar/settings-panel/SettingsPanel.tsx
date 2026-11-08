import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

export const SettingPanel = ({ onClose }: { onClose: () => void }) => {

    const handleClose = () => {
        onClose();
    };

    return (
        <div className="fixed top-15 left-12 w-[calc(100%-3rem)] h-[calc(100%-76px)] bg-black text-orange font-fira flex flex-col border border-gray-700">
            {/* Header and buttons */}
            <div className="flex justify-between items-center px-4 py-2 bg-gray-900 border-b border-gray-700">
                <h2 className="text-lg">Settings</h2>
                <div className="flex gap-2">
                    <button
                        onClick={handleClose}
                        className="text-orange hover:text-yellow-400"
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
            </div>

            <div className="flex flex-col p-4 bg-gray-900 border border-gray-700 rounded-lg">
                <h2 className="text-lg font-bold text-orange-400 mb-2">Pending</h2>
            </div>
        </div>
    );
};