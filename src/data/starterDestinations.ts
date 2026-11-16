import type {
  CountryRecord,
  TravelPhoto,
  TravelPin,
  TravelReference,
  TravelRegion,
} from '../types/travel';

export interface StarterCountrySeed {
  id: string;
  name: string;
  region: TravelRegion;
  code: string;
}

export interface StarterPinSeed {
  id: string;
  countryId: string;
  countryName: string;
  cityName: string;
  region: TravelRegion;
  lat: number;
  lng: number;
  visitDate: string;
  notes: string;
  routeGroup: string;
}

export interface StarterRefSeed {
  id: string;
  pinId: string;
  title: string;
  detail: string;
  url: string;
}

export interface StarterPhotoSeed {
  id: string;
  pinId: string;
  cityName: string;
  countryName: string;
  imageUrl: string;
  caption: string;
  lat: number;
  lng: number;
  takenAt: string;
  hasGps: boolean;
}

export const STARTER_COUNTRIES: StarterCountrySeed[] = [
  { id: 'ar', name: 'Argentina', region: 'Sudamérica', code: 'AR' },
  { id: 'bo', name: 'Bolivia', region: 'Sudamérica', code: 'BO' },
  { id: 'pe', name: 'Perú', region: 'Sudamérica', code: 'PE' },
  { id: 'py', name: 'Paraguay', region: 'Sudamérica', code: 'PY' },
  { id: 'ec', name: 'Ecuador', region: 'Sudamérica', code: 'EC' },
  { id: 'br', name: 'Brasil', region: 'Sudamérica', code: 'BR' },
  { id: 'es', name: 'España', region: 'Europa', code: 'ES' },
  { id: 'it', name: 'Italia', region: 'Europa', code: 'IT' },
  { id: 'gb', name: 'Reino Unido', region: 'Europa', code: 'GB' },
  { id: 'fr', name: 'Francia', region: 'Europa', code: 'FR' },
  { id: 'be', name: 'Bélgica', region: 'Europa', code: 'BE' },
  { id: 'nl', name: 'Países Bajos', region: 'Europa', code: 'NL' },
  { id: 'de', name: 'Alemania', region: 'Europa', code: 'DE' },
];

