import type { ClubAchievementRecord, CompetitionRecord, NationalTeamRecord } from "@/types/football";

export const competitions: CompetitionRecord[] = [
  { id: "libertadores", name: "Copa Libertadores", shortName: "Libertadores", region: "CONMEBOL", type: "CLUB_INTERNATIONAL" },
  { id: "sudamericana", name: "Copa Sudamericana", shortName: "Sudamericana", region: "CONMEBOL", type: "CLUB_INTERNATIONAL" },
  { id: "intercontinental", name: "Copa Intercontinental", shortName: "Intercontinental", region: "CONMEBOL/UEFA", type: "CLUB_INTERNATIONAL" },
  { id: "club-world-cup", name: "Mundial de Clubes FIFA", shortName: "Mundial de Clubes", region: "FIFA", type: "CLUB_INTERNATIONAL" },
  { id: "champions-league", name: "Copa de Europa / Champions League", shortName: "Champions", region: "UEFA", type: "CLUB_INTERNATIONAL" },
  { id: "liga-ar", name: "Primera División Argentina", shortName: "Primera División", region: "AR", country: "AR", type: "CLUB_LEAGUE" },
  { id: "primera-nacional", name: "Primera Nacional", shortName: "Primera Nacional", region: "AR", country: "AR", type: "CLUB_LEAGUE" },
  { id: "copa-argentina", name: "Copa Argentina", shortName: "Copa Argentina", region: "AR", country: "AR", type: "CLUB_CUP" },
  { id: "brasileirao", name: "Campeonato Brasileño", shortName: "Brasileirão", region: "BR", country: "BR", type: "CLUB_LEAGUE" },
  { id: "world-cup", name: "Copa del Mundo", shortName: "Mundial", region: "FIFA", type: "NATIONAL_TEAM" },
  { id: "copa-america", name: "Copa América", shortName: "Copa América", region: "CONMEBOL", type: "NATIONAL_TEAM" },
  { id: "olympics", name: "Juegos Olímpicos (fútbol)", shortName: "Juegos Olímpicos", region: "FIFA", type: "NATIONAL_TEAM" },
  { id: "u20-world-cup", name: "Mundial Sub-20", shortName: "Mundial Sub-20", region: "FIFA", type: "NATIONAL_TEAM" },
];

export const nationalTeams: NationalTeamRecord[] = [
  { id: "ARG", name: "Argentina", country: "AR", confederation: "CONMEBOL" },
  { id: "URU", name: "Uruguay", country: "UY", confederation: "CONMEBOL" },
  { id: "BRA", name: "Brasil", country: "BR", confederation: "CONMEBOL" },
  { id: "CHI", name: "Chile", country: "CL", confederation: "CONMEBOL" },
  { id: "COL", name: "Colombia", country: "CO", confederation: "CONMEBOL" },
  { id: "PAR", name: "Paraguay", country: "PY", confederation: "CONMEBOL" },
  { id: "ECU", name: "Ecuador", country: "EC", confederation: "CONMEBOL" },
  { id: "PER", name: "Perú", country: "PE", confederation: "CONMEBOL" },
  { id: "BOL", name: "Bolivia", country: "BO", confederation: "CONMEBOL" },
  { id: "VEN", name: "Venezuela", country: "VE", confederation: "CONMEBOL" },
  { id: "ESP", name: "España", country: "ES", confederation: "UEFA" },
  { id: "FRA", name: "Francia", country: "FR", confederation: "UEFA" },
  { id: "GER", name: "Alemania", country: "DE", confederation: "UEFA" },
];

const titles = (competitionId: string, clubId: string, seasons: number[]): ClubAchievementRecord[] =>
  seasons.map((season) => ({ clubId, competitionId, season, result: "WINNER" as const }));

