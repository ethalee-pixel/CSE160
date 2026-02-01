// ColoredPoints.js (3D Dog with eyes) 
// Vertex shader program
var VSHADER_SOURCE =`
  attribute vec4 a_Position; 
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  void main() { 
    gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
  }`;

// Fragment shader program
var FSHADER_SOURCE =
  `precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`;

let canvas, gl;
let a_Position, u_FragColor, u_ModelMatrix, u_GlobalRotateMatrix;

let g_globalAngle = -150;
let g_shapesList = [];
let g_headAngle = 0;      // NEW: Head rotation
let g_tailAngle = 0;      // NEW: Tail wag
let g_legAngle = 0;       // NEW: Leg movement
let g_animation = false;  // NEW: Animation toggle
let g_animationTime = 0;  // NEW: For animation timing

function setUpWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});
  if (!gl) { console.log('Failed to get the rendering context for WebGL'); return; }
  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) { console.log('Failed to intialize shaders.'); return; }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  gl.uniformMatrix4fv(u_ModelMatrix,false,new Matrix4().elements);
}

function addActionsForHTMLUI() {
  document.getElementById('angleSlide').addEventListener('input', function() {
    g_globalAngle = this.value; 
    renderScene();
  });
  
  // Use the existing sliders for dog parts
  document.getElementById('magentaSlide').addEventListener('input', function() {
    g_legAngle = this.value; // Head turn
    renderScene();
  });
  
  document.getElementById('yellowSlide').addEventListener('input', function() {
    g_tailAngle = this.value; // Tail wag
    renderScene();
  });
  
  // Use existing buttons for animation
  document.getElementById('animationYellowOnButton').addEventListener('click', function() {
    g_animation = true;
  });
  
  document.getElementById('animationYellowOffButton').addEventListener('click', function() {
    g_animation = false;
  });
}

function main() {
  setUpWebGL();
  connectVariablesToGLSL();
  addActionsForHTMLUI();
  addMouseControl();
  gl.clearColor(0.9,0.9,1.0,1.0);

  requestAnimationFrame(tick);
}
// Add to global variables
let g_frameCount = 0;
let g_lastTime = 0;
let g_fps = 0;
let g_headBob = 0;
function tick() {
  // Calculate FPS
  g_frameCount++;
  let currentTime = performance.now();
  if (currentTime - g_lastTime >= 1000) {
    g_fps = g_frameCount;
    g_frameCount = 0;
    g_lastTime = currentTime;
    
    if (document.getElementById('fps')) {
      document.getElementById('fps').innerHTML = `FPS: ${g_fps} | Mode: ${g_animationMode}`;
    }
    
    // Log if FPS drops below 10
    if (g_fps < 10) {
      console.warn(`Low FPS: ${g_fps}. Consider optimizing.`);
    }
  }
  
  if (g_animation) {
    g_animationTime += 1;
    
    switch(g_animationMode) {
      case 0: // Normal walking
        g_legAngle = Math.sin(g_animationTime * 0.1) * 10;
        g_headBob = Math.sin(g_animationTime * 0.08) * 0.01;
        break;
      case 1: // Excited jumping
        g_legAngle = Math.sin(g_animationTime * 0.2) * 10;
        g_headBob = Math.sin(g_animationTime * 0.15) * 0.02;
        break;
      case 2: // Sleeping
        g_legAngle = Math.sin(g_animationTime * 0.05) * 5;
        g_headBob = Math.sin(g_animationTime * 0.03) * 0.005;
        break;
    }
  }
  
  renderScene();
  requestAnimationFrame(tick);
}

function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  let globalRotMat = new Matrix4()
    .rotate(-15, 1, 0, 0) // tilt camera
    .rotate(g_globalAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix,false,globalRotMat.elements);

  drawDog();
}

// Add to global variables
let g_mouseDown = false;
let g_lastMouseX = null;
let g_lastMouseY = null;
let g_animationMode = 0; // 0 = normal, 1 = excited, 2 = sleeping

