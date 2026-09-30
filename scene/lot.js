// The fixed lot: hills, roads, twelve stages, union hall, film office, gate, theater,
// apartment block, park. Drawn once into an offscreen buffer. Nothing here is data-driven;
// actors draw the populations on top. No real studio marks. No sign on the hill.
//
 // Illustrated visitor-map architecture — shallow roof/side planes, upper-left light,
 // contact shadows, procedural materials, varied stage silhouettes, Bezier hills.
 // Construction recipes: docs/art/recipes.md

import { W, H, DISTRICTS as D, ANCHORS as A } from './districts.js';
import { PALETTE as C } from './palette.js';
import { material, stampMaterial } from './materials.js';
import { useDisplay, useMono } from './fonts.js';
import { TIER } from './detail.js';

// Upper-left light → shadow falls down-right. Side plane on the right of each volume.
// Depth exaggerated enough to read at phone district zoom (~1.8× fit).
const LIGHT = { side: 22, roofLift: 26, shadowOx: 14, shadowOy: 10 };

// silence unused — mono reserved for crawl faces on actors
void useMono;

export function drawLot(g, scene, p, opts = {}) {
  const night = !!opts.night;
  const tier = opts.tier == null ? TIER.DISTRICT : opts.tier;
  const overview = tier === TIER.OVERVIEW;
  const close = tier === TIER.CLOSE;
  g.noStroke();

  // ---- materials (baked once on the main sketch; Graphics cannot nest createGraphics)
  const host = p || g;
  const groundHex = night ? C.groundNight : C.ground;
  const hillHex = night ? C.hillNight : C.hill;
  const hillDkHex = night ? C.hillNightDk : C.hillDk;
  const grassHex = night ? C.hillNight : C.grass;
  const matPaper = material(host, 'paper', groundHex, { contrast: 0.14 });
  const matStucco = material(host, 'stucco', C.stucco, { contrast: 0.2 });
  const matStage = material(host, 'stucco', night ? C.stageWallNight : C.stageWall, { contrast: 0.16 });
  const matAsphalt = material(host, 'asphalt', C.asphalt, { contrast: 0.22 });
  const matHill = material(host, 'hill', hillHex, { contrast: 0.12, sz: 160 });
  const matGrass = material(host, 'grass', grassHex, { contrast: 0.16, sz: 128 });
  const matMetal = material(host, 'metal', C.metal, { contrast: 0.2, sz: 96 });
  const matPaperDark = material(host, 'stucco', C.paperDark, { contrast: 0.14 });
  const matBlock = material(host, 'brick', C.blockWall, { contrast: 0.12, sz: 128 });
  const matCinema = material(host, 'stucco', C.cinemaWall, { contrast: 0.12 });

  // ground
  g.fill(groundHex);
  g.rect(0, D.sky.h, W, H - D.sky.h);
  stampMaterial(g, matPaper, 0, D.sky.h, W, H - D.sky.h, night ? 40 : 55);

  // ---- hills: Bezier ridges (quiet California backdrop for the tower)
  drawHills(g, matHill, hillHex, hillDkHex, night);

  // roads (quieter mid-lot — fewer lane dashes on the long verticals)
  road(g, matAsphalt, 0, 915, W, 34, { dashes: true });
  road(g, matAsphalt, 1100, 450, 34, 1090, { dashes: false, quiet: true });
  road(g, matAsphalt, 1710, 450, 34, 460, { dashes: false, quiet: true });
  road(g, matAsphalt, 1400, 950, 34, 590, { dashes: false, quiet: true });
  road(g, matAsphalt, 1900, 950, 34, 590, { dashes: false, quiet: true });
  // decorative manhole covers (not data) — omit at overview
  if (!overview) {
    g.fill(C.asphaltDk);
    for (const [mx, my] of [[420, 928], [980, 928], [1180, 720], [1180, 1100], [1480, 1100], [1980, 1100], [640, 928], [1320, 960], [1750, 1120]]) {
      g.ellipse(mx, my, 42, 24);
      g.noFill(); g.stroke(C.laneMark); g.strokeWeight(2.6);
      g.ellipse(mx, my, 24, 14);
      g.noStroke(); g.fill(C.asphaltDk);
    }
  }
  // crosswalks at gate mouth + cinema street
  crosswalk(g, A.gateMouth.x - 8, 900, A.gateMouth.w + 16, 28, true);
  crosswalk(g, A.theater.x + 40, A.streetRun.y + 30, 120, 80, false);

  // dirt berm at the hill foot behind Soundstage Row (drawn before stages occlude)
  g.fill(night ? C.hillNightDk : mixHex(C.ground, C.hillDk, 0.35));
  g.ellipse(D.stages.x + 200, A.stageRows[0].y - 36, 360, 34);
  g.ellipse(D.stages.x + 700, A.stageRows[0].y - 32, 400, 30);
  g.ellipse(D.stages.x + 450, A.stageRows[0].y - 28, 240, 22);
  g.ellipse(D.stages.x + 920, A.stageRows[0].y - 30, 180, 18);

  // ---- Soundstage Row
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 6; i++) {
      const x = D.stages.x + 20 + i * (A.stageSize.w + A.stageGap);
      const y = A.stageRows[r].y;
      const n = i + 1 + r * 6;
      const profile = (n % 3 === 0) ? 'saw' : (n % 2 === 0) ? 'monitor' : 'flat';
      stage(g, matStage, matMetal, x, y, A.stageSize.w, A.stageSize.h, n, profile, night);
    }
  }
  // No loose floor props (C-stands, cones, cable runs) on the aprons: the crews carry their own gear, and the
  // lanes in front of the doors belong to them and to the lit stages' trucks.

  // soft aisle shade between the two stage rows (depth cue at full-lot)
  {
    const y0 = A.stageRows[0].y + A.stageSize.h + 14;
    const y1 = A.stageRows[1].y - 6;
    if (y1 > y0) {
      g.fill(26, 32, 34, night ? 36 : 20);
      g.rect(D.stages.x + 16, y0, D.stages.w - 32, Math.min(36, y1 - y0));
    }
  }
  // ---- Backlot Street
  // The hall's front carries two data signs: picket.js letters the red fascia under the name, and pink_slips.js hangs
  // its board right of the door. benches.js seats its people along the curb below the sidewalk, not against the walls.
  const u = A.unionHall;
  volume(g, matStucco, u.x, u.y, u.w, u.h, C.stucco, C.roof);
  // 28px keeps the caps above the fascia (u.y + 36)
  g.fill(C.ink); useDisplay(g, 28);
  g.textAlign(g.LEFT, g.TOP);
  g.text('UNION HALL', u.x + 12, u.y + 4);
  g.fill(C.lamp); g.rect(u.x + 8, u.y + 36, u.w - 16, 34, 2);
  g.fill(mixHex(C.lamp, C.ink, 0.25)); g.rect(u.x + 8, u.y + 66, u.w - 16, 4, 0, 0, 2, 2);
  g.fill(C.stuccoDk); g.rect(u.x + 16, u.y + u.h - 96, 68, 96);
  // door light strip + handle
  g.fill(255, 250, 240, 50); g.rect(u.x + 16, u.y + u.h - 96, 7, 96);
  g.fill(C.inkSoft); g.ellipse(u.x + 74, u.y + u.h - 46, 10, 10);
  // doormat + transom window above the door
  g.fill(C.asphaltDk); g.rect(u.x + 14, u.y + u.h - 4, 72, 10);
  g.fill(C.windowWarm); g.rect(u.x + 20, u.y + u.h - 118, 58, 20, 1);
  g.stroke(C.stuccoDk); g.strokeWeight(1.4);
  g.line(u.x + 49, u.y + u.h - 118, u.x + 49, u.y + u.h - 98);
  g.noStroke();

  const f = A.filmOffice;
  volume(g, matPaperDark, f.x, f.y, f.w, f.h, C.paperDark, C.tower, {
    sideColor: C.towerLite,
  });
  g.fill(C.ink); useDisplay(g, 28); g.text('FILM OFFICE', f.x + 12, f.y + 4);
  // brass nameplate rail under the lettering
  const railW = Math.round(g.textWidth('FILM OFFICE')) || 118;
  g.fill(C.stuccoDk); g.rect(f.x + 12, f.y + 32, railW, 3);
  g.fill(mixHex(C.stucco, C.windowWarm, 0.35)); g.rect(f.x + 12, f.y + 32, railW, 1);
  g.fill(C.windowWarm); g.rect(f.x + 30, f.y + 50, 160, 70, 2);
  g.fill(C.inkSoft); g.rect(f.x + 30, f.y + 50, 160, 8);
  // window muntins
  g.stroke(C.paperDark); g.strokeWeight(1.5);
  g.line(f.x + 110, f.y + 58, f.x + 110, f.y + 120);
  g.line(f.x + 30, f.y + 85, f.x + 190, f.y + 85);
  g.noStroke();
  // No street door: the coffee cart stands across the lower left of this front and film_office.js hangs its
  // LAST ROUND sign on the lower right, so the service window is the way in.
  // flagpole
  g.fill(C.inkSoft); g.rect(f.x + f.w - 20, f.y - 52, 4, 60);
  g.fill(C.tower); g.triangle(f.x + f.w - 16, f.y - 52, f.x + f.w - 16, f.y - 28, f.x + f.w + 16, f.y - 40);

  const cc = A.coffeeCart;
  contactShadow(g, cc.x, cc.y, cc.w, cc.h);
  g.fill(C.stuccoDk); g.rect(cc.x, cc.y, cc.w, cc.h, 6);
  // striped umbrella canopy (reads at street zoom)
  g.fill(C.lamp); g.rect(cc.x - 16, cc.y - 32, cc.w + 32, 28, 3);
  g.fill(C.paper); g.rect(cc.x - 10, cc.y - 24, 28, 16); g.rect(cc.x + 30, cc.y - 24, 28, 16);
  g.fill(C.windowWarm); g.rect(cc.x + 6, cc.y + 4, cc.w - 12, 36, 2);
  g.fill(C.ink); useDisplay(g, 22); g.text('COFFEE', cc.x + 9, cc.y + 18);
  // cups on the ledge
  g.fill(C.panel); g.ellipse(cc.x + 22, cc.y - 6, 28, 30); g.ellipse(cc.x + 54, cc.y - 6, 28, 30);
  g.fill(C.inkSoft); g.rect(cc.x + 10, cc.y - 18, 24, 12); g.rect(cc.x + 42, cc.y - 18, 24, 12);
  // static steam wisps above the cups (lot buffer — decorative)
  g.noFill(); g.stroke(255, 250, 240, 70); g.strokeWeight(1.8);
  g.bezier(cc.x + 22, cc.y - 8, cc.x + 18, cc.y - 20, cc.x + 26, cc.y - 28, cc.x + 20, cc.y - 36);
  g.bezier(cc.x + 42, cc.y - 8, cc.x + 46, cc.y - 22, cc.x + 36, cc.y - 30, cc.x + 44, cc.y - 38);
  g.noStroke();

  // the sidewalk stays bare: it is the picket line's lane
  g.fill(C.curb); g.rect(A.sidewalk.x, A.sidewalk.y, A.sidewalk.w, A.sidewalk.h);
  stampMaterial(g, matPaper, A.sidewalk.x, A.sidewalk.y, A.sidewalk.w, A.sidewalk.h, 28);

  // ---- The Gate
  g.fill(C.stuccoDk); g.rect(D.gate.x, 700, D.gate.w, 24);
  stampMaterial(g, matStucco, D.gate.x, 700, D.gate.w, 24, 40);
  // fence lattice left/right of the mouth (quiet geometry, not a real studio mark)
  const gm = A.gateMouth;
  fenceLattice(g, D.gate.x + 20, 700, Math.max(40, gm.x - D.gate.x - 40), 24);
  fenceLattice(g, gm.x + gm.w + 40, 700, 220, 24);
  contactShadow(g, gm.x - 16, gm.y - 60, gm.w + 32, gm.h + 60);
  g.fill(C.asphaltDk); g.rect(gm.x, gm.y - 40, gm.w, gm.h + 40);
  pillar(g, gm.x - 22, gm.y - 60, 22, 200, C.stucco, C.roof);
  pillar(g, gm.x + gm.w, gm.y - 60, 22, 200, C.stucco, C.roof);
  gateRoof(g, { night });
  // guard booth tucked by the left pillar
  g.fill(C.stucco); g.rect(gm.x - 66, gm.y + 28, 50, 64, 2);
  stampMaterial(g, matStucco, gm.x - 66, gm.y + 28, 50, 64, 40);
  g.fill(C.roof); g.rect(gm.x - 70, gm.y + 20, 58, 14, 2);
  g.fill(C.windowWarm); g.rect(gm.x - 56, gm.y + 38, 34, 22, 1);
  g.stroke(C.stuccoDk); g.strokeWeight(1.2);
  g.line(gm.x - 39, gm.y + 38, gm.x - 39, gm.y + 60);
  g.line(gm.x - 56, gm.y + 49, gm.x - 22, gm.y + 49);
  g.noStroke();
  g.fill(C.inkSoft); g.rect(gm.x - 48, gm.y + 64, 16, 22);
  // short antenna on the booth roof
  g.fill(C.metalDk); g.rect(gm.x - 44, gm.y + 6, 3, 18);
  g.fill(C.lamp); g.ellipse(gm.x - 42.5, gm.y + 4, 8, 8);
  // raised boom barrier arm (decorative — queue length still from trucks)
  g.fill(C.inkSoft);
  g.rect(gm.x + 2, gm.y + 18, 22, 48, 1);
  g.fill(C.lamp);
  g.quad(gm.x + 20, gm.y + 22, gm.x + 20, gm.y + 50, gm.x + 172, gm.y + 16, gm.x + 172, gm.y - 8);
  g.fill(C.paper);
  for (const [a, b] of [[30, 22], [56, 18], [82, 14], [108, 10], [132, 6], [152, 2]]) {
    g.quad(gm.x + a, gm.y + b, gm.x + a, gm.y + b + 18, gm.x + a + 20, gm.y + b + 8, gm.x + a + 20, gm.y + b - 10);
  }
  // boom tip counterweight
  g.fill(C.metalDk);
  g.rect(gm.x + 168, gm.y - 12, 16, 32, 2);
  // gate mouth bollards (decorative)
  g.fill(C.inkSoft);
  g.rect(gm.x + 8, gm.y + gm.h - 8, 14, 28, 2);
  g.rect(gm.x + gm.w - 22, gm.y + gm.h - 8, 14, 28, 2);
  g.fill(C.lamp); g.ellipse(gm.x + 15, gm.y + gm.h - 8, 16, 10); g.ellipse(gm.x + gm.w - 15, gm.y + gm.h - 8, 16, 10);
  // night booth lamp spill
  if (night) {
    g.fill(241, 199, 106, 50);
    g.ellipse(gm.x - 42, gm.y + 36, 68, 50);
  }
  // truck-lane stall ticks (decorative — queue length still from trucks actor)
  {
    const lane = A.truckLane;
    g.fill(C.laneMark);
    for (let i = 0; i < 10; i++) {
      const sx = lane.x + 40 + i * 52;
      g.rect(sx, lane.y + lane.h - 14, 18, 3);
      g.rect(sx, lane.y + 10, 18, 3);
    }
  }
  const dep = A.departures;
  if (close) {
    g.fill(C.ink); g.rect(dep.x, dep.y, dep.w, dep.h, 4);
    g.fill(43, 105, 99, 40);
    for (let i = 0; i < 6; i++) g.rect(dep.x + 8, dep.y + 18 + i * 24, dep.w - 16, 16, 1);
    g.noFill(); g.stroke(C.towerLite); g.strokeWeight(3);
    g.rect(dep.x - 4, dep.y - 4, dep.w + 8, dep.h + 8, 5);
    g.noStroke();
  } else {
    // Quiet board silhouette until close zoom
    g.fill(C.ink); g.rect(dep.x + 8, dep.y + 8, Math.min(220, dep.w - 16), 88, 4);
    g.noFill(); g.stroke(C.towerLite); g.strokeWeight(2);
    g.rect(dep.x + 4, dep.y + 4, Math.min(228, dep.w - 8), 96, 5);
    g.noStroke();
  }
  g.fill(C.curb); g.rect(A.starWalk.x, A.starWalk.y, A.starWalk.w, A.starWalk.h);
  stampMaterial(g, matPaper, A.starWalk.x, A.starWalk.y, A.starWalk.w, A.starWalk.h, 22);
  // curb lip around the star walk (all four edges)
  g.fill(C.stuccoDk);
  g.rect(A.starWalk.x - 4, A.starWalk.y - 4, A.starWalk.w + 8, 4);
  g.rect(A.starWalk.x - 4, A.starWalk.y + A.starWalk.h, A.starWalk.w + 8, 4);
  g.rect(A.starWalk.x - 4, A.starWalk.y, 4, A.starWalk.h);
  g.rect(A.starWalk.x + A.starWalk.w, A.starWalk.y, 4, A.starWalk.h);
  // Stars at every zoom (44-unit discs read even on the phone's gate view), so the walk is a star walk, not an empty frame
  for (let i = 0; i < 9; i++) {
    const sx = A.starWalk.x + 40 + i * 66, sy = A.starWalk.y + 44;
    g.fill(C.stucco); g.ellipse(sx, sy, 44, 44);
    g.fill(C.stuccoDk); star(g, sx, sy, 28);
  }

  // ---- The Boulevard: cinema as landmark
  const th = A.theater;
  cinema(g, matCinema, th.x, th.y, th.w, th.h, night);
  // marquee box (title from marquee actor)
  g.fill(C.ink); g.rect(A.marquee.x, A.marquee.y, A.marquee.w, A.marquee.h, 4);
  // soft warm glow behind bulbs (architecture — title stays actor-driven)
  g.fill(241, 199, 106, night ? 68 : 30);
  g.ellipse(A.marquee.x + A.marquee.w / 2, A.marquee.y + A.marquee.h / 2, A.marquee.w + 56, A.marquee.h + 40);
  g.fill(C.windowWarm);
  for (let i = 0; i < 22; i++) {
    g.ellipse(A.marquee.x + 16 + i * 21, A.marquee.y + 8, 14, 14);
    g.ellipse(A.marquee.x + 16 + i * 21, A.marquee.y + A.marquee.h - 8, 14, 14);
  }
  // corner bulbs a touch brighter
  g.fill(241, 199, 106, night ? 200 : 140);
  g.ellipse(A.marquee.x + 16, A.marquee.y + 8, 16, 16);
  g.ellipse(A.marquee.x + A.marquee.w - 16, A.marquee.y + 8, 16, 16);
  g.ellipse(A.marquee.x + 16, A.marquee.y + A.marquee.h - 8, 16, 16);
  g.ellipse(A.marquee.x + A.marquee.w - 16, A.marquee.y + A.marquee.h - 8, 16, 16);
  // canopy + ticket pocket under the marquee
  g.fill(C.lamp);
  g.quad(th.x + 28, th.y + 160, th.x + th.w - 28, th.y + 160, th.x + th.w - 16, th.y + 206, th.x + 16, th.y + 206);
  // canopy fascia lip
  g.fill(C.roofDk);
  g.rect(th.x + 16, th.y + 200, th.w - 32, 8);
  // canopy underside ribs (thicker — reads at boulevard zoom)
  g.fill(mixHex(C.roofDk, C.ink, 0.15));
  for (let i = 0; i < 8; i++) {
    const u = i / 7;
    const x0 = th.x + 36 + u * (th.w - 72);
    const x1 = th.x + 22 + u * (th.w - 44);
    g.quad(x0 - 4, th.y + 160, x0 + 4, th.y + 160, x1 + 4, th.y + 206, x1 - 4, th.y + 206);
  }
  g.fill(C.ink);
  g.rect(th.x + 190, th.y + 190, 140, 46, 2);
  g.fill(C.paper); useDisplay(g, 34); g.textAlign(g.CENTER, g.CENTER);
  g.text('TICKETS', th.x + 260, th.y + 213);
  g.textAlign(g.LEFT, g.TOP);
  g.fill(C.stuccoDk); g.rect(th.x + 186, th.y + 226, 148, 78, 2);
  g.fill(C.windowWarm); g.rect(th.x + 200, th.y + 234, 50, 60); g.rect(th.x + 268, th.y + 234, 50, 60);
  // glass muntins on box office
  g.stroke(C.stuccoDk); g.strokeWeight(1.2);
  g.line(th.x + 225, th.y + 234, th.x + 225, th.y + 294);
  g.line(th.x + 293, th.y + 234, th.x + 293, th.y + 294);
  g.line(th.x + 200, th.y + 264, th.x + 250, th.y + 264);
  g.line(th.x + 268, th.y + 264, th.x + 318, th.y + 264);
  g.noStroke();
  // terrazzo steps + vermilion carpet runner up the center
  g.fill(C.curb); g.rect(th.x + 160, th.y + th.h - 8, 200, 10);
  g.fill(C.paperDark); g.rect(th.x + 170, th.y + th.h + 2, 180, 8);
  g.fill(C.lamp);
  g.rect(th.x + 238, th.y + 294, 44, 24);
  g.rect(th.x + 244, th.y + th.h + 2, 32, 14);
  g.fill(mixHex(C.lamp, C.ink, 0.15));
  g.rect(th.x + 238, th.y + 294, 5, 24);
  g.rect(th.x + 277, th.y + 294, 5, 24);
  // soft carpet edge highlight
  g.fill(241, 199, 106, night ? 40 : 25);
  g.rect(th.x + 246, th.y + 296, 28, 3);
  // flanking lobby poster cases (blank mats — no titles)
  for (const ox of [36, th.w - 108]) {
    g.fill(C.ink); g.rect(th.x + ox - 4, th.y + 188, 70, 112, 2);
    g.fill(C.panel); g.rect(th.x + ox, th.y + 192, 62, 104, 1);
    g.fill(C.poster[ox < 100 ? 0 : 1]); g.rect(th.x + ox + 5, th.y + 198, 52, 78, 1);
    // quiet case mats so Lot Cinema lettering stays primary
    g.fill(26, 32, 34, 70); g.rect(th.x + ox + 5, th.y + 198, 52, 78, 1);
    g.fill(C.inkSoft); g.rect(th.x + ox + 8, th.y + 282, 46, 8, 1);
  }
  // in the band between the marquee (ends th.y + 84) and the ticket canopy (th.y + 160), in red so it reads on the cream wall
  g.fill(C.lamp); useDisplay(g, 42); g.textAlign(g.CENTER, g.TOP);
  g.text('LOT CINEMA', th.x + th.w / 2, th.y + 100);
  g.textAlign(g.LEFT, g.TOP);

  // Poster wall: framed one-sheets with paper mats (no titles)
  const pw = A.posterWall;
  contactShadow(g, pw.x - 10, pw.y - 10, pw.w + 20, pw.h + 20);
  g.fill(C.stageWall); g.rect(pw.x - 10, pw.y - 10, pw.w + 20, pw.h + 20, 3);
  stampMaterial(g, matStage, pw.x - 10, pw.y - 10, pw.w + 20, pw.h + 20, 50);
  const cols = 6, rows = 4;
  const cellW = pw.w / cols, cellH = pw.h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = pw.x + c * cellW + 4, py = pw.y + r * cellH + 4;
      const hue = C.poster[(r * cols + c) % C.poster.length];
      g.fill(C.panel); g.rect(px, py, cellW - 8, cellH - 8, 2);
      // mat bevel
      g.fill(255, 250, 240, 50); g.rect(px + 1, py + 1, cellW - 10, 2);
      g.fill(26, 32, 34, 28); g.rect(px + 1, py + cellH - 11, cellW - 10, 2);
      g.fill(hue); g.rect(px + 4, py + 4, cellW - 16, cellH - 22, 1);
      // quiet the wall so Lot Cinema stays the boulevard landmark
      g.fill(26, 32, 34, 96); g.rect(px + 4, py + 4, cellW - 16, cellH - 22, 1);
      g.fill(26, 32, 34, 50); g.rect(px + 4, py + (cellH - 22) * 0.55 + 4, cellW - 16, (cellH - 22) * 0.45, 0, 0, 1, 1);
      g.fill(C.inkSoft); g.rect(px + 6, py + cellH - 16, cellW - 20, 5, 1);
    }
  }

  // Billboard posts + designed face plates (crawl text from actors/billboard.js)
  for (const b of A.billboards) {
    g.fill(26, 32, 34, 40);
    g.ellipse(b.x + b.w / 2 + 4, b.y + b.h + 72, 34, 12);
    g.fill(C.asphaltDk);
    g.rect(b.x + b.w / 2 - 8, b.y + b.h, 16, 74);
    g.fill(C.metalDk);
    g.rect(b.x + b.w / 2 - 12, b.y + b.h + 66, 24, 10, 1);
    g.fill(night ? '#2a3236' : '#1e2428');
    g.rect(b.x, b.y, b.w, b.h, 4);
    // LED scanline plate (kept quiet — cinema stays the boulevard landmark)
    g.fill(43, 105, 99, 18);
    for (let yy = b.y + 16; yy < b.y + b.h - 4; yy += 4) g.rect(b.x + 4, yy, b.w - 8, 1);
    g.fill(26, 32, 34, night ? 40 : 28);
    g.rect(b.x, b.y + 18, b.w, b.h - 18);
    g.noFill(); g.stroke(C.towerLite); g.strokeWeight(3);
    g.rect(b.x - 2, b.y - 2, b.w + 4, b.h + 4, 5);
    g.noStroke();
    // corner mounting bolts
    g.fill(C.metal);
    for (const [ox, oy] of [[4, 22], [b.w - 8, 22], [4, b.h - 8], [b.w - 8, b.h - 8]]) {
      g.ellipse(b.x + ox, b.y + oy, 5, 5);
    }
    g.fill(C.tower);
    g.rect(b.x, b.y, b.w, 34, 4, 4, 0, 0);
    g.fill(C.paper); useDisplay(g, 28); g.textAlign(g.LEFT, g.CENTER);
    g.text('TRADE', b.x + 12, b.y + 18);
    g.textAlign(g.LEFT, g.TOP);
  }

  const ns = A.newsstand;
  contactShadow(g, ns.x, ns.y, ns.w, ns.h);
  g.fill(C.stucco); g.rect(ns.x, ns.y, ns.w, ns.h, 4);
  g.fill(C.tower); g.rect(ns.x, ns.y - 18, ns.w, 18, 3);
  // rack shelves with newsprint edges (count remains actor-driven on the counter)
  g.fill(C.stuccoDk);
  for (let i = 0; i < 3; i++) g.rect(ns.x + 8, ns.y + 10 + i * 16, ns.w - 16, 5);
  g.fill('#f7f3e8');
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 4; j++) g.rect(ns.x + 12 + j * 20, ns.y + 0 + i * 16, 17, 13, 1);
  }
  // right of the counter, where the newsstand actor stacks papers (ns.x + 10 .. ns.x + 66)
  g.fill(C.ink); useDisplay(g, 28); g.text('NEWS', ns.x + 70, ns.y + ns.h - 34);
  road(g, matAsphalt, A.streetRun.x, A.streetRun.y + 30, A.streetRun.w, 80, { dashes: true });
  // thicker curb lips along the boulevard street (decorative — reads at phone zoom)
  g.fill(C.curb);
  g.rect(A.streetRun.x, A.streetRun.y + 22, A.streetRun.w, 8);
  g.rect(A.streetRun.x, A.streetRun.y + 108, A.streetRun.w, 8);
  // curb expansion joints along the boulevard street (decorative)
  g.fill(C.asphaltDk);
  for (let i = 0; i < 12; i++) {
    const jx = A.streetRun.x + 40 + i * 70;
    g.rect(jx, A.streetRun.y + 22, 3, 94);
  }
  // California palms along the far curb (decorative landscaping — not data): planted there, their crowns lean over
  // the road instead of the cinema front, the poster wall, the boards or the ticket line
  palm(g, A.streetRun.x + 500, A.streetRun.y + 156, 0.9, night);
  palm(g, A.streetRun.x + 980, A.streetRun.y + 156, 0.9, night);
  palm(g, A.streetRun.x + 1270, A.streetRun.y + 156, 0.9, night);
  // decorative boulevard street lamps (architecture — not FilmLA stage lamps), at the two ends of the frontage
  streetLamp(g, A.theater.x - 36, A.theater.y + A.theater.h - 4, night);
  streetLamp(g, A.newsstand.x + A.newsstand.w + 30, A.newsstand.y + A.newsstand.h - 4, night);

  // ---- Apartment Block: quieter shell (windows actor paints data)
  const ap = A.apartment;
  volume(g, matBlock, ap.x, ap.y, ap.w, ap.h, C.blockWall, C.roofSoft, {
    sideColor: C.blockSide,
  });
  // quiet roof parapet (secondary — low contrast)
  g.fill(mixHex(C.blockSide, C.ink, 0.18));
  g.rect(ap.x - 2, ap.y - 6, ap.w + 4, 5);
  g.fill(mixHex(C.blockWall, C.ink, 0.14));
  g.rect(ap.x + ap.w - 28, ap.y - 22, 14, 18, 1);
  g.fill(26, 32, 34, 18);
  for (let i = 1; i < 12; i++) g.rect(ap.x + i * (ap.w / 12) - 1, ap.y + 8, 2, ap.h - 16);
  // quiet fire-escape zig on the right side (secondary — low contrast)
  g.stroke(mixHex(C.blockSide, C.ink, 0.28)); g.strokeWeight(1.2);
  const fx = ap.x + ap.w - 10;
  for (let i = 0; i < 5; i++) {
    const y0 = ap.y + 24 + i * ((ap.h - 80) / 5);
    g.line(fx, y0, fx + 14, y0 + 10);
    g.line(fx + 14, y0 + 10, fx, y0 + 20);
  }
  g.noStroke();
  // quiet lobby canopy + door (low contrast — secondary district)
  g.fill(mixHex(C.blockSide, C.ink, 0.08));
  g.quad(ap.x + ap.w / 2 - 42, ap.y + ap.h - 74, ap.x + ap.w / 2 + 42, ap.y + ap.h - 74,
    ap.x + ap.w / 2 + 48, ap.y + ap.h - 56, ap.x + ap.w / 2 - 48, ap.y + ap.h - 56);
  g.fill(mixHex(C.blockWall, C.ink, 0.22));
  g.rect(ap.x + ap.w / 2 - 20, ap.y + ap.h - 56, 40, 56);
  g.fill(255, 250, 240, 20); g.rect(ap.x + ap.w / 2 - 20, ap.y + ap.h - 56, 5, 56);
  // quiet street trees in front of the block (secondary landscaping), on the pavement rather than the side roads
  // and clear of the van's spot behind the block
  tree(g, ap.x + 22, ap.y + ap.h + 22, 26, night);
  tree(g, ap.x + ap.w - 150, ap.y + ap.h + 22, 26, night);
  shrub(g, ap.x + 40, ap.y + ap.h + 8, 18, night);
  shrub(g, ap.x + ap.w - 60, ap.y + ap.h + 6, 16, night);

  // ---- The Park (secondary — path + layered canopies)
  drawPark(g, matGrass, grassHex, night);

  // Warm apron spill under stages (day soft / night stronger) — architecture only
  g.fill(241, 199, 106, night ? 36 : 14);
  g.ellipse(A.theater.x + A.theater.w / 2, A.theater.y + A.theater.h + 10, 320, 58);
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 6; i++) {
      const x = D.stages.x + 20 + i * (A.stageSize.w + A.stageGap) + A.stageSize.w / 2;
      const y = A.stageRows[r].y + A.stageSize.h;
      g.ellipse(x, y + 6, 62, 22);
    }
  }
  // Night wash on architecture/ground only (sky + weather actor stay above).
  if (night) {
    g.fill(29, 42, 58, 95);
    g.rect(0, D.sky.h, W, H - D.sky.h);
    g.fill(241, 199, 106, 30);
    g.ellipse(A.theater.x + A.theater.w / 2, A.theater.y + A.theater.h + 10, 320, 58);
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < 6; i++) {
        const x = D.stages.x + 20 + i * (A.stageSize.w + A.stageGap) + A.stageSize.w / 2;
        const y = A.stageRows[r].y + A.stageSize.h;
        g.ellipse(x, y + 6, 62, 22);
      }
    }
    // soft gate + film-office porch + boulevard service pools (architecture only)
    g.fill(241, 199, 106, 24);
    g.ellipse(A.gateMouth.x + A.gateMouth.w / 2, A.gateMouth.y + 20, 160, 40);
    g.ellipse(A.filmOffice.x + 70, A.filmOffice.y + A.filmOffice.h + 8, 120, 36);
    g.ellipse(A.coffeeCart.x + A.coffeeCart.w / 2, A.coffeeCart.y + A.coffeeCart.h + 6, 90, 28);
    g.ellipse(A.newsstand.x + A.newsstand.w / 2, A.newsstand.y + A.newsstand.h + 4, 100, 30);
    g.fill(241, 199, 106, 36);
    g.ellipse(A.theater.x + A.theater.w / 2, A.theater.y + A.theater.h + 24, 380, 72);
  }
}

