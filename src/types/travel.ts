export type TravelRegion =
  | 'Sudamérica'
  | 'Europa'
  | 'Norteamérica'
  | 'Asia'
  | 'África'
  | 'Oceanía';

export const TRAVEL_REGIONS: TravelRegion[] = [
  'Sudamérica',
  'Europa',
  'Norteamérica',
  'Asia',
  'África',
  'Oceanía',
];

export interface CountryRecord {
  id: string;
  ownerId: string;
  name: string;
  region: TravelRegion;
  code: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TravelPin {
  id: string;
  ownerId: string;
  countryId: string;
  countryName: string;
  cityName: string;
  region: TravelRegion;
  lat: number;
  lng: number;
  visitDate: string;
  notes: string;
  routeGroup: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TravelReference {
  id: string;
  ownerId: string;
  pinId: string;
  title: string;
  detail: string;
  url: string;
  createdAt?: unknown;
}

export interface TravelPhoto {
  id: string;
  ownerId: string;
  pinId: string;
  cityName: string;
  countryName: string;
  imageUrl: string;
  caption: string;
  lat: number;
  lng: number;
  takenAt: string;
  hasGps: boolean;
  createdAt?: unknown;
}

export interface NewPinDraft {
  countryName: string;
  countryCode: string;
  region: TravelRegion;
  cityName: string;
  lat: number;
  lng: number;
  visitDate: string;
  notes: string;
  routeGroup: string;
}

export type ActiveNavView = 'globo' | 'sudamerica' | 'europa' | 'galeria';