/** Palmarés internacional de los clubes del seed (sólo clubes cargados). */
export const clubAchievements: ClubAchievementRecord[] = [
  // Copa Libertadores
  ...titles("libertadores", "independiente", [1964, 1965, 1972, 1973, 1974, 1975, 1984]),
  ...titles("libertadores", "boca", [1977, 1978, 2000, 2001, 2003, 2007]),
  ...titles("libertadores", "penarol", [1960, 1961, 1966, 1982, 1987]),
  ...titles("libertadores", "river", [1986, 1996, 2015, 2018]),
  ...titles("libertadores", "estudiantes", [1968, 1969, 1970, 2009]),
  ...titles("libertadores", "nacional", [1971, 1980, 1988]),
  ...titles("libertadores", "olimpia", [1979, 1990, 2002]),
  ...titles("libertadores", "sao-paulo", [1992, 1993, 2005]),
  ...titles("libertadores", "gremio", [1983, 1995, 2017]),
  ...titles("libertadores", "santos", [1962, 1963, 2011]),
  ...titles("libertadores", "palmeiras", [1999, 2020, 2021]),
  ...titles("libertadores", "flamengo", [1981, 2019, 2022]),
  ...titles("libertadores", "cruzeiro", [1976, 1997]),
  ...titles("libertadores", "internacional", [2006, 2010]),
  ...titles("libertadores", "atletico-nacional", [1989, 2016]),
  ...titles("libertadores", "racing", [1967]),
  ...titles("libertadores", "argentinos", [1985]),
  ...titles("libertadores", "colo-colo", [1991]),
  ...titles("libertadores", "velez", [1994]),
  ...titles("libertadores", "vasco", [1998]),
  ...titles("libertadores", "ldu", [2008]),
  ...titles("libertadores", "corinthians", [2012]),
  ...titles("libertadores", "atletico-mineiro", [2013]),
  ...titles("libertadores", "san-lorenzo", [2014]),
  ...titles("libertadores", "fluminense", [2023]),
  ...titles("libertadores", "botafogo", [2024]),

  // Copa Sudamericana
  ...titles("sudamericana", "san-lorenzo", [2002]),
  ...titles("sudamericana", "boca", [2004, 2005]),
  ...titles("sudamericana", "arsenal-sarandi", [2007]),
  ...titles("sudamericana", "internacional", [2008]),
  ...titles("sudamericana", "ldu", [2009, 2023]),
  ...titles("sudamericana", "independiente", [2010, 2017]),
  ...titles("sudamericana", "u-de-chile", [2011]),
  ...titles("sudamericana", "sao-paulo", [2012]),
  ...titles("sudamericana", "lanus", [2013]),
  ...titles("sudamericana", "river", [2014]),
  ...titles("sudamericana", "independiente-del-valle", [2019, 2022]),
  ...titles("sudamericana", "defensa-y-justicia", [2020]),
  ...titles("sudamericana", "racing", [2024]),

  // Copa Intercontinental
  ...titles("intercontinental", "penarol", [1961, 1966, 1982]),
  ...titles("intercontinental", "santos", [1962, 1963]),
  ...titles("intercontinental", "racing", [1967]),
  ...titles("intercontinental", "estudiantes", [1968]),
  ...titles("intercontinental", "nacional", [1971, 1980, 1988]),
  ...titles("intercontinental", "independiente", [1973, 1984]),
  ...titles("intercontinental", "boca", [1977, 2000, 2003]),
  ...titles("intercontinental", "flamengo", [1981]),
  ...titles("intercontinental", "gremio", [1983]),
  ...titles("intercontinental", "river", [1986]),
  ...titles("intercontinental", "sao-paulo", [1992, 1993]),
  ...titles("intercontinental", "velez", [1994]),
  ...titles("intercontinental", "real-madrid", [1960, 1998, 2002]),

  // Mundial de Clubes FIFA
  ...titles("club-world-cup", "corinthians", [2000, 2012]),
  ...titles("club-world-cup", "sao-paulo", [2005]),
  ...titles("club-world-cup", "internacional", [2006]),

  // Copa Argentina
  ...titles("copa-argentina", "boca", [2012, 2015]),
  ...titles("copa-argentina", "arsenal-sarandi", [2013]),
  ...titles("copa-argentina", "huracan", [2014]),
  ...titles("copa-argentina", "river", [2016, 2017, 2019]),
  ...titles("copa-argentina", "rosario-central", [2018]),
  ...titles("copa-argentina", "estudiantes", [2023]),
];
