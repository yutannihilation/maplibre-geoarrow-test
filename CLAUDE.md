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
- **`src/main.ts`**: Main TypeScript entry point
  - Map initialization with globe projection
  - Projection toggle functionality
  - Event listeners setup
- **`src/starLayer.ts`**: Custom WebGL layer implementation in TypeScript
  - Fully typed interfaces for WebGL operations
  - Dynamic shader generation based on current projection (globe vs mercator)
  - Renders multiple star shapes with customizable colors
  - Handles projection transformations in vertex shader
- **`src/style.css`**: Application styles
- **`vite.config.js`**: Vite configuration
- **`tsconfig.json`**: TypeScript configuration
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
   - TypeScript v5.7.0 (development dependency)
   - @types/maplibre-gl v4.8.0 (development dependency)
   - Vite v7.0.0 (development dependency)
   - @geoarrow/geoarrow-js v0.3.2 (installed but not yet used)

## Important Notes

- WebGL 2.0 is required for the custom layer
- The project name suggests GeoArrow integration, but currently only implements basic WebGL rendering
- Full TypeScript type safety is implemented throughout the codebase
- Modern ES modules are used throughout the codebase