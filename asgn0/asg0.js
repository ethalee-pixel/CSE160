function main() {
// Retrieve <canvas> element <- (1)
var canvas = document.getElementById('example');
if (!canvas) {
    console.log('Failed to retrieve the <canvas> element');
    return;
}
// Get the rendering context for 2DCG <- (2)
var ctx = canvas.getContext('2d');
 
// Draw a blue rectangle <- (3)
ctx.fillStyle = "black";
ctx.fillRect(0, 0, 400, 400); // Fill a rectangle with the color

var v1 = new Vector3([2.25,2.25,0]);
drawVector(v1,"red")
const clickedDraw = document.getElementById('Draw')
if(clickedDraw)
{
    handleDrawEvent()
}
} 

function drawVector(v,color)
{
    var canvas = document.getElementById('example');
    var ctx = canvas.getContext('2d');

    const scale = 20;
    var x = v.elements[0];
    var y = v.elements[1];
    var newX = x * scale;
    var newY = y * scale;

    ctx.strokeStyle = color;

    ctx.beginPath();
    ctx.moveTo(200,200);
    ctx.lineTo(200 + newX, 200 - newY);
    ctx.stroke();

}
function handleDrawEvent()
{
    var canvas = document.getElementById('example');
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 400, 400);
    var getx1 = document.getElementById('x1').value;
    var gety1 = document.getElementById('y1').value;

    var x1 = parseFloat(getx1)
    var y1 = parseFloat(gety1)

    var v1 = new Vector3([x1,y1,0]);
    drawVector(v1,"red")

    var getx2 = document.getElementById('x2').value;
    var gety2 = document.getElementById('y2').value;

    var x1 = parseFloat(getx2)
    var y1 = parseFloat(gety2)

    var v2 = new Vector3([x2,y2,0]);
    drawVector(v2,"blue");
}