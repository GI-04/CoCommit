// Light bending for the liquid glass (PLAN/2026-10-22-liquid-glass.md; narrower and steeper since
// PLAN/2026-11-10-glass-crisp.md). A glass surface acts like a lens with a rounded rim: the middle is flat and lightly
// frosted, and near the edge the backdrop is bent, sharp. The bend is drawn as a displacement map (an RGBA image the size
// of the element) that an SVG feDisplacementMap reads: red moves the sample along x, green along y, 128 means "stay put".
// Blue says how much of the sharp rim shows over the frosted middle (255 over the outer half of the rim, fading to 0 at
// its inner end). Only Chromium can use an SVG filter as a backdrop-filter, so GlassEffects.tsx applies it there.

// How wide the bent rim is, how far it bends and how much the middle is frosted (blur deviation), in CSS pixels, for an
// element of this size and corner radius.
export function lensFit(width: number, height: number, radius: number) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  // A thin rim that bends hard reads as a crisp line of bent backdrop; a wide gentle one reads as a smear.
  const bezel = Math.min(16, Math.max(6, r * 0.5), width / 2, height / 2);
  // feDisplacementMap moves by scale × (channel/255 − 0.5), so the farthest move is scale / 2: one rim's width.
  return { radius: r, bezel, scale: Math.floor(bezel * 2), frost: 8 };
}

// The map itself, row by row. Inside the rim each pixel samples from further in along the edge's normal, strongest right
// at the edge and easing to nothing at the inner end of the rim (the profile of a quarter circle, like the rounded edge
// of a glass slab), so what's behind looks stretched toward the edge. Sampling inward keeps every sample inside the
// element, where the backdrop exists. Outside the rounded corners the map is neutral.
export function lensMap(width: number, height: number, radius: number, bezel = lensFit(width, height, radius).bezel): Uint8ClampedArray<ArrayBuffer> {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const hx = w / 2;
  const hy = h / 2;
  const r = Math.max(0, Math.min(radius, hx, hy));
  const rim = Math.max(1, Math.min(bezel, hx, hy));
  const data = new Uint8ClampedArray(w * h * 4);
  new Uint32Array(data.buffer).fill(0xff008080); // every pixel neutral (128, 128, 0, 255; little-endian)
  // Rows away from the rounded top and bottom only bend near the left and right edges: skip their flat middle.
  const band = Math.max(r, rim);
  for (let y = 0; y < h; y++) {
    const middleRow = y >= band && y < h - band;
    for (let x = 0; x < w; x++) {
      if (middleRow && x === Math.ceil(rim)) x = Math.max(x, w - Math.ceil(rim) - 1);
      const i = (y * w + x) * 4;
      const px = x + 0.5 - hx;
      const py = y + 0.5 - hy;
      // Distance to the rounded rectangle's edge (inside > 0) and the outward normal there.
      const qx = Math.abs(px) - (hx - r);
      const qy = Math.abs(py) - (hy - r);
      let edge: number;
      let nx = 0;
      let ny = 0;
      if (qx > 0 && qy > 0) {
        const len = Math.hypot(qx, qy);
        edge = r - len;
        nx = (Math.sign(px) * qx) / len;
        ny = (Math.sign(py) * qy) / len;
      } else if (qx >= qy) {
        edge = r - qx;
        nx = Math.sign(px);
      } else {
        edge = r - qy;
        ny = Math.sign(py);
      }
      if (edge < 0 || edge >= rim) continue;
      const t = 1 - edge / rim; // 1 at the edge, 0 at the inner end of the rim
      const bend = 1 - Math.sqrt(1 - t * t);
      data[i] = Math.round(128 - 127 * bend * nx);
      data[i + 1] = Math.round(128 - 127 * bend * ny);
      const s = Math.min(1, t * 2); // sharp over the outer half of the rim, then a short smoothstep into the frost
      data[i + 2] = Math.round(255 * s * s * (3 - 2 * s));
    }
  }
  return data;
}
