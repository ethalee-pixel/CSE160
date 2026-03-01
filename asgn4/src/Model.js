// Model.js
export class Model {
  constructor() {
    this.matrix = new Matrix4();
    this._ready = false;
    this._vbo = null;
    this._vertexCount = 0;
  }

  async loadFromOBJ(gl, url, a_Position, a_Normal, a_UV) {
    this.gl = gl;
    this.a_Position = a_Position;
    this.a_Normal = a_Normal;
    this.a_UV = a_UV;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load OBJ: ${url}`);
    const objText = await res.text();

    const positions = [[0,0,0]];
    const normals = [[0,0,1]];
    const faces = [];

    const lines = objText.split(/\r?\n/);
    for (const line of lines) {
      const s = line.trim();
      if (!s || s.startsWith("#")) continue;
      const parts = s.split(/\s+/);

      if (parts[0] === "v" && parts.length >= 4) {
        positions.push([+parts[1], +parts[2], +parts[3]]);
      } else if (parts[0] === "vn" && parts.length >= 4) {
        normals.push([+parts[1], +parts[2], +parts[3]]);
      } else if (parts[0] === "f" && parts.length >= 4) {
        const verts = parts.slice(1);
        for (let i = 1; i < verts.length - 1; i++) {
          faces.push([verts[0], verts[i], verts[i+1]]);
        }
      }
    }

    const parseRef = (ref) => {
      const [vStr, vtStr, vnStr] = ref.split("/");
      return { v: parseInt(vStr, 10), vn: vnStr ? parseInt(vnStr, 10) : 0 };
    };

    const faceNormal = (p0, p1, p2) => {
      const ax = p1[0]-p0[0], ay = p1[1]-p0[1], az = p1[2]-p0[2];
      const bx = p2[0]-p0[0], by = p2[1]-p0[1], bz = p2[2]-p0[2];
      const nx = ay*bz - az*by;
      const ny = az*bx - ax*bz;
      const nz = ax*by - ay*bx;
      const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1.0;
      return [nx/len, ny/len, nz/len];
    };

    const out = [];

    for (const tri of faces) {
      const r0 = parseRef(tri[0]);
      const r1 = parseRef(tri[1]);
      const r2 = parseRef(tri[2]);

      const p0 = positions[r0.v] || [0,0,0];
      const p1 = positions[r1.v] || [0,0,0];
      const p2 = positions[r2.v] || [0,0,0];

      let n0 = (r0.vn && normals[r0.vn]) ? normals[r0.vn] : null;
      let n1 = (r1.vn && normals[r1.vn]) ? normals[r1.vn] : null;
      let n2 = (r2.vn && normals[r2.vn]) ? normals[r2.vn] : null;

      if (!n0 || !n1 || !n2) {
        const fn = faceNormal(p0, p1, p2);
        n0 = n1 = n2 = fn;
      }

      // UV not needed: use 0,0
      out.push(
        p0[0],p0[1],p0[2],  n0[0],n0[1],n0[2],  0,0,
        p1[0],p1[1],p1[2],  n1[0],n1[1],n1[2],  0,0,
        p2[0],p2[1],p2[2],  n2[0],n2[1],n2[2],  0,0
      );
    }

    this._vertexCount = out.length / 8;
    this._vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(out), gl.STATIC_DRAW);

    this._ready = true;
  }

  render(u_ModelMatrix, u_NormalMatrix) {
    if (!this._ready) return;
    const gl = this.gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, this._vbo);

    gl.vertexAttribPointer(this.a_Position, 3, gl.FLOAT, false, 8*4, 0);
    gl.enableVertexAttribArray(this.a_Position);

    gl.vertexAttribPointer(this.a_Normal, 3, gl.FLOAT, false, 8*4, 3*4);
    gl.enableVertexAttribArray(this.a_Normal);

    gl.vertexAttribPointer(this.a_UV, 2, gl.FLOAT, false, 8*4, 6*4);
    gl.enableVertexAttribArray(this.a_UV);

    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    const nm = new Matrix4();
    nm.setInverseOf(this.matrix);
    nm.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, nm.elements);

    gl.drawArrays(gl.TRIANGLES, 0, this._vertexCount);
  }
}