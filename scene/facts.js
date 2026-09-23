// One short, true "Did you know" line per actor, surfaced in the hover legend, the pinned inspector,
// and the # numbers board. Facts are editorial context, kept clearly separate from the measured
// number — never a data claim. Keep each to one sentence. Deterministic (no rotation).

export const FACTS = {
  water_tower: 'Studio water towers were real — part fire reservoir, part landmark for painting the studio\u2019s name.',
  lamps: 'A red light outside a stage means \u201crolling\u201d — open the door mid-take and you\u2019ve ruined the shot.',
  crews: 'One shoot day can put 100+ people to work across grip, electric, camera, art, and wardrobe.',
  marquee: 'Weekend grosses run Friday\u2013Sunday; Sunday\u2019s number is an estimate until Monday\u2019s actuals.',
  picket: 'In 2023 the writers\u2019 and actors\u2019 unions struck at once — their first joint walkout since 1960.',
  benches: '\u201cBetween jobs\u201d is the industry\u2019s normal state — most film work is short-term, gig by gig.',
  trucks: 'Productions chase tax credits — a smaller LA share often means trucks rolled to Georgia, New York, or overseas.',
  windows: 'Netflix reports viewing as hours watched, so a long title can out-\u201chour\u201d a more-watched short one.',
  tent: 'Sundance takes submissions in the thousands; only a few hundred features make the program.',
  globe: '\u201cGlobal box office\u201d is stitched from dozens of currencies and calendars — an estimate, not a tally.',
  departures: 'Most of these numbers move monthly or quarterly; this board says when each one lands next.',
  newsstand: 'Trade \u201cvelocity\u201d — stories per day — is texture about Hollywood, not a measure of it.',
  film_office: 'California awards its film tax credit in rounds; projects apply and are ranked, not first-come.',
  billboard: 'The trade press — Variety, Deadline, THR — sets the town\u2019s daily mood as much as any number does.',
};

export function factFor(id) {
  return (id && FACTS[id]) || '';
}
