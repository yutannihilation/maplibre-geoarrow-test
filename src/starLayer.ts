import maplibregl from 'maplibre-gl';
import type { CustomLayerInterface } from 'maplibre-gl';

type RGBA = [number, number, number, number];

interface ProgramInfo {
    program: WebGLProgram;
    aPos: number;
    uColors: WebGLUniformLocation | null;
    uColorIndex: WebGLUniformLocation | null;
}

interface ShaderDescription {
    variantName: string;
    vertexShaderPrelude: string;
    define: string;
}

interface RenderArgs {
    shaderData: ShaderDescription;
    defaultProjectionData: {
        fallbackMatrix: Float32Array;
        mainMatrix: Float32Array;
        tileMercatorCoords: [number, number, number, number];
        clippingPlane: [number, number, number, number];
        projectionTransition: number;
    };
}

interface Star {
    vertexBuffer: WebGLBuffer | null;
    indexBuffer: WebGLBuffer | null;
    indexCount: number;
    colorIndex: number;
}

interface StarLayer extends CustomLayerInterface {
    shaderMap: Map<string, ProgramInfo>;
    colorPalette: RGBA[];
    currentColorIndex: number;
    vertexBuffer?: WebGLBuffer | null;
    indexBuffer?: WebGLBuffer | null;
    indexCount?: number;
    additionalStars?: Star[];
    getShader(gl: WebGL2RenderingContext, shaderDescription: ShaderDescription): ProgramInfo | null;
}

