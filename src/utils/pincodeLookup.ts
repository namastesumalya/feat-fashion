import { getPincodeDistanceAndCentroid } from './deliveryEstimation';

export interface PincodeLookupResult {
  success: boolean;
  city: string;
  state: string;
  district?: string;
  postOffices?: string[];
  source?: 'india-post-api' | 'zippopotam' | 'postal-directory';
  error?: string;
}

// In-memory cache for ultra-fast instant repeated lookups
const pincodeCache = new Map<string, PincodeLookupResult>();

/**
 * Automatically looks up City, District, and State by 6-digit Indian Postal PIN code.
 * Uses official India Post API, Zippopotam fallback, and offline postal circles.
 */
export async function lookupCityStateByPincode(rawPincode: string): Promise<PincodeLookupResult> {
  const cleanPin = rawPincode.replace(/\D/g, '');
  if (cleanPin.length !== 6) {
    return {
      success: false,
      city: '',
      state: '',
      error: 'Please enter a valid 6-digit Indian PIN code'
    };
  }

  // Check cache
  if (pincodeCache.has(cleanPin)) {
    return pincodeCache.get(cleanPin)!;
  }

  // 1. Primary: India Post API (api.postalpincode.in)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data[0]?.Status === 'Success' && Array.isArray(data[0]?.PostOffice) && data[0].PostOffice.length > 0) {
        const poList = data[0].PostOffice;
        const primary = poList[0];
        
        // Find most appropriate city name (District or Division or Post Office Name)
        const district = primary.District || primary.Division || '';
        const state = primary.State || primary.Circle || '';
        const city = district || primary.Name || primary.Block || 'Kolkata';
        const postOffices = Array.from(new Set(poList.map((p: any) => p.Name).filter(Boolean))) as string[];

        const result: PincodeLookupResult = {
          success: true,
          city,
          state,
          district,
          postOffices,
          source: 'india-post-api'
        };
        pincodeCache.set(cleanPin, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('India Post API lookup failed/timed out, attempting fallback:', err);
  }

  // 2. Secondary Fallback: Zippopotam API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const zipRes = await fetch(`https://api.zippopotam.us/IN/${cleanPin}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (zipRes.ok) {
      const zipData = await zipRes.json();
      if (zipData.places && zipData.places.length > 0) {
        const place = zipData.places[0];
        const result: PincodeLookupResult = {
          success: true,
          city: place['place name'] || 'City',
          state: place['state'] || 'West Bengal',
          postOffices: zipData.places.map((p: any) => p['place name']).filter(Boolean),
          source: 'zippopotam'
        };
        pincodeCache.set(cleanPin, result);
        return result;
      }
    }
  } catch (zipErr) {
    console.warn('Zippopotam lookup fallback failed, using postal directory:', zipErr);
  }

  // 3. Tertiary Offline Fallback: Instant Centroid / Postal Circles Lookup Table
  try {
    const offlineLookup = getPincodeDistanceAndCentroid(cleanPin);
    if (offlineLookup && offlineLookup.city && offlineLookup.state) {
      // Clean up slash names like "Hooghly / Khanyan" -> "Hooghly" or "Khanyan"
      const cleanCity = offlineLookup.city.includes('/') 
        ? offlineLookup.city.split('/')[0].trim() 
        : offlineLookup.city;

      const result: PincodeLookupResult = {
        success: true,
        city: cleanCity,
        state: offlineLookup.state,
        source: 'postal-directory'
      };
      pincodeCache.set(cleanPin, result);
      return result;
    }
  } catch (offlineErr) {
    console.warn('Offline postal directory lookup error:', offlineErr);
  }

  return {
    success: false,
    city: '',
    state: '',
    error: 'Could not auto-detect city/state for this PIN code. Please type manually.'
  };
}
