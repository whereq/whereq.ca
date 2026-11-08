# Multimedia Feature — Architectural Map

A comprehensive technical map of `/home/whereq/git/whereq.ca/src/features/multimedia/`. Every file in the feature was read in full. The doc is organized to support a final design-doc write-up.

---

## 0. Files Inventory

| File | Lines | Role |
|---|---|---|
| `models/MultimediaEnum.ts` | 11 | Section enum (9 values) that drives sidebar + routing |
| `store/multimediaStore.ts` | 20 | Zustand store: `activeSection` + `isWorkspaceVisible` toggle |
| `pages/MultimediaPage.tsx` | 16 | Page shell: `<PageLayout>` + `<Sidebar>` + `<Workspace>` |
| `hooks/useFfmpegEngine.ts` | 212 | Module-singleton FFmpeg.wasm engine + React mirror hook |
| `components/Sidebar.tsx` | 62 | Vertical icon rail; `TOOLS` array drives icons + active state |
| `components/Workspace.tsx` | 36 | Pure switch on `activeSection` → renders one tool |
| `components/BackgroundRemover.tsx` | 183 | `@imgly/background-removal` (ONNX/WebAssembly) |
| `components/ImageFormatConverter.tsx` | 291 | Canvas-based image format convert (no deps) |
| `components/VideoToGif.tsx` | 454 | `<video>` seek + canvas + gif.js; original GIF tool |
| `components/GifCompressor.tsx` | 478 | gifuct-js decode → gif.js re-encode; existing compress tool |
| `components/VideoSplitter.tsx` | 1061 | FFmpeg.wasm stream-copy cut + custom timeline + thumbnails |
| `components/AudioVideoMerger.tsx` | 984 | FFmpeg.wasm merge with 4 length-mismatch policies |
| `components/GifMaker.tsx` | 1536 | 3-stage pipeline: Prepare (FFmpeg concat) → Convert (gif.js) → Compress (gifuct-js + gif.js) |
| `components/ImageToPdf.tsx` | 813 | Browser-native image list → PDF via pdf-lib (max 9 images) |
| `components/YouTubeCapture.tsx` | 738 | MediaRecorder + iframe capture (HIDDEN in sidebar, kept on disk) |

**Library versions** (from package.json):
- `@ffmpeg/ffmpeg ^0.12.15` + `@ffmpeg/util ^0.12.2`
- `gif.js ^0.2.0` (no TS types — `// @ts-expect-error` everywhere)
- `gifuct-js ^2.1.2` (no first-class types — cast through `unknown`)
- `@imgly/background-removal 1.5.8` (uses ONNX Runtime Web internally)
- `pdf-lib ^1.17.1` (pure-JS PDF writer; no wasm, no server round-trip)
- `zustand ^5.0.12` (store)
- `react-modal` (used by `CustomModal`)

**Static assets** in `public/`:
- `public/ffmpeg-core/ffmpeg-core.js` (ESM) and `ffmpeg-core.wasm` — committed locally; engine never hits a CDN if these are present.
- `public/gif.worker.js` — gif.js's web worker; `workerScript: "/gif.worker.js"` in every tool.

---

## 1. Component Inventory

### 1.1 `MultimediaEnum.ts` (10 lines)
Single TypeScript enum `SectionType` with 9 string values:
- `YOUTUBE_CAPTURE` (kept in enum + store but HIDDEN in `Sidebar` and NEVER routed in `Workspace`; see §1.2)
- `BACKGROUND_REMOVER` (default landing)
- `IMAGE_FORMAT_CONVERTER`
- `VIDEO_TO_GIF`
- `GIF_COMPRESSOR`
- `VIDEO_SPLITTER`
- `AUDIO_VIDEO_MERGER`
- `GIF_MAKER` (wizard icon `faWandMagicSparkles`)
- `IMAGE_TO_PDF` (newest; icon `faFilePdf`)

The enum values are **the human labels**, not machine IDs. Both Sidebar and Workspace use `SectionType.X` strings directly.

### 1.2 `multimediaStore.ts` (Zustand, 20 lines)
```ts
interface MultimediaStore {
    isWorkspaceVisible: boolean;     // mobile-style collapse flag (used by Sidebar)
    toggleWorkspace: () => void;
    activeSection: SectionType;
    setActiveSection: (s: SectionType) => void;
}
```
Default: `activeSection = SectionType.BACKGROUND_REMOVER`. The comment explicitly states: "YouTube Capture was the previous default but is temporarily hidden (see Sidebar.tsx); we still leave the YOUTUBE_CAPTURE enum value in the store so a stale localStorage value doesn't crash the renderer." — this is a load-bearing comment, both Sidebar and Workspace rely on this fallback.

### 1.3 `MultimediaPage.tsx` (16 lines)
Bare layout: `PageLayout > flex row > Sidebar | Workspace`. No state, no logic.

### 1.4 `Sidebar.tsx` (60 lines)
- `TOOLS` array of `{ section, icon, label }` — the `YOUTUBE_CAPTURE` entry is **commented out** with a multi-line block explaining why (mainland China / corporate firewalls block the YouTube embed; no local-first fallback).
- `handleClick(section)` calls `setActiveSection` and auto-toggles `isWorkspaceVisible` if hidden.
- Tailwind: 16-wide vertical bar, orange accent, `faWandMagicSparkles` for GifMaker is the most "magic" of the icons.
- **Important**: this is the only place the "hidden" YouTube tool exists in user-visible state. The import for `YouTubeCapture` in `Workspace.tsx` is also commented out — together they keep the disabled component's bundle out of the app.

### 1.5 `Workspace.tsx` (34 lines)
Linear `if/else` chain on `activeSection`. No default branch — if `activeSection === YOUTUBE_CAPTURE` (stale localStorage), the workspace renders empty. The header comment explains this is intentional ("render nothing rather than pulling in the disabled component"). Each tool is a default export imported eagerly.

### 1.6 `useFfmpegEngine.ts` (212 lines) — covered in §2

### 1.7 `BackgroundRemover.tsx` (183 lines)
**What it does**: Drag-drop a JPG/PNG/WebP → runs `@imgly/background-removal` (ISNet/U2-Net family on ONNX Runtime Web) → outputs a PNG with alpha-cleared background.

**State machine**: `idle → loading-model → processing → done | error`

