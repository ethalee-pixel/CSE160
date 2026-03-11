import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { VertexNormalsHelper } from "three/addons/helpers/VertexNormalsHelper.js";

const root = document.getElementById("game-root");
const launchButton = document.getElementById("launch");
const resetButton = document.getElementById("reset-position");
const levelLabel = document.getElementById("level");
const progressLabel = document.getElementById("progress");
const fpsLabel = document.getElementById("fps");
const hintLabel = document.getElementById("hint");

const featureState = {
  lightingEnabled: true,
  normalsEnabled: false,
  ambientLightEnabled: true,
  hemisphereLightEnabled: true,
  directionalLightEnabled: true,
  pointLightEnabled: true,
  spotLightEnabled: true,
  lightAnimationEnabled: true,
};

const featureInputs = {
  lightingEnabled: document.getElementById("toggle-lighting"),
  normalsEnabled: document.getElementById("toggle-normals"),
  ambientLightEnabled: document.getElementById("toggle-ambient-light"),
  hemisphereLightEnabled: document.getElementById("toggle-hemisphere-light"),
  directionalLightEnabled: document.getElementById("toggle-directional-light"),
  pointLightEnabled: document.getElementById("toggle-point-light"),
  spotLightEnabled: document.getElementById("toggle-spot-light"),
  lightAnimationEnabled: document.getElementById("toggle-light-animation"),
};

const worldLimit = 42;
const eyeHeight = 1.7;
const gravity = 17;
const baseMoveSpeed = 10.5;
const boostedMoveSpeed = 16.5;
const speedBoostDuration = 9;
const jumpBoostDuration = 11;
const jumpBoostVelocity = 10.6;
const revealDuration = 12;
const blackoutDuration = 30;
const moveState = { forward: false, backward: false, left: false, right: false };

let velocityY = 0;
let canJump = true;
let currentLevelIndex = 0;
let treasureCount = 0;
let currentTreasureGoal = 0;
let levelReady = false;
let portalUnlocked = false;
let gameWon = false;
let fpsAccumulator = 0;
let fpsFrames = 0;
let tentPrototype = null;
let vasePrototype = null;
let speedBoostTimer = 0;
let jumpBoostTimer = 0;
let revealTimer = 0;
let blackoutTimer = 0;

const dynamicLevelRoot = new THREE.Group();
const helperRoot = new THREE.Group();
const colliders = [];
const animatedObjects = [];
const treasures = [];
const powerups = [];
const normalHelpers = [];
const portalState = { group: null, position: new THREE.Vector3() };

const clock = new THREE.Clock();
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x06131d, 0.0085);
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, eyeHeight, 26);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
root.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
launchButton.addEventListener("click", () => {
  if (gameWon) {
    gameWon = false;
    loadLevel(0);
  }
  controls.lock();
});
resetButton.addEventListener("click", () => {
  resetPlayerToStart();
});
controls.addEventListener("lock", () => {
  if (blackoutTimer > 0) {
    hintLabel.textContent = `Trap active. Main lights are out for ${Math.ceil(blackoutTimer)} more seconds.`;
  } else if (revealTimer > 0) {
    hintLabel.textContent = `Oracle vase active for ${Math.ceil(revealTimer)} more seconds. Hidden relics glow brighter in the maze.`;
  } else if (jumpBoostTimer > 0) {
    hintLabel.textContent = `Jump vase active for ${Math.ceil(jumpBoostTimer)} more seconds. Use the taller hop to scout routes.`;
  } else if (speedBoostTimer > 0) {
    hintLabel.textContent = `Speed boost active for ${Math.ceil(speedBoostTimer)} more seconds. Find the rest of the treasure.`;
  } else {
    hintLabel.textContent = "Search the map for glowing treasure. When the portal appears, walk into it to reach the next level.";
  }
});
controls.addEventListener("unlock", () => {
  if (gameWon) {
    hintLabel.textContent = "You won. Press Start Exploring to replay the three-level treasure hunt.";
    return;
  }

  hintLabel.textContent = levelReady
    ? "Paused. Press Start Exploring to jump back in."
    : "Loading the next area. Press Start Exploring when the scene is ready.";
});

scene.background = new THREE.CubeTextureLoader().load([
  "./assets/skybox/px.svg",
  "./assets/skybox/nx.svg",
  "./assets/skybox/py.svg",
  "./assets/skybox/ny.svg",
  "./assets/skybox/pz.svg",
  "./assets/skybox/nz.svg",
]);

const textureLoader = new THREE.TextureLoader();
const groundTexture = textureLoader.load("./grass.jpg");
groundTexture.wrapS = THREE.RepeatWrapping;
groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(22, 22);

const wallTexture = textureLoader.load("./walls.jpg");
wallTexture.wrapS = THREE.RepeatWrapping;
wallTexture.wrapT = THREE.RepeatWrapping;
wallTexture.repeat.set(2, 1.5);

const leafTexture = textureLoader.load("./tree.jpg");
leafTexture.wrapS = THREE.RepeatWrapping;
leafTexture.wrapT = THREE.RepeatWrapping;
leafTexture.repeat.set(1, 1);