/** Bezier hill ridges — same rough footprint as weather.js splash targets. */
function drawHills(g, matHill, hillHex, hillDkHex, night) {
  // far ridge
  g.fill(hillDkHex);
  g.beginShape();
  g.vertex(1200, 520);
  g.bezierVertex(1500, 400, 1800, 390, 2100, 430);
  g.bezierVertex(2300, 460, 2400, 500, 2400, 530);
  g.vertex(1200, 530);
  g.endShape(g.CLOSE);
  // main left ridge
  g.fill(hillHex);
  g.beginShape();
  g.vertex(0, 530);
  g.bezierVertex(200, 470, 480, 400, 780, 415);
  g.bezierVertex(1080, 430, 1280, 470, 1480, 520);
  g.vertex(1480, 540);
  g.vertex(0, 540);
  g.endShape(g.CLOSE);
  // main right / tower ridge
  g.beginShape();
  g.vertex(1100, 525);
  g.bezierVertex(1400, 430, 1700, 395, 2000, 410);
  g.bezierVertex(2250, 430, 2400, 480, 2400, 535);
  g.vertex(1100, 535);
  g.endShape(g.CLOSE);
  // near dark foothills
  g.fill(hillDkHex);
  g.beginShape();
  g.vertex(0, 535);
  g.bezierVertex(180, 500, 360, 485, 520, 495);
  g.bezierVertex(680, 510, 780, 530, 900, 545);
  g.vertex(0, 545);
  g.endShape(g.CLOSE);
  g.beginShape();
  g.vertex(1900, 540);
  g.bezierVertex(2050, 490, 2200, 480, 2400, 505);
  g.vertex(2400, 550);
  g.vertex(1900, 550);
  g.endShape(g.CLOSE);

  stampMaterial(g, matHill, 0, 360, W, 200, night ? 36 : 52);
  // ridge highlight (upper-left light)
  g.fill(255, 250, 240, night ? 16 : 36);
  g.beginShape();
  g.vertex(420, 430);
  g.bezierVertex(620, 410, 820, 415, 1000, 440);
  g.bezierVertex(820, 445, 620, 448, 420, 445);
  g.endShape(g.CLOSE);
  g.beginShape();
  g.vertex(1600, 415);
  g.bezierVertex(1800, 395, 2050, 400, 2250, 430);
  g.bezierVertex(2050, 435, 1800, 438, 1600, 430);
  g.endShape(g.CLOSE);
  // sparse chaparral scrub (deterministic dots — not data)
  g.fill(night ? C.hillNightDk : C.grassDk);
  const scrub = [
    [180, 510], [260, 505], [340, 518], [480, 500], [620, 512], [740, 520],
    [1280, 505], [1420, 490], [1580, 500], [1740, 485], [1920, 510], [2100, 498], [2280, 515],
    // denser scrub near the tower ridge foot
    [1680, 470], [1820, 465], [1960, 478], [2040, 488], [2180, 492], [2320, 505],
    [1500, 512], [1620, 518], [1760, 508], [1880, 522],
    [220, 525], [400, 508], [560, 522], [860, 530], [1360, 498], [2000, 505], [2220, 520],
    // near Soundstage Row berm
    [100, 500], [320, 495], [540, 505], [760, 498], [900, 515],
    // fill mid ridges (reads at full-lot without becoming a second city)
    [420, 490], [680, 498], [820, 508], [980, 492], [1100, 518],
    [1480, 478], [1640, 492], [1780, 480], [1900, 498], [2140, 510],
    [240, 530], [500, 528], [720, 532], [1240, 520], [2060, 528],
    // extra mid-ridge chaparral for denser skyline silhouette
    [300, 512], [450, 498], [590, 515], [850, 505], [1020, 510],
    [1320, 485], [1450, 500], [1550, 488], [1700, 502], [1850, 495],
    [1980, 515], [2120, 500], [2260, 508], [2350, 522],
    // denser foot scrub under the tower so the landmark sits in chaparral
    [1720, 455], [1800, 448], [1880, 460], [1940, 452], [2020, 468],
    [2100, 458], [2160, 472], [2240, 462], [2300, 478],
  ];
  for (const [sx, sy] of scrub) {
    g.ellipse(sx, sy, 22, 12);
    g.ellipse(sx + 10, sy - 4, 14, 8);
    g.ellipse(sx - 7, sy + 2, 11, 6);
  }
  // soft foot shadow
  g.fill(26, 32, 34, night ? 50 : 28);
  g.ellipse(700, 535, 1100, 36);
  g.ellipse(1900, 540, 1200, 40);
  // atmospheric haze band just above the ridges (reads as California air, not weather data)
  g.fill(255, 250, 240, night ? 10 : 22);
  g.rect(0, 360, W, 50);
  g.fill(255, 250, 240, night ? 6 : 14);
  g.rect(0, 400, W, 40);
}

