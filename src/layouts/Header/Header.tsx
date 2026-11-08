import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome, faChalkboard, faInfoCircle, faEnvelope, faUser, faGlobe } from "@fortawesome/free-solid-svg-icons";
import { NavLink, useLocation } from "react-router-dom";
import { AppLauncher } from "@/components/app-launcher/AppLauncher";
import { useAppStore } from "@/store/store";
import { useNavigationStore } from "@/store/store"; // Import the navigation store
import { routeTitles } from "@/utils/utils";
import { APPLICATION_NAME } from "@/utils/constants";

import { useAuth } from "@/hooks/userAuth";
import keycloak from "@/services/keycloak";

export const Header = () => {
  const { setAppDrawerOpen } = useAppStore();
  const { path } = useNavigationStore(); // Get the current path from the store
  const location = useLocation();

  const { isAuthenticated } = useAuth(); // Get auth state

    // Get user profile from Keycloak token
  const userProfile = isAuthenticated ? keycloak.tokenParsed : null;
  const avatarUrl = userProfile?.picture || userProfile?.avatar;

  // Determine the current feature title
  const currentTitle = routeTitles[location.pathname] || "";

  // Function to close the AppLauncher
  const closeAppDrawer = () => {
    setAppDrawerOpen(false);
  };

  // Build the navigation path. On small screens we only show the app
  // name (no breadcrumb) because the title block is width-constrained
  // and the breadcrumb can get long (e.g. "WhereQ App Hub -> Multimedia
  // -> Background Remover") — the icon-only nav already gives you a
  // way to leave any sub-page, and a compact mobile breadcrumb is
  // available in the page itself for orientation.
  const buildNavigationPath = (includeBreadcrumb: boolean) => {
    if (!includeBreadcrumb) return APPLICATION_NAME;

    let navigationPath = APPLICATION_NAME;
    if (currentTitle) {
      navigationPath += ` -> ${currentTitle}`;
    }
    if (path && path.length > 0) {
      navigationPath += ` -> ${path.join(" -> ")}`;
    }
    return navigationPath;
  };

  return (
    <header className="fixed top-0 left-0 right-0
                       z-10 bg-[#0A0E13] text-[#E9EFF6]
                       border-b border-[rgba(168,190,216,0.12)]
                       shadow-md h-[3.125rem]">
      <div className="w-full h-full flex items-center justify-between px-2 sm:px-4 gap-2 sm:gap-4">
        {/* App Title with Navigation Path.
            The wrapper uses min-w-0 + flex-1 so the title can shrink
            and `truncate` can ellipsize the text instead of wrapping to
            a second line (which would push the 3.125rem header taller
            and break the fixed-height layout). */}
        <h1 className="text-base sm:text-lg font-bold font-fira-code min-w-0 flex-1 truncate">
          {/* Mobile: just the app name, no breadcrumb. */}
          <span className="sm:hidden">{buildNavigationPath(false)}</span>
          {/* sm and up: full breadcrumb, with ellipsis if too long. */}
          <span className="hidden sm:inline">{buildNavigationPath(true)}</span>
        </h1>

        {/* Navigation Menu. Icon-only on all sizes; gap shrinks on mobile
            to give the title more room. `flex-none` prevents the nav
            from being squeezed by the title flex-1 above. */}
        <nav className="flex items-center space-x-1.5 sm:space-x-4 flex-none">
          {/* Universe — the public entrance / ecosystem map (full-bleed,
              outside this shell). The Lab home below is the app hub. */}
          <NavLink
            to="/"
            title="WhereQ Universe"
            className={({ isActive }) =>
              `hover:text-[#4DA8F0] transition-colors ${isActive ? "text-[#4DA8F0]" : ""}`
            }
            onClick={closeAppDrawer}
          >
            <FontAwesomeIcon icon={faGlobe} size="lg" />
          </NavLink>
          <NavLink
            to="/lab"
            title="Lab"
            className={({ isActive }) =>
              `hover:text-[#4DA8F0] transition-colors ${isActive ? "text-[#4DA8F0]" : ""}`
            }
            onClick={closeAppDrawer} // Close AppLauncher on click
          >
            <FontAwesomeIcon icon={faHome} size="lg" />
          </NavLink>
          <NavLink
            to="/event-board"
            title="App Event Board"
            className={({ isActive }) =>
              `hover:text-[#4DA8F0] transition-colors ${isActive ? "text-[#4DA8F0]" : ""}`
            }
            onClick={closeAppDrawer} // Close AppLauncher on click
          >
            <FontAwesomeIcon icon={faChalkboard} size="lg" />
          </NavLink>
          <NavLink
            to="/about"
            title="About"
            className={({ isActive }) =>
              `hover:text-[#4DA8F0] transition-colors ${isActive ? "text-[#4DA8F0]" : ""}`
            }
            onClick={closeAppDrawer} // Close AppLauncher on click
          >
            <FontAwesomeIcon icon={faInfoCircle} size="lg" />
          </NavLink>
          <NavLink
            to="/contact"
            title="Contact Us"
            className={({ isActive }) =>
              `hover:text-[#4DA8F0] transition-colors ${isActive ? "text-[#4DA8F0]" : ""}`
            }
            onClick={closeAppDrawer} // Close AppLauncher on click
          >
            <FontAwesomeIcon icon={faEnvelope} size="lg" />
          </NavLink>

          {/* AppLauncher */}
          <AppLauncher />

          <NavLink
            to={isAuthenticated ? "/profile" : "/signin"}
            title={isAuthenticated ? "My Profile" : "Sign In/Sign Up"}
            className={({ isActive }) =>
              `hover:text-[#4DA8F0] transition-colors ${isActive ? "text-[#4DA8F0]" : ""}`
            }
            onClick={closeAppDrawer}
          >
            {isAuthenticated ? (
              avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <FontAwesomeIcon
                  icon={faUser}
                  size="lg"
                  className="text-sky-700" // Changed color for authenticated users
                />
              )
            ) : (
              <FontAwesomeIcon
                icon={faUser}
                size="lg"
                className="text-orange-300" // Original color for anonymous users
              />
            )}
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Header;