// Update mouse control:
function addMouseControl() {
  canvas.onmousedown = function(ev) {
    g_mouseDown = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
    
    // Shift-click for different animation
    if (ev.shiftKey) {
      g_animationMode = (g_animationMode + 1) % 3;
      g_animationTime = 0;
      console.log("Animation mode:", g_animationMode);
    }
  };

  canvas.onmouseup = function() {
    g_mouseDown = false;
  };

  canvas.onmousemove = function(ev) {
    if (!g_mouseDown) return;
    
    let x = ev.clientX;
    let y = ev.clientY;
    
    let dx = x - g_lastMouseX;
    let dy = y - g_lastMouseY;
    
    // Rotate based on mouse movement
    g_globalAngle += dx * 0.5;
    
    g_lastMouseX = x;
    g_lastMouseY = y;
    
    renderScene();
  };
}

function drawDog() {
  /* ========= CONSTANTS ========= */
  const BODY_W = 0.9;
  const BODY_H = 0.35;
  const BODY_D = 0.4;
  const HEAD = 0.3;
  const LEG_H = 0.4;
  const TAIL_H = 0.35;
  const BODY_OFFSET_X = -0.15;
  const NECK_H = 0.4;
  const NECK_W = 0.3;
  const NECK_D = 0.3;

  let breathing = 0;
  let tailWag = 0;
  
  if (g_animation) {
    breathing = Math.sin(g_animationTime * 0.05) * 0.01;
    tailWag = Math.sin(g_animationTime * 0.08) * 10;
  }

  /* ========= DOG ROOT ========= */
  let dogRoot = new Matrix4();
  dogRoot.setTranslate(-0.2, -0.2, 0);

  /* ========= BODY ========= */
  let body = new Cube();
  body.color = [0.76, 0.6, 0.42, 1];
  body.matrix = new Matrix4(dogRoot);
  let bodyBase = new Matrix4(body.matrix);
  body.matrix.translate(BODY_OFFSET_X - 0.25, breathing, -0.1); // Add breathing
  body.matrix.scale(BODY_W, BODY_H, BODY_D);
  body.render();

  /* ========= NECK ========= */
  let neck = new Cube();
  neck.color = [0.76, 0.6, 0.42, 1];
  
  neck.matrix = new Matrix4(bodyBase);
  neck.matrix.translate(
    BODY_W / 2 - NECK_W / 2,
    BODY_H - 0.15,
    BODY_D / 2 - NECK_D / 2 - 0.1
  );
  let neckBob = 0;
    if (g_animation) {
    let neckBob = Math.sin(g_animationTime * 0.07) * 0.02; // Up/down movement
    neck.matrix.translate(0, neckBob, 0);
  }
  
  let neckTop = new Matrix4(neck.matrix);
  neckTop.translate(NECK_W / 2, NECK_H, NECK_D);
  
  neck.matrix.scale(NECK_W, NECK_H, NECK_D);
  neck.render();

  /* ========= HEAD ========= */
  let head = new Cube();
  head.color = [0.76, 0.6, 0.42, 1];
  
  head.matrix = new Matrix4(neckTop);
  head.matrix.translate(
    -HEAD / 2,
    -HEAD / 3,
    0
  );
    if (g_animation) {
    let headBob = Math.sin(g_animationTime * 0.07) * 0.02; // Up/down movement
    head.matrix.translate(0, headBob, 0);
  } 

  let headBase = new Matrix4(head.matrix);
  head.matrix.scale(HEAD, HEAD, HEAD);
  head.render();

/* ========= EYES - using SPHERE primitive ========= */ 
const eyeOffsets = [
  [0.25, 0.22, HEAD],   // Right eye
  [0.05, 0.22, HEAD],   // Left eye
];

eyeOffsets.forEach(offset => {
  let eye = new Sphere(); // Use Sphere instead of Cube
  eye.color = [0.1, 0.1, 0.1, 1]; // Dark gray
  
  eye.matrix = new Matrix4(headBase);
  
  if (g_animation) {
    let eyeBob = Math.sin(g_animationTime * 0.09 + offset[0]) * 0.01;
    eye.matrix.translate(0, eyeBob, 0);
  }
  
  eye.matrix.translate(...offset);
  eye.matrix.scale(0.04, 0.04, 0.04);
  eye.render();
});

/* ========= SNOUT (Second Level) ========= */
let snout = new Cube();
snout.color = [0.66, 0.5, 0.32, 1];

snout.matrix = new Matrix4(headBase);
// Position snout relative to head
snout.matrix.translate(-0.05+0.11, 0.02+0.03, HEAD * 0.8);
snout.matrix.scale(0.18, 0.12, 0.12);

// Save snout transformation BEFORE rendering
let snoutBeforeScale = new Matrix4(headBase);
snoutBeforeScale.translate(-0.05+0.11, 0.02+0.03, HEAD * 0.8);
// This is the snout's transformation WITHOUT the final scale

snout.render();

/* ========= NOSE (Third Level - CORRECTED) ========= */
let nose = new Cube();
nose.color = [0.3, 0.2, 0.1, 1];

// Option 1: Attach to snout BEFORE scale
nose.matrix = new Matrix4(snoutBeforeScale);

// Position at front of snout (in snout's local coordinates)
// The snout will be scaled to 0.12 in Z direction, so front is at Z = 0.06
nose.matrix.translate(0, 0.03, 0.2);

// Apply nose scale (not adjusting for snout scale since we attached before scale)
nose.matrix.scale(0.1, 0.08, 0.05);

nose.render();

  /* ========= EARS ========= */
  const earOffsets = [
    // Right ear
    {
      position: [0.25, HEAD * 0.8, HEAD * 0.2],
      rotation: -20,
      size: [0.08, 0.15, 0.03]
    },
    // Left ear
    {
      position: [-0.01, HEAD * 0.8, HEAD * 0.2],
      rotation: 20,
      size: [0.08, 0.15, 0.03]
    }
  ];

  earOffsets.forEach(ear => {
    let earCube = new Cube();
    earCube.color = [0.7, 0.55, 0.37, 1];
    
    earCube.matrix = new Matrix4(headBase);
    earCube.matrix.translate(...ear.position);
    earCube.matrix.rotate(ear.rotation, 0, 0, 1);
    earCube.matrix.scale(...ear.size);
    earCube.render();
  });

    /* ========= LEGS - STEPPING MOTION ========= */
  // Positive angle = leg lifts UP (forward step)
  // Negative angle = leg goes DOWN (backward step)
  
  const legAngles = [
    g_legAngle,      // Front right: UP
    -g_legAngle,     // Front left: DOWN
    -g_legAngle,     // Back right: DOWN
    g_legAngle,      // Back left: UP
  ];

  const legPositions = [
    [-BODY_W * 0.3, -BODY_H / 2 - LEG_H / 2, BODY_D * 0.3],   // Front right
    [-BODY_W * 0.3, -BODY_H / 2 - LEG_H / 2, -BODY_D * 0.3],  // Front left
    [BODY_W * 0.3, -BODY_H / 2 - LEG_H / 2, BODY_D * 0.3],    // Back right
    [BODY_W * 0.3, -BODY_H / 2 - LEG_H / 2, -BODY_D * 0.3],   // Back left
  ];

  for (let i = 0; i < 4; i++) {
    let leg = new Cube();
    leg.color = [0.6, 0.4, 0.3, 1];
    
    leg.matrix = new Matrix4(bodyBase);
    leg.matrix.translate(...legPositions[i]);
    
    // Lift leg UP (rotate around X-axis at the top)
    leg.matrix.translate(0, LEG_H/2, 0);          // Pivot at top
    leg.matrix.rotate(legAngles[i], 1, 0, 0);     // X-axis = up/down
    leg.matrix.translate(0, -LEG_H/2, 0);         // Move back
    
    // Back legs slightly larger
    const legScale = i >= 2 ? 0.14 : 0.12;
    leg.matrix.scale(legScale, LEG_H, legScale);
    
    leg.render();
  }

  /* ========= TAIL ========= */
  let tail = new Cube();
  tail.color = [0.76, 0.6, 0.42, 1];
  tail.matrix = new Matrix4(bodyBase);
  tail.matrix.translate(
    BODY_OFFSET_X - BODY_W / 2,
    BODY_H / 4,
    -0.2
  );
  
  // SECOND LEVEL JOINT: Tail wag (controlled by yellow slider + animation)
  tail.matrix.rotate(35, 0, 0, 1);
  
  tail.matrix.translate(0.2, -0.05, 0.2);
   tail.matrix.rotate(tailWag+ g_tailAngle, 0, 0, 1);
  tail.matrix.scale(0.1, TAIL_H, 0.1);
  tail.render();
}



