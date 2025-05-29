import {mat4, vec3, vec4} from "gl-matrix";

class Camera {
    constructor(fov, aspect, near, far) {
        this.position = vec3.fromValues(0, 0, 0);
        this.target = vec3.fromValues(0, 0, -1);
        this.up = vec3.fromValues(0, 1, 0);

        this.fov = fov;
        this.aspect = aspect;
        this.near = near;
        this.far = far;
    }

    getProjectionMatrix() {
        const proj = mat4.create();
        mat4.perspective(proj, this.fov, this.aspect, this.near, this.far);
        return proj;
    }

    getViewMatrix() {
        const view = mat4.create();
        mat4.lookAt(view, this.position, this.target, this.up);
        return view;
    }

    getRay(ndcX, ndcY) {
        const gl = this.context;
        const cam = this;

        // Кліп-простір, точка на ближній площині (z = -1)
        const clipCoords = [ndcX, ndcY, -1, 1];

        // Обротна проекційна матриця
        const invProj = mat4.invert(mat4.create(), cam.getProjectionMatrix());

        // Точка у view-просторі
        let viewCoords = vec4.transformMat4(vec4.create(), clipCoords, invProj);
        viewCoords = viewCoords.map(c => c / viewCoords[3]); // нормалізація

        // Обротна view-матриця
        const invView = mat4.invert(mat4.create(), cam.getViewMatrix());

        // Точка у світовому просторі
        let worldCoords = vec4.transformMat4(vec4.create(), viewCoords, invView);
        worldCoords = worldCoords.slice(0, 3); // вектор3

        // Камера у світі
        const camPos = cam.position;

        // Напрямок променя (нормалізований)
        const dir = vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), worldCoords, camPos));

        return { origin: camPos, direction: dir };
    }
}

export default Camera;
