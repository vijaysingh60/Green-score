/**
 * "Use my current location" helpers (browser only).
 *  - getCurrentLocation: the browser Geolocation API, with friendly errors.
 *  - reverseGeocode: best-effort address + pincode from OpenStreetMap Nominatim. Optional: the form
 *    still works with just the coordinates if it fails.
 */

export type LocationFailure = 'UNSUPPORTED' | 'INSECURE' | 'DENIED' | 'UNAVAILABLE' | 'TIMEOUT';

export class LocationError extends Error {
  readonly reason: LocationFailure;

  constructor(reason: LocationFailure, message: string) {
    super(message);
    this.name = 'LocationError';
    this.reason = reason;
  }
}

export interface CurrentLocation {
  latitude: number;
  longitude: number;
  /** Horizontal accuracy in metres. */
  accuracyM: number;
}

export function getCurrentLocation(): Promise<CurrentLocation> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new LocationError('UNSUPPORTED', 'This browser can’t share your location. Pick a locality instead.'));
      return;
    }
    if (!window.isSecureContext) {
      reject(new LocationError('INSECURE', 'Location only works on https:// or localhost. Pick a locality instead.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyM: position.coords.accuracy,
        }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new LocationError('DENIED', 'Location permission was blocked. Allow it in your browser, or pick a locality.'));
        } else if (error.code === error.TIMEOUT) {
          reject(new LocationError('TIMEOUT', 'Finding your location took too long. Try again or pick a locality.'));
        } else {
          reject(new LocationError('UNAVAILABLE', 'Your location isn’t available right now. Pick a locality instead.'));
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  });
}

export interface PlaceGuess {
  address?: string;
  pincode?: string;
}

interface NominatimResponse {
  display_name?: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    postcode?: string;
  };
}

/** Returns null on any failure: callers must treat the result as optional. */
export async function reverseGeocode(latitude: number, longitude: number): Promise<PlaceGuess | null> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('zoom', '18');
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lon', String(longitude));
    const response = await fetch(url, { headers: { 'Accept-Language': 'en' }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const data = (await response.json()) as NominatimResponse;

    const a = data.address ?? {};
    const parts = [a.house_number, a.road, a.neighbourhood ?? a.suburb].filter(Boolean) as string[];
    const address =
      parts.length > 0 ? parts.join(', ') : data.display_name?.split(',').slice(0, 3).join(',').trim();
    const pincode = a.postcode?.replace(/\s+/g, '');
    return { address: address || undefined, pincode: pincode && /^[1-9]\d{5}$/.test(pincode) ? pincode : undefined };
  } catch {
    return null;
  }
}
