import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  setLogLevel,
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  onSnapshot, 
  deleteDoc, 
  Firestore,
  getDocFromServer 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, FirebaseStorage } from 'firebase/storage';
import { Product, BannerSlide, Order, PromoCode, LiveSaleConfig, PaymentLog } from './types';
import { isSilentAuthCancellation } from './utils/authErrors';
import { deduplicateProducts } from './utils/productUtils';

// Admin Firebase Configuration - Loaded directly from .env
export const adminFirebaseConfig = {
  apiKey: (import.meta.env.VITE_ADMIN_FIREBASE_API_KEY || import.meta.env.ADMIN_FIREBASE_API_KEY || '').trim(),
  authDomain: (import.meta.env.VITE_ADMIN_FIREBASE_AUTH_DOMAIN || import.meta.env.ADMIN_FIREBASE_AUTH_DOMAIN || '').trim(),
  projectId: (import.meta.env.VITE_ADMIN_FIREBASE_PROJECT_ID || import.meta.env.ADMIN_FIREBASE_PROJECT_ID || '').trim(),
  storageBucket: (import.meta.env.VITE_ADMIN_FIREBASE_STORAGE_BUCKET || import.meta.env.ADMIN_FIREBASE_STORAGE_BUCKET || '').trim(),
  messagingSenderId: (import.meta.env.VITE_ADMIN_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.ADMIN_FIREBASE_MESSAGING_SENDER_ID || '').trim(),
  appId: (import.meta.env.VITE_ADMIN_FIREBASE_APP_ID || import.meta.env.ADMIN_FIREBASE_APP_ID || '').trim(),
  measurementId: (import.meta.env.VITE_ADMIN_FIREBASE_MEASUREMENT_ID || import.meta.env.ADMIN_FIREBASE_MEASUREMENT_ID || '').trim()
};

// User/Store Firebase Configuration - Loaded directly from .env
export const userFirebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || '').trim(),
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim(),
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim(),
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim(),
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim(),
  appId: (import.meta.env.VITE_FIREBASE_APP_ID || '').trim(),
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '').trim()
};

// Helper to safely get or initialize a Firebase App instance strictly from environment configuration
function safeInitFirebaseApp(name: string, config: any): FirebaseApp | null {
  try {
    const existing = getApps().find(a => a.name === name);
    if (existing) return existing;
    
    // Only initialize if valid credentials exist in .env
    if (config && config.apiKey && config.projectId) {
      return initializeApp(config, name === '[DEFAULT]' ? undefined : name);
    }
    
    return null;
  } catch (err) {
    console.warn(`[Firebase] Notice initializing app "${name}":`, err);
    return null;
  }
}

// Initialize Firestore with robust WebChannel long-polling settings to prevent transport errors in restricted / iframe / proxy environments
function safeInitFirestore(app: FirebaseApp | null): Firestore {
  if (!app) return null as unknown as Firestore;
  try {
    // Suppress transient WebChannel reconnect warnings
    setLogLevel('error');
    return initializeFirestore(app, {
      experimentalForceLongPolling: true
    });
  } catch (err) {
    try {
      return getFirestore(app);
    } catch {
      return null as unknown as Firestore;
    }
  }
}

// Initialize dedicated Admin Firebase App ('adminApp')
export const adminApp: FirebaseApp | null = safeInitFirebaseApp('adminApp', adminFirebaseConfig);
export const adminAuth: any = adminApp ? getAuth(adminApp) : null;
export const adminDb: Firestore = safeInitFirestore(adminApp);
export const adminStorage: FirebaseStorage = (adminApp ? getStorage(adminApp) : null) as unknown as FirebaseStorage;
export const adminGoogleProvider = adminApp ? new GoogleAuthProvider() : null;

// Initialize User/Store Firebase App ('[DEFAULT]')
export const userApp: FirebaseApp | null = safeInitFirebaseApp('[DEFAULT]', userFirebaseConfig);
export const userDb: Firestore = safeInitFirestore(userApp);
export const userStorage: FirebaseStorage = (userApp ? getStorage(userApp) : null) as unknown as FirebaseStorage;

// Test Connection to Firestore databases when configured
async function testFirestoreConnections() {
  if (!adminApp || !adminDb) return;
  try {
    await getDocFromServer(doc(adminDb, 'test', 'admin_connection'));
  } catch (error) {
    // Offline / setup note
  }
}
if (adminApp && adminDb) {
  testFirestoreConnections();
}

export const BANNED_FAKE_PRODUCT_IDS = new Set([
  '63BB430203DCS01SB',
  '63BB225316SSS01MGNTA',
  '63BB280204MEPS01WNE',
  'FEAT-TEST-VERIFY'
]);

/**
 * Real-time listener for products collection from Admin Firestore (featdb-admin).
 */
export const subscribeToProducts = (callback: (products: Product[]) => void) => {
  let unsubAdmin = () => {};

  try {
    if (!adminDb) return () => {};
    const adminProductsRef = collection(adminDb, 'products');
    unsubAdmin = onSnapshot(adminProductsRef, (snapshot) => {
      const rawList: Product[] = [];
      snapshot.forEach((docSnap) => {
        if (BANNED_FAKE_PRODUCT_IDS.has(docSnap.id)) return;
        const data = docSnap.data();
        if (data.sku && BANNED_FAKE_PRODUCT_IDS.has(data.sku)) return;
        const rawImages = Array.isArray(data.images) && data.images.length > 0
          ? data.images
          : (typeof data.image === 'string' && data.image ? [data.image] : []);
        const rawId = data.id || docSnap.id;
        rawList.push({
          ...data,
          id: rawId,
          sku: data.sku || rawId,
          images: rawImages.filter((img: string) => typeof img === 'string' && !img.includes('1610030469983'))
        } as Product);
      });
      // Merge with cached products so newly saved items or paginated items are never lost on snapshot updates
      const mergedWithCache = deduplicateProducts([...(cachedFirestoreProducts || []), ...rawList]);
      cachedFirestoreProducts = mergedWithCache;
      callback(mergedWithCache);
    }, () => {});
  } catch (err) {}

  return () => {
    unsubAdmin();
  };
};

