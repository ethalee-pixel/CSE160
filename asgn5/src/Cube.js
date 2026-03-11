// Cube.js
export class Cube {
  static init(gl, a_Position, a_UV) {
    Cube.gl = gl;
    Cube.a_Position = a_Position;
    Cube.a_UV = a_UV;


    const V = new Float32Array([
      
      0,0,1,  0,0,   1,0,1,  1,0,   1,1,1,  1,1,
      0,0,1,  0,0,   1,1,1,  1,1,   0,1,1,  0,1,

      
      1,0,0,  0,0,   0,0,0,  1,0,   0,1,0,  1,1,
      1,0,0,  0,0,   0,1,0,  1,1,   1,1,0,  0,1,

    
      0,0,0,  0,0,   0,0,1,  1,0,   0,1,1,  1,1,
      0,0,0,  0,0,   0,1,1,  1,1,   0,1,0,  0,1,

 
      1,0,1,  0,0,   1,0,0,  1,0,   1,1,0,  1,1,
      1,0,1,  0,0,   1,1,0,  1,1,   1,1,1,  0,1,

   
      0,1,1,  0,0,   1,1,1,  1,0,   1,1,0,  1,1,
      0,1,1,  0,0,   1,1,0,  1,1,   0,1,0,  0,1,

      0,0,0,  0,0,   1,0,0,  1,0,   1,0,1,  1,1,
      0,0,0,  0,0,   1,0,1,  1,1,   0,0,1,  0,1,
    ]);

    Cube.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, Cube.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, V, gl.STATIC_DRAW);

    Cube.stride = 5 * 4; 
  }

  constructor() {
    this.matrix = new Matrix4();
  }

  render(u_ModelMatrix) {
    const gl = Cube.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, Cube.vbo);

    gl.vertexAttribPointer(Cube.a_Position, 3, gl.FLOAT, false, Cube.stride, 0);
    gl.enableVertexAttribArray(Cube.a_Position);

    gl.vertexAttribPointer(Cube.a_UV, 2, gl.FLOAT, false, Cube.stride, 3 * 4);
    gl.enableVertexAttribArray(Cube.a_UV);

    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }
}
