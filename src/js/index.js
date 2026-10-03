import initTilt from "./tilt";
import initSr from "./sr";
import { addResume, initNav, initCodeRain, setYear, setYearsOfExperience } from "./utils";
import resume from "../assets/resume.pdf";

function loadRobotArm() {
  const mount = document.querySelector("[data-robot-arm]");
  if (!mount) return;
  // Loaded as a separate chunk after the page is ready, so three.js never blocks first paint.
  const run = () =>
    import(/* webpackChunkName: "robot-arm" */ "./robotArm")
      .then(({ default: initRobotArm }) => {
        initRobotArm(mount);
        mount.classList.add("is-ready");
      })
      .catch(() => mount.remove()); // no WebGL → keep the static scene
  // Start after the hero text has animated in.
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
  setTimeout(() => idle(run, { timeout: 1500 }), 1600);
}

export default function initApp() {
  initCodeRain();
  initNav();
  setYear();
  setYearsOfExperience();
  addResume(resume);
  initSr();
  initTilt();
  loadRobotArm();
}
