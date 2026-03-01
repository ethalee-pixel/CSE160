import { Camera } from "./camera.js";
import { Cube } from "./Cube.js";
import { Sphere } from "./Sphere.js";
import { Model } from "./Model.js";
import { drawAnimal } from "./Animal.js";

// ===== Shaders (Phong + normal viz) =====
const VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec3 a_Normal;
  attribute vec2 a_UV;

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_NormalMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;

  varying vec2 v_UV;
  varying vec3 v_PosW;
  varying vec3 v_NormalW;

  void main() {
    vec4 worldPos = u_ModelMatrix * a_Position;
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * worldPos;

    v_PosW = worldPos.xyz;
    v_NormalW = normalize((u_NormalMatrix * vec4(a_Normal, 0.0)).xyz);
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

  uniform vec3 u_CameraPos;

  uniform int u_LightingOn;
  uniform int u_ShowNormals;

  uniform int u_PointOn;
  uniform vec3 u_PointPos;

  uniform int u_SpotOn;
  uniform vec3 u_SpotPos;
  uniform vec3 u_SpotDir;
  uniform float u_SpotInnerCos;
  uniform float u_SpotOuterCos;

  uniform vec3 u_LightColor;

  varying vec2 v_UV;
  varying vec3 v_PosW;
  varying vec3 v_NormalW;

  vec3 getBaseRGB() {
    vec4 texColor = (u_WhichTex == 0)
      ? texture2D(u_Sampler0, v_UV)
      : texture2D(u_Sampler1, v_UV);

    vec4 base = (1.0 - u_TexColorWeight) * u_BaseColor + u_TexColorWeight * texColor;
    return base.rgb;
  }

  void main() {
    vec3 N = normalize(v_NormalW);

    if (u_ShowNormals == 1) {
      gl_FragColor = vec4(N * 0.5 + 0.5, 1.0);
      return;
    }

    vec3 baseRGB = getBaseRGB();

    if (u_LightingOn == 0) {
      gl_FragColor = vec4(baseRGB, 1.0);
      return;
    }

    vec3 V = normalize(u_CameraPos - v_PosW);

    float ka = 0.18;
    float ks = 0.55;
    float shininess = 32.0;

    vec3 ambient = ka * baseRGB * u_LightColor;

    vec3 diffuseSum = vec3(0.0);
    vec3 specSum = vec3(0.0);

    if (u_PointOn == 1) {
      vec3 L = normalize(u_PointPos - v_PosW);
      float ndotl = max(dot(N, L), 0.0);
      diffuseSum += ndotl * baseRGB * u_LightColor;

      vec3 R = reflect(-L, N);
      float spec = pow(max(dot(R, V), 0.0), shininess);
      specSum += ks * spec * u_LightColor;
    }

    if (u_SpotOn == 1) {
      vec3 Ls = normalize(u_SpotPos - v_PosW);

      vec3 lightToFrag = normalize(v_PosW - u_SpotPos);
      float spotCos = dot(lightToFrag, normalize(u_SpotDir));
      float spotFactor = smoothstep(u_SpotOuterCos, u_SpotInnerCos, spotCos);

      float ndotl2 = max(dot(N, Ls), 0.0);
      diffuseSum += spotFactor * ndotl2 * baseRGB * u_LightColor;

      vec3 R2 = reflect(-Ls, N);
      float spec2 = pow(max(dot(R2, V), 0.0), shininess);
      specSum += spotFactor * ks * spec2 * u_LightColor;
    }

    vec3 rgb = ambient + diffuseSum + specSum;
    gl_FragColor = vec4(rgb, 1.0);
  }
`;

let canvas, gl;

// attributes
let a_Position, a_Normal, a_UV;

// uniforms
let u_ModelMatrix, u_NormalMatrix, u_ViewMatrix, u_ProjectionMatrix;
let u_BaseColor, u_TexColorWeight, u_WhichTex;
let u_Sampler0, u_Sampler1;

let u_CameraPos;
let u_LightingOn, u_ShowNormals;
let u_PointOn, u_PointPos;
let u_SpotOn, u_SpotPos, u_SpotDir, u_SpotInnerCos, u_SpotOuterCos;
let u_LightColor;

let camera;

// textures
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

// ===== UI state =====
let lightingOn = 1;
let showNormals = 0;

let pointOn = 1;
let spotOn = 1;
let animateLight = 1;

let pointPos = [8, 4, 8];
let lightColor = [1, 1, 1];

// spotlight follows camera (flashlight style)
let spotPos = [0, 0, 0];
let spotDir = [0, -1, 0];
let spotInnerDeg = 18;
let spotOuterDeg = 28;

// objects
let markerCube;
let sphere1, sphere2;
let objModel = null;

// animation
let lastTime = performance.now();
let lightAngle = 0;

function connectGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    throw new Error("initShaders failed");
  }

  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  a_Normal = gl.getAttribLocation(gl.program, "a_Normal");
  a_UV = gl.getAttribLocation(gl.program, "a_UV");

  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  u_NormalMatrix = gl.getUniformLocation(gl.program, "u_NormalMatrix");
  u_ViewMatrix = gl.getUniformLocation(gl.program, "u_ViewMatrix");
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, "u_ProjectionMatrix");

  u_BaseColor = gl.getUniformLocation(gl.program, "u_BaseColor");
  u_TexColorWeight = gl.getUniformLocation(gl.program, "u_TexColorWeight");
  u_WhichTex = gl.getUniformLocation(gl.program, "u_WhichTex");

  u_Sampler0 = gl.getUniformLocation(gl.program, "u_Sampler0");
  u_Sampler1 = gl.getUniformLocation(gl.program, "u_Sampler1");

  u_CameraPos = gl.getUniformLocation(gl.program, "u_CameraPos");
  u_LightingOn = gl.getUniformLocation(gl.program, "u_LightingOn");
  u_ShowNormals = gl.getUniformLocation(gl.program, "u_ShowNormals");

  u_PointOn = gl.getUniformLocation(gl.program, "u_PointOn");
  u_PointPos = gl.getUniformLocation(gl.program, "u_PointPos");

  u_SpotOn = gl.getUniformLocation(gl.program, "u_SpotOn");
  u_SpotPos = gl.getUniformLocation(gl.program, "u_SpotPos");
  u_SpotDir = gl.getUniformLocation(gl.program, "u_SpotDir");
  u_SpotInnerCos = gl.getUniformLocation(gl.program, "u_SpotInnerCos");
  u_SpotOuterCos = gl.getUniformLocation(gl.program, "u_SpotOuterCos");

  u_LightColor = gl.getUniformLocation(gl.program, "u_LightColor");
}

function setSolidColor(r, g, b, a = 1) {
  gl.uniform1f(u_TexColorWeight, 0.0);
  gl.uniform4f(u_BaseColor, r, g, b, a);
}

function setTextured(whichTex) {
  gl.uniform1f(u_TexColorWeight, 1.0);
  gl.uniform1i(u_WhichTex, whichTex);
  gl.uniform4f(u_BaseColor, 1, 1, 1, 1);
}

function setCommonUniforms() {
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);

  gl.uniform3f(u_CameraPos,
    camera.eye.elements[0],
    camera.eye.elements[1],
    camera.eye.elements[2]
  );

  gl.uniform1i(u_LightingOn, lightingOn);
  gl.uniform1i(u_ShowNormals, showNormals);

  gl.uniform1i(u_PointOn, pointOn);
  gl.uniform3f(u_PointPos, pointPos[0], pointPos[1], pointPos[2]);

  gl.uniform1i(u_SpotOn, spotOn);
  gl.uniform3f(u_SpotPos, spotPos[0], spotPos[1], spotPos[2]);
  gl.uniform3f(u_SpotDir, spotDir[0], spotDir[1], spotDir[2]);

  const innerCos = Math.cos((spotInnerDeg * Math.PI) / 180);
  const outerCos = Math.cos((spotOuterDeg * Math.PI) / 180);
  gl.uniform1f(u_SpotInnerCos, innerCos);
  gl.uniform1f(u_SpotOuterCos, outerCos);

  gl.uniform3f(u_LightColor, lightColor[0], lightColor[1], lightColor[2]);
}

function drawScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  setCommonUniforms();

  // Ground
  setTextured(1); // grass
  const ground = new Cube();
  ground.matrix.setTranslate(0, -0.5, 0);
  ground.matrix.scale(32, 0.1, 32);
  ground.render(u_ModelMatrix, u_NormalMatrix);

  // A few walls (textured)
  setTextured(0); // walls
  for (let i = 0; i < 10; i++) {
    const w = new Cube();
    w.matrix.setTranslate(5 + i, 0, 5);
    w.matrix.scale(1, 1, 1);
    w.render(u_ModelMatrix, u_NormalMatrix);
  }

  // Light marker cube
  setSolidColor(lightColor[0], lightColor[1], lightColor[2], 1);
  markerCube.matrix.setTranslate(pointPos[0], pointPos[1], pointPos[2]);
  markerCube.matrix.scale(0.25, 0.25, 0.25);
  markerCube.render(u_ModelMatrix, u_NormalMatrix);

  // Spheres (easy to see lighting)
  setSolidColor(0.95, 0.95, 0.98, 1);
  sphere1.matrix.setTranslate(10, 1.0, 10);
  sphere1.matrix.scale(1.0, 1.0, 1.0);
  sphere1.render(u_ModelMatrix, u_NormalMatrix);

  setSolidColor(0.6, 0.75, 0.95, 1);
  sphere2.matrix.setTranslate(13, 0.9, 9);
  sphere2.matrix.scale(0.8, 0.8, 0.8);
  sphere2.render(u_ModelMatrix, u_NormalMatrix);

  // Animal (integrated)
  setSolidColor(0.76, 0.6, 0.42, 1);
  drawAnimal(u_ModelMatrix, 12, 0, 12);

  // OBJ (optional)
  if (objModel) {
    setSolidColor(0.85, 0.85, 0.85, 1);
    objModel.matrix.setTranslate(16, 0.0, 16);
    objModel.matrix.scale(0.7, 0.7, 0.7);
    objModel.render(u_ModelMatrix, u_NormalMatrix);
  }
}

const keys = new Set();

function handleMovement(dt) {
  const speed = 6.0 * dt;
  if (keys.has("w")) camera.moveForward(speed);
  if (keys.has("s")) camera.moveBackwards(speed);
  if (keys.has("a")) camera.moveLeft(speed);
  if (keys.has("d")) camera.moveRight(speed);

  // up/down
  if (keys.has(" ")) camera.eye.elements[1] += speed * 2.0;
  if (keys.has("shift")) camera.eye.elements[1] -= speed * 2.0;

  camera._rebuildAt();
  camera._rebuildView();
}

function addInput() {
  document.addEventListener("keydown", (e) => keys.add(e.key.toLowerCase()));
  document.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

  canvas.addEventListener("click", () => canvas.requestPointerLock());

  document.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement !== canvas) return;
    const sens = 0.15;
    camera.addYawPitch(e.movementX * sens, -e.movementY * sens);
  });

  // Buttons
  const btnLighting = document.getElementById("btnLighting");
  const btnNormals = document.getElementById("btnNormals");
  const btnPoint = document.getElementById("btnPoint");
  const btnSpot = document.getElementById("btnSpot");
  const btnAnim = document.getElementById("btnAnim");

  btnLighting.addEventListener("click", () => {
    lightingOn = lightingOn ? 0 : 1;
    btnLighting.textContent = `Lighting: ${lightingOn ? "ON" : "OFF"}`;
  });

  btnNormals.addEventListener("click", () => {
    showNormals = showNormals ? 0 : 1;
    btnNormals.textContent = `Show Normals: ${showNormals ? "ON" : "OFF"}`;
  });

  btnPoint.addEventListener("click", () => {
    pointOn = pointOn ? 0 : 1;
    btnPoint.textContent = `Point Light: ${pointOn ? "ON" : "OFF"}`;
  });

  btnSpot.addEventListener("click", () => {
    spotOn = spotOn ? 0 : 1;
    btnSpot.textContent = `Spot Light: ${spotOn ? "ON" : "OFF"}`;
  });

  btnAnim.addEventListener("click", () => {
    animateLight = animateLight ? 0 : 1;
    btnAnim.textContent = `Animate Light: ${animateLight ? "ON" : "OFF"}`;
  });

  // Sliders
  const lx = document.getElementById("lx");
  const ly = document.getElementById("ly");
  const lz = document.getElementById("lz");
  lx.addEventListener("input", () => (pointPos[0] = parseFloat(lx.value)));
  ly.addEventListener("input", () => (pointPos[1] = parseFloat(ly.value)));
  lz.addEventListener("input", () => (pointPos[2] = parseFloat(lz.value)));

  const lr = document.getElementById("lr");
  const lg = document.getElementById("lg");
  const lb = document.getElementById("lb");

  const updateColor = () => {
    lightColor[0] = parseFloat(lr.value);
    lightColor[1] = parseFloat(lg.value);
    lightColor[2] = parseFloat(lb.value);
  };

  lr.addEventListener("input", updateColor);
  lg.addEventListener("input", updateColor);
  lb.addEventListener("input", updateColor);
}

let frames = 0;
let lastFpsTime = performance.now();

function tick(now) {
  const dt = (now - lastTime) / 1000.0;
  lastTime = now;

  handleMovement(dt);

  // animate point light around center
  if (animateLight) {
    lightAngle += dt * 0.8;
    const r = 8.0;
    const cx = 16.0;
    const cz = 16.0;
    pointPos[0] = cx + r * Math.cos(lightAngle);
    pointPos[2] = cz + r * Math.sin(lightAngle);

    // sync sliders
    document.getElementById("lx").value = pointPos[0].toFixed(2);
    document.getElementById("lz").value = pointPos[2].toFixed(2);
  }

  // spotlight follows camera (flashlight)
  spotPos = [camera.eye.elements[0], camera.eye.elements[1], camera.eye.elements[2]];
  const f = new Vector3();
  f.set(camera.at);
  f.sub(camera.eye);
  f.normalize();
  spotDir = [f.elements[0], f.elements[1], f.elements[2]];

  drawScene();

  frames++;
  if (now - lastFpsTime >= 1000) {
    document.getElementById("fps").textContent = `FPS: ${frames}`;
    frames = 0;
    lastFpsTime = now;
  }

  requestAnimationFrame(tick);
}

async function main() {
  canvas = document.getElementById("webgl");
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) throw new Error("WebGL not supported");

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.05, 0.05, 0.07, 1.0);

  connectGLSL();

  Cube.init(gl, a_Position, a_Normal, a_UV);
  Sphere.init(gl, a_Position, a_Normal, a_UV);

  markerCube = new Cube();
  sphere1 = new Sphere();
  sphere2 = new Sphere();

  camera = new Camera(canvas);

  initTextures();
  addInput();

  // Optional OBJ: put model.obj next to this file
  try {
    objModel = new Model();
    await objModel.loadFromOBJ(gl, "model.obj", a_Position, a_Normal, a_UV);
    console.log("OBJ loaded!");
  } catch (e) {
    console.warn("OBJ not loaded (optional):", e.message);
    objModel = null;
  }

  requestAnimationFrame(tick);
}

main();