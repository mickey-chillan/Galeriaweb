import * as THREE from 'three';

/**
 * Converts geographic coordinates (degrees) to a 3D point on a sphere of given radius,
 * matching Three.js SphereGeometry equirectangular UV projection.
 */
export function latLngToVector3(
  lat: number,
  lng: number,
  radius: number,
  target = new THREE.Vector3(),
): THREE.Vector3 {
  const latRad = THREE.MathUtils.degToRad(lat);
  const lngRad = THREE.MathUtils.degToRad(lng);

  const x = radius * Math.cos(latRad) * Math.cos(lngRad);
  const y = radius * Math.sin(latRad);
  const z = -radius * Math.cos(latRad) * Math.sin(lngRad);

  return target.set(x, y, z);
}

/**
 * Converts a 3D point on the sphere surface back to geographic coordinates (degrees).
 */
export function vector3ToLatLng(point: THREE.Vector3): { lat: number; lng: number } {
  const normalized = point.clone().normalize();
  const lat = THREE.MathUtils.radToDeg(
    Math.asin(THREE.MathUtils.clamp(normalized.y, -1, 1)),
  );
  const lng = THREE.MathUtils.radToDeg(Math.atan2(-normalized.z, normalized.x));
  return {
    lat: Number(lat.toFixed(4)),
    lng: Number(lng.toFixed(4)),
  };
}

/**
 * Generates a Firestore-safe ASCII document ID matching ^[a-zA-Z0-9_\-]+$.
 */
export function toSafeDocId(prefix: string, raw: string): string {
  const slug = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  const randomSuffix = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${slug || 'destino'}-${randomSuffix}`;
}

export function formatCoords(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'O';
  return `${Math.abs(lat).toFixed(2)}° ${latDir} · ${Math.abs(lng).toFixed(2)}° ${lngDir}`;
}
