import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './App.css'
import './styles/global.css'
import Modal from 'react-modal'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext.tsx'
import ErrorBoundary from './ErrorBoundary.tsx'

// Polyfill for global object
if (typeof global === "undefined") {
  (window as typeof globalThis).global = window;
}

// Suppress known noisy unhandled-promise-rejections that come from
// browser extensions, NOT from our app. We can't silence these at
// the source because the extension's content script is the one
// rejecting the promise — we just don't want them cluttering the
// console (and confusing the user with red errors that suggest our
// code is broken).
//
// Patterns filtered:
//   1. "A listener indicated an asynchronous response by returning
//      true, but the message channel closed before a response was
//      received" — thrown by Chrome when an extension's
//      chrome.runtime.onMessage listener returns true (async) but
//      the message channel closes before sendResponse is called.
//      MetaMask and several other crypto/wallet extensions hit
//      this on every page load; the error is logged in the page's
//      console (line 1 of the bundle) but the cause is the
//      extension, not us.
if (typeof window !== "undefined") {
  const KNOWN_EXTENSION_ERROR_SUBSTRINGS = [
    "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received",
  ];
  window.addEventListener("unhandledrejection", (event) => {
    const message = event.reason instanceof Error ? event.reason.message : String(event.reason);
    if (KNOWN_EXTENSION_ERROR_SUBSTRINGS.some((s) => message.includes(s))) {
      // Swallow the rejection — known noise from a browser
      // extension, nothing actionable for us or the user.
      event.preventDefault();
    }
  });
}


// Set the app element for react-modal
Modal.setAppElement("#root");

// Create a new QueryClient instance
const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
