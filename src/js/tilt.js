import tilt from "tilt.js";

export default function initTilt() {
  if (window.matchMedia("(hover: none)").matches) return;
  $(".js-tilt").tilt({
    maxTilt: 4,
    glare: true,
    maxGlare: 0.12,
    perspective: 1200,
  });
}
