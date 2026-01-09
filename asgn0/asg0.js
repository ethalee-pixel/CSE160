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
