import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faShareAlt } from "@fortawesome/free-solid-svg-icons";

type TitleBarProps = {
    title?: string;
};

export const TitleBar = ({ title }: TitleBarProps) => {
    return (
        <div className="flex justify-between 
                        items-center bg-gray-900 
                        px-1 h-8 text-orange-300 font-fira-code
                        ml-2 mr-2">
            <span className="font-bold text-xs">{title}</span>
            <div className="actions space-x-2">
                <button className="icon-button text-orange hover:text-teal-300">
                    <FontAwesomeIcon icon={faFloppyDisk} title="Save" />
                </button>
                <button className="icon-button text-orange hover:text-teal-300">
                    <FontAwesomeIcon icon={faShareAlt} title="Share" />
                </button>
            </div>
        </div>
    );
};