**State**:
- `originalUrl`, `resultUrl` (blob URLs)
- `progress: 0–100` (driven by library's `progress(key, current, total)` callback)
- `status`, `error`, `originalSize`, `resultSize`
- `inputRef` (hidden file input)

**Callbacks**:
- `handleFile(file)` — sets `loading-model`, creates `originalUrl`, calls `removeBackground(file, { progress })` which routes `compute:download` → status `loading-model`, `compute:inference` → status `processing`. Wraps result blob, sets `resultUrl`.
- `reset()` — revokes both URLs, clears state, resets `inputRef.current.value`.

**External libs**:
- `@imgly/background-removal` 1.5.8 — internally requires `onnxruntime-web`. This is the reason the **onnxruntime-web subpath aliases** exist in `vite.config.ts` (see §6.2). Does **not** use `useFfmpegEngine`.

**Non-obvious details**:
- The component does NOT manage its own model cache — the library does. First run downloads ~10 MB, subsequent runs are near-instant.
- The "first run warning" yellow box uses a different palette (`bg-yellow-900/40 border-yellow-700 text-yellow-200`) than the soft-yellow "engine not ready" pattern used elsewhere.
- The checkerboard backdrop CSS is duplicated between this and `ImageFormatConverter` for showing alpha on PNG results.

### 1.8 `ImageFormatConverter.tsx` (291 lines)
**What it does**: Drag-drop any browser-readable image → resize / change format / flatten alpha → download PNG/JPG/WebP.

**State**:
- `originalUrl`, `originalMeta` (name, size, w, h)
- `resultUrl`, `resultSize`
- `outputFormat: "png" | "jpeg" | "webp"`
- `quality: 1–100` (default 92)
- `flattenColor: "#ffffff"`, `flattenOnExport: boolean`
- `resizing: { width, height, scale: 1–200 }` (scale is the user input; width/height are derived)
- `imageDimensions`
- `isProcessing`

**Callbacks**:
- `handleFile(file)` — instantiates a new `Image()` to read `naturalWidth/Height` and seed `resizing.scale=100`. No state machine; this is a single-screen tool.
- `handleConvert()` — the heavy one. Creates an offscreen `<canvas>`, fills it with `flattenColor` if `outputFormat==="jpeg"` or `flattenOnExport` is on, `drawImage`s, calls `canvas.toBlob(mime, quality/100)`. Wraps in a Blob URL.
- `reset()` — revokes both URLs, clears all state.

**Error handling**: uses `window.alert("Conversion failed: " + msg)` — this is the **one** place in the entire feature that still uses the native alert. The memory note says "no window.alert/confirm/prompt" but it slipped through here (or was deliberate because there's no prior result to lose).

**Non-obvious details**:
- JPG always auto-flattens to white regardless of `flattenOnExport`, but the UI only shows the picker when the user toggles `flattenOnExport`. The auto-flatten is silent and documented in the yellow box.

### 1.9 `VideoToGif.tsx` (454 lines)
**What it does**: Drag-drop a video → seek through timestamps → draw onto canvas → feed `ImageData` to gif.js. No ffmpeg.

**State**:
- `videoUrl`, `meta` (name, size, w, h, duration)
- `gifUrl`, `gifSize`
- `progress: 0–100` (50% frame capture, 50% gif.js encode)
- `status: "idle" | "ready" | "encoding" | "done" | "error"`
- `fps: 1–24` (default 10), `startTime`, `endTime`, `maxWidth: 120–960` (default 480)
- `showResetWarning`
- Refs: `videoRef`, `canvasRef`, `inputRef`, `pendingFileRef`

**Callbacks**:
- `handleFileChosen(file)` — if a previous result exists, stashes in `pendingFileRef` and shows modal. Otherwise calls `resetForNewVideo`.
- `resetForNewVideo` — revokes old URLs, sets up new `videoUrl`, seeds `endTime = min(duration, 5)`.
- `handleEncode` — main pipeline. Loops `seekTo(t)` for `totalFrames = (end-start)*fps`, draws to canvas, builds `ImageData` array, then `new GIF({ workers:2, quality:10, workerScript:"/gif.worker.js" })`. `gif.on("progress", ...)` and `gif.on("finished", ...)` complete the flow.
- `handleDownloadPreviousAndContinue` / `handleDiscardPreviousAndContinue` — modal actions.

**External libs**:
- `gif.js` (no types) — Web Worker encoder; we pass `workerScript: "/gif.worker.js"` (lives in `public/`).
- `CustomModal` for the "replace?" prompt.

**Non-obvious details**:
- The `seekTo` helper has a 1-second safety timeout — if `seeked` never fires, resolve with whatever's on the canvas.
- Captured frames are kept in an array of `Uint8ClampedArray` — they live in JS heap until `gif.render()` returns. For 5-second clips at 10fps this is ~50 frames × ~1MB = 50MB briefly.
- The "ready" status is never actually entered — status goes straight `idle → encoding → done | error`. The type still has it as a vestige.

### 1.10 `GifCompressor.tsx` (478 lines)
**What it does**: Drag-drop a GIF → decode every frame with `gifuct-js` → re-encode with `gif.js` at smaller scale / fewer frames / lower quality. No ffmpeg.

**State**:
- `originalMeta`, `resultUrl`, `resultSize`
- `progress: 0–100` (50% per kept frame + 50% gif.js)
- `status: "idle" | "decoding" | "encoding" | "done" | "error"`
- `scale: 10–100` (default 100), `frameSkip: 1–8` (keep 1 in N, default 1), `quality: 1–20` (default 10, lower=smaller)
- `showResetWarning`
- Refs: `inputRef`, `decodeCacheRef` (the large frame array lives here, NOT in React state), `pendingFileRef`

**Callbacks**:
- `handleFileChosen(file)` — same as VideoToGif: stash or commit.
- `decodeFile(file)` — `file.arrayBuffer()` → `parseGIF(buf)` → `decompressFrames(gif, true)` cast through `unknown` to get `patch` (the type definition lies — see §6.3). Stores in `decodeCacheRef`. Sets `originalMeta`.
- `handleCompress()` — applies `disposalType === 2` clear between frames (the only correct way to compose deltas), `putImageData` the patch at `(dim.left, dim.top)`, scale down via a temp canvas, add frame to gif.js.
- `handleDownloadPreviousAndContinue` / `handleDiscardPreviousAndContinue` — modal.

**External libs**:
- `gifuct-js` (no first-class types) — `parseGIF` and `decompressFrames`.
- `gif.js` (no types) — re-encoder.
- `CustomModal` for the warning.

**Non-obvious details**:
- Distinct error messages for "didn't pick a file" vs "picked a file but decode failed" — checks `originalMeta` to differentiate.
- The `decodeCacheRef` is intentionally not React state — frames can be tens of MB. Comment: "decoded frames can be tens of MB; we never want them in React state, which would trigger re-renders on every assignment."

### 1.11 `VideoSplitter.tsx` (1061 lines)
**What it does**: Drag-drop a video → show custom timeline with thumbnails + draggable start/end handles → cut with FFmpeg.wasm stream-copy (`-c copy`) for byte-precise, near-instant trim.

**State**:
- Engine: `useFfmpegEngine()` (see §2)
- File: `file`, `meta` (name, size, duration), `fileUrl`
- Timeline: `startTime`, `endTime`, `currentTime`, `isPlaying`
- Cut output: `outputUrl`, `outputSize`
- Status: `status: "idle" | "cutting" | "done" | "error"`, `progress: 0–100`, **`cutPhase: "writing" | "cutting" | "reading" | null`**, `error`
- Thumbnails: `thumbnails: Thumbnail[]`, `isExtractingFrames`
- Refs: `inputRef`, `videoPreviewRef`, `pendingFileRef`
- Modal: `showResetWarning`

**Key sub-components**:
- `<Timeline>` — 3-layer stack: thumbnail strip + scrub rail + handles. Uses pointer events with `setPointerCapture` for drag (track outside the handle). Draggable handles have chevron grips on top and bottom (standard video-editor affordance). Click on rail scrubs, click on thumbnail jumps to that timestamp.
- `extractThumbnails(file, duration)` — async helper. Creates offscreen `<video>`, seeks through N evenly-spaced timestamps, draws to 160px-wide canvas, `toDataURL("image/jpeg", 0.7)`. Returns up to 20 thumbnails (min 8, max 20 = `Math.min(20, Math.max(8, Math.ceil(duration)))`). The seek has a 1-second safety timeout per frame.

**Callbacks**:
- `loadVideoFile(f)` — revokes old URLs, creates `fileUrl`, sets start=0/end=duration, **fires thumbnail extraction in the background** (not awaited) so the user sees the preview video immediately.
- `handleCut()` — main pipeline. `writeFile` (phase: writing) → `exec(["-ss", start, "-i", input, "-to", end-start, "-c", "copy", output])` (phase: cutting) → `readFile` (phase: reading) → `URL.createObjectURL(blob)` → `deleteFile` both virtual-FS files. Error path detects "stream copy" failures and rewords the message.
- `handleChangeStart/End/Scrub` — drag/scrub handlers; clamp start < end-0.1, write `videoPreviewRef.current.currentTime`.
- `togglePlay()` — async, catches `play()` rejection from autoplay policy.

**External libs**:
- `@ffmpeg/ffmpeg 0.12.15` + `@ffmpeg/util 0.12.2`
- `CustomModal` for the warning.

**Non-obvious details**:
- The dev-facing header is huge and includes a multi-paragraph "FFmpeg core hosting" section explaining why ESM core (not UMD) — Vite's `worker: { format: "es" }` requires ESM; UMD's `var`/`module.exports` breaks the module-worker dynamic import.
- Stream copy produces no progress events → the `cutPhase` enum + an indeterminate bar (`.animate-indeterminate`) is the only feedback during a cut.
- `fileUrl` is held in **state** (not a derived value) so the `<video src>` doesn't change on every render. Comment: "if it did, the browser would re-create the media element and reset currentTime to 0 every time we updated any unrelated state (like the playhead)."
- The progress handler in `useEffect(..., [ffmpeg])` **leaks a listener** on the singleton — comment acknowledges this and explains: `@ffmpeg/ffmpeg 0.12 doesn't expose off()`, and `setState` in a defunct component is a no-op, so the leak is harmless.

### 1.12 `AudioVideoMerger.tsx` (984 lines)
**What it does**: Pick a video + an audio file → merge with FFmpeg.wasm into H.264/AAC MP4. Four length-mismatch strategies (shortest/longest/trim-to-video/trim-to-audio).

**State**:
- Engine: `useFfmpegEngine()` + per-component progress listener
- Files: `videoFile`, `audioFile`, `videoUrl`, `audioUrl`, `videoMeta` (name, size, w, h, duration), `audioMeta` (name, size, duration)
- Options: `lengthMode: "shortest" | "longest" | "trim-to-video" | "trim-to-audio"` (default `shortest`)
- Process: `status: "idle" | "ready" | "merging" | "done" | "error"`, `progress`, **`mergePhase: "writing-video" | "writing-audio" | "encoding" | "reading" | null`**, `error`
- Output: `outputUrl`, `outputSize`, `outputFileName`
- Modal: `showResetWarning`
- Refs: `videoInputRef`, `audioInputRef`, `videoPreviewRef`, `audioPreviewRef`, `pendingFileRef` (with `kind: "video" | "audio"`)

**Key sub-component**: `LengthOption` — single radio button row with label + description, used 4× in the strategy picker.

**Callbacks**:
- `probeVideo(probeAudio)` — hidden `<video>`/`<audio>` element to read dimensions + duration. Throws on codec error.
- `loadVideoFile(loadAudioFile)` — revokes old URLs, sets `setVideoFile/Url`, fires probe `.then(meta) => setMeta / .catch(e) => setError`.
- `handleVideoChosen(handleAudioChosen)` — same as VideoSplitter: stash or commit, with `kind` tagging.
- `buildArgs(...)` — pure function that builds the ffmpeg argv. Three branches:
  - `longest` + known durations: `-filter_complex "[1:a]apad[a];[0:v]tpad=stop_mode=clone:stop_duration=99999[v]" -map [v] -map [a] -t max(vid,aud)`
  - `trim-to-video`: `-map 0:v:0 -map 1:a:0 -t videoDuration`
  - `trim-to-audio`: same with `audioDuration`
  - default (`shortest` / unknown): `-map 0:v:0 -map 1:a:0 -shortest`
  - Always re-encodes: `-c:v libx264 -preset ultrafast -crf 23 -c:a aac -b:a 192k -pix_fmt yuv420p -movflags +faststart`.
- `computeOutputDuration()` — pure function, returns null if any duration is unknown. Drives the live "Resulting duration:" preview in the UI.
- `handleMerge()` — main pipeline. Strips non-ASCII from filenames to dodge "Invalid data found when processing input". Uses `inst.exec(args)` with the argv array (cast `as any` because the v0.12 type expects an `ExecOptions` object, not a bare `string[]`). Reads result, builds `Blob`, creates URL. Deletes all 3 virtual-FS files in a try/catch.
- `handleClear`, `handleDownload` — standard helpers.

**External libs**: same as VideoSplitter. Plus `CustomModal`.

**Non-obvious details**:
- The "ready" status in the type is unused — same vestige as VideoToGif.
- The empty-state cut fails with "Engine not ready yet. If this persists, try refreshing the page." — explicit, user-friendly.
- An unmount cleanup useEffect revokes all 4 URLs in a `[]`-deps effect with the `react-hooks/exhaustive-deps` disable comment, explaining why (otherwise it'd run on every URL change).
- "Why re-encode instead of stream-copy" header is long and explicit: WebM/Opus/MKV inputs can't be muxed into MP4 via `-c copy`.
- The `showWarning` banner uses a different soft-yellow palette (`bg-yellow-900/40 border-yellow-700/60`) and is a separate condition from `ffmpegStatus === "loading"`.

### 1.13 `GifMaker.tsx` (1536 lines)
**The most complex component in the feature.** See §3.3 for the full pipeline. This is a high-level summary.

**What it does**: Build a GIF from a list of segments. Each segment is a video clip with in/out trim points OR a static image shown for N seconds. 3-stage pipeline: Prepare (FFmpeg concat MP4) → Convert (gif.js from the MP4) → Compress (gifuct-js decode + gif.js re-encode the GIF).

**State**:
- Engine: `useFfmpegEngine()` + progress listener
- Segments: `segments: Segment[]`, `selectedId` (only the selected segment shows edit controls)
- Prepare output: `preparedUrl`, `preparedSize`, `preparedDuration`
- Convert output: `gifUrl`, `gifSize`
- Compress output: `compressedUrl`, `compressedSize`
- Process: `status: "idle" | "preparing" | "ready" | "converting" | "compressed" | "error"`, `progress`, `error`
- Options for Convert: `fps: 1–24` (default 10), `maxWidth: 120–960` (default 480)
- Options for Compress: `compressScale: 10–100` (default 75), `compressFrameSkip: 1–8`, `compressQuality: 1–20` (default 10)
- Modal: `showResetWarning`
- Refs: `videoInputRef`, `imageInputRef`, `videoRef`, `canvasRef`, `pendingFileRef`, `decodeCacheRef`

**Segment type** (discriminated union):
```ts
type Segment =
  | { id, kind: "video", file, url, meta: {name, size, duration, w, h}, trim: {start, end}, filmstrip: string[] }
  | { id, kind: "image", file, url, meta: {name, size, w, h}, duration: number };
```

**Callbacks** (high-level; full detail in §3.3):
- `handleAddVideo(handleAddImage)` → `commitAddVideo/Image` → probes dimensions + (for video) generates filmstrip → appends to `segments`, auto-selects.
- `handleMoveUp/Down` (array swap), `handleRemove` (revokes URL), `handleUpdateVideoTrim` (clamps 0 ≤ start < end ≤ duration), `handleUpdateImageDuration` (clamp ≥ 0.1).
- `handlePrepare()` — writes all segments to virtual FS, builds a `filter_complex` with per-segment scale+pad+setpts, concatenates with `concat=n=N:v=1:a=0`, encodes H.264/yuv420p MP4, reads back, probes duration.
- `handleConvert()` — seeks the prepared MP4, captures frames to canvas, feeds gif.js, result is the unoptimized GIF.
- `handleCompress()` — fetches the GIF blob, decodes with gifuct-js, applies disposal logic, re-encodes at lower scale/quality.
- `handleDownloadOriginal/Compressed` and the modal's three actions (`handleDownloadPreviousAndContinue`, `handleDiscardPreviousAndContinue`, `closeModalAndDropPending`).

**External libs**: `@ffmpeg/ffmpeg`, `@ffmpeg/util`, `gif.js`, `gifuct-js`, `CustomModal`.

**Non-obvious details**:
- **The "Download previous" path is asymmetric vs the other tools**: in VideoToGif/VideoSplitter/GifCompressor, after a successful download the user explicitly wants to LOAD A NEW file. In GifMaker, the modal is triggered by `handleAddVideo/Image` (adding a new segment), not by "load new file". The download path keeps the existing GIF on screen AND adds the new segment — the user can build multiple GIFs in one session.
- **"Discard & continue" clears the prepared video too** (and the compressed), because the prepared video is derived from the old segment list — leaving it on screen would be confusing when the user clicks "Convert" expecting it to use the new segment.
- The target height in Prepare is `Math.max(2, Math.round((maxWidth * 9) / 16 / 2) * 2)` — **rounded to a multiple of 2** because libx264's yuv420p rejects odd heights.
- `decodeCacheRef` is intentionally not used during Compress in this component (unlike GifCompressor) — every Compress run re-fetches the GIF blob and re-decodes. Comment doesn't explain why, but it's a minor inefficiency.

### 1.14 `YouTubeCapture.tsx` (738 lines)
**HIDDEN in sidebar and not routed in Workspace, but file is fully implemented on disk.**

**What it does**: Embed the YouTube iframe → record playback with `MediaRecorder` + `canvas.captureStream()` → download webm/mp4. Real-time capture (a 3-min video takes 3 min to "download").

**State**:
- `url` (pre-filled with `SAMPLE_VIDEO_URL = "https://www.youtube.com/watch?v=aqz-KE-bpKQ"` — Big Buck Bunny, CC)
- `videoId`, `status: "idle" | "loading" | "ready" | "recording" | "stopped" | "error"`
- `iframeLoadStatus: "loading" | "failed"` (note: **no "loaded" state** — by design, see below)
- `youtubeReachability: "unknown" | "checking" | "reachable" | "unreachable"`
- `recordedUrl`, `recordedSize`, `duration`
- `error`, `skipIframe: boolean`
- Refs: `playerIframeRef`, `canvasRef`, `recorderRef`, `chunksRef`, `startedAtRef`, `tickRef`, `rafRef`, `iframeLoadTimerRef`, `reachabilityTimerRef`

**Key technical decisions (all documented in the file's giant header)**:
- **`onLoad` is not a success signal** — Chrome's `chrome-error://chromewebdata/` "this site can't be reached" page also fires `onLoad`, and we can't read cross-origin iframe content to tell them apart. So `iframeLoadStatus` only has "loading" and "failed" (the 8-second timeout flips it to "failed" if `onLoad` never fires). The Record button is enabled in "loading" — the user verifies the player visually.
- **YouTube reachability pre-check**: a 6-second image load to `i.ytimg.com`. `fetch('youtube.com', {mode:'no-cors'})` was tried first and rejected — it resolves as soon as the server returns any response, even an HTML error body. The image loader is stricter: it only fires `load` for a valid JPEG. Result drives a top-of-page banner ("YouTube is unreachable from your network…") with a "Re-check" button.
- **`skipIframe` toggle**: opt-out from rendering the iframe at all. Eliminates Chrome's "Unsafe attempt to load..." console warning on restricted networks. Resulting recording is a black video (no source frames).
- **Sample URL pre-filled** + numbered "How it works" steps + a "Try the sample" button. The previous single-input empty state read as "broken page" to new users.

**Callbacks**:
- `checkYouTubeReachable()` — 6-second image race with `setTimeout` fallback.
- `extractVideoId(input)` — 4 regex patterns: `?v=`, `youtu.be/`, `/shorts/`, `/embed/`.
- `handleLoad()` — extract ID, set state, set status to ready.
- `handleUseSample()` — reset URL to sample, auto-load.
- `startRecording()` — `canvas.captureStream(30)` + `new MediaRecorder(stream2, { mimeType: pickMime() })` (picks `vp9,opus` → `vp8,opus` → `webm` → `mp4`). `ondataavailable` pushes to `chunksRef`. `onstop` builds `Blob` from chunks and creates URL. Starts `setInterval` to update `duration`.
- `startCanvasLoop()` — `rAF` loop drawing the iframe onto the canvas. Comment explains the `iframe as unknown as CanvasImageSource` cast: `HTMLIFrameElement` isn't a `CanvasImageSource` per DOM spec, but every browser accepts it at runtime — this is the standard way to grab cross-origin iframe pixels. Try/catch around `drawImage` because CORS-tainted can throw.
- `stopRecording()` — `recorder.stop()`.
- `pickMime()` — at module scope. Tries 4 codecs in order; defaults to `"video/webm"`.

**External libs**: none beyond `react-modal` and FontAwesome (transitive via the parent).

**Non-obvious details**:
- File has 738 lines because of the **enormous explanatory header** (~70 lines) and the multi-state banner rendering. The component's actual logic is ~200 lines.
- The useEffect cleanup is `[]`-deps with a disable comment, like AudioVideoMerger. It revokes `recordedUrl` and clears all timers/raF.
- The Load button is disabled when `youtubeReachability === "checking" || === "unreachable"` — gates the iframe load so we don't pollute the console with the "Unsafe attempt" error when we know it'll fail.
- This is the only component that renders `<canvas>` at a specific size (1280×720) explicitly. All other tools use it as a hidden scratch surface.

---

### 1.15 `ImageToPdf.tsx` (813 lines)

**What it does**: Take a list of up to **9** images and write them into a PDF, entirely in the browser. Uses `pdf-lib` (pure-JS PDF writer) — no server, no wasm, no print dialog.

**State**:
- `images: PdfImageItem[]` — `{ id, file, url, name, size, width, height }`, `url` is the object URL used for the thumbnail
- Options: `pageSize: "a4" | "letter" | "fit"`, `orientation: "portrait" | "landscape"`, `layout: "one" | "grid2x2" | "grid3x3"`, `cellMode: "contain" | "cover"`, `margin: 0–72` pt
- Process: `status: "idle" | "building" | "done" | "error"`, `error`, `notice`
- Output: `pdfUrl`, `pdfSize`, `pageCount`
- Modal: `showReplaceWarning`
- Refs: `inputRef`, `pendingActionRef`, `imagesRef`, `reservedRef`, `pdfUrlRef`

**Callbacks**:
- `addImages(fileList)` — filters to `image/*`, enforces the 9-image cap, decodes each file into an item (`readImageItem` → object URL + `naturalWidth/Height`).
- `removeImage(id)`, `moveImage(index, ±1)`, `clearAll()` — all mutate the list through `commitImages`.
- `buildPdf()` — the pipeline (below).
- `handleDownload()` — dispatches a hidden `<a download>` click.

**The PDF pipeline**:
1. `PDFDocument.create()` → set title/producer/creator.
2. Chunk the images by `LAYOUTS[layout].perPage` (1 / 4 / 9).
3. Per page: `doc.addPage([w, h])`, then per image either
   - **one-per-page**: embed and scale to fit the content box (`Math.min(contentW/w, contentH/h)`), centred;
   - **grid**: compute the cell rect from `cols`/`rows` + an 8pt gutter, then either *contain* (scale + centre) or *cover* (centre-crop in pixels first, then fill the cell exactly).
4. `doc.save()` → `Blob` → object URL.

**Embedding rules**: PNG and JPEG are embedded losslessly straight from the file bytes (`embedPng` / `embedJpg`). Every other browser-readable format (WebP, GIF, BMP, AVIF…) is re-encoded to PNG through a canvas first, because pdf-lib only speaks PNG/JPEG.

**External libs**: `pdf-lib` + `CustomModal`. No FFmpeg, no canvas in the output path.

**Non-obvious details**:
- **The 9-image cap is enforced with a reservation, not just a state read.** `addImages` is async (it decodes each file), so a second pick fired before the first finished would read a stale `images.length` and could push the list past 9. `reservedRef` claims the slots synchronously before the decode loop and releases them in a `finally`, so the cap holds even under concurrent picks.
- **`commitImages` is the single writer for the list.** It updates `imagesRef` synchronously and then calls `setImages`, so the cap check never reads a stale count. The unmount cleanup revokes every object URL via `imagesRef`.
- **"Fit to image" page size** sizes the page to the first image's pixel dimensions (1px = 1pt, capped at 1440pt) and ignores the margin — the page *is* the image. It is disabled for the grid layouts, where a per-page size makes no sense.
- **"Fill cell" needs a pixel-level crop** because PDF has no clipping primitive: `cropToPngBytes` centre-crops the source in a canvas to the cell's aspect ratio, then the cropped PNG is embedded and drawn edge-to-edge.
- **The replace-warning modal covers every mutation, not just uploads.** Adding, removing, and reordering all invalidate a finished PDF, so all of them route through `requestChange`, which shows the 3-button `<CustomModal type="warning">` (Cancel / Discard & continue / Download previous) when a PDF is still on screen. The pending action is stashed in `pendingActionRef`.
- **The file input value is reset after each pick** so choosing the same file twice still fires a change event. The `File` objects are captured before the reset, so nothing is lost.
- Grid rows are laid out top-down: PDF's origin is bottom-left, so row 0 is anchored to `pageHeight - margin - cellH`.

---

## 2. `useFfmpegEngine.ts` — Deep Dive (212 lines)

### 2.1 Module-level singleton state
```ts
let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;
const subscribers: Set<(s: FfmpegEngineStatus) => void> = new Set();
let currentStatus: FfmpegEngineStatus = "loading";
```

Constants:
- `FFMPEG_CORE_BASE = "/ffmpeg-core"` — local URL, served from `public/ffmpeg-core/` (committed).
- `FFMPEG_CORE_VERSION = "0.12.9"` — note: this is the @ffmpeg/core version, NOT @ffmpeg/ffmpeg (which is 0.12.15).
- `FFMPEG_CORE_CDN = "https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm"` — fallback.

### 2.2 Lifecycle
1. `getFfmpegInstance()` is called by `useFfmpegEngine()` on mount.
2. If `ffmpegInstance` is set, return it (subsequent calls).
3. If `loadPromise` is in-flight, return that (dedupes concurrent calls).
4. Otherwise, set `currentStatus = "loading"`, start `loadEngine()`:
   - **SharedArrayBuffer guard**: throws if `typeof SharedArrayBuffer === "undefined" || !window.crossOriginIsolated`. Error message is a 4-line explanation of COOP/COEP that points at the vite.config + vercel.json config.
   - `resolveCoreUrls()` — `fetch(..., {method:"HEAD"})` on `/ffmpeg-core/ffmpeg-core.js`. If `probe.ok`, returns the local URLs; otherwise returns the unpkg URLs.
   - `toBlobURL(coreURL, "text/javascript")` and `toBlobURL(wasmURL, "application/wasm")` from `@ffmpeg/util` — these run `fetch` and wrap the bytes in a Blob URL so the WASM module can `import` them cross-origin under COOP/COEP.
   - `new FFmpeg()` + `inst.on("log", ...)` at `console.debug` (canonical "log at debug so it doesn't spam" pattern, called out in the file header).
   - `await inst.load({ coreURL: coreBlob, wasmURL: wasmBlob })`.
   - Set `ffmpegInstance = inst`, return.
5. On success: `setStatus("loaded")` → all subscribers fire.
6. On error: `console.error`, `setStatus("error")`, reset `loadPromise = null` (so a future mount can retry), re-throw.

### 2.3 Per-component vs global progress
**The progress event is NOT a singleton event.** Each consumer (VideoSplitter, AudioVideoMerger, GifMaker) wires its own `ffmpeg.on("progress", handler)` in a `useEffect`. The singleton's progress events are emitted on the shared instance, so:
- Multiple components can listen simultaneously (their handlers all fire).
- A listener leaks if the component unmounts (see §6.4).
- The engine load log handler IS at module scope (the `inst.on("log", ...)` line in `loadEngine`).

### 2.4 Local-core vs CDN-core fallback
The `resolveCoreUrls()` HEAD probe is the gate. There's no console log of which path was taken — silent success. If `public/ffmpeg-core/ffmpeg-core.js` is missing, the app silently switches to unpkg. The probe catches all errors (DNS, 404, CORS rejection on HEAD) as "fall through to CDN".

### 2.5 React hook
```ts
export function useFfmpegEngine(): FfmpegEngine {
    const [status, setLocalStatus] = useState(currentStatus);
    const [error, setError] = useState<Error | null>(null);
    const [progress] = useState(0);  // unused placeholder
    useEffect(() => {
        let cancelled = false;
        const unsubscribe = subscribeStatus((s) => { if (!cancelled) setLocalStatus(s); });
        getFfmpegInstance().catch((e) => { if (!cancelled) setError(...); });
        return () => { cancelled = true; unsubscribe(); };
    }, []);
    return { ffmpeg: ffmpegInstance, status, progress, error };
}
```

- `ffmpeg` in the returned object is the **same `ffmpegInstance` reference** — not a ref, not state. Consumers read it directly. By the time `status === "loaded"`, this is non-null.
- `progress` in the hook is a placeholder (always 0) — comment: "If a tool needs the engine's progress EVENT (re-encoding progress), it should subscribe to its own FFmpeg instance directly — the hook is only for engine load lifecycle."
- `subscribeStatus` fires `currentStatus` once immediately (so the consumer doesn't have to wait for a transition to see the real status) and on every subsequent change.

### 2.6 Vite config — does it affect ffmpeg?
The onnxruntime-web subpath aliases in `vite.config.ts` (`"onnxruntime-web/webgpu" → "onnxruntime-web"`, same for `webgl`/`cpu`) are **only for `@imgly/background-removal`**. FFmpeg.wasm doesn't touch onnxruntime-web at all. The COOP/COEP headers (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`, `Cross-Origin-Resource-Policy: cross-origin`) ARE shared between them — both libs require `SharedArrayBuffer`. The `worker: { format: "es" }` setting affects Vite's bundling of all web workers (including the `@ffmpeg/ffmpeg` core worker).

---

## 3. Pipeline Architectures

### 3.1 VideoSplitter — Trim pipeline
**Algorithm**: byte-precise stream copy. The cut point is a keyframe-bounded trim; ffmpeg re-muxes without re-encoding, so output quality == input quality and runtime is O(file size), not O(duration).

**Flow**:
1. User picks a file → `handleFileChosen(f)` → `loadVideoFile(f)` (or stashed if previous result exists).
2. `loadVideoFile`:
   - revoke `outputUrl` + `fileUrl`
   - `URL.createObjectURL(f)` → `fileUrl`
   - `probeVideo(f)` → `{duration}` via offscreen `<video>` element
   - set `startTime=0, endTime=duration`
   - fire `extractThumbnails(f, duration)` in background (returns when done, populates `thumbnails`).
3. User drags start/end handles, scrubs timeline, clicks thumbnail.
4. User clicks **Cut video** → `handleCut()`:
   - `setCutPhase("writing")` → `ffmpeg.writeFile(inputName, await fetchFile(file))`
   - `setCutPhase("cutting")` → `ffmpeg.exec(["-ss", String(startTime), "-i", inputName, "-to", String(endTime - startTime), "-c", "copy", outputName])`
   - `setCutPhase("reading")` → `ffmpeg.readFile(outputName)` → `new Blob([data], {type:"video/mp4"})` → `URL.createObjectURL(blob)`
   - `setCutPhase(null)`, `ffmpeg.deleteFile(inputName)`, `ffmpeg.deleteFile(outputName)`
5. User clicks **Download cut video** (standard `<a download>`).

**Why `-ss` before `-i` and not after**: input-side seeking (before the demuxer) is fast — ffmpeg jumps to the keyframe near `startTime` and discards. Output-side `-ss` would require decoding everything up to the cut point, which is the whole point of avoiding.

**Output**: single file, same codec/container as input (well, almost — the `outputName` is hard-coded to `"output.mp4"`, but stream copy preserves the original codec).

**Filename safety**: input is written to virtual FS as `"input" + (file.name.match(/\.\w+$/)?.[0] ?? ".mp4")` — keeps the extension (so ffmpeg's format detection works) and strips everything else (so non-ASCII / weird chars don't break the virtual FS). AudioVideoMerger does the same with `"video" + getExt(...)` and `"audio" + getExt(...)`.

### 3.2 AudioVideoMerger — Merge pipeline
**Algorithm**: re-encode both streams to H.264/AAC for portable output. Filter graph varies by `lengthMode`.

**Flow**:
1. User picks video + audio. Each is probed for `duration` + (video) `width,height`.
2. If durations differ by > 50ms, show the strategy picker. Default: `shortest`.
3. User clicks **Merge** → `handleMerge()`:
   - `safeVideoName = "video" + getExt(videoFile.name)`, `safeAudioName = "audio" + getExt(audioFile.name)`
   - `setMergePhase("writing-video")` → `ffmpeg.writeFile(safeVideoName, await fetchFile(videoFile))`
   - `setMergePhase("writing-audio")` → `ffmpeg.writeFile(safeAudioName, await fetchFile(audioFile))`
   - `setMergePhase("encoding")` → `ffmpeg.exec(buildArgs(...))` — see filter graphs below
   - `setMergePhase("reading")` → `ffmpeg.readFile(outName)` → Blob → URL
   - `setMergePhase(null)`, delete 3 virtual-FS files in try/catch.

**`buildArgs` filter graphs** (the most important detail):
- **`shortest`** (default / fallback): `[no filter_complex]` then `-map 0:v:0 -map 1:a:0 -shortest`. ffmpeg stops at whichever stream ends first. `v=1:a=0` no longer needed (the `-map` syntax replaces it).
- **`longest` + known durations**: `-filter_complex "[1:a]apad[a];[0:v]tpad=stop_mode=clone:stop_duration=99999[v]" -map [v] -map [a] -t max`. `apad` pads audio with silence; `tpad=clone:99999` clones the last video frame for up to 99999s. The `-t` truncates to the exact target duration. Comment: "The filter graph names the outputs [v] and [a] which we then map into the output."
- **`trim-to-video`**: `-map 0:v:0 -map 1:a:0 -t videoDuration`. Simple hard cut.
- **`trim-to-audio`**: same with `audioDuration`.

**Codec args** (always): `-c:v libx264 -preset ultrafast -crf 23 -c:a aac -b:a 192k -pix_fmt yuv420p -movflags +faststart`. Re-encode is the price for portability — see the file header's "Why re-encode instead of stream-copy" section.

**Output filename**: `${videoMeta.name}-merged.mp4` (uses the original video's basename, lowercased extension stripped via `.replace(/\.[^.]+$/, "") || "merged"`).

**Note on `inst.exec(args)` cast**: the v0.12 type expects an `ExecOptions` object `{ input, output, args }`. The code passes a bare `string[]` and casts `as any`. Comment: "ffmpeg.wasm expects an ExecOptions object (so the lib knows which input names to clean up) rather than a bare string[]. ... eslint-disable-next-line @typescript-eslint/no-explicit-any". This is a minor type-vs-runtime divergence.

### 3.3 GifMaker — 3-stage pipeline (Prepare → Convert → Compress)

This is the newest and most complex component. Designed as 3 explicit steps so the user sees what's happening and the slow GIF encode is always intentional.

**State model**:
```
idle → preparing → ready → converting → compressed
                              ↑
                              └─── compressing (reuses "converting" status)
       ↘                        ↘
        error                   error
```

**Segment list** — discriminated union, ordered, editable:
- **Add video** (`handleAddVideo` → `commitAddVideo`): probes duration + dimensions via a one-shot `<video>`, generates an 8-frame filmstrip via `generateFilmstrip(url, duration)`, creates a new segment `{kind:"video", id, file, url, meta, trim:{start:0,end:duration}, filmstrip:string[]}`, appends, auto-selects.
- **Add image** (`handleAddImage` → `commitAddImage`): probes dimensions via `Image()`, creates `{kind:"image", id, file, url, meta, duration:3}`.
- **Reorder**: `handleMoveUp`/`Down` swap adjacent elements.
- **Remove** (`handleRemove`): filters out and revokes the segment's `url` (blob URL).
- **Edit trim** (`handleUpdateVideoTrim`): updates `trim.{start|end}`, clamps to `[0, duration]`, enforces `start < end - 0.1` by pulling the dragged field back.
- **Edit image duration** (`handleUpdateImageDuration`): updates `duration`, clamps `≥ 0.1`.
- **Total duration**: `segments.reduce((acc, s) => acc + (video ? trim.end-trim.start : duration), 0)` — shown in the segment-list header.

**Filmstrip generation** (`generateFilmstrip`, async helper):
- Off-screen `<video preload="auto" muted playsInline>`, `await new Promise` of `loadeddata` with 10s safety timeout.
- Wait for `readyState >= 2` or `oncanplay` (the first seek can return black otherwise on Chrome).
- 8 timestamps distributed across the duration: `i=0` is `t=0`, `i=7` is `t=duration-0.05` (avoid end-of-stream ambiguity), middle frames are `(i / 7) * duration`.
- For each, `await new Promise` of `seeked` with 500ms safety timeout, then `ctx.drawImage(video, 0, 0, 100, height)`, then `canvas.toDataURL("image/jpeg", 0.6)`.
- Returns `string[]` of data URLs. Failures return `[]` (segment is still usable without thumbnails).

**Per-segment filmstrip display** in the card (in render):
- Row of 8 thumbnails in a flex row.
- Two absolute-positioned dark masks outside the `[start, end]` window: `width: leftPct%` on the left, `width: rightPct%` on the right. `pointer-events: none`.
- Two 2px orange lines at the trim boundaries. Visual cue for the cut point.

#### 3.3.1 Stage 1 — Prepare (FFmpeg concat → MP4)

**Goal**: Join all segments into a single, dimension-normalized MP4 that the user can preview before committing to the slow GIF encode.

**Why**: A single FFmpeg command could go segments → GIF, but the user would have no preview. The Prepare intermediate means the slow GIF step is always intentional.

**Flow** (`handlePrepare`):
1. **Write segments to virtual FS**: `seg0.mp4`, `seg1.mp4`, … for videos, `segN.png`/`.jpg`/etc. for images. The extension is from the original filename (`seg.file.name.split(".").pop()?.toLowerCase() || "png"`) — ffmpeg sniffs the magic bytes, the extension is for format detection. Progress: `setProgress(Math.round(((i + 1) / segments.length) * 30))`.
2. **Build the filter_complex**:
   ```ts
   const targetH = Math.max(2, Math.round((maxWidth * 9) / 16 / 2) * 2);
   for each segment:
     if video: argParts.push("-ss", trim.start, "-t", trim.end-trim.start, "-i", name);
              filterParts.push(`[${i}:v]scale=${maxWidth}:${targetH}:force_original_aspect_ratio=decrease,
                                 pad=${maxWidth}:${targetH}:(ow-iw)/2:(oh-ih)/2,
                                 setsar=1, fps=30, setpts=PTS-STARTPTS[v${i}]`);
     if image: argParts.push("-loop", "1", "-t", duration, "-i", name);
              filterParts.push(`[${i}:v]scale=${maxWidth}:${targetH}:force_original_aspect_ratio=increase,
                                 crop=${maxWidth}:${targetH}, setsar=1, fps=30, setpts=PTS-STARTPTS[v${i}]`);
   const concatInputLabels = "[v0][v1]…[vN]";
   filterParts.push(`${concatInputLabels}concat=n=${N}:v=1:a=0[outv]`);
   ```
   - **Why scale + pad** (not just scale): concat filter requires matching dimensions across all inputs. If two source videos are 16:9 and 4:3, a naive scale-to-maxWidth wouldn't match heights → concat produces 0×0 output. The pad operation letterboxes/pillarboxes to the exact target size.
   - **Why `force_original_aspect_ratio=decrease` for video and `=increase` for image**: video gets letterboxed (preserves entire frame); image gets cover-cropped (small images fill the box without letterboxing).
   - **Why `setpts=PTS-STARTPTS`**: resets timestamps so the concat filter sees continuous time across the trimmed clip.
   - **Why `setsar=1`**: forces 1:1 sample aspect ratio. Some cameras/encoders set SAR != 1, which would make ffmpeg's scale produce non-square pixels and the concat would mismatch.
   - **Why `fps=30`**: normalizes all inputs to 30fps. Concat needs matching frame rates.
   - **Why `-ss` and `-t` BEFORE `-i` for video** (input-side seek + duration): fast — ffmpeg jumps to the keyframe near `trim.start` and stops at `trim.start + duration`. Post-input seek would require decoding the whole thing.
   - **Why `-loop 1 -t N` for image**: makes ffmpeg treat the image as a 1-frame video source, looping it for N seconds. `-loop 1` + `-t` is the canonical idiom.
   - **Why `targetH` is rounded to a multiple of 2**: libx264's yuv420p encoder rejects odd heights (chroma subsampling requires 2-aligned dimensions).
3. **Run the merge**: `argParts.push("-filter_complex", filterParts.join(";"), "-map", "[outv]", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "prepared.mp4")`. Then `await ffmpeg.exec(argParts)`.
4. **Read back + probe**: `ffmpeg.readFile("prepared.mp4")` → `new Blob([data], {type:"video/mp4"})` → `URL.createObjectURL(blob)`. Probe duration/dimensions via offscreen `<video>`. If `videoWidth === 0 || videoHeight === 0`, surface as error (concat filter rejected the inputs).
5. **State**: `setStatus("ready")`, `setProgress(100)`. Note: **the virtual FS files are left in place** — we'll need them for the Convert step (which doesn't use them — it uses `preparedUrl`)… actually no, Convert uses the `preparedUrl` blob URL, not the virtual FS. The virtual FS entries are leaked until the user clicks Clear or the component unmounts. (Minor: handleClear doesn't `deleteFile` them either.)

#### 3.3.2 Stage 2 — Convert (gif.js frame extraction)

**Goal**: Turn the prepared MP4 into an unoptimized GIF.

**Algorithm** (in `handleConvert`):
1. **Loop through timestamps**: `totalFrames = Math.floor(preparedDuration * fps)`, `t = i / fps` for each. `await seekTo(t)` (1-second safety timeout).
2. **Capture frame**: `ctx.drawImage(v, 0, 0, outputW, outputH)`, `ctx.getImageData(0, 0, outputW, outputH)`. Push to `frames: { data: Uint8ClampedArray, delay: number }[]`. Progress: `setProgress(Math.round(((i+1)/totalFrames) * 50))`.
3. **Build gif.js**: `new GIF({ workers:2, quality:10, width:outputW, height:outputH, workerScript:"/gif.worker.js" })`.
4. **Add frames**: `frames.forEach(f => { const imgData = new ImageData(new Uint8ClampedArray(f.data), outputW, outputH); gif.addFrame(imgData, { delay: f.delay }); })`. The `new Uint8ClampedArray(f.data)` is a copy — gif.js may mutate the buffer, and we don't want to corrupt the next frame.
5. **Listen**:
   - `gif.on("progress", p => setProgress(50 + Math.round(p*50)))` — second 50%.
   - `gif.on("finished", blob => { setGifUrl(URL.createObjectURL(blob)); setGifSize(blob.size); setProgress(100); setStatus("compressed"); })`.
6. **Render**: `gif.render()`. Returns immediately; the workers do the work and call `onfinished` later.

**Output dimensions**: `outputW = maxWidth`, `outputH = Math.round(maxWidth * (v.videoHeight / v.videoWidth))`. Uses the live video element's aspect ratio, not the prepared video's encoded dimensions.

**State transitions**: `preparing/ready → converting → compressed` (note: Convert goes directly to `compressed` status because the success state is the same for Convert and Compress).

#### 3.3.3 Stage 3 — Compress (gifuct-js + gif.js re-encode)

**Goal**: Shrink the unoptimized GIF.

**Algorithm** (in `handleCompress`):
1. **Fetch the GIF**: `const resp = await fetch(gifUrl); const buf = await resp.arrayBuffer();`. `fetch(blobUrl)` works on blob URLs.
2. **Decode**: `const gif = parseGIF(buf); const frames = decompressFrames(gif, true) as unknown as { dims, patch, delay, disposalType }[]`. The `true` arg means "return patches" (the raw RGBA bytes for each frame's dirty region) — necessary for re-encoding.
3. **Prepare two canvases**:
   - `canvas` at full source `width × height` (the "working canvas" — accumulates frame deltas)
   - `scaleCanvas` at `outputW × outputH` (where `outputW = round(width * compressScale/100)`) — the output buffer
4. **Loop through kept frames** (filtered by `i % compressFrameSkip === 0`):
   - If `disposalType === 2` (clear to background), `ctx.clearRect(0, 0, width, height)`. Comment: "the only correct way to compose deltas."
   - `ctx.putImageData({data:patch, width:dim.width, height:dim.height} placed at (dim.left, dim.top))` — applies this frame's dirty region.
   - `scaleCtx.fillStyle = "#000"; scaleCtx.fillRect(...)` — fill output with black (for the letterbox/pillarbox where source pixels don't reach).
   - `scaleCtx.drawImage(canvas, 0, 0, outputW, outputH)` — downscale.
   - `gif.addFrame(scaleCtx.getImageData(...), { delay: f.delay || 100 })`.
5. **Listen + render** as in Convert.

**Scale range**: `compressScale: 10–100%` (default 75%). The user can crank it down to 10% for tiny GIFs.

**Why the same `disposalType === 2` logic as GifCompressor**: GIF frames store deltas, not full frames. `disposalType 2` means "before drawing the NEXT frame, clear the canvas". Without honoring it, you'd see ghost frames from previous dirty regions.

### 3.4 GifCompressor — single-stage pipeline
Same as GifMaker's Compress step but operates on a freshly-uploaded GIF instead of a previously-converted one. Uses `decodeCacheRef` to hold the frames between the decode and re-encode (GifMaker re-fetches every time). The component is kept because the upload-GIF-then-shrink flow is a common need; GifMaker is for "build a GIF from sources".

### 3.5 VideoToGif — single-stage pipeline
Same as GifMaker's Convert step but with hardcoded 5-second end time and no Prepared MP4. The user picks a video, the component seeks through `[start, end]` and feeds the frames to gif.js. No ffmpeg involvement at all.

### 3.6 ImageFormatConverter — single-stage pipeline
Off-screen `<canvas>` + `drawImage` + `toBlob(mime, quality/100)`. The `flattenOnExport` option does a `ctx.fillStyle = flattenColor; fillRect(0,0,w,h)` before drawing. That's the entire "pipeline".

---

## 4. Routing & Sidebar Flow

### 4.1 Enum values
`MultimediaEnum.ts` exports one enum (`SectionType`) with 9 string values (see §1.1). The string values are the human labels (used in `TOOLS[].label` in Sidebar).

### 4.2 Sidebar
- Renders a 16-wide vertical icon bar.
- `TOOLS` array (8 entries, YouTube commented out) maps each `SectionType` to a FontAwesome icon + label.
- `handleClick(section)`:
  1. `setActiveSection(section)` — updates Zustand store.
  2. If `!isWorkspaceVisible`, `toggleWorkspace()` — opens the workspace.
- Active state: `bg-orange-500 text-white`. Hover: `hover:text-orange-400 hover:bg-gray-700`.

### 4.3 Store
Zustand `useMultimediaStore` (see §1.2) is the only cross-component state in the feature. It's persisted across tool switches (Zustand has its own memory persistence by default — not localStorage-backed unless explicitly configured). Stale `YOUTUBE_CAPTURE` values are tolerated: Workspace just renders nothing.

### 4.4 Workspace
Pure if-chain on `activeSection`. Each branch renders one tool eagerly imported. There is no lazy loading — every tool's bundle is in the main chunk. The YouTube branch is intentionally absent (comment: "render nothing rather than pulling in the disabled component"). This is the only routing logic in the entire feature.

### 4.5 Default landing
`BACKGROUND_REMOVER`. Comment in the store explains why: "YouTube Capture was the previous default but is temporarily hidden".

---

## 5. Cross-cutting Patterns

### 5.1 "Previous result will be lost" warning modal
Used in **VideoToGif, GifCompressor, GifMaker, VideoSplitter, AudioVideoMerger**. Pattern:
- `pendingFileRef` (or `pendingFileRef` with `kind` discriminator in AudioVideoMerger) holds the new file + its blob URL.
- `handleXChosen(file)`:
  - If a previous result is on screen (`status === "done" && !!outputUrl` or `!!gifUrl`), stash + `setShowResetWarning(true)`.
  - Otherwise, commit immediately.
- `applyPendingFile()` discards the pending and runs the actual load.
- Three CustomModal actions:
  - **Cancel** (gray) — drop the pending file, clear `inputRef.current.value`.
  - **Discard & continue** (red) — drop the previous result (revoke its URL), load the new file.
  - **Download previous** (green) — save the previous result as a file via `<a download>`, then load the new file.

**Asymmetry in GifMaker**: the modal fires on `handleAddVideo/Image` (adding a new segment), not on "loading a new source file". The "Download previous" path keeps the existing GIF and ADDS the new segment — users can build multiple GIFs. The "Discard" path also clears `preparedUrl` (the segment list changed, so the prepared video is no longer valid).

**AudioVideoMerger variant**: `pendingFileRef.current.kind = "video" | "audio"` tags which slot the new file is for. `applyPendingFile` dispatches to `loadVideoFile` or `loadAudioFile`.

### 5.2 Blob URL lifecycle
**Mostly consistent, with intentional exceptions.** Standard pattern: every blob URL is created via `URL.createObjectURL` in one of:
- `loadVideoFile` / `loadAudioFile` / `handleFile` / `commitAddVideo` / `commitAddImage` (state load)
- `URL.createObjectURL(blob)` after ffmpeg `readFile` (engine output)
- `URL.createObjectURL(blob)` after `toBlob` (canvas output)

And revoked in:
- `reset()` / `handleClear` (full reset)
- `applyPendingFile` chains
- `handleRemove` (segment removal in GifMaker)
- `handleDiscardPreviousAndContinue` (modal action)
- `useEffect` unmount cleanup (in AudioVideoMerger + YouTubeCapture; commented as deliberate in GifMaker to avoid StrictMode double-mount issues)

**ImageFormatConverter** is the only component that doesn't track blob URLs in state but in `resultUrl` only. Its `reset()` revokes both. The component re-creates the URL on every Convert.

**VideoSplitter** holds `fileUrl` in state explicitly (not a derived value in JSX) to prevent the `<video src>` from changing on every render — see §1.11.

**Blob URL leak risks**:
- AudioVideoMerger + YouTubeCapture have unmount-cleanup useEffects. GifMaker, GifCompressor, VideoToGif, VideoSplitter, BackgroundRemover, ImageFormatConverter rely on explicit reset/clear paths (acceptable because the tool is only unmounted when the user navigates away from the multimedia feature, at which point the whole page's blob URLs are released by the browser).
- GifMaker's Prepare step writes segments to ffmpeg's virtual FS but doesn't `deleteFile` them in `handleClear`. The user has to refresh the page to fully reclaim that memory. Minor.

### 5.3 CustomModal usage
Drives the "previous result" warning, but also used elsewhere (Calendar, Map flows). API:
```ts
<CustomModal
    isOpen={...}
    onRequestClose={...}
    title="..."
    type="info" | "success" | "warning" | "error"  // drives icon + title color
    actions={[                                          // replaces legacy confirm/cancel
        { label, onClick, className, autoClose? }
    ]}
>
    {children}                                          // rich body
</CustomModal>
```
- `type="warning"` is used in all "previous result" prompts.
- The 3-action array (Cancel / Discard / Download) is the canonical pattern.
- Action ordering: destructive/cancel on the left, primary on the right.

### 5.4 Soft-yellow "engine not ready" notice
- **GifMaker**: `bg-yellow-900/30 border-yellow-700 text-yellow-200` with `faTriangleExclamation`. Wording: "Loading the video engine. The Prepare button will work once it's ready." — explicit, not technical.
- **VideoSplitter / AudioVideoMerger**: `bg-blue-900 border-blue-700 text-blue-200` with "Loading video engine…" — different palette, different word ("Loading" not "Loading the video engine").
- **BackgroundRemover**: `bg-yellow-900 border-yellow-700 text-yellow-200` for the "first run: model download" warning. Different concern (model download, not engine load).
- **AudioVideoMerger**: separate `showWarning` for `ffmpegStatus === "error"` uses `bg-yellow-900/40 border-yellow-700/60 text-yellow-200` with `faCircleInfo` — soft, not scary.

### 5.5 Phase tracking + indeterminate animation
Pattern from memory, used in:
- **VideoSplitter**: `cutPhase: "writing" | "cutting" | "reading" | null` + `animate-indeterminate` class for the `progress === 0` case (stream copy never fires progress events).
- **AudioVideoMerger**: `mergePhase: "writing-video" | "writing-audio" | "encoding" | "reading" | null` + indeterminate bar for the file-write phases.
- **GifMaker**: status is the only tracker (`idle | preparing | ready | converting | compressed | error`); uses indeterminate bar for the Prepare "writing segments" portion and the Convert "seeking" portion.

The CSS animation is `.animate-indeterminate` — a sliding 1/3-wide orange-500/70 bar. Tailwind config somewhere defines it; the `h-full w-1/3 bg-orange-500/70 animate-indeterminate rounded` class combo is used identically in all three components.

### 5.6 No `window.alert/confirm/prompt`
Memory note: never use the browser's native dialogs. The `CustomModal` is the canonical replacement. The single exception is `ImageFormatConverter` line 103: `alert("Conversion failed: " + (e as Error).message);` — this is a pre-existing slip-through or a deliberate exception (no "previous result" risk in this tool). The memory note is followed strictly in the other 7 tools.

---

## 6. Known Gotchas

### 6.1 SharedArrayBuffer → COOP/COEP
FFmpeg.wasm requires `SharedArrayBuffer`, which the browser only exposes in a cross-origin-isolated context. The page must send:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Resource-Policy: cross-origin`

These are set in **two places that must stay in sync**:
1. `vite.config.ts` — both `server.headers` (dev) and `preview.headers` (preview server).
2. `vercel.json` — production deploy, applied to all routes via `/(.*)`.

**What happens if they're missing**: `useFfmpegEngine` throws in `loadEngine` (the `SharedArrayBuffer` guard). The error is `setError`d in the React state but not surfaced to the user via a banner. The Cut/Merge/Prepare buttons are simply disabled (`disabled={ffmpegStatus !== "loaded"}`).

**GifMaker's soft-yellow notice wording** is deliberate — the comment in §5.4 above is intentional: "the exact wording matters — see the memory note about not surfacing implementation details (COOP/COEP, SharedArrayBuffer) in user-visible text."

### 6.2 onnxruntime-web subpath aliases
`@imgly/background-removal` tries to dynamically import `onnxruntime-web/webgpu` and `onnxruntime-web/cpu` for hardware acceleration. These subpaths don't exist in the package's `exports` field (the package only exports the default entry, which auto-detects at runtime). Vite's resolver fails on the dynamic import.

The fix in `vite.config.ts`:
```ts
resolve: {
    alias: {
        "onnxruntime-web/webgpu": "onnxruntime-web",
        "onnxruntime-web/cpu": "onnxruntime-web",
    },
},
optimizeDeps: {
    include: ['mathjax-full', 'onnxruntime-web', 'onnxruntime-web/webgl'],
},
build: {
    rollupOptions: {
        external: ["onnxruntime-web/webgpu", "onnxruntime-web/webgl"],
    },
},
```

Three different subpaths (webgpu, webgl, cpu) are handled in three different places (alias / optimizeDeps.include / external). The WebGPU and WebGL backends are externalized in production builds so the bundler doesn't try to ship them; the dev server resolves them via `optimizeDeps`. The CPU backend is just aliased.

**Does this affect FFmpeg?** No. `@ffmpeg/ffmpeg` doesn't touch onnxruntime-web. Only BackgroundRemover needs this config.

### 6.3 gifuct-js type lie
`decompressFrames(gif, true)` with the `true` flag means "return patches (raw RGBA bytes for each frame's dirty region)". The TS types claim the return is `ParsedFrame[]` (without `patch`), even though the runtime DOES include `patch`. Every consumer casts through `unknown`:
- `GifCompressor.tsx:133`: `const frames = decompressFrames(gif, true) as unknown as DecodedFrame[];`
- `GifMaker.tsx:774`: same pattern.

Comment in GifCompressor: "gifuct-js's TS types claim `decompressFrames(gif, true)` returns `ParsedFrame[]` (without `patch`) even though the second arg means 'return patches'. The runtime actually does include `patch` — that's the whole point of `true`. We cast through `unknown` to silence the type error without lying to ourselves about the cast."

### 6.4 FFmpeg progress listener leak
`useEffect(() => { ffmpeg.on("progress", handler); }, [ffmpeg])` in VideoSplitter, AudioVideoMerger, GifMaker. The comment in VideoSplitter acknowledges: "the progress event is fired by the shared FFmpeg instance, so the listener persists across remounts — that's OK, the setState in a defunct component is a no-op. If we want to be tidy later we can call inst.off() in cleanup, but `@ffmpeg/ffmpeg` 0.12 doesn't expose off(), so this is the pragmatic answer."

Same pattern repeated in all three consumers — the comment is in the hook file and the consumers reference it.

### 6.5 YouTube iframe "Unsafe attempt" warning
Not a "hang" — it's a Chrome console warning that fires when an iframe element tries to navigate to a different origin (YouTube, when embedded). The YouTubeCapture component documents and mitigates this with the `skipIframe` toggle (opt-out from rendering the iframe at all) and the reachability pre-check (gate the Load button on `youtubeReachability !== "checking" && !== "unreachable"`). When the user is on a network that blocks YouTube (mainland China, corporate firewall), the warning was deemed "just noise" — the skip toggle silences it but produces a black recording.

No actual hang. The component is not "incomplete" — it's just disabled in the UI for network-compatibility reasons. The export still exists and could be re-enabled by uncommenting the entries in `Sidebar.tsx` and `Workspace.tsx`.

### 6.6 Dead code / incomplete code
- **`Sidebar.tsx`**: the `YOUTUBE_CAPTURE` entry in the `TOOLS` array is commented out. The Workspace import is also commented out. The `SectionType.YOUTUBE_CAPTURE` enum value is intentionally retained to avoid a crash on stale localStorage.
- **`AudioVideoMerger.tsx`**: the `LengthMode` type is in `LengthOption`'s props but never used inside the component (the `mode` prop is required by TS but ignored in the body). Minor.
- **`VideoToGif.tsx`**: the `Status = "idle" | "ready" | "encoding" | "done" | "error"` has `"ready"` but the code never transitions to it.
- **`AudioVideoMerger.tsx`**: same — `Status = "idle" | "ready" | "merging" | "done" | "error"` has unused `"ready"`.
- **GifMaker**: `useFfmpegEngine` returns `progress: 0` (always), the comment notes it's a placeholder. The component doesn't use it — it manages its own progress state for Convert/Compress. The hook's `progress` field is dead.
- **`ImageFormatConverter.tsx`**: uses `window.alert` on conversion failure (line 103) — see §5.6.
- **No TODO/FIXME/HACK markers** anywhere in the feature (confirmed by grep).

### 6.7 ASCII filename stripping
`AudioVideoMerger` strips non-ASCII from input filenames before writing to ffmpeg's virtual FS (lines 469-470):
```ts
const safeVideoName = "video" + getExt(videoFile.name);
const safeAudioName = "audio" + getExt(audioFile.name);
```
Comment: "ffmpeg.wasm requires ASCII-only filenames in its virtual FS. Strip non-ASCII from the input filenames to dodge the 'Invalid data found when processing input' surprise."

`VideoSplitter` does the same with `"input" + (file.name.match(/\.\w+$/)?.[0] ?? ".mp4")` (line 645).

`GifMaker` doesn't strip — it uses `seg0.mp4`, `segN.png` etc. (synthesized names, no user input).

### 6.8 The `// eslint-disable-next-line react-hooks/exhaustive-deps` pattern
Used in three places, all for the "fire once on unmount only" pattern (not a "fire when deps change" pattern):
- `VideoSplitter.tsx:774` — re-clamp start/end if new file has shorter duration; depends only on `meta`.
- `AudioVideoMerger.tsx:581` — unmount cleanup.
- `YouTubeCapture.tsx:355` — unmount cleanup (timer + rAF + URL revoke).

Each has a comment explaining why the disable is correct.

### 6.9 `Crypto.randomUUID` in GifMaker
`commitAddVideo` and `commitAddImage` use `crypto.randomUUID()` for segment IDs. Requires a secure context (HTTPS or localhost). Both Vite dev and Vercel production are secure contexts, so this is fine. No fallback to `Date.now()` or counter.

---

## 7. Design Doc Cross-Reference Summary

When writing the final design doc, the key things to capture:

1. **The singleton engine pattern** (§2) is the architectural keystone — every other FFmpeg consumer relies on the "one engine, multiple components" invariant. The `subscribers` Set + module-scope `ffmpegInstance` is the cleanest implementation of this in React.

2. **The 3-stage GIF pipeline** in GifMaker (§3.3) is the feature's headline complexity. The Prepare intermediate is the design decision to highlight: "let the user preview before the slow encode" is a UX win, not a technical compromise.

3. **The `lengthMode` filter_complex** in AudioVideoMerger (§3.2) is the most under-documented feature in the codebase. The header explains the "why re-encode" decision well, but the 4 filter graphs are easy to get wrong.

4. **The "previous result will be lost" modal** (§5.1) is the cross-cutting UX pattern. Worth documenting as a feature, not an edge case.

5. **The COOP/COEP dependency** (§6.1) is the single biggest production-deployment gotcha. The vite.config.ts ↔ vercel.json coupling should be called out as a maintenance hazard.

6. **The onnxruntime-web subpath aliases** (§6.2) are a separate production gotcha. They only affect BackgroundRemover, but they're in the central vite config — worth documenting alongside the COOP/COEP config.

7. **The hidden YouTubeCapture** (§1.14) is the feature's "what we removed and why" footnote. Documenting it preserves the institutional knowledge (the GFW / corporate firewall reasoning) for the next person who looks at this code.