const groundMaterial = new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 0.94, metalness: 0.04 });
const stoneMaterial = new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.9, metalness: 0.08 });
const crateMaterial = new THREE.MeshStandardMaterial({ color: 0x7a5a3d, roughness: 0.85, metalness: 0.05 });
const bronzeMaterial = new THREE.MeshStandardMaterial({ color: 0xb38853, roughness: 0.36, metalness: 0.48 });
const leafMaterial = new THREE.MeshStandardMaterial({ map: leafTexture, color: 0xd4ffd0, roughness: 0.96, metalness: 0.02 });
const barkMaterial = new THREE.MeshStandardMaterial({ color: 0x4e311d, roughness: 0.95, metalness: 0.01 });
const waterMaterial = new THREE.MeshStandardMaterial({ color: 0x3ca6ff, emissive: 0x0f3d69, roughness: 0.2, metalness: 0.15 });
const fireflyMaterial = new THREE.MeshStandardMaterial({
  color: 0xd8ff7a,
  emissive: 0xc8ff57,
  emissiveIntensity: 2.1,
  roughness: 0.2,
  metalness: 0.02,
});
const treasureMaterial = new THREE.MeshStandardMaterial({
  color: 0x9cefff,
  emissive: 0x2aaeff,
  emissiveIntensity: 1.8,
  roughness: 0.18,
  metalness: 0.18,
});
const portalMaterial = new THREE.MeshStandardMaterial({
  color: 0xffd783,
  emissive: 0xffb52f,
  emissiveIntensity: 1.4,
  roughness: 0.18,
  metalness: 0.35,
});
const vasePowerupMaterial = new THREE.MeshStandardMaterial({
  color: 0xffe0a1,
  emissive: 0xffa53a,
  emissiveIntensity: 1.15,
  roughness: 0.28,
  metalness: 0.22,
});

const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
scene.add(dynamicLevelRoot);
scene.add(helperRoot);

const ambient = new THREE.AmbientLight(0xd7e9ff, 0.32);
scene.add(ambient);

const hemisphere = new THREE.HemisphereLight(0x8cd4ff, 0x182311, 0.66);
scene.add(hemisphere);

