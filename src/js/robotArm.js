import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
/**
 * RobotArm — a 6-axis industrial robot arm running a pick → scan → place loop.
 *
 * The arm is driven by real inverse kinematics: every frame we move a target
 * point along a path of waypoints and solve the shoulder/elbow/wrist angles to
 * reach it, so the gripper travels in clean straight lines like a real cobot.
 *
 * Performance: renders only while on screen and the tab is visible; shows a
 * still frame when the visitor prefers reduced motion.
 */
// ── Arm dimensions (scene units ≈ metres) ───────────────────────────────────
const SHOULDER_H = 0.78; // shoulder pivot height above the floor
const L1 = 1.45; // lower arm (shoulder → elbow)
const L2 = 1.3; // upper arm (elbow → wrist pivot)
const WRIST_TO_HOLD = 0.62; // wrist pivot → centre of a held cube
const CUBE = 0.22;
const PAD_TOP = 0.07;
const REST_Y = PAD_TOP + CUBE / 2; // cube centre when resting on a pad
const PAD_A = new THREE.Vector3(-1.2, 0, 0.85);
const PAD_B = new THREE.Vector3(1.0, 0, 1.0);
const SCAN = new THREE.Vector3(0, 1.7, 1.2);
const BLUE = new THREE.Color(0x3b82f6); // neon blue (raw)
const EMERALD = new THREE.Color(0x34d399);
const CYAN = new THREE.Color(0x67e8f9);
/**
 * Ported from the delv.bot React component to plain JS — recoloured to neon blue.
 * Usage: initRobotArm(document.querySelector("[data-robot-arm]"))
 */
