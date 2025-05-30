import Scene from "./Objects/Scene";

let scene;

window.onload = () => {
    scene = new Scene();
};

const loadingElement = document.getElementById("loading");
const loadingTextBase = loadingElement.innerText;
let dotsAmount = 0;

const loadingInterval = setInterval(() => {
    dotsAmount++;
    dotsAmount %= 4;

    loadingElement.innerText = `${loadingTextBase}${".".repeat(dotsAmount)}`;
}, 200);

export const stopLoadingInterval = () => {
    loadingElement.style.display = "none";
    clearInterval(loadingInterval);
};

window.addEventListener("resize", onWindowResize, false);

function onWindowResize() {
}
