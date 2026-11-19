import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [react(), tailwindcss(), svgr()],
  resolve: {
    alias: {
      '@': '/src',
      // @imgly/background-removal tries to dynamically import
      // onnxruntime-web/webgpu and onnxruntime-web/cpu; those subpaths
      // don't exist in the package's exports field. Map them to the
      // default entry, which auto-detects WASM/WebGL at runtime.
      "onnxruntime-web/webgpu": "onnxruntime-web",
      "onnxruntime-web/cpu": "onnxruntime-web",
    },
  },
  assetsInclude: ["**/*.svg"], // Ensure SVGs are treated as assets
  optimizeDeps: {
    include: ['mathjax-full', 'onnxruntime-web', 'onnxruntime-web/webgl'],
  },
  server: {
    headers: {
      // Required by FFmpeg.wasm (SharedArrayBuffer) and other COOP/COEP-using libs.
      // In production, hosting (Vercel) must send the same headers. The Vercel
      // deploy config is at the project root: /vercel.json — its `headers` block
      // must stay in sync with these three values, or the cut/merge/etc.
      // features that need SharedArrayBuffer will silently fail to load the
      // video engine in production.
      //
      // COEP is "credentialless" rather than "require-corp": both give
      // crossOriginIsolated (and therefore SharedArrayBuffer), but
      // "require-corp" also refuses every cross-origin resource that does not
      // opt in with Cross-Origin-Resource-Policy. Google's map imagery does
      // not, so "require-corp" left the /map feature with an empty map.
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
    proxy: {
      '/realms/whereq': {
        target: 'https://www.keytomarvel.com',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  preview: {
    // Same headers for `vite preview` so you can smoke-test before deploy.
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
  },
  worker: {
    format: "es",
  },
  build: {
    rollupOptions: {
      // @imgly/background-removal does a dynamic import of
      // onnxruntime-web/webgpu for WebGPU acceleration. The WASM fallback
      // path works without it. Mark it as external so the production
      // bundler doesn't try to resolve / include it; the dev server
      // resolves it via optimizeDeps.
      external: ["onnxruntime-web/webgpu", "onnxruntime-web/webgl"],
    },
  },
})