export default function initRobotArm(el) {
  {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let W = el.clientWidth || 640;
    let H = el.clientHeight || 560;
    // ── RENDERER ───────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.25 : 1.75));
    renderer.setSize(W, H, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.55;
    const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
    const CAM_BASE = new THREE.Vector3(1.2, 2.5, 8.2);
    const LOOK = new THREE.Vector3(-0.75, 1.15, 0.6);
    camera.position.copy(CAM_BASE);
    camera.lookAt(LOOK);
    // ── TEXTURES ───────────────────────────────────────────────────────────
    const haloTex = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const g = c.getContext("2d");
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, "rgba(255,255,255,1)");
      grd.addColorStop(0.2, "rgba(255,255,255,0.55)");
      grd.addColorStop(0.5, "rgba(255,255,255,0.12)");
      grd.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 128);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    const floorTex = (() => {
      const S = 1024;
      const c = document.createElement("canvas");
      c.width = c.height = S;
      const g = c.getContext("2d");
      const cx = S / 2;
      g.strokeStyle = "rgba(59,130,246,0.55)";
      for (let r = 1; r <= 12; r++) {
        g.lineWidth = r % 4 === 0 ? 2.5 : 1;
        g.beginPath();
        g.arc(cx, cx, (r / 12) * cx * 0.98, 0, Math.PI * 2);
        g.stroke();
      }
      g.lineWidth = 1;
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * cx * 0.16, cx + Math.sin(a) * cx * 0.16);
        g.lineTo(cx + Math.cos(a) * cx * 0.98, cx + Math.sin(a) * cx * 0.98);
        g.stroke();
      }
      // radial fade
      g.globalCompositeOperation = "destination-in";
      const fade = g.createRadialGradient(cx, cx, cx * 0.1, cx, cx, cx);
      fade.addColorStop(0, "rgba(0,0,0,1)");
      fade.addColorStop(0.55, "rgba(0,0,0,0.6)");
      fade.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = fade;
      g.fillRect(0, 0, S, S);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    })();
    // ── MATERIALS ──────────────────────────────────────────────────────────
    const shell = new THREE.MeshPhysicalMaterial({
      color: 0x0f1522,
      metalness: 0.35,
      roughness: 0.26,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    });
    const shellLight = new THREE.MeshPhysicalMaterial({
      color: 0x1d2a45,
      metalness: 0.4,
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    });
    const metal = new THREE.MeshStandardMaterial({
      color: 0x8ea3c4,
      metalness: 1,
      roughness: 0.18,
    });
    const gunmetal = new THREE.MeshStandardMaterial({
      color: 0x34415c,
      metalness: 0.95,
      roughness: 0.32,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x0a0f1a,
      metalness: 0.6,
      roughness: 0.5,
    });
    const rubber = new THREE.MeshStandardMaterial({
      color: 0x07060c,
      metalness: 0.1,
      roughness: 0.85,
    });
    const glowMat = (c, intensity = 2.4) =>
      new THREE.MeshStandardMaterial({
        color: c,
        emissive: c,
        emissiveIntensity: intensity,
        toneMapped: false,
      });
    const blue = glowMat(BLUE);
    const blueSoft = glowMat(BLUE, 1.2);
    const cyan = glowMat(CYAN, 2);
    const halo = (color, size, opacity = 0.7) => {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: haloTex,
          color,
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false,
          opacity,
        })
      );
      s.scale.set(size, size, 1);
      return s;
    };
    const mesh = (geo, mat, cast = true) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = cast;
      m.receiveShadow = true;
      return m;
    };
    // ── FLOOR ──────────────────────────────────────────────────────────────
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(3.6, 96),
      new THREE.MeshBasicMaterial({
        map: floorTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.55,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.002;
    scene.add(floor);
    const shadowCatcher = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 64),
      new THREE.ShadowMaterial({ opacity: 0.55 })
    );
    shadowCatcher.rotation.x = -Math.PI / 2;
    shadowCatcher.receiveShadow = true;
    scene.add(shadowCatcher);
    // Rotating holo rings around the base
    const holo = new THREE.Group();
    const ringA = new THREE.Mesh(
      new THREE.RingGeometry(1.02, 1.04, 96, 1, 0, Math.PI * 1.4),
      blueSoft
    );
    const ringB = new THREE.Mesh(
      new THREE.RingGeometry(1.18, 1.19, 96, 1, Math.PI, Math.PI * 0.9),
      blueSoft
    );
    [ringA, ringB].forEach((r) => {
      r.rotation.x = -Math.PI / 2;
      r.position.y = 0.01;
      holo.add(r);
    });
    scene.add(holo);
    // ── PADS (pick / place stations) ───────────────────────────────────────
    const padRings = [];
    for (const p of [PAD_A, PAD_B]) {
      const pad = new THREE.Group();
      pad.position.copy(p);
      pad.add(mesh(new THREE.CylinderGeometry(0.36, 0.4, PAD_TOP, 48), dark));
      pad.children[0].position.y = PAD_TOP / 2;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.34, 0.012, 8, 64),
        blue.clone()
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = PAD_TOP + 0.002;
      pad.add(ring);
      padRings.push(ring);
      scene.add(pad);
    }
    // ── SCAN GATE (where the cube gets "processed") ────────────────────────
    const scanGate = new THREE.Group();
    scanGate.position.copy(SCAN);
    const scanRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.008, 8, 80),
      cyan
    );
    const scanRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.005, 8, 80),
      cyan
    );
    scanRing1.rotation.x = scanRing2.rotation.x = Math.PI / 2;
    const scanHalo = halo(CYAN, 1.6, 0);
    scanGate.add(scanRing1, scanRing2, scanHalo);
    scene.add(scanGate);
    // ── ROBOT ──────────────────────────────────────────────────────────────
    const robot = new THREE.Group();
    scene.add(robot);
    // Plinth
    const plinth = mesh(new THREE.CylinderGeometry(0.72, 0.82, 0.16, 64), dark);
    plinth.position.y = 0.08;
    robot.add(plinth);
    const plinthGlow = new THREE.Mesh(
      new THREE.TorusGeometry(0.76, 0.01, 8, 96),
      blue
    );
    plinthGlow.rotation.x = Math.PI / 2;
    plinthGlow.position.y = 0.165;
    robot.add(plinthGlow);
    // J1 — turret (yaw)
    const turret = new THREE.Group();
    turret.position.y = 0.16;
    robot.add(turret);
    const tBody = mesh(new THREE.CylinderGeometry(0.46, 0.56, 0.4, 64), shell);
    tBody.position.y = 0.2;
    turret.add(tBody);
    const tCap = mesh(
      new THREE.CylinderGeometry(0.38, 0.46, 0.08, 64),
      shellLight
    );
    tCap.position.y = 0.44;
    turret.add(tCap);
    const tBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.515, 0.01, 8, 96),
      blue
    );
    tBand.rotation.x = Math.PI / 2;
    tBand.position.y = 0.3;
    turret.add(tBand);
    // Rear J1/J2 drive housing (classic industrial-robot silhouette)
    const rearBox = mesh(
      new RoundedBoxGeometry(0.36, 0.42, 0.44, 3, 0.06),
      shellLight
    );
    rearBox.position.set(-0.36, 0.52, 0);
    turret.add(rearBox);
    for (let i = 0; i < 4; i++) {
      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(0.012, 0.26, 0.012),
        blueSoft
      );
      vent.position.set(-0.545, 0.52, -0.09 + i * 0.06);
      turret.add(vent);
    }
    // Bolt ring on the turret cap
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const bolt = mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.02, 8),
        metal,
        false
      );
      bolt.position.set(Math.cos(a) * 0.42, 0.49, Math.sin(a) * 0.42);
      turret.add(bolt);
    }
    // Shoulder yoke (two cheeks)
    for (const z of [-0.24, 0.24]) {
      const cheek = mesh(
        new RoundedBoxGeometry(0.46, 0.5, 0.1, 3, 0.04),
        shell
      );
      cheek.position.set(0, SHOULDER_H - 0.16 - 0.08, z);
      turret.add(cheek);
    }
    // J2 — shoulder (pitch)
    const shoulder = new THREE.Group();
    shoulder.position.y = SHOULDER_H - 0.16;
    turret.add(shoulder);
    const shMotor = mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.58, 48),
      shellLight
    );
    shMotor.rotation.x = Math.PI / 2;
    shoulder.add(shMotor);
    for (const z of [-0.3, 0.3]) {
      const cap = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 40), metal);
      cap.rotation.x = Math.PI / 2;
      cap.position.z = z;
      shoulder.add(cap);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.2, 0.008, 8, 64),
        blue
      );
      ring.position.z = z * 1.02;
      shoulder.add(ring);
    }
    for (const z of [-0.3, 0.3]) {
      const h = halo(BLUE, 0.6, 0.45);
      h.position.z = z * 1.05;
      shoulder.add(h);
    }
    // Lower arm link
    const link1 = mesh(
      new RoundedBoxGeometry(L1 + 0.1, 0.34, 0.3, 4, 0.1),
      shell
    );
    link1.position.x = L1 / 2;
    shoulder.add(link1);
    const counterweight = mesh(
      new RoundedBoxGeometry(0.42, 0.4, 0.36, 4, 0.08),
      gunmetal
    );
    counterweight.position.x = -0.3;
    shoulder.add(counterweight);
    const cwGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.22, 0.37),
      blue
    );
    cwGlow.position.x = -0.51;
    shoulder.add(cwGlow);
    for (const z of [-0.155, 0.155]) {
      const panel = mesh(
        new RoundedBoxGeometry(L1 * 0.72, 0.2, 0.02, 2, 0.008),
        shellLight,
        false
      );
      panel.position.set(L1 * 0.5, 0, z);
      shoulder.add(panel);
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(L1 * 0.62, 0.022, 0.006),
        blue
      );
      strip.position.set(L1 * 0.5, 0.04, z * 1.07);
      shoulder.add(strip);
    }
    const cable1 = mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.1, 0.2, -0.17),
          new THREE.Vector3(L1 * 0.5, 0.26, -0.19),
          new THREE.Vector3(L1 - 0.05, 0.16, -0.17),
        ]),
        32,
        0.022,
        8
      ),
      rubber
    );
    shoulder.add(cable1);
    // J3 — elbow (pitch)
    const elbow = new THREE.Group();
    elbow.position.x = L1;
    shoulder.add(elbow);
    const elMotor = mesh(
      new THREE.CylinderGeometry(0.19, 0.19, 0.42, 40),
      shellLight
    );
    elMotor.rotation.x = Math.PI / 2;
    elbow.add(elMotor);
    for (const z of [-0.22, 0.22]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.15, 0.007, 8, 56),
        blue
      );
      ring.position.z = z;
      elbow.add(ring);
    }
    // Rear wrist-drive motor behind the elbow
    const rearMotor = mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.34, 32),
      gunmetal
    );
    rearMotor.rotation.z = Math.PI / 2;
    rearMotor.position.x = -0.32;
    elbow.add(rearMotor);
    const rearCap = new THREE.Mesh(
      new THREE.TorusGeometry(0.11, 0.008, 8, 40),
      blue
    );
    rearCap.rotation.y = Math.PI / 2;
    rearCap.position.x = -0.5;
    elbow.add(rearCap);
    const rearHalo = halo(BLUE, 0.35, 0.5);
    rearHalo.position.x = -0.5;
    elbow.add(rearHalo);
    for (const z of [-0.22, 0.22]) {
      const h = halo(BLUE, 0.42, 0.4);
      h.position.z = z * 1.1;
      elbow.add(h);
    }
    // Upper arm link (tapered: two blocks)
    const link2a = mesh(
      new RoundedBoxGeometry(L2 * 0.55, 0.26, 0.24, 4, 0.08),
      shell
    );
    link2a.position.x = L2 * 0.3;
    elbow.add(link2a);
    const link2b = mesh(
      new RoundedBoxGeometry(L2 * 0.55, 0.2, 0.19, 4, 0.07),
      shell
    );
    link2b.position.x = L2 * 0.72;
    elbow.add(link2b);
    const topStrip = new THREE.Mesh(
      new THREE.BoxGeometry(L2 * 0.8, 0.008, 0.05),
      blue
    );
    topStrip.position.set(L2 * 0.5, 0.132, 0);
    elbow.add(topStrip);
    // Dress cable under the upper arm
    const cable = mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.05, -0.17, 0.1),
          new THREE.Vector3(L2 * 0.45, -0.26, 0.12),
          new THREE.Vector3(L2 - 0.12, -0.14, 0.1),
        ]),
        32,
        0.024,
        8
      ),
      rubber
    );
    elbow.add(cable);
    // J5 — wrist (pitch)
    const wrist = new THREE.Group();
    wrist.position.x = L2;
    elbow.add(wrist);
    const wrMotor = mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.26, 36),
      shellLight
    );
    wrMotor.rotation.x = Math.PI / 2;
    wrist.add(wrMotor);
    const wrRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.1, 0.006, 8, 48),
      blue
    );
    wrRing.position.z = 0.135;
    wrist.add(wrRing);
    const wrLink = mesh(
      new THREE.CylinderGeometry(0.1, 0.115, 0.26, 36),
      shell
    );
    wrLink.rotation.z = -Math.PI / 2;
    wrLink.position.x = 0.15;
    wrist.add(wrLink);
    // J6 — flange (roll) + gripper
    const flange = new THREE.Group();
    flange.position.x = 0.29;
    wrist.add(flange);
    const fDisk = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 40), metal);
    fDisk.rotation.z = -Math.PI / 2;
    flange.add(fDisk);
    const fRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.122, 0.008, 8, 48),
      blue
    );
    fRing.rotation.y = Math.PI / 2;
    fRing.position.x = 0.026;
    flange.add(fRing);
    const palm = mesh(new RoundedBoxGeometry(0.1, 0.14, 0.32, 2, 0.03), shell);
    palm.position.x = 0.08;
    flange.add(palm);
    const fingers = [];
    for (const side of [-1, 1]) {
      const f = new THREE.Group();
      f.position.x = 0.13;
      const body = mesh(
        new RoundedBoxGeometry(0.24, 0.1, 0.035, 2, 0.012),
        shellLight
      );
      body.position.x = 0.12;
      f.add(body);
      const pad = mesh(new THREE.BoxGeometry(0.1, 0.08, 0.012), rubber, false);
      pad.position.set(0.17, 0, -side * 0.022);
      f.add(pad);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.04), blue);
      tip.position.x = 0.245;
      f.add(tip);
      f.userData.side = side;
      flange.add(f);
      fingers.push(f);
    }
    const gripHalo = halo(BLUE, 0.55, 0.5);
    gripHalo.position.x = 0.36;
    flange.add(gripHalo);
    const HOLD_LOCAL = new THREE.Vector3(WRIST_TO_HOLD - 0.29, 0, 0); // in flange space
    // Hydraulic pistons (turret → lower arm), updated every frame
    const pistonBarrels = [];
    const pistonRods = [];
    for (const z of [-0.36, 0.36]) {
      const barrel = mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 1, 20),
        shellLight
      );
      const rod = mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 16), metal);
      barrel.userData.z = rod.userData.z = z;
      turret.add(barrel, rod);
      pistonBarrels.push(barrel);
      pistonRods.push(rod);
    }
    const PISTON_BASE = (z) => new THREE.Vector3(-0.32, 0.18, z); // turret space
    const PISTON_END = (z) => new THREE.Vector3(0.62, -0.2, z); // shoulder space
    // ── CUBE (the workpiece) ───────────────────────────────────────────────
    const cube = new THREE.Group();
    const cubeShellMat = new THREE.MeshPhysicalMaterial({
      color: 0x182642,
      metalness: 0.3,
      roughness: 0.15,
      clearcoat: 1,
      emissive: BLUE.clone(),
      emissiveIntensity: 0.25,
    });
    const cubeCoreMat = glowMat(BLUE.clone(), 3);
    cube.add(
      mesh(new RoundedBoxGeometry(CUBE, CUBE, CUBE, 3, 0.03), cubeShellMat)
    );
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(
        new THREE.BoxGeometry(CUBE * 1.01, CUBE * 1.01, CUBE * 1.01)
      ),
      new THREE.LineBasicMaterial({ color: BLUE.clone(), toneMapped: false })
    );
    cube.add(edges);
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(CUBE * 0.3),
      cubeCoreMat
    );
    cube.add(core);
    const cubeHalo = halo(BLUE, 0.9, 0.65);
    cube.add(cubeHalo);
    scene.add(cube);
    const cubeLight = new THREE.PointLight(BLUE, 2.2, 2.6, 2);
    cube.add(cubeLight);
    // ── PARTICLES ──────────────────────────────────────────────────────────
    const P = 140;
    const pPos = new Float32Array(P * 3);
    const pSpeed = new Float32Array(P);
    for (let i = 0; i < P; i++) {
      const r = 0.6 + Math.random() * 2.8;
      const a = Math.random() * Math.PI * 2;
      pPos[i * 3] = Math.cos(a) * r;
      pPos[i * 3 + 1] = Math.random() * 3.2;
      pPos[i * 3 + 2] = Math.sin(a) * r;
      pSpeed[i] = 0.05 + Math.random() * 0.12;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const particles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        size: 0.045,
        map: haloTex,
        color: 0x93c5fd,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    scene.add(particles);
    // ── LIGHTS ─────────────────────────────────────────────────────────────
    const key = new THREE.DirectionalLight(0xe3edff, 2.4);
    key.position.set(3, 7, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = key.shadow.camera.bottom = -3.5;
    key.shadow.camera.right = key.shadow.camera.top = 3.5;
    key.shadow.bias = -0.0005;
    key.shadow.radius = 4;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x3b82f6, 4.5);
    rim.position.set(-4, 4, -5);
    scene.add(rim);
    const kicker = new THREE.DirectionalLight(0x67e8f9, 1.2);
    kicker.position.set(5, 2, -2);
    scene.add(kicker);
    const under = new THREE.PointLight(0x2563eb, 3, 4, 2);
    under.position.set(0, 0.4, 1.4);
    scene.add(under);
    scene.add(new THREE.HemisphereLight(0x7ba7ff, 0x060a14, 0.35));
    // ── MOTION: waypoints + IK ─────────────────────────────────────────────
    const above = (p, y) => new THREE.Vector3(p.x, y, p.z);
    const buildPath = (from, to) => [
      { to: above(from, REST_Y), dur: 0.9, grip: 0 },
      { to: above(from, REST_Y), dur: 0.35, grip: 1, action: "grab" },
      { to: above(from, 0.95), dur: 0.7, grip: 1 },
      { to: SCAN.clone(), dur: 1.2, grip: 1 },
      { to: SCAN.clone(), dur: 1.1, grip: 1, scan: true },
      { to: above(to, 0.95), dur: 1.2, grip: 1 },
      { to: above(to, REST_Y), dur: 0.75, grip: 1 },
      { to: above(to, REST_Y), dur: 0.35, grip: 0, action: "release" },
      { to: above(to, 0.95), dur: 0.7, grip: 0 },
    ];
    let src = PAD_A;
    let dst = PAD_B;
    let path = buildPath(src, dst);
    let stepIdx = 0;
    let stepT = 0;
    const target = above(src, 0.95); // current gripper hold-point target
    let segStart = target.clone();
    let grip = 0;
    let gripStart = 0;
    let holding = false;
    const cubeRest = above(src, REST_Y);
    let processed = 0; // 0 = raw (blue), 1 = processed (emerald)
    let processedTarget = 0;
    let scanPulse = 0;
    const ease = (x) =>
      x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    // Solve joint angles so the hold point reaches `p` with the gripper pointing down
    const solveIK = (p) => {
      const yaw = Math.atan2(-p.z, p.x);
      const r = Math.hypot(p.x, p.z);
      const dy = p.y + WRIST_TO_HOLD - SHOULDER_H;
      let d = Math.hypot(r, dy);
      d = Math.min(d, L1 + L2 - 0.001);
      const cosE = THREE.MathUtils.clamp(
        (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2),
        -1,
        1
      );
      const elbowA = -Math.acos(cosE); // elbow-up
      const shoulderA =
        Math.atan2(dy, r) -
        Math.atan2(L2 * Math.sin(elbowA), L1 + L2 * Math.cos(elbowA));
      const wristA = -Math.PI / 2 - shoulderA - elbowA;
      turret.rotation.y = yaw;
      shoulder.rotation.z = shoulderA;
      elbow.rotation.z = elbowA;
      wrist.rotation.z = wristA;
    };
    const _a = new THREE.Vector3();
    const _b = new THREE.Vector3();
    const _dir = new THREE.Vector3();
    const UP = new THREE.Vector3(0, 1, 0);
    const placeBetween = (m, a, b) => {
      _dir.subVectors(b, a);
      const len = _dir.length();
      m.position.copy(a).addScaledVector(_dir, 0.5);
      m.scale.set(1, len, 1);
      m.quaternion.setFromUnitVectors(UP, _dir.normalize());
    };
    const updatePistons = () => {
      robot.updateMatrixWorld(true);
      for (let i = 0; i < pistonBarrels.length; i++) {
        const z = pistonBarrels[i].userData.z;
        _a.copy(PISTON_BASE(z));
        _b.copy(PISTON_END(z));
        shoulder.localToWorld(_b);
        turret.worldToLocal(_b);
        const barrelEnd = _dir
          .subVectors(_b, _a)
          .multiplyScalar(0.55)
          .add(_a)
          .clone();
        placeBetween(pistonBarrels[i], _a, barrelEnd);
        placeBetween(pistonRods[i], _a.clone(), _b);
      }
    };
    const holdWorld = new THREE.Vector3();
    const colorNow = new THREE.Color();
    // Cursor parallax
    let mx = 0,
      my = 0,
      sx = 0,
      sy = 0;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      my = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    const onLeave = () => {
      mx = 0;
      my = 0;
    };
    window.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    let t = 0;
    const tick = (dt) => {
      t += dt;
      // Advance along the path
      const step = path[stepIdx];
      stepT += dt / step.dur;
      const k = ease(Math.min(stepT, 1));
      target.lerpVectors(segStart, step.to, k);
      grip = THREE.MathUtils.lerp(gripStart, step.grip, k);
      if (step.scan) {
        processedTarget = processed > 0.5 ? 0 : 1;
        scanPulse = Math.sin(Math.min(stepT, 1) * Math.PI);
      } else {
        scanPulse *= 0.9;
      }
      if (stepT >= 1) {
        if (step.action === "grab") holding = true;
        if (step.action === "release") {
          holding = false;
          cubeRest.copy(above(dst, REST_Y));
        }
        if (step.scan) processed = processedTarget;
        segStart = step.to.clone();
        gripStart = step.grip;
        stepT = 0;
        stepIdx++;
        if (stepIdx >= path.length) {
          [src, dst] = [dst, src];
          path = buildPath(src, dst);
          stepIdx = 0;
        }
      }
      // Pose the arm
      solveIK(target);
      flange.rotation.x = step.scan ? ease(Math.min(stepT, 1)) * Math.PI : 0;
      for (const f of fingers)
        f.position.z = f.userData.side * (0.155 - grip * 0.032);
      updatePistons();
      // Cube follows the gripper while held
      if (holding) {
        flange.localToWorld(holdWorld.copy(HOLD_LOCAL));
        cube.position.copy(holdWorld);
        cube.quaternion.copy(flange.getWorldQuaternion(new THREE.Quaternion()));
      } else {
        cube.position.copy(cubeRest);
        cube.rotation.set(0, cube.rotation.y, 0);
      }
      // Colour: blue (raw) ↔ emerald (processed); cyan flash during scan
      const proc = step.scan
        ? THREE.MathUtils.lerp(processed, processedTarget, Math.min(stepT, 1))
        : processed;
      colorNow
        .copy(BLUE)
        .lerp(EMERALD, proc)
        .lerp(CYAN, scanPulse * 0.6);
      cubeCoreMat.color.copy(colorNow);
      cubeCoreMat.emissive.copy(colorNow);
      cubeShellMat.emissive.copy(colorNow);
      edges.material.color.copy(colorNow);
      cubeHalo.material.color.copy(colorNow);
      cubeLight.color.copy(colorNow);
      core.rotation.y += dt * 1.6;
      core.rotation.x += dt * 0.7;
      // Scene life
      scanRing1.rotation.z += dt * (0.6 + scanPulse * 6);
      scanRing2.rotation.z -= dt * (0.4 + scanPulse * 4);
      scanRing1.scale.setScalar(1 + scanPulse * 0.15);
      scanHalo.material.opacity = scanPulse * 0.9;
      holo.rotation.y += dt * 0.15;
      padRings.forEach((ring, i) => {
        const near =
          (i === 0 ? PAD_A : PAD_B).distanceTo(
            new THREE.Vector3(target.x, 0, target.z)
          ) < 0.4 && target.y < 0.6;
        ring.material.emissiveIntensity = THREE.MathUtils.lerp(
          ring.material.emissiveIntensity,
          near ? 4 : 1.6,
          0.1
        );
      });
      gripHalo.material.opacity = 0.35 + 0.25 * Math.sin(t * 3);
      const pos = pGeo.attributes.position;
      for (let i = 0; i < P; i++) {
        let y = pos.getY(i) + pSpeed[i] * dt;
        if (y > 3.3) y = 0;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
      // Camera parallax
      sx += (mx - sx) * Math.min(1, dt * 3);
      sy += (my - sy) * Math.min(1, dt * 3);
      // Narrow (portrait) canvases: pull back so the whole cell fits
      const fit = camera.aspect < 1 ? 1 + (1 - camera.aspect) * 0.9 : 1;
      camera.position.set(
        LOOK.x + (CAM_BASE.x - LOOK.x) * fit + sx * 0.7,
        LOOK.y + (CAM_BASE.y - LOOK.y) * fit - sy * 0.35,
        LOOK.z + (CAM_BASE.z - LOOK.z) * fit - sx * 0.3
      );
      camera.lookAt(LOOK);
    };
    // ── LOOP ───────────────────────────────────────────────────────────────
    let rafId;
    let last = performance.now();
    let inView = true;
    const shouldRun = () => inView && !document.hidden && !reducedMotion;
    const frame = () => {
      rafId = requestAnimationFrame(frame);
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      tick(dt);
      renderer.render(scene, camera);
    };
    const start = () => {
      if (rafId === undefined && shouldRun()) {
        last = performance.now();
        rafId = requestAnimationFrame(frame);
      }
    };
    const stop = () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      rafId = undefined;
    };
    if (reducedMotion) {
      // Still frame: the arm holding the cube at the scan gate
      for (let i = 0; i < 160; i++) tick(1 / 30);
      renderer.render(scene, camera);
    } else {
      tick(0);
      renderer.render(scene, camera);
      start();
    }
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) start();
      else stop();
    });
    io.observe(el);
    const onVisibility = () => (shouldRun() ? start() : stop());
    document.addEventListener("visibilitychange", onVisibility);
    const ro = new ResizeObserver(() => {
      W = el.clientWidth;
      H = el.clientHeight;
      if (!W || !H) return;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H, false);
      if (!shouldRun()) renderer.render(scene, camera);
    });
    ro.observe(el);
    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      scene.traverse((obj) => {
        const m = obj;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material;
        if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose());
      });
      haloTex.dispose();
      floorTex.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }
}
