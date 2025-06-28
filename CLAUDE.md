# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a MapLibre GL JS demonstration project that showcases custom WebGL layer implementation with globe projection support. The project uses Vite as the build tool for a modern development experience.

## Development Commands

- `npm install` - Install dependencies
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Architecture

### Project Structure
- **`index.html`**: Entry HTML file
- **`src/main.js`**: Main JavaScript entry point
  - Map initialization with globe projection
  - Projection toggle functionality
  - Event listeners setup
- **`src/starLayer.js`**: Custom WebGL layer implementation
  - Dynamic shader generation based on current projection (globe vs mercator)
  - Renders multiple star shapes with customizable colors
  - Handles projection transformations in vertex shader
- **`src/style.css`**: Application styles
- **`vite.config.js`**: Vite configuration
- **`package.json`**: Project dependencies and scripts

### Key Components

1. **Custom WebGL Layer**: Implements MapLibre's custom layer API to render WebGL content
   - Dynamic shader generation based on current projection (globe vs mercator)
   - Renders star shapes at various European locations
   - Color palette system with 16 pre-defined colors
   - Handles projection transformations in vertex shader

2. **Projection Handling**: 
   - Uses `projectTile` function in shaders for proper coordinate transformation
   - Dynamically regenerates shaders when projection changes
   - Supports both globe and mercator projections

3. **Dependencies**:
   - MapLibre GL JS v5.6.0 (installed via npm)
   - Vite (development dependency)

## Important Notes

- WebGL 2.0 is required for the custom layer
- The project name suggests GeoArrow integration, but currently only implements basic WebGL rendering
- No error handling is implemented for WebGL operations
- Modern ES modules are used throughout the codebase