function drawPark(g, matGrass, grassHex, night) {
  const px = D.park.x, py = D.park.y + 40, pw = D.park.w, ph = D.park.h - 40;
  g.fill(grassHex); g.rect(px, py, pw, ph, 30);
  stampMaterial(g, matGrass, px, py, pw, ph, night ? 38 : 58);
  // Dressing stays outside the tent, its queue lane and the kiosk (A.tent / A.tentQueue / A.kiosk)
  // and clear of waldo.js's two park spots on the lower lawn, so nothing peeks out between the figures.
  const Q = A.tentQueue;
  const gateX = px + 200;   // gap in the lower fence where the path comes in
  g.drawingContext.save();
  g.drawingContext.beginPath(); g.drawingContext.rect(px, py, pw, ph); g.drawingContext.clip();
  g.noFill();
  g.stroke(26, 32, 34, night ? 30 : 22); g.strokeWeight(30);
  g.bezier(gateX, py + ph + 20, gateX + 5, py + ph - 70, Q.x + 14, py + ph - 110, Q.x + 6, Q.y + 72);
  g.stroke(C.curb); g.strokeWeight(24);
  g.bezier(gateX, py + ph + 20, gateX + 5, py + ph - 70, Q.x + 14, py + ph - 110, Q.x + 6, Q.y + 72);
  g.noStroke();
  g.drawingContext.restore();
  // trees in the corners the tent, queue and kiosk leave free (decorative; not data)
  tree(g, px + 28, py + 52, 36, night);
  tree(g, px + 232, py + 62, 30, night);
  tree(g, px + 38, py + 318, 40, night);
  shrub(g, px + 140, py + 18, 18, night);
  shrub(g, px + 150, py + ph - 34, 18, night);
  shrub(g, px + 262, py + ph - 32, 20, night);
  // post-and-rail along the lower edge, open where the path comes in
  g.fill(C.stuccoDk);
  const posts = [px + 30, px + 100, gateX - 26, gateX + 22, px + 310, px + pw - 30];
  for (const rx of posts) g.rect(rx, py + ph - 22, 5, 20);
  g.rect(px + 30, py + ph - 14, gateX - 26 - (px + 30), 4);
  g.rect(gateX + 22, py + ph - 14, px + pw - 30 - (gateX + 22) + 5, 4);
  // one bench below the queue lane's right end
  const bx = px + 310, by = py + 402;
  g.fill(26, 32, 34, 30); g.ellipse(bx + 38, by + 26, 78, 14);
  g.fill(C.stuccoDk); g.rect(bx, by + 10, 76, 10, 1);
  g.rect(bx + 6, by + 20, 8, 16); g.rect(bx + 58, by + 20, 8, 16);
  g.fill(C.stucco); g.rect(bx + 2, by, 72, 9, 1); // backrest
  // shorter path lamps than the boulevard's (decorative — not FilmLA stage lamps)
  streetLamp(g, Q.x - 36, Q.y + 176, night, 0.6);
  streetLamp(g, px + 380, py + 362, night, 0.6);
  const k = A.kiosk;
  contactShadow(g, k.x, k.y, k.w, k.h);
  g.fill(C.paperDark); g.rect(k.x, k.y, k.w, k.h, 6);
  g.fill(C.tower); g.rect(k.x, k.y - 18, k.w, 18, 3);
  // plain sign panel: globe.js letters GLOBAL / BOX OFFICE on it and prints the month in the counter window
  g.fill(C.panel); g.rect(k.x + 6, k.y + 4, k.w - 12, 46, 3);
  g.fill(C.inkSoft); g.rect(k.x + k.w / 2 - 10, k.y + k.h - 30, 20, 30);
  g.fill(255, 250, 240, 35); g.rect(k.x + k.w / 2 - 10, k.y + k.h - 30, 4, 30);
}

