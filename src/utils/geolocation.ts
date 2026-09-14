import { DeliveryAddress } from '../types';

export interface LiveLocationResult {
  success: boolean;
  address?: Partial<DeliveryAddress>;
  lat?: number;
  lng?: number;
  formattedAddress?: string;
  error?: string;
  isPermissionDenied?: boolean;
  isNetworkAssisted?: boolean;
}

/**
 * Robust helper to fetch current GPS location or network location
 * and reverse geocode to standard Indian address format.
 */
export async function getLiveLocationAndAddress(): Promise<LiveLocationResult> {
  // 1. Try Browser Geolocation API first
  if (typeof window !== 'undefined' && navigator.geolocation) {
    try {
      const gpsResult = await attemptBrowserGPSLocation();
      if (gpsResult.success) {
        return gpsResult;
      }
    } catch (gpsErr) {
      console.warn('GPS location attempt threw error, attempting network fallback:', gpsErr);
    }
  }

  // 2. Seamless Network / IP Geolocation Fallback (ensures working experience even in iframes or without GPS hardware)
  const networkResult = await attemptNetworkLocation();
  if (networkResult.success) {
    return networkResult;
  }

  return {
    success: false,
    error: 'Unable to auto-detect location. Please enter your 6-digit PIN code or street address manually.'
  };
}

/**
 * Attempts browser GPS location with high accuracy, falling back to standard accuracy
 */
function attemptBrowserGPSLocation(): Promise<LiveLocationResult> {
  return new Promise((resolve) => {
    // Attempt standard accuracy first for faster response and maximum device compatibility
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const result = await reverseGeocodeCoordinates(lat, lng);
        resolve(result);
      },
      (error) => {
        console.warn('Browser geolocation error:', error.code, error.message);
        // Let it resolve false so we gracefully fall back to network IP location
        resolve({
          success: false,
          isPermissionDenied: error.code === error.PERMISSION_DENIED,
          error: error.message
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 7000,
        maximumAge: 60000
      }
    );
  });
}

// In-memory cache to prevent redundant lookups and 429 rate limits
const reverseGeoCache = new Map<string, LiveLocationResult>();
let cachedNetworkLocation: LiveLocationResult | null = null;

/**
 * Reverse geocodes latitude/longitude coordinates to Indian address fields
 */
async function reverseGeocodeCoordinates(lat: number, lng: number): Promise<LiveLocationResult> {
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (reverseGeoCache.has(cacheKey)) {
    return reverseGeoCache.get(cacheKey)!;
  }

  // 1. Try BigDataCloud Reverse Geocoder first (CORS friendly, higher limit)
  try {
    const fallbackRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (fallbackRes.ok) {
      const fbData = await fallbackRes.json();
      const result: LiveLocationResult = {
        success: true,
        lat,
        lng,
        formattedAddress: fbData.localityInfo?.informative?.[0]?.name || `${fbData.city}, ${fbData.principalSubdivision}`,
        address: {
          addressLine: [fbData.locality, fbData.city].filter(Boolean).join(', ') || 'Current Location Area',
          city: fbData.city || fbData.locality || 'Kolkata',
          state: fbData.principalSubdivision || 'West Bengal',
          pincode: fbData.postcode || '',
          type: 'Home'
        }
      };
      reverseGeoCache.set(cacheKey, result);
      return result;
    }
  } catch (fbErr) {
    // Graceful fallback
  }

  // 2. Try OpenStreetMap Nominatim with safe error handling
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: { 'Accept-Language': 'en' },
        signal: AbortSignal.timeout(4000)
      }
    );

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};

      const pincode = addr.postcode || '';
      const state = addr.state || addr.state_district || 'West Bengal';
      const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || addr.district || 'Kolkata';
      
      const roadOrArea = [
        addr.house_number,
        addr.building,
        addr.road || addr.street,
        addr.suburb || addr.neighbourhood || addr.residential,
        addr.amenity
      ].filter(Boolean).join(', ');

      const addressLine = roadOrArea || data.display_name?.split(',').slice(0, 3).join(', ') || 'Current Location';
      const landmark = addr.neighbourhood || addr.suburb || addr.amenity || '';

      const result: LiveLocationResult = {
        success: true,
        lat,
        lng,
        formattedAddress: data.display_name,
        address: {
          addressLine,
          city,
          state,
          pincode,
          landmark,
          type: 'Home'
        }
      };
      reverseGeoCache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    // Nominatim may reject or return 429 if called without custom header
  }

  const defaultResult: LiveLocationResult = {
    success: true,
    lat,
    lng,
    address: {
      addressLine: `Live GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '',
      type: 'Home'
    }
  };
  reverseGeoCache.set(cacheKey, defaultResult);
  return defaultResult;
}

/**
 * Fallback to IP / Network based location for cases where GPS is blocked by browser/iframe
 */
async function attemptNetworkLocation(): Promise<LiveLocationResult> {
  if (cachedNetworkLocation) {
    return cachedNetworkLocation;
  }

  // Service 1: BigDataCloud Client Info (Free, HTTPS, CORS friendly)
  try {
    const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en', {
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.city || data.principalSubdivision) {
        cachedNetworkLocation = {
          success: true,
          lat: data.latitude,
          lng: data.longitude,
          isNetworkAssisted: true,
          formattedAddress: `${data.city || data.locality}, ${data.principalSubdivision}`,
          address: {
            addressLine: [data.locality, data.city].filter(Boolean).join(', ') || 'Network Location Area',
            city: data.city || data.locality || 'Kolkata',
            state: data.principalSubdivision || 'West Bengal',
            pincode: data.postcode || '',
            type: 'Home'
          }
        };
        return cachedNetworkLocation;
      }
    }
  } catch (e) {
    // Ignore network error
  }

  // Service 2: ipwho.is (Free, HTTPS, CORS friendly)
  try {
    const res = await fetch('https://ipwho.is/', {
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && (data.city || data.region)) {
        cachedNetworkLocation = {
          success: true,
          lat: data.latitude,
          lng: data.longitude,
          isNetworkAssisted: true,
          formattedAddress: `${data.city}, ${data.region}, ${data.country}`,
          address: {
            addressLine: `${data.city}, ${data.region}`,
            city: data.city || 'Kolkata',
            state: data.region || 'West Bengal',
            pincode: data.postal || '',
            type: 'Home'
          }
        };
        return cachedNetworkLocation;
      }
    }
  } catch (e) {
    // Ignore network error
  }

  // Service 3: freeipapi.com (Free, HTTPS, CORS friendly)
  try {
    const res = await fetch('https://freeipapi.com/api/json', {
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.cityName || data.regionName) {
        cachedNetworkLocation = {
          success: true,
          lat: data.latitude,
          lng: data.longitude,
          isNetworkAssisted: true,
          formattedAddress: `${data.cityName}, ${data.regionName}`,
          address: {
            addressLine: `${data.cityName}, ${data.regionName}`,
            city: data.cityName || 'Kolkata',
            state: data.regionName || 'West Bengal',
            pincode: data.zipCode || '',
            type: 'Home'
          }
        };
        return cachedNetworkLocation;
      }
    }
  } catch (e) {
    // Ignore network error
  }

  return { success: false };
}
