// Sphere.js
class Sphere {
  constructor() {
    this.type = 'sphere';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.segments = 12;
  }

  render() {
    var rgba = this.color;
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // Draw sphere using triangles
    for (let lat = 0; lat < this.segments; lat++) {
      const theta1 = lat * Math.PI / this.segments;
      const theta2 = (lat + 1) * Math.PI / this.segments;
      
      for (let lon = 0; lon < this.segments; lon++) {
        const phi1 = lon * 2 * Math.PI / this.segments;
        const phi2 = (lon + 1) * 2 * Math.PI / this.segments;
        
        // Create 4 vertices
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
        
        // Draw two triangles
        drawTriangle3D([x1, y1, z1, x2, y2, z2, x3, y3, z3]);
        drawTriangle3D([x2, y2, z2, x4, y4, z4, x3, y3, z3]);
      }
    }
  }
}