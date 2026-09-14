import React, { useState, useEffect, useMemo } from 'react';
import Markdown from 'react-markdown';
import { ArrowLeft, Star, Heart, ShoppingBag, Truck, ShieldCheck, RefreshCw, MapPin, Share2, Tag, Check, ChevronRight, Palette, ExternalLink, Image as ImageIcon, MessageSquare, Clock, Zap, CheckCircle2, AlertCircle, Flame, X, Sparkles, Plus, Minus, Package, Ticket, BadgePercent, Navigation } from 'lucide-react';
import { Product, ColorVariant, Order, ProductReview, DeliveryEstimate, AppliedPromo, PromoCode } from '../types';
import { ProductCard } from './ProductCard';
import { SizeChartModal } from './SizeChartModal';
import { ProductReviewsSection } from './ProductReviewsSection';
import { getShiprocketDeliveryEstimate, computeFallbackEstimate } from '../utils/deliveryEstimation';
import { getCategoryFallbackImage } from '../utils/productImage';
import { fetchImageFromFirestore } from '../firebaseAdmin';
import { deduplicateProducts } from '../utils/productUtils';
import { getLiveLocationAndAddress } from '../utils/geolocation';

interface ProductDetailPageProps {
  product: Product;
  allProducts: Product[];
  orders?: Order[];
  currentUser?: any;
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (p: Product, size: string, color?: string, quantity?: number) => void;
  onBuyNow: (p: Product, size: string, color?: string, quantity?: number) => void;
  isWishlisted: boolean;
  onToggleWishlist: (p: Product, e?: React.MouseEvent) => void;
  onOpenAuth?: () => void;
  onSubmitReview?: (productId: string, review: {
    rating: number;
    comment: string;
    headline?: string;
    userName: string;
    userEmail?: string;
    sizePurchased?: string;
    fitFeedback?: 'Runs Small' | 'True to Size' | 'Runs Large';
    images?: string[];
  }) => Promise<void | ProductReview>;
  appliedPromo?: { code: string; discount: number; description: string } | null;
  appliedPromos?: AppliedPromo[];
  onApplyPromo?: (code: string, contextPrice?: number) => Promise<{ valid: boolean; message?: string }> | void;
  onRemovePromo?: (code?: string) => void;
  onExploreCategory?: (category: string) => void;
  onExploreCollection?: (collection: string) => void;
  promos?: PromoCode[];
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  allProducts = [],
  orders = [],
  currentUser,
  onBack,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  isWishlisted,
  onToggleWishlist,
  onOpenAuth = () => {},
  onSubmitReview,
  appliedPromo,
  appliedPromos,
  onApplyPromo,
  onRemovePromo,
  onExploreCategory,
  onExploreCollection,
  promos = []
}) => {
  const getSizeStock = (sz: string) => {
    if (product.sizeStock && product.sizeStock[sz] !== undefined) {
      return Math.max(0, Number(product.sizeStock[sz]) || 0);
    }
    if (product.stockCount !== undefined) {
      return Math.max(0, Number(product.stockCount) || 0);
    }
    return 0;
  };

  const initialSize = (product.sizes || []).find(sz => getSizeStock(sz) > 0) || product.sizes?.[0] || 'Free Size';
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState(initialSize);
  const [selectedColor, setSelectedColor] = useState(product.primaryColorName?.trim() || product.colorVariants?.[0]?.name || product.colors?.[0] || 'Default');
  const [activeVariantImage, setActiveVariantImage] = useState<string | null>(null);
  const [pincode, setPincode] = useState('');
  const [deliveryEstimate, setDeliveryEstimate] = useState<DeliveryEstimate | null>(null);
  const [isCheckingPincode, setIsCheckingPincode] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [pincodeMessage, setPincodeMessage] = useState<string | null>(null);
  const [addedToCartToast, setAddedToCartToast] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [applyingCode, setApplyingCode] = useState<string | null>(null);
  const [promoStatusMsg, setPromoStatusMsg] = useState<{ code: string; text: string; isError?: boolean } | null>(null);

  // Active applied promo list
  const effectiveAppliedPromos = useMemo(() => {
    if (appliedPromos && appliedPromos.length > 0) return appliedPromos;
    if (appliedPromo) return [appliedPromo];
    return [];
  }, [appliedPromos, appliedPromo]);

  const isPromoApplied = (code: string) => {
    const clean = code.trim().toUpperCase();
    return effectiveAppliedPromos.some(p => p.code.toUpperCase() === clean);
  };

  // Auto-detect and evaluate saved delivery pincode on mount
  useEffect(() => {
    try {
      let initialPin = '';
      const savedAddr = localStorage.getItem('feat_saved_delivery_address');
      if (savedAddr) {
        const parsed = JSON.parse(savedAddr);
        if (parsed?.pincode && /^\d{6}$/.test(parsed.pincode)) {
          initialPin = parsed.pincode;
        }
      }
      if (!initialPin) {
        const savedList = localStorage.getItem('feat_saved_addresses_list');
        if (savedList) {
          const list = JSON.parse(savedList);
          if (Array.isArray(list) && list[0]?.pincode) {
            initialPin = list[0].pincode;
          }
        }
      }

      if (initialPin) {
        setPincode(initialPin);
        evaluatePincodeEstimate(initialPin);
      }
    } catch (e) {}
  }, []);

  const evaluatePincodeEstimate = async (pinValue: string) => {
    const cleanPin = pinValue.replace(/\D/g, '').slice(0, 6);
    if (cleanPin.length === 6) {
      setIsCheckingPincode(true);
      setPincodeMessage(null);
      // Instant postal fallback so shopper sees real-time result
      const instant = computeFallbackEstimate(cleanPin, true);
      setDeliveryEstimate(instant);

      try {
        const live = await getShiprocketDeliveryEstimate(cleanPin, 0.5, true);
        if (live && live.isServiceable) {
          setDeliveryEstimate(live);
        }
      } catch (err) {
        // Keep fallback
      } finally {
        setIsCheckingPincode(false);
      }
    } else {
      setDeliveryEstimate(null);
      if (pinValue.trim().length > 0) {
        setPincodeMessage('Please enter a valid 6-digit Indian postal pincode.');
      } else {
        setPincodeMessage(null);
      }
    }
  };

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(val);
    if (val.length === 6) {
      evaluatePincodeEstimate(val);
    } else {
      setDeliveryEstimate(null);
      setPincodeMessage(null);
    }
  };

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    evaluatePincodeEstimate(pincode);
  };

  const handleDetectLiveLocation = async () => {
    setIsDetectingLocation(true);
    setPincodeMessage(null);
    try {
      const result = await getLiveLocationAndAddress();
      if (result.success && result.address?.pincode && /^\d{6}$/.test(result.address.pincode)) {
        const pin = result.address.pincode;
        setPincode(pin);
        await evaluatePincodeEstimate(pin);
      } else if (result.success && result.address?.city) {
        setPincodeMessage(`Located near ${result.address.city}, ${result.address.state || ''}. Please enter your 6-digit postal PIN.`);
      } else {
        setPincodeMessage(result.error || 'Unable to detect precise pincode. Please enter your 6-digit postal PIN code.');
      }
    } catch (err: any) {
      setPincodeMessage(err?.message || 'Location access denied or unavailable. Please enter 6-digit PIN.');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Reset image, size, and color whenever product changes
  useEffect(() => {
    setSelectedImage(0);
    setActiveVariantImage(null);
    const newInitialSize = (product.sizes || []).find(sz => getSizeStock(sz) > 0) || product.sizes?.[0] || 'Free Size';
    setSelectedSize(newInitialSize);
    setSelectedColor(product.primaryColorName?.trim() || product.colorVariants?.[0]?.name || product.colors?.[0] || 'Default');
    setSelectedQuantity(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [product]);

  // Reset quantity on size change
  useEffect(() => {
    setSelectedQuantity(1);
  }, [selectedSize]);

  const totalProductStock = (product.sizeStock && Object.keys(product.sizeStock).length > 0)
    ? Object.values(product.sizeStock).reduce((sum, val) => sum + (Number(val) || 0), 0)
    : Number(product.stockCount || 0);
  const isProductOutOfStock = totalProductStock <= 0;
  const isProductLowStock = totalProductStock > 0 && totalProductStock <= 5;

  const selectedSizeUnits = getSizeStock(selectedSize);
  const isSelectedSizeOutOfStock = isProductOutOfStock || selectedSizeUnits === 0;
  const effectiveQuantity = selectedSizeUnits > 0 ? Math.min(Math.max(1, selectedQuantity), selectedSizeUnits) : 1;
  const currentPurchaseValue = product.price * effectiveQuantity;

  // Auto-revoke coupons when pieces are removed and purchase value falls below threshold:
  // - If purchase value <= 2000, revoke FEAT2.0
  // - If purchase value <= 1300 OR purchase value > 2000, revoke FEAT6 (over 2000 user gets FEAT2.0 only, not FEAT6)
  // - Permanently revoke FEAT200 / FLAT200
  useEffect(() => {
    const currentVal = product.price * effectiveQuantity;
    if (currentVal <= 2000 && isPromoApplied('FEAT2.0')) {
      if (onRemovePromo) onRemovePromo('FEAT2.0');
      setPromoStatusMsg({
        code: 'FEAT2.0',
        text: 'FEAT2.0 requires product purchase value over ₹2,000.',
        isError: true
      });
    }
    if ((currentVal <= 1300 || currentVal > 2000) && isPromoApplied('FEAT6')) {
      if (onRemovePromo) onRemovePromo('FEAT6');
      if (currentVal > 2000) {
        setPromoStatusMsg({
          code: 'FEAT6',
          text: 'Orders over ₹2,000 qualify for FEAT2.0 (₹200 OFF). FEAT6 is not combined.',
          isError: false
        });
      } else {
        setPromoStatusMsg({
          code: 'FEAT6',
          text: 'FEAT6 requires product purchase value over ₹1,300.',
          isError: true
        });
      }
    }
    if (isPromoApplied('FEAT200') || isPromoApplied('FLAT200')) {
      if (onRemovePromo) {
        onRemovePromo('FEAT200');
        onRemovePromo('FLAT200');
      }
    }
  }, [effectiveQuantity, product.price]);

  const handleToggleProductPromo = async (code: string) => {
    if (!onApplyPromo) return;
    const clean = code.trim().toUpperCase();

    if (clean === 'FEAT200' || clean === 'FLAT200') {
      setPromoStatusMsg({ code: clean, text: 'The coupon FEAT200 has been discontinued.', isError: true });
      return;
    }

    if (isPromoApplied(clean)) {
      if (onRemovePromo) {
        onRemovePromo(clean);
        setPromoStatusMsg({ code: clean, text: `Coupon ${clean} removed`, isError: false });
        setTimeout(() => setPromoStatusMsg(null), 3000);
      }
      return;
    }

    // Mutual exclusivity: remove the other milestone coupon
    if (clean === 'FEAT2.0' && isPromoApplied('FEAT6') && onRemovePromo) {
      onRemovePromo('FEAT6');
    } else if (clean === 'FEAT6' && isPromoApplied('FEAT2.0') && onRemovePromo) {
      onRemovePromo('FEAT2.0');
    }

    setApplyingCode(clean);
    setPromoStatusMsg(null);
    try {
      const currentVal = product.price * effectiveQuantity;
      const res = await onApplyPromo(clean, currentVal);
      if (res && !res.valid) {
        setPromoStatusMsg({ code: clean, text: res.message || `Could not apply coupon ${clean}`, isError: true });
      } else {
        setPromoStatusMsg({ code: clean, text: `🎉 Coupon ${clean} applied! You can stack more coupons below.`, isError: false });
        setTimeout(() => setPromoStatusMsg(null), 4000);
      }
    } catch (err: any) {
      setPromoStatusMsg({ code: clean, text: err?.message || `Error applying ${clean}`, isError: true });
    } finally {
      setApplyingCode(null);
    }
  };

  const categoryFallback = getCategoryFallbackImage(product.category, product.collection, product.name);
  const allVariantImages = (product.colorVariants || [])
    .flatMap(v => v.images || (v.imageUrl ? [v.imageUrl] : []))
    .filter(Boolean)
    .filter(img => typeof img === 'string' && !img.includes('1610030469983'));
  
  const cleanProductImages = (
    (Array.isArray(product.images) && product.images.length > 0)
      ? product.images
      : (typeof (product as any).image === 'string' && (product as any).image ? [(product as any).image] : [])
  )
    .filter(Boolean)
    .filter(img => typeof img === 'string' && !img.includes('1610030469983'));

  const fallbackProductImage = cleanProductImages[0] || allVariantImages[0] || categoryFallback;

  // Find all sibling products in catalog sharing the exact same SKU code
  const sameSkuProducts = useMemo(() => {
    if (!product.sku || !product.sku.trim() || !allProducts || allProducts.length === 0) return [];
    const targetSku = product.sku.trim().toLowerCase();
    return allProducts.filter(p => p.sku && p.sku.trim().toLowerCase() === targetSku && p.id !== product.id);
  }, [product.sku, product.id, allProducts]);

  // Aggregate available variants: current product variants + any sibling products sharing same SKU
  const availableVariants: ColorVariant[] = useMemo(() => {
    const list: ColorVariant[] = [];
    const primaryName = product.primaryColorName?.trim();

    // 1. If admin named a primary color variant, create/set the primary variant at index 0
    if (primaryName) {
      const primaryImgs = (product.images && product.images.length > 0)
        ? product.images.filter(Boolean)
        : [fallbackProductImage];
      list.push({
        name: primaryName,
        imageUrl: primaryImgs[0] || fallbackProductImage,
        images: primaryImgs
      });
    }

    // 2. Current product explicit colorVariants
    if (product.colorVariants && product.colorVariants.length > 0) {
      product.colorVariants.filter(v => v.name && v.name.trim() !== '').forEach((v, idx) => {
        const trimmedName = v.name.trim();
        if (list.some(item => item.name.toLowerCase() === trimmedName.toLowerCase())) return;

        const rawImgs = (v.images && v.images.length > 0)
          ? v.images.filter(Boolean)
          : [v.imageUrl || product.images?.[idx] || fallbackProductImage].filter(Boolean);
        list.push({
          ...v,
          name: trimmedName,
          imageUrl: v.imageUrl || rawImgs[0] || fallbackProductImage,
          images: rawImgs.length > 0 ? rawImgs : [fallbackProductImage]
        });
      });
    } else if (product.colors && product.colors.length > 0) {
      product.colors.filter(c => c && c.trim() !== '').forEach((col, idx) => {
        const trimmedName = col.trim();
        if (list.some(item => item.name.toLowerCase() === trimmedName.toLowerCase())) return;

        const rawImgs = [product.images?.[idx] || product.images?.[0] || fallbackProductImage].filter(Boolean);
        list.push({
          name: trimmedName,
          imageUrl: rawImgs[0] || fallbackProductImage,
          images: rawImgs
        });
      });
    }

    // 3. Add sibling products uploaded under the exact same SKU
    sameSkuProducts.forEach(sp => {
      if (sp.colorVariants && sp.colorVariants.length > 0) {
        sp.colorVariants.forEach(sv => {
          if (!sv || !sv.name) return;
          const trimmedName = sv.name.trim();
          if (!list.some(item => item.name.toLowerCase() === trimmedName.toLowerCase())) {
            const rawImgs = (sv.images && sv.images.length > 0)
              ? sv.images.filter(Boolean)
              : [sv.imageUrl || sp.images?.[0] || fallbackProductImage].filter(Boolean);
            list.push({
              name: trimmedName,
              imageUrl: sv.imageUrl || rawImgs[0] || fallbackProductImage,
              images: rawImgs.length > 0 ? rawImgs : [fallbackProductImage]
            });
          }
        });
      } else {
        const siblingName = sp.primaryColorName?.trim() || sp.colors?.[0] || sp.name || 'Color Option';
        if (!list.some(item => item.name.toLowerCase() === siblingName.toLowerCase())) {
          const siblingImgs = (sp.images && sp.images.length > 0) ? sp.images.filter(Boolean) : [fallbackProductImage];
          list.push({
            name: siblingName,
            imageUrl: siblingImgs[0] || fallbackProductImage,
            images: siblingImgs
          });
        }
      }
    });

    // If primaryName was provided, ensure the variant matching primaryName is strictly at index 0
    if (primaryName) {
      const pIdx = list.findIndex(v => v.name.toLowerCase() === primaryName.toLowerCase());
      if (pIdx > 0) {
        const [prim] = list.splice(pIdx, 1);
        list.unshift(prim);
      }
    }

    return list;
  }, [product, sameSkuProducts, fallbackProductImage]);

  const currentVariant = availableVariants.find(v => v.name.toLowerCase() === selectedColor.toLowerCase()) || (availableVariants.length > 0 ? availableVariants[0] : null);

  // Active gallery images: variant-specific images if present, otherwise product images
  const activeGalleryImages: string[] = (() => {
    if (currentVariant) {
      if (currentVariant.images && currentVariant.images.length > 0) {
        const filtered = currentVariant.images.filter(img => img && img.trim() !== '' && !img.includes('1610030469983'));
        if (filtered.length > 0) return filtered;
      }
      if (currentVariant.imageUrl && currentVariant.imageUrl.trim() !== '' && !currentVariant.imageUrl.includes('1610030469983')) {
        return [currentVariant.imageUrl.trim()];
      }
    }
    if (cleanProductImages.length > 0) {
      return cleanProductImages;
    }
    if (allVariantImages.length > 0) {
      return allVariantImages;
    }
    return [categoryFallback];
  })();

  const activeMainImage = activeGalleryImages[selectedImage] || activeGalleryImages[0] || categoryFallback;

  const handleMainImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    if (target.src.includes('/api/images/')) {
      fetchImageFromFirestore(target.src).then((dataUrl) => {
        if (dataUrl) {
          target.src = dataUrl;
          return;
        }
        if (target.src !== categoryFallback && !target.src.endsWith(categoryFallback)) {
          target.src = categoryFallback;
        }
      }).catch(() => {
        if (target.src !== categoryFallback && !target.src.endsWith(categoryFallback)) {
          target.src = categoryFallback;
        }
      });
      return;
    }

    if (target.src !== categoryFallback && !target.src.endsWith(categoryFallback)) {
      target.src = categoryFallback;
    }
  };

  const handleThumbnailError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    if (target.src.includes('/api/images/')) {
      fetchImageFromFirestore(target.src).then((dataUrl) => {
        if (dataUrl) {
          target.src = dataUrl;
          return;
        }
        if (target.src !== categoryFallback && !target.src.endsWith(categoryFallback)) {
          target.src = categoryFallback;
        }
      }).catch(() => {
        if (target.src !== categoryFallback && !target.src.endsWith(categoryFallback)) {
          target.src = categoryFallback;
        }
      });
      return;
    }

    if (target.src !== categoryFallback && !target.src.endsWith(categoryFallback)) {
      target.src = categoryFallback;
    }
  };

  const handleSelectColorVariant = (variant: ColorVariant) => {
    setSelectedColor(variant.name);
    setSelectedImage(0);
    setActiveVariantImage(null);
  };

  const handleAdd = () => {
    const colorParam = availableVariants.length > 1 && selectedColor && selectedColor !== 'Default' && selectedColor !== 'Original' ? selectedColor : undefined;
    onAddToCart(product, selectedSize, colorParam, effectiveQuantity);
    setAddedToCartToast(true);
    setTimeout(() => setAddedToCartToast(false), 2500);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?product=${encodeURIComponent(product.id)}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on Feat: Feature Hut Fashion!`,
          url: shareUrl,
        });
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
        return;
      } catch (err) {
        // User closed or cancelled native share window
      }
    }
    
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } catch (err) {
        console.error('Failed to copy share link:', err);
      }
    }
  };

  // Filter related products from same category or collection (excluding current)
  const relatedProducts = useMemo(() => {
    const list = allProducts
      .filter(p => p.id !== product.id && p.sku !== product.sku && (p.category === product.category || p.collection === product.collection));
    return deduplicateProducts(list).slice(0, 4);
  }, [allProducts, product.id, product.sku, product.category, product.collection]);

  const genuineReviews = Array.isArray(product.reviews) ? product.reviews : [];
  const genuineReviewsCount = genuineReviews.length;
  const genuineRating = genuineReviewsCount > 0
    ? Number((genuineReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / genuineReviewsCount).toFixed(1))
    : 0;

  const productSchemaJson = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "image": product.images,
    "description": product.description,
    "sku": product.sku || product.id,
    "brand": {
      "@type": "Brand",
      "name": "Feat: Feature Hut Fashion"
    },
    "offers": {
      "@type": "Offer",
      "priceCurrency": "INR",
      "price": product.price,
      "priceValidUntil": "2027-12-31",
      "itemCondition": "https://schema.org/NewCondition",
      "availability": product.stockCount > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "Feat: Feature Hut Fashion"
      }
    },
    ...(genuineReviewsCount > 0 ? {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": genuineRating,
        "reviewCount": genuineReviewsCount
      }
    } : {})
  };

  const isSaree = 
    product.category?.toLowerCase() === 'sharee' || 
    product.category?.toLowerCase() === 'saree' || 
    product.category?.toLowerCase().includes('sharee') || 
    product.category?.toLowerCase().includes('saree') ||
    product.tags?.some(t => ['Saree', 'Sharee', 'Banarasi', 'Chanderi Saree', 'Silk Saree'].includes(t));

  const prodCategory = (product.category || '').toLowerCase();
  const prodCollection = (product.collection || '').toLowerCase();
  const prodName = (product.name || '').toLowerCase();

  const isSuitProduct = prodCategory.includes('suit') || prodCategory.includes('indo') || prodName.includes('suit') || prodName.includes('indo');
  const isDressMaterialProduct = prodCategory.includes('dress material') || prodName.includes('dress material') || prodName.includes('unstitched');
  const isFirdausiProduct = prodCollection.includes('firdausi') || prodName.includes('firdausi');

  const hasPriorOrders = useMemo(() => {
    return orders.some(o => {
      if (o.orderStatus === 'Cancelled' || (o.orderStatus as string) === 'Returned') return false;
      if (o.paymentStatus === 'Void' || o.paymentStatus === 'Failed') return false;
      const oid = (o.id || '').toUpperCase();
      if (oid.startsWith('TEST') || oid.startsWith('DEMO') || oid.includes('MOCK') || oid.includes('DUMMY')) return false;
      if ((o.finalAmount || 0) <= 10) return false;

      const orderEmail = (o.customerEmail || '').trim().toLowerCase();
      if (orderEmail.endsWith('@example.com') || orderEmail.includes('mock') || orderEmail.includes('dummy')) return false;

      const userEmail = (currentUser?.email || '').trim().toLowerCase();
      const orderPhone = (o.deliveryAddress?.phone || '').replace(/\D/g, '');
      const userPhone = (currentUser?.phone || '').replace(/\D/g, '');
      const orderUid = o.userId || '';
      const userUid = currentUser?.uid || '';

      const normOrderPhone = orderPhone.slice(-10);
      const normUserPhone = userPhone.slice(-10);
      const phoneMatches = Boolean(
        normUserPhone.length >= 10 &&
        normOrderPhone.length >= 10 &&
        normOrderPhone === normUserPhone
      );

      return (userEmail && orderEmail && userEmail === orderEmail) ||
             phoneMatches ||
             (userUid && orderUid && userUid === orderUid);
    });
  }, [orders, currentUser]);

  // Product-eligible coupon offers
  interface ProductCouponOffer {
    code: string;
    title: string;
    description: string;
    discountPercent?: number;
    discountFlat?: number;
    estimatedSavings: number;
    badge: string;
    tagColor: string;
  }

  const eligibleOffers: ProductCouponOffer[] = [];

  // Dynamic milestone coupons based on purchase value (price * pieces):
  // - under 2000 (over 1300): show FEAT6
  // - over 2000: show FEAT2.0 only, not FEAT6 (do not combine)
  if (currentPurchaseValue > 2000) {
    eligibleOffers.push({
      code: 'FEAT2.0',
      title: 'Flat ₹200 OFF Orders > ₹2,000',
      description: 'FEAT2.0 promo code is applicable when billing value is more than 2000 rupees',
      discountFlat: 200,
      estimatedSavings: 200,
      badge: 'FLAT ₹200 OFF',
      tagColor: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300'
    });
  } else if (currentPurchaseValue > 1300) {
    eligibleOffers.push({
      code: 'FEAT6',
      title: '₹60 OFF (Billing ₹1,300 - ₹2,000)',
      description: 'FEAT6 promo code is applicable when billing value is more than 1300 rupees (valid up to ₹2,000)',
      discountFlat: 60,
      estimatedSavings: 60,
      badge: '₹60 OFF > ₹1.3k',
      tagColor: 'bg-emerald-100 text-emerald-900 border-emerald-300'
    });
  }

  // Sarees eligible for GORBO (excluding Firdausi collection)
  if (isSaree && !isFirdausiProduct) {
    eligibleOffers.push({
      code: 'GORBO',
      title: '5% Extra OFF on Sarees',
      description: 'GORBO for additional 5% discount on Sarees (excluding Firdausi collection)',
      discountPercent: 5,
      estimatedSavings: Math.round(currentPurchaseValue * 0.05),
      badge: '5% SAREES (NON-FIRDAUSI)',
      tagColor: 'bg-amber-100 text-amber-900 border-amber-300'
    });
  }

  if (isSuitProduct) {
    eligibleOffers.push({
      code: 'INDIANA',
      title: '2% Extra OFF on Suit & Indo-Western Sets',
      description: 'INDIANA for additional 2% Off only on choosing Suit Set and Indo-Western set',
      discountPercent: 2,
      estimatedSavings: Math.round(currentPurchaseValue * 0.02),
      badge: '2% SUIT & INDO-WESTERN',
      tagColor: 'bg-blue-100 text-blue-900 border-blue-300'
    });
  }

  if (isDressMaterialProduct) {
    eligibleOffers.push({
      code: 'BEAUTIFULYOU',
      title: '4% Extra OFF on Dress Materials',
      description: 'BEAUTIFULYOU for additional discount of 4% only on dress materials',
      discountPercent: 4,
      estimatedSavings: Math.round(currentPurchaseValue * 0.04),
      badge: '4% DRESS MATERIALS',
      tagColor: 'bg-purple-100 text-purple-900 border-purple-300'
    });
  }

  // Firdausi collection eligible for BHUSWARG (6% discount)
  if (isFirdausiProduct) {
    eligibleOffers.push({
      code: 'BHUSWARG',
      title: '6% Extra OFF on Firdausi Collection',
      description: 'BHUSWARG for additional 6% discount on Firdausi collection',
      discountPercent: 6,
      estimatedSavings: Math.round(currentPurchaseValue * 0.06),
      badge: '6% FIRDAUSI COLLECTION',
      tagColor: 'bg-rose-100 text-rose-900 border-rose-300'
    });
  }

  if (!hasPriorOrders) {
    eligibleOffers.push({
      code: 'Welcome76',
      title: 'Flat ₹76 OFF 1st Order',
      description: 'Special welcome offer: Flat ₹76 off on your first order',
      discountFlat: 76,
      estimatedSavings: 76,
      badge: '₹76 1ST ORDER',
      tagColor: 'bg-teal-100 text-teal-900 border-teal-300'
    });
  }

  // Cross-market coupons available on other collections
  interface MarketedOffer {
    code: string;
    title: string;
    discountDesc: string;
    targetName: string;
    buttonLabel: string;
    type: 'category' | 'collection' | 'cart';
  }

  const otherMarketedOffers: MarketedOffer[] = [];
  if (!isSaree || isFirdausiProduct) {
    otherMarketedOffers.push({
      code: 'GORBO',
      title: 'Traditional & Designer Sarees',
      discountDesc: '5% Extra OFF with code GORBO (excluding Firdausi collection)',
      targetName: 'Sarees',
      buttonLabel: 'Explore Sarees',
      type: 'category'
    });
  }
  if (!isSuitProduct) {
    otherMarketedOffers.push({
      code: 'INDIANA',
      title: 'Suit Sets & Indo-Western Sets',
      discountDesc: '2% Extra OFF with code INDIANA',
      targetName: 'Suit Sets',
      buttonLabel: 'Explore Suit Sets',
      type: 'category'
    });
  }
  if (!isDressMaterialProduct) {
    otherMarketedOffers.push({
      code: 'BEAUTIFULYOU',
      title: 'Unstitched Dress Materials',
      discountDesc: '4% Extra OFF with code BEAUTIFULYOU',
      targetName: 'Dress Materials',
      buttonLabel: 'Explore Dress Materials',
      type: 'category'
    });
  }
  if (!isFirdausiProduct) {
    otherMarketedOffers.push({
      code: 'BHUSWARG',
      title: 'Firdausi Heritage Collection',
      discountDesc: '6% Extra OFF with code BHUSWARG',
      targetName: 'Firdausi',
      buttonLabel: 'Explore Firdausi',
      type: 'collection'
    });
  }
  if (currentPurchaseValue <= 1300) {
    const needMore = 1300 - currentPurchaseValue + 1;
    otherMarketedOffers.push({
      code: 'FEAT6',
      title: 'Order Discount (Billing > ₹1,300)',
      discountDesc: `FEAT6 (₹60 OFF) unlocks over ₹1,300 (Add ₹${needMore.toLocaleString('en-IN')} more to unlock)`,
      targetName: 'All',
      buttonLabel: 'Add More Pieces',
      type: 'cart'
    });
  } else if (currentPurchaseValue <= 2000) {
    const needMore = 2000 - currentPurchaseValue + 1;
    otherMarketedOffers.push({
      code: 'FEAT2.0',
      title: 'Grand Discount (> ₹2,000)',
      discountDesc: `FEAT2.0 (Flat ₹200 OFF) unlocks over ₹2,000 (Add ₹${needMore.toLocaleString('en-IN')} more to unlock)`,
      targetName: 'All',
      buttonLabel: 'Add More Pieces',
      type: 'cart'
    });
  }

  // Current pricing based on pieces / quantity selected
  const isMultiplePieces = effectiveQuantity > 1;
  const currentTotalBasePrice = product.price * effectiveQuantity;
  const currentTotalOriginalPrice = product.originalPrice * effectiveQuantity;

  // Product price calculations taking into account stacked applied promos
  const totalAppliedPromoDiscount = effectiveAppliedPromos.reduce((sum, p) => sum + p.discount, 0);
  const maxSafeDiscount = Math.max(0, currentTotalBasePrice - 1);
  const cappedPromoDiscount = Math.min(totalAppliedPromoDiscount, maxSafeDiscount);
  const finalEffectivePrice = Math.max(1, currentTotalBasePrice - cappedPromoDiscount);
  const totalSavings = currentTotalOriginalPrice - finalEffectivePrice;

  return (
    <div className={`min-h-screen py-4 sm:py-8 px-3 sm:px-6 animate-in fade-in duration-200 ${
      isSaree 
        ? 'bg-gradient-to-b from-[#fffbf2] via-pink-50/50 to-[#fff8ed]' 
        : 'bg-gradient-to-b from-pink-50/70 via-white to-pink-50/30'
    }`}>
      {/* Product JSON-LD SEO Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchemaJson) }}
      />

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Navigation & Breadcrumbs Bar */}
        <div className={`flex flex-wrap items-center justify-between gap-3 backdrop-blur-md p-3 sm:p-4 rounded-2xl border shadow-sm ${
          isSaree 
            ? 'bg-[#fffdf9]/90 border-amber-200 shadow-amber-100/50' 
            : 'bg-white/90 border-pink-100 shadow-pink-100/40'
        }`}>
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <button
              type="button"
              onClick={onBack}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold transition-all active:scale-95 shadow-sm ${
                isSaree 
                  ? 'bg-gradient-to-r from-amber-600 via-pink-700 to-amber-700 text-amber-100 hover:brightness-110' 
                  : 'bg-[#ff2a85] hover:bg-[#e11d48] text-white'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Store</span>
            </button>
            <div className="hidden md:flex items-center gap-1.5 text-gray-400 text-xs font-semibold pl-2 border-l border-gray-200">
              <span className="hover:text-pink-700 cursor-pointer" onClick={onBack}>Home</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className={isSaree ? 'text-amber-800 font-serif font-black' : 'text-[#ff2a85] font-bold'}>{product.category}</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-gray-600 truncate max-w-[200px]">{product.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-extrabold transition-all active:scale-95 ${
                isSaree 
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300' 
                  : 'bg-pink-50 hover:bg-pink-100 text-pink-900 border-pink-200'
              }`}
            >
              <Share2 className="w-3.5 h-3.5 text-pink-700" />
              <span>{copiedLink ? 'Link Copied!' : 'Share Item'}</span>
            </button>
          </div>
        </div>

        {/* Main Product Display Card */}
        <div className={`rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 border ${
          isSaree 
            ? 'bg-gradient-to-b from-[#fffefc] via-[#fffbf4] to-[#fdf4f8] border-2 border-amber-300/80 shadow-amber-200/40' 
            : 'bg-white border-pink-200/80 shadow-pink-100/50'
        }`}>
          
          {/* Left Column: Image Showcase (md:col-span-6) */}
          <div className="md:col-span-6 space-y-4">
            {/* Primary Large Image View */}
            <div className={`relative aspect-[3/4] max-h-[580px] rounded-2xl overflow-hidden border shadow-inner flex items-center justify-center group ${
              isSaree ? 'bg-amber-50/50 border-amber-200' : 'bg-pink-50/60 border-pink-100'
            }`}>
              <img
                src={activeMainImage}
                alt={availableVariants.length > 1 && selectedColor && selectedColor !== 'Default' && selectedColor !== 'Original' ? `${product.name} - ${selectedColor}` : product.name}
                referrerPolicy="no-referrer"
                onError={handleMainImageError}
                className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
              />
              
              {/* Category & Collection Badge */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className={`text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full uppercase shadow ${
                  isSaree 
                    ? 'bg-gradient-to-r from-amber-500 via-pink-600 to-amber-600 text-amber-100 font-serif border border-amber-300' 
                    : 'bg-[#ff2a85] text-white'
                }`}>
                  {product.category}
                </span>
                <span className={`backdrop-blur-md text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full border ${
                  isSaree 
                    ? 'bg-amber-950/85 text-amber-200 border-amber-300/50' 
                    : 'bg-pink-950/80 text-amber-200 border-amber-300/30'
                }`}>
                  {product.collection}
                </span>
              </div>

              {/* Wishlist Floating Button */}
              <button
                type="button"
                onClick={(e) => onToggleWishlist(product, e)}
                className={`absolute top-3 right-3 p-3 rounded-full shadow-lg backdrop-blur-md transition-all active:scale-90 z-20 ${
                  isWishlisted 
                    ? (isSaree ? 'bg-gradient-to-r from-amber-500 to-pink-600 text-white' : 'bg-[#ff2a85] text-white') 
                    : 'bg-white/90 text-gray-700 hover:bg-white'
                }`}
                aria-label="Toggle Wishlist"
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-white' : ''}`} />
              </button>

              {/* OUT OF STOCK Image Viewport Overlay */}
              {isProductOutOfStock && (
                <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center z-10 select-none">
                  <div className="bg-red-600 text-white text-sm sm:text-base md:text-lg font-black px-6 py-2.5 rounded-full uppercase tracking-widest shadow-2xl border-2 border-white/90 flex items-center gap-2 animate-pulse">
                    <AlertCircle className="w-5 h-5 text-white" />
                    <span>OUT OF STOCK</span>
                  </div>
                  <p className="text-white text-xs sm:text-sm font-semibold mt-2.5 drop-shadow max-w-xs">
                    This product is currently out of stock. Please check back soon for restocks!
                  </p>
                </div>
              )}
            </div>

            {/* Thumbnail Selectors Gallery for the selected color option */}
            {activeGalleryImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-1">
                {activeGalleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(idx)}
                    className={`w-16 h-20 sm:w-20 sm:h-24 rounded-xl overflow-hidden border-2 transition-all shrink-0 active:scale-95 ${
                      selectedImage === idx ? 'border-pink-800 ring-4 ring-pink-200 scale-105 shadow-md' : 'border-gray-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover object-top"
                      referrerPolicy="no-referrer"
                      onError={handleThumbnailError}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Information & Purchase Section (md:col-span-6) */}
          <div className="md:col-span-6 space-y-5 flex flex-col justify-between">
            
            <div className="space-y-3">
              <div>
                <span className="text-xs font-black text-pink-700 uppercase tracking-widest block">
                  Feat Couture • Authentic Handloom Weaves
                </span>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 mt-1 leading-tight font-serif">
                  {product.name}
                </h1>
              </div>

              {/* Rating & Verified Reviews */}
              <button
                type="button"
                id="product-rating-summary-btn"
                onClick={() => {
                  const el = document.getElementById('product-reviews-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center gap-3 pt-1 group cursor-pointer text-left focus:outline-none"
              >
                {genuineReviewsCount > 0 && genuineRating > 0 ? (
                  <>
                    <div className="bg-emerald-700 group-hover:bg-emerald-800 text-white text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm transition-colors">
                      <span>{genuineRating}</span>
                      <Star className="w-3.5 h-3.5 fill-white" />
                    </div>
                    <span className="text-xs text-gray-600 font-semibold group-hover:text-pink-900 group-hover:underline transition-colors flex items-center gap-1">
                      <span>{genuineReviewsCount} Genuine {genuineReviewsCount === 1 ? 'Rating & Review' : 'Ratings & Reviews'}</span>
                      <MessageSquare className="w-3 h-3 text-pink-700 inline" />
                    </span>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-bold text-pink-900 bg-pink-50 hover:bg-pink-100 px-3 py-1.5 rounded-xl border border-pink-200 transition-colors">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    <span>No Reviews Yet • + Write the First Review</span>
                  </div>
                )}
              </button>

              {/* Price & Savings Box */}
              <div className={`p-4 rounded-2xl border flex flex-col gap-2.5 shadow-sm transition-all ${
                isSaree 
                  ? 'bg-gradient-to-r from-amber-100/90 via-pink-50 to-amber-100/80 border-2 border-amber-300/80' 
                  : 'bg-gradient-to-r from-pink-50 via-amber-50/40 to-pink-50 border border-pink-200/90'
              }`}>
                <div className="flex items-baseline gap-3 flex-wrap">
                  {effectiveAppliedPromos.length > 0 ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-emerald-800">
                          ₹{finalEffectivePrice.toLocaleString('en-IN')}
                        </span>
                        <span className="text-sm sm:text-base text-gray-500 line-through">
                          ₹{currentTotalBasePrice.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-400 line-through">
                          MRP ₹{currentTotalOriginalPrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                      {isMultiplePieces && (
                        <span className="text-xs font-black px-2.5 py-1 rounded-lg border shadow-2xs bg-pink-100 text-pink-900 border-pink-300">
                          Total for {effectiveQuantity} Pieces
                        </span>
                      )}
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md ml-auto">
                        Save ₹{totalSavings.toLocaleString('en-IN')} (incl. ₹{cappedPromoDiscount.toLocaleString('en-IN')} stacked coupons)
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-2xl sm:text-3xl font-black ${isSaree ? 'text-amber-950 font-serif' : 'text-pink-950'}`}>
                          ₹{currentTotalBasePrice.toLocaleString('en-IN')}
                        </span>
                        <span className="text-sm sm:text-base text-gray-400 line-through">
                          MRP ₹{currentTotalOriginalPrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <span className={`text-xs font-black px-2.5 py-1 rounded-lg border shadow-sm ${
                        isSaree 
                          ? 'bg-gradient-to-r from-amber-500 to-pink-600 text-amber-100 border-amber-300' 
                          : 'bg-gradient-to-r from-[#ff2a85] to-[#db2777] text-white border-pink-300'
                      }`}>
                        {product.discountPercent}% OFF
                      </span>
                      {isMultiplePieces && (
                        <span className="text-xs font-black px-2.5 py-1 rounded-lg border shadow-2xs bg-pink-100 text-pink-900 border-pink-300">
                          Total for {effectiveQuantity} Pieces
                        </span>
                      )}
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md ml-auto">
                        Save ₹{(currentTotalOriginalPrice - currentTotalBasePrice).toLocaleString('en-IN')}
                      </span>
                    </>
                  )}
                </div>

                {/* Stacked Promo Badges if any applied */}
                {effectiveAppliedPromos.length > 0 && (
                  <div className="pt-2 border-t border-emerald-200/70 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-extrabold text-emerald-900 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Stacked Coupons:</span>
                      </span>
                      {effectiveAppliedPromos.map(p => (
                        <span
                          key={p.code}
                          className="inline-flex items-center gap-1 text-[10px] font-mono font-black bg-emerald-700 text-white px-2 py-0.5 rounded-md shadow-2xs"
                        >
                          <span>{p.code}</span>
                          <span className="opacity-80">(-₹{p.discount.toLocaleString('en-IN')})</span>
                          {onRemovePromo && (
                            <button
                              type="button"
                              onClick={() => {
                                onRemovePromo(p.code);
                                setPromoStatusMsg({ code: p.code, text: `Removed coupon ${p.code}`, isError: false });
                                setTimeout(() => setPromoStatusMsg(null), 2500);
                              }}
                              className="ml-0.5 hover:bg-emerald-900 rounded p-0.5 transition-colors cursor-pointer"
                              title={`Remove ${p.code}`}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                    <span className="text-[10px] text-emerald-800 font-semibold italic">
                      Stack more coupons below!
                    </span>
                  </div>
                )}
              </div>

              {/* OUT OF STOCK Notice Banner */}
              {isProductOutOfStock && (
                <div className="bg-red-50 border-2 border-red-300 text-red-900 p-3.5 sm:p-4 rounded-2xl flex items-center gap-3.5 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-red-700">
                      OUT OF STOCK
                    </h3>
                    <p className="text-xs text-red-700 font-semibold mt-0.5">
                      This item is currently sold out. We are working on restocking it soon!
                    </p>
                  </div>
                </div>
              )}

              {/* Fast Finishing Stock Banner */}
              {isProductLowStock && (
                <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 border-2 border-amber-300 text-amber-950 p-3.5 rounded-2xl flex items-center gap-3 shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-amber-400 text-neutral-950 flex items-center justify-center shrink-0 shadow-xs">
                    <Flame className="w-5 h-5 text-neutral-950 animate-bounce" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-black text-neutral-950 leading-snug">
                      Fast finishing stock: only <span className="text-pink-900 underline decoration-pink-700">{totalProductStock} {totalProductStock === 1 ? 'piece' : 'pieces'}</span> left in {product.name}
                    </p>
                    <p className="text-[11px] text-amber-900 font-semibold mt-0.5">
                      High demand! Complete your order now before this item is gone.
                    </p>
                  </div>
                </div>
              )}

              {/* Available Offers Box - Multi-Coupon Selection */}
              <div className={`border rounded-2xl p-3.5 space-y-3 shadow-2xs ${
                isSaree 
                  ? 'bg-amber-50/90 border-amber-200/90' 
                  : 'bg-pink-50/60 border-pink-200/80'
              }`}>
                <div className="flex items-center justify-between gap-2 border-b border-pink-200/60 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-pink-950 uppercase tracking-wider">
                    <Tag className="w-4 h-4 text-pink-800" />
                    <span>Available Offers for this Product</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold bg-pink-100 text-pink-900 px-2 py-0.5 rounded-full">
                      {eligibleOffers.length} Offers Available
                    </span>
                  </div>
                </div>

                {/* Ek mein Do offer banner */}
                <div className="bg-gradient-to-r from-pink-50 to-amber-50 border border-pink-200/90 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs text-pink-950 font-medium shadow-2xs">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-pink-700 shrink-0">
                      <BadgePercent className="w-4 h-4" />
                      <Ticket className="w-4 h-4" />
                    </div>
                    <span className="font-extrabold text-xs sm:text-sm text-pink-950">
                      Ek mein Do offer
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-pink-800 bg-pink-100 px-2 py-0.5 rounded-md border border-pink-200">
                    Stackable Coupons
                  </span>
                </div>

                {promoStatusMsg && (
                  <div className={`text-xs font-medium px-3 py-2 rounded-xl border flex items-center justify-between gap-2 ${
                    promoStatusMsg.isError 
                      ? 'bg-rose-50 text-rose-700 border-rose-200' 
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    <span>{promoStatusMsg.text}</span>
                    <button 
                      type="button" 
                      onClick={() => setPromoStatusMsg(null)}
                      className="text-gray-400 hover:text-gray-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="space-y-2.5 pt-0.5">
                  {/* Dynamic Product-Eligible Coupons */}
                  {eligibleOffers.map((offer) => {
                    const applied = isPromoApplied(offer.code);
                    const appliedObj = effectiveAppliedPromos.find(p => p.code.toUpperCase() === offer.code.toUpperCase());
                    const isBusy = applyingCode === offer.code;

                    return (
                      <div 
                        key={offer.code} 
                        className={`bg-white/95 rounded-xl p-3 border transition-all shadow-2xs flex items-center justify-between gap-3 ${
                          applied ? 'border-emerald-400 ring-1 ring-emerald-300/50 bg-emerald-50/30' : 'border-pink-200'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-pink-800 text-amber-200 font-mono font-black text-xs px-2.5 py-0.5 rounded-md tracking-wider shadow-2xs">
                              {offer.code}
                            </span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${offer.tagColor}`}>
                              {offer.badge}
                            </span>
                            {applied && (
                              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                                ACTIVE IN CART
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-black text-gray-900 leading-tight">
                            {offer.title}
                          </p>
                          <p className="text-[11px] text-gray-600">
                            {offer.description} • Save ~₹{offer.estimatedSavings.toLocaleString('en-IN')} on this item!
                          </p>
                        </div>

                        <div className="shrink-0">
                          {applied ? (
                            <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1.5 rounded-xl text-xs font-black shadow-2xs">
                              <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                              <span>Applied</span>
                              {appliedObj && (
                                <span className="text-[10px] text-emerald-800 font-bold">
                                  (-₹{appliedObj.discount.toLocaleString('en-IN')})
                                </span>
                              )}
                              {onRemovePromo && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRemovePromo(offer.code);
                                    setPromoStatusMsg({ code: offer.code, text: `Coupon ${offer.code} removed.`, isError: false });
                                    setTimeout(() => setPromoStatusMsg(null), 2500);
                                  }}
                                  className="ml-1 text-[10px] text-red-600 hover:text-red-800 underline font-bold cursor-pointer"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleProductPromo(offer.code)}
                              disabled={isBusy}
                              className="bg-gradient-to-r from-pink-800 to-pink-700 hover:from-pink-900 hover:to-pink-800 disabled:opacity-50 text-amber-200 text-xs font-black px-4 py-2 rounded-xl shadow-xs hover:shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                            >
                              {isBusy ? 'Applying...' : 'Apply'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Prepaid Offer (Auto-Applied) */}
                  <div className="bg-white/95 rounded-xl p-3 border border-amber-200 shadow-2xs flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-amber-600 text-white font-bold text-xs px-2 py-0.5 rounded-md shadow-2xs flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-200" />
                          <span>PREPAID OFFER</span>
                        </span>
                        <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                          AUTO-APPLIED AT CHECKOUT
                        </span>
                      </div>
                      <p className="text-xs font-black text-gray-900 leading-tight">
                        Flat ₹55 off on prepaid orders
                      </p>
                      <p className="text-[11px] text-gray-600">
                        Flat discount of ₹55 on all prepaid UPI/Card orders. Stacks on top of all applied promo codes!
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="text-[11px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-2.5 py-1 rounded-lg inline-block shadow-2xs">
                        No Code Needed
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cross-Market Coupons on Other Collections Banner */}
              {otherMarketedOffers.length > 0 && (
                <div className="bg-gradient-to-br from-amber-50/80 via-pink-50/60 to-purple-50/60 border border-amber-300/80 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-pink-800 text-amber-200 flex items-center justify-center shrink-0">
                        <BadgePercent className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-gray-900 leading-tight">
                          More Exclusive Coupons on Other Collections
                        </h4>
                        <p className="text-[11px] text-gray-600 font-medium">
                          Stack multiple coupons in one order by adding items from these collections:
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {otherMarketedOffers.map((mo) => (
                      <div
                        key={mo.code}
                        className="bg-white/95 rounded-xl p-3 border border-amber-200/90 shadow-2xs flex flex-col justify-between gap-2 hover:border-pink-300 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="bg-pink-900 text-amber-200 font-mono font-black text-[11px] px-2 py-0.5 rounded tracking-wider">
                              {mo.code}
                            </span>
                            <span className="text-[10px] font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">
                              {mo.discountDesc}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-gray-800">
                            {mo.title}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (mo.type === 'category' && onExploreCategory) {
                              onExploreCategory(mo.targetName);
                            } else if (mo.type === 'collection' && onExploreCollection) {
                              onExploreCollection(mo.targetName);
                            } else {
                              onBack();
                            }
                          }}
                          className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-50 to-pink-50 hover:from-amber-100 hover:to-pink-100 text-pink-950 border border-amber-300/80 rounded-lg py-1.5 px-2.5 text-xs font-extrabold transition-all cursor-pointer active:scale-95"
                        >
                          <span>{mo.buttonLabel}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-pink-700" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selector */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-gray-800 flex-wrap gap-2">
                  <span className="uppercase tracking-wider flex items-center gap-2">
                    <span>Select Size:</span>
                    {product.sizes && product.sizes.length > 0 && (
                      selectedSizeUnits > 0 ? (
                        selectedSizeUnits <= 3 ? (
                          <span className="text-[11px] font-black text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-300 shadow-2xs animate-pulse">
                            ⚡ Only {selectedSizeUnits} {selectedSizeUnits === 1 ? 'piece' : 'pieces'} left in Size {selectedSize}!
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            ✓ {selectedSizeUnits} {selectedSizeUnits === 1 ? 'piece' : 'pieces'} in stock for Size {selectedSize}
                          </span>
                        )
                      ) : (
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-200">
                          Out of Stock in Size {selectedSize}
                        </span>
                      )
                    )}
                  </span>
                  <button
                    id="size-chart-guide-btn"
                    type="button"
                    onClick={() => setShowSizeChart(true)}
                    className="text-pink-800 hover:text-pink-950 font-extrabold underline cursor-pointer text-xs transition-colors flex items-center gap-1 bg-pink-50 hover:bg-pink-100 px-2.5 py-1 rounded-lg border border-pink-200"
                  >
                    <span>Size Chart & Guide</span>
                  </button>
                </div>

                {product.sizes && product.sizes.length > 0 && (
                  <div className="flex flex-wrap gap-2.5">
                    {product.sizes.map((sz) => {
                      const u = getSizeStock(sz);
                      const isZero = u === 0;
                      const isLow = u > 0 && u <= 3;
                      const isSelected = selectedSize === sz;

                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSelectedSize(sz)}
                          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black border transition-all flex items-center gap-2 shadow-2xs ${
                            isSelected
                              ? 'bg-pink-950 text-amber-200 border-pink-950 shadow-md ring-2 ring-pink-400'
                              : isZero
                                ? 'bg-gray-100 text-gray-400 border-gray-200 hover:border-gray-300'
                                : 'bg-white text-gray-800 border-gray-300 hover:border-pink-400 hover:bg-pink-50/60'
                          }`}
                        >
                          <span className={isZero && !isSelected ? 'line-through' : 'font-black'}>{sz}</span>
                          {isZero ? (
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${isSelected ? 'bg-rose-900/80 text-rose-200' : 'bg-rose-100 text-rose-600'}`}>
                              0 in stock
                            </span>
                          ) : isLow ? (
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${isSelected ? 'bg-amber-400 text-pink-950 shadow-xs' : 'bg-amber-100 text-amber-900 border border-amber-300'}`}>
                              {u} {u === 1 ? 'piece' : 'pieces'} left
                            </span>
                          ) : (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-pink-900 text-amber-100' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
                              {u} {u === 1 ? 'pc' : 'pcs'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Individual Size Stock Details Grid */}
                {product.sizes && product.sizes.length > 0 && (
                  <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-2.5 sm:p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-950">
                      <span className="uppercase tracking-wider font-black flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-amber-700" />
                        <span>Individual Stock by Size:</span>
                      </span>
                      <span className="text-[10px] text-gray-500 font-semibold">
                        Real-time warehouse count
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {product.sizes.map((sz) => {
                        const count = getSizeStock(sz);
                        const isZero = count === 0;
                        const isLow = count > 0 && count <= 3;
                        const isSelected = selectedSize === sz;

                        return (
                          <div
                            key={sz}
                            onClick={() => setSelectedSize(sz)}
                            className={`cursor-pointer transition-all px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-pink-950 text-amber-200 border-pink-950 shadow-xs ring-1 ring-pink-300'
                                : isZero
                                  ? 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                                  : isLow
                                    ? 'bg-amber-100/90 text-amber-950 border-amber-300 font-black'
                                    : 'bg-white text-gray-800 border-gray-200'
                            }`}
                          >
                            <span>Size {sz}:</span>
                            <span className={isZero ? 'text-gray-400 font-normal' : isLow ? 'text-amber-900 font-black' : isSelected ? 'text-amber-200 font-bold' : 'text-emerald-700 font-extrabold'}>
                              {count} {count === 1 ? 'piece' : 'pieces'} {isZero ? '(Sold out)' : isLow ? 'left' : 'in stock'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Available Colors & Real Item Variants */}
              {availableVariants.length > 1 && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                    <span className="uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-pink-700" />
                      <span>Available Colors & Item Options:</span>
                    </span>
                    <span className="text-pink-900 bg-pink-100 font-extrabold px-2.5 py-0.5 rounded-full text-[11px] border border-pink-200">
                      {selectedColor}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {availableVariants.map((variant, idx) => {
                      const isSelected = selectedColor === variant.name;
                      const variantImg = variant.imageUrl || variant.images?.[0] || product.images[0];
                      const photoCount = variant.images && variant.images.length > 0 ? variant.images.length : (variant.imageUrl ? 1 : 0);

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectColorVariant(variant)}
                          className={`flex items-center gap-2 p-1.5 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'bg-gradient-to-r from-pink-950 to-pink-900 text-amber-200 border-pink-950 shadow-md ring-2 ring-pink-400 scale-[1.02]'
                              : 'bg-white text-gray-900 border-pink-200 hover:border-pink-400 hover:bg-pink-50/70 shadow-xs'
                          }`}
                        >
                          {/* Real Item Image Thumbnail */}
                          <div className="w-11 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-black/10 relative">
                            {variantImg ? (
                              <img
                                src={variantImg}
                                alt={variant.name}
                                className="w-full h-full object-cover object-top"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = fallbackProductImage;
                                }}
                              />
                            ) : (
                              <img
                                src={fallbackProductImage}
                                alt={variant.name}
                                className="w-full h-full object-cover object-top opacity-85"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            {isSelected && (
                              <div className="absolute top-1 right-1 bg-pink-600 text-white rounded-full p-0.5 shadow">
                                <Check className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1 pr-1">
                            <p className={`text-xs font-bold truncate leading-tight ${isSelected ? 'text-amber-200' : 'text-gray-900'}`}>
                              {variant.name}
                            </p>
                            <span className={`text-[10px] font-medium block mt-0.5 ${isSelected ? 'text-pink-200/90' : 'text-gray-500'}`}>
                              {photoCount > 0 ? `${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}` : 'Color Shade'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fabric Specifications Table */}
              <div className="border border-pink-200 rounded-2xl p-4 space-y-2 text-xs text-gray-800 bg-pink-50/30">
                <h3 className="font-extrabold text-pink-950 uppercase tracking-wider text-[11px] mb-2 border-b border-pink-200/80 pb-1">
                  Fabric & Product Specifications
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-bold text-gray-500 block text-[10px] uppercase">SKU Code</span>
                    <span className="font-bold text-pink-950 font-mono">{product.sku || product.id}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-500 block text-[10px] uppercase">Fabric</span>
                    <span className="font-bold text-gray-900">{product.fabric}</span>
                  </div>
                  {product.length && product.length.trim() !== '' && (
                    <div>
                      <span className="font-bold text-gray-500 block text-[10px] uppercase">Length</span>
                      <span className="font-bold text-gray-900">{product.length}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-gray-500 block text-[10px] uppercase">Occasion</span>
                    <span className="font-bold text-gray-900">{product.collection}</span>
                  </div>
                  {product.careInstructions && product.careInstructions.trim() !== '' && (
                    <div>
                      <span className="font-bold text-gray-500 block text-[10px] uppercase">Care Instructions</span>
                      <span className="font-bold text-gray-900">{product.careInstructions}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Shiprocket Delivery Day & Pincode Checker */}
              <div className="space-y-3 p-3.5 bg-gradient-to-br from-amber-50/70 via-pink-50/40 to-white rounded-2xl border border-pink-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-pink-950 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-pink-800" />
                    <span>Estimated Delivery by Shiprocket</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-emerald-600" /> Fast Courier Dispatch
                  </span>
                </div>

                <form onSubmit={handleCheckPincode} className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="postal-code"
                      maxLength={6}
                      value={pincode}
                      onChange={handlePincodeChange}
                      placeholder="Enter 6-digit Pincode (e.g. 700001)"
                      className="w-full pl-9 pr-20 py-2.5 sm:py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-700 bg-white shadow-inner font-semibold"
                    />
                    <button
                      type="button"
                      onClick={handleDetectLiveLocation}
                      disabled={isDetectingLocation || isCheckingPincode}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-bold text-pink-700 hover:text-pink-900 bg-pink-50 hover:bg-pink-100 rounded-lg border border-pink-200 transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer shadow-2xs"
                      title="Auto-detect current postal pincode using GPS"
                    >
                      {isDetectingLocation ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-pink-700" />
                      ) : (
                        <Navigation className="w-3 h-3 text-pink-700" />
                      )}
                      <span>{isDetectingLocation ? 'Locating...' : 'Locate'}</span>
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={isCheckingPincode || isDetectingLocation}
                    className="bg-pink-950 text-amber-200 px-4 py-2.5 sm:py-2 rounded-xl text-xs font-extrabold hover:bg-pink-900 transition-colors shadow flex items-center justify-center gap-1.5 disabled:opacity-75 cursor-pointer"
                  >
                    {isCheckingPincode ? (
                      <>
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        <span>Estimating...</span>
                      </>
                    ) : (
                      'Check'
                    )}
                  </button>
                </form>

                {pincodeMessage && (
                  <p className="text-xs font-medium text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200">
                    {pincodeMessage}
                  </p>
                )}

                {deliveryEstimate && deliveryEstimate.isServiceable && (
                  <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-sm space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-xs font-extrabold text-gray-900">
                            Estimated Delivery by <span className="text-pink-900 underline font-black">{deliveryEstimate.estimatedDeliveryDate}</span>
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {deliveryEstimate.estimatedDays}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 pl-5 font-medium">
                          Via {deliveryEstimate.courierName}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-100 text-pink-900 whitespace-nowrap shrink-0">
                        {deliveryEstimate.isCodAvailable ? 'COD Available' : 'Prepaid Only'}
                      </span>
                    </div>

                    {/* Distance & Route Breakdown */}
                    <div className="bg-pink-50/70 p-2 rounded-lg border border-pink-100 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-pink-950 font-bold">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-pink-700" />
                          <span>Origin: Khanyan Warehouse (712147)</span>
                        </span>
                        {deliveryEstimate.distanceKm !== undefined && (
                          <span className="bg-white px-2 py-0.5 rounded text-[10px] font-black text-pink-900 border border-pink-200">
                            ~{deliveryEstimate.distanceKm} km transit
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-600">
                        Destination: <strong>{deliveryEstimate.city ? `${deliveryEstimate.city}, ${deliveryEstimate.state}` : `PIN ${deliveryEstimate.pincode}`}</strong>
                      </p>
                    </div>

                    <div className="pt-1 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        {deliveryEstimate.dispatchTime}
                      </span>
                      <span className="font-bold text-emerald-700">100% Free Delivery on All Orders</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Trust Assurances Badges */}
              <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-700 text-center pt-3 border-t border-gray-200">
                <div className="flex flex-col items-center">
                  <ShieldCheck className="w-5 h-5 text-pink-800 mb-1" />
                  <span className="font-bold">100% Authentic</span>
                </div>
                <div className="flex flex-col items-center">
                  <RefreshCw className="w-5 h-5 text-pink-800 mb-1" />
                  <span className="font-bold">5 Days Return</span>
                </div>
                <div className="flex flex-col items-center">
                  <Truck className="w-5 h-5 text-pink-800 mb-1" />
                  <span className="font-bold">Free Shipping</span>
                </div>
              </div>

            </div>

            {/* Quantity / Multiple Pieces Selector */}
            {!isSelectedSizeOutOfStock && (
              <div className="bg-gradient-to-r from-pink-50/90 via-white to-amber-50/80 border border-pink-200 rounded-2xl p-3 sm:p-3.5 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-gray-800 flex-wrap gap-1">
                  <span className="uppercase tracking-wider flex items-center gap-1.5 font-black text-pink-950">
                    <Package className="w-3.5 h-3.5 text-pink-700" />
                    <span>Select Pieces / Quantity:</span>
                  </span>
                  <span className="text-[11px] font-extrabold text-pink-900 bg-white px-2.5 py-0.5 rounded-lg border border-pink-200 shadow-2xs">
                    {effectiveQuantity} {effectiveQuantity === 1 ? 'Piece' : 'Pieces'} • Total: ₹{finalEffectivePrice.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Stepper with Minus / Plus */}
                  <div className="flex items-center bg-white border-2 border-pink-300 rounded-xl overflow-hidden shadow-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedQuantity(prev => Math.max(1, prev - 1))}
                      disabled={effectiveQuantity <= 1}
                      className="p-2 sm:px-3 text-pink-900 hover:bg-pink-100 active:bg-pink-200 disabled:opacity-30 disabled:hover:bg-white transition-colors cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 sm:px-4 py-1 text-xs sm:text-sm font-mono font-black text-pink-950 min-w-[2.5rem] text-center select-none">
                      {effectiveQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedQuantity(prev => Math.min(Math.max(1, selectedSizeUnits), prev + 1))}
                      disabled={effectiveQuantity >= selectedSizeUnits}
                      className="p-2 sm:px-3 text-pink-900 hover:bg-pink-100 active:bg-pink-200 disabled:opacity-30 disabled:hover:bg-white transition-colors cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quick Pick Chips (1, 2, 3, 4, 5 pieces based on stock) */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[1, 2, 3, 4, 5]
                      .filter(qty => qty <= selectedSizeUnits)
                      .map(qty => (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => setSelectedQuantity(qty)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                            effectiveQuantity === qty
                              ? 'bg-pink-900 text-amber-200 border-pink-950 shadow-xs ring-1 ring-pink-400'
                              : 'bg-white hover:bg-pink-50 text-gray-700 border-gray-200'
                          }`}
                        >
                          {qty} {qty === 1 ? 'piece' : 'pieces'}
                        </button>
                      ))}
                  </div>
                </div>

                {selectedSizeUnits > 0 && selectedSizeUnits <= 5 && (
                  <p className="text-[11px] text-amber-900 font-medium">
                    ⚡ Hurry, only {selectedSizeUnits} {selectedSizeUnits === 1 ? 'piece is' : 'pieces are'} available in Size {selectedSize}!
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons: Add to Cart & Buy Now */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isSelectedSizeOutOfStock}
                  onClick={handleAdd}
                  className={`flex-1 font-black py-3.5 rounded-2xl text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 border ${
                    isSelectedSizeOutOfStock
                      ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed font-extrabold'
                      : 'bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-neutral-950 border-yellow-500 shadow-yellow-200/80 active:scale-95'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span>
                    {isProductOutOfStock
                      ? 'Out of stock'
                      : isSelectedSizeOutOfStock
                      ? `Size ${selectedSize} Out of stock`
                      : effectiveQuantity > 1
                      ? `ADD ${effectiveQuantity} PIECES • ₹${finalEffectivePrice.toLocaleString('en-IN')}`
                      : `ADD TO CART • ₹${finalEffectivePrice.toLocaleString('en-IN')}`}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isSelectedSizeOutOfStock}
                  onClick={() => {
                    if (isSelectedSizeOutOfStock) return;
                    const colorParam = availableVariants.length > 1 && selectedColor && selectedColor !== 'Default' && selectedColor !== 'Original' ? selectedColor : undefined;
                    onBuyNow(product, selectedSize, colorParam, effectiveQuantity);
                  }}
                  className={`flex-1 font-black py-3.5 rounded-2xl text-xs sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2 border ${
                    isSelectedSizeOutOfStock
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed font-extrabold'
                      : isSaree
                      ? 'bg-gradient-to-r from-amber-600 via-pink-700 to-amber-700 hover:from-amber-500 hover:to-pink-600 text-amber-100 border-amber-300/60 active:scale-95 shadow-amber-900/30'
                      : 'bg-gradient-to-r from-[#ff2a85] via-pink-600 to-[#e11d48] hover:from-[#e11d48] hover:to-[#db2777] text-white border-pink-300 active:scale-95 shadow-pink-500/25'
                  }`}
                >
                  <Zap className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>
                    {isProductOutOfStock
                      ? 'Out of stock'
                      : isSelectedSizeOutOfStock
                      ? `Size ${selectedSize} Out of stock`
                      : effectiveQuantity > 1
                      ? `BUY ${effectiveQuantity} PIECES • ₹${finalEffectivePrice.toLocaleString('en-IN')}`
                      : 'BUY NOW'}
                  </span>
                </button>
              </div>

              {isProductOutOfStock ? (
                <p className="text-xs font-semibold text-rose-700 text-center bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  This product is currently out of stock. Please check back soon or explore our other collections!
                </p>
              ) : isSelectedSizeOutOfStock ? (
                <p className="text-xs font-semibold text-rose-700 text-center bg-rose-50 p-2 rounded-xl border border-rose-200">
                  Size {selectedSize} is currently out of stock. Please pick another available size or check back soon!
                </p>
              ) : null}

              {addedToCartToast && (
                <div className="bg-emerald-600 text-white text-xs font-black p-3 rounded-xl text-center animate-bounce shadow-md flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Added {effectiveQuantity} {effectiveQuantity === 1 ? 'piece' : 'pieces'} to your cart ({selectedSize}{availableVariants.length > 1 && selectedColor && selectedColor !== 'Default' && selectedColor !== 'Original' ? ` • ${selectedColor}` : ''})!</span>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Product Description Detailed Section */}
        <div className="bg-white rounded-3xl shadow-lg border border-pink-100 p-6 sm:p-8 space-y-4">
          <h2 className="text-lg sm:text-xl font-extrabold text-pink-950 font-serif border-b border-pink-100 pb-2 flex items-center justify-between">
            <span>Description & Craftsmanship Story</span>
          </h2>
          {product.description && product.description.trim() !== '' ? (
            <div className="markdown-body text-xs sm:text-sm text-gray-700 leading-relaxed">
              <Markdown>{product.description}</Markdown>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-gray-500 italic">
              Handcrafted designer piece featuring premium weaves and authentic artisan detailing.
            </p>
          )}
        </div>

        {/* Customer Reviews & Star Rating Section */}
        <ProductReviewsSection
          product={product}
          orders={orders}
          currentUser={currentUser}
          onOpenAuth={onOpenAuth}
          onSubmitReview={onSubmitReview || (async () => {})}
        />

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-pink-700 block">Curated For You</span>
                <h2 className="text-xl font-extrabold text-gray-900 font-serif">You May Also Like</h2>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
              {relatedProducts.map((relProduct) => (
                <ProductCard
                  key={`rel-${relProduct.id}`}
                  product={relProduct}
                  onSelect={(p) => {
                    onSelectProduct(p);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onSelectProduct={(p) => {
                    onSelectProduct(p);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onAddToCart={(p, sz, e) => onAddToCart(p, sz)}
                  isWishlisted={false}
                  onToggleWishlist={(p, e) => onToggleWishlist(p)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Size Chart Modal */}
        <SizeChartModal
          isOpen={showSizeChart}
          onClose={() => setShowSizeChart(false)}
          category={product.category}
        />

      </div>
    </div>
  );
};
