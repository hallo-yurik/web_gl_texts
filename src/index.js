import Scene from "./Objects/Scene";

let scene;

window.onload = () => {
    scene = new Scene();
};

window.addEventListener("resize", onWindowResize, false);

function onWindowResize() {
    // if (scene) {
    //     scene.canvas.width = window.innerWidth;
    //     scene.canvas.height = window.innerHeight;
    //     scene.context.viewport(0, 0, scene.canvas.width, scene.canvas.height);
    // }
}
