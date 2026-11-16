import exifr from 'exifr';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import countriesAtlas from 'world-atlas/countries-110m.json';
import type { TravelPin, TravelRegion } from '../types/travel';
import { inferRegionFromLatLng } from './globeTexture';

export interface ExtractedPhotoMetadata {
  lat: number | null;
  lng: number | null;
  takenAt: string;
  cameraLabel: string;
  hasGps: boolean;
}

const COUNTRY_SPANISH_MAP: Record<string, { name: string; code: string }> = {
  Argentina: { name: 'Argentina', code: 'AR' },
  Bolivia: { name: 'Bolivia', code: 'BO' },
  Peru: { name: 'Perú', code: 'PE' },
  Paraguay: { name: 'Paraguay', code: 'PY' },
  Ecuador: { name: 'Ecuador', code: 'EC' },
  Brazil: { name: 'Brasil', code: 'BR' },
  Chile: { name: 'Chile', code: 'CL' },
  Uruguay: { name: 'Uruguay', code: 'UY' },
  Colombia: { name: 'Colombia', code: 'CO' },
  Venezuela: { name: 'Venezuela', code: 'VE' },
  Spain: { name: 'España', code: 'ES' },
  Italy: { name: 'Italia', code: 'IT' },
  'United Kingdom': { name: 'Reino Unido', code: 'GB' },
  France: { name: 'Francia', code: 'FR' },
  Belgium: { name: 'Bélgica', code: 'BE' },
  Netherlands: { name: 'Países Bajos', code: 'NL' },
  Germany: { name: 'Alemania', code: 'DE' },
  Portugal: { name: 'Portugal', code: 'PT' },
  Switzerland: { name: 'Suiza', code: 'CH' },
  Austria: { name: 'Austria', code: 'AT' },
  Greece: { name: 'Grecia', code: 'GR' },
  Turkey: { name: 'Turquía', code: 'TR' },
  'United States of America': { name: 'Estados Unidos', code: 'US' },
  Mexico: { name: 'México', code: 'MX' },
  Canada: { name: 'Canadá', code: 'CA' },
  Japan: { name: 'Japón', code: 'JP' },
  Morocco: { name: 'Marruecos', code: 'MA' },
  Australia: { name: 'Australia', code: 'AU' },
  'Czechia': { name: 'República Checa', code: 'CZ' },
  Poland: { name: 'Polonia', code: 'PL' },
  Croatia: { name: 'Croacia', code: 'HR' },
  Ireland: { name: 'Irlanda', code: 'IE' },
  Norway: { name: 'Noruega', code: 'NO' },
  Sweden: { name: 'Suecia', code: 'SE' },
  Denmark: { name: 'Dinamarca', code: 'DK' },
};

interface AtlasFeature {
  properties?: { name?: string };
  geometry: {
    type: string;
    coordinates: unknown;
  };
}

let cachedFeatures: AtlasFeature[] | null = null;

function getAtlasFeatures(): AtlasFeature[] {
  if (cachedFeatures) return cachedFeatures;
  const topology = countriesAtlas as unknown as Topology;
  const geo = feature(
    topology,
    topology.objects.countries as Parameters<typeof feature>[1],
  ) as unknown as { features: AtlasFeature[] };
  cachedFeatures = geo.features;
  return cachedFeatures;
}

function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(lng: number, lat: number, rings: number[][][]): boolean {
  if (!rings.length || !pointInRing(lng, lat, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(lng, lat, rings[i])) return false;
  }
  return true;
}

/**
 * Offline reverse-country lookup from GPS coordinates using world-atlas polygons.
 */
export function detectCountryFromCoordinates(
  lat: number,
  lng: number,
): { countryName: string; countryCode: string; region: TravelRegion } {
  const region = inferRegionFromLatLng(lat, lng);
  const features = getAtlasFeatures();

  for (const feat of features) {
    const geom = feat.geometry;
    let hit = false;
    if (geom.type === 'Polygon') {
      hit = pointInPolygon(lng, lat, geom.coordinates as number[][][]);
    } else if (geom.type === 'MultiPolygon') {
      const polys = geom.coordinates as number[][][][];
      for (const poly of polys) {
        if (pointInPolygon(lng, lat, poly)) {
          hit = true;
          break;
        }
      }
    }

    if (hit) {
      const rawName = feat.properties?.name || 'Destino Internacional';
      const mapped = COUNTRY_SPANISH_MAP[rawName];
      return {
        countryName: mapped ? mapped.name : rawName,
        countryCode: mapped ? mapped.code : rawName.slice(0, 2).toUpperCase(),
        region,
      };
    }
  }

  return {
    countryName: region === 'Sudamérica' ? 'Sudamérica' : 'Destino Internacional',
    countryCode: 'XX',
    region,
  };
}

/**
 * Haversine great-circle distance in kilometers between two GPS points.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestPin(
  lat: number,
  lng: number,
  pins: TravelPin[],
  maxDistanceKm = 55,
): { pin: TravelPin; distanceKm: number } | null {
  let bestPin: TravelPin | null = null;
  let bestDist = Infinity;

  for (const pin of pins) {
    const d = haversineKm(lat, lng, pin.lat, pin.lng);
    if (d < bestDist) {
      bestDist = d;
      bestPin = pin;
    }
  }

  if (bestPin && bestDist <= maxDistanceKm) {
    return { pin: bestPin, distanceKm: bestDist };
  }
  return null;
}

function formatDateValue(raw: unknown): string {
  if (!raw) return '';
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  if (typeof raw === 'string') {
    const parsed = new Date(raw.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'));
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    return raw.slice(0, 60);
  }
  return '';
}

/**
 * Extracts EXIF GPS coordinates and capture date from a local File or downloaded Blob.
 */
export async function extractPhotoExifMetadata(
  blob: Blob,
): Promise<ExtractedPhotoMetadata> {
  try {
    const [gps, exif] = await Promise.all([
      exifr.gps(blob).catch(() => null),
      exifr
        .parse(blob, {
          pick: ['DateTimeOriginal', 'CreateDate', 'Make', 'Model'],
        })
        .catch(() => null),
    ]);

    const lat =
      gps && typeof gps.latitude === 'number' && Number.isFinite(gps.latitude)
        ? Number(gps.latitude.toFixed(5))
        : null;
    const lng =
      gps && typeof gps.longitude === 'number' && Number.isFinite(gps.longitude)
        ? Number(gps.longitude.toFixed(5))
        : null;

    const takenAt = formatDateValue(exif?.DateTimeOriginal || exif?.CreateDate);
    const make = typeof exif?.Make === 'string' ? exif.Make.trim() : '';
    const model = typeof exif?.Model === 'string' ? exif.Model.trim() : '';
    const cameraLabel = [make, model].filter(Boolean).join(' ').slice(0, 60);

    return {
      lat,
      lng,
      takenAt,
      cameraLabel,
      hasGps: lat !== null && lng !== null,
    };
  } catch {
    return {
      lat: null,
      lng: null,
      takenAt: '',
      cameraLabel: '',
      hasGps: false,
    };
  }
}

export function cleanFileCaption(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .slice(0, 240);
}
