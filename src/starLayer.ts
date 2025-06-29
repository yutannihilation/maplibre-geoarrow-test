import maplibregl from "maplibre-gl";
import type {
  CustomLayerInterface,
  CustomRenderMethodInput,
} from "maplibre-gl";

import * as arrow from "apache-arrow";
import * as geoarrow from "@geoarrow/geoarrow-js";
import * as geoarrow_deckgl from "@geoarrow/deck.gl-layers";
import { getInterleavedPolygon } from "./getInterleavedPolygon";

interface ProgramInfo {
  program: WebGLProgram;
  aPos: number;
  // aOpacity: number;
}

interface ShaderDescription {
  variantName: string;
  vertexShaderPrelude: string;
  define: string;
}

interface Star {
  vertexBuffer: WebGLBuffer | null;
  indexBuffer: WebGLBuffer | null;
  indexCount: number;
  colorIndex: number;
}

interface StarLayer extends CustomLayerInterface {
  shaderMap: Map<string, ProgramInfo>;
  currentColorIndex: number;
  vertexBuffer?: WebGLBuffer | null;
  indexBuffer?: WebGLBuffer | null;
  indexCount?: number;
  additionalStars?: Star[];
  getShader(
    gl: WebGL2RenderingContext,
    shaderDescription: ShaderDescription
  ): ProgramInfo | null;
}

export function createStarLayer(): StarLayer {
  return {
    id: "highlight",
    type: "custom",
    shaderMap: new Map<string, ProgramInfo>(),

    // Current color index
    currentColorIndex: 0,

    // Helper method for creating a shader based on current map projection
    getShader(
      gl: WebGL2RenderingContext,
      shaderDescription: ShaderDescription
    ): ProgramInfo | null {
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
            // in float a_opacity; // TODO
            out float v_opacity;

            void main() {
                gl_Position = projectTile(a_pos);
                v_opacity = 1.0;
            }`;

      // create GLSL source for fragment shader
      const fragmentSource = `#version 300 es
            precision highp float;

            in float v_opacity;
            out vec4 fragColor;
            void main() {
                fragColor = vec4(0.5, 0.1, 0.7, 0.7);
            }`;

      // create a vertex shader
      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      if (!vertexShader) return null;

      gl.shaderSource(vertexShader, vertexSource);
      gl.compileShader(vertexShader);

      // Check vertex shader compilation
      if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error(
          "Vertex shader compilation error:",
          gl.getShaderInfoLog(vertexShader)
        );
        return null;
      }

      // create a fragment shader
      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      if (!fragmentShader) return null;

      gl.shaderSource(fragmentShader, fragmentSource);
      gl.compileShader(fragmentShader);

      // Check fragment shader compilation
      if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.error(
          "Fragment shader compilation error:",
          gl.getShaderInfoLog(fragmentShader)
        );
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
        console.error("Program linking error:", gl.getProgramInfoLog(program));
        return null;
      }

      // Store program and its locations together
      const programInfo: ProgramInfo = {
        program: program,
        aPos: gl.getAttribLocation(program, "a_pos"),
        // aOpacity: gl.getAttribLocation(program, "a_opacity"),
      };

      this.shaderMap.set(shaderDescription.variantName, programInfo);

      return programInfo;
    },

    // method called when the layer is added to the map
    async onAdd(
      map: maplibregl.Map,
      gl: WebGL2RenderingContext
    ): Promise<void> {
      const resp = await fetch("/data/A09.arrow");
      const table_data = await arrow.tableFromIPC(resp);

      const polygons = table_data.getChild("geometry");

      if (!polygons || !geoarrow.vector.isPolygonVector(polygons)) {
        console.log("Not a polygon");
        return;
      }

      const polygonsInterleaved = getInterleavedPolygon(polygons.data[0]);
      const vertices =
        polygonsInterleaved.children[0].children[0].children[0].values;
      const indices = geoarrow.algorithm.earcut(polygonsInterleaved);

      // Convert lon/lat to Mercator coordinates
      const mercatorVertices = [];
      for (let i = 0; i < vertices.length; i += 2) {
        const lon = vertices[i];
        const lat = vertices[i + 1];
        const mercator = maplibregl.MercatorCoordinate.fromLngLat({
          lng: lon,
          lat: lat,
        });
        mercatorVertices.push(mercator.x, mercator.y);
      }

      console.log("orig", vertices);

      console.log("mercator", mercatorVertices);

      // create and initialize a WebGLBuffer to store vertex data
      this.vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(mercatorVertices),
        gl.STATIC_DRAW
      );

      // Create index buffer
      this.indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint32Array(indices),
        gl.STATIC_DRAW
      );

      this.indexCount = indices.length;
    },

    // method fired on each animation frame
    render(
      gl: WebGLRenderingContext | WebGL2RenderingContext,
      args: CustomRenderMethodInput
    ): void {
      // only support WebGL2
      if (gl instanceof WebGLRenderingContext) {
        return;
      }

      const programInfo = this.getShader(gl, args.shaderData);
      if (!programInfo) {
        console.error("Failed to get shader program");
        return;
      }

      const program = programInfo.program;
      gl.useProgram(program);

      gl.uniformMatrix4fv(
        gl.getUniformLocation(program, "u_projection_fallback_matrix"),
        false,
        args.defaultProjectionData.fallbackMatrix
      );
      gl.uniformMatrix4fv(
        gl.getUniformLocation(program, "u_projection_matrix"),
        false,
        args.defaultProjectionData.mainMatrix
      );
      gl.uniform4f(
        gl.getUniformLocation(program, "u_projection_tile_mercator_coords"),
        ...args.defaultProjectionData.tileMercatorCoords
      );
      gl.uniform4f(
        gl.getUniformLocation(program, "u_projection_clipping_plane"),
        ...args.defaultProjectionData.clippingPlane
      );
      gl.uniform1f(
        gl.getUniformLocation(program, "u_projection_transition"),
        args.defaultProjectionData.projectionTransition
      );

      if (this.vertexBuffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.enableVertexAttribArray(programInfo.aPos);
        // gl.enableVertexAttribArray(programInfo.aOpacity); // TODO

        // Position attribute (x, y) - stride 0 since we only have position data
        gl.vertexAttribPointer(programInfo.aPos, 2, gl.FLOAT, false, 0, 0);
        // gl.vertexAttribPointer(programInfo.aOpacity, 1, gl.FLOAT, false, stride, 8); // TODO
      }

      if (this.indexBuffer && this.indexCount) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Draw the main star
        gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_INT, 0);
      }
    },
  };
}
