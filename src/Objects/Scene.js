import { createShader } from "../utils";
import Camera from "./Camera";
import Plane from "./Plane";

const vertexShaderSource = `
    attribute vec3 position;
    attribute vec2 uv;
    
    uniform mat4 uProjection;
    uniform mat4 uModelView;
    
    varying vec2 vUV;
    
    void main() {
      gl_Position = uProjection * uModelView * vec4(position, 1.0);
      vUV = uv;
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    
    uniform sampler2D uTexture;
    varying vec2 vUV;
    
    void main() {
      gl_FragColor = texture2D(uTexture, vUV);
    }
`;

class Scene {
    constructor() {
        this.canvas = document.getElementById("canvas");
        this.context = this.canvas.getContext("webgl");

        if (!this.context) alert("WebGL is not supported!");

        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.context.viewport(0, 0, this.canvas.width, this.canvas.height);

        this.init();
    }

    init() {
        const gl = this.context;

        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error("Could not link program:", gl.getProgramInfoLog(this.program));
            return;
        }

        gl.useProgram(this.program);

        this.camera = new Camera(Math.PI / 4, this.canvas.width / this.canvas.height, 0.1, 100);

        this.planes = [];

        const depth = -6;
        const fov = Math.PI / 4;
        const aspect = this.canvas.width / this.canvas.height;
        const halfHeight = Math.tan(fov / 2) * Math.abs(depth);
        const halfWidth = halfHeight * aspect;

        for (let i = 0; i < 5; i++) {
            const x = (Math.random() * 2 - 1) * (halfWidth - 1);
            const y = (Math.random() * 2 - 1) * (halfHeight - 1);
            const z = depth;

            const rx = Math.random() * Math.PI * 2;
            const ry = Math.random() * Math.PI * 2;
            const rz = Math.random() * Math.PI * 2;

            this.planes.push(new Plane(gl, [x, y, z], [rx, ry, rz]));
        }

        this.uProjectionLoc = gl.getUniformLocation(this.program, "uProjection");
        this.uModelViewLoc = gl.getUniformLocation(this.program, "uModelView");

        this.render();
    }

    render() {
        const gl = this.context;

        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        const projectionMatrix = this.camera.getProjectionMatrix();
        gl.useProgram(this.program);
        gl.uniformMatrix4fv(this.uProjectionLoc, false, projectionMatrix);

        this.planes.forEach(plane => {
            const modelViewMatrix = plane.getModelMatrix();
            gl.uniformMatrix4fv(this.uModelViewLoc, false, modelViewMatrix);
            plane.draw(this.program);
        });
    }
}

export default Scene;
