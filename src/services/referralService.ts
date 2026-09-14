import { MagicFeatherTransaction, UserReferralProfile } from '../types';
import { MagicFeatherSvg } from '../components/MagicFeatherSvg';

export type { MagicFeatherTransaction, UserReferralProfile };
export { MagicFeatherSvg };

const FEATHERS_LOCAL_STORAGE_KEY_PREFIX = 'feat_magic_feathers_';
const REFERRED_BY_PENDING_KEY = 'feat_pending_referral_code';

/**
 * Conversion constant:
 * 1 Magic Feather = 50 Paisa = ₹0.50
 * 2 Magic Feathers = ₹1.00
 */
export const FEATHER_RUPEE_VALUE = 0.50; // 50 paisa
export const FEATHER_REWARD_MAX_RATE = 0.05; // Up to 5% (0.1% to 5.0%)

export function feathersToRupees(feathers: number): number {
  return Number((Math.max(0, feathers) * FEATHER_RUPEE_VALUE).toFixed(2));
}

export function rupeesToFeathers(rupees: number): number {
  return Math.floor(Math.max(0, rupees) / FEATHER_RUPEE_VALUE);
}

/**
 * Calculates dynamic reward up to 5% (between 0.1% and 5.0%) of billing value in Magic Feathers
 */
export function calculateEarnedFeathers(
  billingValue: number, 
  customPercent?: number
): { feathers: number; rupees: number; percent: number } {
  const safeValue = Math.max(0, billingValue);
  const percent = customPercent !== undefined 
    ? Math.min(5.0, Math.max(0.1, customPercent))
    : Number((Math.random() * 4.9 + 0.1).toFixed(1)); // Dynamic 0.1% to 5.0%
  const rupees = Math.max(1, Math.round((safeValue * percent) / 100));
  const feathers = Math.round(rupees / FEATHER_RUPEE_VALUE);
  return { feathers, rupees, percent };
}

/**
 * Check in real-time if a referral code is available or already taken
 */
export async function checkReferralCodeAvailability(
  code: string,
  userId?: string,
  email?: string
): Promise<{ available: boolean; code: string; error?: string; message?: string }> {
  const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleanCode) {
    return { available: false, code: cleanCode, error: 'Please enter a code to check.' };
  }
  if (cleanCode.length < 3) {
    return { available: false, code: cleanCode, error: 'Referral code must be at least 3 characters long.' };
  }
  if (cleanCode.length > 15) {
    return { available: false, code: cleanCode, error: 'Referral code cannot exceed 15 characters.' };
  }

  const reserved = ['ADMIN', 'SYSTEM', 'FEAT', 'SUPPORT', 'OFFICIAL', 'ROOT', 'DISCOUNT', 'VIP', 'STAFF', 'STORE'];
  if (reserved.includes(cleanCode)) {
    return { available: false, code: cleanCode, error: `"${cleanCode}" is a reserved system code. Please choose another.` };
  }

  // Pre-check against known taken seed codes
  const knownTakenCodes = ['PRIYA20', 'ROHIT99', 'FEATVIP', 'ANANYA07'];
  if (knownTakenCodes.includes(cleanCode)) {
    return { 
      available: false, 
      code: cleanCode, 
      error: `Referral code "${cleanCode}" is already taken by another user. Please choose another code.` 
    };
  }

  try {
    const params = new URLSearchParams({
      code: cleanCode,
      ...(userId ? { userId } : {}),
      ...(email ? { email } : {})
    });
    const res = await fetch(`/api/referral/check-code?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return {
        available: Boolean(data.available),
        code: cleanCode,
        error: data.error,
        message: data.message
      };
    }
  } catch (_) {}

  return { available: true, code: cleanCode, message: `✓ Code "${cleanCode}" is available to save!` };
}

/**
 * Store referral code from URL ?ref=CODE for signup or checkout attribution
 */
export function savePendingReferralCode(code: string): void {
  try {
    const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean) {
      localStorage.setItem(REFERRED_BY_PENDING_KEY, clean);
    }
  } catch (_) {}
}

export function getPendingReferralCode(): string | null {
  try {
    return localStorage.getItem(REFERRED_BY_PENDING_KEY);
  } catch (_) {
    return null;
  }
}

export function clearPendingReferralCode(): void {
  try {
    localStorage.removeItem(REFERRED_BY_PENDING_KEY);
  } catch (_) {}
}

/**
 * LocalStorage Fallback Helper for offline / client demo mode
 */
function getLocalReferralData(userId: string, userEmail: string): UserReferralProfile {
  const key = `${FEATHERS_LOCAL_STORAGE_KEY_PREFIX}${userId || userEmail}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Process any matured transactions (12 days)
      const now = Date.now();
      let updated = false;
      const transactions: MagicFeatherTransaction[] = (parsed.transactions || []).map((tx: MagicFeatherTransaction) => {
        if (tx.status === 'pending' && new Date(tx.unlocksAt).getTime() <= now) {
          updated = true;
          return { ...tx, status: 'credited', isNewCredit: true };
        }
        return tx;
      });

      const availableFeathers = transactions
        .filter(t => t.status === 'credited')
        .reduce((sum, t) => sum + t.feathers, 0) -
        transactions
          .filter(t => t.status === 'redeemed')
          .reduce((sum, t) => sum + t.feathers, 0);

      const pendingFeathers = transactions
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + t.feathers, 0);

      const lifetimeEarnedFeathers = transactions
        .filter(t => t.status === 'credited' || t.status === 'pending')
        .reduce((sum, t) => sum + t.feathers, 0);

      const totalRedeemedFeathers = transactions
        .filter(t => t.status === 'redeemed')
        .reduce((sum, t) => sum + t.feathers, 0);

      const profile: UserReferralProfile = {
        ...parsed,
        transactions,
        availableFeathers: Math.max(0, availableFeathers),
        pendingFeathers: Math.max(0, pendingFeathers),
        lifetimeEarnedFeathers: Math.max(0, lifetimeEarnedFeathers),
        totalRedeemedFeathers: Math.max(0, totalRedeemedFeathers)
      };

      if (updated) {
        localStorage.setItem(key, JSON.stringify(profile));
      }
      return profile;
    }
  } catch (_) {}

  return {
    userId,
    userEmail,
    availableFeathers: 0,
    pendingFeathers: 0,
    lifetimeEarnedFeathers: 0,
    totalRedeemedFeathers: 0,
    transactions: []
  };
}