function tree(g, x, y, r, night) {
  g.fill(26, 32, 34, 35); g.ellipse(x + 4, y + r * 0.55, r * 1.1, r * 0.35);
  g.fill(C.stuccoDk); g.rect(x - 4, y, 8, r * 0.7);
  g.fill(night ? C.hillNightDk : C.grassDk); g.ellipse(x - r * 0.25, y - r * 0.15, r * 0.9, r * 0.7);
  g.fill(night ? C.hillNight : C.grass); g.ellipse(x + r * 0.2, y - r * 0.25, r, r * 0.75);
  g.fill(night ? C.hillNight : C.hillLite); g.ellipse(x, y - r * 0.45, r * 0.7, r * 0.55);
}

function shrub(g, x, y, r, night) {
  g.fill(26, 32, 34, 28); g.ellipse(x + 2, y + 4, r * 1.2, r * 0.4);
  g.fill(night ? C.hillNightDk : C.grassDk); g.ellipse(x - r * 0.2, y, r * 0.7, r * 0.5);
  g.fill(night ? C.hillNight : C.grass); g.ellipse(x + r * 0.15, y - 2, r * 0.75, r * 0.55);
}

/** Tall slender palm — visitor-map California cue, not a counted prop. */
function palm(g, x, y, s, night) {
  const h = 132 * s;
  g.fill(26, 32, 34, 32); g.ellipse(x + 3, y + 4, 32 * s, 12 * s);
  g.fill(C.stuccoDk);
  g.beginShape();
  g.vertex(x - 6.5 * s, y);
  g.vertex(x + 6.5 * s, y);
  g.vertex(x + 4.2 * s, y - h);
  g.vertex(x - 4.2 * s, y - h);
  g.endShape(g.CLOSE);
  // trunk ring texture
  g.stroke(mixHex(C.stuccoDk, C.ink, 0.2)); g.strokeWeight(1.5);
  for (let i = 1; i < 8; i++) {
    const yy = y - (h * i) / 8;
    g.line(x - 4.5 * s, yy, x + 4.5 * s, yy);
  }
  g.noStroke();
  const frond = night ? C.grassDk : C.grass;
  g.fill(frond);
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI * 0.98 + i * (Math.PI * 0.24);
    const lx = x + Math.cos(a) * 64 * s;
    const ly = y - h + Math.sin(a) * 28 * s;
    g.triangle(x, y - h, lx, ly, x + Math.cos(a + 0.2) * 24 * s, y - h + 10 * s);
  }
  g.fill(night ? C.hillLite : C.hill);
  g.ellipse(x, y - h, 24 * s, 16 * s);
}

