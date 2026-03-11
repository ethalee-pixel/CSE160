class Cube {
  constructor(gl) {
    this.gl = gl;
    this.color = [1, 1, 1, 1];
    this.matrix = new Matrix4();

    this.vertices = new Float32Array([
      // Front
      0,0,1,  1,1,1,  1,0,1,
      0,0,1,  0,1,1,  1,1,1,
      // Back
      0,0,0,  1,0,0,  1,1,0,
      0,0,0,  1,1,0,  0,1,0,
      // Left
      0,0,0,  0,1,1,  0,0,1,
      0,0,0,  0,1,0,  0,1,1,
      // Right
      1,0,0,  1,0,1,  1,1,1,
      1,0,0,  1,1,1,  1,1,0,
      // Top
      0,1,0,  1,1,1,  0,1,1,
      0,1,0,  1,1,0,  1,1,1,
      // Bottom
      0,0,0,  0,0,1,  1,0,1,
      0,0,0,  1,0,1,  1,0,0,
    ]);

    this.uvs = new Float32Array([
      // Front
      0,0,  1,1,  1,0,
      0,0,  0,1,  1,1,
      // Back
      0,0,  1,0,  1,1,
      0,0,  1,1,  0,1,
      // Left
      0,0,  1,1,  1,0,
      0,0,  0,1,  1,1,
      // Right
      0,0,  1,0,  1,1,
      0,0,  1,1,  0,1,
      // Top
      0,0,  1,1,  0,1,
      0,0,  1,0,  1,1,
      // Bottom
      0,0,  0,1,  1,1,
      0,0,  1,1,  1,0,
    ]);

    this.vertexBuffer = gl.createBuffer();
    this.uvBuffer = gl.createBuffer();
  }

  render(a_Position, a_UV, u_ModelMatrix, u_BaseColor) {
    const gl = this.gl;

    gl.uniform4f(u_BaseColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }
}
