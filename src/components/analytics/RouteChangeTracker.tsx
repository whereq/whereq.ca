import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageview } from "@/lib/analytics";

/**
 * Mount this once inside `<BrowserRouter>`. It fires a GA4
 * pageview for every client-side route change.
 *
 * Why we don't track the very first route here: the first
 * pageview is sent by `initAnalytics()` on app mount, before
 * React Router has finished mounting the Routes tree. If we
 * sent it from this component too, every page load would emit
 * two pageviews — one for the initial paint and one for the
 * location-change that this effect picks up on mount. The
 * double-fire would inflate all of GA4's per-page metrics by
 * 2x for the landing route.
 *
 * If the user lands on `/` (the Home route), `useLocation()`
 * returns "/" on first render, and this effect will fire with
 * the same path that initAnalytics() already sent. To avoid
 * that, we skip the first effect run with the `useRef` guard.
 * For every subsequent route change, this effect runs once
 * and sends the new path.
 */
export const RouteChangeTracker = () => {
    const location = useLocation();
    const isFirstRun = useRef(true);
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }
        trackPageview(location.pathname + location.search);
    }, [location.pathname, location.search]);
    return null;
};