/** Quiet boulevard lamp post — not the FilmLA stage lamps (those are actors). s scales the whole lamp. */
function streetLamp(g, x, y, night, s = 1) {
  g.fill(26, 32, 34, 36); g.ellipse(x + 3 * s, y + 5 * s, 32 * s, 12 * s);
  g.fill(C.metalDk); g.rect(x - 7 * s, y - 118 * s, 14 * s, 118 * s);
  // base collar
  g.fill(C.metal); g.rect(x - 14 * s, y - 10 * s, 28 * s, 12 * s, 1);
  g.fill(C.metal); g.rect(x - 20 * s, y - 126 * s, 40 * s, 16 * s, 2);
  g.fill(night ? C.windowWarm : C.paper);
  g.ellipse(x, y - 142 * s, 42 * s, 40 * s);
  g.fill(255, 250, 240, night ? 120 : 75);
  g.ellipse(x - 8 * s, y - 148 * s, 16 * s, 14 * s);
  if (night) {
    g.fill(241, 199, 106, 52);
    g.ellipse(x, y - 142 * s, 120 * s, 90 * s);
    g.fill(241, 199, 106, 84);
    g.ellipse(x, y - 142 * s, 62 * s, 48 * s);
  }
}

function fenceLattice(g, x, y, w, h) {
  g.fill(C.metalDk);
  g.rect(x, y, w, 11);
  g.rect(x, y + h - 11, w, 11);
  g.rect(x, y, 11, h);
  g.rect(x + w - 11, y, 11, h);
  g.stroke(C.metal); g.strokeWeight(3.8);
  for (let i = 14; i < w - 8; i += 14) g.line(x + i, y + 11, x + i, y + h - 11);
  // diagonal brace every other bay
  g.strokeWeight(2.6);
  for (let i = 14; i < w - 28; i += 28) {
    g.line(x + i, y + 11, x + i + 14, y + h - 11);
  }
  g.noStroke();
}

