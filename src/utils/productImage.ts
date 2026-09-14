import { Product, ColorVariant } from '../types';
import { firestoreImageCache } from '../firebaseAdmin';

export const UNWANTED_UNSPLASH_IMAGE = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c';

/**
 * Checks if an image URL is the unwanted Unsplash placeholder
 */
export const isUnsplashPlaceholder = (url?: string | null): boolean => {
  if (!url) return false;
  return url.includes('1610030469983') || url.includes('photo-1610030469983-98e550d6193c');
};

/**
 * Resolves an image URL if it's cached from Firestore or returns the clean URL
 */
export const resolveImageUrl = (url?: string | null): string => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('/api/images/')) {
    const filename = trimmed.replace('/api/images/', '');
    const cached = firestoreImageCache.get(filename) || firestoreImageCache.get(`img_${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}`);
    if (cached) return cached;
  }
  return trimmed;
};

/**
 * Returns authentic, local category fallback image from /public
 */
export const getCategoryFallbackImage = (
  category?: string,
  collection?: string,
  name?: string
): string => {
  const cat = (category || '').toLowerCase();
  const col = (collection || '').toLowerCase();
  const nm = (name || '').toLowerCase();

  if (
    cat.includes('sharee') ||
    cat.includes('saree') ||
    nm.includes('saree') ||
    nm.includes('sharee') ||
    nm.includes('tant') ||
    nm.includes('jamdani')
  ) {
    if (col.includes('9 to') || col.includes('fiver')) return '/9tofivers.jpeg';
    if (col.includes('jashn')) return '/jashn.jpeg';
    return '/saree.jpeg';
  }

  if (
    cat.includes('suit') ||
    cat.includes('dress material') ||
    nm.includes('dress material') ||
    nm.includes('salwar') ||
    nm.includes('muslin')
  ) {
    if (col.includes('present')) return '/Presentisgifted.jpeg';
    return '/suit.jpeg';
  }

  if (
    cat.includes('indo') ||
    cat.includes('western') ||
    nm.includes('co-ord') ||
    nm.includes('denim') ||
    nm.includes('palazzo')
  ) {
    if (col.includes('deal') || nm.includes('denim')) return '/dealmangemore.jpeg';
    if (col.includes('jashn')) return '/jashn.jpeg';
    return '/indo-western.jpeg';
  }

  if (cat.includes('kurti') || nm.includes('kurti')) {
    return '/kurti.jpeg';
  }

  if (col.includes('jashn')) return '/jashn.jpeg';
  if (col.includes('firdausi')) return '/firdausi.jpeg';
  if (col.includes('present')) return '/Presentisgifted.jpeg';

  return '/dress.jpeg';
};

/**
 * Extracts all valid, sanitized image URLs from a product, filtering out any unwanted placeholders
 */
export const getCleanProductImages = (product?: Partial<Product> | null): string[] => {
  if (!product) return [];
  const validImages: string[] = [];

  // 1. Direct product images
  if (Array.isArray(product.images)) {
    product.images.forEach(img => {
      if (typeof img === 'string' && img.trim() && !isUnsplashPlaceholder(img)) {
        validImages.push(resolveImageUrl(img));
      }
    });
  }

  // Check single image property if images array was empty
  const singleImg = (product as any)?.image;
  if (typeof singleImg === 'string' && singleImg.trim() && !isUnsplashPlaceholder(singleImg)) {
    const resolved = resolveImageUrl(singleImg);
    if (!validImages.includes(resolved)) {
      validImages.push(resolved);
    }
  }

  // 2. Color variant images
  if (Array.isArray(product.colorVariants)) {
    product.colorVariants.forEach(v => {
      if (Array.isArray(v.images)) {
        v.images.forEach(img => {
          if (typeof img === 'string' && img.trim() && !isUnsplashPlaceholder(img)) {
            const resolved = resolveImageUrl(img);
            if (!validImages.includes(resolved)) {
              validImages.push(resolved);
            }
          }
        });
      }
      if (typeof v.imageUrl === 'string' && v.imageUrl.trim() && !isUnsplashPlaceholder(v.imageUrl)) {
        const resolved = resolveImageUrl(v.imageUrl);
        if (!validImages.includes(resolved)) {
          validImages.push(resolved);
        }
      }
    });
  }

  return validImages;
};

/**
 * Returns the best main image for a product card or banner, guaranteed never to be the unwanted Unsplash placeholder
 */
export const getProductMainImage = (product?: Partial<Product> | null): string => {
  if (!product) return '/dress.jpeg';

  // 1. First clean direct image
  if (Array.isArray(product.images) && product.images.length > 0) {
    const firstValid = product.images.find(img => typeof img === 'string' && img.trim() && !isUnsplashPlaceholder(img));
    if (firstValid) return resolveImageUrl(firstValid);
  }

  // Single image field fallback
  const singleImg = (product as any)?.image;
  if (typeof singleImg === 'string' && singleImg.trim() && !isUnsplashPlaceholder(singleImg)) {
    return resolveImageUrl(singleImg);
  }

  // 2. First clean variant image
  if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
    for (const v of product.colorVariants) {
      if (Array.isArray(v.images) && v.images.length > 0) {
        const first = v.images.find(img => typeof img === 'string' && img.trim() && !isUnsplashPlaceholder(img));
        if (first) return resolveImageUrl(first);
      }
      if (typeof v.imageUrl === 'string' && v.imageUrl.trim() && !isUnsplashPlaceholder(v.imageUrl)) {
        return resolveImageUrl(v.imageUrl);
      }
    }
  }

  // 3. Authentic category fallback
  return getCategoryFallbackImage(product.category, product.collection, product.name);
};

/**
 * Returns the best image for a cart item or order item matching a specific color variant
 */
export const getItemVariantImage = (
  product?: Partial<Product> | null,
  selectedColor?: string | null
): string => {
  if (!product) return '/dress.jpeg';

  if (selectedColor && Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
    const variant = product.colorVariants.find(
      v => v.name && v.name.trim().toLowerCase() === selectedColor.trim().toLowerCase()
    );
    if (variant) {
      if (Array.isArray(variant.images) && variant.images.length > 0) {
        const valid = variant.images.find(img => typeof img === 'string' && img.trim() && !isUnsplashPlaceholder(img));
        if (valid) return resolveImageUrl(valid);
      }
      if (typeof variant.imageUrl === 'string' && variant.imageUrl.trim() && !isUnsplashPlaceholder(variant.imageUrl)) {
        return resolveImageUrl(variant.imageUrl);
      }
    }
  }

  return getProductMainImage(product);
};