function saveLocalReferralData(profile: UserReferralProfile): void {
  const key = `${FEATHERS_LOCAL_STORAGE_KEY_PREFIX}${profile.userId || profile.userEmail}`;
  try {
    localStorage.setItem(key, JSON.stringify(profile));
  } catch (_) {}
}

/**
 * Fetch the user's referral profile & magic feather transactions
 */
export async function getUserReferralProfile(
  userId: string, 
  userEmail: string, 
  token?: string
): Promise<UserReferralProfile> {
  const cleanEmail = userEmail?.trim().toLowerCase();
  
  try {
    const res = await fetch(`/api/referral/profile?email=${encodeURIComponent(cleanEmail)}&userId=${encodeURIComponent(userId)}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.profile) {
        saveLocalReferralData(data.profile);
        return data.profile;
      }
    }
  } catch (_) {
    // Silently fall back to local storage
  }

  return getLocalReferralData(userId, cleanEmail);
}

/**
 * One-time custom referral code creation.
 * Strictly checks that the user does not already have a referral code!
 */
export async function createUserReferralCode(
  userId: string, 
  userEmail: string, 
  desiredCode: string, 
  token?: string
): Promise<{ success: boolean; referralCode?: string; error?: string }> {
  const cleanCode = desiredCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (!cleanCode || cleanCode.length < 3) {
    return { success: false, error: 'Referral code must be at least 3 characters long.' };
  }
  if (cleanCode.length > 15) {
    return { success: false, error: 'Referral code cannot exceed 15 characters.' };
  }

  // 1. Try server API
  try {
    const res = await fetch('/api/referral/create-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        userId,
        email: userEmail,
        referralCode: cleanCode
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to create referral code' };
    }

    // Save to local cache
    const current = getLocalReferralData(userId, userEmail);
    current.referralCode = data.referralCode || cleanCode;
    current.referralCodeCreatedAt = new Date().toISOString();
    saveLocalReferralData(current);

    return { success: true, referralCode: current.referralCode };
  } catch (_) {
    // Local fallback: verify one-time creation
    const current = getLocalReferralData(userId, userEmail);
    if (current.referralCode) {
      return { 
        success: false, 
        error: 'Your referral code has already been created and cannot be edited.' 
      };
    }

    current.referralCode = cleanCode;
    current.referralCodeCreatedAt = new Date().toISOString();
    saveLocalReferralData(current);
    return { success: true, referralCode: cleanCode };
  }
}

/**
 * Link a friend's referral code to the current customer
 */
export async function linkReferralCode(
  userId: string, 
  userEmail: string, 
  friendCode: string, 
  token?: string
): Promise<{ success: boolean; error?: string }> {
  const cleanCode = friendCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  try {
    const res = await fetch('/api/referral/link-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        userId,
        email: userEmail,
        referredByCode: cleanCode
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Invalid referral code.' };
    }

    const current = getLocalReferralData(userId, userEmail);
    current.referredByCode = cleanCode;
    current.referredAt = new Date().toISOString();
    saveLocalReferralData(current);
    clearPendingReferralCode();

    return { success: true };
  } catch (_) {
    const current = getLocalReferralData(userId, userEmail);
    current.referredByCode = cleanCode;
    current.referredAt = new Date().toISOString();
    saveLocalReferralData(current);
    clearPendingReferralCode();
    return { success: true };
  }
}

/**
 * Fast-forward simulation of 12 days for testing maturity and animations
 */
export async function fastForwardTransactionDev(
  transactionId: string, 
  userId: string, 
  userEmail: string
): Promise<UserReferralProfile> {
  try {
    const res = await fetch('/api/referral/fast-forward-dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId, userId, email: userEmail })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.profile) {
        saveLocalReferralData(data.profile);
        return data.profile;
      }
    }
  } catch (_) {}

  // Local fallback fast forward
  const current = getLocalReferralData(userId, userEmail);
  current.transactions = current.transactions.map(t => {
    if (t.id === transactionId && t.status === 'pending') {
      return { ...t, status: 'credited', isNewCredit: true };
    }
    return t;
  });

  const availableFeathers = current.transactions
    .filter(t => t.status === 'credited')
    .reduce((sum, t) => sum + t.feathers, 0) -
    current.transactions
      .filter(t => t.status === 'redeemed')
      .reduce((sum, t) => sum + t.feathers, 0);

  current.availableFeathers = Math.max(0, availableFeathers);
  current.pendingFeathers = Math.max(0, current.transactions.filter(t => t.status === 'pending').reduce((s, t) => s + t.feathers, 0));
  saveLocalReferralData(current);
  return current;
}

export async function fastForwardFeatherMaturity(
  transactionId: string, 
  days: number = 12
): Promise<{ success: boolean; profile?: UserReferralProfile }> {
  try {
    const res = await fetch('/api/referral/fast-forward-dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId, days })
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, profile: data.profile };
    }
  } catch (_) {}

  return { success: true };
}
