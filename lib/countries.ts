export interface CountryInfo {
  name: string;
  demonym: string;
  region: "CONMEBOL" | "EUROPA" | "RESTO";
}

export const COUNTRIES: Record<string, CountryInfo> = {
  AR: { name: "Argentina", demonym: "argentino", region: "CONMEBOL" },
  UY: { name: "Uruguay", demonym: "uruguayo", region: "CONMEBOL" },
  BR: { name: "Brasil", demonym: "brasileño", region: "CONMEBOL" },
  CL: { name: "Chile", demonym: "chileno", region: "CONMEBOL" },
  CO: { name: "Colombia", demonym: "colombiano", region: "CONMEBOL" },
  PY: { name: "Paraguay", demonym: "paraguayo", region: "CONMEBOL" },
  EC: { name: "Ecuador", demonym: "ecuatoriano", region: "CONMEBOL" },
  PE: { name: "Perú", demonym: "peruano", region: "CONMEBOL" },
  BO: { name: "Bolivia", demonym: "boliviano", region: "CONMEBOL" },
  VE: { name: "Venezuela", demonym: "venezolano", region: "CONMEBOL" },
  ES: { name: "España", demonym: "español", region: "EUROPA" },
  EN: { name: "Inglaterra", demonym: "inglés", region: "EUROPA" },
  IT: { name: "Italia", demonym: "italiano", region: "EUROPA" },
  FR: { name: "Francia", demonym: "francés", region: "EUROPA" },
  DE: { name: "Alemania", demonym: "alemán", region: "EUROPA" },
  PT: { name: "Portugal", demonym: "portugués", region: "EUROPA" },
  NL: { name: "Países Bajos", demonym: "neerlandés", region: "EUROPA" },
  BE: { name: "Bélgica", demonym: "belga", region: "EUROPA" },
  RU: { name: "Rusia", demonym: "ruso", region: "EUROPA" },
  TR: { name: "Turquía", demonym: "turco", region: "EUROPA" },
  MX: { name: "México", demonym: "mexicano", region: "RESTO" },
  US: { name: "Estados Unidos", demonym: "estadounidense", region: "RESTO" },
  CN: { name: "China", demonym: "chino", region: "RESTO" },
  SA: { name: "Arabia Saudita", demonym: "saudí", region: "RESTO" },
};

export const EUROPE = Object.entries(COUNTRIES)
  .filter(([, c]) => c.region === "EUROPA")
  .map(([code]) => code);

export function countryName(code: string): string {
  return COUNTRIES[code]?.name ?? code;
}

export function demonym(code: string): string {
  return COUNTRIES[code]?.demonym ?? code;
}
