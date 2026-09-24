// The Fair Play Films van = the SIGN index (sign_index). A small white van with a teal stripe and "FPF" on the side,
// hidden somewhere new every day: the spot is picked from a fixed list of parking places across the lot by the
// scene's child RNG plus the index value, so the same JSON hides it in the same place. None of the spots sit on text.
// Front layer, so it can park in any district. Hover it and the legend explains the whole page in one sentence.

import { periodLabel, provenance } from '../scale.js';
import { hashString } from '../rng.js';
import { useDisplay } from '../fonts.js';

const VAN_W = 104, VAN_H = 52;

// candidate parking spots (top-left of the van body), derived from the district rects and anchors so they follow
// the layout; each one was checked against the lot's labels and building text (district labels, stage numbers,
// UNION HALL, FILM OFFICE, COFFEE, THEATER, NEWS, and the windows actor's no-data line under the block)
function spots(D, A) {
  const stageW = A.stageSize.w, stageH = A.stageSize.h;
  return [
    { name: 'behind Stage 6',                      x: D.stages.x + 20 + 5 * (stageW + A.stageGap) + 30, y: D.stages.y + 20 },
    { name: 'in the aisle between the stage rows', x: D.stages.x + 190,                                  y: A.stageRows[0].y + stageH + 10 },
    { name: 'below the bottom row of stages',      x: D.stages.x + 640,                                  y: A.stageRows[1].y + stageH + 30 },
    { name: 'parked on Backlot Street',            x: A.sidewalk.x + 20,                                 y: A.sidewalk.y + A.sidewalk.h + 10 },
    { name: 'beside the coffee cart',              x: A.coffeeCart.x + A.coffeeCart.w + 15,              y: A.coffeeCart.y + 25 },
    { name: 'beside the departures board',         x: D.gate.x + 60,                                     y: A.departures.y + 70 },
    { name: 'at the back of the truck lane',       x: A.truckLane.x + A.truckLane.w - 50,                y: A.truckLane.y + 6 },
    { name: 'on the star walk',                    x: A.gateMouth.x + A.gateMouth.w + 28,                y: A.starWalk.y + 46 },   // clear of the gate pillar (16 px past the mouth) even with jitter and the headlight glow
    { name: 'up on the hill by the water tower',   x: A.waterTower.x + 80,                               y: A.waterTower.y + 150 },
    { name: 'by the poster wall',                  x: A.posterWall.x + 180,                              y: A.posterWall.y + A.posterWall.h + 40 },
    { name: 'behind the newsstand',                x: A.newsstand.x + A.newsstand.w + 10,                y: A.newsstand.y + 20 },
    { name: 'on the street run',                   x: A.streetRun.x + 240,                               y: A.streetRun.y + 70 },
    { name: 'behind the apartment block',          x: A.apartment.x + 330,                               y: A.apartment.y + A.apartment.h + 40 },
    { name: 'between the tent and the kiosk',      x: A.tent.x + A.tent.w + 8,                           y: A.tent.y + 50 },
    { name: 'on the lower lawn of the park',       x: D.park.x + 220,                                    y: D.park.y + 490 },
  ];
}

