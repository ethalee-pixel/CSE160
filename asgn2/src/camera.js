class Camera {
  constructor(canvas) {
    this.fov = 60;

    this.eye = new Vector3([16, 2, 16]);
    this.at  = new Vector3([16, 2, 27]);   // looking slightly forward
    this.up  = new Vector3([0, 1, 0]);

    // yaw/pitch controls (degrees)
    this.yaw = 180;    // facing -Z initially
    this.pitch = 0;

    this.viewMatrix = new Matrix4();
    this.projectionMatrix = new Matrix4();
    this.projectionMatrix.setPerspective(this.fov, canvas.width / canvas.height, 0.1, 1000);

    this._recomputeFront();
    this.updateView();
  }

  _recomputeFront() {
    // Convert yaw/pitch -> forward direction
    const yawRad = (this.yaw * Math.PI) / 180;
    const pitchRad = (this.pitch * Math.PI) / 180;

    const fx = Math.sin(yawRad) * Math.cos(pitchRad);
    const fy = Math.sin(pitchRad);
    const fz = Math.cos(yawRad) * Math.cos(pitchRad);

    this.front = new Vector3([fx, fy, fz]);
    this.front.normalize();

    this.at.set(this.eye);
    this.at.add(this.front);
  }

  updateView() {
    this.viewMatrix.setLookAt(
      this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
      this.at.elements[0],  this.at.elements[1],  this.at.elements[2],
      this.up.elements[0],  this.up.elements[1],  this.up.elements[2]
    );
  }

  moveForward(speed = 0.3) {
    const f = new Vector3(this.front.elements);
    f.mul(speed);
    this.eye.add(f);
    this.at.add(f);
    this.updateView();
  }

  moveBackwards(speed = 0.3) {
    const f = new Vector3(this.front.elements);
    f.mul(speed);
    this.eye.sub(f);
    this.at.sub(f);
    this.updateView();
  }

  moveRight(speed = 0.3) {
    // right = front x up
    const right = Vector3.cross(this.front, this.up);
    right.normalize();
    right.mul(speed);
    this.eye.add(right);
    this.at.add(right);
    this.updateView();
  }

  moveLeft(speed = 0.3) {
    const right = Vector3.cross(this.front, this.up);
    right.normalize();
    right.mul(speed);
    this.eye.sub(right);
    this.at.sub(right);
    this.updateView();
  }

  panLeft(alpha = 3) {
    this.yaw -= alpha;
    this._recomputeFront();
    this.updateView();
  }

  panRight(alpha = 3) {
    this.yaw += alpha;
    this._recomputeFront();
    this.updateView();
  }

look(dx, dy, sensitivity = 0.12) {
  this.yaw += dx * sensitivity;
  this.pitch -= dy * sensitivity;

  if (this.pitch > 89) this.pitch = 89;
  if (this.pitch < -89) this.pitch = -89;

  this._recomputeFront();
  this.updateView();
}

}
