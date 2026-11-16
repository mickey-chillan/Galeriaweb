import * as THREE from 'three';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import countriesAtlas from 'world-atlas/countries-110m.json';
import type { TravelPin, TravelRegion } from '../types/travel';

interface GeoFeature {
  type: string;
  properties?: { name?: string };
  geometry: {
    type: string;
    coordinates: unknown;
  };
}

// Major global night-light clusters so the nocturnal globe feels alive everywhere
const AMBIENT_CITY_LIGHTS: Array<[number, number, number]> = [
  // South America
  [-34.6, -58.38, 1.0], [-23.55, -46.63, 1.0], [-22.9, -43.17, 0.9], [-33.45, -70.67, 0.85],
  [-12.05, -77.04, 0.9], [-13.53, -71.97, 0.7], [-16.49, -68.12, 0.75], [-32.89, -68.85, 0.7],
  [-25.26, -57.58, 0.7], [-25.51, -54.61, 0.65], [-2.17, -79.92, 0.8], [-0.18, -78.47, 0.75],
  [4.71, -74.07, 0.9], [6.24, -75.58, 0.75], [10.48, -66.9, 0.8], [-34.9, -56.16, 0.75],
  [-31.42, -64.18, 0.75], [-32.95, -60.65, 0.65], [-19.92, -43.94, 0.85], [-15.79, -47.88, 0.8],
  [-12.97, -38.5, 0.75], [-8.05, -34.88, 0.7], [-3.73, -38.52, 0.7], [-30.03, -51.22, 0.75],
  // Europe
  [40.42, -3.7, 1.0], [41.39, 2.17, 0.95], [38.72, -9.14, 0.8], [37.39, -5.98, 0.7],
  [48.86, 2.35, 1.0], [43.6, 1.44, 0.75], [45.76, 4.84, 0.8], [43.3, 5.37, 0.75],
  [51.51, -0.13, 1.0], [53.48, -2.24, 0.85], [55.95, -3.19, 0.7], [53.35, -6.26, 0.7],
  [50.85, 4.35, 0.85], [51.21, 3.22, 0.65], [52.37, 4.9, 0.95], [51.92, 4.48, 0.85],
  [52.52, 13.4, 1.0], [48.14, 11.58, 0.85], [50.11, 8.68, 0.85], [53.55, 9.99, 0.8],
  [45.46, 9.19, 0.95], [45.44, 12.32, 0.75], [43.77, 11.26, 0.75], [41.9, 12.5, 0.95],
  [40.85, 14.27, 0.8], [47.37, 8.54, 0.75], [48.21, 16.37, 0.85], [50.08, 14.44, 0.8],
  [52.23, 21.01, 0.85], [47.5, 19.04, 0.8], [37.98, 23.73, 0.85], [41.01, 28.98, 0.95],
  [59.33, 18.07, 0.75], [55.68, 12.57, 0.75], [55.75, 37.62, 0.95], [59.93, 30.34, 0.8],
  // North America & Rest of World (subtle ambient horizon lights)
  [40.71, -74.0, 1.0], [41.88, -87.63, 0.9], [34.05, -118.24, 0.95], [37.77, -122.42, 0.85],
  [25.76, -80.19, 0.8], [43.65, -79.38, 0.85], [19.43, -99.13, 0.95], [20.66, -103.35, 0.75],
  [30.04, 31.24, 0.9], [33.57, -7.59, 0.75], [-26.2, 28.05, 0.8], [-33.92, 18.42, 0.75],
  [25.2, 55.27, 0.95], [19.08, 72.88, 0.95], [28.61, 77.21, 0.95], [1.35, 103.82, 0.9],
  [13.76, 100.5, 0.85], [31.23, 121.47, 1.0], [39.9, 116.41, 0.95], [22.32, 114.17, 0.95],
  [37.57, 126.98, 0.95], [35.68, 139.65, 1.0], [34.69, 135.5, 0.9], [-33.87, 151.21, 0.85],
  [-37.81, 144.96, 0.8],
];

function lonToX(lng: number, width: number): number {
  return ((lng + 180) / 360) * width;
}

function latToY(lat: number, height: number): number {
  return ((90 - lat) / 180) * height;
}

function drawPolygonRing(
  ctx: CanvasRenderingContext2D,
  ring: number[][],
  width: number,
  height: number,
) {
  if (!ring.length) return;
  let prevLng = ring[0][0];
  ctx.moveTo(lonToX(prevLng, width), latToY(ring[0][1], height));

  for (let i = 1; i < ring.length; i++) {
    const [lng, lat] = ring[i];
    // Avoid anti-meridian horizontal streak artifacts
    if (Math.abs(lng - prevLng) > 180) {
      ctx.moveTo(lonToX(lng, width), latToY(lat, height));
    } else {
      ctx.lineTo(lonToX(lng, width), latToY(lat, height));
    }
    prevLng = lng;
  }
}

function drawCityGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  intensity: number,
) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, `rgba(255, 232, 163, ${0.9 * intensity})`);
  grad.addColorStop(0.35, `rgba(245, 183, 66, ${0.5 * intensity})`);
  grad.addColorStop(1, 'rgba(245, 183, 66, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

export interface NightEarthTextures {
  albedoMap: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
}

export function createNightEarthTextures(
  pins: TravelPin[],
  maxAnisotropy: number,
): NightEarthTextures {
  const width = 2048;
  const height = 1024;

  // 1. Albedo Canvas (midnight oceans + dark slate continents + golden coastlines)
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = width;
  albedoCanvas.height = height;
  const ctx = albedoCanvas.getContext('2d')!;

  // Deep nocturnal ocean radial/vertical shading
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#050812');
  oceanGrad.addColorStop(0.5, '#070d1c');
  oceanGrad.addColorStop(1, '#040710');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle cartographic graticule grid
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
  ctx.lineWidth = 0.8;
  for (let lng = -165; lng <= 180; lng += 15) {
    const x = lonToX(lng, width);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const y = latToY(lat, height);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  // Equator subtle highlight
  ctx.strokeStyle = 'rgba(245, 183, 66, 0.14)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, latToY(0, height));
  ctx.lineTo(width, latToY(0, height));
  ctx.stroke();

  // Extract world-atlas country polygons
  const topology = countriesAtlas as unknown as Topology;
  const countriesGeo = feature(
    topology,
    topology.objects.countries as Parameters<typeof feature>[1],
  ) as unknown as { features: GeoFeature[] };

  // Draw landmasses + crisp coastlines
  ctx.fillStyle = '#121b2e';
  ctx.strokeStyle = 'rgba(245, 183, 66, 0.28)';
  ctx.lineWidth = 1.15;

  for (const feat of countriesGeo.features) {
    const geom = feat.geometry;
    ctx.beginPath();
    if (geom.type === 'Polygon') {
      const rings = geom.coordinates as number[][][];
      for (const ring of rings) {
        drawPolygonRing(ctx, ring, width, height);
      }
    } else if (geom.type === 'MultiPolygon') {
      const polys = geom.coordinates as number[][][][];
      for (const poly of polys) {
        for (const ring of poly) {
          drawPolygonRing(ctx, ring, width, height);
        }
      }
    }
    ctx.fill();
    ctx.stroke();
  }

  // 2. Emissive Canvas (golden city lights + illuminated user travel clusters)
  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = width;
  emissiveCanvas.height = height;
  const eCtx = emissiveCanvas.getContext('2d')!;
  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, width, height);

  // Subtle continental border glow on emissive map
  eCtx.strokeStyle = 'rgba(245, 183, 66, 0.14)';
  eCtx.lineWidth = 1;
  for (const feat of countriesGeo.features) {
    const geom = feat.geometry;
    eCtx.beginPath();
    if (geom.type === 'Polygon') {
      const rings = geom.coordinates as number[][][];
      for (const ring of rings) {
        drawPolygonRing(eCtx, ring, width, height);
      }
    } else if (geom.type === 'MultiPolygon') {
      const polys = geom.coordinates as number[][][][];
      for (const poly of polys) {
        for (const ring of poly) {
          drawPolygonRing(eCtx, ring, width, height);
        }
      }
    }
    eCtx.stroke();
  }

  // Render global city light clusters onto both maps
  for (const [lat, lng, strength] of AMBIENT_CITY_LIGHTS) {
    const x = lonToX(lng, width);
    const y = latToY(lat, height);
    drawCityGlow(ctx, x, y, 10 * strength, 0.55 * strength);
    drawCityGlow(eCtx, x, y, 11 * strength, 0.75 * strength);
  }

  // Render bright golden pools under every visited travel pin
  for (const pin of pins) {
    const x = lonToX(pin.lng, width);
    const y = latToY(pin.lat, height);
    drawCityGlow(ctx, x, y, 14, 0.95);
    drawCityGlow(eCtx, x, y, 16, 1.0);
  }

  const albedoMap = new THREE.CanvasTexture(albedoCanvas);
  albedoMap.colorSpace = THREE.SRGBColorSpace;
  albedoMap.anisotropy = Math.min(8, maxAnisotropy);
  albedoMap.needsUpdate = true;

  const emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.anisotropy = Math.min(8, maxAnisotropy);
  emissiveMap.needsUpdate = true;

  return { albedoMap, emissiveMap };
}

/**
 * Infers the most likely region from (lat, lng) when a user clicks directly on the 3D globe.
 */
export function inferRegionFromLatLng(lat: number, lng: number): TravelRegion {
  if (lat < 14 && lng >= -85 && lng <= -32) return 'Sudamérica';
  if (lat >= 34 && lat <= 72 && lng >= -25 && lng <= 45) return 'Europa';
  if (lat >= 14 && lng >= -170 && lng <= -50) return 'Norteamérica';
  if (lat >= -36 && lat <= 37 && lng >= -20 && lng <= 52) return 'África';
  if (lat <= -10 && lng >= 110) return 'Oceanía';
  return 'Asia';
}
