// Fixed anchor rectangles on the 2400 x 1600 logical canvas. Actors draw only inside their district,
// so a new actor cannot collide with another district's ground. Coordinates are logical; the renderer scales.

export const W = 2400;
export const H = 1600;

export const DISTRICTS = {
  sky:       { x: 0,    y: 0,    w: 2400, h: 430,  label: 'Sky and hills' },
  stages:    { x: 60,   y: 450,  w: 1040, h: 500,  label: 'Soundstage Row' },
  street:    { x: 1130, y: 450,  w: 580,  h: 460,  label: 'Backlot Street' },
  gate:      { x: 1740, y: 450,  w: 600,  h: 460,  label: 'The Gate' },
  boulevard: { x: 60,   y: 950,  w: 1340, h: 590,  label: 'The Boulevard' },
  block:     { x: 1430, y: 950,  w: 470,  h: 590,  label: 'The Apartment Block' },
  park:      { x: 1930, y: 950,  w: 410,  h: 590,  label: 'The Park' },
};

// Named anchor points inside districts that several actors share (the road, the theater door, the gate mouth).
export const ANCHORS = {
  waterTower:   { x: 2010, y: 250 },     // on the far hill
  nycSkyline:   { x: 2200, y: 300, w: 180, h: 110 },
  stageRows:    [{ y: 520 }, { y: 765 }], // two rows of six; aisle ~125px for readable crews
  stageSize:    { w: 140, h: 120 },
  stageGap:     30,
  unionHall:    { x: 1160, y: 500, w: 240, h: 200 },
  coffeeCart:   { x: 1434, y: 632, w: 102, h: 68 },
  filmOffice:   { x: 1470, y: 480, w: 220, h: 150 },
  sidewalk:     { x: 1130, y: 720, w: 580, h: 60 },  // where the picket line forms
  gateMouth:    { x: 1760, y: 760, w: 120, h: 140 },
  departures:   { x: 1880, y: 430, w: 450, h: 190 },
  truckLane:    { x: 1760, y: 620, w: 560, h: 120 },  // queue runs right-to-left toward the gate mouth
  starWalk:     { x: 1740, y: 820, w: 600, h: 80 },
  theater:      { x: 90,   y: 980, w: 520, h: 300 },
  marquee:      { x: 110,  y: 986, w: 480, h: 78 },
  ticketLine:   { x: 90,   y: 1300, w: 640, h: 90 },  // snakes left from the theater door
  posterWall:   { x: 640,  y: 1000, w: 360, h: 260 }, // 24 slots, 6 x 4
  billboards:   [{ x: 1010, y: 960, w: 220, h: 110 }, { x: 1240, y: 960, w: 220, h: 110 }],
  newsstand:    { x: 1044, y: 1194, w: 132, h: 98 },
  streetRun:    { x: 60,   y: 1400, w: 1340, h: 140 }, // papers blow along it; banner plane above the sky
  apartment:    { x: 1450, y: 970, w: 430, h: 470 },  // 240 windows: 12 columns x 20 rows
  towerTop:     { x: 1665, y: 900 },
  tent:         { x: 1948, y: 1088, w: 224, h: 176 },
  tentQueue:    { x: 1930, y: 1288, w: 400, h: 120 },
  kiosk:        { x: 2208, y: 1068, w: 118, h: 140 },
};

export function inRect(r, x, y) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}
