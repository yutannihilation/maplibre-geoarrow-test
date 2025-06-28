import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import { createStarLayer } from './starLayer.js';

const map = new maplibregl.Map({
    container: 'map',
    style: 'https://demotiles.maplibre.org/style.json',
    zoom: 3,
    center: [7.5, 58],
    canvasContextAttributes: {antialias: true}
});

map.on('style.load', () => {
    map.setProjection({
        type: 'globe', // Set projection to globe
    });
});

document.getElementById('project').addEventListener('click', () => {
    // Toggle projection
    const currentProjection = map.getProjection();
    map.setProjection({
        type: currentProjection.type === 'globe' ? 'mercator' : 'globe',
    });
});

// create a custom style layer to implement the WebGL content
const highlightLayer = createStarLayer();

// add the custom style layer to the map
map.on('load', () => {
    map.addLayer(highlightLayer, 'crimea-fill');
});

// Add color change button functionality
document.getElementById('colorBtn').addEventListener('click', () => {
    highlightLayer.currentColorIndex = (highlightLayer.currentColorIndex + 1) % highlightLayer.colorPalette.length;
    
    // Trigger a re-render by calling triggerRepaint
    map.triggerRepaint();
});