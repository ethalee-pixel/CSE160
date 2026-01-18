// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =`
  attribute vec4 a_Position; 
  uniform float u_Size;
  void main() { 
    gl_Position = a_Position;
    gl_PointSize = u_Size;
  }`;

// Fragment shader program
var FSHADER_SOURCE =
  `precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`;

// Global Variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;
function setUpWebGL()
{
    // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  //gl = getWebGLContext(canvas);
  gl = canvas.getContext("webgl", {preserveDrawingBuffer: true, alpha: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
}
function connectVariablesToGLSL() {
    // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }
   // Get the storage location of u_FragColor
  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get the storage location of u_Size');
    return;
  }
}
const POINT = 0;
const TRIANGLE = 1; 
const CIRCLE = 2;
let g_selectedColor = [1.0,1.0,1.0,1.0];
let g_selectedSize = 5.0;
let g_selectedType = POINT;
let g_selectedSegments = 10;
function addActionsForHTMLUI()
{
  // Button Events
  document.getElementById('green').onclick = function() { g_selectedColor = [0.0,1.0,0.0,1.0]};
  document.getElementById('red').onclick = function() { g_selectedColor = [1.0,0.0,0.0,1.0]};
  document.getElementById('clearButton').onclick = function() { g_shapesList = []; renderAllShapes();};
  document.getElementById('pointButton').onclick = function() { g_selectedType = POINT};
  document.getElementById('triButton').onclick = function() { g_selectedType = TRIANGLE};
document.getElementById('circleButton').onclick = function() { g_selectedType = CIRCLE};
  document.getElementById('redSlide').addEventListener('mouseup', function() {g_selectedColor[0] = this.value/100});
  document.getElementById('greenSlide').addEventListener('mouseup', function() {g_selectedColor[1] = this.value/100});
  document.getElementById('blueSlide').addEventListener('mouseup', function() {g_selectedColor[2] = this.value/100});
  document.getElementById('sizeSlide').addEventListener('mouseup', function() {g_selectedSize = this.value});
  document.getElementById('segmentSlide').addEventListener('mouseup', function() {g_selectedSegments = this.value});
  document.getElementById('treeButton').onclick = drawTree;
  document.getElementById('alphaSlider').addEventListener('input',function()
  {
    g_selectedColor[3] = this.value/100;
    renderAllShapes();
  })

}
function main() {

  // set up canvas and GL variables
  setUpWebGL();
  // connecting variables to GLSL shaders
  connectVariablesToGLSL();
  addActionsForHTMLUI();

  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = click;
  canvas.onmousemove = function(ev) {if(ev.buttons == 1) {click(ev)}};  

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
}
var g_shapesList = [];
//var g_points = [];  // The array for the position of a mouse press
//var g_colors = [];  // The array to store the color of a point
//var g_sizes = [];
function convertCoordinatesEventToGL(ev)
{
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);
  return([x,y]);
}
function renderAllShapes()
{
  var startTime = performance.now();
  gl.clear(gl.COLOR_BUFFER_BIT);
  var len = g_shapesList.length;
  for(var i = 0; i < len; i++) {
    g_shapesList[i].render();
  }
  var duration = performance.now() - startTime;
  sendTextToHTML("numdot: " + len + " ms: " + Math.floor(duration) + " fps: " + Math.floor(10000/duration)/10, "numdot");
}

function sendTextToHTML(text, htmlID)
{
  var htmlElm = document.getElementById(htmlID);
  if(!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML")
    return;
  }
  htmlElm.innerHTML = text;
}

function click(ev) {

  [x,y] = convertCoordinatesEventToGL(ev);
  let point;
  if(g_selectedType == POINT)
  {
    point = new Point();
  }
  else if(g_selectedType == TRIANGLE)
  {
    point = new Triangle();
  }
  else
  {
    point = new Circle();
    point.segments = g_selectedSegments;
  }
  point.position = [x,y];
  point.color = g_selectedColor.slice();
  point.size = g_selectedSize;
  g_shapesList.push(point)
  // Store the coordinates to g_points array
  //g_points.push([x, y]);
  // Store the coordinates to g_points array
  //g_colors.push(g_selectedColor.slice());
  //g_sizes.push(g_selectedSize);
  renderAllShapes();
}
function drawTree() {
    g_shapesList = [];
    
    const treeTriangle = [
      // Trunk Layer
        {x: -0.04, y: -0.8, color: [0.4, 0.2, 0.0, 1.0], size: 15},
        {x: 0.04, y: -0.8, color: [0.5, 0.4, 0.1, 1.0], size: 15},
        {x: -0.04, y: -0.5, color: [0.5, 0.3, 0.1, 1.0], size: 15},
        {x: 0.04, y: -0.5, color: [0.5, 0.4, 0.1, 1.0], size: 15},
        {x: -0.05, y: -0.1, color: [0.6, 0.4, 0.2, 1.0], size: 15},
        {x: 0.15, y: -0.1, color: [0.6, 0.4, 0.2, 1.0], size: 15},
        {x: 0.15, y: -0.5, color: [0.5, 0.4, 0.1, 1.0], size: 15},
        {x: 0.15, y: -0.8, color: [0.5, 0.4, 0.1, 1.0], size: 15},

        // First Layer
        {x: 0.03, y: -0.1, color: [0.6, 0.4, 0.2, 1.0], size: 15},
        {x: 0.04, y: -0.1, color: [0.6, 0.4, 0.2, 1.0], size: 15},
        {x: -0.25, y: 0.0, color: [0.0, 0.4, 0.0, 1.0], size: 25},  
        {x: -0.125, y: 0.0, color: [0.0, 0.5, 0.0, 1.0], size: 25},
        {x: 0.00, y: 0.0, color: [0.0, 0.6, 0.0, 1.0], size: 25},  
        {x: 0.155, y: 0.0, color: [0.0, 0.5, 0.0, 1.0], size: 25},
        // Second Layer
        {x: 0.35, y: 0.0, color: [0.0, 0.4, 0.0, 1.0], size: 25}, 
        {x: -0.15, y: 0.2, color: [0.0, 0.6, 0.0, 1.0], size: 30},  
        {x: -0.05, y: 0.2, color: [0.0, 0.7, 0.0, 1.0], size: 30}, 
        {x: 0.09, y: 0.2, color: [0.0, 0.7, 0.0, 1.0], size: 30}, 

        // Third Layer
        {x: 0.2, y: 0.2, color: [0.0, 0.6, 0.0, 1.0], size: 30},   
        {x: -0.1, y: 0.4, color: [0.0, 0.7, 0.0, 1.0], size: 35}, 
        {x: 0.0, y: 0.4, color: [0.0, 0.8, 0.0, 1.0], size: 35},  
        // Fourth Layer 
        {x: 0.1, y: 0.4, color: [0.0, 0.7, 0.0, 1.0], size: 35},  
        {x: -0.05, y: 0.6, color: [0.0, 0.8, 0.0, 1.0], size: 20}, 
        // Last Layers
        {x: 0.05, y: 0.6, color: [0.0, 0.8, 0.0, 1.0], size: 20}, 
        // Top Layer
        {x: -0.025, y: 0.7, color: [0.0, 0.8, 0.0, 1.0], size: 20},  
    ];
    
    for(let i = 0; i < treeTriangle.length; i++) {
        let triangle = new Triangle();
        triangle.position = [treeTriangle[i].x, treeTriangle[i].y];
        triangle.color = treeTriangle[i].color;
        triangle.size = treeTriangle[i].size;
        g_shapesList.push(triangle);
    }
    
    renderAllShapes();
}