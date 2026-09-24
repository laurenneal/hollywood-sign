// The Backlot palette: warm paper ground, ochre stucco, one red (shooting lamps), one teal (the water tower).
// Actors take colours from here, and through scene.paint(sig, colour) so stale signals go grey automatically.
// M1: visitor-map materials — quieter block, cinema landmark colors, lane marks, panel ink for plaques.

export const PALETTE = {
  paper:      '#efe9d8',
  paperDark:  '#e2d9c0',
  panel:      '#fffaf0',
  line:       '#cfc6ae',
  ground:     '#d4c9a8',
  asphalt:    '#7a756a',
  asphaltDk:  '#5c584f',
  curb:       '#c9c0a3',
  laneMark:   '#e8e0c8',
  stucco:     '#e8c98a',
  stuccoDk:   '#c9a463',
  stageWall:  '#c4bba8',
  stageSide:  '#9e9684',
  stageDoor:  '#6e685c',
  roof:       '#a04a3b',
  roofDk:     '#7a382c',
  roofSoft:   '#8f6a5a',
  ink:        '#1a2022',
  inkSoft:    '#4c5659',
  lamp:       '#c3302a',
  lampOff:    '#5a4a48',
  tower:      '#2b6963',
  towerLite:  '#4d9089',
  water:      '#7fb6b0',
  skyDay:     '#cfe3ea',
  skyGolden:  '#f3d29a',
  skyOvercast:'#b9c2c6',
  skyRain:    '#8d9aa1',
  skyStorm:   '#5c666c',
  skyNight:   '#1d2a3a',
  hill:       '#8fa572',
  hillDk:     '#6f8554',
  hillLite:   '#a8bc84',
  grass:      '#7a915d',
  grassDk:    '#5e7348',
  metal:      '#8a9296',
  metalDk:    '#5c6468',
  hillNight:  '#3d4a38',
  hillNightDk:'#2c3529',
  groundNight:'#3a3830',
  // quieter apartment shell so data windows do not dominate the tower/stages/cinema
  blockWall:  '#a8a297',
  blockSide:  '#8a847a',
  stageWallNight: '#6e685c',
  cinemaWall: '#f0e6d2',
  cinemaSide: '#c9b89a',
  windowOff:  '#3b3f44',
  windowWarm: '#f1c76a',
  windowBlue: '#5aa7e8',
  poster:     ['#c3302a', '#2b6963', '#e0a33b', '#5a6fb0', '#8a4f9e', '#3d8b5f'],
  skin:       ['#f1c9a5', '#d9a679', '#b07a4f', '#7a4b2c', '#5a3820'],
  shirt:      ['#2b6963', '#c3302a', '#e0a33b', '#5a6fb0', '#4c5659', '#efe9d8', '#8a4f9e'],
  truck:      '#f2efe6',
  truckCab:   '#c9c0a3',
  stale:      '#8b9498',
  staleLite:  '#c2c7c9',
};

// Desaturate a hex colour toward grey by amount 0..1. Used for stale signals.
export function greyed(hex, amount = 0.85) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  const l = 0.3 * r + 0.59 * g + 0.11 * b;
  const mix = (v) => Math.round(v + (l - v) * amount);
  const h = (v) => v.toString(16).padStart(2, '0');
  return `#${h(mix(r))}${h(mix(g))}${h(mix(b))}`;
}