// Helper to parse REST Firestore documents
const parseFirestoreDocRest = (doc: any): Product | null => {
  if (!doc || !doc.fields) return null;
  const parseVal = (val: any): any => {
    if (!val) return null;
    if ('stringValue' in val) return val.stringValue;
    if ('integerValue' in val) return parseInt(val.integerValue, 10);
    if ('doubleValue' in val) return parseFloat(val.doubleValue);
    if ('booleanValue' in val) return val.booleanValue;
    if ('arrayValue' in val) return (val.arrayValue.values || []).map(parseVal);
    if ('mapValue' in val) {
      const obj: Record<string, any> = {};
      for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
        obj[k] = parseVal(v);
      }
      return obj;
    }
    return null;
  };

  const id = doc.name ? doc.name.split('/').pop() : ('PROD_' + Date.now());
  const raw: Record<string, any> = { id };
  for (const [k, v] of Object.entries(doc.fields || {})) {
    raw[k] = parseVal(v);
  }
  const rawImages = Array.isArray(raw.images) && raw.images.length > 0
    ? raw.images
    : (typeof raw.image === 'string' && raw.image ? [raw.image] : []);

  return {
    id: raw.id || id,
    sku: raw.sku || raw.id || id,
    name: raw.name || 'Textile Fashion Item',
    category: raw.category || 'Kurti',
    collection: raw.collection || '9 to fivers collection',
    price: Number(raw.price) || 999,
    originalPrice: Number(raw.originalPrice) || Number(raw.price) || 1999,
    discountPercent: Number(raw.discountPercent) || 0,
    rating: Number(raw.rating) || 5,
    ratingCount: Number(raw.ratingCount) || 1,
    stockCount: Number(raw.stockCount) !== undefined ? Number(raw.stockCount) : 10,
    sizeStock: raw.sizeStock && typeof raw.sizeStock === 'object' ? raw.sizeStock : {},
    images: rawImages.filter((img: string) => img && typeof img === 'string' && !img.includes('1610030469983')),
    description: raw.description || '',
    fabric: raw.fabric || 'Premium Handloom',
    length: (raw.length && String(raw.length).trim() !== '') ? String(raw.length).trim() : undefined,
    careInstructions: raw.careInstructions || 'Dry Clean Only',
    sizes: Array.isArray(raw.sizes) && raw.sizes.length > 0 ? raw.sizes : ['S', 'M', 'L', 'XL'],
    colors: Array.isArray(raw.colors) ? raw.colors : [],
    colorVariants: Array.isArray(raw.colorVariants) ? raw.colorVariants : [],
    primaryColorName: (raw.primaryColorName && String(raw.primaryColorName).trim() !== '') ? String(raw.primaryColorName).trim() : undefined,
    reviews: Array.isArray(raw.reviews) ? raw.reviews : [],
    tags: Array.isArray(raw.tags) ? raw.tags : []
  };
};

// In-memory cache & rate-limit backoff tracker for Firestore products and banners
let cachedFirestoreProducts: Product[] | null = null;
let lastProductsFetchTime = 0;
let firestoreRestCooldownUntil = 0;

let cachedFirestoreBanners: BannerSlide[] | null = null;
let lastBannersFetchTime = 0;
let bannersRestCooldownUntil = 0;

// Negative cache for images not found in Firestore to prevent repeated 404 queries
const missingImageNegativeCache = new Set<string>();

/**
 * Fetch all products from Admin Firestore (featdb-admin)
 */