export const STARTER_PINS: StarterPinSeed[] = [
  // Argentina
  {
    id: 'ar-mendoza',
    countryId: 'ar',
    countryName: 'Argentina',
    cityName: 'Mendoza',
    region: 'Sudamérica',
    lat: -32.8895,
    lng: -68.8458,
    visitDate: 'Viaje registrado',
    notes: 'Tierra de viñedos al pie de la cordillera de los Andes, alamedas tranquilas y atardeceres dorados frente al Aconcagua.',
    routeGroup: 'Cruce Andino',
  },
  {
    id: 'ar-buenos-aires',
    countryId: 'ar',
    countryName: 'Argentina',
    cityName: 'Buenos Aires',
    region: 'Sudamérica',
    lat: -34.6037,
    lng: -58.3816,
    visitDate: 'Viaje registrado',
    notes: 'Avenidas iluminadas, cafés históricos, librerías en antiguos teatros y paseos nocturnos por Puerto Madero y San Telmo.',
    routeGroup: 'Río de la Plata',
  },
  {
    id: 'ar-comodoro-rivadavia',
    countryId: 'ar',
    countryName: 'Argentina',
    cityName: 'Comodoro Rivadavia',
    region: 'Sudamérica',
    lat: -45.8641,
    lng: -67.4966,
    visitDate: 'Viaje registrado',
    notes: 'Viento patagónico junto al golfo San Jorge, mesetas costeras y horizonte abierto al Atlántico sur.',
    routeGroup: 'Patagonia Atlántica',
  },

  // Bolivia
  {
    id: 'bo-titicaca',
    countryId: 'bo',
    countryName: 'Bolivia',
    cityName: 'Lago Titicaca',
    region: 'Sudamérica',
    lat: -16.1667,
    lng: -69.085,
    visitDate: 'Viaje registrado',
    notes: 'Inicio del recorrido altiplánico desde Copacabana y la Isla del Sol hacia La Paz, entre aguas azules a más de 3.800 metros.',
    routeGroup: 'Titicaca a La Paz',
  },
  {
    id: 'bo-la-paz',
    countryId: 'bo',
    countryName: 'Bolivia',
    cityName: 'La Paz',
    region: 'Sudamérica',
    lat: -16.4897,
    lng: -68.1193,
    visitDate: 'Viaje registrado',
    notes: 'Llegada desde el Lago Titicaca: miradores en teleférico sobre el valle andino iluminado por la noche frente al Illimani.',
    routeGroup: 'Titicaca a La Paz',
  },

  // Perú
  {
    id: 'pe-tacna',
    countryId: 'pe',
    countryName: 'Perú',
    cityName: 'Tacna',
    region: 'Sudamérica',
    lat: -18.0146,
    lng: -70.2536,
    visitDate: 'Viaje registrado',
    notes: 'Puerta sur del Perú, plazas soleadas y gastronomía regional en ruta hacia el sur andino.',
    routeGroup: 'Ruta Sur Perú',
  },
  {
    id: 'pe-arequipa',
    countryId: 'pe',
    countryName: 'Perú',
    cityName: 'Arequipa',
    region: 'Sudamérica',
    lat: -16.409,
    lng: -71.5375,
    visitDate: 'Viaje registrado',
    notes: 'Arquitectura de sillar blanco volcánico bajo la silueta del volcán Misti y claustros silenciosos en Santa Catalina.',
    routeGroup: 'Ruta Sur Perú',
  },
  {
    id: 'pe-cusco',
    countryId: 'pe',
    countryName: 'Perú',
    cityName: 'Cusco',
    region: 'Sudamérica',
    lat: -13.5319,
    lng: -71.9675,
    visitDate: 'Viaje registrado',
    notes: 'Muros incas en San Blas, Plaza de Armas encendida al anochecer y base inolvidable para recorrer el Valle Sagrado.',
    routeGroup: 'Andes Centrales',
  },
  {
    id: 'pe-lima',
    countryId: 'pe',
    countryName: 'Perú',
    cityName: 'Lima',
    region: 'Sudamérica',
    lat: -12.0464,
    lng: -77.0428,
    visitDate: 'Viaje registrado',
    notes: 'Acantilados de Miraflores sobre el Pacífico, casonas de Barranco y cocina peruana inolvidable.',
    routeGroup: 'Costa Pacífico',
  },
  {
    id: 'pe-mancora',
    countryId: 'pe',
    countryName: 'Perú',
    cityName: 'Máncora',
    region: 'Sudamérica',
    lat: -4.1078,
    lng: -81.0475,
    visitDate: 'Viaje registrado',
    notes: 'Playas cálidas del norte peruano, olas suaves al caer el sol y brisa marina nocturna.',
    routeGroup: 'Costa Norte Perú',
  },
  {
    id: 'pe-tumbes',
    countryId: 'pe',
    countryName: 'Perú',
    cityName: 'Tumbes',
    region: 'Sudamérica',
    lat: -3.5669,
    lng: -80.4515,
    visitDate: 'Viaje registrado',
    notes: 'Manglares tropicales y frontera norte rumbo a la costa ecuatoriana.',
    routeGroup: 'Costa Norte Perú',
  },

  // Paraguay
  {
    id: 'py-asuncion',
    countryId: 'py',
    countryName: 'Paraguay',
    cityName: 'Asunción',
    region: 'Sudamérica',
    lat: -25.2637,
    lng: -57.5759,
    visitDate: 'Viaje registrado',
    notes: 'Costanera sobre el río Paraguay, casonas coloniales y tardes cálidas entre lapachos.',
    routeGroup: 'Cuenca del Paraná',
  },
  {
    id: 'py-ciudad-del-este',
    countryId: 'py',
    countryName: 'Paraguay',
    cityName: 'Ciudad del Este',
    region: 'Sudamérica',
    lat: -25.5097,
    lng: -54.6111,
    visitDate: 'Viaje registrado',
    notes: 'Cruce del Puente de la Amistad sobre el río Paraná y puerta comercial hacia la Triple Frontera.',
    routeGroup: 'Triple Frontera',
  },
  {
    id: 'py-iguazu',
    countryId: 'py',
    countryName: 'Paraguay',
    cityName: 'Iguazú',
    region: 'Sudamérica',
    lat: -25.5972,
    lng: -54.5786,
    visitDate: 'Viaje registrado',
    notes: 'Entorno de selva subtropical y el encuentro majestuoso de los ríos Iguazú y Paraná en la Triple Frontera.',
    routeGroup: 'Triple Frontera',
  },

  // Ecuador
  {
    id: 'ec-guayaquil',
    countryId: 'ec',
    countryName: 'Ecuador',
    cityName: 'Guayaquil',
    region: 'Sudamérica',
    lat: -2.171,
    lng: -79.9224,
    visitDate: 'Viaje registrado',
    notes: 'Malecón 2000 junto al río Guayas y subida colorida por los escalones del barrio Las Peñas.',
    routeGroup: 'Pacífico Ecuatoriano',
  },
  {
    id: 'ec-montanita',
    countryId: 'ec',
    countryName: 'Ecuador',
    cityName: 'Montañita',
    region: 'Sudamérica',
    lat: -1.8256,
    lng: -80.7531,
    visitDate: 'Viaje registrado',
    notes: 'Pueblo costero bohemio, música junto al mar y atardeceres dorados en la Ruta del Spondylus.',
    routeGroup: 'Pacífico Ecuatoriano',
  },

  // Brasil
  {
    id: 'br-foz-ciudad-este',
    countryId: 'br',
    countryName: 'Brasil',
    cityName: 'Foz do Iguaçu · Ciudad del Este',
    region: 'Sudamérica',
    lat: -25.5469,
    lng: -54.5882,
    visitDate: 'Viaje registrado',
    notes: 'Vertiente brasileña de la Triple Frontera en conexión directa con Ciudad del Este y las Cataratas.',
    routeGroup: 'Triple Frontera',
  },
  {
    id: 'br-rio-de-janeiro',
    countryId: 'br',
    countryName: 'Brasil',
    cityName: 'Río de Janeiro',
    region: 'Sudamérica',
    lat: -22.9068,
    lng: -43.1729,
    visitDate: 'Viaje registrado',
    notes: 'Pan de Azúcar iluminado sobre la bahía de Guanabara, Copacabana de noche y vistas desde el Corcovado.',
    routeGroup: 'Costa Atlántica Brasil',
  },
  {
    id: 'br-buzios',
    countryId: 'br',
    countryName: 'Brasil',
    cityName: 'Búzios',
    region: 'Sudamérica',
    lat: -22.7469,
    lng: -41.8817,
    visitDate: 'Viaje registrado',
    notes: 'Península de calas turquesas, paseos por Rua das Pedras y miradores tranquilos al caer la tarde.',
    routeGroup: 'Costa Atlántica Brasil',
  },

  // España
  {
    id: 'es-madrid',
    countryId: 'es',
    countryName: 'España',
    cityName: 'Madrid',
    region: 'Europa',
    lat: 40.4168,
    lng: -3.7038,
    visitDate: 'Viaje registrado',
    notes: 'Paseos nocturnos desde Gran Vía hasta el Palacio Real, Retiro y terrazas del Barrio de las Letras.',
    routeGroup: 'Ibérica',
  },
  {
    id: 'es-barcelona',
    countryId: 'es',
    countryName: 'España',
    cityName: 'Barcelona',
    region: 'Europa',
    lat: 41.3874,
    lng: 2.1686,
    visitDate: 'Viaje registrado',
    notes: 'Modernismo de Gaudí, callejuelas del Barrio Gótico y brisa mediterránea frente al puerto.',
    routeGroup: 'Ibérica',
  },

  // Italia
  {
    id: 'it-roma',
    countryId: 'it',
    countryName: 'Italia',
    cityName: 'Roma',
    region: 'Europa',
    lat: 41.9028,
    lng: 12.4964,
    visitDate: 'Viaje registrado',
    notes: 'Coliseo y Foro iluminados al anochecer, Fontana di Trevi y cenas en Trastevere.',
    routeGroup: 'Gran Tour Italiano',
  },
  {
    id: 'it-asis',
    countryId: 'it',
    countryName: 'Italia',
    cityName: 'Asís',
    region: 'Europa',
    lat: 43.0707,
    lng: 12.6196,
    visitDate: 'Viaje registrado',
    notes: 'Pueblo medieval de piedra rosada en las colinas de Umbría y serenidad absoluta desde su basílica.',
    routeGroup: 'Gran Tour Italiano',
  },
  {
    id: 'it-florencia',
    countryId: 'it',
    countryName: 'Italia',
    cityName: 'Florencia',
    region: 'Europa',
    lat: 43.7696,
    lng: 11.2558,
    visitDate: 'Viaje registrado',
    notes: 'Atardecer dorado sobre el Ponte Vecchio desde Piazzale Michelangelo y cúpula de Brunelleschi.',
    routeGroup: 'Gran Tour Italiano',
  },
  {
    id: 'it-pisa',
    countryId: 'it',
    countryName: 'Italia',
    cityName: 'Pisa',
    region: 'Europa',
    lat: 43.7228,
    lng: 10.4017,
    visitDate: 'Viaje registrado',
    notes: 'Mármol blanco de la Piazza dei Miracoli y el curso apacible del río Arno.',
    routeGroup: 'Gran Tour Italiano',
  },
  {
    id: 'it-venecia',
    countryId: 'it',
    countryName: 'Italia',
    cityName: 'Venecia',
    region: 'Europa',
    lat: 45.4408,
    lng: 12.3155,
    visitDate: 'Viaje registrado',
    notes: 'Reflejos ámbar sobre el Gran Canal y el Puente de Rialto cuando cae la niebla nocturna.',
    routeGroup: 'Gran Tour Italiano',
  },
  {
    id: 'it-milan',
    countryId: 'it',
    countryName: 'Italia',
    cityName: 'Milán',
    region: 'Europa',
    lat: 45.4642,
    lng: 9.19,
    visitDate: 'Viaje registrado',
    notes: 'Agujas góticas del Duomo iluminadas, Galleria Vittorio Emanuele y canales de Navigli.',
    routeGroup: 'Gran Tour Italiano',
  },

  // Reino Unido
  {
    id: 'gb-londres',
    countryId: 'gb',
    countryName: 'Reino Unido',
    cityName: 'Londres',
    region: 'Europa',
    lat: 51.5072,
    lng: -0.1276,
    visitDate: 'Viaje registrado',
    notes: 'Luces del Támesis entre Westminster y Tower Bridge, museos gratuitos y barrios con historia.',
    routeGroup: 'Europa Occidental',
  },

  // Francia
  {
    id: 'fr-paris',
    countryId: 'fr',
    countryName: 'Francia',
    cityName: 'París',
    region: 'Europa',
    lat: 48.8566,
    lng: 2.3522,
    visitDate: 'Viaje registrado',
    notes: 'Orillas del Sena iluminadas con faroles dorados, Notre-Dame y caminatas nocturnas por Montmartre.',
    routeGroup: 'Europa Occidental',
  },
  {
    id: 'fr-toulouse',
    countryId: 'fr',
    countryName: 'Francia',
    cityName: 'Toulouse',
    region: 'Europa',
    lat: 43.6047,
    lng: 1.4442,
    visitDate: 'Viaje registrado',
    notes: 'La ciudad rosa junto al río Garona, fachadas de ladrillo cálido y ambiente universitario.',
    routeGroup: 'Europa Occidental',
  },

  // Bélgica
  {
    id: 'be-brujas',
    countryId: 'be',
    countryName: 'Bélgica',
    cityName: 'Brujas',
    region: 'Europa',
    lat: 51.2093,
    lng: 3.2247,
    visitDate: 'Viaje registrado',
    notes: 'Canales medievales silenciosos, campanarios reflejados en el agua y chocolaterías artesanales.',
    routeGroup: 'Países Bajos y Flandes',
  },

  // Países Bajos
  {
    id: 'nl-amsterdam',
    countryId: 'nl',
    countryName: 'Países Bajos',
    cityName: 'Ámsterdam',
    region: 'Europa',
    lat: 52.3676,
    lng: 4.9041,
    visitDate: 'Viaje registrado',
    notes: 'Puentes iluminados sobre el cinturón de canales, bicicletas al anochecer y fachadas estrechas.',
    routeGroup: 'Países Bajos y Flandes',
  },
  {
    id: 'nl-zaandam',
    countryId: 'nl',
    countryName: 'Países Bajos',
    cityName: 'Zaandam',
    region: 'Europa',
    lat: 52.442,
    lng: 4.8292,
    visitDate: 'Viaje registrado',
    notes: 'Arquitectura tradicional de madera verde apilada y parada previa rumbo a los molinos del Zaan.',
    routeGroup: 'Países Bajos y Flandes',
  },
  {
    id: 'nl-zaanse-schans',
    countryId: 'nl',
    countryName: 'Países Bajos',
    cityName: 'Zaanse Schans',
    region: 'Europa',
    lat: 52.4731,
    lng: 4.8166,
    visitDate: 'Viaje registrado',
    notes: 'Molinos históricos girando junto al río Zaan entre praderas húmedas y casas tradicionales.',
    routeGroup: 'Países Bajos y Flandes',
  },

  // Alemania
  {
    id: 'de-berlin',
    countryId: 'de',
    countryName: 'Alemania',
    cityName: 'Berlín',
    region: 'Europa',
    lat: 52.52,
    lng: 13.405,
    visitDate: 'Viaje registrado',
    notes: 'Puerta de Brandeburgo nocturna, historia viva en cada avenida y miradores junto al río Spree.',
    routeGroup: 'Europa Central',
  },
];

