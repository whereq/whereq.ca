import { useEffect, useState } from "react";
import { AuthContext } from "@/contexts/AuthContextInstance";
import KeycloakService from "@/services/keycloak";
import type { AuthContextType } from "@/contexts/AuthContextTypes";

// Hard upper bound on how long we wait for Keycloak to respond.
// If the 3rd-party iframe silently times out (offline / wrong
// realm / ad-blocker), we don't want the auth context to stay in
// `isLoading: true` forever — that would block every component
// gated on `useAuth()` from rendering.
const KEYCLOAK_INIT_TIMEOUT_MS = 5000;

const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
    new Promise<T>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
        p.then(
            (v) => { clearTimeout(t); resolve(v); },
            (e) => { clearTimeout(t); reject(e); },
        );
    });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<Omit<AuthContextType, 'login' | 'logout' | 'register'>>({
    isAuthenticated: false,
    isLoading: true
  });

  useEffect(() => {
    let cancelled = false;
    const initializeAuth = async () => {
      try {
        const authenticated = await withTimeout(
          KeycloakService.init(),
          KEYCLOAK_INIT_TIMEOUT_MS,
          "Keycloak init",
        );
        if (cancelled) return;
        setState({
          isAuthenticated: authenticated,
          isLoading: false
        });
      } catch (error) {
        // Keycloak unreachable / timed out / network blocked. Treat as
        // anonymous so the rest of the app still renders. The user can
        // sign in manually from the login page, which will retry.
        //
        // Logged as `console.warn`, not `console.error`:
        //   - this is an environmental issue (network blocked,
        //     Keycloak server down), not a code bug
        //   - in restricted networks (mainland China, corporate
        //     firewalls) the warning fires on every page load and
        //     floods the console with red errors that look alarming
        //     but are expected and non-actionable from the app's
        //     perspective
        // If the developer wants the full error, they can
        // uncomment the `console.debug` line below.
        // eslint-disable-next-line no-console
        console.warn("Keycloak init failed; running in anonymous mode. Cause:", error);
        // eslint-disable-next-line no-console
        // console.debug("Keycloak init full error:", error);
        if (cancelled) return;
        setState({
          isAuthenticated: false,
          isLoading: false
        });
      }
    };

    initializeAuth();
    return () => { cancelled = true; };
  }, []);

  const value: AuthContextType = {
    ...state,
    login: () => KeycloakService.getInstance().login(),
    logout: () => KeycloakService.getInstance().logout(),
    register: () => KeycloakService.getInstance().register()
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext } from "@/contexts/AuthContextInstance";
