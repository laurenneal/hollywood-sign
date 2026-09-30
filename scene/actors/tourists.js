// Tourists on the star walk = Wikipedia film/TV attention — DEFERRED (method.json v0.3).
// Walk stays empty with a short on-plaque note even if attention* rows exist in signals.json.
// When Attention is redefined later, restore population() from the attention percentile and drop DEFERRED.

import { useDisplay } from '../fonts.js';
import { TIER } from '../detail.js';

const DEFERRED = true;            // locked: do not claim tourists / attention as live
const STARS = 9, STAR_X0 = 40, STAR_PITCH = 66, STAR_DY = 44, STAR_R = 18;

export default {
  id: 'tourists',
  signal: 'attention',
  district: 'gate',
  layer: 'mid',
  tourists: [],
  cams: [],
  polished: 4,
  label: null,
  n: null,
  sig: null,
  daily: null,

  init(scene) {},

  update(sig, scene) {
    this.sig = sig;
    this.daily = scene.sig('attention_daily');
    this.tourists = [];
    this.cams = [];
    this.n = null;               // deferred: never populate from attention
    this.label = null;
    this.polished = 4;
  },

  draw(p, t, scene) {
    const W = scene.ANCHORS.starWalk;
    const C = scene.PALETTE;
    const tier = scene.detailTier;
    p.noStroke();
    // Quiet caption only at close zoom — omit at overview/district. It sits right of the boom barrier and its
    // counterweight, which lot.js swings out to gateMouth.x + 184.
    const pw = 280, ph = 34;
    const px = scene.ANCHORS.gateMouth.x + scene.ANCHORS.gateMouth.w + 70, py = W.y - 38;
    if (tier === TIER.CLOSE) {
      p.fill(26, 32, 34, 18);
      p.ellipse(px + pw / 2 + 1, py + ph + 3, pw * 0.8, 8);
      p.fill(C.panel);
      p.rect(px, py, pw, ph, 3);
      p.fill(255, 250, 240, 40);
      p.rect(px, py, pw, 4, 3, 3, 0, 0);
      p.fill(C.tower);
      useDisplay(p, 20);
      p.textAlign(p.LEFT, p.CENTER);
      p.text('Tourists: not hooked up yet', px + 12, py + ph / 2);
    }
    // unlit stars mark the walk at close zoom only (lot buffer also draws them when close)
    if (tier === TIER.CLOSE) {
      for (let i = 0; i < STARS; i++) {
        const sx = W.x + STAR_X0 + i * STAR_PITCH, sy = W.y + STAR_DY + 4;
        p.fill(C.stucco); star(p, sx, sy, STAR_R);
      }
    }
    if (tier === TIER.CLOSE) scene.hit(px, py, pw, ph, this, 'caption');
    scene.hit(W.x, W.y, W.w, W.h, this, 'walk');
  },

  legend() {
    return {
      title: 'Tourists on the star walk',
      text: 'Not hooked up yet. The star walk will fill with tourists once the lot measures how much attention movies and shows get online.',
      sig: null,
      deferred: true,
    };
  },
};

function star(p, cx, cy, r) {
  p.beginShape();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    p.vertex(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  p.endShape(p.CLOSE);
}

void DEFERRED;
