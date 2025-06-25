# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a MapLibre GL JS demonstration project that showcases custom WebGL layer implementation with globe projection support. The entire application is contained in a single `index.html` file.

## Development Commands

Since this is a simple HTML file with no build process, you can:
- Open `index.html` directly in a web browser to run the application
- Use a local web server like `python -m http.server` or `npx serve` for better development experience

## Architecture

### Single-File Structure
All code is contained within `index.html`:
- **Lines 1-34**: HTML structure and CSS styling
- **Lines 36-48**: Map initialization with globe projection
- **Lines 50-56**: Projection toggle functionality
- **Lines 59-221**: Custom WebGL layer implementation
- **Lines 224-226**: Layer addition to map

### Key Components

1. **Custom WebGL Layer**: Implements MapLibre's custom layer API to render WebGL content
   - Dynamic shader generation based on current projection (globe vs mercator)
   - Renders a purple triangle connecting Helsinki, Berlin, and Kyiv
   - Handles projection transformations in vertex shader

2. **Projection Handling**: 
   - Uses `projectTile` function in shaders for proper coordinate transformation
   - Dynamically regenerates shaders when projection changes
   - Supports both globe and mercator projections

3. **External Dependencies**:
   - MapLibre GL JS v5.6.0 (loaded from CDN)
   - No other dependencies or build tools

## Important Notes

- WebGL 2.0 is required for the custom layer
- The project name suggests GeoArrow integration, but currently only implements basic WebGL rendering
- No error handling is implemented for WebGL operations
- No build process, testing, or linting infrastructure exists