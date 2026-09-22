// Every actor the scene runs. Draw order: 'sky' layer first (before the lot), then 'mid' in this order, then 'front'.
// Hover hits resolve last-registered-first, so an actor with a small region inside another's district must come after it.
// To add one: create actors/<name>.js exporting the actor object (see crews.js for the shape) and add one import
// and one entry here. Every actor names a signal id; scripts/check_actors.py checks it exists in data/signals.json.

import weather from './weather.js';
import planes from './planes.js';
import water_tower from './water_tower.js';
import nyc_skyline from './nyc_skyline.js';
import crews from './crews.js';
import lamps from './lamps.js';
import pink_slips from './pink_slips.js';
import film_office from './film_office.js';
import benches from './benches.js';
import picket from './picket.js';
import trucks from './trucks.js';
import departures from './departures.js';
import tourists from './tourists.js';
import marquee from './marquee.js';
import billboard from './billboard.js';
import newsstand from './newsstand.js';
import windows from './windows.js';
import tent from './tent.js';
import globe from './globe.js';
import banner_plane from './banner_plane.js';
import waldo from './waldo.js';

export const ACTORS = [
  weather,        // sky: paints the sky band from press tone
  planes,         // mid (sky): London and Atlanta planes climbing away; before the tower so they pass behind it
  water_tower,    // mid: the index, on the hill
  nyc_skyline,    // mid (sky): NYC permit events as lit windows on the far hill
  crews,          // mid: LA jobs on Soundstage Row (claims the district; lamps must come after)
  lamps,          // mid: FilmLA shoot days on the twelve stage lamps, category-colored trucks
  pink_slips,     // mid: WARN notices on the union hall wall
  film_office,    // mid: the latest California tax-credit round in the film-office window
  benches,        // mid: industry unemployment outside the union hall
  picket,         // mid: strike days on the sidewalk
  trucks,         // mid: LA share of US jobs, leaving through the gate
  departures,     // mid: the next data releases
  tourists,       // mid: Wikipedia attention on the star walk
  marquee,        // mid: weekend number one and the ticket line
  billboard,      // mid: GDELT trade crawl on the boulevard boards
  newsstand,      // mid: trade-press velocity
  windows,        // mid: Netflix hours after dark, and the broadcast tower
  tent,           // mid (park): the Sundance tent and its queue
  globe,          // mid (park): the global box-office globe by the kiosk
  banner_plane,   // front: the top headline flag
  waldo,          // front: the Fair Play Films van
];