export const STARTER_REFERENCES: StarterRefSeed[] = [
  {
    id: 'ref-titicaca-lapaz',
    pinId: 'bo-titicaca',
    title: 'Travesía Lago Titicaca → La Paz',
    detail: 'Cruce por el estrecho de Tiquina y descenso panorámico hacia el valle de La Paz.',
    url: '',
  },
  {
    id: 'ref-cusco-plaza',
    pinId: 'pe-cusco',
    title: 'Barrio de San Blas y Mirador de San Cristóbal',
    detail: 'Ideal al caer la tarde para fotografiar los tejados coloniales encendidos.',
    url: '',
  },
  {
    id: 'ref-triple-frontera',
    pinId: 'py-iguazu',
    title: 'Hito Tres Fronteras (Paraguay · Brasil · Argentina)',
    detail: 'Conexión fluvial entre Ciudad del Este, Foz do Iguaçu y Puerto Iguazú.',
    url: '',
  },
  {
    id: 'ref-zaan-route',
    pinId: 'nl-zaanse-schans',
    title: 'Ruta desde Ámsterdam Central vía Zaandam',
    detail: 'Tren directo de 17 minutos hasta Zaandijk Zaanse Schans.',
    url: '',
  },
];

export const STARTER_PHOTOS: StarterPhotoSeed[] = [
  {
    id: 'photo-cusco-night',
    pinId: 'pe-cusco',
    cityName: 'Cusco',
    countryName: 'Perú',
    imageUrl: '/src/assets/images/travel_cusco_night_1794852226870.jpg',
    caption: 'Plaza de Armas y tejados de Cusco al anochecer andino',
    lat: -13.5319,
    lng: -71.9675,
    takenAt: 'Referencia inicial',
    hasGps: true,
  },
  {
    id: 'photo-buenos-aires-night',
    pinId: 'ar-buenos-aires',
    cityName: 'Buenos Aires',
    countryName: 'Argentina',
    imageUrl: '/src/assets/images/travel_buenos_aires_night_1794852226124.jpg',
    caption: 'Luces doradas sobre la 9 de Julio y Puerto Madero',
    lat: -34.6037,
    lng: -58.3816,
    takenAt: 'Referencia inicial',
    hasGps: true,
  },
  {
    id: 'photo-paris-night',
    pinId: 'fr-paris',
    cityName: 'París',
    countryName: 'Francia',
    imageUrl: '/src/assets/images/travel_paris_night_1794852227942.jpg',
    caption: 'Faroles cálidos junto al Sena y Notre-Dame de noche',
    lat: 48.8566,
    lng: 2.3522,
    takenAt: 'Referencia inicial',
    hasGps: true,
  },
  {
    id: 'photo-venice-night',
    pinId: 'it-venecia',
    cityName: 'Venecia',
    countryName: 'Italia',
    imageUrl: '/src/assets/images/travel_venice_night_1794852228995.jpg',
    caption: 'Gran Canal y Puente de Rialto iluminados sobre el agua',
    lat: 45.4408,
    lng: 12.3155,
    takenAt: 'Referencia inicial',
    hasGps: true,
  },
];