const sun = new THREE.DirectionalLight(0xfff1ca, 1.3);
sun.position.set(26, 34, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -70;
sun.shadow.camera.right = 70;
sun.shadow.camera.top = 70;
sun.shadow.camera.bottom = -70;
scene.add(sun);

const levelGlow = new THREE.PointLight(0x58b7ff, 1.9, 28);
levelGlow.position.set(0, 5, 0);
levelGlow.castShadow = true;
scene.add(levelGlow);

const sweepLight = new THREE.SpotLight(0xffd06a, 3.2, 110, Math.PI / 5, 0.28, 1);
sweepLight.position.set(-18, 18, -14);
sweepLight.castShadow = true;
scene.add(sweepLight);
scene.add(sweepLight.target);

const campLight = new THREE.PointLight(0xff8f45, 1.7, 20);
campLight.position.set(18, 2.5, 14);
scene.add(campLight);

const levelGlowMarker = new THREE.Mesh(
  new THREE.BoxGeometry(0.9, 0.9, 0.9),
  new THREE.MeshBasicMaterial({ color: 0x58b7ff, wireframe: true }),
);
scene.add(levelGlowMarker);

const campLightMarker = new THREE.Mesh(
  new THREE.BoxGeometry(0.8, 0.8, 0.8),
  new THREE.MeshBasicMaterial({ color: 0xff8f45, wireframe: true }),
);
scene.add(campLightMarker);

function syncPointLightMarkers() {
  levelGlowMarker.position.copy(levelGlow.position);
  campLightMarker.position.copy(campLight.position);
}

function clearNormalHelpers() {
  helperRoot.clear();
  normalHelpers.length = 0;
}

function registerNormalHelper(mesh, size = 0.45, color = 0x66ff99) {
  const helper = new VertexNormalsHelper(mesh, size, color);
  helper.visible = featureState.normalsEnabled;
  helperRoot.add(helper);
  normalHelpers.push(helper);
}

function syncFeatureUi() {
  featureInputs.ambientLightEnabled.disabled = !featureState.lightingEnabled;
  featureInputs.hemisphereLightEnabled.disabled = !featureState.lightingEnabled;
  featureInputs.directionalLightEnabled.disabled = !featureState.lightingEnabled;
  featureInputs.pointLightEnabled.disabled = !featureState.lightingEnabled;
  featureInputs.spotLightEnabled.disabled = !featureState.lightingEnabled;
  featureInputs.lightAnimationEnabled.disabled = !featureState.lightingEnabled;
}

function applyFeatureToggles() {
  const lightingOn = featureState.lightingEnabled;
  const blackoutActive = blackoutTimer > 0;
  const pointLightsVisible = lightingOn && featureState.pointLightEnabled;

  ambient.visible = lightingOn && featureState.ambientLightEnabled && !blackoutActive;
  hemisphere.visible = lightingOn && featureState.hemisphereLightEnabled && !blackoutActive;
  sun.visible = lightingOn && featureState.directionalLightEnabled && !blackoutActive;
  levelGlow.visible = pointLightsVisible;
  campLight.visible = pointLightsVisible;
  levelGlowMarker.visible = pointLightsVisible;
  campLightMarker.visible = pointLightsVisible;
  sweepLight.visible = lightingOn && featureState.spotLightEnabled;

  normalHelpers.forEach((helper) => {
    helper.visible = featureState.normalsEnabled;
  });

  syncFeatureUi();
}

Object.entries(featureInputs).forEach(([key, input]) => {
  input.addEventListener("change", () => {
    featureState[key] = input.checked;
    applyFeatureToggles();
  });
});

function disposeLevel() {
  dynamicLevelRoot.clear();
  clearNormalHelpers();
  colliders.length = 0;
  animatedObjects.length = 0;
  treasures.length = 0;
  powerups.length = 0;
  portalState.group = null;
}

function addMesh(geometry, material, position, options = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.castShadow = options.castShadow !== false;
  mesh.receiveShadow = options.receiveShadow !== false;

  if (options.rotation) {
    mesh.rotation.set(options.rotation.x, options.rotation.y, options.rotation.z);
  }
  if (options.scale) {
    mesh.scale.copy(options.scale);
  }

  dynamicLevelRoot.add(mesh);

  if (options.collider) {
    mesh.geometry.computeBoundingBox();
    const bounds = mesh.geometry.boundingBox;
    const height = (bounds.max.y - bounds.min.y) * mesh.scale.y;
    colliders.push({
      position: mesh.position,
      radius: options.collider,
      top: mesh.position.y + height / 2,
    });
  }

  if (options.animation) {
    animatedObjects.push({ mesh, ...options.animation });
  }

  registerNormalHelper(mesh, options.normalSize ?? 0.45, options.normalColor ?? 0x66ff99);
  return mesh;
}

function addTreasure(position, shape = "sphere") {
  const geometry = shape === "octa"
    ? new THREE.OctahedronGeometry(0.8)
    : shape === "cylinder"
      ? new THREE.CylinderGeometry(0.45, 0.45, 1.2, 16)
      : new THREE.SphereGeometry(0.7, 24, 24);

  const treasure = addMesh(geometry, treasureMaterial, position.clone(), {
    animation: { type: "treasure", baseY: position.y, offset: Math.random() * Math.PI * 2 },
    normalColor: 0x30c8ff,
  });
  treasures.push(treasure);
}

function addVaseCollectible(position, effectType) {
  if (!vasePrototype) {
    return;
  }

  const effectConfig = {
    speed: { color: 0xffc25f, helperColor: 0xffa347, rotation: Math.PI * 0.2, animationType: "powerup" },
    blackout: { color: 0xff8f52, helperColor: 0xff7a3d, rotation: Math.PI * 0.47, animationType: "trap-powerup" },
    jump: { color: 0x7fd6ff, helperColor: 0x5fbfff, rotation: Math.PI * 0.34, animationType: "jump-powerup" },
    reveal: { color: 0xd98cff, helperColor: 0xc26cff, rotation: Math.PI * 0.6, animationType: "reveal-powerup" },
  }[effectType];

  const vase = vasePrototype.clone(true);
  vase.position.copy(position);
  vase.scale.setScalar(1.3);
  vase.rotation.y = effectConfig.rotation;
  vase.traverse((child) => {
    if (child.isMesh) {
      child.material = vasePowerupMaterial.clone();
      child.material.color.setHex(effectConfig.color);
      child.material.emissive.setHex(effectConfig.color);
      child.castShadow = true;
      child.receiveShadow = true;
      registerNormalHelper(child, 0.26, effectConfig.helperColor);
    }
  });
  dynamicLevelRoot.add(vase);
  animatedObjects.push({
    mesh: vase,
    type: effectConfig.animationType,
    baseY: position.y,
    offset: effectType === "blackout" ? Math.PI * 0.9 : Math.PI / 3,
  });
  powerups.push({ mesh: vase, collected: false, radius: 2.6, effectType });
}

function addSpeedVase(position) {
  addVaseCollectible(position, "speed");
}

function addBlackoutVase(position) {
  addVaseCollectible(position, "blackout");
}

function addJumpVase(position) {
  addVaseCollectible(position, "jump");
}

function addRevealVase(position) {
  addVaseCollectible(position, "reveal");
}

function addPortal(position) {
  const group = new THREE.Group();
  group.position.copy(position);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.32, 18, 64), portalMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.castShadow = true;
  group.add(ring);
  registerNormalHelper(ring, 0.3, 0xffcc66);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 20, 20),
    new THREE.MeshStandardMaterial({
      color: 0xffefb2,
      emissive: 0xffb347,
      emissiveIntensity: 2.2,
      transparent: true,
      opacity: 0.82,
      roughness: 0.18,
      metalness: 0.08,
    })
  );
  core.castShadow = true;
  group.add(core);
  registerNormalHelper(core, 0.25, 0xff9966);

  dynamicLevelRoot.add(group);
  animatedObjects.push({ mesh: ring, type: "portal-ring" });
  animatedObjects.push({ mesh: core, type: "portal-core", baseY: 1.2 });

  portalState.group = group;
  portalState.position.copy(position);
}

function addWallRun(startX, endX, z, y = 1.5) {
  for (let x = startX; x <= endX; x += 4) {
    addMesh(new THREE.BoxGeometry(3.8, 3, 2.4), stoneMaterial, new THREE.Vector3(x, y, z), { collider: 1.6 });
  }
}

function addWallColumn(x, startZ, endZ, y = 1.5) {
  for (let z = startZ; z <= endZ; z += 4) {
    addMesh(new THREE.BoxGeometry(2.4, 3, 3.8), stoneMaterial, new THREE.Vector3(x, y, z), { collider: 1.6 });
  }
}

function addColumnRing(centerX, centerZ, radius, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    addMesh(
      new THREE.CylinderGeometry(0.75, 0.95, 7, 18),
      stoneMaterial,
      new THREE.Vector3(centerX + Math.cos(angle) * radius, 3.5, centerZ + Math.sin(angle) * radius),
      { collider: 1.1 }
    );
  }
}

function addForestPatch(basePositions) {
  basePositions.forEach(([x, z]) => {
    addMesh(new THREE.CylinderGeometry(0.32, 0.45, 3.2, 10), barkMaterial, new THREE.Vector3(x, 1.6, z));
    addMesh(new THREE.ConeGeometry(1.8, 4.4, 14), leafMaterial, new THREE.Vector3(x, 4.8, z));
  });
}

