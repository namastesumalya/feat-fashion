import { AppliedPromo } from '../types';

export const isFirdausiProduct = (prod: any): boolean => {
  if (!prod) return false;
  const p = (prod && prod.product) ? prod.product : prod;
  const col = String(p.collection || '').toLowerCase();
  const name = String(p.name || '').toLowerCase();
  const tags = Array.isArray(p.tags) ? p.tags.map((t: any) => String(t).toLowerCase()) : [];
  return col.includes('firdausi') || name.includes('firdausi') || tags.some(t => t.includes('firdausi'));
};

export const isSareeProduct = (prod: any): boolean => {
  if (!prod) return false;
  const p = (prod && prod.product) ? prod.product : prod;
  const cat = String(p.category || '').toLowerCase().trim();
  const name = String(p.name || '').toLowerCase();
  const tags = Array.isArray(p.tags) ? p.tags.map((t: any) => String(t).toLowerCase()) : [];
  const isSaree = cat === 'sharee' || cat === 'saree' || cat.includes('saree') || cat.includes('sharee') ||
    tags.some(t => t.includes('saree') || t.includes('sharee') || t.includes('banarasi') || t.includes('chanderi') || t.includes('tant') || t.includes('jamdani')) ||
    name.includes('saree') || name.includes('sharee') || name.includes('tant') || name.includes('jamdani');
  return isSaree && !isFirdausiProduct(p);
};

export const isDressMaterialProduct = (prod: any): boolean => {
  if (!prod) return false;
  const p = (prod && prod.product) ? prod.product : prod;
  const cat = String(p.category || '').toLowerCase().trim();
  const name = String(p.name || '').toLowerCase();
  const tags = Array.isArray(p.tags) ? p.tags.map((t: any) => String(t).toLowerCase()) : [];
  return cat.includes('dress material') || cat === 'dress materials' ||
    tags.some(t => t.includes('dress material') || t.includes('unstitched')) ||
    name.includes('dress material') || name.includes('unstitched');
};

export const isSuitProduct = (prod: any): boolean => {
  if (!prod) return false;
  const p = (prod && prod.product) ? prod.product : prod;
  const cat = String(p.category || '').toLowerCase().trim();
  const name = String(p.name || '').toLowerCase();
  const tags = Array.isArray(p.tags) ? p.tags.map((t: any) => String(t).toLowerCase()) : [];
  return cat.includes('suit') || cat.includes('kurta') || cat.includes('indo') ||
    tags.some(t => t.includes('suit') || t.includes('kurta') || t.includes('indo')) ||
    name.includes('suit') || name.includes('indo');
};

export type CouponType = 'milestone' | 'category_saree' | 'category_firdausi' | 'category_dress' | 'category_suit' | 'general';

export const getCouponType = (code: string): CouponType => {
  const c = code.trim().toUpperCase().replace(/\s+|-/g, '');
  if (c === 'WELCOME76' || c === 'FEAT6' || c === 'FEAT2.0' || c === 'FEAT20') return 'milestone';
  if (c === 'GORBO') return 'category_saree';
  if (c === 'BHUSWARG') return 'category_firdausi';
  if (c === 'BEAUTIFULYOU') return 'category_dress';
  if (c === 'INDIANA') return 'category_suit';
  return 'general';
};

export const isCouponEligibleForProducts = (code: string, products: any[]): boolean => {
  if (!products || products.length === 0) return true;
  const type = getCouponType(code);
  if (type === 'milestone' || type === 'general') return true;
  if (type === 'category_saree') return products.some(isSareeProduct);
  if (type === 'category_firdausi') return products.some(isFirdausiProduct);
  if (type === 'category_dress') return products.some(isDressMaterialProduct);
  if (type === 'category_suit') return products.some(isSuitProduct);
  return true;
};

/**
 * Filters out coupons that are no longer eligible for the current cart/product:
 * 1. Excludes PREPAID (as it is an automatic payment discount, not a promo code)
 * 2. Excludes discontinued codes
 * 3. Removes collection-specific coupons if the active products contain NO matching items
 */
export const pruneIneligibleCoupons = (
  appliedPromos: AppliedPromo[],
  activeProducts: any[],
  isFirstOrder?: boolean,
  effectiveTotal?: number
): AppliedPromo[] => {
  if (!Array.isArray(appliedPromos) || appliedPromos.length === 0) return [];

  let result = appliedPromos.filter(p => {
    if (!p || !p.code) return false;
    const c = p.code.toUpperCase().replace(/\s+|-/g, '');
    if (c.startsWith('PREPAID') || c === 'FEAT200' || c === 'FLAT200') return false;
    
    // First-order restrictions
    if (isFirstOrder && (c === 'FEAT6' || c === 'FEAT2.0' || c === 'FEAT20')) return false;
    if (isFirstOrder === false && c === 'WELCOME76') return false;

    // Minimum spend thresholds if total provided
    if (typeof effectiveTotal === 'number') {
      if (c === 'FEAT2.0' && effectiveTotal < 2000) return false;
      if (c === 'FEAT6' && (effectiveTotal < 1300 || effectiveTotal > 1999)) return false;
    }

    // Category eligibility: if active products exist, coupon must have at least 1 matching item
    if (activeProducts && activeProducts.length > 0) {
      if (!isCouponEligibleForProducts(p.code, activeProducts)) {
        return false;
      }
    }

    return true;
  });

  // Enforce single milestone coupon rule (FEAT2.0 replaces FEAT6, WELCOME76 cannot combine with FEAT)
  if (result.some(p => p.code.toUpperCase() === 'WELCOME76')) {
    result = result.filter(p => p.code.toUpperCase() !== 'FEAT6' && p.code.toUpperCase() !== 'FEAT2.0');
  } else if (result.some(p => p.code.toUpperCase() === 'FEAT2.0')) {
    result = result.filter(p => p.code.toUpperCase() !== 'FEAT6');
  }

  return result;
};
