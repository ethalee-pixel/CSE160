import { Camera } from "./Camera.js";
import { Cube } from "./Cube.js";
import { drawAnimal } from "./Animal.js";

// ===== Shaders =====
const VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_UV;

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;

  varying vec2 v_UV;

  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
  }
`;

const FSHADER_SOURCE = `
  precision mediump float;

  uniform vec4 u_BaseColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform int u_WhichTex;
  uniform float u_TexColorWeight;

  varying vec2 v_UV;

  void main() {
    vec4 texColor = (u_WhichTex == 0)
      ? texture2D(u_Sampler0, v_UV)
      : texture2D(u_Sampler1, v_UV);

    gl_FragColor = (1.0 - u_TexColorWeight) * u_BaseColor
                 + u_TexColorWeight * texColor;
  }
`;


let canvas, gl;
let a_Position, a_UV;
let u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix;
let u_BaseColor, u_TexColorWeight, u_WhichTex;
let u_Sampler0, u_Sampler1;

let camera;


let crosshairEl = null;


const WORLD_W = 32;
const WORLD_D = 32;
let worldMap = Array.from({ length: WORLD_D }, () => Array(WORLD_W).fill(0));
let wallInstances = []; 


const keys = new Set();


let lastFpsTime = performance.now();
let frames = 0;


let yVel = 0;
const GRAVITY = -20.0;
const JUMP_SPEED = 7.5;
const PLAYER_HEIGHT = 1.6;


let canDoubleJump = true;
const WALK_SPEED = 6.0;
const SPRINT_MULT = 1.8;
const STEP_HEIGHT = 0.6;


let health = 100;
let maxFallSpeed = 0;


let levelIndex = 0;       
let ballsCollected = 0;
const BALLS_TOTAL = 3;
let hasWon = false;


let collectibles = [];

const LEVELS = [
  {
    name: "Level 1",
    makeMap: () => {
  
      for (let z = 0; z < WORLD_D; z++) for (let x = 0; x < WORLD_W; x++) worldMap[z][x] = 0;

  
      for (let x = 0; x < WORLD_W; x++) {
        worldMap[0][x] = 2;
        worldMap[WORLD_D - 1][x] = 2;
      }
      for (let z = 0; z < WORLD_D; z++) {
        worldMap[z][0] = 2;
        worldMap[z][WORLD_W - 1] = 2;
      }

   
      for (let z = 6; z < 14; z++) {
        for (let x = 6; x < 14; x++) {
          if ((x + z) % 2 === 0) worldMap[z][x] = 1 + ((x * z) % 4);
        }
      }

  
      for (let z = 10; z < 26; z++) worldMap[z][18] = 3;
      for (let x = 20; x < 28; x++) worldMap[20][x] = 4;
      for (let z = 18; z < 26; z++) worldMap[z][27] = 4;
    },
    balls: [
      { x: 6.5,  y: 0.25, z: 6.5  },
      { x: 24.5, y: 0.25, z: 11.5 },
      { x: 12.5, y: 0.25, z: 26.5 },
    ],
    spawn: { x: 2.5, z: 2.5 },
  },

  {
    name: "Level 2",
    makeMap: () => {

      for (let z = 0; z < WORLD_D; z++) for (let x = 0; x < WORLD_W; x++) worldMap[z][x] = 0;

  
      for (let x = 0; x < WORLD_W; x++) {
        worldMap[0][x] = 3;
        worldMap[WORLD_D - 1][x] = 3;
      }
      for (let z = 0; z < WORLD_D; z++) {
        worldMap[z][0] = 3;
        worldMap[z][WORLD_W - 1] = 3;
      }

 
      for (let z = 2; z < WORLD_D - 2; z++) {
        for (let x = 2; x < WORLD_W - 2; x++) {
          if (x % 2 === 0 && z % 2 === 0) {
            worldMap[z][x] = 2;
            if (x + 1 < WORLD_W - 1) worldMap[z][x + 1] = 1;
            if (z + 1 < WORLD_D - 1) worldMap[z + 1][x] = 1;
          }
        }
      }

      // landmark pillar
      for (let z = 14; z <= 18; z++) {
        for (let x = 14; x <= 18; x++) worldMap[z][x] = 4;
      }

      // carve corridors
      for (let x = 2; x < WORLD_W - 2; x++) worldMap[8][x] = 0;
      for (let z = 2; z < WORLD_D - 2; z++) worldMap[z][23] = 0;
    },
    balls: [
      { x: 4.5,  y: 0.25, z: 27.5 },
      { x: 28.5, y: 0.25, z: 4.5  },
      { x: 23.5, y: 0.25, z: 23.5 },
    ],
    spawn: { x: 2.5, z: 2.5 },
  },
];


function main() {
  canvas = document.getElementById("webgl");
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.log("Failed to get WebGL context");
    return;
  }

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.6, 0.8, 1.0, 1.0);

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to init shaders");
    return;
  }

  connectGLSL();
  Cube.init(gl, a_Position, a_UV);

  camera = new Camera(canvas);

  initTextures();


  loadLevel(0);

  addInput();

  crosshairEl = document.getElementById("crosshair");
  updateHUD();

  requestAnimationFrame(tick);
}

function connectGLSL() {
  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  a_UV = gl.getAttribLocation(gl.program, "a_UV");

  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  u_ViewMatrix = gl.getUniformLocation(gl.program, "u_ViewMatrix");
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, "u_ProjectionMatrix");

  u_BaseColor = gl.getUniformLocation(gl.program, "u_BaseColor");
  u_TexColorWeight = gl.getUniformLocation(gl.program, "u_TexColorWeight");
  u_WhichTex = gl.getUniformLocation(gl.program, "u_WhichTex");

  u_Sampler0 = gl.getUniformLocation(gl.program, "u_Sampler0");
  u_Sampler1 = gl.getUniformLocation(gl.program, "u_Sampler1");

  gl.uniformMatrix4fv(u_ModelMatrix, false, new Matrix4().elements);
}


function initTextures() {
  const imgWalls = new Image();
  const imgGrass = new Image();

  imgWalls.onload = () => loadTexture(imgWalls, 0, u_Sampler0);
  imgGrass.onload = () => loadTexture(imgGrass, 1, u_Sampler1);

  imgWalls.src = "walls.jpg";
  imgGrass.src = "grass.jpg";
}

function loadTexture(image, unit, samplerLoc) {
  const tex = gl.createTexture();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  gl.uniform1i(samplerLoc, unit);
}


function buildWalls() {
  wallInstances = [];
  for (let z = 0; z < WORLD_D; z++) {
    for (let x = 0; x < WORLD_W; x++) {
      const h = worldMap[z][x];
      for (let y = 0; y < h; y++) wallInstances.push({ x, y, z });
    }
  }
}


function loadLevel(idx) {
  levelIndex = idx;
  ballsCollected = 0;
  hasWon = false;

  LEVELS[levelIndex].makeMap();
  buildWalls();

  collectibles = LEVELS[levelIndex].balls.map(b => ({ ...b, taken: false }));


  const sx = LEVELS[levelIndex].spawn.x;
  const sz = LEVELS[levelIndex].spawn.z;
  camera.eye.elements[0] = sx;
  camera.eye.elements[2] = sz;
  camera.eye.elements[1] = groundHeightAt(sx, sz) + PLAYER_HEIGHT;

  yVel = 0;
  canDoubleJump = true;
  maxFallSpeed = 0;

  camera._rebuildAt();
  camera._rebuildView();

  updateHUD();
}

function updateHUD() {
  const keysEl = document.getElementById("keys");
  const msgEl = document.getElementById("msg");

  if (keysEl) keysEl.textContent = `${LEVELS[levelIndex].name} | Balls: ${ballsCollected}/${BALLS_TOTAL}`;

  if (msgEl) {
    if (hasWon) msgEl.textContent = "YOU WIN! Press N to restart.";
    else msgEl.textContent = "Find 3 balls to advance!";
  }
}

function checkCollectibles() {
  if (hasWon) return;

  const px = camera.eye.elements[0];
  const pz = camera.eye.elements[2];

  for (const c of collectibles) {
    if (c.taken) continue;

    const dx = px - c.x;
    const dz = pz - c.z;

    if ((dx * dx + dz * dz) < 0.8 * 0.8) {
      c.taken = true;
      ballsCollected++;
      updateHUD();

      if (ballsCollected >= BALLS_TOTAL) {
        if (levelIndex + 1 < LEVELS.length) {
          loadLevel(levelIndex + 1);
        } else {
          hasWon = true;
          updateHUD();
        }
      }
    }
  }
}


function cellInFront(dist = 1.2) {
  const f = new Vector3();
  f.set(camera.at);
  f.sub(camera.eye);
  f.elements[1] = 0;
  f.normalize();

  const x = Math.floor(camera.eye.elements[0] + f.elements[0] * dist);
  const z = Math.floor(camera.eye.elements[2] + f.elements[2] * dist);
  return { x, z };
}

function addBlock() {
  const { x, z } = cellInFront();
  if (x < 0 || x >= WORLD_W || z < 0 || z >= WORLD_D) return;
  worldMap[z][x] = Math.min(4, worldMap[z][x] + 1);
  buildWalls();
}

function deleteBlock() {
  const { x, z } = cellInFront();
  if (x < 0 || x >= WORLD_W || z < 0 || z >= WORLD_D) return;
  worldMap[z][x] = Math.max(0, worldMap[z][x] - 1);
  buildWalls();
}


function updateCrosshair() {
  if (!crosshairEl) return;

  const { x, z } = cellInFront(1.2);
  const inside = (x >= 0 && x < WORLD_W && z >= 0 && z < WORLD_D);

  crosshairEl.classList.remove("valid", "invalid");
  crosshairEl.classList.add(inside ? "valid" : "invalid");
}


function groundHeightAt(x, z) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  if (xi < 0 || xi >= WORLD_W || zi < 0 || zi >= WORLD_D) return 0;
  return worldMap[zi][xi];
}

function isOnGround() {
  const x = camera.eye.elements[0];
  const z = camera.eye.elements[2];
  const groundY = groundHeightAt(x, z) + PLAYER_HEIGHT;
  return Math.abs(camera.eye.elements[1] - groundY) < 0.02 && yVel <= 0;
}

function tryJump() {
  if (isOnGround()) {
    yVel = JUMP_SPEED;
    canDoubleJump = true;
    return;
  }
  if (canDoubleJump) {
    yVel = JUMP_SPEED * 0.9;
    canDoubleJump = false;
  }
}


function addInput() {
  document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    keys.add(k);

    if (k === "r") addBlock();
    if (k === "f") deleteBlock();
    if (k === "z") deleteBlock(); // bring back Z delete

    if (k === "n") loadLevel(0); // restart

    if (e.code === "Space") {
      e.preventDefault();
      tryJump();
    }
  });

  document.addEventListener("keyup", (e) => {
    keys.delete(e.key.toLowerCase());
  });

  // pointer lock mouse look
  canvas.addEventListener("click", () => canvas.requestPointerLock());

  document.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement !== canvas) return;
    const sens = 0.15;
    camera.addYawPitch(e.movementX * sens, -e.movementY * sens);
  });
}

let lastTime = performance.now();
function tick(now) {
  const dt = (now - lastTime) / 1000.0;
  lastTime = now;

  handleMovement(dt);
  applyJumpPhysics(dt);
  updateCrosshair();
  checkCollectibles();
  renderScene();

  // fps + health
  frames++;
  if (now - lastFpsTime >= 1000) {
    const fps = frames;
    frames = 0;
    lastFpsTime = now;
    const fpsEl = document.getElementById("fps");
    if (fpsEl) fpsEl.textContent = `FPS: ${fps} | Health: ${health}`;
  }

  requestAnimationFrame(tick);
}

function handleMovement(dt) {
  const sprinting = keys.has("shift");
  const speed = (sprinting ? WALK_SPEED * SPRINT_MULT : WALK_SPEED) * dt;
  const turn = 90.0 * dt;

  if (keys.has("w")) camera.moveForward(speed);
  if (keys.has("s")) camera.moveBackwards(speed);
  if (keys.has("a")) camera.moveLeft(speed);
  if (keys.has("d")) camera.moveRight(speed);

  if (keys.has("q")) camera.addYawPitch(-turn, 0);
  if (keys.has("e")) camera.addYawPitch(turn, 0);
}

function applyJumpPhysics(dt) {
  yVel += GRAVITY * dt;
  if (yVel < maxFallSpeed) maxFallSpeed = yVel;

  camera.eye.elements[1] += yVel * dt;

  const x = camera.eye.elements[0];
  const z = camera.eye.elements[2];
  const floorY = groundHeightAt(x, z) + PLAYER_HEIGHT;
  const currentY = camera.eye.elements[1];

  if (currentY < floorY && (floorY - currentY) <= STEP_HEIGHT && yVel <= 0) {
    camera.eye.elements[1] = floorY;
    yVel = 0;
    canDoubleJump = true;
    maxFallSpeed = 0;
  }

  if (camera.eye.elements[1] < floorY) {
    camera.eye.elements[1] = floorY;

    const impact = -maxFallSpeed;
    if (impact > 12) {
      const dmg = Math.min(40, Math.floor((impact - 12) * 3));
      health = Math.max(0, health - dmg);
    }

    yVel = 0;
    canDoubleJump = true;
    maxFallSpeed = 0;
  }

  camera._rebuildAt();
  camera._rebuildView();
}

function setTextured(whichTex) {
  gl.uniform1f(u_TexColorWeight, 1.0);
  gl.uniform1i(u_WhichTex, whichTex);
  gl.uniform4f(u_BaseColor, 1, 1, 1, 1);
}

function setSolidColor(r, g, b, a) {
  gl.uniform1f(u_TexColorWeight, 0.0);
  gl.uniform4f(u_BaseColor, r, g, b, a);
}

const tempCube = new Cube(); // reuse one cube for speed

function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);

  drawGround();
  drawSkybox();
  drawWalls();
  drawCollectibles();

  setSolidColor(0.76, 0.6, 0.42, 1);
  drawAnimal(u_ModelMatrix, 12, 0, 12);
}

function drawGround() {
  setTextured(1);
  tempCube.matrix.setTranslate(0, -0.5, 0);
  tempCube.matrix.scale(32, 0.1, 32);
  tempCube.render(u_ModelMatrix);
}

function drawSkybox() {
  setSolidColor(0.45, 0.70, 1.0, 1.0);

  const S = 200;
  tempCube.matrix.setTranslate(16 - S / 2, 12 - S / 2, 16 - S / 2);
  tempCube.matrix.scale(S, S, S);
  tempCube.render(u_ModelMatrix);
}

function drawWalls() {
  setTextured(0);

  for (const w of wallInstances) {
    tempCube.matrix.setTranslate(w.x, w.y, w.z);
    tempCube.matrix.scale(1, 1, 1);
    tempCube.render(u_ModelMatrix);
  }
}

function drawCollectibles() {
  setSolidColor(1.0, 0.85, 0.2, 1.0);

  for (const c of collectibles) {
    if (c.taken) continue;
    tempCube.matrix.setTranslate(c.x, c.y, c.z);
    tempCube.matrix.scale(0.35, 0.35, 0.35);
    tempCube.render(u_ModelMatrix);
  }
}

// start
main();