function addCrateField(positions) {
  positions.forEach(([x, z], index) => {
    addMesh(
      new THREE.BoxGeometry(2.3, 2.3, 2.3),
      index % 2 === 0 ? crateMaterial : stoneMaterial,
      new THREE.Vector3(x, 1.15, z),
      { rotation: new THREE.Euler(0, index * 0.15, 0), collider: 1.3 }
    );
  });
}

function addPools(positions) {
  positions.forEach(([x, z]) => {
    addMesh(
      new THREE.CylinderGeometry(2.1, 2.1, 0.18, 28),
      waterMaterial,
      new THREE.Vector3(x, 0.09, z),
      { receiveShadow: true, castShadow: false, normalColor: 0x7ccfff, normalSize: 0.3 }
    );
  });
}

function addCamp(position) {
  addMesh(new THREE.CylinderGeometry(0.18, 0.18, 1.8, 10), barkMaterial, new THREE.Vector3(position.x - 0.35, 0.28, position.z), {
    rotation: new THREE.Euler(0.3, 0, Math.PI / 3),
    normalSize: 0.25,
  });
  addMesh(new THREE.CylinderGeometry(0.18, 0.18, 1.8, 10), barkMaterial, new THREE.Vector3(position.x + 0.35, 0.28, position.z), {
    rotation: new THREE.Euler(-0.3, 0, -Math.PI / 3),
    normalSize: 0.25,
  });

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.65, 1.55, 10),
    new THREE.MeshStandardMaterial({
      color: 0xffa13c,
      emissive: 0xff6200,
      emissiveIntensity: 1.8,
      roughness: 0.55,
    })
  );
  flame.position.set(position.x, 1.05, position.z);
  flame.castShadow = true;
  dynamicLevelRoot.add(flame);
  animatedObjects.push({ mesh: flame, type: "flame" });
  registerNormalHelper(flame, 0.25, 0xff8844);
}

function addFireflyCluster(position, count = 8, color = 0xd8ff7a) {
  for (let i = 0; i < count; i += 1) {
    const firefly = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 10, 10),
      fireflyMaterial.clone(),
    );
    firefly.material.color.setHex(color);
    firefly.material.emissive.setHex(color);
    firefly.position.copy(position);
    dynamicLevelRoot.add(firefly);
    animatedObjects.push({
      mesh: firefly,
      type: "firefly",
      anchor: position.clone(),
      radius: 1.6 + Math.random() * 1.8,
      speed: 0.9 + Math.random() * 1.4,
      baseY: 1 + Math.random() * 2.4,
      offset: Math.random() * Math.PI * 2,
      verticalOffset: Math.random() * Math.PI * 2,
    });
  }
}

function addCrystalBeacon(position, color = 0x73d7ff) {
  const group = new THREE.Group();
  group.position.copy(position);

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.46, 8.5, 16, 1, true),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.35,
      roughness: 0.18,
      metalness: 0.08,
      side: THREE.DoubleSide,
    })
  );
  beam.position.y = 4.2;
  group.add(beam);

  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.2),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.9,
      roughness: 0.22,
      metalness: 0.34,
    })
  );
  crystal.position.y = 2.5;
  crystal.castShadow = true;
  group.add(crystal);

  const ringA = new THREE.Mesh(
    new THREE.TorusGeometry(1.8, 0.08, 12, 40),
    new THREE.MeshStandardMaterial({ color: 0xfff2b8, emissive: 0xffcc66, emissiveIntensity: 1.2, roughness: 0.28 })
  );
  ringA.rotation.x = Math.PI / 2;
  ringA.position.y = 1.2;
  group.add(ringA);

  const ringB = ringA.clone();
  ringB.scale.setScalar(0.72);
  ringB.position.y = 3.7;
  ringB.rotation.y = Math.PI / 3;
  group.add(ringB);

  dynamicLevelRoot.add(group);
  animatedObjects.push({ mesh: crystal, type: "crystal-core", baseY: crystal.position.y, offset: Math.random() * Math.PI * 2 });
  animatedObjects.push({ mesh: ringA, type: "crystal-ring", direction: 1, offset: Math.random() * Math.PI * 2 });
  animatedObjects.push({ mesh: ringB, type: "crystal-ring", direction: -1, offset: Math.random() * Math.PI * 2 });
  animatedObjects.push({ mesh: beam, type: "crystal-beam", baseScale: 1, offset: Math.random() * Math.PI * 2 });
  registerNormalHelper(crystal, 0.28, color);
}

function buildLevelOne() {
  addWallRun(-28, -8, -18);
  addWallRun(10, 30, -18);
  addWallRun(-16, 12, -2);
  addWallColumn(-14, -14, 10);
  addWallColumn(14, -14, 14);
  addColumnRing(0, 0, 8, 8);
  addWallRun(-32, -8, 16);
  addWallRun(8, 28, 16);
  addWallRun(-6, 18, -28);
  addWallColumn(-28, -10, 22);
  addWallColumn(28, -18, 18);
  addForestPatch([[-30, 26], [-24, 30], [-18, 24], [26, 30], [32, 24], [22, 24]]);
  addCrateField([[-18, 8], [-12, 12], [14, 10], [20, 14], [26, 18], [-24, 14]]);
  addPools([[-8, -8], [8, -10]]);
  addCamp(new THREE.Vector3(18, 0, 13));
  addFireflyCluster(new THREE.Vector3(18, 0, 13), 10, 0xffd86b);
  addCrystalBeacon(new THREE.Vector3(-4, 0, -26), 0x73d7ff);
  addTreasure(new THREE.Vector3(-30, 1.4, -24), "sphere");
  addTreasure(new THREE.Vector3(2, 1.5, 20), "octa");
  addTreasure(new THREE.Vector3(28, 1.4, -26), "cylinder");
  addTreasure(new THREE.Vector3(-30, 1.4, 26), "sphere");
  addSpeedVase(new THREE.Vector3(20, 0.9, 22));
  addJumpVase(new THREE.Vector3(8, 0.9, -24));
  addBlackoutVase(new THREE.Vector3(-26, 0.9, 24));
  addPortal(new THREE.Vector3(0, 1.2, -30));
}