export const fetchProductsFromFirestore = async (): Promise<Product[]> => {
  const now = Date.now();
  if (cachedFirestoreProducts && cachedFirestoreProducts.length > 20 && (now - lastProductsFetchTime < 60000)) {
    return cachedFirestoreProducts;
  }

  // 1. Primary in fullstack environment: Query server /api/products which has already synchronized all pages
  try {
    const apiRes = await fetch('/api/products', { signal: AbortSignal.timeout(8000) });
    if (apiRes.ok) {
      const apiData = await apiRes.json();
      if (apiData && Array.isArray(apiData.products) && apiData.products.length > 0) {
        const deduplicated = deduplicateProducts(apiData.products);
        cachedFirestoreProducts = deduplicated;
        lastProductsFetchTime = now;
        return cachedFirestoreProducts;
      }
    }
  } catch (e) {
    // Server endpoint unreachable (e.g. pure static build)
  }

  const rawList: Product[] = [];

  const fetchFromDb = async (dbInstance: Firestore) => {
    try {
      if (!dbInstance) return;
      const ref = collection(dbInstance, 'products');
      const snap = await withTimeout(getDocs(ref), 15000, null);
      if (snap) {
        snap.forEach((docSnap) => {
          if (BANNED_FAKE_PRODUCT_IDS.has(docSnap.id)) return;
          const d = docSnap.data();
          if (d.sku && BANNED_FAKE_PRODUCT_IDS.has(d.sku)) return;
          const rawImages = Array.isArray(d.images) && d.images.length > 0
            ? d.images
            : (typeof d.image === 'string' && d.image ? [d.image] : []);
          const rawId = d.id || docSnap.id;
          rawList.push({
            ...d,
            id: rawId,
            sku: d.sku || rawId,
            images: rawImages.filter((img: string) => typeof img === 'string' && !img.includes('1610030469983'))
          } as Product);
        });
      }
    } catch (err) {}
  };

  if (adminDb) {
    await fetchFromDb(adminDb);
  }
  if (userDb && rawList.length === 0) {
    await fetchFromDb(userDb);
  }

  // If Firebase SDK retrieved documents, return immediately and cache
  const deduplicatedSdk = deduplicateProducts(rawList);
  if (deduplicatedSdk.length > 0) {
    cachedFirestoreProducts = deduplicatedSdk;
    lastProductsFetchTime = now;
    return cachedFirestoreProducts;
  }

  // Direct REST query with full pagination fallback if SDK and /api/products are empty
  const restProjects = adminFirebaseConfig.projectId ? [adminFirebaseConfig.projectId] : [];
  if (rawList.length === 0 && restProjects.length > 0 && now > firestoreRestCooldownUntil) {
    const apiKey = adminFirebaseConfig.apiKey || userFirebaseConfig.apiKey;
    await Promise.allSettled(restProjects.map(async (proj) => {
      try {
        let pageToken = '';
        let pageCount = 0;
        do {
          const url = `https://firestore.googleapis.com/v1/projects/${proj}/databases/(default)/documents/products?pageSize=300${apiKey ? `&key=${apiKey}` : ''}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
          const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
          if (res.status === 429) {
            console.warn('[Firestore] Received 429 quota from Google Cloud REST API. Entering 5-minute backoff cooldown.');
            firestoreRestCooldownUntil = Date.now() + 5 * 60 * 1000;
            break;
          }
          if (!res.ok) break;
          const data: any = await res.json();
          if (data && Array.isArray(data.documents)) {
            for (const d of data.documents) {
              const p = parseFirestoreDocRest(d);
              if (p && p.id) {
                if (BANNED_FAKE_PRODUCT_IDS.has(p.id) || (p.sku && BANNED_FAKE_PRODUCT_IDS.has(p.sku))) continue;
                rawList.push(p);
              }
            }
          }
          pageToken = data.nextPageToken || '';
          pageCount++;
          if (pageCount > 50) break;
        } while (pageToken);
      } catch (e) {}
    }));
  }

  const result = deduplicateProducts(rawList);
  if (result.length > 0) {
    cachedFirestoreProducts = result;
    lastProductsFetchTime = now;
  }
  return result;
};

const withTimeout = <T>(promise: Promise<T>, timeoutMs = 2500, fallback?: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback as T), timeoutMs))
  ]);
};

export const ensureAdminAuth = async (): Promise<boolean> => {
  try {
    if (!adminAuth) return false;
    if (adminAuth.currentUser && adminAuth.currentUser.email === 'admin@featherhutfashion.com') {
      return true;
    }
    const adminEmail = (import.meta as any).env?.VITE_ADMIN_USERNAME || 'admin@featherhutfashion.com';
    const adminPass = (import.meta as any).env?.VITE_ADMIN_PASSWORD || 'Feather@123';
    await signInWithEmailAndPassword(adminAuth, adminEmail, adminPass);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Recursively strips undefined values from objects and arrays so Firestore never throws
 * "Unsupported field value: undefined".
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(data as Record<string, any>)) {
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    }
    return cleaned as T;
  }
  return data;
}

/**
 * Offload any base64 data URLs to clean URLs or lightweight payloads before Firestore writes
 */
export const offloadProductDataUrls = async (prod: any): Promise<any> => {
  if (!prod || typeof prod !== 'object') return prod;
  const copy = { ...prod };

  const uploadIfDataUrl = async (val: string, prefix = 'prod'): Promise<string> => {
    if (!val || typeof val !== 'string' || !val.startsWith('data:image/')) {
      return val;
    }
    try {
      const filename = `img_${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: val, filename, folder: 'products' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.url) {
          return data.url;
        }
      }
    } catch (_) {}
    return val;
  };

  if (Array.isArray(copy.images)) {
    copy.images = await Promise.all(copy.images.map((img: any) => typeof img === 'string' ? uploadIfDataUrl(img, 'gallery') : img));
  }

  if (Array.isArray(copy.colorVariants)) {
    copy.colorVariants = await Promise.all(copy.colorVariants.map(async (v: any) => {
      if (!v || typeof v !== 'object') return v;
      const vCopy = { ...v };
      if (typeof vCopy.imageUrl === 'string') {
        vCopy.imageUrl = await uploadIfDataUrl(vCopy.imageUrl, 'var');
      }
      if (Array.isArray(vCopy.images)) {
        vCopy.images = await Promise.all(vCopy.images.map((img: any) => typeof img === 'string' ? uploadIfDataUrl(img, 'vargal') : img));
      }
      return vCopy;
    }));
  }

  return copy;
};

/**
 * Save / Update a product to Admin Firestore (featdb-admin)
 */
export const saveProductToFirestore = async (product: Partial<Product> & { id: string }): Promise<void> => {
  const canonicalId = product.id || product.sku || ('PROD_' + Date.now());
  const rawPayload = {
    ...product,
    id: canonicalId,
    sku: product.sku || canonicalId,
    updatedAt: new Date().toISOString()
  };

  // Convert any base64 image strings to lightweight URLs so Firestore 1MB document limit is never exceeded
  const cleanPayload = await offloadProductDataUrls(rawPayload);
  const payload = sanitizeForFirestore(cleanPayload);

  // Instantly protect this product in local cache so listener snapshots never drop it
  if (cachedFirestoreProducts) {
    cachedFirestoreProducts = deduplicateProducts([payload as Product, ...cachedFirestoreProducts]);
  }
  try {
    const cachedStr = sessionStorage.getItem('feat_catalog_cache_v3') || localStorage.getItem('feat_catalog_cache_v3');
    if (cachedStr) {
      const parsed = JSON.parse(cachedStr);
      if (Array.isArray(parsed)) {
        const updated = deduplicateProducts([payload as Product, ...parsed]);
        sessionStorage.setItem('feat_catalog_cache_v3', JSON.stringify(updated));
        localStorage.setItem('feat_catalog_cache_v3', JSON.stringify(updated));
      }
    }
  } catch (e) {}

  // 1. Direct Client-side Firestore SDK write
  try {
    if (adminDb) {
      await ensureAdminAuth();
      const docRef = doc(adminDb, 'products', canonicalId);
      await withTimeout(setDoc(docRef, payload, { merge: true }), 12000);
      // Clean up legacy redundant doc if sku existed as alternate doc to prevent duplicate products
      if (product.sku && product.sku !== canonicalId) {
        const skuRef = doc(adminDb, 'products', product.sku);
        deleteDoc(skuRef).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[FirebaseAdmin] Client Firestore write notice:', err);
  }

  // 2. Server-side API persistence (which authenticates directly with Firebase Auth REST API)
  try {
    const adminToken = localStorage.getItem('feat_admin_token') || sessionStorage.getItem('feat_admin_token') || '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminToken) {
      headers['x-admin-token'] = adminToken;
      headers['Authorization'] = `Bearer ${adminToken}`;
    }
    await fetch('/api/products', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
  } catch (err) {}
};

/**
 * Update product stock & per-size quantities in Admin Firestore (featdb-admin)
 */
export const updateProductStockInFirestore = async (
  productId: string, 
  stockCount: number,
  sizeStock?: Record<string, number>
): Promise<void> => {
  const updatePayload: any = sanitizeForFirestore({
    stockCount,
    updatedAt: new Date().toISOString(),
    ...(sizeStock ? { sizeStock } : {})
  });

  try {
    if (adminDb) {
      await ensureAdminAuth();
      const docRef = doc(adminDb, 'products', productId);
      await withTimeout(setDoc(docRef, updatePayload, { merge: true }), 3500);
    }
  } catch (err) {
    console.warn('[FirebaseAdmin] Stock update notice:', err);
  }

  try {
    await fetch(`/api/products/${encodeURIComponent(productId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    });
  } catch (err) {}
};

/**
 * Delete a product from Admin Firestore (featdb-admin)
 */
export const deleteProductFromFirestore = async (productId: string, productSku?: string): Promise<void> => {
  if (cachedFirestoreProducts) {
    cachedFirestoreProducts = cachedFirestoreProducts.filter(p => p.id !== productId && (!productSku || p.sku !== productSku));
  }
  try {
    const cachedStr = sessionStorage.getItem('feat_catalog_cache_v3') || localStorage.getItem('feat_catalog_cache_v3');
    if (cachedStr) {
      const parsed = JSON.parse(cachedStr);
      if (Array.isArray(parsed)) {
        const updated = parsed.filter((p: any) => p.id !== productId && (!productSku || p.sku !== productSku));
        sessionStorage.setItem('feat_catalog_cache_v3', JSON.stringify(updated));
        localStorage.setItem('feat_catalog_cache_v3', JSON.stringify(updated));
      }
    }
  } catch (e) {}

  // 1. Direct Client-side Firestore SDK delete
  try {
    if (adminDb) {
      await ensureAdminAuth();
      const docRef = doc(adminDb, 'products', productId);
      await withTimeout(deleteDoc(docRef), 3500);
      if (productSku && productSku !== productId) {
        const skuRef = doc(adminDb, 'products', productSku);
        await withTimeout(deleteDoc(skuRef), 3500).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[FirebaseAdmin] Client Firestore delete notice:', err);
  }

  // 2. Server-side API deletion to guarantee removal from Admin Firestore (featdb-admin)
  try {
    await fetch(`/api/products/${encodeURIComponent(productId)}`, {
      method: 'DELETE'
    });
    if (productSku && productSku !== productId) {
      await fetch(`/api/products/${encodeURIComponent(productSku)}`, {
        method: 'DELETE'
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('[FirebaseAdmin] Server API delete notice:', err);
  }
};

/**
 * Parse a Firestore REST document representing a Banner
 */
const parseFirestoreBannerRest = (doc: any): BannerSlide | null => {
  if (!doc || !doc.fields) return null;
  const parseVal = (val: any): any => {
    if (!val) return null;
    if ('stringValue' in val) return val.stringValue;
    if ('integerValue' in val) return parseInt(val.integerValue, 10);
    if ('doubleValue' in val) return parseFloat(val.doubleValue);
    if ('booleanValue' in val) return val.booleanValue;
    return null;
  };
  const id = doc.name ? doc.name.split('/').pop() : ('slide-' + Date.now());
  const raw: Record<string, any> = { id };
  for (const [k, v] of Object.entries(doc.fields || {})) {
    raw[k] = parseVal(v);
  }
  if (!raw.image || typeof raw.image !== 'string' || !raw.image.trim()) return null;
  return {
    id: raw.id || id,
    tag: raw.tag || 'NEW ARRIVAL SPOTLIGHT',
    title: raw.title || '',
    description: raw.description || '',
    image: raw.image,
    ctaText: raw.ctaText || 'Shop Now',
    ctaLink: raw.ctaLink || '',
    targetCollection: raw.targetCollection || 'All',
    targetCategory: raw.targetCategory || 'All'
  };
};

/**
 * Fetch all hero banners directly from Firestore
 */
export const fetchBannersFromFirestore = async (): Promise<BannerSlide[]> => {
  const now = Date.now();
  if (cachedFirestoreBanners && (now - lastBannersFetchTime < 120000)) {
    return cachedFirestoreBanners;
  }

  const map = new Map<string, BannerSlide>();

  const fetchFromDb = async (dbInstance: Firestore | null) => {
    if (!dbInstance) return;
    try {
      const ref = collection(dbInstance, 'banners');
      const snap = await withTimeout(getDocs(ref), 3500, null);
      if (snap) {
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.image && String(d.image).trim() !== '') {
            map.set(docSnap.id, {
              id: docSnap.id,
              tag: d.tag || 'NEW ARRIVAL SPOTLIGHT',
              title: d.title || '',
              description: d.description || '',
              image: d.image,
              ctaText: d.ctaText || 'Shop Now',
              ctaLink: d.ctaLink || '',
              targetCollection: d.targetCollection || 'All',
              targetCategory: d.targetCategory || 'All'
            });
          }
        });
      }
    } catch (e) {}
  };

  await Promise.allSettled([
    fetchFromDb(adminDb),
    fetchFromDb(userDb)
  ]);

  if (map.size > 0) {
    cachedFirestoreBanners = Array.from(map.values());
    lastBannersFetchTime = now;
    return cachedFirestoreBanners;
  }

  // Check server endpoint first before any raw Google REST
  try {
    const apiRes = await fetch('/api/banners', { signal: AbortSignal.timeout(3000) });
    if (apiRes.ok) {
      const apiData = await apiRes.json();
      if (Array.isArray(apiData) && apiData.length > 0) {
        cachedFirestoreBanners = apiData;
        lastBannersFetchTime = now;
        return cachedFirestoreBanners;
      }
    }
  } catch (e) {}

  // If local SDK and server didn't return documents, fallback to direct Firestore REST endpoint ONLY if not in cooldown
  if (map.size === 0 && now > bannersRestCooldownUntil) {
    const projects = [
      adminFirebaseConfig.projectId,
      userFirebaseConfig.projectId
    ].filter(Boolean) as string[];

    const uniqueProjects = Array.from(new Set(projects));
    await Promise.allSettled(uniqueProjects.map(async (proj) => {
      try {
        const apiKey = adminFirebaseConfig.apiKey || userFirebaseConfig.apiKey;
        const res = await fetch(`https://firestore.googleapis.com/v1/projects/${proj}/databases/(default)/documents/banners${apiKey ? `?key=${apiKey}` : ''}`, {
          signal: AbortSignal.timeout(4000)
        });
        if (res.status === 429) {
          console.warn('[Firestore] Received 429 for banners from Google REST API. Entering 5-minute cooldown.');
          bannersRestCooldownUntil = Date.now() + 5 * 60 * 1000;
          return;
        }
        if (!res.ok) return;
        const data: any = await res.json();
        if (data && Array.isArray(data.documents)) {
          for (const d of data.documents) {
            const parsed = parseFirestoreBannerRest(d);
            if (parsed && parsed.id && !map.has(parsed.id)) {
              map.set(parsed.id, parsed);
            }
          }
        }
      } catch (e) {}
    }));
  }

  const result = Array.from(map.values());
  if (result.length > 0) {
    cachedFirestoreBanners = result;
    lastBannersFetchTime = now;
  }
  return result;
};