export default {
  id: 'waldo',
  signal: 'sign_index',
  district: 'boulevard',
  layer: 'front',
  spot: null,
  nSpots: 0,
  x: 0, y: 0, dir: 1, phase: 0,
  sig: null,

  // if signals.json never loaded, update() never ran; park from the date alone so the van and its hover region still exist
  init(scene) { if (!this.spot) this.update(null, scene); },

  // called on every signals.json load; the spot comes from the child RNG mixed with the index value (or the date when the index is null)
  update(sig, scene) {
    const rng = scene.childRng('waldo');
    this.sig = sig;
    const list = spots(scene.DISTRICTS, scene.ANCHORS);
    const n = list.length;
    this.nSpots = n;
    let k = Math.floor(rng() * n);
    if (sig && sig.value != null) k = (k + Math.round(Math.abs(sig.value))) % n;
    else k = (k + (hashString(String(scene.today || '')) % n)) % n;
    this.spot = list[k];
    // a few pixels of jitter inside the spot so the same place still looks parked, not stamped
    this.x = this.spot.x + Math.floor(rng() * 7) - 3;
    this.y = this.spot.y + Math.floor(rng() * 5) - 2;
    this.dir = rng() < 0.5 ? -1 : 1;
    this.phase = rng() * Math.PI * 2;
  },

  draw(p, t, scene) {
    if (!this.spot) return;
    const C = scene.PALETTE;
    const sig = this.sig;
    const bob = Math.sin(t * 2 + this.phase) * 0.8;
    const x = this.x, y = this.y + bob, d = this.dir;
    const body = scene.paint(sig, C.truck);
    const stripe = scene.paint(sig, C.tower);
    const cabW = 24;
    const cabX = d > 0 ? x + VAN_W - cabW : x;          // the cab is at the front
    const boxX = d > 0 ? x : x + cabW;                  // the cargo box is the rest

    p.noStroke();
    // shadow, body, cab
    p.fill(26, 32, 34, 42); p.ellipse(x + VAN_W / 2 + 2, this.y + VAN_H + 4, VAN_W + 6, 9);
    p.fill(body); p.rect(x, y, VAN_W, VAN_H, 4);
    p.fill(C.truckCab); p.rect(cabX, y + 1, cabW, VAN_H - 2, d > 0 ? 4 : 2);
    // windshield and side window
    p.fill(C.windowOff);
    p.rect(d > 0 ? cabX + cabW - 10 : cabX + 1, y + 6, 8, 14, 1);
    p.rect(d > 0 ? cabX + 2 : cabX + 12, y + 7, 8, 12, 1);
    // side mirror
    p.fill(C.inkSoft);
    p.rect(d > 0 ? cabX + cabW : cabX - 3, y + 8, 3, 7, 1);
    // teal stripe along the cargo box
    p.fill(stripe); p.rect(boxX + 2, y + 22, VAN_W - cabW - 4, 7);
    // FPF on the side
    p.fill(C.ink); useDisplay(p, 32); p.textAlign(p.CENTER, p.CENTER);
    p.text('FPF', boxX + (VAN_W - cabW) / 2, y + 14);
    p.textAlign(p.LEFT, p.TOP);
    // wheels
    p.fill(C.ink);
    p.ellipse(x + 16, y + VAN_H, 15, 15); p.ellipse(x + VAN_W - 16, y + VAN_H, 15, 15);
    p.fill(C.stale); p.ellipse(x + 16, y + VAN_H, 6, 6); p.ellipse(x + VAN_W - 16, y + VAN_H, 6, 6);
    // headlight, glowing at night
    const hx = d > 0 ? x + VAN_W - 1 : x + 1;
    if (scene.isNight) { p.fill(241, 199, 106, 80); p.ellipse(hx, y + 22, 18, 14); }
    p.fill(C.windowWarm); p.ellipse(hx, y + 22, 5, 5);

    scene.hit(x - 4, this.y - 6, VAN_W + 8, VAN_H + 16, this);
  },

  legend(sig, scene) {
    const seed = scene && scene.seed != null ? (scene.seed >>> 0).toString(16) : '?';
    const where = this.spot ? ` Parked ${this.spot.name}.` : '';
    let idx;
    if (sig && sig.value != null) {
      const when = sig.period ? `, ${periodLabel(sig)}` : '';
      idx = `SIGN index ${Math.round(sig.value)}${sig.label ? ` (${sig.label})` : ''}${when}.` +
            ` Spot picked from ${this.nSpots} by seed + index.`;
    } else {
      idx = 'Index not ready yet — van seeded from the date.';
    }
    return {
      title: 'Found it.',
      text: `Fair Play Films van (seed ${seed}).${where} ${idx}` +
            ' Tap or hover over anything for its number, or open #.' +
            ' Fair Play: transparency and access for indie filmmakers.',
      link: { href: 'https://fairplayfilms.com/', label: 'fairplayfilms.com' },
      source: sig ? provenance(sig) : 'sign_index: not loaded',
    };
  },
};
