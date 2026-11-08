// src/router/routes.ts
import { lazy } from "react";

export const routes = [
  {
    path: "/",
    element: lazy(() => import("@/pages/home/Home")),
  },
  {
    path: "/about",
    element: lazy(() => import("@/pages/about/About")),
  },
  {
    path: "/contact",
    element: lazy(() => import("@/pages/contact/Contact")),
  },
  {
    path: "/signin",
    element: lazy(() => import("@/pages/signin/Signin")),
  },
  {
    path: "/signup",
    element: lazy(() => import("@/pages/signup/Signup")),
  },
  {
    path: "/api-explorer",
    element: lazy(() => import("@/features/api-explorer/pages/ApiExplorerPage")),
  },
  {
    path: "*",
    element: lazy(() => import("@/pages/not-found/NotFound")),
  },
];