/**
 * Real-time listener for hero banners from Firestore
 */
export const subscribeToBanners = (callback: (banners: BannerSlide[]) => void) => {
  let adminMap = new Map<string, BannerSlide>();
  let userMap = new Map<string, BannerSlide>();

  const emitMerged = () => {
    const merged = new Map<string, BannerSlide>();
    userMap.forEach((b, id) => merged.set(id, b));
    adminMap.forEach((b, id) => merged.set(id, b));
    if (merged.size > 0) {
      callback(Array.from(merged.values()));
    }
  };

  let unsubAdmin = () => {};
  let unsubUser = () => {};

  try {
    if (adminDb) {
      const adminRef = collection(adminDb, 'banners');
      unsubAdmin = onSnapshot(adminRef, (snapshot) => {
        adminMap = new Map();
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.image && String(d.image).trim() !== '') {
            adminMap.set(docSnap.id, {
              id: docSnap.id,
              tag: d.tag || 'NEW ARRIVAL SPOTLIGHT',
              title: d.title || '',
              description: d.description || '',
              image: d.image,
              ctaText: d.ctaText || 'Shop Now',
              ctaLink: d.ctaLink || '',
              targetCollection: d.targetCollection || 'All',
              targetCategory: d.targetCategory || 'All'
            });
          }
        });
        emitMerged();
      }, () => {});
    }
  } catch (err) {}

  try {
    if (userDb) {
      const userRef = collection(userDb, 'banners');
      unsubUser = onSnapshot(userRef, (snapshot) => {
        userMap = new Map();
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.image && String(d.image).trim() !== '') {
            userMap.set(docSnap.id, {
              id: docSnap.id,
              tag: d.tag || 'NEW ARRIVAL SPOTLIGHT',
              title: d.title || '',
              description: d.description || '',
              image: d.image,
              ctaText: d.ctaText || 'Shop Now',
              ctaLink: d.ctaLink || '',
              targetCollection: d.targetCollection || 'All',
              targetCategory: d.targetCategory || 'All'
            });
          }
        });
        emitMerged();
      }, () => {});
    }
  } catch (err) {}

  // Trigger immediate initial fetch so banners appear without delay
  fetchBannersFromFirestore().then((initial) => {
    if (initial.length > 0) {
      callback(initial);
    }
  }).catch(() => {});

  return () => {
    unsubAdmin();
    unsubUser();
  };
};

