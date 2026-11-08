import { Route, Routes } from "react-router-dom";
import { ShellLayout } from "@/layouts/ShellLayout";
import { RouteChangeTracker } from "@/components/analytics/RouteChangeTracker";
import UniversePage from "@/features/universe/UniversePage";
import Home from "@/pages/home/Home";
import About from "@/pages/about/About";
import Contact from "@/pages/contact/Contact";
import Signin from "@/pages/signin/Signin";
import Signup from "@/pages/signup/Signup";
import ApiExplorerPage from "@/features/api-explorer/pages/ApiExplorerPage";
import MapsPage from "@/features/map/pages/MapsPage";
import CalendarPage from "@/features/calendar/pages/CalendarPage";
import TagPage from "@/features/tag/pages/TagPage";
import CategoryPage from "@/features/category/pages/CategoryPage";
import AcademyPage from "@/features/academy/pages/AcademyPage";
import MathPage from "@/features/math/pages/MathPage";
import ToolsPage from "@/features/tools/pages/ToolsPage";
import PhysicsPage from "@/features/physics/pages/PhysicsPage";
import ChemistryPage from "@/features/chemistry/pages/ChemistryPage";
import PawsPage from "@/features/paws/pages/PawsPage";
import MultimediaPage from "@/features/multimedia/pages/MultimediaPage";
import EventBoard from "@/pages/event-board/EventBoard";
import Profile from "@/pages/profile/Profile";

/**
 * Top-level router.
 *
 *   /        → WhereQ Universe — the public entrance / ecosystem map.
 *              Full-bleed, with its own nav/footer/starfield; renders
 *              outside the app shell.
 *   /lab,…   → WhereQ Lab — the app hub and every feature page, wrapped in
 *              the fixed header/footer ShellLayout.
 */
export const AppRouter = () => {
  return (
    <>
      {/* Fire a GA4 pageview for every client-side route change. */}
      <RouteChangeTracker />
      <Routes>
        <Route path="/" element={<UniversePage />} />

        <Route element={<ShellLayout />}>
          <Route path="/lab" element={<Home />} />
          <Route path="/event-board" element={<EventBoard />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/signin" element={<Signin />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/api-explorer" element={<ApiExplorerPage />} />
          <Route path="/map" element={<MapsPage />} />
          <Route path="/tag" element={<TagPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/category" element={<CategoryPage />} />
          <Route path="/academy" element={<AcademyPage />} />
          <Route path="/math" element={<MathPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/physics" element={<PhysicsPage />} />
          <Route path="/chemistry" element={<ChemistryPage />} />
          <Route path="/paws" element={<PawsPage />} />
          <Route path="/multimedia" element={<MultimediaPage />} />
        </Route>
      </Routes>
    </>
  );
};
