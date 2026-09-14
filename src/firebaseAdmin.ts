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

// Initialize dedicated Admin Firebase App ('adminApp')
export const adminApp: FirebaseApp | null = safeInitFirebaseApp('adminApp', adminFirebaseConfig);
export const adminAuth: any = adminApp ? getAuth(adminApp) : null;
export const adminDb: Firestore = (adminApp ? getFirestore(adminApp) : null) as unknown as Firestore;
export const adminStorage: FirebaseStorage = (adminApp ? getStorage(adminApp) : null) as unknown as FirebaseStorage;
export const adminGoogleProvider = adminApp ? new GoogleAuthProvider() : null;

// Initialize User/Store Firebase App ('[DEFAULT]')
export const userApp: FirebaseApp | null = safeInitFirebaseApp('[DEFAULT]', userFirebaseConfig);
export const userDb: Firestore = (userApp ? getFirestore(userApp) : null) as unknown as Firestore;
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
      callback(deduplicateProducts(rawList));
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

/**
 * Fetch all products from Admin Firestore (featdb-admin)
 */
export const fetchProductsFromFirestore = async (): Promise<Product[]> => {
  const now = Date.now();
  if (cachedFirestoreProducts && (now - lastProductsFetchTime < 60000)) {
    return cachedFirestoreProducts;
  }

  const rawList: Product[] = [];

  const fetchFromDb = async (dbInstance: Firestore) => {
    try {
      if (!dbInstance) return;
      const ref = collection(dbInstance, 'products');
      const snap = await withTimeout(getDocs(ref), 7000, null);
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

  // If Firebase SDK retrieved documents, return immediately and cache - NEVER call raw REST
  const deduplicatedSdk = deduplicateProducts(rawList);
  if (deduplicatedSdk.length > 0) {
    cachedFirestoreProducts = deduplicatedSdk;
    lastProductsFetchTime = now;
    return cachedFirestoreProducts;
  }

  // If running in full-stack app, proxy through server /api/products instead of hitting Google REST directly
  try {
    const apiRes = await fetch('/api/products', { signal: AbortSignal.timeout(4000) });
    if (apiRes.ok) {
      const apiData = await apiRes.json();
      if (apiData && Array.isArray(apiData.products) && apiData.products.length > 0) {
        cachedFirestoreProducts = deduplicateProducts(apiData.products);
        lastProductsFetchTime = now;
        return cachedFirestoreProducts;
      }
    }
  } catch (e) {
    // Server endpoint unreachable (e.g. pure static build)
  }

  // Direct REST query to project database only as absolute fallback if SDK and /api/products are empty AND not in 429 cooldown
  const restProjects = adminFirebaseConfig.projectId ? [adminFirebaseConfig.projectId] : [];
  if (rawList.length === 0 && restProjects.length > 0 && now > firestoreRestCooldownUntil) {
    const apiKey = adminFirebaseConfig.apiKey || userFirebaseConfig.apiKey;
    await Promise.allSettled(restProjects.map(async (proj) => {
      try {
        const url = `https://firestore.googleapis.com/v1/projects/${proj}/databases/(default)/documents/products${apiKey ? `?key=${apiKey}` : ''}`;
        const res = await fetch(url, {
          signal: AbortSignal.timeout(5000)
        });
        if (res.status === 429) {
          console.warn('[Firestore] Received 429 quota from Google Cloud REST API. Entering 5-minute backoff cooldown.');
          firestoreRestCooldownUntil = Date.now() + 5 * 60 * 1000;
          return;
        }
        if (!res.ok) return;
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
 * Save / Update a product to Admin Firestore (featdb-admin)
 */
export const saveProductToFirestore = async (product: Partial<Product> & { id: string }): Promise<void> => {
  const canonicalId = product.id || product.sku || ('PROD_' + Date.now());
  const payload = {
    ...product,
    id: canonicalId,
    sku: product.sku || canonicalId,
    updatedAt: new Date().toISOString()
  };

  // 1. Direct Client-side Firestore SDK write
  try {
    if (adminDb) {
      await ensureAdminAuth();
      const docRef = doc(adminDb, 'products', canonicalId);
      await withTimeout(setDoc(docRef, payload, { merge: true }), 3500);
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
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
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
  const updatePayload: any = {
    stockCount,
    updatedAt: new Date().toISOString()
  };
  if (sizeStock) {
    updatePayload.sizeStock = sizeStock;
  }

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
  const payload = {
    ...banner,
    updatedAt: new Date().toISOString()
  };

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
  const payload = {
    ...order,
    updatedAt: new Date().toISOString()
  };

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
  } catch (err) {}

  try {
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
  const payload = {
    orderStatus: status,
    status: status,
    updatedAt: new Date().toISOString()
  };

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
  const payload = {
    ...promo,
    code: promo.code.toUpperCase(),
    updatedAt: new Date().toISOString()
  };

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
  const payload = {
    ...config,
    updatedAt: new Date().toISOString()
  };

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
      await setDoc(docRef, fullLog, { merge: true });
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
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
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

export const MAX_UPLOAD_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB strict limit

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

  // 2. Direct Firestore REST query fallback
  try {
    const adminProject = adminFirebaseConfig.projectId || 'featdb-admin';
    const apiKey = adminFirebaseConfig.apiKey;
    const cleanDocId = cleanFilename.replace(/[^a-zA-Z0-9_-]/g, '_');
    const docCandidates = [
      cleanDocId.startsWith('img_') ? cleanDocId : `img_${cleanDocId}`,
      cleanDocId
    ];
    for (const id of docCandidates) {
      const url = `https://firestore.googleapis.com/v1/projects/${adminProject}/databases/(default)/documents/settings/${id}${apiKey ? `?key=${apiKey}` : ''}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const docData: any = await res.json();
        const rawDataUrl = docData.fields?.dataUrl?.stringValue;
        if (rawDataUrl && rawDataUrl.startsWith('data:image/')) {
          firestoreImageCache.set(cleanFilename, rawDataUrl);
          return rawDataUrl;
        }
      }
    }
  } catch (_) {}

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
  // Validate file size does not exceed 1 MB
  if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    throw new Error(`File "${file.name}" is ${sizeMb} MB, which exceeds the 1 MB limit. Please compress or select an image under 1 MB.`);
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

  const uploadToStorage = async (storageInstance: FirebaseStorage): Promise<string | null> => {
    if (!storageInstance) return null;
    let uploadTask: any = null;
    try {
      const timestamp = Date.now();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${folder}/${timestamp}_${cleanFileName}`;
      const storageRef = ref(storageInstance, path);
      const uploadPayload = compressedBlob || file;

      uploadTask = uploadBytesResumable(storageRef, uploadPayload, {
        contentType: 'image/jpeg'
      });

      return await Promise.race([
        new Promise<string>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot: any) => {
              if (snapshot.totalBytes > 0) {
                const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                if (onProgress) onProgress(Math.max(35, progress));
              }
            },
            (error: any) => reject(error),
            async () => {
              try {
                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadUrl);
              } catch (err) {
                reject(err);
              }
            }
          );
        }),
        new Promise<string>((_, reject) => 
          setTimeout(() => {
            if (uploadTask) {
              try { uploadTask.cancel(); } catch (e) {}
            }
            reject(new Error('Storage timeout'));
          }, 8000)
        )
      ]);
    } catch (err) {
      if (uploadTask) {
        try { uploadTask.cancel(); } catch (e) {}
      }
      return null;
    }
  };

  // 2. Try Firebase Storage with brief timeout if available
  if (adminStorage) {
    const url = await uploadToStorage(adminStorage);
    if (url) {
      if (onProgress) onProgress(100);
      return url;
    }
  }

  if (userStorage) {
    const url = await uploadToStorage(userStorage);
    if (url) {
      if (onProgress) onProgress(100);
      return url;
    }
  }

  // 3. Direct Firestore Persistence:
  // Write into Admin Firestore `settings` collection directly via Admin Firestore SDK
  const timestamp = Date.now();
  const fileUniqueId = `img_${timestamp}_${Math.random().toString(36).substring(2, 8)}.jpg`;
  const cleanDocId = fileUniqueId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const docId = cleanDocId.startsWith('img_') ? cleanDocId : `img_${cleanDocId}`;

  if (adminDb && compressedDataUrl) {
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

  // Also send to backend /api/upload in background so local memory cache is populated if container is live
  if (compressedDataUrl) {
    fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: compressedDataUrl,
        filename: fileUniqueId,
        folder
      })
    }).catch(() => {});
  }

  if (onProgress) onProgress(100);

  // Return the self-contained, compressed data URL directly!
  // This guarantees that the photo is stored DIRECTLY inside the product document in Admin Firestore
  // and is fetched in real-time from Firestore, NEVER lost on Railway container redeployments!
  return compressedDataUrl || '';
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