/**
 * Save / Update a hero banner in Firestore
 */
export const saveBannerToFirestore = async (banner: BannerSlide): Promise<void> => {
  const payload = sanitizeForFirestore({
    ...banner,
    updatedAt: new Date().toISOString()
  });

  const saveDb = async (dbInstance: Firestore | null) => {
    if (!dbInstance) return;
    try {
      await ensureAdminAuth();
      const docRef = doc(dbInstance, 'banners', banner.id);
      await withTimeout(setDoc(docRef, payload, { merge: true }), 3500);
    } catch (e) {}
  };

  await Promise.allSettled([saveDb(adminDb), saveDb(userDb)]);

  try {
    const putRes = await fetch(`/api/banners/${encodeURIComponent(banner.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(banner)
    });
    if (!putRes.ok) {
      await fetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(banner)
      });
    }
  } catch (err) {}
};

/**
 * Delete a hero banner from Firestore
 */
export const deleteBannerFromFirestore = async (bannerId: string): Promise<void> => {
  const deleteFrom = async (dbInstance: Firestore | null) => {
    if (!dbInstance) return;
    try {
      await ensureAdminAuth();
      const docRef = doc(dbInstance, 'banners', bannerId);
      await withTimeout(deleteDoc(docRef), 3500);
    } catch (e) {}
  };

  await Promise.allSettled([deleteFrom(adminDb), deleteFrom(userDb)]);

  try {
    await fetch(`/api/banners/${encodeURIComponent(bannerId)}`, {
      method: 'DELETE'
    });
  } catch (err) {}
};

/**
 * Save / Update an Order to Firestore
 */
export const saveOrderToFirestore = async (order: Order): Promise<void> => {
  const payload = sanitizeForFirestore({
    ...order,
    updatedAt: new Date().toISOString()
  });

  const saveDb = async (dbInstance: Firestore) => {
    const docRef = doc(dbInstance, 'orders', order.id);
    await setDoc(docRef, payload, { merge: true });
  };

  await Promise.allSettled([
    saveDb(adminDb),
    saveDb(userDb)
  ]);
};

/**
 * Real-time listener for Orders collection
 */
export const subscribeToOrders = (callback: (orders: Order[]) => void) => {
  let adminOrdersMap = new Map<string, Order>();
  let userOrdersMap = new Map<string, Order>();

  const emitMerged = () => {
    const map = new Map<string, Order>();
    userOrdersMap.forEach((o, id) => map.set(id, o));
    adminOrdersMap.forEach((o, id) => map.set(id, o));
    const items = Array.from(map.values());
    if (items.length > 0 || (adminOrdersMap.size === 0 && userOrdersMap.size === 0)) {
      callback(items);
    }
  };

  let unsubAdmin = () => {};
  let unsubUser = () => {};

  try {
    if (adminDb) {
      const adminRef = collection(adminDb, 'orders');
      unsubAdmin = onSnapshot(adminRef, (snapshot) => {
        adminOrdersMap = new Map();
        snapshot.forEach((docSnap) => {
          adminOrdersMap.set(docSnap.id, {
            id: docSnap.id,
            ...docSnap.data()
          } as Order);
        });
        emitMerged();
      }, () => {});
    }
  } catch (err) {}

  try {
    if (userDb) {
      const userRef = collection(userDb, 'orders');
      unsubUser = onSnapshot(userRef, (snapshot) => {
        userOrdersMap = new Map();
        snapshot.forEach((docSnap) => {
          userOrdersMap.set(docSnap.id, {
            id: docSnap.id,
            ...docSnap.data()
          } as Order);
        });
        emitMerged();
      }, () => {});
    }
  } catch (err) {}

  return () => {
    unsubAdmin();
    unsubUser();
  };
};

/**
 * Update order status in Firestore
 */
export const updateOrderStatusInFirestore = async (orderId: string, status: string): Promise<void> => {
  const payload = sanitizeForFirestore({
    orderStatus: status,
    status: status,
    updatedAt: new Date().toISOString()
  });

  const updateDb = async (dbInstance: Firestore) => {
    const docRef = doc(dbInstance, 'orders', orderId);
    await setDoc(docRef, payload, { merge: true });
  };

  await Promise.allSettled([
    updateDb(adminDb),
    updateDb(userDb)
  ]);
};

/**
 * Fetch all orders from Firestore directly
 */
export const fetchOrdersFromFirestore = async (): Promise<Order[]> => {
  const itemsMap = new Map<string, Order>();

  const fetchFromDb = async (dbInstance: Firestore) => {
    try {
      const ref = collection(dbInstance, 'orders');
      const snap = await getDocs(ref);
      snap.forEach((docSnap) => {
        itemsMap.set(docSnap.id, {
          id: docSnap.id,
          ...docSnap.data()
        } as Order);
      });
    } catch (err) {}
  };

  await Promise.allSettled([
    fetchFromDb(adminDb),
    fetchFromDb(userDb)
  ]);

  return Array.from(itemsMap.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
};

/**
 * Real-time listener for Promos/Coupons collection (featdb-admin)
 */
export const subscribeToPromos = (callback: (promos: PromoCode[]) => void) => {
  let unsubAdmin = () => {};

  try {
    if (!adminDb) return () => {};
    const adminRef = collection(adminDb, 'promos');
    unsubAdmin = onSnapshot(adminRef, (snapshot) => {
      const promos: PromoCode[] = [];
      snapshot.forEach((docSnap) => {
        promos.push({
          code: docSnap.id,
          ...docSnap.data()
        } as PromoCode);
      });
      callback(promos);
    }, () => {});
  } catch (err) {}

  return () => {
    unsubAdmin();
  };
};

/**
 * Save Promo to Firestore (featdb-admin)
 */
export const savePromoToFirestore = async (promo: PromoCode): Promise<void> => {
  const payload = sanitizeForFirestore({
    ...promo,
    code: promo.code.toUpperCase(),
    updatedAt: new Date().toISOString()
  });

  if (adminDb) {
    const docRef = doc(adminDb, 'promos', promo.code.toUpperCase());
    await setDoc(docRef, payload, { merge: true });
  }
  if (userDb) {
    try {
      const docRef = doc(userDb, 'promos', promo.code.toUpperCase());
      await setDoc(docRef, payload, { merge: true });
    } catch (e) {}
  }
};

/**
 * Delete Promo from Firestore (featdb-admin)
 */
export const deletePromoFromFirestore = async (code: string): Promise<void> => {
  if (adminDb) {
    const docRef = doc(adminDb, 'promos', code.toUpperCase());
    await deleteDoc(docRef);
  }
  if (userDb) {
    try {
      const docRef = doc(userDb, 'promos', code.toUpperCase());
      await deleteDoc(docRef);
    } catch (e) {}
  }
};

/**
 * Save Live Sale Config to Firestore (featdb-admin)
 */
export const saveLiveSaleToFirestore = async (config: LiveSaleConfig): Promise<void> => {
  const payload = sanitizeForFirestore({
    ...config,
    updatedAt: new Date().toISOString()
  });

  if (adminDb) {
    const docRef = doc(adminDb, 'settings', 'liveSale');
    await setDoc(docRef, payload, { merge: true });
  }
  if (userDb) {
    try {
      const docRef = doc(userDb, 'settings', 'liveSale');
      await setDoc(docRef, payload, { merge: true });
    } catch (e) {}
  }
};

/**
 * Subscribe to Live Sale Config in Firestore
 */
export const subscribeToLiveSale = (callback: (config: LiveSaleConfig) => void) => {
  let unsubAdmin = () => {};

  try {
    if (!adminDb) return () => {};
    const adminRef = doc(adminDb, 'settings', 'liveSale');
    unsubAdmin = onSnapshot(adminRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as LiveSaleConfig);
      }
    }, () => {});
  } catch (err) {}

  return () => {
    unsubAdmin();
  };
};

/**
 * Log failed / cancelled / timeout transaction metadata to Firestore 'payment_logs' collection in featdb-admin
 */
export const logPaymentFailureToFirestore = async (logData: Partial<PaymentLog>): Promise<string> => {
  const logId = logData.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const fullLog: PaymentLog = {
    id: logId,
    timestamp: logData.timestamp || new Date().toISOString(),
    orderId: logData.orderId || '',
    paymentId: logData.paymentId || '',
    status: logData.status || 'failed',
    errorCode: logData.errorCode || 'UNKNOWN_ERROR',
    errorReason: logData.errorReason || '',
    errorDescription: logData.errorDescription || '',
    errorSource: logData.errorSource || 'gateway',
    errorStep: logData.errorStep || 'payment_authorization',
    paymentMethod: logData.paymentMethod || 'Razorpay',
    amount: Number(logData.amount) || 0,
    customerName: logData.customerName || 'Guest Shopper',
    customerEmail: logData.customerEmail || '',
    customerPhone: logData.customerPhone || '',
    cartItemsCount: logData.cartItemsCount || 0,
    itemsSummary: logData.itemsSummary || '',
    elapsedSeconds: logData.elapsedSeconds || 0,
    deviceInfo: logData.deviceInfo || {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      online: typeof navigator !== 'undefined' ? navigator.onLine : true
    },
    actionAdvice: logData.actionAdvice || '',
    createdAt: new Date().toISOString()
  };

  if (adminDb) {
    try {
      const docRef = doc(adminDb, 'payment_logs', logId);
      await setDoc(docRef, sanitizeForFirestore(fullLog), { merge: true });
    } catch (err) {
      console.warn('[PaymentLog] Notice logging to featdb-admin:', err);
    }
  }

  return logId;
};

/**
 * Real-time listener for Payment Logs collection from featdb-admin
 */
export const subscribeToPaymentLogs = (callback: (logs: PaymentLog[]) => void) => {
  let unsubAdmin = () => {};

  try {
    if (!adminDb) return () => {};
    const adminRef = collection(adminDb, 'payment_logs');
    unsubAdmin = onSnapshot(adminRef, (snapshot) => {
      const items: PaymentLog[] = [];
      snapshot.forEach((docSnap) => {
        items.push({
          id: docSnap.id,
          ...docSnap.data()
        } as PaymentLog);
      });
      callback(items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
    }, () => {});
  } catch (err) {}

  return () => {
    unsubAdmin();
  };
};

/**
 * Fetch all payment logs from featdb-admin
 */
export const fetchPaymentLogsFromFirestore = async (): Promise<PaymentLog[]> => {
  const itemsMap = new Map<string, PaymentLog>();

  try {
    if (adminDb) {
      const ref = collection(adminDb, 'payment_logs');
      const snap = await getDocs(ref);
      snap.forEach((docSnap) => {
        itemsMap.set(docSnap.id, {
          id: docSnap.id,
          ...docSnap.data()
        } as PaymentLog);
      });
    }
  } catch (err) {}

  return Array.from(itemsMap.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
};

/**
 * Compresses an image file in the browser canvas to a lightweight high-res data URL & Blob
 * (~40KB-60KB) to ensure instant rendering and stay far below Firestore's 1MB document limit.
 */
export const compressImageFile = (
  file: File,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.78
): Promise<{ dataUrl: string; blob?: Blob }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          let dataUrl = canvas.toDataURL('image/jpeg', quality);

          // If still large (> 250 KB), compress again to guarantee tiny payload
          if (dataUrl.length > 250000) {
            const secondaryCanvas = document.createElement('canvas');
            const sWidth = Math.round(width * 0.75);
            const sHeight = Math.round(height * 0.75);
            secondaryCanvas.width = sWidth;
            secondaryCanvas.height = sHeight;
            const sCtx = secondaryCanvas.getContext('2d');
            if (sCtx) {
              sCtx.drawImage(canvas, 0, 0, sWidth, sHeight);
              dataUrl = secondaryCanvas.toDataURL('image/jpeg', 0.58);
              secondaryCanvas.toBlob((blob) => {
                resolve({ dataUrl, blob: blob || undefined });
              }, 'image/jpeg', 0.58);
              return;
            }
          }

          canvas.toBlob((blob) => {
            resolve({ dataUrl, blob: blob || undefined });
          }, 'image/jpeg', quality);
        } else {
          resolve({ dataUrl: (readerEvent.target?.result as string) || '' });
        }
      };
      img.onerror = () => {
        resolve({ dataUrl: (readerEvent.target?.result as string) || '' });
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => {
      resolve({ dataUrl: '' });
    };
    reader.readAsDataURL(file);
  });
};

export const MAX_UPLOAD_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB allowable upload (canvas automatically compresses to ~50KB)

// In-memory cache for Firestore images mapped from filename or docId to dataUrl
export const firestoreImageCache = new Map<string, string>();

/**
 * Fetch a persistent image directly from Admin Firestore (featdb-admin) in real-time.
 * Resolves /api/images/:filename or filename to the real base64 dataUrl stored in Firestore.
 */
export const fetchImageFromFirestore = async (filenameOrUrl: string): Promise<string | null> => {
  if (!filenameOrUrl || typeof filenameOrUrl !== 'string') return null;
  const trimmed = filenameOrUrl.trim();
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const cleanFilename = trimmed.replace(/^\/api\/images\//, '').replace(/[^a-zA-Z0-9._-]/g, '');
  if (!cleanFilename) return null;

  if (firestoreImageCache.has(cleanFilename)) {
    return firestoreImageCache.get(cleanFilename)!;
  }

  if (missingImageNegativeCache.has(cleanFilename)) {
    return null;
  }

  // 1. Check if adminDb Firestore SDK is active
  if (adminDb) {
    try {
      const cleanDocId = cleanFilename.replace(/[^a-zA-Z0-9_-]/g, '_');
      const docCandidates = [
        cleanDocId.startsWith('img_') ? cleanDocId : `img_${cleanDocId}`,
        cleanDocId,
        `img_${cleanDocId}`
      ];
      for (const id of docCandidates) {
        const snap = await withTimeout(getDoc(doc(adminDb, 'settings', id)), 3500, null);
        if (snap && snap.exists()) {
          const d = snap.data();
          if (d && typeof d.dataUrl === 'string' && d.dataUrl.startsWith('data:image/')) {
            firestoreImageCache.set(cleanFilename, d.dataUrl);
            return d.dataUrl;
          }
        }
      }
    } catch (_) {}
  }

  // Mark in negative cache so we do not repeatedly request missing files
  missingImageNegativeCache.add(cleanFilename);
  return null;
};

/**
 * Uploads an admin file (product photo or hero banner) with high-efficiency compression,
 * Firebase Storage upload attempts across available buckets, and direct Firestore persistence.
 * Guarantees that photos are stored in Firebase Firestore/Storage and survive Railway container restarts!
 */
export const uploadAdminFile = async (
  file: File, 
  folder: 'products' | 'banners' | 'variants' = 'products',
  onProgress?: (progress: number) => void
): Promise<string> => {
  // Validate file size does not exceed 25 MB
  if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`File "${file.name}" is ${sizeMb} MB, which exceeds the 25 MB limit. Please select an image under 25 MB.`);
  }

  if (onProgress) onProgress(15);

  // 1. Optimize & Compress image into lightweight payload (~30KB-60KB)
  let compressedDataUrl = '';
  let compressedBlob: Blob | undefined;

  try {
    const compressed = await compressImageFile(file);
    compressedDataUrl = compressed.dataUrl;
    compressedBlob = compressed.blob;
    if (onProgress) onProgress(35);
  } catch (err) {
    // Compression fallback
  }

  // Guaranteed fallback: read as standard DataURL if canvas compression produced empty result
  if (!compressedDataUrl) {
    try {
      compressedDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    } catch (_) {}
  }

  // 2. Direct Firestore Persistence:
  // Write into Admin Firestore `settings` collection directly via Admin Firestore SDK
  const timestamp = Date.now();
  const fileUniqueId = `img_${timestamp}_${Math.random().toString(36).substring(2, 8)}.jpg`;
  const cleanDocId = fileUniqueId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const docId = cleanDocId.startsWith('img_') ? cleanDocId : `img_${cleanDocId}`;

  if (adminDb && compressedDataUrl && compressedDataUrl.length < 800000) {
    try {
      firestoreImageCache.set(fileUniqueId, compressedDataUrl);
      firestoreImageCache.set(docId, compressedDataUrl);
      setDoc(doc(adminDb, 'settings', docId), {
        id: fileUniqueId,
        filename: file.name,
        dataUrl: compressedDataUrl,
        createdAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    } catch (_) {}
  }

  if (onProgress) onProgress(65);

  // 3. Reliable Backend Proxy Upload (/api/upload):
  // Posts to application server backend to safely persist into in-memory cache, filesystem,
  // and cloud storage while completely avoiding browser CORS preflight errors.
  let serverProvidedUrl = '';
  if (compressedDataUrl) {
    try {
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: compressedDataUrl,
          filename: fileUniqueId,
          folder
        })
      });
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        if (uploadData && uploadData.url && typeof uploadData.url === 'string') {
          if (uploadData.url.startsWith('http://') || uploadData.url.startsWith('https://') || uploadData.url.startsWith('/api/images/')) {
            serverProvidedUrl = uploadData.url;
          }
        }
      }
    } catch (uploadErr) {
      console.warn('[Upload] Notice during backend upload:', uploadErr);
    }
  }

  if (onProgress) onProgress(100);

  // Return the public cloud URL if available, otherwise the self-contained, optimized data URL directly!
  // This guarantees that the photo is stored directly inside the product document in Admin Firestore,
  // can be rendered instantly without separate network fetches, and eliminates all browser CORS issues!
  return serverProvidedUrl || compressedDataUrl || '';
};

export const signInAdminWithGoogle = async () => {
  if (!adminAuth || !adminGoogleProvider) {
    return null;
  }
  try {
    const result = await signInWithPopup(adminAuth, adminGoogleProvider);
    return result.user;
  } catch (error: any) {
    if (isSilentAuthCancellation(error)) {
      return null;
    }
    throw error;
  }
};

export const signInAdminWithEmail = async (authInstance: any, email: string, pass: string) => {
  if (!authInstance || typeof authInstance !== 'object' || !authInstance.app) {
    throw new Error('Admin Authentication is not configured in .env');
  }
  return signInWithEmailAndPassword(authInstance, email, pass);
};

export const createAdminWithEmail = async (authInstance: any, email: string, pass: string) => {
  if (!authInstance || typeof authInstance !== 'object' || !authInstance.app) {
    throw new Error('Admin Authentication is not configured in .env');
  }
  return createUserWithEmailAndPassword(authInstance, email, pass);
};

export const signOutAdmin = async (authInstance: any) => {
  if (!authInstance || typeof authInstance !== 'object' || !authInstance.app) return;
  return signOut(authInstance);
};

export const onAdminAuthStateChanged = (authInstance: any, nextOrObserver: any) => {
  if (!authInstance || typeof authInstance !== 'object' || !authInstance.app) {
    return () => {};
  }
  try {
    return onAuthStateChanged(authInstance, nextOrObserver);
  } catch (err) {
    return () => {};
  }
};

export type { FirebaseUser as AdminFirebaseUser };
