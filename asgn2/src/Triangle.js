function drawTriangle3DUV(verts, uvs) {
  // verts: [x,y,z, x,y,z, x,y,z]
  // uvs:   [u,v, u,v, u,v]
  const n = 3;

  // Position buffer
  const vbuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // UV buffer
  const ubuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, ubuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  gl.drawArrays(gl.TRIANGLES, 0, n);
}
