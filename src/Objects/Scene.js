import {createShader} from "../utils";
import Camera from "./Camera";
import Plane from "./Plane";
import {vec3} from "gl-matrix";
import {stopLoadingInterval} from "../index";

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
    fov = Math.PI / 4;
    planesAmount = 20;

    constructor() {
        this.canvas = document.getElementById("canvas");
        this.context = this.canvas.getContext("webgl");

        if (!this.context) alert("WebGL is not supported!");

        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.context.viewport(0, 0, this.canvas.width, this.canvas.height);

        this.init();

        this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
    }

    onMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

        const ray = this.camera.getRay(x, y);

        let anyHovered = false;

        const highlightedWords = [];

        for (let j = 0; j < this.planes.length; j++) {
            const plane = this.planes[j];

            const result = plane.intersectRay(ray);

            if (result) {
                const uv = result.uvNominal;

                const wordPositions = plane.wordPositions;
                let found = false;

                for (let i = 0; i < wordPositions.length; i++) {
                    const word = wordPositions[i];

                    if (
                        uv[0] >= word.x &&
                        uv[0] <= word.x + word.width &&
                        uv[1] >= word.y &&
                        uv[1] <= word.y + word.height
                    ) {
                        // plane.highlightWord(i);
                        found = true;
                        anyHovered = true;

                        highlightedWords.push({plane, wordIndex: i, point: result.point});

                        break;
                    }
                }

                if (!found) {
                    plane.highlightWord(-1);
                }
            } else {
                plane.highlightWord(-1);
            }
        }

        if (highlightedWords.length > 0) {
            highlightedWords.sort((a, b) => vec3.distance(vec3.create(), a.point) - vec3.distance(vec3.create(), b.point));

            const closestWord = highlightedWords[0];

            closestWord.plane.highlightWord(closestWord.wordIndex);

            for (let i = 1; i < highlightedWords.length; i++) {
                const otherWord = highlightedWords[i];
                otherWord.plane.highlightWord(-1);
            }
        }

        this.render();
    }

    async init() {
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

        this.camera = new Camera(this.fov, this.canvas.width / this.canvas.height, 0.1, 100);

        this.planes = [];

        const aspect = this.canvas.width / this.canvas.height;

        // Get joke as text.
        // const requests = new Array(this.planesAmount)
        //     .fill(
        //         fetch("https://icanhazdadjoke.com/", {
        //             headers: {
        //                 "Accept": "text/plain",
        //             }
        //         })
        //             .then(response => response.text())
        //     );
        //
        // const jokes = await Promise.all(requests);

        // console.log(jokes);

        this.uProjectionLoc = gl.getUniformLocation(this.program, "uProjection");
        this.uModelViewLoc = gl.getUniformLocation(this.program, "uModelView");

        for (let i = 0; i < this.planesAmount; i++) {
            const depth = -6 + Math.random() * -10;
            const halfHeight = Math.tan(this.fov / 2) * Math.abs(depth);
            const halfWidth = halfHeight * aspect;

            const x = (Math.random() * 2 - 1) * (halfWidth - 1);
            const y = (Math.random() * 2 - 1) * (halfHeight - 1);
            const z = depth;

            const rx = Math.random() * Math.PI * 2;
            const ry = Math.random() * Math.PI * 2;
            const rz = Math.random() * Math.PI * 2;

            const joke = await fetch("https://icanhazdadjoke.com/", {
                headers: {
                    "Accept": "text/plain",
                }
            })
                .then(response => response.text());

            this.planes.push(new Plane(gl, joke, [x, y, z], [rx, ry, rz]));

            this.render();
        }

        stopLoadingInterval();

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