function road(g, mat, x, y, w, h, { dashes = true, quiet = false } = {}) {
  g.fill(quiet ? mixHex(C.asphalt, C.ground, 0.18) : C.asphalt); g.rect(x, y, w, h);
  stampMaterial(g, mat, x, y, w, h, quiet ? 38 : 55);
  g.fill(C.curb);
  if (w > h) {
    g.rect(x, y - 3, w, 3);
    g.rect(x, y + h, w, 3);
    // soft shoulder wash (quieter mid-lot roads)
    g.fill(26, 32, 34, 18);
    g.rect(x, y - 1, w, 1);
    g.rect(x, y + h + 2, w, 1);
  } else {
    g.rect(x - 3, y, 3, h);
    g.rect(x + w, y, 3, h);
    g.fill(26, 32, 34, 18);
    g.rect(x - 1, y, 1, h);
    g.rect(x + w + 2, y, 1, h);
  }
  if (!dashes) return;
  g.fill(C.laneMark);
  if (w > h) { for (let i = x + 20; i < x + w; i += 60) g.rect(i, y + h / 2 - 5, 42, 10); }
  else { for (let j = y + 20; j < y + h; j += 60) g.rect(x + w / 2 - 5, j, 10, 42); }
}

function crosswalk(g, x, y, w, h, horizontal) {
  g.fill(C.laneMark);
  if (horizontal) {
    for (let i = 0; i < 7; i++) g.rect(x + 4 + i * ((w - 8) / 7), y + 1, 26, h - 2);
  } else {
    for (let i = 0; i < 6; i++) g.rect(x + 1, y + 4 + i * ((h - 8) / 6), w - 2, 24);
  }
}

