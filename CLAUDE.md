# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

WhereQ App Hub — a personal developer portfolio / in-browser lab SPA. The public entrance is the **WhereQ Universe** at `/` (hand-built SVG galaxy of WhereQ ecosystem products); the **WhereQ Lab** at `/lab` (and all `/<feature>` routes) is a shell-wrapped host of ~15 client-side feature pages (multimedia, map, math, physics, chemistry, api-explorer, etc.). Deployed to Vercel, auto-deploys from `main`.

The single hardest non-negotiable design contract is the **COOP/COEP/CORP headers invariant** — they MUST be identical between `vite.config.ts` and `vercel.json`. If they diverge, FFmpeg.wasm / ONNX silently fail to load in production with no useful error. See the long-form `docs/ARCHITECTURE.md` §16 for the full chain (browser, dev, Vercel prod).

## Common commands

```bash
yarn dev      # vite dev server on :5173 with HMR + COOP/COEP headers
yarn build    # production bundle to ./dist/ (~66 MB; ~500 kB chunk warning is expected)
yarn preview  # serves ./dist/ on :4173 with prod headers — use to smoke-test before deploy
yarn lint     # eslint flat config; 0 errors required, baseline ~32 warnings is acceptable
npx tsc -p tsconfig.app.json --noEmit   # type-check without building
npx tsc -p tsconfig.node.json --noEmit  # type-check the vite config
bin/release.sh --message "…"            # release: gates → commit → tag → push main (Vercel deploys)
```

`yarn build` is plain `vite build` — it does **not** type-check. Run `tsc --noEmit` separately; `bin/release.sh` does both.

There is **no test runner**. `@testing-library/*` is in `devDependencies` but no test script is configured. QA is manual smoke tests against `yarn build && yarn preview` plus the deploy runbook in `docs/ARCHITECTURE.md` §19.

## Top-level structure (high level)

- `src/main.tsx` mounts: `StrictMode → ErrorBoundary → QueryClientProvider → BrowserRouter → AuthProvider → <App>`. Side effects polyfill `window.global`, swallow known extension unhandled-rejection noise, and call `Modal.setAppElement("#root")`.
- `src/router/AppRouter.tsx` — the active router. `/` renders `<UniversePage/>` outside the shell; every other route renders inside `<ShellLayout/>` (fixed header 3.125rem + scrollable `<main>` + fixed footer 3.125rem).
- `src/router/routes.ts` — **dead code**, leftover from an abandoned lazy-loading migration. Not imported anywhere.
- `src/pages/not-found/NotFound.tsx` — exists but **never rendered** (no `<Route path="*">` in `AppRouter.tsx`). If you want a 404, add it.
- `src/contexts/AuthContext.tsx` — Keycloak SSO via `keytomarvel.com` (realm `whereq`, client `whereq-ca`). Wrapped in a 5s timeout so a blocked Keycloak iframe doesn't leave the app in `isLoading: true` forever.
- `src/services/keycloak.ts` — hardcoded Keycloak config (URL, realm, clientId). No env-var abstraction.
- `src/store/store.ts` — three global Zustand stores: `useAppStore` (drawer), `useNavigationStore` (breadcrumb), `useModalStore` (CustomModal state). Every feature also has its own per-feature Zustand store.
- `src/lib/analytics.ts` — GA4 wrapper. No-op if `VITE_GA4_MEASUREMENT_ID` is unset.
- `src/features/<name>/` — one folder per feature route. Standard shape: `pages/<Name>Page.tsx` + `components/{Sidebar,Workspace,<Name>,sidebar/settings-panel,workspace/<Section>Section}` + `store/<name>Store.ts` + `models/<Name>Enum.ts` + `resources/` (bundled YAML/JSON). The deep playbook for adding a feature lives in `docs/ARCHITECTURE.md` §18.
- `src/features/react/` — the `@whereq/react` demo at `/react`. One child page per library primitive (SearchBox, Tag, Toast, Avatar, Scrollbar, CountryFlag) in the sidebar rail + the resizable workspace. It renders the **published package**, so a library fix only shows up here after a new npm release.
- `docs/ARCHITECTURE.md` — canonical, ~89 KB deep-read of every file. **Read this before non-trivial changes**; it captures the design rationale, dead code, and known bugs that aren't visible from the code alone.