export function buildGuestStarterState(): {
  countries: CountryRecord[];
  pins: TravelPin[];
  references: TravelReference[];
  photos: TravelPhoto[];
} {
  return {
    countries: STARTER_COUNTRIES.map((c) => ({ ...c, ownerId: 'guest' })),
    pins: STARTER_PINS.map((p) => ({ ...p, ownerId: 'guest' })),
    references: STARTER_REFERENCES.map((r) => ({ ...r, ownerId: 'guest' })),
    photos: STARTER_PHOTOS.map((ph) => ({ ...ph, ownerId: 'guest' })),
  };
}

// Built-in coordinate presets for fast lookup when adding new countries/cities manually
export interface CityPreset {
  city: string;
  country: string;
  code: string;
  region: TravelRegion;
  lat: number;
  lng: number;
}

export const QUICK_CITY_PRESETS: CityPreset[] = [
  { city: 'Santiago', country: 'Chile', code: 'CL', region: 'Sudamérica', lat: -33.4489, lng: -70.6693 },
  { city: 'Valparaíso', country: 'Chile', code: 'CL', region: 'Sudamérica', lat: -33.0472, lng: -71.6127 },
  { city: 'Montevideo', country: 'Uruguay', code: 'UY', region: 'Sudamérica', lat: -34.9011, lng: -56.1645 },
  { city: 'Punta del Este', country: 'Uruguay', code: 'UY', region: 'Sudamérica', lat: -34.9488, lng: -54.9367 },
  { city: 'Bogotá', country: 'Colombia', code: 'CO', region: 'Sudamérica', lat: 4.711, lng: -74.0721 },
  { city: 'Cartagena', country: 'Colombia', code: 'CO', region: 'Sudamérica', lat: 10.391, lng: -75.4794 },
  { city: 'Medellín', country: 'Colombia', code: 'CO', region: 'Sudamérica', lat: 6.2442, lng: -75.5812 },
  { city: 'Quito', country: 'Ecuador', code: 'EC', region: 'Sudamérica', lat: -0.1807, lng: -78.4678 },
  { city: 'São Paulo', country: 'Brasil', code: 'BR', region: 'Sudamérica', lat: -23.5505, lng: -46.6333 },
  { city: 'Salvador de Bahía', country: 'Brasil', code: 'BR', region: 'Sudamérica', lat: -12.9714, lng: -38.5014 },
  { city: 'Bariloche', country: 'Argentina', code: 'AR', region: 'Sudamérica', lat: -41.1335, lng: -71.3103 },
  { city: 'Ushuaia', country: 'Argentina', code: 'AR', region: 'Sudamérica', lat: -54.8019, lng: -68.303 },
  { city: 'Lisboa', country: 'Portugal', code: 'PT', region: 'Europa', lat: 38.7223, lng: -9.1393 },
  { city: 'Oporto', country: 'Portugal', code: 'PT', region: 'Europa', lat: 41.1579, lng: -8.6291 },
  { city: 'Sevilla', country: 'España', code: 'ES', region: 'Europa', lat: 37.3891, lng: -5.9845 },
  { city: 'Praga', country: 'República Checa', code: 'CZ', region: 'Europa', lat: 50.0755, lng: 14.4378 },
  { city: 'Viena', country: 'Austria', code: 'AT', region: 'Europa', lat: 48.2082, lng: 16.3738 },
  { city: 'Zúrich', country: 'Suiza', code: 'CH', region: 'Europa', lat: 47.3769, lng: 8.5417 },
  { city: 'Atenas', country: 'Grecia', code: 'GR', region: 'Europa', lat: 37.9838, lng: 23.7275 },
  { city: 'Estambul', country: 'Turquía', code: 'TR', region: 'Europa', lat: 41.0082, lng: 28.9784 },
  { city: 'Nueva York', country: 'Estados Unidos', code: 'US', region: 'Norteamérica', lat: 40.7128, lng: -74.006 },
  { city: 'Ciudad de México', country: 'México', code: 'MX', region: 'Norteamérica', lat: 19.4326, lng: -99.1332 },
  { city: 'Tokio', country: 'Japón', code: 'JP', region: 'Asia', lat: 35.6762, lng: 139.6503 },
  { city: 'Kioto', country: 'Japón', code: 'JP', region: 'Asia', lat: 35.0116, lng: 135.7681 },
  { city: 'Marrakech', country: 'Marruecos', code: 'MA', region: 'África', lat: 31.6295, lng: -7.9811 },
  { city: 'Sídney', country: 'Australia', code: 'AU', region: 'Oceanía', lat: -33.8688, lng: 151.2093 },
];
