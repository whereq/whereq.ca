/// <reference types="vite/client" />

interface ImportMetaEnv {
    /**
     * The Google Maps API key the deployment falls back to when the visitor
     * has not saved one of their own. Vite bakes `VITE_*` variables into the
     * client bundle, so this is a public value.
     */
    readonly VITE_GOOGLE_MAPS_API_KEY?: string;
    /**
     * The cloud-styled map ID the deployment falls back to. Not a secret.
     */
    readonly VITE_GOOGLE_MAPS_MAP_ID?: string;
}

declare module "*.svg" {
  import React from "react";
  const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { className?: string }>;
  export default ReactComponent;
}