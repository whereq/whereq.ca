import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppCard } from "@/components/app-card/AppCard";
import { SearchBox, TagImpl, type SearchBoxSuggestion } from "@whereq/react";
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
import { FaReact } from "react-icons/fa";
import { useAppStore } from "@/store/store"; // Import useAppStore
import "./lab.css";

/**
 * The Lab hub — the app index of the WhereQ Universe.
 *
 * The page is deliberately composed, not a paragraph: a masthead
 * (kicker · title · lede · call to action) on the left, a fact rail
 * on the right, and a toolbar that filters the experiment grid.
 * Everything is left-aligned on purpose — the app shell centres its
 * content, so each block states its own alignment.
 */

interface LabApp {
    id: number;
    name: string;
    icon: typeof faHexagonNodes | typeof GiMaterialsScience | typeof FaReact;
    description: string;
    path: string;
    category: string;
}

const apps: LabApp[] = [
  { id: 1, name: "API Explorer", icon: faHexagonNodes, description: "Public API Explorer", path: "/api-explorer", category: "Developer" },
  { id: 2, name: "Multimedia", icon: faPhotoFilm, description: "YouTube, image, video & GIF tools", path: "/multimedia", category: "Media" },
  { id: 3, name: "Map", icon: faMap, description: "WhereQ Map", path: "/map", category: "Geo" },
  { id: 4, name: "Calendar", icon: faCalendar, description: "WhereQ Calendar", path: "/calendar", category: "Productivity" },
  { id: 5, name: "Tools", icon: faScrewdriverWrench, description: "Tools", path: "/tools", category: "Developer" },
  { id: 6, name: "Tag", icon: faTags, description: "WhereQ Tags", path: "/tag", category: "Developer" },
  { id: 7, name: "Category", icon: faTableCells, description: "WhereQ Categories", path: "/category", category: "Developer" },
  { id: 8, name: "Math", icon: faInfinity, description: "Math Academy", path: "/math", category: "Science" },
  { id: 9, name: "Physics", icon: GiMaterialsScience, description: "Everything about Physics", path: "/physics", category: "Science" },
  { id: 10, name: "Chemistry", icon: GiAcid, description: "Everything about Chemistry", path: "/chemistry", category: "Science" },
  { id: 11, name: "Academy", icon: faGraduationCap, description: "Academy Resources", path: "/academy", category: "Learning" },
  { id: 12, name: "Paws", icon: faPaw, description: "Paws", path: "/paws", category: "Fun" },
  { id: 13, name: "WhereQ React", icon: FaReact, description: "The shared @whereq/react component library", path: "/react", category: "Design System" },
];

/** The number of primitives the @whereq/react demo exposes. */
const LIBRARY_PRIMITIVES = 6;

const ALL_CATEGORIES = "All";

/**
 * The search box theme — the Universe's deep-space values expressed as
 * the library's `--wq-search-*` tokens.
 */
const LAB_SEARCH_THEME = {
    fieldBg: "#0e141c",
    fieldBorder: "rgba(168,190,216,0.16)",
    fieldBorderFocus: "rgba(77,168,240,0.55)",
    text: "#e9eff6",
    placeholder: "#6e7c90",
    icon: "#6e7c90",
    iconHover: "#4da8f0",
    listBg: "#0e141c",
    listBorder: "rgba(168,190,216,0.16)",
    listText: "#e9eff6",
    listDescription: "#6e7c90",
    listActiveBg: "rgba(77,168,240,0.12)",
    listActiveText: "#e9eff6",
    radius: "4px",
    shadow: "0 18px 40px rgba(0,0,0,0.5)",
    font: "'Fira Code', monospace",
    fontSize: "13px",
};

