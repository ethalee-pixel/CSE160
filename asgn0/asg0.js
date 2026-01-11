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
function angleBetween(v1,v2)
{
    if(v1.magnitude() == 0 || v2.magnitude() == 0)
    {
        return 0;
    }
    var formulaForAngle = Math.acos(Math.max(-1,Math.min(1,Vector3.dot(v1,v2)/(v1.magnitude() * v2.magnitude())))) * (180 / Math.PI)
    return formulaForAngle;
}

function areaTriangle(v1,v2)
{
    var crossVector = Vector3.cross(v1,v2);
    var crossVectorMagnitude = crossVector.magnitude();
    var area = crossVectorMagnitude/2;
    return area;
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

    var x2 = parseFloat(getx2)
    var y2 = parseFloat(gety2)

    var v2 = new Vector3([x2,y2,0]);
    drawVector(v2,"blue");
}
function handleDrawOperationEvent()
{
    var canvas = document.getElementById('example');
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 400, 400);
    var getx1 = document.getElementById('x1').value;
    var gety1 = document.getElementById('y1').value;

    var getOperation = document.getElementById('Operation-select');
    var operation = getOperation.value;
    var x1 = parseFloat(getx1)
    var y1 = parseFloat(gety1)

    var v1 = new Vector3([x1,y1,0]);
    drawVector(v1,"red")

    var getx2 = document.getElementById('x2').value;
    var gety2 = document.getElementById('y2').value;
    var getScalar = document.getElementById('scalar').value;
    
    var scalar = parseFloat(getScalar);
    var x2 = parseFloat(getx2)
    var y2 = parseFloat(gety2)

    var v2 = new Vector3([x2,y2,0]);
    drawVector(v2,"blue");
    if(operation == "add")
    {
        var additionVector = new Vector3(v1.elements);
        additionVector.add(v2);
        drawVector(additionVector,"green")
    }
    else if(operation == "sub")
    {
        var subtractionVector = new Vector3(v1.elements);
        subtractionVector.sub(v2);
        drawVector(subtractionVector,"green")
    }
        else if(operation == "div")
    {
        var divisionVector1 = new Vector3(v1.elements);
        var divisionVector2 = new Vector3(v2.elements);
        divisionVector1.div(scalar);
        divisionVector2.div(scalar);
        drawVector(divisionVector1,"green")
        drawVector(divisionVector2,"green")
    }
            else if(operation == "mul")
    {
        var multiplicationVector1 = new Vector3(v1.elements);
        var multiplicationVector2 = new Vector3(v2.elements);
        multiplicationVector1.mul(scalar);
        multiplicationVector2.mul(scalar);
        drawVector(multiplicationVector1,"green")
        drawVector(multiplicationVector2,"green")
    }
    else if(operation == "mag")
    {
        var magnitudeVector1 = v1.magnitude();
        var magnitudeVector2 = v2.magnitude();
        console.log("Magnitude v1: ", magnitudeVector1);
        console.log("Magnitude v2: ", magnitudeVector2);
    }
    else if(operation == "norm")
    {
        var normalizeVector1 = new Vector3(v1.elements);
        var normalizeVector2 = new Vector3(v2.elements);
        normalizeVector1.normalize();
        normalizeVector2.normalize();
        drawVector(normalizeVector1,"green");
        drawVector(normalizeVector2,"green");
    }
    else if(operation == "angle")
    {
        var angleBetweenVectors = angleBetween(v1,v2);
        console.log(angleBetweenVectors);
    }
    else if(operation == "area")
    {
        var area = areaTriangle(v1,v2);
        console.log("Triangle area: ", area);
    }
}