// Cube.js
export class Cube {
  static init(gl, a_Position, a_Normal, a_UV) {
    Cube.gl = gl;
    Cube.a_Position = a_Position;
    Cube.a_Normal = a_Normal;
    Cube.a_UV = a_UV;

    // Interleaved: position(3), normal(3), uv(2) => 8 floats
    const V = new Float32Array([
      // +Z (front)
      0,0,1,   0,0,1,   0,0,   1,0,1,   0,0,1,   1,0,   1,1,1,   0,0,1,   1,1,
      0,0,1,   0,0,1,   0,0,   1,1,1,   0,0,1,   1,1,   0,1,1,   0,0,1,   0,1,

      // -Z (back)
      1,0,0,   0,0,-1,  0,0,   0,0,0,   0,0,-1,  1,0,   0,1,0,   0,0,-1,  1,1,
      1,0,0,   0,0,-1,  0,0,   0,1,0,   0,0,-1,  1,1,   1,1,0,   0,0,-1,  0,1,

      // -X (left)
      0,0,0,   -1,0,0,  0,0,   0,0,1,   -1,0,0,  1,0,   0,1,1,   -1,0,0,  1,1,
      0,0,0,   -1,0,0,  0,0,   0,1,1,   -1,0,0,  1,1,   0,1,0,   -1,0,0,  0,1,

      // +X (right)
      1,0,1,   1,0,0,   0,0,   1,0,0,   1,0,0,   1,0,   1,1,0,   1,0,0,   1,1,
      1,0,1,   1,0,0,   0,0,   1,1,0,   1,0,0,   1,1,   1,1,1,   1,0,0,   0,1,

      // +Y (top)
      0,1,1,   0,1,0,   0,0,   1,1,1,   0,1,0,   1,0,   1,1,0,   0,1,0,   1,1,
      0,1,1,   0,1,0,   0,0,   1,1,0,   0,1,0,   1,1,   0,1,0,   0,1,0,   0,1,

      // -Y (bottom)
      0,0,0,   0,-1,0,  0,0,   1,0,0,   0,-1,0,  1,0,   1,0,1,   0,-1,0,  1,1,
      0,0,0,   0,-1,0,  0,0,   1,0,1,   0,-1,0,  1,1,   0,0,1,   0,-1,0,  0,1,
    ]);

    Cube.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, Cube.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, V, gl.STATIC_DRAW);

    Cube.stride = 8 * 4;
  }

  constructor() {
    this.matrix = new Matrix4();
  }

  render(u_ModelMatrix, u_NormalMatrix = null) {
    const gl = Cube.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, Cube.vbo);

    gl.vertexAttribPointer(Cube.a_Position, 3, gl.FLOAT, false, Cube.stride, 0);
    gl.enableVertexAttribArray(Cube.a_Position);

    gl.vertexAttribPointer(Cube.a_Normal, 3, gl.FLOAT, false, Cube.stride, 3 * 4);
    gl.enableVertexAttribArray(Cube.a_Normal);

    gl.vertexAttribPointer(Cube.a_UV, 2, gl.FLOAT, false, Cube.stride, 6 * 4);
    gl.enableVertexAttribArray(Cube.a_UV);

    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // Normal matrix = inverse-transpose(modelMatrix)
    if (u_NormalMatrix) {
      const nm = new Matrix4();
      nm.setInverseOf(this.matrix);
      nm.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, nm.elements);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }
}