function buildLevelTwo() {
  addWallRun(-30, 30, -24);
  addWallRun(-30, 30, 24);
  addWallRun(-10, 18, 2);
  addWallColumn(-6, -20, 8);
  addWallColumn(18, -12, 20);
  addWallRun(-26, 10, -10);
  addWallRun(-18, 26, 14);
  addWallColumn(-22, -16, 20);
  addWallColumn(8, -20, 12);
  addCrateField([[-24, -8], [-18, -2], [-12, 6], [-6, 12], [8, -6], [14, 2], [20, 10], [26, 16]]);
  addForestPatch([[-30, 8], [-24, 14], [-18, 20], [18, -16], [24, -10], [30, -4]]);
  addColumnRing(-18, -12, 5.5, 6);
  addColumnRing(18, 12, 5.5, 6);
  addPools([[0, -8], [0, 10], [10, -14]]);
  addCamp(new THREE.Vector3(-6, 0, -14));
  addFireflyCluster(new THREE.Vector3(-6, 0, -14), 12, 0xfff07a);
  addCrystalBeacon(new THREE.Vector3(24, 0, 4), 0x9b7cff);
  addTreasure(new THREE.Vector3(-26, 1.4, -18), "octa");
  addTreasure(new THREE.Vector3(26, 1.4, 20), "sphere");
  addTreasure(new THREE.Vector3(-26, 1.4, 18), "cylinder");
  addTreasure(new THREE.Vector3(30, 1.4, -20), "sphere");
  addBlackoutVase(new THREE.Vector3(8, 0.9, 12));
  addRevealVase(new THREE.Vector3(-10, 0.9, 18));
  addPortal(new THREE.Vector3(0, 1.2, 0));
}

function buildLevelThree() {
  addColumnRing(0, 0, 12, 10);
  addColumnRing(0, 0, 22, 12);
  addWallRun(-24, 24, 8);
  addWallRun(-24, 24, -8);
  addWallRun(-12, 12, 24);
  addWallRun(-12, 12, -24);
  addWallColumn(-20, -20, 20);
  addWallColumn(20, -20, 20);
  addWallColumn(-8, -28, 28);
  addWallColumn(8, -28, 28);
  addCrateField([[-28, 0], [-22, 8], [-22, -8], [22, 8], [22, -8], [28, 0], [0, 28], [0, -28]]);
  addForestPatch([[-34, 20], [-28, 26], [34, 20], [28, 26], [-34, -20], [34, -20]]);
  addPools([[-12, 12], [12, 12], [-12, -12], [12, -12]]);
  addCamp(new THREE.Vector3(0, 0, -16));
  addFireflyCluster(new THREE.Vector3(0, 0, -16), 14, 0x8dffb2);
  addCrystalBeacon(new THREE.Vector3(-26, 0, 26), 0x52f5ff);
  addCrystalBeacon(new THREE.Vector3(26, 0, -26), 0xff88d9);

  const centralTower = addMesh(new THREE.CylinderGeometry(5, 6, 8, 28), stoneMaterial, new THREE.Vector3(0, 4, 0), {
    collider: 5.8,
    normalColor: 0xffdd77,
  });
  const crown = new THREE.Mesh(new THREE.TorusGeometry(5.8, 0.35, 14, 50), bronzeMaterial);
  crown.rotation.x = Math.PI / 2;
  crown.position.y = 2.4;
  centralTower.add(crown);
  animatedObjects.push({ mesh: crown, type: "tower-ring" });
  registerNormalHelper(crown, 0.35, 0xffcc55);

  addTreasure(new THREE.Vector3(-34, 1.4, 0), "sphere");
  addTreasure(new THREE.Vector3(34, 1.4, 0), "octa");
  addTreasure(new THREE.Vector3(0, 1.4, 34), "cylinder");
  addTreasure(new THREE.Vector3(0, 1.4, -34), "sphere");
  addBlackoutVase(new THREE.Vector3(30, 0.9, 30));
  addRevealVase(new THREE.Vector3(-30, 0.9, -30));
  addJumpVase(new THREE.Vector3(0, 0.9, -20));
  addPortal(new THREE.Vector3(0, 1.2, 14));
}