## State / persistence conventions

- **State**: Zustand 5 for everything shared across the tree. Component-local `useState` for ephemeral UI. No Redux, no Context-as-state.
- **Persistence**: almost everything to `localStorage` via `src/utils/localStorageHelper.ts` (JSON wrapper). Read-on-mount, write-on-every-mutation, no migration logic. If a schema changes, users lose their saved data.
- **Two parallel pub/sub mechanisms** (intentional tech debt, will be unified):
  1. `src/utils/eventEmitter.ts` — typed singleton, used by `map/`.
  2. `window.dispatchEvent(new CustomEvent(LOCAL_APP_EVENTS))` — DOM events, used by `AppEvent.ts`.

## Styling / design system

**One palette: MetroUI dark** (mirrored from `whereq.github.io`) — bg `#161b27`, accent orange `#f5a623`, text `#f0e6c8`, Fira Code monospace globally. Tokens are Tailwind v4 CSS variables in the `@theme {}` block in `src/index.css` (which also overrides the gray scale so `bg-gray-900` doesn't produce a visible seam against the body). `tailwind.config.js` (v3-style) is mostly dormant but kept around for tooling compatibility. The Lab hub (`pages/home/`, scoped `.wq-lab`), the `@whereq/react` demo (`features/react/`, scoped `.wq-react`) and the app chrome all use it.

The **only** surface with its own palette is the full-bleed Universe marketing page at `/` (deep-space blue, its own page-local tokens in `features/universe/universe.css`) — it renders outside the shell, so it may.

**The corner radius is the xs step (2px) everywhere.** `src/index.css` collapses both the MetroUI radius ladder (`--radius-metro-*`) and Tailwind's own radius scale (`--radius-xs` … `--radius-4xl`) to 2px, and overrides the *bare* utilities (`rounded`, `rounded-l`, `rounded-r` — which Tailwind v4 hardcodes at 0.25rem and does not theme) with unlayered rules. `rounded-full` is left alone: a circle stays a circle.

Card primitive is `<AppCard>` in `src/components/app-card/` — the Lab's experiment tile (framed icon tile, name, description, category tag). It takes a FontAwesome definition *or* a `react-icons` component and renders whichever it is given.

**`@whereq/react` needs a Tailwind `@source`.** Its `Tag` and `Toast` are written with Tailwind utility classes that live in the published bundle, which Tailwind never scans on its own — `src/index.css` points `@source` at `node_modules/@whereq/react/dist/**` so those utilities compile. Remove that line and the library renders **unstyled**. The library's `Tag` / `Toast` also read their colours from app-supplied variables (`--rule`, `--text`, `--text-dim`, `--text-faint`, `--bg-soft`, `--accent`, `--up`, `--down`, `--nova`), defined on `:root` in `src/index.css`.

## Heavy local-feature engines

- **FFmpeg.wasm** (`@ffmpeg/ffmpeg@0.12`) — shared singleton via `src/features/multimedia/hooks/useFfmpegEngine.ts` (module-level instance + React mirror via pub/sub). Multiple components can read the same `ffmpegInstance` reference. Tries local `public/ffmpeg-core/` first, falls back to unpkg. Each consumer wires its own `ffmpeg.on("progress", ...)` per `useEffect`. Requires `SharedArrayBuffer` (the COOP/COEP reason).
- **Pyodide** (`pyodide@314.0.8`) — singleton in `src/features/tools/components/CodeFormatter.tsx` with `pyodideInitPromise`. Bumps `setMaxListeners(50)` to survive React StrictMode double-mount. Loads from jsdelivr CDN; the CDN version string is a hardcoded `PYODIDE_VERSION` constant that must track the package version.
- **ONNX Runtime Web** (via `@imgly/background-removal@1.7.0`) — background-removal tool. The onnxruntime-web subpath aliases in `vite.config.ts` (`webgpu`/`cpu` → default) are because the subpaths aren't in the package's `exports` field. WASM/WebGL auto-detected at runtime.
- **gif.js + gifuct-js** — encoder + decoder for GIF tooling (no TS types, lots of `// @ts-expect-error`).
- **MathJax** — module singleton in `src/utils/mathJaxSetup.ts` (TeX input + SVG output), reused by `math/` and `physics/`.

## Conventional gotchas

- **Use `<CustomModal>` for in-app confirmations** — never `window.alert/confirm/prompt` (one known exception: `ImageFormatConverter.tsx` error path, flagged in ARCHITECTURE.md §17).
- **No 3-button replace-warning skip pattern**: when a media tool produces a downloadable artifact and the user picks a new file, show a 3-button `<CustomModal type="warning">` (Cancel / Discard & continue / Download previous). Stash the new file in a `useRef<PendingFile>` while the modal is open. Reference impl: `src/features/multimedia/components/VideoToGif.tsx`.
- **User-visible text should be jargon-free** — "engine not ready" yellow notice, not "SharedArrayBuffer unavailable". Implementation details belong in `//` comments.
- **For indeterminate progress** (ffmpeg stream copy, model downloads), use a `phase` state machine (`"writing" → "cutting" → "reading"`) with the `.animate-indeterminate` gradient sweep. Canonical example: `cutPhase` in `VideoSplitter.tsx`.
- **Always pair `URL.createObjectURL` with `revokeObjectURL`** in unmount cleanup. Blob URLs leak across hot reloads.
- **The standard 3.125rem bar height** in `ShellLayout` is duplicated as a magic number in 3 places (Header height, Footer height, main `height: calc(100vh - 6.25rem)`). Changing bar height requires editing all three.
- **Tailwind v3 config + Tailwind v4 plugin coexist**. The `@theme` block in `src/index.css` is the runtime source of truth; `tailwind.config.js` is mostly dormant.
- **Tailwind arbitrary values use underscores for spaces, never commas.** `grid-cols-[5%_20%_35%_40%]` is correct; `grid-cols-[5%,20%,35%,40%]` compiles to `grid-template-columns:5%,20%,35%,40%`, which is **invalid CSS** — a grid track list is space-separated. The browser keeps the selector and silently drops the declaration, so the element falls back to a single column and a "table" collapses into one stacked column. The failure is invisible in the source and in DevTools unless you look at the CSSOM: the rule reads `.grid-cols-\[5\%\,20\%…\] { }` with an empty body. The map and api-explorer settings panels both had this; the map one is now a real `<table>`.
- **The app shell centers everything.** `ShellLayout` puts `text-align: center` on the page container, and it inherits into every route — so any panel, table or paragraph must set `text-left` explicitly or its content renders centered. The Lab hub (`.wq-lab`) and the library demo (`.wq-react`) both set `text-align: left` on their root for exactly this reason.
- **Tailwind v4's preflight makes `<main>` a flex container** (`display: flex; flex-direction: column`). Every block inside a `<main>` is therefore a flex item, and a flex item may shrink below its content — the demo's install block lost 8px and grew a scrollbar that way. Give the children `flex-shrink: 0` (`.wq-react__main > *`) or the panel gets squashed.
- **The library's `SearchBox` shows its list whenever `suggestions` is non-empty** — an empty query does not close it. Filter the suggestions yourself (pass `[]` until the query has characters) or the dropdown sits open.
- **`react-ace@15` quirk**: published CJS; Vite's CJS→ESM transform makes `import X from "react-ace"` return the whole `module.exports` object. The component is `mod.default.default`. See `CodeFormatter.tsx` for the unwrap.
- **`as any` casts** in `AudioVideoMerger.handleMerge` carry inline `// eslint-disable-next-line` comments — required because @ffmpeg/ffmpeg v0.12's types are wrong.
- **`ffmpeg.readFile` returns `Uint8Array | string`** — narrow the `string` case before building a `Blob` (see `AudioVideoMerger`, `VideoSplitter`, `GifMaker`).
- **TypeScript 6 does not auto-include `@types/*` packages** — `tsconfig.app.json` sets `"types": ["google.maps"]` to re-add the `google.maps` globals explicitly. The legacy `@types/googlemaps` package must NOT be installed alongside `@types/google.maps` (they collide on the same global namespace).
- **Advanced markers use `gmp-click`, not `click`, and the pin is the `PinElement` itself.** `addEventListener("click", ...)` on a marker's DOM element and `PinElement.element` are both deprecated by Google (the console says so on a vector map): use `marker.addEventListener("gmp-click", ...)` on the `AdvancedMarkerElement` itself, and `marker.content = pinElement`. The event only fires when the marker was built with `gmpClickable: true` — which is also what makes it keyboard reachable. See `src/features/map/hooks/useMap.ts` and `src/features/map/utils/mapHandlers.ts`.
- **Never pass `center`/`zoom` to `<Map>` — they are controlled props.** `@vis.gl/react-google-maps` re-applies `center` and `zoom` on **every render** of the `<Map>` component and snaps the camera back whenever the live map differs from the props (`use-map-camera-params.ts` → `map.moveCamera()`). Every programmatic camera move the app makes — the search result's `panTo` + `setZoom(15)`, the overlay code's `fitBounds` — is silently undone. The symptom is subtle: the search resolves the address and the input fills in, but the map never moves and no marker appears. Use `defaultCenter` / `defaultZoom` instead: the map is then initialised there but not controlled. See `src/features/map/components/Maps.tsx`.
- **The Google Maps Places Autocomplete widget is closed to new customers.** `google.maps.places.Autocomplete` was frozen on March 1, 2025: Google still loads it and still answers its prediction requests, but it no longer renders the suggestion list, so the dropdown stays empty and hidden. Use `AutocompleteSuggestion.fetchAutocompleteSuggestions` (the modern API) and render the list yourself — `src/features/map/hooks/useMapSearch.ts` + `src/features/map/components/MapSearchBox.tsx`. `AutocompleteService` is deprecated the same way. Do not reintroduce `google.maps.places.Autocomplete`.
- **The Google Maps Drawing library is removed upstream.** Google removed the functionality in Maps JS API v3.65.3b (4 June 2026); `new google.maps.drawing.DrawingManager(...)` throws on every version ≥ 3.65. The `/map` feature no longer uses it — drawing is implemented natively in `src/features/map/utils/MapDrawingController.tsx` (see ARCHITECTURE.md §14). Do not reintroduce `google.maps.drawing`.
- **The Maps JavaScript API is loaded exactly once, by `<APIProvider>`, on the first render of `/map`.** The API key and the map ID must therefore be known *synchronously* during that render — reading them in an effect is too late: the script goes out as `…/maps/api/js?key=` (empty) and Google answers with `ApiProjectMapError`. `src/features/map/utils/mapCredentials.ts` is the single resolver for both: the visitor's saved credentials first, the deployment's `VITE_GOOGLE_MAPS_*` values as the fallback. An empty map ID must be passed as `undefined`, never `""` (`mapId=""` makes `AdvancedMarkerElement` throw).
- **The site sends `Cross-Origin-Embedder-Policy: credentialless`, not `require-corp`.** Both give `crossOriginIsolated` (SharedArrayBuffer → FFmpeg/ONNX), but `require-corp` additionally refuses every cross-origin subresource that does not opt in with `Cross-Origin-Resource-Policy` — and Google's `StaticMapService.GetMapImage` does not, which left `/map` with an empty map for every BYOK user with a valid key. Changing the value must land in **both** `vite.config.ts` and `vercel.json` (release gate #1) and be re-verified with the FFmpeg cut smoke test.
- **react-day-picker v10 renamed its CSS classes** (`nav_button` → `button_previous`/`button_next`, `caption` → `month_caption`, `day_today` → `today`, `day_selected` → `selected`). The `*DP` calendar path is currently commented out in `CalendarPage.tsx`.
- **js-yaml v5** uses YAML 1.2 named exports (`import { load as loadYaml } from "js-yaml"`) and parses timestamps as **strings**, not `Date`.

## Auth / network

- **Keycloak**: hardcoded in `src/services/keycloak.ts` (realm `whereq`, client `whereq-ca` on `keytomarvel.com`). Dev proxy in `vite.config.ts` routes `/realms/whereq` to `https://www.keytomarvel.com`. SSO is optional — failure falls back to anonymous mode and the rest of the lab still renders. Lab features do NOT require auth.
- **Three env vars**: `VITE_GA4_MEASUREMENT_ID` (optional, GA4 is a no-op without it) and `VITE_GOOGLE_MAPS_API_KEY` / `VITE_GOOGLE_MAPS_MAP_ID` (the deployment's own Google Maps credentials, used by `/map` only as a *fallback* — a key the visitor saved in the settings panel always wins). All documented in `.env.example`.
- **The bundled Google Maps key is public by design.** Vite inlines every `VITE_*` var into the client bundle, so `VITE_GOOGLE_MAPS_API_KEY` is readable by anyone who opens the site. That is not a leak — the protection is the key's Cloud Console restrictions (API + website/referrer) plus a billing alert. The vars are **build-time**: changing them needs a redeploy.
- **Never commit a Google Maps key.** It only ever arrives through the environment (Vercel project env vars, or a git-ignored local `.env`). The map ID is not a secret, but keep both out of the tree anyway.
- **Bundle warning**: chunk-size warning at ~500 kB is expected (ffmpeg, mathjax, pyodide, gif.js). Don't code-split further; the design intent is "heavy deps in one bundle so multimedia + math work without a network race after first load."

## Known dead code / bugs (non-exhaustive, full list in ARCHITECTURE.md §17)

- `tag/components/workspace/Workspace.tsx` imports `WhereQTagSection` as `FormatConverterSection` (copy-paste bug).
- `utils/logUtil.ts` self-recurses (`log` calls `log`); also gated by `VITE_ENV === "test"` which is never set, so it's a no-op.
- `calendar/` writes the same events to TWO `localStorage` keys (one manual, one via zustand `persist`). The in-memory `events` array is dead code.
- `multimedia/YouTubeCapture.tsx` (738 lines) is fully implemented but hidden in the sidebar and not routed in the workspace (mainland China / corporate firewalls block YouTube).
- `api-executor/ApiExecutor.tsx` imports `axios` but uses `fetch` (dead import).
- Many zero-byte placeholders (`MainLayout.tsx`, `AuthLayout.tsx`, `useWindowSize.ts`, `apiClient.ts`, `middleware.ts`, `rootReducer.ts`, `FormularAnimation.tsx`, `catFactSlice.ts`).

## Deploy (summary; full runbook in docs/ARCHITECTURE.md §19)

- **Release with `bin/release.sh`** — the release entry point, modelled on the other whereq universe apps (chroniq.cc, catobigato.com). It runs the CI gates, commits, squashes, pushes `dev`, merges to `main`, tags, and pushes. **There is no `deploy.sh`**: pushing to `main` IS the deploy.
  ```bash
  bin/release.sh --message "Your release summary"   # from the dev branch
  bin/release.sh --dry-run --message "…"            # preview, changes nothing
  ```
- **CI gates run inside the release script** (they abort the release on failure): COOP/COEP/CORP header parity between `vite.config.ts` and `vercel.json` → `yarn lint` (0 errors) → `tsc --noEmit` for both tsconfigs → `yarn build`.
- **Branches**: `dev` is the working branch (the script requires it), `main` is the deploy branch. Short-lived `feature/*` / `fix/*` branches merge back into `dev`.
- **Tags**: `v<MAJOR>.<MINOR>.<PATCH>` (e.g. `v1.2.0`), derived from the newest release note and bumped minor by default; `--version` / `--major` / `--patch` override. Unlike the sibling apps' 4-segment `vX.Y.Z.N` scheme, whereq.ca uses plain semver to match its release-note filenames.
- **Release notes**: the script scaffolds `docs/releases/v<version>-<codename>-<date>.md` (`--no-notes` to skip, `--status shipped|draft|yanked` to set the front-matter status; default `draft`).
- Push to `main` → Vercel auto-deploys. No manual gate, no staging. PRs get a Vercel preview URL automatically.
- Rollback: Vercel dashboard → Deployments → Promote previous green deployment to Production.
- **Pre-deploy must-do**: run `bin/release.sh`; then smoke-test `yarn build && yarn preview` by Prepare-cutting a video in the multimedia workspace (the COOP/COEP smoke test).
- Release notes live in `docs/releases/v<MAJOR>.<MINOR>.<PATCH>-<codename>-YYYY-MM-DD.md` with YAML front-matter (`version`, `codename`, `date`, `status: shipped|yanked|draft`, `audience: public|internal`). The release script scaffolds the file automatically. The repo's `package.json` version is pinned at `0.0.0` deliberately — no semver discipline there; the version lives in the git tag and the release note.
- **Commit identity**: set repo-locally (`git config --local user.name whereq`). The global config is still `ccbus-cc`, so commits made outside this folder would be attributed to the wrong account. `bin/release.sh` checks this at preflight.