import dayjs from "dayjs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretLeft, faCaretRight } from "@fortawesome/free-solid-svg-icons";

const CalendarHeader = ({
  currentDate,
  onNext,
  onPrev,
}: {
  currentDate: dayjs.Dayjs;
  onNext: () => void;
  onPrev: () => void;
}) => {
  return (
    <div className="flex items-center pb-1">
      <button
        onClick={onPrev}
        className="text-orange-300 hover:text-orange-400 w-8 flex justify-center"
      >
        <FontAwesomeIcon icon={faCaretLeft} />
      </button>
      <button
        onClick={onNext}
        className="text-orange-300 hover:text-orange-400 w-8 flex justify-center"
      >
        <FontAwesomeIcon icon={faCaretRight} />
      </button>
      <h2 className="text-xl font-bold ml-2">
        {currentDate.format("MMMM YYYY")}
      </h2>
    </div>
  );
};

export default CalendarHeader;