const levels = [
  {
    title: "Sunken Ruins",
    hint: "Level 1: the ruins now form a maze. Relics sit deeper in side lanes, and vase boosts can help you scout faster.",
    spawn: new THREE.Vector3(0, eyeHeight, 28),
    glow: new THREE.Vector3(0, 5, 0),
    sweepOrigin: new THREE.Vector3(-18, 18, -14),
    build: buildLevelOne,
    tents: [new THREE.Vector3(24, 0, 20)],
  },
  {
    title: "Crosswind Outpost",
    hint: "Level 2: the outpost paths twist more now. Look for oracle vases if the relics feel too hidden.",
    spawn: new THREE.Vector3(-4, eyeHeight, 30),
    glow: new THREE.Vector3(0, 5, 8),
    sweepOrigin: new THREE.Vector3(18, 18, 10),
    build: buildLevelTwo,
    tents: [new THREE.Vector3(-22, 0, 18), new THREE.Vector3(22, 0, -18)],
  },
  {
    title: "Vault of Echoes",
    hint: "Level 3: the vault is now a dense maze around the tower. Use jump and oracle vases to navigate the outer routes.",
    spawn: new THREE.Vector3(0, eyeHeight, 34),
    glow: new THREE.Vector3(0, 7, 0),
    sweepOrigin: new THREE.Vector3(-20, 20, 0),
    build: buildLevelThree,
    tents: [new THREE.Vector3(-24, 0, 24)],
  },
];

function loadTentPrototype() {
  return new Promise((resolve) => {
    const mtlLoader = new MTLLoader();
    mtlLoader.load("./assets/models/outpost_tent.mtl", (materials) => {
      materials.preload();
      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.load("./assets/models/outpost_tent.obj", (object) => {
        object.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        resolve(object);
      });
    });
  });
}

