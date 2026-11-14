// One reading note per actor, shown in the legend, inspector, and numbers board.
// Explain the measure or its limits in one sentence; avoid unsourced industry trivia.

export const FACTS = {
  water_tower: 'The index combines several measures, so a reading of 50 can include components above and below their recent averages.',
  lamps: 'These lamps represent permitted on-location filming in FilmLA’s jurisdictions, not soundstage occupancy.',
  crews: 'This series counts payroll jobs in motion picture and sound recording industries, not unique workers or acting jobs alone.',
  marquee: 'Only the weekend’s number-one film contributes to this signal.',
  picket: 'The picket lines follow the union strike dates recorded in this project.',
  benches: 'This unemployment measure covers motion picture and sound recording workers nationwide.',
  trucks: 'LA’s share can fall when jobs grow elsewhere, even if LA employment is unchanged.',
  windows: 'Hours viewed do not tell us the number of viewers or whether they liked what they watched.',
  tent: 'The queue represents total submissions to Sundance, while the tent’s size follows feature submissions.',
  globe: 'Box-office receipts measure ticket revenue, not admissions or profit.',
  departures: 'Dates on this board are estimates based on each source’s release schedule.',
  newsstand: 'The paper count reflects stories in the selected trade feeds, not how many distinct events occurred.',
  film_office: 'An approved tax-credit project is not a completed production.',
  billboard: 'The trade headlines are separate from SIGN’s reporting.',
  posters: 'These cards display film titles from TMDB, not reproductions of movie posters.',
  searchlights: 'TMDB trending is a separate signal from box-office receipts.',
};

export function factFor(id) {
  return (id && FACTS[id]) || '';
}
