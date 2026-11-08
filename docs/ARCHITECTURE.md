# WhereQ App Hub — Architecture & Detailed Design

> **Repository**: `/home/whereq/git/whereq.ca`
> **Stack**: React 19 + TypeScript 5.8 + Vite 8 + Tailwind CSS 4 + Zustand 5
> **Generated**: code-deep-read of every `.ts` / `.tsx` / `.css` / config file
> under the repo (excluding `node_modules` and `dist`).

This document is the canonical design reference for the codebase. It is written
for both humans onboarding to the project and AI agents (Claude Code CLI in
particular, since the user works with it) that need to navigate the code
without re-reading everything. It is intentionally not a re-narration of what
each file does line-by-line; it is a map of **why** the code is shaped the way
it is, with enough specifics to be actionable.

---

## Table of contents

1. [Big picture — what the app is](#1-big-picture--what-the-app-is)
2. [Top-level structure](#2-top-level-structure)
3. [Boot sequence and runtime tree](#3-boot-sequence-and-runtime-tree)
4. [Routing and pages](#4-routing-and-pages)
5. [The Shell — header, footer, layout](#5-the-shell--header-footer-layout)
6. [Auth — Keycloak wiring](#6-auth--keycloak-wiring)
7. [Design system — MetroUI, Tailwind, dark theme](#7-design-system--metroui-tailwind-dark-theme)
8. [State management conventions](#8-state-management-conventions)
9. [Persistence — localStorage patterns](#9-persistence--localstorage-patterns)
10. [Inter-component messaging — pub/sub](#10-inter-component-messaging--pubsub)
11. [Analytics — GA4](#11-analytics--ga4)
12. [The Multimedia feature group (deep dive)](#12-the-multimedia-feature-group-deep-dive)
13. [The other 14 features (one-paragraph maps)](#13-the-other-14-features-one-paragraph-maps)
14. [Configuration — Vite, Vercel, env, TypeScript, ESLint](#14-configuration--vite-vercel-env-typescript-eslint)
15. [Cross-cutting libraries](#15-cross-cutting-libraries)
16. [Deployment, headers, and the COOP/COEP contract](#16-deployment-headers-and-the-coopcoep-contract)
17. [Known issues, dead code, and tech debt](#17-known-issues-dead-code-and-tech-debt)
18. [Adding a new feature — playbook](#18-adding-a-new-feature--playbook)
19. [Release & Deploy Runbook](#19-release--deploy-runbook)

---

## 1. Big picture — what the app is

**WhereQ App Hub** is a personal developer portfolio / lab by Dazhi Zhang (Tony).
The "lab" is a single SPA that hosts ~15 feature pages, all of which are
in-browser tools (no cloud, no tracking, no auth required for the lab tools).
The public front door is a hand-built marketing page called **WhereQ Universe**
at `/`, which presents the broader WhereQ ecosystem of products
(`whereq.com`, `keytomarvel.com`, `flowdesk.top`, `catobigato.com`, etc.) as
an interactive SVG galaxy.

There is a strong **100% local-features** mandate. The lab is meant to work
entirely client-side: ffmpeg.wasm, ONNX Runtime Web, Pyodide, Google Maps JS
API, and a handful of small in-process services (Pyodide for the Python code
formatter, ONNX for background removal, gif.js + gifuct-js for GIF encoding).
The only outbound network calls are:

- The Keycloak SSO redirect to `keytomarvel.com/realms/whereq` (dev-time only;
  optional)
- The Google Maps JS API (which the user brings their own key for)
- The ffmpeg core WASM as a fallback if the local `public/ffmpeg-core/` copy
  is missing (i.e. production deploys without the local copy)
- A pre-built JS bundle in `public/` for the GA4 init (also env-gated)

Everything else (image conversion, GIF making, video trimming, map drawing,
chemistry tables, math rendering, code formatting) runs in the browser. This
is the project's design north star, and most of the architectural decisions
follow from it.

### The two shells

There are exactly two top-level layouts in the app:

- **Universe** (route `/`): full-bleed marketing page with its own nav, its
  own deep-space background, and no header/footer. Built on
  `universe.css` (scoped under `.wq-universe`).
- **Lab** (every other route): the fixed `Header` + scrollable `<main>` +
  fixed `Footer` shell. The body content is whichever feature page was
  navigated to.

There is **no** `<Route path="*">` 404 fallback wired in, so unknown URLs
will hit the router's default empty state, not the existing `NotFound` page.

### The feature surface

13 feature folders under `src/features/`, mapped 1:1 to routes:

| Folder | Route | Status | What it does |
|---|---|---|---|
| `academy` | `/academy` | stub | placeholder page |
| `api-explorer` | `/api-explorer` | full | Postman-style REST client (uses `api-executor` as a sub-component) |
| `calendar` | `/calendar` | partial | month view with localStorage-persisted events |
| `category` | `/category` | stub | tag-manager skeleton |
| `chemistry` | `/chemistry` | full | interactive periodic table from bundled YAML |
| `map` | `/map` | full | Google Maps with search + drawing + saved overlays |
| `map-gl/` | (unwired) | full | an older `map` implementation, kept for reference |
| `math` | `/math` | full | calculator + formula wiki + canvas math animations |
| `multimedia` | `/multimedia` | full | image/GIF/video tools, ffmpeg.wasm-backed (the flagship) |
| `paws` | `/paws` | stub | cats-and-dogs skeleton |
| `physics` | `/physics` | partial | LaTeX-rendered physical-constants table from bundled YAML |
| `tag` | `/tag` | stub | tag-manager skeleton |
| `tools` | `/tools` | partial | Pyodide-backed Python code formatter (one real sub-tool) |
| `universe` | `/` | full | marketing landing page (the only full-bleed route) |

Plus 5 "top-level pages" in `src/pages/` (mostly marketing / auth):

| Route | Component |
|---|---|
| `/lab` | `pages/home/Home.tsx` |
| `/event-board` | `pages/event-board/EventBoard.tsx` |
| `/about` | `pages/about/About.tsx` |
| `/contact` | `pages/contact/Contact.tsx` |
| `/profile` | `pages/profile/Profile.tsx` |
| `/signin` | `/signup` | auth stubs |

`Home` (at `/lab`) is the launcher for the actual features. `About` is the
bio + project grid. The rest are placeholders or signin/profile shells.

---

## 2. Top-level structure

```
whereq.ca/
├── public/                          ← static assets served as-is
│   ├── ffmpeg-core/                 ← ffmpeg.wasm ESM core + worker
│   │   ├── ffmpeg-core.js
│   │   └── ffmpeg-core.wasm
│   ├── gif.worker.js                ← gif.js's encoder web worker
│   └── logos/                       ← project logos for /about (PNG/SVG)
├── docs/
│   ├── ARCHITECTURE.md              ← this file
│   ├── notes.md
│   └── namesilo.md
├── src/
│   ├── main.tsx                     ← React mount + provider tree
│   ├── App.tsx                      ← initAnalytics + <AppRouter />
│   ├── ErrorBoundary.tsx            ← top-level error boundary (class)
│   ├── App.css                      ← root/main flex
│   ├── index.css                    ← Tailwind + MetroUI design tokens
│   ├── styles/global.css            ← Ace editor + react-simple-code-editor
│   │
│   ├── router/                      ← react-router-dom v7 routes
│   ├── contexts/                    ← AuthContext (split into 3 files)
│   ├── services/                    ← keycloak.ts
│   ├── store/                       ← global Zustand stores
│   ├── lib/                         ← analytics.ts
│   ├── hooks/                       ← useReveal, useScrollSpy, userAuth
│   ├── layouts/                     ← Shell, Header, Footer, PageLayout
│   ├── components/                  ← shared building blocks
│   │   ├── app-card/                ← MetroUI card primitive
│   │   ├── app-launcher/            ← Home page's feature grid
│   │   ├── analytics/               ← RouteChangeTracker
│   │   ├── auth-button/             ← login/logout widget
│   │   ├── datetime-picker/         ← date+time picker
│   │   ├── index-panel/             ← tree-view for endpoints
│   │   ├── lightbox/                ← image lightbox
│   │   ├── map/                     ← legacy map components (unused)
│   │   ├── modals/                  ← CustomModal (react-modal wrapper)
│   │   ├── screen-frame/            ← viewport-respecting card frame
│   │   ├── section/                 ← generic section header
│   │   └── starfield/               ← Universe's animated star backdrop
│   │
│   ├── pages/                       ← top-level page components
│   │   ├── home/Home.tsx
│   │   ├── about/About.tsx          ← bio + project grid
│   │   ├── contact/Contact.tsx
│   │   ├── event-board/EventBoard.tsx
│   │   ├── profile/Profile.tsx
│   │   ├── signin/Signin.tsx
│   │   ├── signup/Signup.tsx
│   │   └── not-found/NotFound.tsx
│   │
│   ├── features/                    ← feature groups (one folder per route)
│   │   ├── academy/                 ← stub
│   │   ├── api-executor/            ← REST client sub-component
│   │   ├── api-explorer/            ← REST client page
│   │   ├── calendar/                ← month view
│   │   ├── category/                ← stub
│   │   ├── chemistry/               ← periodic table
│   │   ├── map/                     ← Google Maps (active)
│   │   ├── map-gl/                  ← Google Maps (legacy, unwired)
│   │   ├── math/                    ← calculator + formulas + canvas anims
│   │   ├── multimedia/              ← the flagship (image/GIF/video)
│   │   ├── paws/                    ← stub
│   │   ├── physics/                 ← physical constants table
│   │   ├── tag/                     ← stub
│   │   ├── tools/                   ← code formatter (Pyodide)
│   │   └── universe/                ← marketing landing page
│   │
│   ├── models/                      ← shared TypeScript types
│   │   ├── AppEvent.ts
│   │   ├── EndpointCategory.ts
│   │   ├── LocalSetting.ts
│   │   ├── NetworkInformation.ts
│   │   ├── ResponseContent.ts
│   │   ├── ResponseCookie.ts
│   │   ├── RestfulEndpoint.ts
│   │   ├── enums/                   ← AppEventEnums.ts
│   │   └── index.d.ts
│   ├── types/                       ← module-augmenting .d.ts files
│   ├── utils/                       ← cross-cutting helpers
│   │   ├── constants.ts
│   │   ├── utils.ts
│   │   ├── eventEmitter.ts          ← tiny pub/sub
│   │   ├── localStorageHelper.ts    ← localStorage wrapper
│   │   ├── localSettingsLoader.ts
│   │   ├── logUtil.ts
│   │   ├── mathJaxSetup.ts          ← MathJax singleton
│   │   ├── MathJaxRenderer.tsx
│   │   ├── schema.ts
│   │   └── helpers.ts
│   └── assets/                      ← fonts, images
├── eslint.config.js
├── index.html
├── package.json
├── tailwind.config.js               ← Tailwind v3 config (mostly dormant)
├── tsconfig.json, tsconfig.app.json, tsconfig.node.json
├── vercel.json                      ← Vercel deploy + COOP/COEP headers
└── vite.config.ts
```

**Key facts**:
- Aliases: `@/*` → `src/*` (set in both `tsconfig.app.json` and `vite.config.ts`)
- No 0-byte "real" files (the empty files are tracked scaffolding; see §17)
- Two Tailwind configs coexist: `tailwind.config.js` (v3-style) and Tailwind v4
  via `@tailwindcss/vite`. The v4 `@theme` block in `src/index.css` is the
  one that actually drives the runtime palette.

---

## 3. Boot sequence and runtime tree

`src/main.tsx` mounts the app in this order, outermost to innermost:

1. **`<StrictMode>`** — double-renders in dev to surface side-effect bugs.
2. **`<ErrorBoundary>`** (`src/ErrorBoundary.tsx`) — class component, logs to
   console, renders a "Something went wrong" fallback. Catches render-phase
   errors only (not promise rejections or event handlers).
3. **`<QueryClientProvider>`** — fresh `new QueryClient()` from TanStack Query
   v5. Currently only one consumer: `api-explorer/public-api/cat-fact`.
4. **`<BrowserRouter>`** — react-router-dom v7.
5. **`<AuthProvider>`** (`src/contexts/AuthContext.tsx`) — provides the
   `useAuth()` hook backed by the Keycloak instance.
6. **`<App />`** — `initAnalytics()` once on mount, then renders `<AppRouter />`.

Side effects at the top of `main.tsx`:
- `window.global = window` — polyfill for libs (Pyodide, ffmpeg) that expect
  Node-style `global`.
- A `window.unhandledrejection` filter that swallows MetaMask-style
  "message channel closed" errors from browser extensions.
- `Modal.setAppElement("#root")` — required by react-modal for a11y.

Three stylesheets are imported in order: `index.css` (Tailwind v4 + MetroUI
tokens), `App.css` (root/main flex), `styles/global.css` (Ace editor + 
react-simple-code-editor overrides).

---

## 4. Routing and pages

All routes are mounted in `src/router/AppRouter.tsx`. There are two top-level
groups:

- **`/`** → `<UniversePage />` (full-bleed, no shell).
- **everything else** → wrapped in `<ShellLayout />`.

Concrete routes:

| Path | Component | Source |
|---|---|---|
| `/` | `features/universe/UniversePage` | `src/router/AppRouter.tsx` |
| `/lab` | `pages/home/Home` | (App Launcher page) |
| `/event-board` | `pages/event-board/EventBoard` | (placeholder) |
| `/about` | `pages/about/About` | (bio + project grid) |
| `/contact` | `pages/contact/Contact` | (placeholder) |
| `/profile` | `pages/profile/Profile` | (placeholder) |
| `/signin` | `pages/signin/Signin` | (placeholder) |
| `/signup` | `pages/signup/Signup` | (placeholder) |
| `/api-explorer` | `features/api-explorer/pages/ApiExplorerPage` | |
| `/map` | `features/map/pages/MapsPage` | (active map) |
| `/tag` | `features/tag/pages/TagPage` | |
| `/calendar` | `features/calendar/pages/CalendarPage` | |
| `/category` | `features/category/pages/CategoryPage` | |
| `/academy` | `features/academy/pages/AcademyPage` | |
| `/math` | `features/math/pages/MathPage` | |
| `/tools` | `features/tools/pages/ToolsPage` | |
| `/physics` | `features/physics/pages/PhysicsPage` | |
| `/chemistry` | `features/chemistry/pages/ChemistryPage` | |
| `/paws` | `features/paws/pages/PawsPage` | |
| `/multimedia` | `features/multimedia/pages/MultimediaPage` | |

Above the `<Routes>`, a `<RouteChangeTracker />` (from
`components/analytics/`) fires a GA4 `page_view` event on every location
change.

### `routes.ts` is dead code

`src/router/routes.ts` exports a `routes` array of `{path, element: lazy}`
records. **It is not imported by anything.** The active router is
`AppRouter.tsx`. `routes.ts` looks like a leftover from a lazy-loading
migration that was abandoned. Treat it as a planning artifact, not a
runtime dependency.

### `NotFound` is unreachable

Because `AppRouter.tsx` has no `<Route path="*">` 404 catch-all, the existing
`src/pages/not-found/NotFound.tsx` component is never rendered in production.
The only reference to it is in `routes.ts` (dead). If you want a 404, add
`<Route path="*" element={<NotFound />} />` as the last child of `<Routes>`.

### The standard feature-page shape

Every feature has the same template:

```
features/<name>/
├── pages/<Name>Page.tsx              ← React Router page
├── components/
│   ├── <Name>.tsx                    ← main feature body
│   ├── sidebar/Sidebar.tsx           ← left-rail with sections + settings
│   ├── sidebar/settings-panel/...    ← modal-style settings drawer
│   └── workspace/                    ← right-rail (Resizable)
│       ├── Workspace.tsx
│       └── <SectionName>Section.tsx  ← per-section content
├── store/<name>Store.ts              ← zustand
├── models/<Name>Enum.ts              ← SectionType + domain enums
├── models/<model>.ts                 ← feature-specific types
├── utils/
│   ├── constants.ts
│   └── (more if needed)
└── resources/                        ← bundled static data (YAML, JSON)
```

Stub features (academy, category, paws, tag) follow this exact template but
the per-section components are 20-line "header with trash button" placeholders
and the main body is a single h1. The shared `SettingPanel` is the same empty
"Pending" placeholder across all of them.

### Mounting a feature

The standard mount path is `<PageLayout>Sidebar | Workspace | <Feature></PageLayout>`.
`PageLayout` (from `src/layouts/PageLayout.tsx`) provides the responsive 
container and global toast/notification plumbing (used by About, Contact,
EventBoard; not by Home, Profile, Signin, Signup).

---

## 5. The Shell — header, footer, layout

### `ShellLayout.tsx`

The lab shell. Renders a `flex flex-col min-h-screen` with:
- `<Header />` (fixed, `h-[3.125rem]` ≈ 50px)
- `<main>` with `flex-grow overflow-y-auto` and inline
  `style={{ height: "calc(100vh - 6.25rem)", marginTop: "3.125rem", marginBottom: "3.125rem" }}`
  so the scrollable area exactly fills the viewport between the two fixed bars
- `<Footer />` (fixed, `h-[3.125rem]`)
- `<Outlet />` inside `<main>`

The 3.125 rem magic number is shared between Header, Footer, and the main
calc. The bars cannot be resized without editing one place. This is a fragile
invariant — be aware if you change bar heights.

### `Header/Header.tsx`

165 lines. Fixed top bar, height 3.125rem, background `#0A0E13`, hairline
border. Left side: an `<h1>` showing a breadcrumb built from `APPLICATION_NAME`
(e.g. `WhereQ Lab -> Map -> My Places`). On mobile, collapses to just the app
name; on `sm+`, shows the full breadcrumb. Right side: icon-only nav (5 items):
1. Globe → `/` (Universe, public).
2. Home → `/lab`.
3. Chalkboard → `/event-board`.
4. (Plus the page-specific breadcrumb logic)
5. Sign In/Up → `/signin`.

### `Footer/Footer.tsx`

Fixed bottom bar. Lists the same external product URLs as the Universe
footer (whereq.com, keytomarvel.com, flowdesk.top, ccbus.cc,
catobigato.com, whereq.github.io, whereq.ca) plus internal links and a
copy-to-clipboard `mailto:` affordance for the contact email.

### `PageLayout.tsx`

The "inner" layout used by the lab feature pages. Renders a responsive
container with optional toast/notification plumbing. The toasts aren't 
actually wired to anything yet — they exist as a hook for future
notifications.

---

## 6. Auth — Keycloak wiring

The user is implementing SSO via Keycloak on `keytomarvel.com`. The
integration is minimal:

- **`src/services/keycloak.ts`** — initializes a `Keycloak` instance with
  the realm URL, client ID, and standard SSO options. Idempotent; safe to
  call multiple times.
- **`src/contexts/AuthContext.tsx`** — provides the React context. The file
  is split into three: `AuthContext.tsx` (provider), `AuthContextInstance.tsx`
  (the `createContext` call), `AuthContextTypes.ts` (the `useAuth()` hook
  + type). This split exists to break a circular import that used to exist
  when AuthContext was a single file.
- **`src/hooks/userAuth.ts`** — convenience wrapper that re-exports `useAuth`.
- **Dev proxy** in `vite.config.ts` proxies `/realms/whereq` to
  `https://www.keytomarvel.com` so the SSO redirect works in dev without
  CORS issues. This is the only network proxy in the entire app.

The lab features themselves **do not require auth** — the SSO is for
account-level features (profile, signin pages) that are currently
placeholders. The Header's `Sign In/Up` button is wired to navigate to
`/signin`, which is itself a placeholder.

---

## 7. Design system — MetroUI, Tailwind, dark theme

The visual language is **MetroUI dark**, mirrored from
[whereq.github.io](https://whereq.github.io/) (the reference codebase
the user maintains). The defining rules:

- **Background**: `#161b27` everywhere (`html`, `body`, `#root`).
- **Accent**: orange `#f5a623` (hover state, borders, links).
- **Text**: warm off-white `#f0e6c8`, with `muted` `#8b949e` and `dim` `#6a737d`.
- **Border**: orange at 12% alpha (idle) → 40% alpha (hover).
- **Corner radius**: xs = 2px (Mantine convention). Ladder: xs 2 / sm 4 /
  md 6 / lg 10.
- **Card style**: `padding: 0.875rem 1.25rem`, semi-transparent
  `rgba(22, 27, 39, 0.8)` background, orange-tinted border, `translateX(4px)`
  on hover.
- **Font**: `Fira Code` (monospace) globally.
- **Scrollbar**: 3px thin, gray-500 thumb, orange on hover.

### How the tokens are wired

`src/index.css` defines an `@theme { ... }` block (Tailwind v4 syntax) that
registers the palette as CSS variables (`--color-metro-bg`, `--color-metro-accent`,
etc.) AND overrides the entire Tailwind `gray` scale so that `bg-gray-900`
resolves to the same `#161b27` as the page background (without this override
you get a visible seam between the body and any gray-900 div inside it).

The utility classes (`.metro-card`, future `.metro-button`, etc.) live in
the same file under the MetroUI section.

### Component primitive: `<AppCard>`

`src/components/app-card/` is the MetroUI card primitive. It accepts a title,
description, icon/logo, href, and disabled/comingSoon flags. Used as the
building block of the `Home` page's feature grid and the `About` page's
project list. The `icon` slot accepts either a React node (for
`react-icons`) or a `logo` string (for raster image URLs); the card
auto-detects which to render.

### Tailwind v3 config + Tailwind v4 plugin — coexistence

`tailwind.config.js` (v3) is in the repo root and looks like a standard v3
config. But the `package.json` uses `@tailwindcss/vite` (v4) and the
`index.css` uses `@theme` (v4 syntax). In practice, the v3 config is
mostly dormant — Tailwind v4 reads its theme from CSS. The v3 config is
kept around in case any tooling (e.g. an IDE plugin) looks for it.

### Custom CSS animations

`src/index.css` defines `@keyframes animate-indeterminate-slide` (a left-to-right
gradient sweep) for indeterminate progress bars. This is the canonical 
pattern when the operation has no determinate progress events (e.g. ffmpeg
stream copy).

---

## 8. State management conventions

The project uses **Zustand 5** exclusively (no Redux, no Context-as-state,
no Recoil/Jotai). Three patterns recur:

### Pattern 1: per-feature Zustand store

```ts
// features/<name>/store/<name>Store.ts
interface FeatureStore {
    isWorkspaceVisible: boolean;
    activeSection: SectionType;
    setActiveSection: (s: SectionType) => void;
    toggleWorkspace: () => void;
}
```

Used by every feature that has a sidebar. The Sidebar reads/writes
`activeSection`; the page body switch-renders based on it.

### Pattern 2: scoped UI store

Single boolean (or small slice) for an in-feature sub-sidebar. Example:
`features/math/store/mathStore.ts` has both `useMathStore` (section + 
workspace) and `useMathAnimationStore` (`isMathAnimationSettingVisible`).

### Pattern 3: multi-store file (heavyweight features)

`features/map/store/mapStore.ts` defines FOUR stores in one file because
the feature is large enough that the slices need to be loaded
independently:
- `useMapStore` — workspace visibility, active section, marker state,
  the persisted `Map` object.
- `usePlaceStore` — the currently selected place from search.
- `useMapToolStore` — hand/draw tool mode.
- `useOverlayStore` — the drawing session state.

### Global stores in `src/store/store.ts`

Three app-wide singletons:

- `useModalStore` — open/close state for the global `CustomModal` and its
  content/type.
- `useNavigationStore` — the breadcrumb path (used by Header to show
  `WhereQ Lab → Map → My Places`). `useToolsStore`'s sidebar pushes
  sub-section names here; `utils.ts` exposes `routeTitles` keyed by route.
- `useAppStore` — global flags (theme, locale, etc. — currently minimal).

The store file is well-commented; the patterns it establishes are reused
by every feature's local store.

### local state for everything else

Component-local state (`useState`, `useReducer`) is used for ephemeral UI:
form values, modal visibility flags, file blobs, video players, etc. The
line is roughly: anything that needs to be shared between components
across the tree → Zustand; anything that lives and dies with one component
→ local state.

### React Query

Only one feature uses it: `api-explorer/public-api/cat-fact` has three
`useQuery` hooks for `catfact.ninja`. Keys are `["catFact"]`,
`["catFacts", page]`, `["catBreeds", page]`. No mutations, no 
optimistic updates, no caching configuration beyond the defaults.

---

## 9. Persistence — localStorage patterns

**Almost everything persists to `localStorage`**, not via React Query or
a database. The single shared helper is `src/utils/localStorageHelper.ts`,
a thin wrapper around `localStorage.getItem`/`setItem` with JSON
serialization.

```ts
// usage pattern across the codebase
LocalStorageHelper.save(KEY, JSON.stringify(value));
const raw = LocalStorageHelper.get(KEY);
const parsed = raw ? JSON.parse(raw) : defaultValue;
```

Some notable patterns:

- **Map data**: `useMapStore` writes the entire `Map` object to a single
  `localStorage["Map-Setting"]` key on every mutation. No partial updates,
  no migration logic. If the schema changes, users lose their saved maps.
- **Calendar events**: there are actually TWO write paths — one through
  `LocalStorageHelper.save(CALENDAR_LOCAL_STORAGE_KEYS.EVENTS, ...)` and
  one through zustand's `persist` middleware writing to
  `localStorage["event-storage"]`. The latter is unintentional; the
  in-memory `events` array is also dead code (the calendar only reads from
  `fetchEvents()` which scans all `localStorage` keys).
- **API Executor params/headers**: persisted to localStorage keyed by URL.
  When the user re-opens the same endpoint, their params/headers are
  rehydrated.
- **API key + Google Map ID**: in `map/components/sidebar/settings-panel/`,
  the key is a `WhereQ-Map-Setting` object; in `api-explorer`, it's
  `GLOBAL_SETTINGS`. The two SettingsPanels are nearly-identical siblings
  (likely a copy-paste).
- **Pyodide cache**: `localStorage` is used as a cache for the Pyodide
  install (`getPyodide()` writes its loaded marker there so a page refresh
  doesn't re-download the WASM).

The pattern is **read-once-on-mount, write-on-every-mutation**, with no
de-duplication. This works because localStorage is sync and the values
are small.

---

## 10. Inter-component messaging — pub/sub

The codebase has TWO parallel pub/sub mechanisms, and they don't share
an abstraction:

1. **`src/utils/eventEmitter.ts`** — a tiny typed pub/sub singleton
   (`emit`, `on`, `off`). Used by the `map` feature for
   `polygon-clicked`, `circle-clicked`, `rectangle-clicked` (drawing tool
   selection updates) and `MAP_WORKSPACE_MY_MAP_CLICK` (workspace → main
   map communication). Internal to `map/`.

2. **`window.dispatchEvent(new CustomEvent(LOCAL_APP_EVENTS))`** — used
   in `AppEvent.ts` / `AppEventEnums.ts` for global cross-feature events
   like `LOCAL_APP_EVENTS.MENU`. Set up via `models/AppEvent.ts` and
   `models/enums/AppEventEnums.ts`.

Neither mechanism has a strict typing contract (events are typed as
`string`); the type safety is provided by convention. New cross-feature
events should pick ONE mechanism and stick with it — the current
duplication is accidental and should be unified eventually.

---

## 11. Analytics — GA4

`src/lib/analytics.ts` initializes Google Analytics 4 via `react-ga4`. The
contract:

- **Env var**: `VITE_GA_MEASUREMENT_ID`. **No-op** if missing (logs a
  warning in prod so the deploy engineer sees the missing ID).
- **Single init** in `App.tsx`'s `useEffect` on mount.
- **Page tracking**: `RouteChangeTracker` (in `components/analytics/`)
  listens to react-router's `useLocation` and fires
  `reactGA4.send({ hitType: "pageview", page: pathname })` on every
  change.

The user's memory note (per the 100% local-features mandate) says
**no third-party tracking servers**. GA4 is acceptable only because the
user can opt out by not setting the env var; the app must be 100%
functional without it. The current implementation honors this — the
`initAnalytics()` call is a no-op if the ID is missing, and
`RouteChangeTracker` checks the init state before sending.

---

## 12. The Multimedia feature group (deep dive)

This is the flagship feature and the most architecturally rich. It is
**the only feature where I (the design doc) go into pipeline detail**.

### 12.1 Topology

```
features/multimedia/
├── pages/MultimediaPage.tsx                ← 16-line page shell
├── store/multimediaStore.ts                ← Zustand: activeSection + isWorkspaceVisible
├── models/MultimediaEnum.ts                ← SectionType (8 values)
├── hooks/useFfmpegEngine.ts                ← module-singleton FFmpeg.wasm + React mirror
├── components/
│   ├── Sidebar.tsx                         ← vertical icon rail
│   ├── Workspace.tsx                       ← pure switch on activeSection
│   ├── BackgroundRemover.tsx               ← ONNX background removal
│   ├── ImageFormatConverter.tsx            ← canvas-based image convert
│   ├── VideoToGif.tsx                      ← video → GIF (no ffmpeg, uses gif.js)
│   ├── GifCompressor.tsx                   ← GIF re-encode (gifuct-js + gif.js)
│   ├── VideoSplitter.tsx                   ← stream-copy trim with custom timeline
│   ├── AudioVideoMerger.tsx                ← H.264/AAC merge with 4 length policies
│   ├── GifMaker.tsx                        ← 3-stage pipeline: Prepare → Convert → Compress
│   └── YouTubeCapture.tsx                  ← MediaRecorder + iframe (HIDDEN in sidebar)
```

### 12.2 Routing model

A single `SectionType` enum drives both the sidebar and the workspace.
The default section is `BACKGROUND_REMOVER`. `YOUTUBE_CAPTURE` is kept
in the enum + store but commented out in both the sidebar and the
workspace, so:

- A stale `localStorage` value of `YOUTUBE_CAPTURE` renders an empty
  workspace (deliberate, not a crash).
- The `YouTubeCapture` component (738 lines) is on disk but not bundled
  into the route tree — its bundle weight is excluded.

The Workspace is a linear `if/else` chain. No `default` branch. If you
add a new section, you must add it in three places: the enum, the
sidebar's `TOOLS` array, and the workspace's switch.

### 12.3 The `useFfmpegEngine` hook — the architectural keystone

`src/features/multimedia/hooks/useFfmpegEngine.ts` (212 lines) is the
most important file in the feature. It solves the hardest problem
in the multimedia group: **how do multiple components share a single
FFmpeg.wasm instance without each one re-downloading the 30 MB core on
mount?**

The design is a **module-level singleton with a React mirror**:

```ts
// module scope (lives forever, shared by all callers)
let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;
const subscribers: Set<(s: "loading" | "loaded" | "error") => void> = new Set();
let currentStatus: "loading" | "loaded" | "error" = "loading";
```

The `useFfmpegEngine()` hook returns `{ ffmpeg, status, progress, error }`.
`ffmpeg` is the **same `ffmpegInstance` reference** — not a ref, not state.
Consumers read it directly. The hook's only React work is mirroring
`currentStatus` into local state via a pub/sub on `subscribers`.

The lifecycle:

1. `useFfmpegEngine()` is called on mount by VideoSplitter, AudioVideoMerger,
   GifMaker (any FFmpeg-using component).
2. `getFfmpegInstance()` returns the existing instance if loaded, or the
   in-flight `loadPromise` if loading, or starts a new load otherwise.
3. `loadEngine()`:
   - Throws if `SharedArrayBuffer` is unavailable (the COOP/COEP requirement
     — see §16).
   - `resolveCoreUrls()`: HEAD-probes `/ffmpeg-core/ffmpeg-core.js`. If 200,
     uses local; otherwise falls back to `https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm`.
   - `toBlobURL` on both the core JS and the WASM (so the worker can `import` them
     under COOP/COEP).
   - `new FFmpeg()` + `inst.on("log", ...)` at `console.debug` level (so it
     doesn't spam the console).
   - `await inst.load({ coreURL, wasmURL })`.
4. On success: `setStatus("loaded")` → all subscribers fire.
5. On error: console.error, setStatus("error"), `loadPromise = null` (so a
   future mount can retry), re-throw.

### 12.4 Per-component progress events

**The progress event is NOT a singleton event.** Each consumer wires
its own `ffmpeg.on("progress", handler)` in a `useEffect`. The 
singleton's progress events are emitted on the shared instance, so
multiple components can listen simultaneously. The leak (no `off()`
in @ffmpeg/ffmpeg 0.12) is acknowledged in the comments and
considered harmless because setState in a defunct component is a no-op.

### 12.5 The pipelines

There are 6 user-facing tools; 5 of them have non-trivial pipelines.
Documented in the order of complexity.

#### 12.5.1 `VideoToGif.tsx` — the simple GIF path

Drag-drop a video → seek through timestamps → draw onto a `<canvas>` →
feed `ImageData` to `gif.js`. **No ffmpeg.**

State machine: `idle → encoding → done | error`. The `ready` status is
in the type but never entered (vestige).

The pipeline:
1. User picks file → `handleFileChosen` → if previous result exists, stash
   in `pendingFileRef` and show warning modal; else `resetForNewVideo`.
2. `resetForNewVideo`: revoke old URLs, create new `videoUrl`, set
   `endTime = min(duration, 5)`.
3. User clicks **Convert to GIF** → `handleEncode`:
   - Loop `seekTo(t)` for `totalFrames = (end-start)*fps`.
   - Draw each frame to canvas, push `ImageData` to an array.
   - `new GIF({ workers: 2, quality: 10, workerScript: "/gif.worker.js" })`.
   - `gif.on("progress", ...)` and `gif.on("finished", ...)` complete the
     flow.
4. Result is `gifUrl` (blob URL); user clicks **Download GIF**.

The "previous result will be lost" warning modal uses
`<CustomModal type="warning" actions={[...]}>`. Three actions:
**Cancel** (keeps everything), **Download previous & continue** (downloads
then loads), **Discard & continue** (loads, revokes old).

#### 12.5.2 `GifCompressor.tsx` — decode + re-encode

Drag-drop a GIF → decode every frame with `gifuct-js` → re-encode with
`gif.js` at smaller scale / fewer frames / lower quality.

The decoded frames live in a `useRef`, not in React state. Comment
explains: "decoded frames can be tens of MB; we never want them in
React state, which would trigger re-renders on every assignment."

State machine: `idle → decoding → encoding → done | error`.

The pipeline:
1. `decodeFile(file)`: `file.arrayBuffer()` → `parseGIF(buf)` →
   `decompressFrames(gif, true)` (cast through `unknown` because the
   gifuct-js types lie). Frames stored in `decodeCacheRef`.
2. User clicks **Compress** → `handleCompress`:
   - For each kept frame (filtered by `frameSkip`): apply
     `disposalType === 2` clear (the only correct way to compose deltas),
     `putImageData` the patch at `(dim.left, dim.top)`, scale down
     via a temp canvas, add frame to gif.js.
3. Result is `compressedUrl`; user downloads.

#### 12.5.3 `VideoSplitter.tsx` — FFmpeg stream copy

The most polished tool UI. Custom timeline with thumbnails + draggable
start/end handles → cut with FFmpeg stream copy (`-c copy`) for
**byte-precise, near-instant trim** (re-muxes without re-encoding,
output quality == input quality, runtime O(file size)).

The timeline is a 3-layer stack: thumbnail strip + scrub rail + handles.
Handles have chevron grips on top and bottom (standard video-editor
affordance). Uses `setPointerCapture` for drag (track outside the
handle). Click on rail scrubs; click on thumbnail jumps to that
timestamp.

Thumbnails: `extractThumbnails(file, duration)` creates an off-screen
`<video>`, seeks through N evenly-spaced timestamps (min 8, max 20
depending on duration), draws to 160px-wide canvas, `toDataURL`.

The pipeline (`handleCut`):
1. `setCutPhase("writing")` → `ffmpeg.writeFile(inputName, await fetchFile(file))`.
2. `setCutPhase("cutting")` → `ffmpeg.exec(["-ss", start, "-i", input, "-to", end-start, "-c", "copy", output])`.
3. `setCutPhase("reading")` → `ffmpeg.readFile(outputName)` → Blob → URL.
4. Delete both virtual-FS files.

`-ss` before `-i` (not after) is the key — input-side seeking is
near-instant because ffmpeg jumps to the nearest keyframe and discards.
Output-side `-ss` would decode everything up to the cut point,
defeating the purpose of stream copy.

`cutPhase` enum + `.animate-indeterminate` is the **only progress
feedback** during a cut, because stream copy produces no progress
events. This is the canonical use case for the indeterminate pattern.

#### 12.5.4 `AudioVideoMerger.tsx` — 4 length-mismatch policies

The most complex FFmpeg filter graph in the codebase. Takes a video
and an audio, merges to H.264/AAC MP4, with FOUR strategies for
length mismatch:

1. **`shortest`** (default): `-map 0:v:0 -map 1:a:0 -shortest`. 
   ffmpeg stops at whichever stream ends first.
2. **`longest`** + known durations: 
   `-filter_complex "[1:a]apad[a];[0:v]tpad=stop_mode=clone:stop_duration=99999[v]" -map [v] -map [a] -t max`.
   `apad` pads audio with silence; `tpad=clone:99999` clones the last
   video frame. The `-t` truncates to the exact target duration.
3. **`trim-to-video`**: `-map 0:v:0 -map 1:a:0 -t videoDuration`.
4. **`trim-to-audio`**: `-map 0:v:0 -map 1:a:0 -t audioDuration`.

Always re-encodes (`-c:v libx264 -preset ultrafast -crf 23 -c:a aac -b:a 192k -pix_fmt yuv420p -movflags +faststart`). 
The reason is documented in the file's giant header: WebM/Opus/MKV
inputs can't be muxed into MP4 via `-c copy` (codec/container
incompatibilities). Re-encoding is the price for portable output.

The pipeline (`handleMerge`):
1. `setMergePhase("writing-video")` → `ffmpeg.writeFile("video" + ext, ...)`.
2. `setMergePhase("writing-audio")` → `ffmpeg.writeFile("audio" + ext, ...)`.
3. `setMergePhase("encoding")` → `ffmpeg.exec(buildArgs(...))`.
4. `setMergePhase("reading")` → `ffmpeg.readFile(outName)` → Blob → URL.
5. Delete 3 virtual-FS files in try/catch.

**Filename safety**: `safeVideoName = "video" + getExt(file.name)`. Strips
non-ASCII from filenames to dodge "Invalid data found when processing
input".

The `inst.exec(args)` cast (`as any`) is because the v0.12 type expects
an `ExecOptions` object, not a bare `string[]`. Inline eslint-disable
explains.

#### 12.5.5 `GifMaker.tsx` — the 3-stage pipeline (flagship)

The newest and most complex tool. Designed as **3 explicit stages** so
the user sees what's happening and the slow GIF encode is always
intentional.

**State machine**:
```
idle → preparing → ready → converting → compressed
                       ↑                  
                       └─── compressing  (reuses "converting" status)
   ↘                       ↘
    error                  error
```

**Why 3 stages**: a single FFmpeg command could go segments → GIF, but
the user would have no preview. Prepare produces an MP4 they can
preview. Only after they're happy with the preview do they commit to
the slow GIF encode.

**The segment list** is the data model. Discriminated union:
```ts
type Segment =
  | { id, kind: "video", file, url, meta: {name, size, duration, w, h},
      trim: {start, end}, filmstrip: string[] }
  | { id, kind: "image", file, url, meta: {name, size, w, h},
      duration: number };
```

The filmstrip is **8 thumbnails** in a JPEG data URL array, generated
on add. The display always shows the filmstrip, with two dark masks
over the parts outside the trim range and a thin orange line at each
trim boundary. Only the **selected** segment shows its full edit
controls (trim sliders for videos, duration slider for images); other
segments are in "compact" mode showing a one-line summary of their
trim/duration. This was a deliberate design choice to keep the list
scannable as the segment count grows.

**Stage 1 — Prepare** (`handlePrepare`):

1. Write all segments to virtual FS: `seg0.mp4`, `seg1.mp4`, … for videos,
   `segN.{png|jpg|...}` for images. The extension is from the original
   filename (ffmpeg sniffs magic bytes, extension is for format detection).
2. Build the `filter_complex`:
   ```ts
   const targetH = Math.max(2, Math.round((maxWidth * 9) / 16 / 2) * 2);
   for each segment:
     if video: argParts.push("-ss", trim.start, "-t", trim.end-trim.start, "-i", name);
              filterParts.push(`[${i}:v]scale=${maxWidth}:${targetH}:
                                force_original_aspect_ratio=decrease,
                                pad=${maxWidth}:${targetH}:(ow-iw)/2:(oh-ih)/2,
                                setsar=1, fps=30, setpts=PTS-STARTPTS[v${i}]`);
     if image: argParts.push("-loop", "1", "-t", duration, "-i", name);
              filterParts.push(`[${i}:v]scale=${maxWidth}:${targetH}:
                                force_original_aspect_ratio=increase,
                                crop=${maxWidth}:${targetH}, setsar=1, fps=30,
                                setpts=PTS-STARTPTS[v${i}]`);
   filterParts.push(`${concatLabels}concat=n=${N}:v=1:a=0[outv]`);
   ```
   **The key fix** (relative to a previous version): normalize ALL inputs
   to the **same** `targetW × targetH` (16:9 by default), using
   `force_original_aspect_ratio=decrease` + `pad` to letterbox/pillarbox
   sources whose aspect doesn't match. The `concat` filter requires
   matching dimensions across inputs; without this normalization,
   mixing 4:3 and 16:9 videos produces a malformed MP4 with `0x0`
   dimensions. The `targetH` is rounded to a multiple of 2 because
   libx264's yuv420p encoder rejects odd heights.

3. Encode H.264/yuv420p MP4, read back, probe duration, create preview URL.

4. **Post-encode validation**: if `v.videoWidth === 0 || v.videoHeight === 0`,
   surface a clear error message and clean up the blob URL. This is a
   defensive check for the broken-concat case described above.

**Stage 2 — Convert** (`handleConvert`):

Same as `VideoToGif`'s pipeline, but the source is the prepared MP4
blob URL. Seeks through `(end - start) * fps` frames, draws to canvas,
feeds gif.js. Result is the unoptimized GIF.

**Stage 3 — Compress** (`handleCompress`):

Same as `GifCompressor`'s pipeline, but the source is the converted GIF
blob URL. Decodes with gifuct-js, applies disposal logic, re-encodes
at lower scale/quality. Result is the compressed GIF.

**The replace-warning modal** is triggered by `handleAddVideo/Image`
(adding a new segment), not by "load new file" (as in the simpler
tools). Its three actions are:
- **Cancel** — keep the current result and the pending file is dropped.
- **Download previous & continue** — download the existing GIF, then
  add the new segment. The old GIF stays on screen AND the new
  segment is added — the user can build multiple GIFs in one session.
- **Discard & continue** — clear the prepared video AND the old GIF
  (since the prepared video was derived from the old segment list,
  leaving it on screen would be confusing when the user clicks
  Convert), then add the new segment.

This is the **only place** in the codebase with a 3-button modal of
this kind, and the asymmetric semantics (Download keeps the old GIF,
Discard clears everything) are documented in the file's giant header.

**Output filenames**: `output.gif` and `compressed.gif`, both
`<a download>` from blob URLs.

### 12.6 The "YouTube Capture" tool (HIDDEN)

`YouTubeCapture.tsx` (738 lines) is a fully-implemented MediaRecorder-
backed YouTube-capture tool that's currently disabled. The reason
(mainland China / corporate firewalls block YouTube, no local-first
fallback) is documented in the file's giant header.

The most interesting technical decisions (all worth keeping when the
tool comes back online):

- **`onLoad` is not a success signal**: Chrome's
  `chrome-error://chromewebdata/` "this site can't be reached" page
  also fires `onLoad`, and we can't read cross-origin iframe content
  to tell them apart. So `iframeLoadStatus` only has `loading | failed`
  (the 8-second timeout flips to `failed` if `onLoad` never fires).
  The Record button is enabled in `loading` — the user verifies
  visually.
- **YouTube reachability pre-check**: a 6-second image load to
  `i.ytimg.com`. `fetch('youtube.com', {mode:'no-cors'})` was tried
  first and rejected — it resolves as soon as the server returns any
  response, even an HTML error body. The image loader is stricter.
- **`skipIframe` toggle**: opt-out from rendering the iframe at all
  to eliminate Chrome's "Unsafe attempt to load..." console warning
  on restricted networks. Recording is a black video (no source frames).
- **The `iframe as unknown as CanvasImageSource` cast**: `HTMLIFrameElement`
  isn't a `CanvasImageSource` per DOM spec, but every browser accepts
  it at runtime. This is the standard way to grab cross-origin iframe
  pixels. Try/catch around `drawImage` because CORS-tainted can throw.

The component's "previous version" history is in the file's giant
header (every meaningful UX decision is documented inline). It's
worth reading if you're working on the multi-state banner pattern.

### 12.7 The `ImageFormatConverter` and `BackgroundRemover` siblings

Two more tools in the feature, simpler than the video tools:

- **`ImageFormatConverter.tsx`** — drag-drop any browser-readable image,
  resize / change format / flatten alpha, download PNG/JPG/WebP. Canvas-
  based, no deps. **The one place in the entire feature that still
  uses `window.alert` for error reporting** (per the memory note "no
  `window.alert/confirm/prompt`" — this slipped through).
- **`BackgroundRemover.tsx`** — drag-drop a JPG/PNG/WebP, runs
  `@imgly/background-removal` (ISNet/U2-Net family on ONNX Runtime
  Web), outputs a PNG with alpha-cleared background. The first run
  downloads a ~10 MB model; subsequent runs are cached. This is the
  reason the **onnxruntime-web subpath aliases** exist in
  `vite.config.ts` (see §16).

### 12.8 Cross-cutting patterns in the multimedia feature

These patterns recur across every tool in the feature and are part
of the feature's design language:

#### The "replace-warning" modal

3-button modal (Cancel / Download previous & continue / Discard & 
continue) shown when a user picks a new file but a previous result
exists. The asymmetry of which button clears what state is tool-specific
but the pattern is consistent. Implemented with `<CustomModal
type="warning" actions={[...]}>` from `src/components/modals/`.

#### Blob URL lifecycle

Every `URL.createObjectURL` is paired with a `URL.revokeObjectURL` in
the relevant cleanup path. Tools use `pendingFileRef` to stash the
incoming file while the modal is open, and the modal's Cancel path
drops it without touching existing URLs.

#### Object URL cleanup on unmount

Each tool that holds URLs has an unmount `useEffect` (with 
`react-hooks/exhaustive-deps` disable + a comment explaining why)
that revokes all of them and clears all timers / rAF handles.

#### Soft-yellow "engine not ready" notice

Every tool that uses `useFfmpegEngine` shows a yellow box at the top
of its body when `ffmpegStatus === "loading"`, with a product-
oriented message (NOT implementation jargon like "SharedArrayBuffer
not available" or "COOP/COEP headers missing"). Per the memory note
about user-visible text.

#### Indeterminate progress feedback

For operations with no determinate progress events (FFmpeg stream copy,
file uploads, model downloads), the tools use a progress bar with
`.animate-indeterminate` (a left-to-right gradient sweep). The
phase-tracking pattern (`cutPhase: "writing" | "cutting" | "reading"`)
gives the user textual feedback alongside the animation.

#### "ready" status is a vestige

The `status: "idle" | "ready" | "cutting" | "done" | "error"` type
appears in several tools but `"ready"` is never actually entered.
Status goes straight from `idle` to the active state. The type
remains for backward compat with stale code.

#### No `window.alert/confirm/prompt`

All tools use `<CustomModal>` for in-app confirmations and warnings.
**One exception**: `ImageFormatConverter` still uses `window.alert` in
its error path. This is a known inconsistency to fix.

---

## 13. The other 14 features (one-paragraph maps)

### `academy/` — stub

Placeholder page that says "Welcome to the Academy Page." No functionality.
Useful as a clean example of the `Page → PageLayout` template when
documenting the boilerplate, but treat as scaffolding.

### `api-executor/` (used by `api-explorer`)

A Postman-style REST client. The request flow:

1. User picks an endpoint in `api-explorer` → `ApiExecutor` mounts with
   that endpoint as a prop.
2. Params/headers are read from `localStorage` (URL-keyed) on endpoint
   change.
3. User edits the URL (with `{name}` path template substitution),
   clicks Send.
4. `sendRequest` in `apiExecutorUtil.ts` builds fetch options (with
   optional proxy URL prefix, optional Bearer auth, optional credentials
   for cookies), executes via native `fetch` (NOT axios despite the
   import), parses `Set-Cookie`, captures all response headers, computes
   response time.
5. Response is rendered in a 3-pane client: request panel
   (URL/Params/Authorization/Headers/Body/Settings/curl tabs),
   response panel (Response/Cookies/Headers tabs with Prism/oneDark
   syntax highlighting), and a drag-resizable vertical split.

State management: local `useState` for everything. No zustand, no
React Query.

The `axios` import is **dead** — `apiExecutorUtil.ts` uses `fetch`,
not `axios`. `react-ace` is declared in `package.json` but unused
in this feature (only `tools/CodeFormatter` uses it).

### `api-explorer/`

The page that hosts `ApiExecutor`. Loads a tree of
`TopCategory → Category → RestfulEndpointGroup → RestfulEndpoint` from
a static resource loader (`loadApiCategoriesLocally()`), shows them in
an `IndexPanel`, and on click flattens the tree to a single
`selectedEndpoint` prop for `ApiExecutor`.

Also has a global Settings panel for proxy configuration. Settings
persisted to `localStorage`.

The ONLY place that uses `@tanstack/react-query` — and only for a
demo sub-feature (`public-api/cat-fact`).

### `calendar/`

Month-grid view. Click a date to see events for the day. Click "Create"
in the left sidebar to open `EventCreationModal` (title, start/end
date+time, all-day, rrule recurrence, description). Recurrence modal
is custom (not RFC 5545 — produces a human string for the rrule field).

State: zustand `useEventStore` with `persist` middleware.
Persistence: writes to both `localStorage["Calendar-Events"]` (manual)
AND `localStorage["event-storage"]` (the `persist` middleware). The
in-memory `events` array is dead code (the calendar only reads from
`fetchEvents()` which scans all `localStorage` keys).

`react-day-picker` is in package.json but unused (the calendar uses
native HTML date inputs).

### `category/`

Stub. Tag-manager skeleton. Same template as `paws`, `tag`, `tools` —
a 12-line `Category.tsx` that displays a static placeholder, a Sidebar
with `My Categories` and `WhereQ Categories` buttons, a Workspace
with `MyCategorySection` and `WhereQCategorySection` (both 20-line
placeholders with trash buttons), and an empty SettingsPanel.

### `chemistry/`

Interactive periodic table. Renders a colored 18-column grid from
element data loaded from a bundled YAML file (`resources/element.yaml`
via Vite's `?raw` import). Each cell uses `CATEGORY_COLOR_MAP[element.category]`
to color the background.

The interactive "hover legend → outline category" effect is local
React state: hovering `ElementGroupLegend` sets `hoveredCategory`,
which is wired back to the table to outline matching cells.

The lanthanides (row 7) and actinides (row 8) are looked up by
`category` + `group` because the atomicNumber pattern doesn't fit the
18-column grid.

`PeriodicTable32` is referenced in a comment but doesn't exist; the
project chose the 18-column variant.

### `map/`

The flagship non-multimedia feature. Full Google Maps application:
search via Places Autocomplete + Geocoder fallback, drawing tools
(marker / polyline / polygon / circle / rectangle), saved places,
saved maps (grouped overlays), recent searches, and a `mapId` for
cloud-styled map.

The architecture is anchored on a single `Map` data object persisted
to `localStorage`. Every action either mutates an overlay inside it
or appends a new one. The data model (`MapOverlay` type) and the
live-map model (`overlayArrayOnMap` of `google.maps.*` instances)
are two separate things; `useOverlayManager.drawOverlays` reconciles
the two.

State: FOUR zustand stores in one file (`useMapStore`, `usePlaceStore`,
`useMapToolStore`, `useOverlayStore`) + the global `useModalStore`/
`useNavigationStore`. Persistence is split between
`localStorage["Map-Setting"]` (the Map object) and
`localStorage["RECENT_SEARCHES"]`.

Inter-component messaging uses the local `eventEmitter` for
`polygon-clicked`, `circle-clicked`, `rectangle-clicked`,
`MAP_WORKSPACE_MY_MAP_CLICK`.

The app deliberately centers on Toronto (`MAP_CENTER = {lat:43.6532,
lng:-79.3832}`) and defaults geocoder lookups to "Ontario, Canada" —
a Canadian-centric app.

### `map-gl/` — unwired legacy

An older, simpler Google Maps implementation that **is not in the
router**. Uses local `useState` for everything, no zustand. The
`MapDrawingOptions.tsx` is `map/`'s predecessor and explicitly
deprecated in JSDoc.

### `math/`

Math playground with three sub-sections:
- **Calculator** — `(0, eval)(display)` for expression evaluation
  (works but a security/code-quality smell).
- **Formula Wiki** — LaTeX-rendered formula reference using MathJax.
  Hard-coded Euler's Formula example.
- **Math Animation** — canvas-drawn 2D visualizations (CubeAreaAnimation,
  CircleAreaAnimation). Uses `mathjs.evaluate("6 * a^2", {a})` for
  arithmetic.

The MathJax setup is in `src/utils/mathJaxSetup.ts` (a module-singleton
that bootstraps a `mathjax-full` document with a `TeX` input jax and
an `SVG` output jax). The same singleton is reused by `physics/`.

### `paws/`

Stub. "Cats and Dogs" branding with `faCat` and `faDog` sidebar icons.
The page only displays "WhereQ Paws" and the active section name.
No real content.

### `physics/`

Reference table for physical constants, rendered from
`resources/constants.yaml` (Vite `?raw` import). The Symbol and
Formula cells use `<MathJaxRenderer>` to render LaTeX. A small
`sanitizeSymbol` pre-processor rewrites `ħ` to `\hbar` so Unicode
doesn't confuse MathJax.

Other sections (`MECHANICS`, `ELECTRICS`, `MAGNETICS`, `THERMODYNAMICS`,
`OPTICS`, etc. — 14 in the enum) are placeholders.

### `tag/`

Stub. Same template as `category` and `paws`. **Bug**: in
`workspace/Workspace.tsx`, the "WhereQ" branch imports
`WhereQTagSection` as `FormatConverterSection` — a copy-paste error
from a `tools/`-to-`tag/` file copy.

### `tools/`

The `CodeFormatter` sub-tool is the only real content. Uses Pyodide
(Python in WASM) to run `black` on user code.

**Pyodide singleton pattern** (in `tools/components/CodeFormatter.tsx`):
module-level `pyodideSingleton` + `pyodideInitPromise` to ensure only
one instance is created even under React StrictMode. Bumps
`setMaxListeners(50)` on stdout/stderr to avoid `MaxListenersExceededWarning`
under StrictMode. Loads from `https://cdn.jsdelivr.net/pyodide/v0.29.3/full/`,
then `micropip.install('black')` and pre-imports `black`.

The UI is a 2-column grid: left `AceEditor` (from `react-ace`, using
Python/Java/Bash/TypeScript/JavaScript modes and the monokai theme),
right read-only `AceEditor` showing the formatted output.

**Important quirk**: `react-ace@14` is published as CJS, and Vite's
CJS→ESM transform makes `import X from "react-ace"` return the whole
`module.exports` object rather than the component. The actual
component is `mod.default.default` (two levels deep), so the import is
unwrapped manually. The file's giant comment explains the dance.

Two alternate formatters (`PythonCodeFormatter.tsx` and
`PythonCodeFormatterTA.tsx`) point at a self-hosted Pyodide path
that's likely broken. They're not wired in.

The `Sidebar` in this feature is the only one that calls
`useNavigationStore.setPath` (to push section names into the global
breadcrumb).

### `universe/`

The marketing landing page at `/`. The only feature rendered
**outside** the `ShellLayout`. Built as a self-contained marketing site
for the WhereQ ecosystem (whereq.com, keytomarvel.com, chroniq.cc,
flowdesk.top, ccbus.cc, catobigato.com).

The interactive SVG galaxy is hand-built (no 3rd-party SVG library).
Each planet is a `<g role="button" tabIndex={0}>` with a halo circle,
body circle (radial gradient), optional "coming soon" ring, and
labels. The dependency edges are quadratic Bézier curves toward the
center so lines don't overlap planets.

All planet data lives in one constant `UNIVERSE` at
`data/universe.ts`; adding a new planet is a one-file change.

The page intentionally changes `html.style.scrollBehavior` and
`document.body.style.backgroundColor` on mount, and restores them in
the cleanup.

### `pages/about/About.tsx` — the bio + project grid

The "PROJECTS" grid is the one place where external products are
listed. Currently:

- **WhereQ Lab** — `https://www.whereq.ca` (this app).
- **WhereQ — LLM** — `https://www.whereq.cc` (disabled, coming soon).
- **Key To Marvel** — `https://www.keytomarvel.com` (`BsYinYang` icon).
- **FlowDesk** — `https://www.flowdesk.top` (logo: `/logos/flowdesk.svg`).
- **whereq** — `https://www.whereq.com` (logo: `/logos/whereq-com.svg`).
- **CatoBigato** — `https://www.catobigato.com` (logo:
  `/logos/catobigato.png`).

`Project` type: `{name, description, url, icon?: ReactNode, logo?: string, disabled?, comingSoon?}`.
The render auto-detects which to use (icon node vs image src).

---

## 14. Configuration — Vite, Vercel, env, TypeScript, ESLint

### `vite.config.ts`

The single most important config file. Key settings:

- **Plugins**: `react()`, `tailwindcss()` (v4 via `@tailwindcss/vite`),
  `svgr()` (for SVG-as-React-component imports).
- **Alias**: `@` → `/src` (matches `tsconfig.app.json`).
- **onnxruntime-web subpath aliases** (only for `@imgly/background-removal`):
  ```
  "onnxruntime-web/webgpu": "onnxruntime-web",
  "onnxruntime-web/cpu":     "onnxruntime-web",
  ```
  These are because the subpaths don't exist in the package's
  `exports` field. The aliases map to the default entry, which
  auto-detects WASM/WebGL at runtime.
- **`assetsInclude: ["**/*.svg"]`** — ensures SVGs are treated as assets.
- **`optimizeDeps.include`**: `mathjax-full`, `onnxruntime-web`,
  `onnxruntime-web/webgl`. Pre-bundles these for faster dev startup.
- **`server.headers`**: COOP/COEP/CORP headers required for
  `SharedArrayBuffer` (FFmpeg.wasm, ONNX). **Mirrored in
  `vercel.json` for production** — see §16.
- **`server.proxy`**: `/realms/whereq` → `https://www.keytomarvel.com`
  for Keycloak SSO in dev.
- **`preview.headers`**: same COOP/COEP/CORP for `vite preview` so
  smoke-testing before deploy works.
- **`worker.format: "es"`**: required for Vite to bundle web workers
  as ESM. The ffmpeg.wasm core worker is ESM-only.
- **`build.rollupOptions.external`**: `onnxruntime-web/webgpu` and
  `onnxruntime-web/webgl`. The library does a dynamic import of
  `onnxruntime-web/webgpu` for WebGPU acceleration; we mark it external
  so the production bundler doesn't try to resolve it (the WASM
  fallback works without it).
- **`build.chunkSizeWarningLimit`** is hit (~500 kB) by gif.js,
  gifuct-js, ffmpeg.wasm, and Pyodide. This is expected and OK.

### `vercel.json`

Vercel deploy config. The `headers` block **must mirror the COOP/COEP/CORP
headers in `vite.config.ts`**, or FFmpeg.wasm silently fails to load in
production. The Vercel config also sets:
- `cleanUrls: true`
- SPA rewrites (all routes → `/index.html`)

The dev note in `vite.config.ts` is explicit: "**In production, hosting
(Vercel) must send the same headers. The Vercel deploy config is at
the project root: `/vercel.json` — its `headers` block must stay in sync
with these three values, or the cut/merge/etc. features that need
SharedArrayBuffer will silently fail to load the video engine in
production.**"

### `.env.example`

Single env var:
- `VITE_GA_MEASUREMENT_ID` — optional Google Analytics 4 measurement
  ID. If unset, `initAnalytics()` is a no-op (the app is 100%
  functional without it).

No other env vars. The lab is intended to work without configuration.

### `tsconfig.app.json`

- **Target**: `ES2020`
- **Lib**: `ES2020`, `DOM`, `DOM.Iterable`
- **Module**: `ESNext`
- **Module resolution**: `bundler`
- **JSX**: `react-jsx`
- **Strict**: full (`strict`, `noUnusedLocals`, `noUnusedParameters`,
  `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`)
- **Path alias**: `@/*` → `src/*`

### `eslint.config.js`

Flat config (ESLint 10 + `typescript-eslint` 8 + `eslint-plugin-react` 7 +
`eslint-plugin-jsx-a11y` 6 + `eslint-plugin-react-hooks` 7 +
`eslint-plugin-react-refresh` 0.5 + Prettier). The most important
rule is `@typescript-eslint/no-explicit-any`, which is why the
`as any` casts in `AudioVideoMerger.handleMerge` carry inline
`eslint-disable-next-line` comments.

### `package.json` — notable deps

- `react@19.2.5` + `react-dom@19.2.5`
- `@ffmpeg/ffmpeg@0.12.15` + `@ffmpeg/util@0.12.2` (FFmpeg.wasm)
- `gif.js@0.2.0` (no TS types — `// @ts-expect-error` everywhere)
- `gifuct-js@2.1.2` (no first-class types)
- `@imgly/background-removal@1.5.8` (uses onnxruntime-web internally)
- `zustand@5.0.12`
- `@tanstack/react-query@5.99.0` (only used in one place)
- `@vis.gl/react-google-maps@1.8.3` + `@types/googlemaps@3.43.3`
- `pyodide@0.29.3`
- `mathjax` + `mathjax-full@3.2.2`
- `keycloak-js@26.2.3` + `@types/keycloak-js@3.4.1`
- `react-modal@3.16.3` + `@types/react-modal@3.16.3`
- `prismjs@1.30.0` + `@types/prismjs@1.26.5` +
  `react-syntax-highlighter@16.1.1` +
  `@types/react-syntax-highlighter@15.5.13`
- `ace-builds@1.43.6` + `react-ace@14.0.1`
- `js-yaml@4.1.0` + `@types/js-yaml@4.0.9`
- `dayjs@1.11.20` + `react-day-picker@9.14.0` (the latter is unused)
- `re-resizable@6.11.2`
- `clsx@2.1.1`
- `zod@4.3.6` (declared but not heavily used)
- `uuid@13.0.0`
- `react-ga4@3.0.1`
- `react-icons@5.6.0`
- `react-markdown@10.1.0` + `remark-gfm@4.0.1` + `remark@15.0.1` +
  `rehype-raw@7.0.0` + `rehype@13.0.2`
- `@fortawesome/react-fontawesome@3.3.0` + `fontawesome-svg-core@7.2.0` +
  `free-solid-svg-icons@7.2.0`
- `@fontsource/fira-code@5.2.7`
- `react-router-dom@7.14.1`

Build deps: `@vitejs/plugin-react@4.4.1`, `vite@8.0.8`, `vite-plugin-svgr@4.3.0`,
`tailwindcss@4.2.2`, `@tailwindcss/vite@4.2.2`, `postcss@8.5.10`,
`autoprefixer@10.5.0`, `typescript@5.8.2`.

---

## 15. Cross-cutting libraries

### `CustomModal` — the universal dialog

`src/components/modals/CustomModal.tsx` is a `react-modal` wrapper
with a typed `type: "info" | "success" | "warning" | "error"` and
a structured `actions: CustomModalAction[]` API for 3+ button flows.
The canonical use case is the 3-button "Cancel / Discard & continue /
Download previous" modal used in VideoToGif, GifCompressor, GifMaker,
and VideoSplitter.

### `eventEmitter` — the typed pub/sub

`src/utils/eventEmitter.ts` exposes `emit`, `on`, `off` for cross-
component messaging. Used by `map/` for drawing-tool selection
updates. The typing is `string`-based, not strongly-typed event names
— type safety is by convention.

### `LocalStorageHelper` — the JSON wrapper

`src/utils/localStorageHelper.ts` is a thin wrapper around
`localStorage.getItem` / `setItem` with JSON serialization and
defensive parsing. Used everywhere for persistence.

### `MathJaxRenderer` + `mathJaxSetup` — the LaTeX singleton

`src/utils/mathJaxSetup.ts` bootstraps a single `mathjax-full`
document with a `TeX` input jax and an `SVG` output jax. `MathJaxRenderer.tsx`
is a React component that calls `renderFormula` on mount and injects
the result via `innerHTML`. Reused by `math/` and `physics/`.

### `Modal.setAppElement` — a11y for react-modal

Called in `main.tsx` with `"#root"`. Required for screen-reader
support.

### `useReveal` + `useScrollSpy` — scroll observers

Custom hooks in `src/hooks/`. `useReveal` adds a `data-reveal`
attribute via IntersectionObserver to trigger CSS fade-ins. Used by
`universe/`. `useScrollSpy` tracks the active section id and applies
an `is-active` class. Used by `universe/UniverseNav`.

---

## 16. Deployment, headers, and the COOP/COEP contract

The COOP/COEP/CORP headers are **the most load-bearing piece of
configuration in the entire app**. Without them, FFmpeg.wasm and
ONNX Runtime Web can't use `SharedArrayBuffer` and silently fail to
load. The full chain:

1. **Browser**: cross-origin-isolated context requires
   `Cross-Origin-Opener-Policy: same-origin` AND
   `Cross-Origin-Embedder-Policy: require-corp`.
2. **Vite dev server** (`vite.config.ts`): sets these in
   `server.headers` (dev mode) and `preview.headers` (`vite preview`).
3. **Vercel prod** (`vercel.json`): sets these in the `headers` block.
4. **Cross-Origin-Resource-Policy: cross-origin** is also set so
   embedded assets (like `<img>` from the period table icons) can be
   loaded cross-origin.

**The invariant**: if any one of these three headers is missing or
mismatched, the ffmpeg.wasm and onnxruntime-web libraries fail to
load. There is no useful error message; they just don't initialize.
The dev note in `vite.config.ts` is explicit about this. **If you
change one, you must change all three.**

The `useFfmpegEngine` hook has a guard that throws if
`SharedArrayBuffer` is undefined or `window.crossOriginIsolated` is
false. The error message points the user at the COOP/COEP requirement.

---

## 17. Known issues, dead code, and tech debt

These are the things that the doc writer noticed during a deep read
that the user should be aware of:

### Dead code

- `src/router/routes.ts` is a leftover/alternate router config with
  lazy-loaded routes. **Not imported by anything.** The active
  router is `AppRouter.tsx`.
- `src/pages/not-found/NotFound.tsx` exists but is never rendered
  (no `<Route path="*">` in `AppRouter.tsx`).
- `src/components/map/` directory is empty (the `map/` feature is in
  `features/`, not `components/`).
- `src/layouts/MainLayout.tsx`, `src/layouts/AuthLayout.tsx` — 0 bytes.
- `src/hooks/useWindowSize.ts` — 0 bytes.
- `src/services/apiClient.ts`, `src/services/requestInterceptors.ts` —
  0 bytes.
- `src/store/middleware.ts`, `src/store/rootReducer.ts` — 0 bytes.
- `tools/components/PythonCodeFormatter.tsx` and `PythonCodeFormatterTA.tsx`
  are 177/138 lines each, point at a self-hosted Pyodide path that's
  likely broken. Not wired in.
- `map/components/MapDrawingOptions.tsx` is explicitly marked
  deprecated in JSDoc ("All of the features have been moved to the
  MapTools component").
- `map/utils/useMapInitialization.ts` runs `loadMapObjectFromLocalStorage()`
  on mount and throws away the result — no-op.
- `map-gl/` is the older `map/` implementation, not in the router.
- `map/utils/mapListeners.ts` — most of the body is commented out.
- `multimedia/components/YouTubeCapture.tsx` is fully implemented but
  hidden in the sidebar and not routed in the workspace.
- `multimedia/components/ImageFormatConverter.tsx` uses
  `window.alert` for error reporting — the one place in the
  multimedia feature that violates the "no `window.alert`" rule.
- `api-explorer/public-api/cat-fact/store/catFactSlice.ts` is an
  empty file.
- `math/components/animation/FormularAnimation.tsx` is 0 bytes.
- `api-executor/ApiExecutor.tsx` imports `axios` but the actual
  HTTP call uses `fetch`. The import is dead.
- `api-executor/response-panel/network-information-modal/` —
  `showGlobeIcon = false` in the current code (dead path).
- `multimedia/components/ImageFormatConverter.tsx` AND
  `multimedia/components/VideoSplitter.tsx` AND others have a
  `status: "ready"` enum value that's never actually entered.

### Bugs

- `tag/components/workspace/Workspace.tsx` imports
  `WhereQTagSection` as `FormatConverterSection` — copy-paste error
  from a `tools/`-to-`tag/` file copy.
- `utils/logUtil.ts` has a self-recursion bug: `log` calls itself
  instead of `console.log`. And it's gated by
  `VITE_ENV === "test"`, which is never set, so it's a no-op.
- `calendar/store/calendarStore.ts` writes the same event to BOTH
  `localStorage["Calendar-Events"]` (manual) AND
  `localStorage["event-storage"]` (the zustand `persist`
  middleware). The in-memory `events` array is also dead.
- `api-executor/response-panel/CurlTab/CurlTab.tsx` reads the
  persisted value from `LocalStorageHelper` rather than the live
  local `useState`, so what you see is the persisted value, not the
  current edit.
- `map/components/MarkerOverlayModal.tsx` has a hard cap of 37
  characters for text marker content but no user-visible warning when
  the cap is exceeded.
- `multimedia/components/ImageFormatConverter.tsx` auto-flattens to
  white when exporting to JPEG regardless of the user's
  `flattenOnExport` toggle, but the UI only shows the picker when
  the toggle is on. The auto-flatten is silent.

### Duplicated boilerplate

These would be obvious refactoring candidates:

- The empty `"Pending"` placeholder `SettingPanel` is duplicated in
  6+ stub features.
- The "Section + header with trash button" panel placeholder appears
  in 15+ files across the stubs.
- The "API Key / Google Map ID" settings panel is duplicated almost
  verbatim between `map/` and `map-gl/`.
- The "Sidebar + Workspace + SettingsPanel" boilerplate is shared
  by ~7 features (api-explorer, calendar, category, math, paws,
  physics, tag, tools) with only the SectionType enum and icons
  differing.

### Two parallel pub/sub patterns

- `src/utils/eventEmitter.ts` (typed singleton, used by `map/`).
- `window.dispatchEvent(new CustomEvent(LOCAL_APP_EVENTS))` (DOM
  events, used by `AppEvent.ts`).

These should be unified eventually.

### Tailwind v3 config + v4 plugin coexistence

`tailwind.config.js` (v3-style) is in the repo root. The actual
runtime is Tailwind v4 via `@tailwindcss/vite` and the `@theme` block
in `src/index.css`. The v3 config is dormant but kept around in case
any tooling looks for it.

---

## 18. Adding a new feature — playbook

The codebase has a strong template for adding a new feature. Follow
these steps:

### 1. Folder structure

Create `src/features/<name>/` with the standard sub-folders:
```
features/<name>/
├── pages/<Name>Page.tsx
├── components/
│   ├── <Name>.tsx
│   ├── sidebar/Sidebar.tsx
│   ├── sidebar/settings-panel/SettingsPanel.tsx
│   └── workspace/
│       ├── Workspace.tsx
│       └── <SectionName>Section.tsx
├── store/<name>Store.ts
├── models/<Name>Enum.ts
└── utils/constants.ts
```

### 2. Models

In `models/<Name>Enum.ts`, define:
```ts
export enum SectionType {
    SECTION_A = "Section A",
    SECTION_B = "Section B",
}
```
The string values are the human labels (no separate ID layer). Both
sidebar and workspace use `SectionType.X` strings directly.

### 3. Store

In `store/<name>Store.ts`:
```ts
import { create } from "zustand";

interface FeatureStore {
    isWorkspaceVisible: boolean;
    activeSection: SectionType;
    setActiveSection: (s: SectionType) => void;
    toggleWorkspace: () => void;
}

export const useFeatureStore = create<FeatureStore>((set) => ({
    isWorkspaceVisible: true,
    activeSection: SectionType.SECTION_A,
    setActiveSection: (s) => set({ activeSection: s }),
    toggleWorkspace: () => set((s) => ({ isWorkspaceVisible: !s.isWorkspaceVisible })),
}));
```

### 4. Page

In `pages/<Name>Page.tsx`:
```tsx
import PageLayout from "@/layouts/PageLayout";
import Sidebar from "../components/sidebar/Sidebar";
import Workspace from "../components/workspace/Workspace";
import Feature from "../components/Feature";

const NamePage = () => (
    <PageLayout>
        <div className="flex h-full">
            <Sidebar />
            <Workspace />
            <main className="flex-1">
                <Feature />
            </main>
        </div>
    </PageLayout>
);
export default NamePage;
```

### 5. Sidebar

In `components/sidebar/Sidebar.tsx`, follow the `handleSectionToggle`
pattern that all the existing sidebars use:
```tsx
const handleSectionToggle = (section: SectionType) => {
    if (activeSection === section && isWorkspaceVisible) {
        setWorkspaceVisible(false);  // toggle off if same
    } else {
        setActiveSection(section);
        setWorkspaceVisible(true);
    }
};
```

Use MetroUI card styles (border-radius `--radius-metro-xs` = 2px,
orange `#f5a623` accent). Icons from FontAwesome (preferred for
lab features) or `react-icons` (used in physics, chemistry, about).

### 6. Workspace

In `components/workspace/Workspace.tsx`, use `re-resizable` for the
right-rail:
```tsx
import { Resizable } from "re-resizable";
```
The `<Resizable>` panel conditionally renders one of the
`*Section` components based on `activeSection`.

### 7. Router

Add the route in `src/router/AppRouter.tsx`:
```tsx
import NamePage from "@/features/<name>/pages/<Name>Page";
// ...
<Route path="/<name>" element={<NamePage />} />
```
inside the `<Route element={<ShellLayout />}>` wrapper.

### 8. About page

If the new feature is a public-facing tool, add it to
`src/pages/about/About.tsx`'s `projects` array. Get the project's
real assets (logo, description, URL) from its reference codebase if
available; do not paraphrase.

### 9. Add the `useNavigationStore` breadcrumb entry

If the route is part of the lab, add it to `utils.ts`'s `routeTitles`
map (if the breadcrumb should show the route name) and update the
`useToolsStore` `Sub_Module_Path` if it has sub-sections.

### 10. Local settings (if needed)

If the feature has user-tunable settings, add them via the
`LocalSettings` and `GlobalSettings` types in
`src/models/LocalSetting.ts`. Settings persist to `localStorage` via
`LocalStorageHelper.save`.

### 11. Test

- `yarn dev` — manual smoke test.
- `yarn build` — production build (will fail on type errors and on
  chunk size warnings if your new feature is heavy).
- `yarn lint` — must be 0 errors (24 warnings is the current baseline
  and is acceptable).

### 12. Update this document

Add a one-paragraph map to §13 and (if applicable) a deep-dive
section to §12. Update the routing table in §4.

---

## Appendix A — the `MEMORY` and `USER` notes (authoritative)

The persistent memory of the user is part of the design contract.
These are the load-bearing facts (from MEMORY.md and USER.md):

- **Reference codebases are spec, not inspiration.** When the user
  provides a codebase path or URL, open the reference files BEFORE
  designing. Style, structure, asset values are the ground truth.
  Pattern recurs: `whereq.github.io-docusaurus`, `flowdesk.top`,
  `keytomarvel.com`, `whereq.com`, `catobigato.com`. The
  `design-system-porting` skill captures this workflow.

- **User prefers 100% local features** (no third-party servers, no
  CORS proxies on remote infra) even when it costs functional
  fidelity. `vite.config.ts` server headers (COOP/COEP/CORP) MUST
  be mirrored in `vercel.json` for Vercel deploys.

- **User-visible text in features should be jargon-free and
  product-oriented**, not implementation-oriented. Implementation
  details (library names, byte sizes, error stack traces, COOP/COEP
  headers) belong in `// code comments`, not in JSX `<p>`/`<div>`/
  `<span>` text.

- **No `window.alert/confirm/prompt` for in-app UX.** Use
  `src/components/modals/CustomModal.tsx` (a `react-modal` wrapper
  with `info / success / warning / error` types and a
  `actions: CustomModalAction[]` API for 3+ button flows) instead.
  For media tools that produce a downloadable artifact, always warn
  before discarding a previous successful result (three-button modal:
  Cancel / Discard & continue / Download previous). Stash the new
  file in a `useRef<PendingFile>` while the modal is open. Reference:
  `src/features/multimedia/components/VideoToGif.tsx`.

- **For long-running async operations, the user values visible
  sub-phase feedback over an inert progress bar.** Pattern: track a
  `phase` state machine ("writing" → "cutting" → "reading") with an
  indeterminate animation when no determinate progress is available.
  Canonical example: `cutPhase` in `VideoSplitter.tsx`.

- **For sizable feature requests, present a concise design +
  trade-offs + ask for go-ahead via `clarify` BEFORE building.**
  "Considering a new feature" = "think about it", not "build it now".
  When a literal user instruction conflicts with an established
  codebase pattern, surface the conflict via `clarify` with options
  before acting on either side.

- **Reference codebases for design work**: the canonical reference
  for the visual design is `whereq.github.io-docusaurus` and the
  design-system-porting skill. URL is `https://whereq.github.io/`.
  The other "spec" codebases (real assets, real copy) are
  `flowdesk.top`, `keytomarvel.com`, `whereq.com`, `catobigato.com`.

- **For "WeChat screenshot" messages**: when the user sends a
  Windows path like `C:\Users\googo\xwechat_files\wxid_<id>\temp\
  InputTemp\<uuid>.png`, that's WeChat's file-transfer temp folder
  — a screenshot of the current bug. Translate to
  `/mnt/c/Users/googo/xwechat_files/...`. The AI can't view images
  directly, so diagnose from the code + the user's text description.

- **"Keep the existing implementation, no code changes" takes
  precedence over canonical patterns.** Example: chose "keep
  react-ga4, just set the env var" over pasting the Google-
  provided gtag.js snippet. Respect existing work over canonical
  patterns.

---

## 19. Release & Deploy Runbook

This is the step-by-step procedure for cutting a release of WhereQ
App Hub and shipping it to production. Section 16 above covers the
single most load-bearing config invariant (COOP/COEP); this section
covers the *process*.

### 19.1 Environments

| Environment | URL | What it runs |
|-------------|-----|--------------|
| Local dev | `http://localhost:5173` | `yarn dev` — Vite dev server with HMR. Same COOP/COEP headers as prod. |
| Local prod preview | `http://localhost:4173` | `yarn build && yarn preview` — Vite's preview of the production build. **Use this to smoke-test before deploy** — it serves `dist/` with the same headers as Vercel. |
| Production | `https://www.whereq.ca` (Vercel alias: `whereq-app-hub.vercel.app`) | Vercel auto-deploys from `main` branch on push. |

There is **no staging environment** and **no manual deploy gate**.
Pushing to `main` is the deploy. Vercel preview deployments are
created automatically for every PR; use the PR preview URL for
review before merging.

### 19.2 The 4 npm scripts

The full toolchain is four scripts (from `package.json`):

```bash
yarn dev      # vite — dev server on :5173 with HMR
yarn build    # vite build — production bundle to ./dist/
yarn preview  # vite preview — serves ./dist/ on :4173 with prod headers
yarn lint     # eslint . — must be 0 errors before any commit
```

There is **no `yarn test`** — the `package.json` lists
`@testing-library/react` and friends in `devDependencies` but no
test runner is configured. Manual smoke tests are the QA strategy.
See §19.6 below.

### 19.3 Build artifacts

`yarn build` outputs to `dist/`. The current full build is ~66 MB,
dominated by:

- `assets/chunk-*.js` — split bundles (heavy: FFmpeg core, MathJax,
  ONNX Runtime, Pyodide, CodeMirror, etc.)
- `assets/fira-code-*.woff2` — web fonts
- `ffmpeg-core/` — ffmpeg.wasm core + worker (lazy-loaded only when
  a multimedia tool is opened, ~30 MB)
- `gif.worker.js` — the gif.js web worker
- `images/`, `logos/` — static assets
- `silent-check-sso.html` — Keycloak auth callback page

The bundle warning `Adjust chunk size limit for this warning via
build.chunkSizeWarningLimit` is **expected and not an error**. The
intentional decision is: don't code-split further, ship the heavy
deps (ffmpeg, mathjax) in one bundle so the multimedia + math
features work without a network race after first load. See §17
(Known issues) for why this is acceptable.

### 19.4 Environment variables

Only **one** runtime env var matters:

| Var | Required in prod? | Where to set |
|-----|-------------------|--------------|
| `VITE_GA4_MEASUREMENT_ID` | Optional (analytics is no-op without it) | Vercel env vars (Production only) |
| `VITE_ENV` | No — used to gate `utils/logUtil.ts`'s `log()` recursion bug | Never set it |

**The `.env.example` file documents the GA4 setup.** Vite only
exposes env vars prefixed `VITE_` to the client bundle, so the GA
"measurement ID" (a public identifier) is safe to commit in
`.env.example`. Vercel project settings is the place to set it for
production — see §11 (Analytics) above for the full flow.

**The `Keycloak` client config is hardcoded** in
`src/auth/keycloak.ts`. If you need to point at a different
Keycloak realm for staging/prod, edit that file directly — there's
no env-var abstraction yet (see §17 known issues).

### 19.5 The pre-deploy checklist

Before every deploy, run these locally and confirm:

```bash
# 0. (Preferred) run the whole thing — the release script automates
#    steps 1, 2 and 4, then commits, tags and pushes. Pushing to main
#    IS the deploy (Vercel auto-deploy). See §19.7.
bin/release.sh --message "Your release summary"

# 1. Lint must be clean (0 errors; warnings OK if at baseline).
yarn lint
#   → expected: "✖ 24 problems (0 errors, 24 warnings)" or fewer.

# 2. TypeScript build must succeed.
yarn build
#   → expected: "✓ built in <N>s"
#   → the "Adjust chunk size limit" line is NOT a failure.
#
# 2b. Type-check must be clean. `yarn build` is plain `vite build` and
#     does NOT type-check, so this has to run separately:
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
#   → expected: no output, exit code 0.

# 3. (Manual) smoke-test the production build locally.
yarn build && yarn preview
#   → open http://localhost:4173
#   → walk through: load /, click each major route in the sidebar,
#     open the multimedia workspace, click Prepare on a sample video
#     to verify ffmpeg.wasm loads (this is the COOP/COEP smoke test
#     — see §16). If the engine fails to load, the headers are
#     broken. Stop here.

# 4. (Manual) confirm vercel.json still mirrors vite.config.ts.
git diff HEAD~1 -- vite.config.ts vercel.json
#   → the three COOP/COEP/CORP values must be identical between
#     the two files. If they diverge, the prod build will fail in
#     a way no one notices until users complain. See §16.
#   → bin/release.sh automates this check.

# 5. (Manual) update docs/releases/ if the release is user-visible.
#   → see §19.7 below for the release-notes format.
#   → bin/release.sh scaffolds the release note automatically.
```

### 19.6 Manual smoke tests (no automated test suite)

The `yarn build` + `yarn preview` flow above is the primary QA.
Beyond that, before each release:

1. **COOP/COEP smoke test** — open the multimedia workspace, add a
   short video, click Prepare. If FFmpeg loads and the prepare
   preview appears, headers are good. If the engine throws
   `SharedArrayBuffer is not defined` or just silently doesn't
   load, headers are broken — check §16.
2. **ONNX Runtime smoke test** — open any feature that uses
   `@imgly/background-removal` (the image background-removal
   tool). If the WASM model loads, the bundled WASM files are
   wired correctly. If it stalls, check `optimizeDeps.include` in
   `vite.config.ts`.
3. **Keycloak SSO** — sign in once. `silent-check-sso.html` must
   be served at `/silent-check-sso.html` (it is — see the `dist/`
   listing above).
4. **Universe landing page** — visit `/`, scroll through all
   sections, click a planet. The 8 planets, the incubation
   pipeline, and the footer should all render.
5. **About page** — visit `/about`. The project grid should show
   the 8 projects currently listed.
6. **At least one GA4 event** — open DevTools → Network, filter
   for `google-analytics`, perform an action. Should see at least
   one `page_view`.

If any of these fail, **do not push to `main`**.

### 19.7 Cutting a release

`bin/release.sh` is the release entry point. It mirrors the release script
used by the other whereq universe apps (chroniq.cc, catobigato.com,
caijing.today) so the workflow feels identical everywhere, with two
whereq.ca-specific differences: **no `deploy.sh`** (Vercel deploys on the
main push) and **semver tags** instead of the 4-segment family build
counter.

```bash
# From the dev branch:
bin/release.sh --message "Add background-removal presets"

# Preview without touching anything (runs the read-only gates):
bin/release.sh --dry-run --message "Add background-removal presets"
```

What it does, in order:

1. **Preflight** — verifies the repo, the branch (`dev`), the remote
   (`git@whereq.github.com:whereq/whereq.ca.git`) and the commit
   identity. The identity check matters: the git identity is set
   repo-locally, and the global config is still `ccbus-cc`, so a commit
   made outside this folder would be attributed to the wrong account.
2. **CI gates** — the four checks from §19.5 that can be automated:
   - COOP/COEP/CORP header parity between `vite.config.ts` and
     `vercel.json` (§16) — this is the check that matters most;
   - `yarn lint` — must be 0 errors;
   - `npx tsc -p tsconfig.app.json --noEmit` and
     `npx tsc -p tsconfig.node.json --noEmit` — must be 0 errors;
   - `yarn build` — must succeed.
   A failing gate aborts the release before anything is committed.
3. **Release note** — scaffolds
   `docs/releases/v<VERSION>-<codename>-<YYYY-MM-DD>.md` with the
   front-matter schema below, unless one already exists for that
   version. Use `--no-notes` to skip.
4. **Commit + squash** — stages everything (`git add -A`), commits with
   `--message`, then squashes the dev commits since the merge-base with
   `main` into that single commit.
5. **Push dev → merge to main → tag → push main + tag.** The merge to
   `main` is what triggers the Vercel deploy.

The version is derived from the newest release note on disk and bumped
by **minor** by default (`v1.1.0` → `v1.2.0`). Override with
`--version X.Y.Z`, or `--major` / `--patch`.

Useful flags:

| Flag | Effect |
|---|---|
| `-m, --message <msg>` | Commit / merge / tag message. Required. |
| `--version <X.Y.Z>` | Pin the version instead of auto-bumping. |
| `--codename <name>` | Codename for the release-note filename. |
| `--major` / `--minor` / `--patch` | Which segment to bump (default: minor). |
| `--squash <n>` | Squash only the last N commits. |
| `--no-squash` | Push the dev commits as-is. |
| `--no-notes` | Don't scaffold a release note. |
| `--skip-checks` | Skip the CI gates (deliberate hotfixes only). |
| `-y, --yes` | Skip the confirmation prompt. |
| `--dry-run` | Print everything, change nothing. |

The current version field in `package.json` is `"0.0.0"` — this is
intentional. There is **no semver discipline** in `package.json`; the
release version lives in the git tag and the release note. The
user-facing release notes live in `docs/releases/<version>.md` with this
naming convention:

- `v<MAJOR>.<MINOR>.<PATCH>-<codename>-YYYY-MM-DD.md`
- Example (already shipped): `v1.0.0-galaxy-2026-06-16.md`

**Front-matter schema** (YAML):

```yaml
---
version: 1.2.3          # matches the filename
codename: galaxy        # human name; can repeat
date: 2026-06-16        # ISO date
status: shipped         # shipped | yanked | draft
audience: public        # public | internal
---
```

The body of a release note should contain:

1. **Headline** — one-sentence product framing.
2. **What's in this release** — short index of deliverables.
3. **The 5W + 1H / big-picture framing** (if applicable) — see
   `v1.0.0-galaxy-2026-06-16.md` for the canonical example.
4. **Per-feature sections** — one per planet / product added or
   changed, with link to the live page.
5. **Roadmap** — past / now / future, in three bullet lists.
6. **Links** — quick reference table at the end.

### 19.8 Deploying

There is **no manual deploy command**. The flow is:

1. Merge your PR to `main` (or run `bin/release.sh`, which merges
   `dev` → `main` and pushes for you — §19.7).
2. Vercel auto-detects the push via the connected GitHub repo and
   starts a build. The Vercel build runs `yarn build` (no install
   step needed because Vercel caches `node_modules`).
3. Vercel uses `vercel.json` to:
   - Inject the three COOP/COEP/CORP headers on every response.
   - Rewrite all unmatched paths to `/index.html` (SPA fallback
     so client-side routes work on hard refresh).
4. The deploy URL is shown in the Vercel dashboard. The
   `whereq-app-hub.vercel.app` production alias (and the
   `www.whereq.ca` custom domain) update within
   ~30s of deploy completion.

To roll back:

- **Vercel dashboard** → Project → Deployments → click a previous
  green deployment → "Promote to Production". This is instant and
  doesn't require a git revert.
- If the rollback is more than one revision behind, you can also
  push a revert commit to `main`, which triggers a normal deploy.

### 19.9 Branch & PR conventions

There is no enforced branching model in the repo (no
`.github/CODEOWNERS`, no PR template, no required checks). The
observed convention is:

- Feature work happens on `feature/<short-name>` branches.
- Bugs happen on `fix/<short-name>` branches.
- PRs go to `main`.
- Commit messages follow the loose convention
  `Add <thing>` / `Fix <thing>` / `Refactor <thing>` (the git log
  is full of these — see `git log --oneline`).

Since `bin/release.sh` was added, the release flow runs through a
**`dev` branch** — the same dev → main → tag shape used by the other
whereq universe apps:

- `dev` is the working branch. `bin/release.sh` requires you to be on
  it, squashes the dev commits since the merge-base with `main`, pushes
  `dev`, merges `dev` → `main` with a merge commit, tags, and pushes.
- `main` is the deploy branch — every push to it triggers a Vercel
  deploy (§19.8).
- Short-lived `feature/<short-name>` / `fix/<short-name>` branches can
  still be used for work in progress; merge them back into `dev`.

This isn't enforced by GitHub. If you want stricter conventions, add a
`CONTRIBUTING.md` and a PR template — the repo doesn't have one.

### 19.10 Troubleshooting deploy failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| Vercel build fails on type errors | New TS errors introduced | Run `yarn build` locally, fix the type errors. |
| Prod loads but ffmpeg.wasm fails to init | COOP/COEP mismatch | See §16. Check `vite.config.ts` and `vercel.json` are identical. |
| Prod loads but `silent-check-sso.html` 404s | Missing public file | Re-add to `public/` — Vite copies the whole `public/` tree. |
| Prod shows a blank page | Routing 404 — Vercel not falling back to `index.html` | Check the `rewrites` block in `vercel.json`. The current `source: "/(.*)"` → `destination: "/index.html"` is correct. |
| Prod serves stale assets after deploy | Browser cache | Hard-refresh (Cmd-Shift-R / Ctrl-Shift-R). Vite's content-hash filenames (`chunk-XXXX.js`) should bust the cache normally. |
| GA4 events not firing in prod | `VITE_GA4_MEASUREMENT_ID` not set in Vercel | Set it in Vercel → Settings → Environment Variables → Production. See §11. |

### 19.11 What this doc does NOT cover

- **No hosted CI/CD config** — there is no `.github/workflows/`,
  no `.gitlab-ci.yml`. The pipeline is `bin/release.sh`, which runs the
  lint / type-check / build / header-parity gates locally and then
  pushes to `main`, where Vercel's auto-deploy from GitHub takes over.
  The gates run on the machine that runs the script, not on a runner.
- **No environment promotion** — there's no manual "promote staging to
  prod" gate. `main` is the only deploy target.
- **No feature flags** — all features ship enabled. If you need a
  feature flag system, see §18 (Adding a new feature) and consider
  extending `LocalSettings` to support per-feature toggles.
- **No CDN config** — Vercel's edge network handles this
  automatically.
- **No post-deploy monitoring** — there is no Sentry / Datadog /
  LogRocket integration. Errors surface only via user reports.
  Adding one is a good follow-up; see §11 for the GA4-only setup.

---

*End of architecture document. Last regenerated by Claude Code CLI
in collaboration with the user. If you make non-trivial changes to
the codebase, please update the relevant section.*
