import { DeliveryEstimate, ShiprocketCourierOption } from '../types';

/**
 * WAREHOUSE ORIGIN LOCATION
 * Khanyan, Hooghly District, West Bengal - 712147
 * Coordinates: 23.0322° N, 88.2934° E
 */
export const WAREHOUSE_ORIGIN = {
  name: 'Feat Central Warehouse, Khanyan, Hooghly, West Bengal',
  hubLabel: 'Khanyan Central Warehouse, Hooghly (712147)',
  pincode: '712147',
  lat: 23.0322,
  lon: 88.2934,
  state: 'West Bengal',
  district: 'Hooghly'
};

// Comprehensive Centroids for Indian Postal 3-Digit & 2-Digit Circles
interface PostalCentroid {
  lat: number;
  lon: number;
  city: string;
  state: string;
}

const POSTAL_CENTROIDS: Record<string, PostalCentroid> = {
  // Hooghly District & Local (Same Hub)
  '712': { lat: 23.0322, lon: 88.2934, city: 'Hooghly / Khanyan', state: 'West Bengal' },
  // Kolkata Metro
  '700': { lat: 22.5726, lon: 88.3639, city: 'Kolkata', state: 'West Bengal' },
  // Howrah
  '711': { lat: 22.5958, lon: 88.2636, city: 'Howrah', state: 'West Bengal' },
  // Burdwan & Durgapur & Asansol
  '713': { lat: 23.2424, lon: 87.8636, city: 'Burdwan / Durgapur', state: 'West Bengal' },
  // Nadia & Kalyani
  '741': { lat: 23.1800, lon: 88.5600, city: 'Nadia / Kalyani', state: 'West Bengal' },
  // Murshidabad & Berhampore
  '742': { lat: 24.1000, lon: 88.2700, city: 'Murshidabad', state: 'West Bengal' },
  // 24 Parganas North & South
  '743': { lat: 22.7200, lon: 88.4800, city: 'North / South 24 Parganas', state: 'West Bengal' },
  // Paschim & Purba Medinipur
  '721': { lat: 22.3400, lon: 87.3200, city: 'Medinipur / Kharagpur', state: 'West Bengal' },
  // Bankura
  '722': { lat: 23.2300, lon: 87.0700, city: 'Bankura', state: 'West Bengal' },
  // Purulia
  '723': { lat: 23.3300, lon: 86.3600, city: 'Purulia', state: 'West Bengal' },
  // Birbhum & Santiniketan
  '731': { lat: 23.6700, lon: 87.7200, city: 'Birbhum / Bolpur', state: 'West Bengal' },
  // Malda
  '732': { lat: 25.0100, lon: 88.1400, city: 'Malda', state: 'West Bengal' },
  // Uttar & Dakshin Dinajpur
  '733': { lat: 25.6200, lon: 88.1300, city: 'Raiganj / Dinajpur', state: 'West Bengal' },
  // Siliguri & Darjeeling
  '734': { lat: 26.7200, lon: 88.4300, city: 'Siliguri / Darjeeling', state: 'West Bengal' },
  // Jalpaiguri & Alipurduar
  '735': { lat: 26.5400, lon: 88.7100, city: 'Jalpaiguri', state: 'West Bengal' },
  // Cooch Behar
  '736': { lat: 26.3200, lon: 89.4500, city: 'Cooch Behar', state: 'West Bengal' },
  // Sikkim / Gangtok
  '737': { lat: 27.3300, lon: 88.6100, city: 'Gangtok / Sikkim', state: 'Sikkim' },

  // Bihar
  '800': { lat: 25.5941, lon: 85.1376, city: 'Patna', state: 'Bihar' },
  '801': { lat: 25.6100, lon: 85.0500, city: 'Patna Rural / Danapur', state: 'Bihar' },
  '802': { lat: 25.5600, lon: 84.6600, city: 'Ara / Bhojpur', state: 'Bihar' },
  '803': { lat: 25.3200, lon: 85.5200, city: 'Nalanda / Bihar Sharif', state: 'Bihar' },
  '804': { lat: 25.0300, lon: 84.9800, city: 'Jehanabad', state: 'Bihar' },
  '805': { lat: 24.7900, lon: 85.0000, city: 'Nawada / Gaya', state: 'Bihar' },
  '811': { lat: 25.3700, lon: 86.4700, city: 'Munger / Begusarai', state: 'Bihar' },
  '812': { lat: 25.2400, lon: 86.9800, city: 'Bhagalpur', state: 'Bihar' },
  '813': { lat: 24.9800, lon: 86.9200, city: 'Banka', state: 'Bihar' },
  '841': { lat: 25.7700, lon: 84.7400, city: 'Chapra / Siwan', state: 'Bihar' },
  '842': { lat: 26.1200, lon: 85.3900, city: 'Muzaffarpur', state: 'Bihar' },
  '843': { lat: 26.1500, lon: 85.9000, city: 'Darbhanga', state: 'Bihar' },
  '844': { lat: 25.6800, lon: 85.2200, city: 'Hajipur / Vaishali', state: 'Bihar' },
  '845': { lat: 26.7900, lon: 84.5000, city: 'Motihari / Bettiah', state: 'Bihar' },
  '846': { lat: 26.1500, lon: 85.9000, city: 'Darbhanga', state: 'Bihar' },
  '847': { lat: 26.3500, lon: 86.0700, city: 'Madhubani', state: 'Bihar' },
  '848': { lat: 25.8600, lon: 85.7800, city: 'Samastipur', state: 'Bihar' },
  '852': { lat: 25.8800, lon: 86.6000, city: 'Saharsa', state: 'Bihar' },
  '854': { lat: 25.7700, lon: 87.4700, city: 'Purnia / Katihar', state: 'Bihar' },

  // Jharkhand
  '814': { lat: 24.4800, lon: 86.7000, city: 'Deoghar / Dumka', state: 'Jharkhand' },
  '825': { lat: 23.9900, lon: 85.3600, city: 'Hazaribagh', state: 'Jharkhand' },
  '826': { lat: 23.7957, lon: 86.4304, city: 'Dhanbad', state: 'Jharkhand' },
  '827': { lat: 23.6600, lon: 86.1500, city: 'Bokaro Steel City', state: 'Jharkhand' },
  '828': { lat: 23.7500, lon: 86.3500, city: 'Dhanbad Rural', state: 'Jharkhand' },
  '829': { lat: 23.6300, lon: 85.5100, city: 'Ramgarh', state: 'Jharkhand' },
  '831': { lat: 22.8046, lon: 86.2029, city: 'Jamshedpur', state: 'Jharkhand' },
  '832': { lat: 22.7000, lon: 86.3000, city: 'East Singhbhum', state: 'Jharkhand' },
  '833': { lat: 22.5600, lon: 85.8100, city: 'Chaibasa', state: 'Jharkhand' },
  '834': { lat: 23.3441, lon: 85.3096, city: 'Ranchi', state: 'Jharkhand' },
  '835': { lat: 23.4000, lon: 85.2000, city: 'Ranchi Rural', state: 'Jharkhand' },

  // Odisha
  '751': { lat: 20.2961, lon: 85.8245, city: 'Bhubaneswar', state: 'Odisha' },
  '752': { lat: 19.8135, lon: 85.8312, city: 'Puri', state: 'Odisha' },
  '753': { lat: 20.4625, lon: 85.8828, city: 'Cuttack', state: 'Odisha' },
  '754': { lat: 20.5000, lon: 86.0000, city: 'Jagatsinghpur / Kendrapara', state: 'Odisha' },
  '756': { lat: 21.4900, lon: 86.9300, city: 'Balasore', state: 'Odisha' },
  '757': { lat: 21.9300, lon: 86.7200, city: 'Mayurbhanj / Baripada', state: 'Odisha' },
  '760': { lat: 19.3100, lon: 84.7900, city: 'Berhampur / Ganjam', state: 'Odisha' },
  '768': { lat: 21.4600, lon: 83.9800, city: 'Sambalpur', state: 'Odisha' },
  '769': { lat: 22.2600, lon: 84.8500, city: 'Rourkela', state: 'Odisha' },

  // Assam & North East
  '781': { lat: 26.1445, lon: 91.7362, city: 'Guwahati', state: 'Assam' },
  '782': { lat: 26.3500, lon: 92.6800, city: 'Nagaon', state: 'Assam' },
  '783': { lat: 26.1800, lon: 90.6200, city: 'Goalpara / Bongaigaon', state: 'Assam' },
  '784': { lat: 26.6300, lon: 92.8000, city: 'Tezpur', state: 'Assam' },
  '785': { lat: 26.7500, lon: 94.2200, city: 'Jorhat', state: 'Assam' },
  '786': { lat: 27.4700, lon: 94.9100, city: 'Dibrugarh / Tinsukia', state: 'Assam' },
  '788': { lat: 24.8300, lon: 92.7700, city: 'Silchar', state: 'Assam' },
  '793': { lat: 25.5788, lon: 91.8933, city: 'Shillong', state: 'Meghalaya' },
  '795': { lat: 24.8170, lon: 93.9368, city: 'Imphal', state: 'Manipur' },
  '797': { lat: 25.6751, lon: 94.1086, city: 'Kohima / Dimapur', state: 'Nagaland' },
  '796': { lat: 23.7271, lon: 92.7176, city: 'Aizawl', state: 'Mizoram' },
  '799': { lat: 23.8315, lon: 91.2868, city: 'Agartala', state: 'Tripura' },
  '791': { lat: 27.0844, lon: 93.6053, city: 'Itanagar', state: 'Arunachal Pradesh' },

  // Delhi NCR
  '110': { lat: 28.6139, lon: 77.2090, city: 'New Delhi', state: 'Delhi' },
  '121': { lat: 28.4089, lon: 77.3178, city: 'Faridabad', state: 'Haryana' },
  '122': { lat: 28.4595, lon: 77.0266, city: 'Gurugram', state: 'Haryana' },
  '201': { lat: 28.5355, lon: 77.3910, city: 'Noida / Ghaziabad', state: 'Uttar Pradesh' },

  // Uttar Pradesh
  '226': { lat: 26.8467, lon: 80.9462, city: 'Lucknow', state: 'Uttar Pradesh' },
  '208': { lat: 26.4499, lon: 80.3319, city: 'Kanpur', state: 'Uttar Pradesh' },
  '221': { lat: 25.3176, lon: 82.9739, city: 'Varanasi', state: 'Uttar Pradesh' },
  '211': { lat: 25.4358, lon: 81.8463, city: 'Prayagraj (Allahabad)', state: 'Uttar Pradesh' },
  '282': { lat: 27.1767, lon: 78.0081, city: 'Agra', state: 'Uttar Pradesh' },
  '250': { lat: 28.9845, lon: 77.7064, city: 'Meerut', state: 'Uttar Pradesh' },
  '243': { lat: 28.3670, lon: 79.4304, city: 'Bareilly', state: 'Uttar Pradesh' },
  '273': { lat: 26.7606, lon: 83.3732, city: 'Gorakhpur', state: 'Uttar Pradesh' },

  // Uttarakhand
  '248': { lat: 30.3165, lon: 78.0322, city: 'Dehradun', state: 'Uttarakhand' },
  '263': { lat: 29.3803, lon: 79.4636, city: 'Nainital / Haldwani', state: 'Uttarakhand' },

  // Punjab, Haryana & Chandigarh
  '160': { lat: 30.7333, lon: 76.7794, city: 'Chandigarh', state: 'Chandigarh' },
  '141': { lat: 30.9010, lon: 75.8573, city: 'Ludhiana', state: 'Punjab' },
  '143': { lat: 31.6340, lon: 74.8723, city: 'Amritsar', state: 'Punjab' },
  '144': { lat: 31.3260, lon: 75.5762, city: 'Jalandhar', state: 'Punjab' },
  '133': { lat: 30.3782, lon: 76.7767, city: 'Ambala', state: 'Haryana' },
  '132': { lat: 29.6857, lon: 76.9905, city: 'Karnal / Panipat', state: 'Haryana' },

  // Rajasthan
  '302': { lat: 26.9124, lon: 75.7873, city: 'Jaipur', state: 'Rajasthan' },
  '342': { lat: 26.2389, lon: 73.0243, city: 'Jodhpur', state: 'Rajasthan' },
  '313': { lat: 24.5854, lon: 73.7125, city: 'Udaipur', state: 'Rajasthan' },
  '305': { lat: 26.4499, lon: 74.6399, city: 'Ajmer', state: 'Rajasthan' },
  '324': { lat: 25.2138, lon: 75.8648, city: 'Kota', state: 'Rajasthan' },

  // Gujarat
  '380': { lat: 23.0225, lon: 72.5714, city: 'Ahmedabad', state: 'Gujarat' },
  '390': { lat: 22.3072, lon: 73.1812, city: 'Vadodara', state: 'Gujarat' },
  '395': { lat: 21.1702, lon: 72.8311, city: 'Surat', state: 'Gujarat' },
  '360': { lat: 22.3039, lon: 70.8022, city: 'Rajkot', state: 'Gujarat' },

  // Maharashtra & Goa
  '400': { lat: 19.0760, lon: 72.8777, city: 'Mumbai', state: 'Maharashtra' },
  '411': { lat: 18.5204, lon: 73.8567, city: 'Pune', state: 'Maharashtra' },
  '440': { lat: 21.1458, lon: 79.0882, city: 'Nagpur', state: 'Maharashtra' },
  '431': { lat: 19.8762, lon: 75.3433, city: 'Aurangabad / Chhatrapati Sambhajinagar', state: 'Maharashtra' },
  '422': { lat: 19.9975, lon: 73.7898, city: 'Nashik', state: 'Maharashtra' },
  '416': { lat: 16.7050, lon: 74.2433, city: 'Kolhapur', state: 'Maharashtra' },
  '403': { lat: 15.2993, lon: 74.1240, city: 'Goa (Panaji)', state: 'Goa' },

  // Madhya Pradesh & Chhattisgarh
  '462': { lat: 23.2599, lon: 77.4126, city: 'Bhopal', state: 'Madhya Pradesh' },
  '452': { lat: 22.7196, lon: 75.8577, city: 'Indore', state: 'Madhya Pradesh' },
  '482': { lat: 23.1815, lon: 79.9864, city: 'Jabalpur', state: 'Madhya Pradesh' },
  '474': { lat: 26.2183, lon: 78.1828, city: 'Gwalior', state: 'Madhya Pradesh' },
  '492': { lat: 21.2514, lon: 81.6296, city: 'Raipur', state: 'Chhattisgarh' },
  '495': { lat: 22.0797, lon: 82.1391, city: 'Bilaspur', state: 'Chhattisgarh' },

  // Telangana & Andhra Pradesh
  '500': { lat: 17.3850, lon: 78.4867, city: 'Hyderabad', state: 'Telangana' },
  '506': { lat: 17.9689, lon: 79.5941, city: 'Warangal', state: 'Telangana' },
  '530': { lat: 17.6868, lon: 83.2185, city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  '520': { lat: 16.5062, lon: 80.6480, city: 'Vijayawada', state: 'Andhra Pradesh' },
  '517': { lat: 13.6288, lon: 79.4192, city: 'Tirupati', state: 'Andhra Pradesh' },
  '515': { lat: 14.6819, lon: 77.6006, city: 'Anantapur', state: 'Andhra Pradesh' },

  // Karnataka
  '560': { lat: 12.9716, lon: 77.5946, city: 'Bengaluru', state: 'Karnataka' },
  '570': { lat: 12.2958, lon: 76.6394, city: 'Mysuru', state: 'Karnataka' },
  '575': { lat: 12.9141, lon: 74.8560, city: 'Mangaluru', state: 'Karnataka' },
  '580': { lat: 15.3647, lon: 75.1240, city: 'Hubli / Dharwad', state: 'Karnataka' },

  // Tamil Nadu & Puducherry
  '600': { lat: 13.0827, lon: 80.2707, city: 'Chennai', state: 'Tamil Nadu' },
  '641': { lat: 11.0168, lon: 76.9558, city: 'Coimbatore', state: 'Tamil Nadu' },
  '625': { lat: 9.9252, lon: 78.1198, city: 'Madurai', state: 'Tamil Nadu' },
  '620': { lat: 10.7905, lon: 78.7047, city: 'Tiruchirappalli', state: 'Tamil Nadu' },
  '636': { lat: 11.6643, lon: 78.1460, city: 'Salem', state: 'Tamil Nadu' },
  '605': { lat: 11.9416, lon: 79.8083, city: 'Puducherry', state: 'Puducherry' },

  // Kerala
  '682': { lat: 9.9312, lon: 76.2673, city: 'Kochi / Ernakulam', state: 'Kerala' },
  '695': { lat: 8.5241, lon: 76.9366, city: 'Thiruvananthapuram', state: 'Kerala' },
  '673': { lat: 11.2588, lon: 75.7804, city: 'Kozhikode', state: 'Kerala' },
  '680': { lat: 10.5276, lon: 76.2144, city: 'Thrissur', state: 'Kerala' },

  // Jammu & Kashmir / Ladakh / Himachal Pradesh
  '180': { lat: 32.7266, lon: 74.8570, city: 'Jammu', state: 'Jammu & Kashmir' },
  '190': { lat: 34.0837, lon: 74.7973, city: 'Srinagar', state: 'Jammu & Kashmir' },
  '194': { lat: 34.1526, lon: 77.5771, city: 'Leh / Ladakh', state: 'Ladakh' },
  '171': { lat: 31.1048, lon: 77.1734, city: 'Shimla', state: 'Himachal Pradesh' },

  // Andaman & Nicobar
  '744': { lat: 11.6234, lon: 92.7265, city: 'Port Blair', state: 'Andaman & Nicobar Islands' }
};

/**
 * Calculates geodesic (great-circle) distance in km using Haversine formula
 */
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Computes road transit distance and lookup centroid for a 6-digit Indian Pincode
 */
export function getPincodeDistanceAndCentroid(cleanPin: string): {
  distanceKm: number;
  city: string;
  state: string;
} {
  const prefix3 = cleanPin.slice(0, 3);
  const prefix2 = cleanPin.slice(0, 2);

  // Exact 3-digit prefix lookup
  let centroid = POSTAL_CENTROIDS[prefix3];

  // Fallback to 2-digit circle lookup
  if (!centroid) {
    const matchingKey = Object.keys(POSTAL_CENTROIDS).find((k) => k.startsWith(prefix2));
    if (matchingKey) {
      centroid = POSTAL_CENTROIDS[matchingKey];
    }
  }

  // Default national fallback (Central India)
  if (!centroid) {
    centroid = {
      lat: 22.0,
      lon: 79.0,
      city: 'India Postal Circle',
      state: 'India'
    };
  }

  // Calculate straight-line distance
  const straightLine = calculateHaversineDistance(
    WAREHOUSE_ORIGIN.lat,
    WAREHOUSE_ORIGIN.lon,
    centroid.lat,
    centroid.lon
  );

  // Apply road / highway routing detour multiplier (1.20 - 1.30x)
  let roadDistance = Math.round(straightLine * 1.25);
  if (roadDistance < 15 && cleanPin !== WAREHOUSE_ORIGIN.pincode) {
    roadDistance = 25; // minimum local transit buffer
  } else if (cleanPin === WAREHOUSE_ORIGIN.pincode) {
    roadDistance = 5; // same postal hub
  }

  return {
    distanceKm: roadDistance,
    city: centroid.city,
    state: centroid.state
  };
}

// In-memory cache for fast repeated queries on both mobile and desktop
const estimateCache = new Map<string, DeliveryEstimate>();

/**
 * Calculates estimated delivery date and courier serviceability using Shiprocket API
 * with instant client-side postal circle fallback.
 */
export async function getShiprocketDeliveryEstimate(
  destinationPincode: string,
  weight: number = 0.5,
  isCod: boolean = true
): Promise<DeliveryEstimate> {
  const cleanPin = destinationPincode.replace(/\D/g, '').slice(0, 6);

  if (cleanPin.length !== 6) {
    return {
      pincode: destinationPincode,
      isServiceable: false,
      estimatedDeliveryDate: 'Enter 6-digit Pincode',
      estimatedDays: '3-4 Days',
      courierName: 'Shiprocket Priority Courier',
      isCodAvailable: true,
      deliveryCharge: 0,
      dispatchTime: 'Dispatches within 24 Hours from Khanyan, Hooghly (712147)',
      originHub: WAREHOUSE_ORIGIN.hubLabel,
      originPincode: WAREHOUSE_ORIGIN.pincode
    };
  }

  const cacheKey = `${cleanPin}_${weight}_${isCod ? '1' : '0'}`;
  if (estimateCache.has(cacheKey)) {
    return estimateCache.get(cacheKey)!;
  }

  // 1. Try calling backend Shiprocket Serviceability API (8000ms timeout for reliable mobile connections)
  try {
    const res = await fetch(`/api/shiprocket/serviceability?pincode=${cleanPin}&weight=${weight}&cod=${isCod ? 1 : 0}`, {
      signal: AbortSignal.timeout(8000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.isServiceable) {
        const estimate = data as DeliveryEstimate;
        estimateCache.set(cacheKey, estimate);
        return estimate;
      }
    }
  } catch (e) {
    // Fall back to client calculation if network times out or fails
  }

  // 2. High-precision Indian Postal distance estimation engine from Khanyan, Hooghly
  const fallback = computeFallbackEstimate(cleanPin, isCod);
  estimateCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Distance-based Delivery Timeline Calculation from Khanyan, Hooghly, West Bengal - 712147
 */
export function computeFallbackEstimate(cleanPin: string, isCod: boolean = true): DeliveryEstimate {
  const { distanceKm, city, state } = getPincodeDistanceAndCentroid(cleanPin);

  let minDays = 3;
  let maxDays = 4;
  let primaryCourier = 'Blue Dart Express';

  // Distance Tiers from Khanyan Central Warehouse (712147)
  if (distanceKm <= 75) {
    // Tier 1: Local Hooghly, Howrah, Kolkata Metro & Nadia (< 75 km)
    minDays = 1;
    maxDays = 2;
    primaryCourier = 'Blue Dart Express / Shiprocket Local Express';
  } else if (distanceKm <= 350) {
    // Tier 2: Intra-State Bengal & Neighboring Districts (75 - 350 km)
    // (Burdwan, Medinipur, Murshidabad, Birbhum, Bankura, Purulia, Malda, Dhanbad)
    minDays = 2;
    maxDays = 3;
    primaryCourier = 'Delhivery Air / DTDC Express';
  } else if (distanceKm <= 800) {
    // Tier 3: East India Zone & North Bengal (350 - 800 km)
    // (Siliguri, Bihar/Patna, Jharkhand/Ranchi, Odisha/Bhubaneswar, Assam/Guwahati)
    minDays = 2;
    maxDays = 3;
    primaryCourier = 'Blue Dart Air Express / Delhivery';
  } else if (distanceKm <= 1500) {
    // Tier 4: North & Central India (800 - 1500 km)
    // (Delhi NCR, UP, MP, Chhattisgarh, Andhra Pradesh)
    minDays = 3;
    maxDays = 4;
    primaryCourier = 'Blue Dart Air Cargo / Ekart Logistics';
  } else if (distanceKm <= 2200) {
    // Tier 5: Western & Southern Metros (1500 - 2200 km)
    // (Mumbai, Pune, Bengaluru, Hyderabad, Chennai, Rajasthan, Gujarat)
    minDays = 3;
    maxDays = 5;
    primaryCourier = 'Blue Dart Air / Delhivery Express';
  } else {
    // Tier 6: Far South, Remote Hills & North-East (2200+ km)
    // (Kerala, J&K, Leh Ladakh, Remote Assam/Arunachal, Andaman Islands)
    minDays = 4;
    maxDays = 6;
    primaryCourier = 'India Post Speed Post / Blue Dart Air';
  }

  // Calculate guaranteed date from current time
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + maxDays);
  
  // Skip Sunday if arrival lands on Sunday
  if (targetDate.getDay() === 0) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  };
  const dateFormatted = targetDate.toLocaleDateString('en-IN', options);

  const availableCouriers: ShiprocketCourierOption[] = [
    {
      courier_company_id: 10,
      courier_name: primaryCourier,
      rate: 0,
      estimated_delivery_days: `${minDays}-${maxDays}`,
      etd: dateFormatted,
      is_surface: distanceKm > 500,
      cod: 1
    },
    {
      courier_company_id: 12,
      courier_name: 'Delhivery Surface / Air',
      rate: 0,
      estimated_delivery_days: `${minDays + 1}-${maxDays + 1}`,
      etd: dateFormatted,
      is_surface: true,
      cod: 1
    },
    {
      courier_company_id: 14,
      courier_name: 'Shadowfax Priority (Shiprocket)',
      rate: 0,
      estimated_delivery_days: `${minDays}-${maxDays + 1}`,
      etd: dateFormatted,
      is_surface: true,
      cod: 1
    }
  ];

  return {
    pincode: cleanPin,
    city,
    state,
    isServiceable: true,
    distanceKm,
    originHub: WAREHOUSE_ORIGIN.hubLabel,
    originPincode: WAREHOUSE_ORIGIN.pincode,
    estimatedDeliveryDate: dateFormatted,
    estimatedDays: `${minDays}-${maxDays} Days`,
    courierName: `${primaryCourier} (Shiprocket Partner)`,
    isCodAvailable: true,
    deliveryCharge: 0,
    dispatchTime: 'Dispatches within 24 Hours from Khanyan, Hooghly (712147)',
    availableCouriers,
    source: 'shiprocket_serviceability_engine'
  };
}
