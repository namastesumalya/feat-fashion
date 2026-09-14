import { Product } from '../types';

/**
 * Robustly deduplicates a list of products by both canonical ID and SKU.
 * If two records represent the same product (matching ID or SKU), merges their
 * data (images, sizes, stock, variants) and returns a single clean product instance.
 */
export const deduplicateProducts = (products: Product[]): Product[] => {
  if (!Array.isArray(products) || products.length === 0) return [];

  const canonicalMap = new Map<string, Product>();
  const skuToCanonicalId = new Map<string, string>();

  for (const rawProduct of products) {
    if (!rawProduct) continue;

    const rawId = String(rawProduct.id || rawProduct.sku || '').trim();
    if (!rawId) continue;
    const rawSku = String(rawProduct.sku || '').trim();

    // Determine if this product matches any existing entry
    let matchedId: string | null = null;
    if (canonicalMap.has(rawId)) {
      matchedId = rawId;
    } else if (rawSku && skuToCanonicalId.has(rawSku)) {
      matchedId = skuToCanonicalId.get(rawSku)!;
    } else if (rawSku && canonicalMap.has(rawSku)) {
      matchedId = rawSku;
    } else {
      // Also check if any existing product has an sku matching this rawId
      for (const [existingId, existingProd] of canonicalMap.entries()) {
        if (existingProd.sku && existingProd.sku.trim() === rawId) {
          matchedId = existingId;
          break;
        }
        if (rawSku && existingProd.id && existingProd.id.trim() === rawSku) {
          matchedId = existingId;
          break;
        }
      }
    }

    if (matchedId && canonicalMap.has(matchedId)) {
      const existing = canonicalMap.get(matchedId)!;
      // Merge images cleanly without duplicates or broken entries
      const existingImgs = Array.isArray(existing.images) ? existing.images : [];
      const newImgs = Array.isArray(rawProduct.images) ? rawProduct.images : [];
      const mergedImages = Array.from(new Set([...existingImgs, ...newImgs]))
        .filter((img): img is string => typeof img === 'string' && !!img.trim());

      // Merge size stock
      const existingStock = (existing.sizeStock && typeof existing.sizeStock === 'object') ? existing.sizeStock : {};
      const newStock = (rawProduct.sizeStock && typeof rawProduct.sizeStock === 'object') ? rawProduct.sizeStock : {};
      const mergedSizeStock = { ...existingStock, ...newStock };

      // Prefer non-temporary ID (if one has PROD_ and the other has a real SKU/ID)
      const isExistingTemp = existing.id.startsWith('PROD_') && rawId && !rawId.startsWith('PROD_');
      const canonicalId = isExistingTemp ? rawId : existing.id;
      const canonicalSku = rawSku || existing.sku || canonicalId;

      const mergedProduct: Product = {
        ...existing,
        ...rawProduct,
        id: canonicalId,
        sku: canonicalSku,
        images: mergedImages.length > 0 ? mergedImages : existing.images,
        colorVariants: (rawProduct.colorVariants && rawProduct.colorVariants.length > 0)
          ? rawProduct.colorVariants
          : existing.colorVariants,
        sizes: (rawProduct.sizes && rawProduct.sizes.length > 0)
          ? rawProduct.sizes
          : existing.sizes,
        sizeStock: Object.keys(mergedSizeStock).length > 0 ? mergedSizeStock : existing.sizeStock,
        reviews: (rawProduct.reviews && rawProduct.reviews.length > 0)
          ? rawProduct.reviews
          : existing.reviews,
        stockCount: Math.max(Number(existing.stockCount) || 0, Number(rawProduct.stockCount) || 0)
      };

      if (isExistingTemp) {
        canonicalMap.delete(existing.id);
      }
      canonicalMap.set(canonicalId, mergedProduct);
      if (canonicalSku) {
        skuToCanonicalId.set(canonicalSku, canonicalId);
      }
    } else {
      const canonicalId = rawId;
      const canonicalSku = rawSku || canonicalId;
      const productObj: Product = {
        ...rawProduct,
        id: canonicalId,
        sku: canonicalSku
      };
      canonicalMap.set(canonicalId, productObj);
      if (canonicalSku) {
        skuToCanonicalId.set(canonicalSku, canonicalId);
      }
    }
  }

  return Array.from(canonicalMap.values());
};
