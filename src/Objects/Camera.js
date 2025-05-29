import {mat4, vec3} from "gl-matrix";

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
}

export default Camera;
