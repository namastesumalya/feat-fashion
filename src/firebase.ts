import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
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
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  getDocFromServer,
  Firestore
} from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, FirebaseStorage } from 'firebase/storage';
import { Product, BannerSlide, Order, PromoCode, LiveSaleConfig } from './types';
import { isSilentAuthCancellation } from './utils/authErrors';
import {
  adminDb,
  adminStorage,
  userApp,
  userDb,
  subscribeToProducts,
  fetchProductsFromFirestore,
  saveProductToFirestore,
  updateProductStockInFirestore,
  deleteProductFromFirestore,
  fetchBannersFromFirestore,
  subscribeToBanners,
  saveBannerToFirestore,
  deleteBannerFromFirestore,
  saveOrderToFirestore,
  subscribeToOrders,
  fetchOrdersFromFirestore,
  updateOrderStatusInFirestore,
  subscribeToPromos,
  savePromoToFirestore,
  deletePromoFromFirestore,
  saveLiveSaleToFirestore,
  subscribeToLiveSale,
  logPaymentFailureToFirestore,
  subscribeToPaymentLogs,
  fetchPaymentLogsFromFirestore,
  userFirebaseConfig
} from './firebaseAdmin';

// User Store & Customer Authentication Firebase Configuration - Loaded directly from .env
export const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || '').trim(),
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim(),
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim(),
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim(),
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim(),
  appId: (import.meta.env.VITE_FIREBASE_APP_ID || '').trim(),
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '').trim()
};

// Safe Authentication & Database exports
export const auth: any = userApp ? getAuth(userApp) : null;

// Export adminDb as the central Firestore Database for all items, banners, stock, and orders
export const db: Firestore = adminDb;
export { userDb, adminDb, adminStorage };

export const storage: FirebaseStorage = adminStorage || (userApp ? getStorage(userApp) : null) as unknown as FirebaseStorage;
export const googleProvider = userApp ? new GoogleAuthProvider() : null;

// Google Sign-In Helper for Customers
export const signInWithGoogle = async () => {
  if (!auth || !auth.app || !googleProvider) {
    return null;
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    if (user && userDb) {
      const userRef = doc(userDb, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Feat Customer',
          photoURL: user.photoURL || '',
          createdAt: new Date().toISOString(),
          provider: 'google'
        });
      }
    }
    return user;
  } catch (error: any) {
    if (isSilentAuthCancellation(error)) {
      // User closed popup or refused permission — handled silently without error log or popup alert
      return null;
    }
    throw error;
  }
};

// Safe auth wrappers to protect against unconfigured .env environments
export const safeSignInWithEmailAndPassword = async (authInstance: any, email: string, pass: string) => {
  if (!authInstance || typeof authInstance !== 'object' || !authInstance.app) {
    throw new Error('Authentication is not configured in .env. Please check environment variables.');
  }
  return signInWithEmailAndPassword(authInstance, email, pass);
};

export const safeCreateUserWithEmailAndPassword = async (authInstance: any, email: string, pass: string) => {
  if (!authInstance || typeof authInstance !== 'object' || !authInstance.app) {
    throw new Error('Authentication is not configured in .env. Please check environment variables.');
  }
  return createUserWithEmailAndPassword(authInstance, email, pass);
};

export const safeSignOut = async (authInstance: any) => {
  if (!authInstance || typeof authInstance !== 'object' || !authInstance.app) return;
  return signOut(authInstance);
};

export const safeSendPasswordResetEmail = async (authInstance: any, email: string) => {
  if (!authInstance || typeof authInstance !== 'object' || !authInstance.app) {
    throw new Error('Authentication is not configured in .env. Please check environment variables.');
  }
  return sendPasswordResetEmail(authInstance, email);
};

export const safeOnAuthStateChanged = (authInstance: any, nextOrObserver: any) => {
  if (!authInstance || typeof authInstance !== 'object' || !authInstance.app) {
    return () => {};
  }
  try {
    return onAuthStateChanged(authInstance, nextOrObserver);
  } catch (err) {
    return () => {};
  }
};

// Re-export all database subscription and mutation helpers mapped to Admin Firestore
export {
  subscribeToProducts,
  fetchProductsFromFirestore,
  saveProductToFirestore,
  updateProductStockInFirestore,
  deleteProductFromFirestore,
  fetchBannersFromFirestore,
  subscribeToBanners,
  saveBannerToFirestore,
  deleteBannerFromFirestore,
  saveOrderToFirestore,
  subscribeToOrders,
  fetchOrdersFromFirestore,
  updateOrderStatusInFirestore,
  subscribeToPromos,
  savePromoToFirestore,
  deletePromoFromFirestore,
  saveLiveSaleToFirestore,
  subscribeToLiveSale,
  logPaymentFailureToFirestore,
  subscribeToPaymentLogs,
  fetchPaymentLogsFromFirestore
};

export {
  safeSignInWithEmailAndPassword as signInWithEmailAndPassword,
  safeCreateUserWithEmailAndPassword as createUserWithEmailAndPassword,
  safeSignOut as signOut,
  safeSendPasswordResetEmail as sendPasswordResetEmail,
  updateProfile,
  safeOnAuthStateChanged as onAuthStateChanged
};
export type { FirebaseUser };