function loadVasePrototype() {
  return new Promise((resolve, reject) => {
    const objLoader = new OBJLoader();
    objLoader.load(
      "./assets/models/vase.obj",
      (object) => {
        object.traverse((child) => {
          if (child.isMesh) {
            child.material = vasePowerupMaterial;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        resolve(object);
      },
      undefined,
      reject,
    );
  });
}

function placeTent(position, rotationY = 0) {
  if (!tentPrototype) {
    return;
  }

  const tent = tentPrototype.clone(true);
  tent.position.copy(position);
  tent.scale.setScalar(2.1);
  tent.rotation.y = rotationY;
  dynamicLevelRoot.add(tent);
  tent.traverse((child) => {
    if (child.isMesh) {
      registerNormalHelper(child, 0.3, 0xff77aa);
    }
  });
}

function updateHud(messageOverride = null) {
  const level = levels[currentLevelIndex];
  let progressText = `Treasures: ${treasureCount} / ${currentTreasureGoal}`;
  if (speedBoostTimer > 0) {
    progressText += ` | Speed Boost: ${Math.ceil(speedBoostTimer)}s`;
  }
  if (jumpBoostTimer > 0) {
    progressText += ` | Jump Boost: ${Math.ceil(jumpBoostTimer)}s`;
  }
  if (revealTimer > 0) {
    progressText += ` | Oracle: ${Math.ceil(revealTimer)}s`;
  }
  if (blackoutTimer > 0) {
    progressText += ` | Blackout: ${Math.ceil(blackoutTimer)}s`;
  }
  levelLabel.textContent = `Level: ${currentLevelIndex + 1} / ${levels.length} - ${level.title}`;
  progressLabel.textContent = progressText;
  if (messageOverride) {
    hintLabel.textContent = messageOverride;
  }
}

function resetPlayerToStart() {
  const level = levels[currentLevelIndex];
  camera.position.copy(level.spawn);
  velocityY = 0;
  canJump = true;
  updateHud("Returned to the level start in case you got stuck.");
}

function loadLevel(index) {
  disposeLevel();
  currentLevelIndex = index;
  treasureCount = 0;
  portalUnlocked = false;
  speedBoostTimer = 0;
  jumpBoostTimer = 0;
  revealTimer = 0;
  blackoutTimer = 0;
  levelReady = true;

  const level = levels[index];
  level.build();
  currentTreasureGoal = treasures.length;
  levelGlow.position.copy(level.glow);
  sweepLight.position.copy(level.sweepOrigin);
  sweepLight.target.position.copy(level.glow);
  camera.position.copy(level.spawn);
  velocityY = 0;
  canJump = true;

  level.tents.forEach((position, tentIndex) => {
    placeTent(position, tentIndex * Math.PI * 0.5);
  });

  campLight.position.set(level.tents[0]?.x ?? 18, 2.5, (level.tents[0]?.z ?? 14) - 6);
  syncPointLightMarkers();

  if (portalState.group) {
    portalState.group.visible = false;
  }

  applyFeatureToggles();
  updateHud(level.hint);
}

function onKeyChange(event, pressed) {
  switch (event.code) {
    case "KeyW":
      moveState.forward = pressed;
      break;
    case "KeyS":
      moveState.backward = pressed;
      break;
    case "KeyA":
      moveState.left = pressed;
      break;
    case "KeyD":
      moveState.right = pressed;
      break;
    case "Space":
      if (pressed && canJump && Math.abs(camera.position.y - getSupportHeightAt(camera.position.x, camera.position.z)) < 0.08) {
        velocityY = jumpBoostTimer > 0 ? jumpBoostVelocity : 6.6;
        canJump = false;
      }
      break;
    default:
      break;
  }
}

document.addEventListener("keydown", (event) => onKeyChange(event, true));
document.addEventListener("keyup", (event) => onKeyChange(event, false));

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function getSupportHeightAt(x, z) {
  let supportHeight = eyeHeight;

  colliders.forEach((collider) => {
    const dx = x - collider.position.x;
    const dz = z - collider.position.z;
    if (dx * dx + dz * dz < (collider.radius + 0.45) * (collider.radius + 0.45)) {
      supportHeight = Math.max(supportHeight, collider.top + eyeHeight);
    }
  });

  return supportHeight;
}

function resolveMovement(previousPosition) {
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -worldLimit, worldLimit);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -worldLimit, worldLimit);

  const blocked = colliders.some((collider) => {
    const dx = camera.position.x - collider.position.x;
    const dz = camera.position.z - collider.position.z;
    const withinCollider = dx * dx + dz * dz < (collider.radius + 0.9) * (collider.radius + 0.9);
    if (!withinCollider) {
      return false;
    }

    const wallTopEyeHeight = collider.top + eyeHeight - 0.15;
    const canClearWall = jumpBoostTimer > 0 && camera.position.y >= wallTopEyeHeight;
    return !canClearWall;
  });

  if (blocked) {
    camera.position.x = previousPosition.x;
    camera.position.z = previousPosition.z;
  }
}

function updateMovement(delta) {
  if (!controls.isLocked || !levelReady) {
    return;
  }

  const moveSpeed = speedBoostTimer > 0 ? boostedMoveSpeed : baseMoveSpeed;
  const speed = moveSpeed * delta;
  const before = camera.position.clone();

  if (moveState.forward) {
    controls.moveForward(speed);
  }
  if (moveState.backward) {
    controls.moveForward(-speed);
  }
  if (moveState.left) {
    controls.moveRight(-speed);
  }
  if (moveState.right) {
    controls.moveRight(speed);
  }

  resolveMovement(before);

  velocityY -= gravity * delta;
  camera.position.y += velocityY * delta;

  const supportHeight = getSupportHeightAt(camera.position.x, camera.position.z);
  if (camera.position.y <= supportHeight) {
    camera.position.y = supportHeight;
    velocityY = 0;
    canJump = true;
  }
}

function updateAnimation(elapsed, delta) {
  animatedObjects.forEach((entry) => {
    if (entry.type === "treasure") {
      entry.mesh.position.y = entry.baseY + Math.sin(elapsed * 2.4 + entry.offset) * 0.25;
      entry.mesh.rotation.y += 0.02;
      entry.mesh.rotation.x += 0.01;
    } else if (entry.type === "portal-ring") {
      entry.mesh.rotation.z = elapsed * 1.3;
      entry.mesh.rotation.y = elapsed * 0.7;
    } else if (entry.type === "portal-core") {
      entry.mesh.position.y = entry.baseY + Math.sin(elapsed * 2.8) * 0.35;
      entry.mesh.scale.setScalar(0.92 + Math.sin(elapsed * 3.8) * 0.08);
    } else if (entry.type === "flame") {
      entry.mesh.scale.y = 0.9 + Math.sin(elapsed * 8.2) * 0.16;
      entry.mesh.rotation.y = elapsed * 1.1;
    } else if (entry.type === "tower-ring") {
      entry.mesh.rotation.z = elapsed * 0.5;
    } else if (entry.type === "crystal-core") {
      entry.mesh.position.y = entry.baseY + Math.sin(elapsed * 2 + entry.offset) * 0.25;
      entry.mesh.rotation.y += 0.022;
      entry.mesh.rotation.x = Math.sin(elapsed * 1.6 + entry.offset) * 0.2;
    } else if (entry.type === "crystal-ring") {
      entry.mesh.rotation.z += 0.02 * entry.direction;
      entry.mesh.rotation.y = elapsed * 0.7 * entry.direction + entry.offset;
    } else if (entry.type === "crystal-beam") {
      const pulse = 0.88 + Math.sin(elapsed * 2.5 + entry.offset) * 0.14;
      entry.mesh.scale.x = pulse;
      entry.mesh.scale.z = pulse;
      entry.mesh.material.opacity = 0.26 + (pulse - 0.74) * 0.35;
    } else if (entry.type === "firefly") {
      const orbit = elapsed * entry.speed + entry.offset;
      entry.mesh.position.x = entry.anchor.x + Math.cos(orbit) * entry.radius;
      entry.mesh.position.z = entry.anchor.z + Math.sin(orbit * 1.2) * (entry.radius * 0.7);
      entry.mesh.position.y = entry.anchor.y + entry.baseY + Math.sin(elapsed * 2.4 + entry.verticalOffset) * 0.55;
      entry.mesh.scale.setScalar(0.75 + Math.sin(elapsed * 6 + entry.offset) * 0.18);
    } else if (entry.type === "powerup" || entry.type === "trap-powerup" || entry.type === "jump-powerup" || entry.type === "reveal-powerup") {
      entry.mesh.position.y = entry.baseY + Math.sin(elapsed * 1.8 + entry.offset) * 0.22;
      entry.mesh.rotation.y += 0.018;
      if (entry.type === "trap-powerup") {
        entry.mesh.rotation.x = Math.sin(elapsed * 1.1 + entry.offset) * 0.08;
      } else if (entry.type === "jump-powerup") {
        entry.mesh.rotation.z = Math.sin(elapsed * 1.7 + entry.offset) * 0.12;
      } else if (entry.type === "reveal-powerup") {
        entry.mesh.rotation.x = Math.cos(elapsed * 1.4 + entry.offset) * 0.1;
      }
    }
  });

  if (portalState.group && portalUnlocked) {
    portalState.group.visible = true;
    portalState.group.position.y = portalState.position.y + Math.sin(elapsed * 2) * 0.25;
  }

  const level = levels[currentLevelIndex];
  if (featureState.lightAnimationEnabled && featureState.lightingEnabled) {
    levelGlow.position.x = level.glow.x + Math.sin(elapsed * 0.7) * 10;
    levelGlow.position.z = level.glow.z + Math.cos(elapsed * 0.55) * 8;
    levelGlow.position.y = level.glow.y + Math.sin(elapsed * 1.9) * 0.9;
    levelGlow.intensity = blackoutTimer > 0 ? 2.5 : 1.7 + Math.sin(elapsed * 2.3) * 0.4;
  } else {
    levelGlow.position.copy(level.glow);
    levelGlow.intensity = blackoutTimer > 0 ? 2.3 : 1.9;
  }
  syncPointLightMarkers();

  campLight.intensity = blackoutTimer > 0
    ? 2.1
    : featureState.lightAnimationEnabled
      ? 1.5 + Math.sin(elapsed * 7.2) * 0.25
      : 1.7;

  sweepLight.target.updateMatrixWorld();

  let statusMessage = null;

  if (speedBoostTimer > 0) {
    speedBoostTimer = Math.max(0, speedBoostTimer - delta);
    if (speedBoostTimer === 0) {
      statusMessage = "Speed boost ended. Keep searching for the remaining treasure.";
    }
  }

  if (jumpBoostTimer > 0) {
    jumpBoostTimer = Math.max(0, jumpBoostTimer - delta);
    if (jumpBoostTimer === 0) {
      statusMessage = "Jump boost ended. The maze routes are harder to scout again.";
    }
  }

  if (revealTimer > 0) {
    revealTimer = Math.max(0, revealTimer - delta);
    treasures.forEach((treasure) => {
      treasure.material.emissiveIntensity = revealTimer > 0 ? 3.2 : 1.8;
    });
    if (revealTimer === 0) {
      statusMessage = "Oracle glow faded. Hidden relics are no longer highlighted.";
    }
  }

  if (blackoutTimer > 0) {
    blackoutTimer = Math.max(0, blackoutTimer - delta);
    applyFeatureToggles();
    if (blackoutTimer === 0) {
      statusMessage = "The blackout ended. Your main lights are back on.";
    }
  }

  updateHud(statusMessage);
  normalHelpers.forEach((helper) => helper.update());
}

function checkTreasureCollection() {
  for (let i = treasures.length - 1; i >= 0; i -= 1) {
    const treasure = treasures[i];
    if (!treasure.visible) {
      continue;
    }

    if (camera.position.distanceTo(treasure.position) < 2.4) {
      treasure.visible = false;
      treasures.splice(i, 1);
      treasureCount += 1;
      updateHud(`Treasure collected. ${treasures.length === 0 ? "The portal is active." : "Keep searching for the rest."}`);
    }
  }

  for (let i = powerups.length - 1; i >= 0; i -= 1) {
    const powerup = powerups[i];
    if (powerup.collected || !powerup.mesh.visible) {
      continue;
    }

    if (camera.position.distanceTo(powerup.mesh.position) < powerup.radius) {
      powerup.collected = true;
      powerup.mesh.visible = false;

      if (powerup.effectType === "blackout") {
        blackoutTimer = blackoutDuration;
        applyFeatureToggles();
        updateHud(`Trap vase triggered. Main lights are off for ${blackoutDuration} seconds. Use the point and spot lights to keep searching.`);
      } else if (powerup.effectType === "jump") {
        jumpBoostTimer = jumpBoostDuration;
        updateHud(`Jump vase found. Your jump is boosted for ${jumpBoostDuration} seconds so you can scout the maze more easily.`);
      } else if (powerup.effectType === "reveal") {
        revealTimer = revealDuration;
        treasures.forEach((treasure) => {
          treasure.material.emissiveIntensity = 3.2;
        });
        updateHud(`Oracle vase found. Hidden relics burn brighter for ${revealDuration} seconds.`);
      } else {
        speedBoostTimer = speedBoostDuration;
        updateHud(`You found the hidden vase relic. Speed boosted for ${speedBoostDuration} seconds.`);
      }
    }
  }

  if (!portalUnlocked && treasures.length === 0) {
    portalUnlocked = true;
    if (portalState.group) {
      portalState.group.visible = true;
    }

    updateHud(currentLevelIndex === levels.length - 1
      ? "Final portal unlocked. Walk into it to complete the game."
      : "Portal unlocked. Step into it to reach the next level.");
  }
}

function checkPortal() {
  if (!portalUnlocked || !portalState.group) {
    return;
  }

  if (camera.position.distanceTo(portalState.group.position) < 3.4) {
    if (currentLevelIndex < levels.length - 1) {
      loadLevel(currentLevelIndex + 1);
      return;
    }

    gameWon = true;
    levelReady = false;
    portalUnlocked = false;
    controls.unlock();
    updateHud("You cleared all three treasure levels. Press Start Exploring to replay the adventure.");
  }
}

function updateFps(delta) {
  fpsAccumulator += delta;
  fpsFrames += 1;
  if (fpsAccumulator >= 0.5) {
    const fps = Math.round(fpsFrames / fpsAccumulator);
    fpsLabel.textContent = `FPS: ${fps}`;
    fpsAccumulator = 0;
    fpsFrames = 0;
  }
}

async function init() {
  hintLabel.textContent = "Loading the treasure hunt scene...";
  syncFeatureUi();
  const [loadedTent, loadedVase] = await Promise.all([
    loadTentPrototype(),
    loadVasePrototype().catch(() => null),
  ]);
  tentPrototype = loadedTent;
  vasePrototype = loadedVase;
  loadLevel(0);
}

function render() {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  updateMovement(delta);
  updateAnimation(elapsed, delta);
  checkTreasureCollection();
  checkPortal();
  updateFps(delta);
  renderer.render(scene, camera);
}

init().catch(() => {
  hintLabel.textContent = "Model loading failed, but the rest of the level can still run if the assets are available on your server.";
  loadLevel(0);
});

renderer.setAnimationLoop(render);



