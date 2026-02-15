// Animal.js
import { Cube } from "./Cube.js";

export function drawAnimal(u_ModelMatrix, baseX, baseY, baseZ) {
  // body
  let body = new Cube();
  body.matrix.setTranslate(baseX, baseY + 0.4, baseZ);
  body.matrix.scale(0.9, 0.4, 0.5);
  body.render(u_ModelMatrix);

  // head
  let head = new Cube();
  head.matrix.setTranslate(baseX + 0.65, baseY + 0.55, baseZ);
  head.matrix.scale(0.35, 0.3, 0.3);
  head.render(u_ModelMatrix);

  // legs
  const legs = [
    [baseX - 0.3, baseY, baseZ - 0.2],
    [baseX - 0.3, baseY, baseZ + 0.2],
    [baseX + 0.3, baseY, baseZ - 0.2],
    [baseX + 0.3, baseY, baseZ + 0.2],
  ];
  for (const [x, y, z] of legs) {
    let leg = new Cube();
    leg.matrix.setTranslate(x, y, z);
    leg.matrix.scale(0.15, 0.4, 0.15);
    leg.render(u_ModelMatrix);
  }
}
