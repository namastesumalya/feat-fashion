import { 
  auth, 
  signInWithGoogle, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  userDb
} from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { isSilentAuthCancellation, getCleanAuthErrorMessage } from '../utils/authErrors';

export interface CustomerSession {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  token?: string;
}

const STORAGE_KEY = 'feat_customer_session';

// In-memory auth listeners
type AuthListener = (user: CustomerSession | null) => void;
const listeners: Set<AuthListener> = new Set();

export const notifyAuthListeners = (user: CustomerSession | null) => {
  listeners.forEach(cb => {
    try {
      cb(user);
    } catch (e) {
      console.warn('Auth listener error:', e);
    }
  });
};

export const getStoredCustomerSession = (): CustomerSession | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.email) {
      return parsed;
    }
  } catch (e) {
    // Ignore JSON parse errors
  }
  return null;
};

export const saveCustomerSession = (user: CustomerSession | null): void => {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      // Save customer email for checkout convenience
      localStorage.setItem('feat_saved_customer_email', user.email);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    // LocalStorage quota or access error
  }
  notifyAuthListeners(user);
};

/**
 * Sign in existing customer using Firebase Auth or server-side auth fallback
 */
export const signInCustomer = async (email: string, pass: string): Promise<CustomerSession> => {
  const cleanEmail = email.trim().toLowerCase();
  
  // 1. Try Firebase Auth if configured and active
  if (auth && typeof auth === 'object' && auth.app) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const fbUser = userCredential.user;
      const session: CustomerSession = {
        uid: fbUser.uid,
        email: fbUser.email || cleanEmail,
        displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Feat Shopper',
        phone: fbUser.phoneNumber || ''
      };
      saveCustomerSession(session);
      return session;
    } catch (fbErr: any) {
      if (
        fbErr.code === 'auth/invalid-credential' || 
        fbErr.code === 'auth/wrong-password' || 
        fbErr.code === 'auth/user-not-found'
      ) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      }
      // Attempt server-side auth fallback silently
    }
  }

  // 2. Server-side / local authentication fallback
  try {
    const res = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: pass })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Invalid email or password. Please try again.');
    }
    const session: CustomerSession = {
      uid: data.user.uid,
      email: data.user.email,
      displayName: data.user.displayName || 'Feat Shopper',
      phone: data.user.phone || '',
      token: data.token
    };
    saveCustomerSession(session);
    return session;
  } catch (err: any) {
    throw new Error(err.message || 'Authentication failed. Please check your credentials.');
  }
};

/**
 * Sign up new customer using Firebase Auth or server-side auth fallback
 */
export const signUpCustomer = async (
  email: string, 
  pass: string, 
  fullName: string, 
  phone?: string
): Promise<CustomerSession> => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = fullName.trim();
  const cleanPhone = phone?.trim() || '';

  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (!cleanName) {
    throw new Error('Please enter your full name.');
  }
  if (pass.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  // 1. Try Firebase Auth if configured and active
  if (auth && typeof auth === 'object' && auth.app) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      const fbUser = userCredential.user;

      if (cleanName) {
        await updateProfile(fbUser, { displayName: cleanName }).catch(() => {});
      }

      // Save user doc to Firestore if available
      try {
        if (userDb) {
          await setDoc(doc(userDb, 'users', fbUser.uid), {
            uid: fbUser.uid,
            email: cleanEmail,
            displayName: cleanName,
            phone: cleanPhone,
            createdAt: new Date().toISOString(),
            provider: 'password'
          }, { merge: true });
        }
      } catch (dbErr) {}

      const session: CustomerSession = {
        uid: fbUser.uid,
        email: cleanEmail,
        displayName: cleanName,
        phone: cleanPhone
      };
      saveCustomerSession(session);

      // Sync user to backend as well so server knows about the account
      fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: fbUser.uid, email: cleanEmail, displayName: cleanName, phone: cleanPhone })
      }).catch(() => {});

      return session;
    } catch (fbErr: any) {
      if (fbErr.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email address already exists. Please Sign In instead.');
      }
      if (fbErr.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please use at least 6 characters.');
      }
      // Attempt server-side auth fallback silently
    }
  }

  // 2. Server-side user registration fallback
  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        password: pass,
        displayName: cleanName,
        phone: cleanPhone
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to create account. Please try again.');
    }
    const session: CustomerSession = {
      uid: data.user.uid,
      email: data.user.email,
      displayName: data.user.displayName || cleanName,
      phone: data.user.phone || cleanPhone,
      token: data.token
    };
    saveCustomerSession(session);
    return session;
  } catch (err: any) {
    throw new Error(err.message || 'Account creation failed. Please try again.');
  }
};

/**
 * Google Sign-In helper (silently handles dismissal/cancellation)
 */
export const signInCustomerWithGoogle = async (): Promise<CustomerSession | null> => {
  try {
    const fbUser = await signInWithGoogle();
    if (fbUser) {
      const session: CustomerSession = {
        uid: fbUser.uid,
        email: fbUser.email || '',
        displayName: fbUser.displayName || 'Feat Shopper',
        phone: fbUser.phoneNumber || ''
      };
      saveCustomerSession(session);

      // Sync to backend
      fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          phone: fbUser.phoneNumber
        })
      }).catch(() => {});

      return session;
    }
    return null;
  } catch (err: any) {
    if (isSilentAuthCancellation(err)) {
      return null;
    }
    const cleanMsg = getCleanAuthErrorMessage(err);
    if (cleanMsg) {
      throw new Error(cleanMsg);
    }
    return null;
  }
};

/**
 * Sign out customer from all sessions
 */
export const signOutCustomer = async (): Promise<void> => {
  try {
    if (auth && typeof auth === 'object' && auth.app) {
      await signOut(auth);
    }
  } catch (e) {}

  saveCustomerSession(null);
};

/**
 * Send password reset email
 */
export const resetCustomerPassword = async (email: string): Promise<void> => {
  const cleanEmail = email.trim().toLowerCase();
  if (auth && typeof auth === 'object' && auth.app) {
    await sendPasswordResetEmail(auth, cleanEmail);
    return;
  }

  // Server-side password reset request
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cleanEmail })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to send password reset link');
  }
};

/**
 * Subscribe to customer authentication state changes
 */
export const subscribeToCustomerAuth = (callback: AuthListener): (() => void) => {
  listeners.add(callback);

  // Emit current session immediately
  const initial = getStoredCustomerSession();
  if (initial) {
    callback(initial);
  }

  // Also listen to Firebase onAuthStateChanged
  let fbUnsub = () => {};
  if (auth && typeof auth === 'object' && auth.app) {
    try {
      fbUnsub = onAuthStateChanged(auth, (fbUser) => {
        if (fbUser) {
          const session: CustomerSession = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || 'Feat Shopper',
            phone: fbUser.phoneNumber || ''
          };
          saveCustomerSession(session);
        } else {
          // If firebase says logged out, only clear if we don't have a valid server token session
          const stored = getStoredCustomerSession();
          if (!stored?.token) {
            saveCustomerSession(null);
          }
        }
      });
    } catch (e) {}
  }

  return () => {
    listeners.delete(callback);
    fbUnsub();
  };
};
