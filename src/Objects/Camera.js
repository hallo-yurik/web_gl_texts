class Camera {
    constructor(fov, aspect, near, far) {
        this.fov = fov;
        this.aspect = aspect;
        this.near = near;
        this.far = far;
        this.position = [0, 0, -4];
    }

    getProjectionMatrix() {
        const f = 1.0 / Math.tan(this.fov / 2);
        return new Float32Array([
            f / this.aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (this.far + this.near) / (this.near - this.far), -1,
            0, 0, (2 * this.far * this.near) / (this.near - this.far), 0
        ]);
    }
}

export default Camera;