/** Extruded box: front face + right side plane + lifted roof + contact shadow. */
function volume(g, mat, x, y, w, h, wall, roof, {
  sideColor = null, awning = false, awningColor = C.lamp,
} = {}) {
  contactShadow(g, x, y, w, h);
  const side = sideColor || mixHex(wall, C.ink, 0.22);
  g.fill(side);
  g.quad(
    x + w, y,
    x + w + LIGHT.side, y + 6,
    x + w + LIGHT.side, y + h + 6,
    x + w, y + h
  );
  g.fill(roof);
  g.quad(
    x - 4, y - LIGHT.roofLift,
    x + w + 4, y - LIGHT.roofLift + 4,
    x + w + LIGHT.side + 2, y - LIGHT.roofLift + 10,
    x + LIGHT.side - 6, y - 6
  );
  g.fill(wall); g.rect(x, y, w, h);
  if (mat) stampMaterial(g, mat, x, y, w, h, 68);
  g.fill(255, 250, 240, 70);
  g.rect(x, y, 5, h);
  // eave gutter + short downspout (built-volume cue at street zoom)
  g.fill(C.metalDk);
  g.rect(x + 2, y + 2, w - 4, 4);
  g.rect(x + w - 10, y + 2, 4, 18);
  g.fill(C.metal);
  g.rect(x + 3, y + 2, w - 6, 1.5);
  if (awning) {
    g.fill(awningColor);
    g.quad(x + 8, y + 36, x + w - 8, y + 36, x + w - 2, y + 52, x + 2, y + 52);
    // alternating stripe ribs on the awning underside
    g.fill(mixHex(awningColor, C.ink, 0.18));
    for (let i = 0; i < 6; i++) {
      const u = (i + 0.5) / 6;
      const x0 = x + 8 + u * (w - 16);
      const x1 = x + 2 + u * (w - 4);
      g.quad(x0 - 3, y + 36, x0 + 3, y + 36, x1 + 3, y + 52, x1 - 3, y + 52);
    }
  }
}

function stage(g, mat, matMetal, x, y, w, h, n, profile, night = false) {
  contactShadow(g, x, y, w, h);
  const side = night ? mixHex(C.stageSide, C.skyNight, 0.35) : C.stageSide;
  g.fill(side);
  g.quad(x + w, y, x + w + LIGHT.side, y + 5, x + w + LIGHT.side, y + h + 5, x + w, y + h);

  g.fill(C.roof);
  if (profile === 'saw') {
    g.beginShape();
    g.vertex(x - 6, y);
    g.vertex(x + w * 0.25, y - 34);
    g.vertex(x + w * 0.5, y - 10);
    g.vertex(x + w * 0.75, y - 34);
    g.vertex(x + w + 6, y);
    g.vertex(x + w + LIGHT.side, y + 8);
    g.vertex(x - 2, y + 6);
    g.endShape(g.CLOSE);
    g.fill(C.roofDk);
    g.triangle(x + w * 0.12, y - 4, x + w * 0.25, y - 30, x + w * 0.38, y - 4);
    g.triangle(x + w * 0.62, y - 4, x + w * 0.75, y - 30, x + w * 0.88, y - 4);
  } else if (profile === 'monitor') {
    g.quad(x - 6, y - 16, x + w + 6, y - 14, x + w + LIGHT.side, y - 2, x + LIGHT.side - 4, y - 4);
    g.fill(C.roofDk);
    g.rect(x + w * 0.22, y - 42, w * 0.56, 28, 3);
    g.fill(mixHex(C.roofDk, C.ink, 0.25));
    g.rect(x + w * 0.28, y - 36, w * 0.44, 14);
    g.fill(C.roof);
  } else {
    g.quad(x - 6, y - 22, x + w + 6, y - 16, x + w + LIGHT.side + 2, y - 2, x + LIGHT.side - 6, y - 8);
  }

  // apron slab in front of the door
  g.fill(C.asphaltDk);
  g.rect(x + 10, y + h - 2, w - 20, 28);
  // chalk T-mark on the apron (decorative grip language — not data)
  g.stroke(C.laneMark); g.strokeWeight(5);
  g.line(x + w / 2 - 18, y + h + 10, x + w / 2 + 18, y + h + 10);
  g.line(x + w / 2, y + h - 1, x + w / 2, y + h + 24);
  // secondary V-mark on sawtooth aprons
  if (profile === 'saw') {
    g.line(x + w / 2 - 24, y + h + 18, x + w / 2 - 12, y + h + 4);
    g.line(x + w / 2 + 12, y + h + 4, x + w / 2 + 24, y + h + 18);
  }
  g.noStroke();
  g.fill(C.stageWall); g.rect(x, y, w, h);
  stampMaterial(g, mat, x, y, w, h, 45);
  g.fill(255, 250, 240, 55); g.rect(x, y, 5, h);
  // rain gutter + downspouts along the eave (reads as built volume at district zoom)
  g.fill(C.metalDk);
  g.rect(x + 2, y + 1, w - 4, 7);
  g.fill(C.metal);
  g.rect(x + 3, y + 1, w - 6, 3);
  // right + left downspouts
  g.fill(C.metalDk);
  g.rect(x + w - 14, y + 2, 7, 34);
  g.rect(x + 5, y + 2, 7, 28);
  g.rect(x + w - 16, y + 34, 11, 5);
  g.rect(x + 3, y + 28, 11, 5);

  // roll-up door — profile tweaks door width slightly; some doors sit half-open (geometry only — not lamp data)
  const doorW = profile === 'saw' ? 70 : profile === 'monitor' ? 86 : 80;
  const doorH = 70;
  const doorOpen = (n % 4 === 1) ? 22 : (n % 4 === 3) ? 12 : 0;
  // door track rails
  g.fill(C.metalDk);
  g.rect(x + w / 2 - doorW / 2 - 4, y + h - doorH - 2, 3, doorH + 2);
  g.rect(x + w / 2 + doorW / 2 + 1, y + h - doorH - 2, 3, doorH + 2);
  // dark bay interior when the door is cracked
  if (doorOpen > 0) {
    g.fill(night ? '#12161a' : '#1a2024');
    g.rect(x + w / 2 - doorW / 2 + 2, y + h - doorOpen, doorW - 4, doorOpen);
    g.fill(241, 199, 106, night ? 36 : 14);
    g.rect(x + w / 2 - doorW / 2 + 6, y + h - doorOpen + 2, doorW - 12, Math.max(2, doorOpen - 4));
  }
  g.fill(C.stageDoor); g.rect(x + w / 2 - doorW / 2, y + h - doorH, doorW, doorH - doorOpen);
  if (matMetal) stampMaterial(g, matMetal, x + w / 2 - doorW / 2, y + h - doorH, doorW, doorH - doorOpen, 40);
  g.fill(C.inkSoft);
  const slats = doorOpen > 0 ? 5 : 6;
  for (let i = 0; i < slats; i++) g.rect(x + w / 2 - doorW / 2 + 4, y + h - doorH + 6 + i * 10, doorW - 8, 2);
  // bottom rail when cracked open
  if (doorOpen > 0) {
    g.fill(C.metalDk);
    g.rect(x + w / 2 - doorW / 2 - 1, y + h - doorOpen - 3, doorW + 2, 4);
  }

  // HVAC unit on flat / monitor roofs
  if (profile !== 'saw') {
    g.fill(C.metal);
    g.rect(x + w * 0.58, y - (profile === 'monitor' ? 14 : 32), 62, 32, 2);
    if (matMetal) stampMaterial(g, matMetal, x + w * 0.58, y - (profile === 'monitor' ? 14 : 32), 62, 32, 36);
    g.fill(C.metalDk);
    g.rect(x + w * 0.61, y - (profile === 'monitor' ? 6 : 22), 22, 14);
    g.rect(x + w * 0.78, y - (profile === 'monitor' ? 6 : 22), 22, 14);
    // fan discs
    g.fill(C.inkSoft);
    g.ellipse(x + w * 0.665, y - (profile === 'monitor' ? 0 : 15), 14, 14);
    g.ellipse(x + w * 0.835, y - (profile === 'monitor' ? 0 : 15), 14, 14);
  }

  // one bollard at the apron's left; the right side is where lamps.js parks a lit stage's truck
  g.fill(C.inkSoft);
  g.rect(x + 6, y + h + 1, 22, 36, 2);
  g.fill(C.lamp); g.ellipse(x + 17, y + h + 1, 24, 12);
  g.fill(C.paper); g.ellipse(x + 17, y + h - 2, 14, 7);
  // quiet generator / distro box on flat stages, in the strip of wall left of the door (decorative — not a lamp count)
  if (profile === 'flat') {
    g.fill(C.metal);
    g.rect(x + 3, y + h - 56, 24, 52, 2);
    if (matMetal) stampMaterial(g, matMetal, x + 3, y + h - 56, 24, 52, 36);
    g.fill(C.metalDk); g.rect(x + 8, y + h - 48, 14, 12);
    g.fill(C.lampOff); g.ellipse(x + 15, y + h - 24, 12, 12);
    g.fill(C.inkSoft); g.rect(x + 7, y + h - 12, 16, 5);
  }

  // the stage sign between the eave and the door: number on the left, red-light housing on the right
  // (lamps.js lights it at x + w/2 + 24, y + 26)
  g.fill(26, 32, 34, 30); g.ellipse(x + w / 2 + 2, y + 50, 92, 10);
  g.fill(C.panel); g.rect(x + w / 2 - 44, y + 4, 88, 44, 3);
  g.fill(255, 250, 240, 55); g.rect(x + w / 2 - 44, y + 4, 88, 5, 3, 3, 0, 0);
  g.fill(C.ink); useDisplay(g, 34); g.textAlign(g.CENTER, g.CENTER);
  g.text(String(n), x + w / 2 - 18, y + 26);
  g.textAlign(g.LEFT, g.TOP);
  g.fill(C.lampOff); g.ellipse(x + w / 2 + 24, y + 26, 28, 28);
  g.fill(mixHex(C.lampOff, C.ink, 0.18)); g.ellipse(x + w / 2 + 24, y + 26, 20, 20);
}

