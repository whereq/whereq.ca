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
yarn lint     # eslint flat config; 0 errors required, baseline ~24 warnings is acceptable
npx tsc -p tsconfig.app.json --noEmit   # type-check without building
```

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
- `docs/ARCHITECTURE.md` — canonical, ~89 KB deep-read of every file. **Read this before non-trivial changes**; it captures the design rationale, dead code, and known bugs that aren't visible from the code alone.

## State / persistence conventions

- **State**: Zustand 5 for everything shared across the tree. Component-local `useState` for ephemeral UI. No Redux, no Context-as-state.
- **Persistence**: almost everything to `localStorage` via `src/utils/localStorageHelper.ts` (JSON wrapper). Read-on-mount, write-on-every-mutation, no migration logic. If a schema changes, users lose their saved data.
- **Two parallel pub/sub mechanisms** (intentional tech debt, will be unified):
  1. `src/utils/eventEmitter.ts` — typed singleton, used by `map/`.
  2. `window.dispatchEvent(new CustomEvent(LOCAL_APP_EVENTS))` — DOM events, used by `AppEvent.ts`.

## Styling / design system

**MetroUI dark** palette (mirrored from `whereq.github.io`): bg `#161b27`, accent orange `#f5a623`, text `#f0e6c8`, Fira Code monospace globally. Tokens defined as Tailwind v4 CSS variables in the `@theme {}` block in `src/index.css` (which also overrides the gray scale so `bg-gray-900` doesn't produce a visible seam against the body). `tailwind.config.js` (v3-style) is mostly dormant but kept around for tooling compatibility.

Card primitive is `<AppCard>` in `src/components/app-card/`. Auto-detects icon vs logo slot.

## Heavy local-feature engines

- **FFmpeg.wasm** (`@ffmpeg/ffmpeg@0.12`) — shared singleton via `src/features/multimedia/hooks/useFfmpegEngine.ts` (module-level instance + React mirror via pub/sub). Multiple components can read the same `ffmpegInstance` reference. Tries local `public/ffmpeg-core/` first, falls back to unpkg. Each consumer wires its own `ffmpeg.on("progress", ...)` per `useEffect`. Requires `SharedArrayBuffer` (the COOP/COEP reason).
- **Pyodide** (`pyodide@0.29.3`) — singleton in `src/features/tools/components/CodeFormatter.tsx` with `pyodideInitPromise`. Bumps `setMaxListeners(50)` to survive React StrictMode double-mount. Loads from jsdelivr CDN.
- **ONNX Runtime Web** (via `@imgly/background-removal@1.5.8`) — background-removal tool. The onnxruntime-web subpath aliases in `vite.config.ts` (`webgpu`/`cpu` → default) are because the subpaths aren't in the package's `exports` field. WASM/WebGL auto-detected at runtime.
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
- **`react-ace@14` quirk**: published CJS; Vite's CJS→ESM transform makes `import X from "react-ace"` return the whole `module.exports` object. The component is `mod.default.default`. See `CodeFormatter.tsx` for the unwrap.
- **`as any` casts** in `AudioVideoMerger.handleMerge` carry inline `// eslint-disable-next-line` comments — required because @ffmpeg/ffmpeg v0.12's types are wrong.

## Auth / network

- **Keycloak**: hardcoded in `src/services/keycloak.ts` (realm `whereq`, client `whereq-ca` on `keytomarvel.com`). Dev proxy in `vite.config.ts` routes `/realms/whereq` to `https://www.keytomarvel.com`. SSO is optional — failure falls back to anonymous mode and the rest of the lab still renders. Lab features do NOT require auth.
- **Only one env var**: `VITE_GA4_MEASUREMENT_ID` (optional, GA4 is a no-op without it). Documented in `.env.example`.
- **Bundle warning**: chunk-size warning at ~500 kB is expected (ffmpeg, mathjax, pyodide, gif.js). Don't code-split further; the design intent is "heavy deps in one bundle so multimedia + math work without a network race after first load."

## Known dead code / bugs (non-exhaustive, full list in ARCHITECTURE.md §17)

- `tag/components/workspace/Workspace.tsx` imports `WhereQTagSection` as `FormatConverterSection` (copy-paste bug).
- `utils/logUtil.ts` self-recurses (`log` calls `log`); also gated by `VITE_ENV === "test"` which is never set, so it's a no-op.
- `calendar/` writes the same events to TWO `localStorage` keys (one manual, one via zustand `persist`). The in-memory `events` array is dead code.
- `multimedia/YouTubeCapture.tsx` (738 lines) is fully implemented but hidden in the sidebar and not routed in the workspace (mainland China / corporate firewalls block YouTube).
- `map-gl/` is the older `map/` implementation, not wired in the router.
- `api-executor/ApiExecutor.tsx` imports `axios` but uses `fetch` (dead import).
- Many zero-byte placeholders (`MainLayout.tsx`, `AuthLayout.tsx`, `useWindowSize.ts`, `apiClient.ts`, `middleware.ts`, `rootReducer.ts`, `FormularAnimation.tsx`, `catFactSlice.ts`).

## Deploy (summary; full runbook in docs/ARCHITECTURE.md §19)

- Push to `main` → Vercel auto-deploys. No manual gate, no CI, no staging.
- PRs get a Vercel preview URL automatically.
- Rollback: Vercel dashboard → Deployments → Promote previous green deployment to Production.
- **Pre-deploy must-do**: confirm `yarn lint` is 0 errors and `yarn build` succeeds; smoke-test `yarn build && yarn preview` by Prepare-cutting a video in the multimedia workspace (the COOP/COEP smoke test); diff `vite.config.ts` and `vercel.json` to confirm COOP/COEP/CORP headers match.
- Release notes live in `docs/releases/v<MAJOR>.<MINOR>.<PATCH>-<codename>-YYYY-MM-DD.md` with YAML front-matter (`version`, `codename`, `date`, `status: shipped|yanked|draft`, `audience: public|internal`). The repo's `package.json` version is pinned at `0.0.0` deliberately — no semver discipline; every push to `main` is implicitly a release.