import { CategoryEnum } from "@/features/chemistry/models/ChemistryEnum";

const ElementGroupLegend = ({
  hoveredCategory,
  onHoverCategory,
}: {
  hoveredCategory: string | null;
  onHoverCategory: (category: string | null) => void;
}) => {
  return (
    <div className="mb-0 p-4 bg-gray-800">
      <div className="grid grid-cols-3 gap-4">
        {/* Metals */}
        <div>
          <h3 className="font-bold text-gray-300">Metals</h3>
          <ul className="list-disc list-inside pl-5 text-left">
            <li
              className={`text-red-400 ${
                hoveredCategory === CategoryEnum.AlkaliMetal ? "ring-2 ring-red-400" : ""
              }`}
              onMouseEnter={() => onHoverCategory(CategoryEnum.AlkaliMetal)}
              onMouseLeave={() => onHoverCategory(null)}
            >
              Alkali metals
            </li>
            <li
              className={`text-orange-400 ${
                hoveredCategory === CategoryEnum.AlkalineEarthMetal ? "ring-2 ring-orange-400" : ""
              }`}
              onMouseEnter={() => onHoverCategory(CategoryEnum.AlkalineEarthMetal)}
              onMouseLeave={() => onHoverCategory(null)}
            >
              Alkaline earth metals
            </li>
            <li
              className={`text-pink-400 ${
                hoveredCategory === CategoryEnum.Lanthanide ? "ring-2 ring-pink-400" : ""
              }`}
              onMouseEnter={() => onHoverCategory(CategoryEnum.Lanthanide)}
              onMouseLeave={() => onHoverCategory(null)}
            >
              Lanthanoids
            </li>
            <li
              className={`text-gray-400 ${
                hoveredCategory === CategoryEnum.Actinide ? "ring-2 ring-gray-400" : ""
              }`}
              onMouseEnter={() => onHoverCategory(CategoryEnum.Actinide)}
              onMouseLeave={() => onHoverCategory(null)}
            >
              Actinoids
            </li>
            <li
              className={`text-green-400 ${
                hoveredCategory === CategoryEnum.TransitionMetal ? "ring-2 ring-green-400" : ""
              }`}
              onMouseEnter={() => onHoverCategory(CategoryEnum.TransitionMetal)}
              onMouseLeave={() => onHoverCategory(null)}
            >
              Transition metals
            </li>
            <li
              className={`text-blue-400 ${
                hoveredCategory === CategoryEnum.PostTransitionMetal ? "ring-2 ring-blue-400" : ""
              }`}
              onMouseEnter={() => onHoverCategory(CategoryEnum.PostTransitionMetal)}
              onMouseLeave={() => onHoverCategory(null)}
            >
              Post-transition metals
            </li>
          </ul>
        </div>

        {/* Nonmetals */}
        <div>
          <h3 className="font-bold text-gray-300">Nonmetals</h3>
          <ul className="list-disc list-inside pl-5 text-left">
            <li
              className={`text-yellow-400 ${
                hoveredCategory === CategoryEnum.Nonmetal ? "ring-2 ring-yellow-400" : ""
              }`}
              onMouseEnter={() => onHoverCategory(CategoryEnum.Nonmetal)}
              onMouseLeave={() => onHoverCategory(null)}
            >
              Reactive nonmetals
            </li>
            <li
              className={`text-indigo-400 ${
                hoveredCategory === CategoryEnum.NobleGas ? "ring-2 ring-indigo-400" : ""
              }`}
              onMouseEnter={() => onHoverCategory(CategoryEnum.NobleGas)}
              onMouseLeave={() => onHoverCategory(null)}
            >
              Noble gases
            </li>
          </ul>
        </div>

        {/* Metalloids */}
        <div>
          <h3 className="font-bold text-gray-300">Metalloids</h3>
          <ul className="list-disc list-inside pl-5 text-left">
            <li
              className={`text-purple-400 ${
                hoveredCategory === CategoryEnum.Metalloid ? "ring-2 ring-purple-400" : ""
              }`}
              onMouseEnter={() => onHoverCategory(CategoryEnum.Metalloid)}
              onMouseLeave={() => onHoverCategory(null)}
            >
              Metalloids
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ElementGroupLegend;