function cinema(g, mat, x, y, w, h, night = false) {
  contactShadow(g, x, y, w, h);
  g.fill(C.cinemaSide);
  g.quad(x + w, y, x + w + 18, y + 8, x + w + 18, y + h + 8, x + w, y + h);
  // stepped art-deco crown, low enough (top at y - 56) to clear Soundstage Row's aprons across the main road
  g.fill(C.lamp);
  g.rect(x - 10, y - 26, w + 20, 18);
  g.fill(C.cinemaWall);
  g.rect(x + 36, y - 42, w - 72, 16);
  g.fill(C.lamp);
  g.rect(x + 80, y - 56, w - 160, 14);
  // zig-zag deco band on the middle crown step
  g.fill(C.windowWarm);
  for (let i = 0; i < 7; i++) {
    const zx = x + 50 + i * ((w - 100) / 7);
    g.triangle(zx, y - 29, zx + 10, y - 39, zx + 20, y - 29);
  }
  g.fill(C.windowWarm);
  for (let i = 0; i < 9; i++) g.ellipse(x + 100 + i * ((w - 200) / 8), y - 49, 10, 10);
  // night crown glow (architecture — not data)
  if (night) {
    g.fill(241, 199, 106, 56);
    g.ellipse(x + w / 2, y - 36, w * 0.95, 64);
  }
  g.fill(C.cinemaWall); g.rect(x, y, w, h);
  if (mat) stampMaterial(g, mat, x, y, w, h, 38);
  g.fill(C.cinemaSide);
  g.rect(x + 20, y + 80, 18, h - 80);
  g.rect(x + w - 38, y + 80, 18, h - 80);
  // vertical fluting on pilasters
  g.fill(255, 250, 240, 35);
  g.rect(x + 24, y + 86, 3, h - 92);
  g.rect(x + w - 34, y + 86, 3, h - 92);
  g.fill(255, 250, 240, 45); g.rect(x, y, 4, h);
  // vertical neon tubes flanking the facade (architecture — title stays actor-driven)
  g.fill(C.lamp);
  g.rect(x + 4, y + 70, 12, h - 90, 2);
  g.rect(x + w - 16, y + 70, 12, h - 90, 2);
  g.fill(241, 199, 106, night ? 150 : 75);
  g.rect(x + 6, y + 74, 8, h - 98);
  g.rect(x + w - 14, y + 74, 8, h - 98);
  // secondary neon ribs inside the tubes
  g.fill(255, 250, 240, night ? 90 : 40);
  for (let i = 0; i < 5; i++) {
    const yy = y + 86 + i * ((h - 120) / 4);
    g.rect(x + 5, yy, 10, 3);
    g.rect(x + w - 15, yy, 10, 3);
  }
  if (night) {
    g.fill(241, 199, 106, 70);
    g.rect(x + 0, y + 70, 18, h - 90, 3);
    g.rect(x + w - 18, y + 70, 18, h - 90, 3);
  }
}

const NIGHT_WASH = 95 / 255;   // drawLot's night wash: fill(29, 42, 58, 95), i.e. skyNight, over everything below the sky

/** The gatehouse front: soffit, roof, ridge cap and hanging lamp housings (decorative — lamps-as-data live on stages).
 *  trucks.js lays it again over the queue so waiting trucks sit behind it; `washed` pre-mixes the night wash the lot
 *  buffer gets afterwards, so the copy matches the baked one after dark. */
export function gateRoof(g, { night = false, washed = false } = {}) {
  const gm = A.gateMouth;
  const c = (hx) => (washed ? mixHex(hx, C.skyNight, NIGHT_WASH) : hx);
  g.noStroke();
  g.fill(c(C.roofDk)); g.rect(gm.x - 18, gm.y - 64, gm.w + 36, 6);
  g.fill(c(C.roof)); g.rect(gm.x - 18, gm.y - 78, gm.w + 36, 18, 2);
  g.fill(c(C.roofDk)); g.rect(gm.x - 14, gm.y - 82, gm.w + 28, 5, 1);
  g.fill(c(C.lampOff));
  g.ellipse(gm.x + 22, gm.y - 56, 34, 34);
  g.ellipse(gm.x + gm.w - 22, gm.y - 56, 34, 34);
  g.fill(c(mixHex(C.lampOff, C.ink, 0.15)));
  g.ellipse(gm.x + 22, gm.y - 56, 22, 22);
  g.ellipse(gm.x + gm.w - 22, gm.y - 56, 22, 22);
  g.fill(c(C.inkSoft));
  g.rect(gm.x + 11, gm.y - 80, 22, 22);
  g.rect(gm.x + gm.w - 33, gm.y - 80, 22, 22);
  if (night && !washed) {
    g.fill(241, 199, 106, 56);
    g.ellipse(gm.x + 22, gm.y - 56, 64, 48);
    g.ellipse(gm.x + gm.w - 22, gm.y - 56, 64, 48);
  }
}

function pillar(g, x, y, w, h, wall, cap) {
  g.fill(wall); g.rect(x, y, w, h);
  g.fill(cap); g.rect(x - 6, y, w + 12, 16);
  g.fill(255, 250, 240, 45); g.rect(x, y, 3, h);
  g.fill(mixHex(wall, '#1a2022', 0.12)); g.rect(x + w - 3, y, 3, h);
}

function contactShadow(g, x, y, w, h) {
  g.fill(26, 32, 34, 46);
  g.ellipse(x + w / 2 + LIGHT.shadowOx, y + h + LIGHT.shadowOy, w * 0.95, 22);
}

function star(g, cx, cy, r) {
  g.beginShape();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    g.vertex(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.endShape(g.CLOSE);
}

function mixHex(a, b, t) {
  const A = hex(a), B = hex(b);
  const h = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(A[0] + (B[0] - A[0]) * t)}${h(A[1] + (B[1] - A[1]) * t)}${h(A[2] + (B[2] - A[2]) * t)}`;
}
function hex(s) {
  const c = s.replace('#', '');
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}
