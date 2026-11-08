import logUtil from "@/utils/logUtil";

export const addPathListeners = (
  path: google.maps.MVCArray<google.maps.LatLng>
) => {

  path.forEach((_, index) => {

    google.maps.event.addListener(path, "rightclick", (event: google.maps.PolyMouseEvent) => {
      logUtil.log(index)
      if (event.vertex !== undefined) {
        const vertexIndex = (event as unknown as { vertex: number }).vertex;
        if (vertexIndex !== undefined) {
          logUtil.log(`Right-click on vertex ${vertexIndex}`);
        }
      }
    });
  });

  // Attach a generic listener for path changes (e.g., during edits)
  google.maps.event.addListener(path, "set_at", (index: number) => {
    logUtil.log(`Path updated at vertex ${index}`);
  });

  google.maps.event.addListener(path, "insert_at", (index: number) => {
    logUtil.log(`Vertex inserted at ${index}`);
  });

  google.maps.event.addListener(path, "remove_at", (index: number) => {
    logUtil.log(`Vertex removed at ${index}`);
  });
};

export const attachListenersToEditablePolygon = (
  polygon: google.maps.Polygon,
) => {

  const path = polygon.getPath();

  addPathListeners(path);

  // Monitor changes to the path and reattach listeners as needed
  // google.maps.event.addListener(path, "insert_at", () => addPathListeners(path));
  // google.maps.event.addListener(path, "remove_at", () => addPathListeners(path));
  // google.maps.event.addListener(path, "set_at", () => addPathListeners(path));
};