export function createStarLayer(): StarLayer {
    return {
        id: 'highlight',
        type: 'custom',
        shaderMap: new Map<string, ProgramInfo>(),
        
        // Color palette - array of RGBA colors
        colorPalette: [
            [1.0, 0.843, 0.0, 0.85],    // 0: Golden yellow
            [0.0, 0.5, 1.0, 0.85],      // 1: Blue
            [1.0, 0.0, 0.5, 0.85],      // 2: Red-pink
            [0.0, 1.0, 0.5, 0.85],      // 3: Green
            [0.8, 0.0, 1.0, 0.85],      // 4: Purple
            [1.0, 0.5, 0.0, 0.85],      // 5: Orange
            [0.0, 1.0, 1.0, 0.85],      // 6: Cyan
            [1.0, 0.0, 1.0, 0.85],      // 7: Magenta
            [0.5, 0.5, 0.5, 0.85],      // 8: Gray
            [1.0, 1.0, 1.0, 0.85],      // 9: White
            [0.0, 0.0, 0.0, 0.85],      // 10: Black
            [0.5, 0.25, 0.0, 0.85],     // 11: Brown
            [1.0, 0.75, 0.8, 0.85],     // 12: Pink
            [0.5, 0.0, 0.5, 0.85],      // 13: Dark purple
            [0.0, 0.5, 0.0, 0.85],      // 14: Dark green
            [0.0, 0.0, 0.5, 0.85]       // 15: Dark blue
        ],
        
        // Current color index
        currentColorIndex: 0,

        // Helper method for creating a shader based on current map projection
        getShader(gl: WebGL2RenderingContext, shaderDescription: ShaderDescription): ProgramInfo | null {
            // Pick a shader based on the current projection, defined by `variantName`.
            if (this.shaderMap.has(shaderDescription.variantName)) {
                return this.shaderMap.get(shaderDescription.variantName)!;
            }

            // Create GLSL source for vertex shader
            const vertexSource = `#version 300 es
            // Inject MapLibre projection code
            ${shaderDescription.vertexShaderPrelude}
            ${shaderDescription.define}

            in vec2 a_pos;

            void main() {
                gl_Position = projectTile(a_pos);
            }`;

            // create GLSL source for fragment shader
            const fragmentSource = `#version 300 es
            precision highp float;

            #define MAX_COLORS 16
            uniform vec4 u_colors[MAX_COLORS];
            uniform int u_colorIndex;
            
            out vec4 fragColor;
            void main() {
                // Clamp index to valid range
                int index = clamp(u_colorIndex, 0, MAX_COLORS - 1);
                fragColor = u_colors[index];
            }`;

            // create a vertex shader
            const vertexShader = gl.createShader(gl.VERTEX_SHADER);
            if (!vertexShader) return null;
            
            gl.shaderSource(vertexShader, vertexSource);
            gl.compileShader(vertexShader);
            
            // Check vertex shader compilation
            if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
                console.error('Vertex shader compilation error:', gl.getShaderInfoLog(vertexShader));
                return null;
            }

            // create a fragment shader
            const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            if (!fragmentShader) return null;
            
            gl.shaderSource(fragmentShader, fragmentSource);
            gl.compileShader(fragmentShader);
            
            // Check fragment shader compilation
            if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
                console.error('Fragment shader compilation error:', gl.getShaderInfoLog(fragmentShader));
                return null;
            }

            // link the two shaders into a WebGL program
            const program = gl.createProgram();
            if (!program) return null;
            
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            
            // Check program linking
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                console.error('Program linking error:', gl.getProgramInfoLog(program));
                return null;
            }

            // Store program and its locations together
            const programInfo: ProgramInfo = {
                program: program,
                aPos: gl.getAttribLocation(program, 'a_pos'),
                uColors: gl.getUniformLocation(program, 'u_colors'),
                uColorIndex: gl.getUniformLocation(program, 'u_colorIndex')
            };

            this.shaderMap.set(shaderDescription.variantName, programInfo);

            return programInfo;
        },

        // method called when the layer is added to the map
        onAdd(map: maplibregl.Map, gl: WebGL2RenderingContext): void {
            // define center point for the star
            const center = maplibregl.MercatorCoordinate.fromLngLat({
                lng: 15.0,
                lat: 55.0
            });

            // Generate star vertices
            const vertices: number[] = [];
            const numPoints = 5;
            const outerRadius = 0.05; // radius in mercator coordinates
            const innerRadius = outerRadius * 0.4; // inner radius for star points

            // Generate vertices for a 5-pointed star
            for (let i = 0; i < numPoints * 2; i++) {
                const angle = (i * Math.PI) / numPoints - Math.PI / 2;
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                
                vertices.push(
                    center.x + radius * Math.cos(angle),
                    center.y + radius * Math.sin(angle)
                );
            }

            // create and initialize a WebGLBuffer to store vertex data
            this.vertexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
            gl.bufferData(
                gl.ARRAY_BUFFER,
                new Float32Array(vertices),
                gl.STATIC_DRAW
            );

            // Create index buffer for drawing triangles
            // A 5-pointed star needs to be drawn as triangles from the center
            const indices: number[] = [];
            
            // Add center point
            vertices.push(center.x, center.y);
            const centerIndex = numPoints * 2;
            
            // Create triangles from center to each edge
            for (let i = 0; i < numPoints * 2; i++) {
                indices.push(centerIndex, i, (i + 1) % (numPoints * 2));
            }

            // Update vertex buffer with center point
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
            gl.bufferData(
                gl.ARRAY_BUFFER,
                new Float32Array(vertices),
                gl.STATIC_DRAW
            );

            // Create index buffer
            this.indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.bufferData(
                gl.ELEMENT_ARRAY_BUFFER,
                new Uint16Array(indices),
                gl.STATIC_DRAW
            );
            
            this.indexCount = indices.length;

            // Create additional stars to demonstrate multiple shapes with different colors
            this.additionalStars = [];
            
            // Add 3 more stars at different locations with different colors
            const starLocations = [
                { lng: 10.0, lat: 52.0, colorIndex: 1 },  // Blue star near Germany
                { lng: 20.0, lat: 58.0, colorIndex: 2 },  // Red-pink star near Baltic
                { lng: 5.0, lat: 60.0, colorIndex: 4 }    // Purple star near Norway
            ];
            
            for (const loc of starLocations) {
                const starCenter = maplibregl.MercatorCoordinate.fromLngLat({
                    lng: loc.lng,
                    lat: loc.lat
                });
                
                const starVertices: number[] = [];
                const starOuterRadius = 0.03;
                const starInnerRadius = starOuterRadius * 0.4;
                
                // Generate star vertices
                for (let i = 0; i < numPoints * 2; i++) {
                    const angle = (i * Math.PI) / numPoints - Math.PI / 2;
                    const radius = i % 2 === 0 ? starOuterRadius : starInnerRadius;
                    
                    starVertices.push(
                        starCenter.x + radius * Math.cos(angle),
                        starCenter.y + radius * Math.sin(angle)
                    );
                }
                
                // Add center point
                starVertices.push(starCenter.x, starCenter.y);
                
                // Create vertex buffer
                const starVertexBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, starVertexBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(starVertices), gl.STATIC_DRAW);
                
                // Create index buffer (same pattern as main star)
                const starIndices: number[] = [];
                const starCenterIndex = numPoints * 2;
                for (let i = 0; i < numPoints * 2; i++) {
                    starIndices.push(starCenterIndex, i, (i + 1) % (numPoints * 2));
                }
                
                const starIndexBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, starIndexBuffer);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(starIndices), gl.STATIC_DRAW);
                
                this.additionalStars.push({
                    vertexBuffer: starVertexBuffer,
                    indexBuffer: starIndexBuffer,
                    indexCount: starIndices.length,
                    colorIndex: loc.colorIndex
                });
            }
        },

        // method fired on each animation frame
        render(gl: WebGL2RenderingContext, args: RenderArgs): void {
            const programInfo = this.getShader(gl, args.shaderData);
            if (!programInfo) {
                console.error('Failed to get shader program');
                return;
            }
            
            const program = programInfo.program;
            gl.useProgram(program);
            
            gl.uniformMatrix4fv(
                gl.getUniformLocation(program, 'u_projection_fallback_matrix'),
                false,
                args.defaultProjectionData.fallbackMatrix
            );
            gl.uniformMatrix4fv(
                gl.getUniformLocation(program, 'u_projection_matrix'),
                false,
                args.defaultProjectionData.mainMatrix
            );
            gl.uniform4f(
                gl.getUniformLocation(program, 'u_projection_tile_mercator_coords'),
                ...args.defaultProjectionData.tileMercatorCoords
            );
            gl.uniform4f(
                gl.getUniformLocation(program, 'u_projection_clipping_plane'),
                ...args.defaultProjectionData.clippingPlane
            );
            gl.uniform1f(
                gl.getUniformLocation(program, 'u_projection_transition'),
                args.defaultProjectionData.projectionTransition
            );
            
            // Set the color palette uniforms
            // Flatten the color palette array for uniform setting
            const flatColors = this.colorPalette.flat();
            if (programInfo.uColors) {
                gl.uniform4fv(programInfo.uColors, flatColors);
            }
            
            // Set the current color index
            if (programInfo.uColorIndex) {
                gl.uniform1i(programInfo.uColorIndex, this.currentColorIndex);
            }

            if (this.vertexBuffer) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
                gl.enableVertexAttribArray(programInfo.aPos);
                gl.vertexAttribPointer(programInfo.aPos, 2, gl.FLOAT, false, 0, 0);
            }
            
            if (this.indexBuffer && this.indexCount) {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
                
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                
                // Draw the main star
                gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
            }
            
            // Example: Draw additional stars with different colors
            // This demonstrates how the color index uniform can be used for multiple shapes
            if (this.additionalStars && programInfo.uColorIndex) {
                for (let i = 0; i < this.additionalStars.length; i++) {
                    const star = this.additionalStars[i];
                    
                    // Set different color index for each star
                    gl.uniform1i(programInfo.uColorIndex, (star.colorIndex + this.currentColorIndex) % this.colorPalette.length);
                    
                    // Bind the vertex buffer for this star
                    if (star.vertexBuffer) {
                        gl.bindBuffer(gl.ARRAY_BUFFER, star.vertexBuffer);
                        gl.vertexAttribPointer(programInfo.aPos, 2, gl.FLOAT, false, 0, 0);
                    }
                    
                    if (star.indexBuffer) {
                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, star.indexBuffer);
                        gl.drawElements(gl.TRIANGLES, star.indexCount, gl.UNSIGNED_SHORT, 0);
                    }
                }
            }
        }
    };
}