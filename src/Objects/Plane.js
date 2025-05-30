import {mat4, vec3, vec4} from "gl-matrix";

class Plane {
    wordPositions = [];

    vertices = new Float32Array([
        // x, y, z,   u, v
        -1, -1, 0,    0, 0,
        1, -1, 0,     1, 0,
        -1, 1, 0,     0, 1,

        1, -1, 0,     1, 0,
        1, 1, 0,      1, 1,
        -1, 1, 0,     0, 1
    ]);

    highlightedWordIndex = -1; // Index of the highlighted word (-1 — none).

    lineHeight = 24;
    fontSize = 20;

    textureSize = [256, 256];
    finalTextureSize = [0, 0]

    constructor(gl, text, position = [0, 0, 0], rotation = [0, 0, 0]) {
        this.gl = gl;
        this.position = position;
        this.rotation = rotation; // [x, y, z]

        this.text = text.trim().replace(/\n/g, " ");
        this.words = this.text.split(/\s+/);

        // First texture without highlighting.
        this.texture = this.createTexture();

        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
    }

    draw(program) {
        const gl = this.gl;
        const stride = 5 * Float32Array.BYTES_PER_ELEMENT;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

        const positionLoc = gl.getAttribLocation(program, "position");
        gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(positionLoc);

        const uvLoc = gl.getAttribLocation(program, "uv");
        gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
        gl.enableVertexAttribArray(uvLoc);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(gl.getUniformLocation(program, "uTexture"), 0);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    getModelMatrix() {
        const [x, y, z] = this.position;
        const [rx, ry, rz] = this.rotation;

        const sx = Math.sin(rx), cx = Math.cos(rx);
        const sy = Math.sin(ry), cy = Math.cos(ry);
        const sz = Math.sin(rz), cz = Math.cos(rz);

        // Rotation around X, then Y, then Z, along with position.
        // R = Rz * Ry * Rx
        const modelMatrix = new Float32Array([
            cz * cy,     cz * sy * sx - sz * cx,     cz * sy * cx + sz * sx,      0,
            sz * cy,     sz * sy * sx + cz * cx,     sz * sy * cx - cz * sx,      0,
            -sy,         cy * sx,                    cy * cx,                     0,
            x,           y,                          z,                           1,
        ]);

        return modelMatrix;
    }

    intersectRay(ray) {
        const modelMatrix = this.getModelMatrix();

        // Get position of the plane in the world (last row of the matrix).
        const planePos = vec3.fromValues(modelMatrix[12], modelMatrix[13], modelMatrix[14]);

        // Local normal of the plane (0, 0, 1).
        const localNormal = vec3.fromValues(0, 0, 1);

        // Transform the normal in a normalized way (without translation).
        const normalMatrix = mat4.create();
        mat4.invert(normalMatrix, modelMatrix);
        mat4.transpose(normalMatrix, normalMatrix);
        let worldNormal = vec3.create();
        vec3.transformMat4(worldNormal, localNormal, normalMatrix);
        vec3.normalize(worldNormal, worldNormal);

        const denom = vec3.dot(ray.direction, worldNormal);
        if (Math.abs(denom) < 1e-6) {
            // Ray parallel to the plane.
            return null;
        }

        const diff = vec3.create();
        vec3.subtract(diff, planePos, ray.origin);

        const t = vec3.dot(diff, worldNormal) / denom;

        if (t < 0) {
            // There is no intersection, the plane is "behind" the ray.
            return null;
        }

        // Intersection point in world coordinates.
        const hitPoint = vec3.create();
        vec3.scaleAndAdd(hitPoint, ray.origin, ray.direction, t);

        // Convert hitPoint to local plane coordinates.
        const invModel = mat4.create();
        mat4.invert(invModel, modelMatrix);

        const hitPointLocal4 = vec4.fromValues(hitPoint[0], hitPoint[1], hitPoint[2], 1);
        vec4.transformMat4(hitPointLocal4, hitPointLocal4, invModel);

        const hitPointLocal = [hitPointLocal4[0], hitPointLocal4[1], hitPointLocal4[2]];

        const hitPointUv = [(hitPointLocal4[0] + 1) / 2, (hitPointLocal4[1] + 1) / 2];
        const uvPointNominal = [hitPointUv[0] * this.textureSize[0], hitPointUv[1] * this.textureSize[1]];

        // Checking if a point is within a square (-1..1 in X and Y), Z approximately 0.
        // Note: Should be different depending on plane size.
        if (
            hitPointLocal[0] >= -1 && hitPointLocal[0] <= 1 &&
            hitPointLocal[1] >= -1 && hitPointLocal[1] <= 1 &&
            Math.abs(hitPointLocal[2]) < 0.01
        ) {
            return {
                point: hitPoint,
                // localPoint: hitPointLocal,
                // uv: hitPointUv,
                // distance: t,
                uvNominal: uvPointNominal
            };
        }

        return null;
    }

    createTexture() {
        const gl = this.gl;

        const canvas = document.createElement("canvas");
        canvas.width = this.textureSize[0];
        // canvas.height = this.textureSize[1];
        canvas.height = this.getCanvasHeight();

        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = `bold ${this.fontSize}px Arial`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";

        let x = 10;
        let y = 10;

        const spaceMetrics = ctx.measureText(" ");
        const spaceWidth = spaceMetrics.width;
        const maxWidth = canvas.width - 20;

        for (let i = 0; i < this.words.length; i++) {
            const word = this.words[i];

            const textMetrics = ctx.measureText(word);

            const wordWidth = textMetrics.actualBoundingBoxRight + textMetrics.actualBoundingBoxLeft;
            const wordHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;

            // Line break check.
            if (x + wordWidth > maxWidth) {
                x = 10;
                y += this.lineHeight;
            }

            // If this word is highlighted, draw it red, otherwise draw it black.
            ctx.fillStyle = (i === this.highlightedWordIndex) ? "red" : "black";
            ctx.fillText(word, x, y);

            this.wordPositions.push({x, y, width: wordWidth, height: wordHeight, word});

            x += wordWidth + spaceWidth;
        }

        // Creating a WebGL texture.
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        return texture;
    }

    getCanvasHeight() {
        const canvas = document.createElement("canvas");
        canvas.width = this.textureSize[0];
        canvas.height = this.textureSize[1];

        const ctx = canvas.getContext("2d");

        ctx.font = `bold ${this.fontSize}px Arial`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";

        let x = 10;
        let y = 10;

        const spaceMetrics = ctx.measureText(" ");
        const spaceWidth = spaceMetrics.width;
        const maxWidth = canvas.width - 20;

        for (let i = 0; i < this.words.length; i++) {
            const word = this.words[i];

            const textMetrics = ctx.measureText(word);

            const wordWidth = textMetrics.actualBoundingBoxRight + textMetrics.actualBoundingBoxLeft;

            // Line break check.
            if (x + wordWidth > maxWidth) {
                x = 10;
                y += this.lineHeight;
            }

            x += wordWidth + spaceWidth;
        }

        return y + this.lineHeight + 10;
    }

    highlightWord(index) {
        if (index === this.highlightedWordIndex) return; // Unchanged.

        this.highlightedWordIndex = index;

        // Deleting the old texture if necessary.
        if (this.texture) {
            this.gl.deleteTexture(this.texture);
        }

        this.texture = this.createTexture();
    }
}

export default Plane;
