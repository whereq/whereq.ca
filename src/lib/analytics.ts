/**
 * Thin wrapper around react-ga4 so the rest of the app doesn't
 * have to know the measurement ID, the test-mode toggle, or
 * the init-once guard.
 *
 * Why testMode in development: GA4's docs explicitly say
 * "events sent with testMode are not counted in your reports".
 * If we sent real hits from localhost during development, every
 * `yarn dev` session would pollute production analytics with
 * `/about`, `/contact`, dev-only routes, and HMR reloads. Bad
 * data in the dashboard, and the daily-active-user count
 * inflates every time you start the dev server. Keep
 * testMode: true in dev.
 *
 * The measurement ID comes from `VITE_GA4_MEASUREMENT_ID`,
 * which Vite inlines into the bundle at build time. Vite only
 * exposes env vars prefixed with `VITE_` to the client; that's
 * why we don't call it just `GA4_MEASUREMENT_ID` here.
 */
import ReactGA from "react-ga4";

const MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID as
    | string
    | undefined;
const IS_DEV = import.meta.env.DEV;

let initialized = false;

export function initAnalytics(): void {
    if (!MEASUREMENT_ID) {
        // Warn in production only — in dev a missing ID is
        // expected (the .env file isn't always populated on a
        // fresh clone) and we don't want to scare the dev.
        if (!IS_DEV) {
            console.warn(
                "[analytics] VITE_GA4_MEASUREMENT_ID is not set; analytics disabled"
            );
        }
        return;
    }
    if (initialized) return;

    // testMode: !IS_DEV  →  true in dev, false in prod.
    ReactGA.initialize(MEASUREMENT_ID, { testMode: IS_DEV });
    initialized = true;

    // Send the first pageview here. Subsequent SPA route changes
    // are caught by RouteChangeTracker.
    ReactGA.send({
        hitType: "pageview",
        page: window.location.pathname + window.location.search,
    });
}

export function trackPageview(path: string): void {
    if (!initialized) return;
    ReactGA.send({ hitType: "pageview", page: path });
}

export function trackEvent(
    category: string,
    action: string,
    label?: string
): void {
    if (!initialized) return;
    // react-ga4's event() takes either an EventArgs object
    // ({category, action, label, value}) or a string for the
    // action. The string form is shorter but doesn't accept
    // category/label, so we use the object form for the full
    // GA4 recommended-event shape.
    ReactGA.event({ category, action, label });
}
