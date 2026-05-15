export const COUNTRY_ISO3: Record<string, string> = {
  Angola: 'AGO',
  Benin: 'BEN',
  Botswana: 'BWA',
  'Burkina Faso': 'BFA',
  Burundi: 'BDI',
  Cameroon: 'CMR',
  'Central African Republic': 'CAF',
  Chad: 'TCD',
  Congo: 'COG',
  "Côte d'Ivoire": 'CIV',
  Djibouti: 'DJI',
  'DR Congo': 'COD',
  'Equatorial Guinea': 'GNQ',
  Eritrea: 'ERI',
  Eswatini: 'SWZ',
  Ethiopia: 'ETH',
  Gabon: 'GAB',
  Gambia: 'GMB',
  Ghana: 'GHA',
  Guinea: 'GIN',
  'Guinea-Bissau': 'GNB',
  Kenya: 'KEN',
  Lesotho: 'LSO',
  Liberia: 'LBR',
  Madagascar: 'MDG',
  Malawi: 'MWI',
  Mali: 'MLI',
  Mauritania: 'MRT',
  Mozambique: 'MOZ',
  Namibia: 'NAM',
  Niger: 'NER',
  Nigeria: 'NGA',
  Rwanda: 'RWA',
  Senegal: 'SEN',
  'Sierra Leone': 'SLE',
  Somalia: 'SOM',
  'South Africa': 'ZAF',
  'South Sudan': 'SSD',
  Tanzania: 'TZA',
  Togo: 'TGO',
  Uganda: 'UGA',
  Zambia: 'ZMB',
  Zimbabwe: 'ZWE',
};

export function slugifyCountry(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function slugifyPerson(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
