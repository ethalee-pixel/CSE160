export class Camera {
  constructor(canvas) {
    this.fov = 60;


    this.eye = new Vector3([16, 1.6, 28]);
    this.yaw = 180;    
    this.pitch = 0;     

    this.up = new Vector3([0, 1, 0]);
    this.at = new Vector3([16, 1.6, 27]);

    this.viewMatrix = new Matrix4();
    this.projectionMatrix = new Matrix4();
    this.projectionMatrix.setPerspective(this.fov, canvas.width / canvas.height, 0.1, 1000);

    this._rebuildAt();
    this._rebuildView();
  }

  onResize(canvas) {
    this.projectionMatrix.setPerspective(this.fov, canvas.width / canvas.height, 0.1, 1000);
  }

  _rebuildAt() {
    const yawRad = this.yaw * Math.PI / 180;
    const pitchRad = this.pitch * Math.PI / 180;

    const dir = new Vector3([
      Math.cos(pitchRad) * Math.sin(yawRad),
      Math.sin(pitchRad),
      -Math.cos(pitchRad) * Math.cos(yawRad),
    ]);

    this.at = new Vector3(this.eye.elements);
    this.at.add(dir);
  }

  _rebuildView() {
    this.viewMatrix.setLookAt(
      this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
      this.at.elements[0],  this.at.elements[1],  this.at.elements[2],
      this.up.elements[0],  this.up.elements[1],  this.up.elements[2]
    );
  }

  addYawPitch(dYaw, dPitch) {
    this.yaw += dYaw;
    this.pitch = Math.max(-89, Math.min(89, this.pitch + dPitch));
    this._rebuildAt();
    this._rebuildView();
  }

  _forwardXZ() {
    let f = new Vector3();
    f.set(this.at);
    f.sub(this.eye);
    f.elements[1] = 0;
    f.normalize();
    return f;
  }

  moveForward(speed = 0.2) {
    const f = this._forwardXZ().mul(speed);
    this.eye.add(f);
    this._rebuildAt();
    this._rebuildView();
  }

  moveBackwards(speed = 0.2) {
    const f = this._forwardXZ().mul(-speed);
    this.eye.add(f);
    this._rebuildAt();
    this._rebuildView();
  }

  moveLeft(speed = 0.2) {
    const f = this._forwardXZ();
    const left = Vector3.cross(this.up, f).normalize().mul(speed);
    this.eye.add(left);
    this._rebuildAt();
    this._rebuildView();
  }

  moveRight(speed = 0.2) {
    const f = this._forwardXZ();
    const right = Vector3.cross(f, this.up).normalize().mul(speed);
    this.eye.add(right);
    this._rebuildAt();
    this._rebuildView();
  }
}