const Home = () => {
  const { setAppDrawerOpen } = useAppStore(); // Access setAppDrawerOpen from the store
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);

  // Function to close the AppLauncher
  const handleAppCardClick = () => {
    setAppDrawerOpen(false);
  };

  const categories = useMemo(
    () => [ALL_CATEGORIES, ...Array.from(new Set(apps.map((app) => app.category)))],
    []
  );

  /** The apps that match the current category — the grid always honours it. */
  const categoryApps = useMemo(
    () => (category === ALL_CATEGORIES ? apps : apps.filter((app) => app.category === category)),
    [category]
  );

  /** The apps that match the typed query, across every category. */
  const queryApps = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return [];
    }
    return apps.filter((app) =>
      `${app.name} ${app.description} ${app.category}`.toLowerCase().includes(needle)
    );
  }, [query]);

  /** What the grid shows: the category filter, then the text filter. */
  const visibleApps = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return categoryApps;
    }
    return categoryApps.filter((app) =>
      `${app.name} ${app.description} ${app.category}`.toLowerCase().includes(needle)
    );
  }, [categoryApps, query]);

  const suggestions: SearchBoxSuggestion[] = queryApps.map((app) => ({
    key: String(app.id),
    label: app.name,
    description: app.description,
  }));

  /** Picking a suggestion opens that experiment. */
  const handleSelect = (suggestion: SearchBoxSuggestion) => {
    const app = apps.find((item) => String(item.id) === suggestion.key);
    if (app) {
      setAppDrawerOpen(false);
      navigate(app.path);
    }
  };

  /** Free text with exactly one match opens it; anything else just filters. */
  const handleSubmit = (text: string) => {
    const needle = text.trim().toLowerCase();
    const match = apps.find((app) =>
      `${app.name} ${app.description} ${app.category}`.toLowerCase().includes(needle)
    );
    if (match) {
      setAppDrawerOpen(false);
      navigate(match.path);
    }
  };

  const renderOption = (suggestion: SearchBoxSuggestion) => {
    const app = apps.find((item) => String(item.id) === suggestion.key);
    return (
      <span className="flex items-baseline justify-between gap-3">
        <span>{suggestion.label}</span>
        {app && <span className="text-[10px] uppercase tracking-widest opacity-60">{app.category}</span>}
      </span>
    );
  };

  const clearFilters = () => {
    setQuery("");
    setCategory(ALL_CATEGORIES);
  };

  return (
    <div className="wq-lab p-4 sm:p-6">
      {/* Masthead — identity on the left, the lab's facts on the right. */}
      <header className="lab-masthead">
        <div>
          <p className="lab-kicker">WhereQ.ca — the research station</p>
          <h1 className="lab-title">WhereQ Lab</h1>
          <p className="lab-lede">
            Where ideas are tested first. Every experiment, tool and prototype in
            the universe is incubated here — in the browser, on your machine,
            with nothing to install and nothing to sign up for.
          </p>
          <div className="lab-actions">
            <Link className="lab-cta" to="/">
              Back to the Universe <span aria-hidden="true">↗</span>
            </Link>
            <span className="lab-meta">Local-first · Your keys, your machine</span>
          </div>
        </div>

        <dl className="lab-facts">
          <div className="lab-fact">
            <dt>Experiments</dt>
            <dd><b>{apps.length}</b> live</dd>
          </div>
          <div className="lab-fact">
            <dt>UI primitives</dt>
            <dd><b>{LIBRARY_PRIMITIVES}</b> shared</dd>
          </div>
          <div className="lab-fact">
            <dt>Runtime</dt>
            <dd>In your browser</dd>
          </div>
          <div className="lab-fact">
            <dt>Secrets</dt>
            <dd>Stay on this device</dd>
          </div>
        </dl>
      </header>

      {/* Toolbar — the shared search box plus the category chips. */}
      <div className="lab-toolbar">
        <div className="lab-search">
          <SearchBox
            inputId="labSearch"
            value={query}
            onChange={setQuery}
            placeholder="Search the lab"
            label="Search the lab"
            theme={LAB_SEARCH_THEME}
            suggestions={suggestions}
            onSelect={handleSelect}
            onSubmit={handleSubmit}
            renderOption={renderOption}
            emptyText="No experiment matches that name."
          />
        </div>

        <div className="lab-chips" role="group" aria-label="Filter by category">
          {categories.map((item) => (
            <TagImpl<'button'>
              key={item}
              as="button"
              type="button"
              variant="link"
              className={`lab-chip${item === category ? " lab-chip--active" : ""}`}
              onClick={() => setCategory(item)}
              aria-pressed={item === category}
            >
              {item}
            </TagImpl>
          ))}
        </div>
      </div>

      {/* Responsive Grid */}
      <div className="lab-grid">
        {visibleApps.map((app) => (
          <AppCard
            key={app.id}
            name={app.name}
            icon={app.icon}
            description={app.description}
            path={app.path}
            category={app.category}
            onClick={handleAppCardClick} // Pass the click handler to AppCard
          />
        ))}

        {visibleApps.length === 0 && (
          <div className="lab-empty">
            <b>Nothing in the lab matches that yet.</b>
            Try another name, or reset the filters to see all {apps.length} experiments.
            <div className="mt-4">
              <button type="button" className="lab-cta" onClick={clearFilters}>
                Reset filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
