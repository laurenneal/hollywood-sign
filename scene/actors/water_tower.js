// The water tower on the far hill = the SIGN index (0..100). Four legs, a cylindrical tank about 170 px
// wide, a conical roof, a ladder, a catwalk. The tank fills with PALETTE.water to index/100 inside a lighter
// tank outline, a painted needle gauge on the face points at the same number, and the number is printed large.
// No index yet: empty tank, an em dash on the face, and the legend says "not enough history yet".
// Mid layer, so it stands on the hill the lot buffer paints. Stale goes gray through scene.paint.

import { useDisplay } from '../fonts.js';
import { TIER } from '../detail.js';

const TANK_W = 190, TANK_H = 118, RIM_H = 36;   // cylinder seen from slightly above: the rims are ellipses
const ROOF_H = 66;
const LEG_H = 48;
// Not in the palette: the empty part of the tank (a pale wash between paper and towerLite) and the gauge face.
const TANK_EMPTY = '#dfe6e0';
const GAUGE_FACE = '#f6f1e2';

export default {
  id: 'water_tower',
  signal: 'sign_index',
  district: 'sky',
  layer: 'mid',
  sig: null,
  level: 0,          // 0..1 tank fill
  text: '—',

  init(scene) {},

  // no layout randomness: the tower stands where ANCHORS.waterTower says; only the fill changes
  update(sig, scene) {
    this.sig = sig;
    const v = sig && sig.value != null ? Number(sig.value) : null;
    this.level = v == null ? 0 : Math.max(0, Math.min(1, v / 100));
    this.text = v == null ? '—' : String(Math.round(v));
  },

  draw(p, t, scene) {
    const C = scene.PALETTE;
    const A = scene.ANCHORS.waterTower;
    const sig = this.sig;
    const nm = scene.isNight ? 1 : 0;
    const paint = (hx) => scene.paint(sig, nm ? mix(hx, C.skyNight, 0.35) : hx);
    const cx = A.x;
    const tankTop = A.y - TANK_H / 2, tankBot = A.y + TANK_H / 2;
    const feetY = tankBot + RIM_H / 2 + LEG_H;
    const tower = paint(C.tower), towerLite = paint(C.towerLite), water = paint(C.water);
    const empty = paint(TANK_EMPTY), emptyDk = paint(mix(TANK_EMPTY, C.tower, 0.3));
    const ink = scene.paint(sig, C.ink);

    p.push();
    p.noStroke();

    // ground shadow on the hill — larger so the tower reads as the sky landmark
    p.fill(26, 32, 34, 48); p.ellipse(cx + 14, feetY + 4, TANK_W + 48, 22);

    // back legs first (lighter, narrower), then the front pair, then the bracing
    p.fill(towerLite);
    leg(p, cx - 34, tankBot + 12, cx - 42, feetY - 6, 5);
    leg(p, cx + 34, tankBot + 12, cx + 42, feetY - 6, 5);
    p.fill(tower);
    leg(p, cx - 62, tankBot + 10, cx - 78, feetY, 7);
    leg(p, cx + 62, tankBot + 10, cx + 78, feetY, 7);
    p.stroke(tower); p.strokeWeight(2);
    p.line(cx - 66, tankBot + 22, cx + 74, feetY - 4); p.line(cx + 66, tankBot + 22, cx - 74, feetY - 4);   // X brace
    p.line(cx - 70, tankBot + 34, cx + 70, tankBot + 34);                                                   // tie
    p.noStroke();

    // tank: empty wash with left highlight / right shade (same upper-left light as the lot)
    p.fill(emptyDk); p.ellipse(cx, tankBot, TANK_W, RIM_H);
    p.fill(empty); p.rect(cx - TANK_W / 2, tankTop, TANK_W, TANK_H);
    p.fill(255, 250, 240, nm ? 18 : 40);
    p.rect(cx - TANK_W / 2, tankTop, TANK_W * 0.22, TANK_H);
    p.fill(26, 32, 34, nm ? 28 : 22);
    p.rect(cx + TANK_W / 2 - TANK_W * 0.18, tankTop, TANK_W * 0.18, TANK_H);
    if (this.level > 0) {
      const surfaceY = tankBot - this.level * TANK_H;
      p.fill(water);
      p.ellipse(cx, tankBot, TANK_W, RIM_H);
      p.rect(cx - TANK_W / 2, surfaceY, TANK_W, tankBot - surfaceY);
      p.fill(paint(mix(C.water, '#ffffff', 0.28)));
      p.ellipse(cx, surfaceY, TANK_W, RIM_H);                     // the water surface, seen from above
    }
    p.noFill(); p.stroke(towerLite); p.strokeWeight(3);
    p.line(cx - TANK_W / 2, tankTop, cx - TANK_W / 2, tankBot);
    p.line(cx + TANK_W / 2, tankTop, cx + TANK_W / 2, tankBot);
    p.arc(cx, tankBot, TANK_W, RIM_H, 0, Math.PI);
    p.ellipse(cx, tankTop, TANK_W, RIM_H);
    p.strokeWeight(1.5);
    p.line(cx - TANK_W / 2, tankTop + 30, cx + TANK_W / 2, tankTop + 30);   // hoops
    p.line(cx - TANK_W / 2, tankTop + 76, cx + TANK_W / 2, tankTop + 76);
    p.noStroke();
    // thin landmark hoop near the rim (reads at full-lot; does not cover the numeral)
    p.fill(tower);
    p.rect(cx - TANK_W / 2 + 4, tankTop + 8, TANK_W - 8, 6, 1);
    p.fill(towerLite);
    p.rect(cx - TANK_W / 2 + 4, tankTop + 8, TANK_W * 0.28, 6, 1);

    // catwalk around the lower third of the tank
    p.fill(tower); p.rect(cx - 96, tankBot - 9, 192, 6);
    p.stroke(tower); p.strokeWeight(1.5);
    p.line(cx - 96, tankBot - 21, cx + 96, tankBot - 21);
    for (let i = 0; i <= 8; i++) { const x = cx - 96 + i * 24; p.line(x, tankBot - 21, x, tankBot - 9); }
    p.noStroke();

    // the number, large, painted on the face
    p.fill(nm ? scene.paint(sig, C.paper) : ink);
    useDisplay(p, 44); p.textStyle(p.BOLD); p.textAlign(p.CENTER, p.CENTER);
    p.text(this.text, cx, tankTop + 44);
    p.textStyle(p.NORMAL);

    // painted needle gauge: a half dial, ticks at 0 25 50 75 100, needle at index/100
    const gy = tankTop + 100, gr = 36;
    p.fill(scene.paint(sig, GAUGE_FACE)); p.stroke(ink); p.strokeWeight(1.4);
    p.arc(cx, gy, gr * 2, gr * 2, Math.PI, Math.PI * 2, p.PIE);
    for (let i = 0; i <= 4; i++) {
      const a = Math.PI + (i / 4) * Math.PI;
      p.line(cx + Math.cos(a) * (gr - 6), gy + Math.sin(a) * (gr - 6), cx + Math.cos(a) * (gr - 1), gy + Math.sin(a) * (gr - 1));
    }
    const na = Math.PI + this.level * Math.PI;
    p.stroke(scene.paint(sig, C.lamp)); p.strokeWeight(2.8);
    p.line(cx, gy, cx + Math.cos(na) * (gr - 6), gy + Math.sin(na) * (gr - 6));
    p.noStroke(); p.fill(ink); p.ellipse(cx, gy, 7, 7);
    p.fill(ink); p.textSize(16); p.textAlign(p.CENTER, p.BOTTOM);
    p.text('0', cx - gr - 10, gy); p.text('100', cx + gr + 16, gy);

    // conical roof over the top rim, with a lighter facet and a finial
    p.fill(tower);
    p.ellipse(cx, tankTop, TANK_W + 8, RIM_H + 4);
    p.triangle(cx - TANK_W / 2 - 4, tankTop, cx + TANK_W / 2 + 4, tankTop, cx, tankTop - ROOF_H);
    p.fill(towerLite);
    p.triangle(cx - TANK_W / 2 - 4, tankTop, cx - 30, tankTop, cx, tankTop - ROOF_H);
    p.fill(tower); p.rect(cx - 2, tankTop - ROOF_H - 10, 4, 12); p.ellipse(cx, tankTop - ROOF_H - 12, 7, 7);

    // ladder up the right side, ground to rim
    p.stroke(tower); p.strokeWeight(2);
    const lx = cx + TANK_W / 2 + 8;
    p.line(lx, feetY, lx, tankTop + 6); p.line(lx + 9, feetY, lx + 9, tankTop + 6);
    p.strokeWeight(1.5);
    for (let y = feetY - 6; y > tankTop + 8; y -= 10) p.line(lx, y, lx + 9, y);
    p.noStroke();

    // overflow / fill pipe on the left (landmark grammar — not data)
    p.fill(tower);
    p.rect(cx - TANK_W / 2 - 10, tankTop + 40, 8, 10, 1);
    p.rect(cx - TANK_W / 2 - 8, tankTop + 48, 4, feetY - (tankTop + 48) - 8);
    p.fill(towerLite);
    p.ellipse(cx - TANK_W / 2 - 6, feetY - 6, 12, 6);

    // label plate under the feet — CLOSE only; it ends above the departures board's frame (ANCHORS.departures.y - 4)
    if (scene.detailTier === TIER.CLOSE) {
      p.fill(scene.paint(sig, C.paper)); p.rect(cx - 96, feetY + 6, 192, 40, 3);
      p.fill(255, 250, 240, 50); p.rect(cx - 96, feetY + 6, 192, 5, 3, 3, 0, 0);
      p.fill(scene.paint(sig, C.inkSoft)); useDisplay(p, 32); p.textAlign(p.CENTER, p.CENTER);
      p.text('SIGN INDEX', cx, feetY + 26);
    }

    p.pop();
    scene.hit(cx - 104, tankTop - ROOF_H - 16, 208, feetY + 48 - (tankTop - ROOF_H - 16), this);
  },

  legend(sig, scene) {
    const what = 'One number for Hollywood\u2019s health: LA film and TV jobs, shoot days, box office and the trade press\u2019s mood, rolled together.';
    if (!sig || sig.value == null) {
      return { title: 'SIGN index', text: `${what} There is not enough history yet to calculate it, so the tank is empty.`, sig: sig || null };
    }
    const n = Math.round(sig.value);
    const band = n < 40 ? 'below normal' : n < 60 ? 'about normal' : 'above normal';
    const vs = scene && typeof scene.sig === 'function' ? scene.sig('sign_index_vs2019') : null;
    const text = `${what} It reads ${n} out of 100, ${band}: 50 means everything is at its usual level for the past couple of years.` +
      ' The tank fills to the number.' +
      (vs && vs.value != null ? ` Measured against 2019 instead, it would read ${Math.round(vs.value)}.` : '');
    return { title: `SIGN index: ${n} of 100`, text, sig };
  },
};

function leg(p, x1, y1, x2, y2, w) {
  p.beginShape();
  p.vertex(x1 - w / 2, y1); p.vertex(x1 + w / 2, y1); p.vertex(x2 + w / 2 + 1, y2); p.vertex(x2 - w / 2 - 1, y2);
  p.endShape(p.CLOSE);
}

function rgb(hex) {
  const c = hex.replace('#', '');
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}
function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  const h = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(A[0] + (B[0] - A[0]) * t)}${h(A[1] + (B[1] - A[1]) * t)}${h(A[2] + (B[2] - A[2]) * t)}`;
}
