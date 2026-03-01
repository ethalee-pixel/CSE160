// Sphere.js
export class Sphere {
  static init(gl, a_Position, a_Normal, a_UV) {
    Sphere.gl = gl;
    Sphere.a_Position = a_Position;
    Sphere.a_Normal = a_Normal;
    Sphere.a_UV = a_UV;

    const latBands = 24;
    const lonBands = 24;

    const verts = [];
    const pushVertex = (x, y, z, u, v) => {
      const len = Math.sqrt(x*x + y*y + z*z) || 1.0;
      const nx = x / len, ny = y / len, nz = z / len;
      verts.push(x, y, z, nx, ny, nz, u, v);
    };

    for (let lat = 0; lat < latBands; lat++) {
      const theta1 = (lat / latBands) * Math.PI;
      const theta2 = ((lat + 1) / latBands) * Math.PI;

      for (let lon = 0; lon < lonBands; lon++) {
        const phi1 = (lon / lonBands) * 2 * Math.PI;
        const phi2 = ((lon + 1) / lonBands) * 2 * Math.PI;

        const x1 = Math.sin(theta1) * Math.cos(phi1);
        const y1 = Math.cos(theta1);
        const z1 = Math.sin(theta1) * Math.sin(phi1);

        const x2 = Math.sin(theta1) * Math.cos(phi2);
        const y2 = Math.cos(theta1);
        const z2 = Math.sin(theta1) * Math.sin(phi2);

        const x3 = Math.sin(theta2) * Math.cos(phi1);
        const y3 = Math.cos(theta2);
        const z3 = Math.sin(theta2) * Math.sin(phi1);

        const x4 = Math.sin(theta2) * Math.cos(phi2);
        const y4 = Math.cos(theta2);
        const z4 = Math.sin(theta2) * Math.sin(phi2);

        const u1 = lon / lonBands;
        const u2 = (lon + 1) / lonBands;
        const v1 = lat / latBands;
        const v2 = (lat + 1) / latBands;

        // (1,2,3)
        pushVertex(x1, y1, z1, u1, v1);
        pushVertex(x2, y2, z2, u2, v1);
        pushVertex(x3, y3, z3, u1, v2);

        // (2,4,3)
        pushVertex(x2, y2, z2, u2, v1);
        pushVertex(x4, y4, z4, u2, v2);
        pushVertex(x3, y3, z3, u1, v2);
      }
    }

    Sphere.vertexCount = verts.length / 8;

    Sphere.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, Sphere.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

    Sphere.stride = 8 * 4;
  }

  constructor() {
    this.matrix = new Matrix4();
  }

  render(u_ModelMatrix, u_NormalMatrix) {
    const gl = Sphere.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, Sphere.vbo);

    gl.vertexAttribPointer(Sphere.a_Position, 3, gl.FLOAT, false, Sphere.stride, 0);
    gl.enableVertexAttribArray(Sphere.a_Position);

    gl.vertexAttribPointer(Sphere.a_Normal, 3, gl.FLOAT, false, Sphere.stride, 3 * 4);
    gl.enableVertexAttribArray(Sphere.a_Normal);

    gl.vertexAttribPointer(Sphere.a_UV, 2, gl.FLOAT, false, Sphere.stride, 6 * 4);
    gl.enableVertexAttribArray(Sphere.a_UV);

    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    const nm = new Matrix4();
    nm.setInverseOf(this.matrix);
    nm.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, nm.elements);

    gl.drawArrays(gl.TRIANGLES, 0, Sphere.vertexCount);
  }
}