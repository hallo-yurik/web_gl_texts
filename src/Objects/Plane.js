import {createTextTexture} from "../utils";

class Plane {
    constructor(gl, position = [0, 0, 0], rotation = [0, 0, 0]) {
        this.gl = gl;
        this.position = position;
        this.rotation = rotation; // [x, y, z]

        this.vertices = new Float32Array([
            // x, y, z,   u, v
            -1, -1, 0,   0, 0,
            1, -1, 0,   1, 0,
            -1,  1, 0,   0, 1,

            1, -1, 0,   1, 0,
            1,  1, 0,   1, 1,
            -1,  1, 0,   0, 1
        ]);

        this.texture = createTextTexture(gl, `
        Lorem ipsum dolor sit amet,
        consectetur adipiscing elit,
        sed do eiusmod tempor incididunt ut
        labore et dolore magna aliqua. Ut enim ad minim veniam,
        quis nostrud exercitation ullamco
        `);

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

        // 🔥 Додай цей рядок — малювання 6 вершин (2 трикутники)
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    getModelMatrix() {
        const [x, y, z] = this.position;
        const [rx, ry, rz] = this.rotation;

        const sx = Math.sin(rx), cx = Math.cos(rx);
        const sy = Math.sin(ry), cy = Math.cos(ry);
        const sz = Math.sin(rz), cz = Math.cos(rz);

        // Обертання навколо X, потім Y, потім Z, разом з позицією
        // R = Rz * Ry * Rx
        const modelMatrix = new Float32Array([
            cz * cy,                 cz * sy * sx - sz * cx,   cz * sy * cx + sz * sx,   0,
            sz * cy,                 sz * sy * sx + cz * cx,   sz * sy * cx - cz * sx,   0,
            -sy,                     cy * sx,                  cy * cx,                  0,
            x,                       y,                        z,                        1,
        ]);

        return modelMatrix;
    }
}

export default Plane;
