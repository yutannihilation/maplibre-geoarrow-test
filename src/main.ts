import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";
import { createStarLayer } from "./starLayer";

const map = new maplibregl.Map({
  container: "map",
  style: "https://demotiles.maplibre.org/style.json",
  zoom: 6,
  center: [139.7, 35.8],
  canvasContextAttributes: { antialias: true },
});

map.on("style.load", () => {
  map.setProjection({
    type: "globe", // Set projection to globe
  });
});

const projectBtn = document.getElementById("project");
if (projectBtn) {
  projectBtn.addEventListener("click", () => {
    // Toggle projection
    const currentProjection = map.getProjection();
    map.setProjection({
      type: currentProjection.type === "globe" ? "mercator" : "globe",
    });
  });
}

// ADDED: force redrawing every frame
map.repaint = true;

// create a custom style layer to implement the WebGL content
const highlightLayer = createStarLayer();

// add the custom style layer to the map
map.on("load", () => {
  map.addLayer(highlightLayer, "crimea-fill");
});

map.on("click", () => {
  highlightLayer.startTime = performance.now();
});
