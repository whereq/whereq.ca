import { Outlet } from "react-router-dom";
import { Header } from "@/layouts/Header/Header";
import { Footer } from "@/layouts/Footer/Footer";

/**
 * The WhereQ Lab app shell — a fixed-position 3-row grid.
 *   ┌─ header (fixed, h-[3.125rem]) ──────┐
 *   │ main (scrolls, top/bottom padding)  │  ← 100vh - 6.25rem
 *   ├─ footer (fixed, h-[3.125rem]) ──────┤
 *   └─────────────────────────────────────┘
 *
 * Both header and footer use `fixed` positioning; `<main>` is the only
 * scroll container and its height = 100vh − header − footer. Route content
 * renders into the `<Outlet />`.
 *
 * The full-bleed Universe page renders outside this shell (see AppRouter).
 */
export const ShellLayout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <Header />
      <main
        className="flex-grow overflow-y-auto"
        style={{
          height: "calc(100vh - 6.25rem)",
          marginTop: "3.125rem",
          marginBottom: "3.125rem",
        }}
      >
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
