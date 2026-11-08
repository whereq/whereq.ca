import { AppCard } from "@/components/app-card/AppCard";
import { faHexagonNodes,
         faMap,
         faScrewdriverWrench,
         faInfinity,
         faCalendar,
         faTags,
         faTableCells,
         faGraduationCap,
         faPhotoFilm,
         faPaw} from "@fortawesome/free-solid-svg-icons";
import { GiMaterialsScience, GiAcid  } from "react-icons/gi";
import { useAppStore } from "@/store/store"; // Import useAppStore

const apps = [
  { id: 1, name: "API Explorer", icon: faHexagonNodes, description: "Public API Explorer", path: "/api-explorer" },
  { id: 2, name: "Multimedia", icon: faPhotoFilm, description: "YouTube, image, video & GIF tools", path: "/multimedia" },
  { id: 3, name: "Map", icon: faMap, description: "WhereQ Map", path: "/map" },
  { id: 4, name: "Calendar", icon: faCalendar, description: "WhereQ Calendar", path: "/calendar" },
  { id: 5, name: "Tools", icon: faScrewdriverWrench, description: "Tools", path: "/tools" },
  { id: 6, name: "Tag", icon: faTags, description: "WhereQ Tags", path: "/tag" },
  { id: 7, name: "Category", icon: faTableCells, description: "WhereQ Categories", path: "/category" },
  { id: 8, name: "Math", icon: faInfinity, description: "Math Academy", path: "/math" },
  { id: 9, name: "Physics", icon: GiMaterialsScience, description: "Everything about Physics", path: "/physics" },
  { id: 10, name: "Chemistry", icon: GiAcid, description: "Everything about Chemistry", path: "/chemistry" },
  { id: 11, name: "Academy", icon: faGraduationCap, description: "Academy Resources", path: "/academy" },
  { id: 12, name: "Paws", icon: faPaw, description: "Paws", path: "/paws" },
];

const Home = () => {
  const { setAppDrawerOpen } = useAppStore(); // Access setAppDrawerOpen from the store

  // Function to close the AppLauncher
  const handleAppCardClick = () => {
    setAppDrawerOpen(false);
  };

  return (
    <div className="min-h-full bg-gray-900 text-[#E9EFF6] font-fira-code p-4 sm:p-6">
      {/* Lab header — the research station of the WhereQ Universe. */}
      <header className="mb-6 max-w-3xl">
        <p className="font-mono text-[11px] tracking-[0.3em] text-[#8b949e]">
          WHEREQ.CA — THE RESEARCH STATION
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#E9EFF6]">
          WhereQ Lab
        </h1>
        <p className="mt-2 text-sm text-[#8b949e]">
          Where ideas are tested first. Every experiment, tool and prototype in
          the universe is incubated here.{" "}
          <a href="/" className="text-[#4DA8F0] hover:underline">
            Back to the Universe ↗
          </a>
        </p>
      </header>

      {/* Responsive Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {apps.map((app) => (
          <AppCard
            key={app.id}
            name={app.name}
            icon={app.icon}
            description={app.description}
            path={app.path}
            onClick={handleAppCardClick} // Pass the click handler to AppCard
          />
        ))}
      </div>
    </div>
  );
};

export default Home;