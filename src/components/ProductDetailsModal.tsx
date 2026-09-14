import React, { useState, useMemo, useEffect } from 'react';
import { X, Star, Heart, ShoppingBag, Truck, ShieldCheck, RefreshCw, MapPin, Zap, Check, ExternalLink, Image as ImageIcon, AlertCircle, Flame, Package, Minus, Plus, Clock, CheckCircle2, Navigation } from 'lucide-react';
import { Product, ColorVariant, DeliveryEstimate } from '../types';
import { lookupCityStateByPincode } from '../utils/pincodeLookup';
import { SizeChartModal } from './SizeChartModal';
import { getCategoryFallbackImage } from '../utils/productImage';
import { getShiprocketDeliveryEstimate, computeFallbackEstimate } from '../utils/deliveryEstimation';
import { getLiveLocationAndAddress } from '../utils/geolocation';

interface ProductDetailsModalProps {
  product: Product | null;
  allProducts?: Product[];
  onClose: () => void;
  onSelectProduct?: (p: Product) => void;
  onAddToCart: (p: Product, size: string, e?: React.MouseEvent, color?: string, quantity?: number) => void;
  onBuyNow: (p: Product, size: string, color?: string, quantity?: number) => void;
  isWishlisted: boolean;
  onToggleWishlist: (p: Product, e?: React.MouseEvent) => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product,
  allProducts = [],
  onClose,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  isWishlisted,
  onToggleWishlist
}) => {
  const categoryFallback = getCategoryFallbackImage(product?.category, product?.collection, product?.name);
  const allVariantImages = (product?.colorVariants || [])
    .flatMap(v => v.images || (v.imageUrl ? [v.imageUrl] : []))
    .filter(Boolean)
    .filter(img => typeof img === 'string' && !img.includes('1610030469983'));
  
  const cleanProductImages = (product?.images || [])
    .filter(Boolean)
    .filter(img => typeof img === 'string' && !img.includes('1610030469983'));

  const fallbackProductImage = cleanProductImages[0] || allVariantImages[0] || categoryFallback;

  const availableVariants: ColorVariant[] = useMemo(() => {
    if (!product) return [];
    const list: ColorVariant[] = [];
    const primaryName = product.primaryColorName?.trim();

    // 1. Primary color variant at index 0 if named by admin
    if (primaryName) {
      const primaryImgs = (product.images && product.images.length > 0)
        ? product.images.filter(Boolean)
        : [fallbackProductImage];
      list.push({
        name: primaryName,
        imageUrl: primaryImgs[0] || fallbackProductImage,
        images: primaryImgs,
        sizes: product.sizes,
        sizeStock: product.sizeStock,
        stockCount: product.stockCount
      });
    }

    // 2. Explicit colorVariants
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
          images: rawImgs.length > 0 ? rawImgs : [fallbackProductImage],
          sizes: (v.sizes && v.sizes.length > 0) ? v.sizes : product.sizes,
          sizeStock: v.sizeStock || product.sizeStock,
          stockCount: v.stockCount !== undefined ? v.stockCount : product.stockCount
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
          images: rawImgs,
          sizes: product.sizes,
          sizeStock: product.sizeStock,
          stockCount: product.stockCount
        });
      });
    }

    if (primaryName) {
      const pIdx = list.findIndex(v => v.name.toLowerCase() === primaryName.toLowerCase());
      if (pIdx > 0) {
        const [prim] = list.splice(pIdx, 1);
        list.unshift(prim);
      }
    }

    return list;
  }, [product, fallbackProductImage]);

  const [selectedColor, setSelectedColor] = useState(product?.primaryColorName?.trim() || product?.colorVariants?.[0]?.name || product?.colors?.[0] || 'Default');

  const currentVariant = availableVariants.find(v => v.name === selectedColor) || (availableVariants.length > 0 ? availableVariants[0] : null);

  const activeSizes: string[] = (currentVariant?.sizes && currentVariant.sizes.length > 0)
    ? currentVariant.sizes
    : (product?.sizes || []);

  const getSizeStock = (sz: string) => {
    if (!product) return 0;
    if (currentVariant?.sizeStock && currentVariant.sizeStock[sz] !== undefined) {
      return Math.max(0, Number(currentVariant.sizeStock[sz]) || 0);
    }
    if (product.sizeStock && product.sizeStock[sz] !== undefined) {
      return Math.max(0, Number(product.sizeStock[sz]) || 0);
    }
    if (currentVariant?.stockCount !== undefined) {
      return Math.max(0, Number(currentVariant.stockCount) || 0);
    }
    if (product.stockCount !== undefined) {
      return Math.max(0, Number(product.stockCount) || 0);
    }
    return 0;
  };

  const initialSize = activeSizes.find(sz => getSizeStock(sz) > 0) || activeSizes[0] || 'Free Size';
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeVariantImage, setActiveVariantImage] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState(initialSize);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [pincode, setPincode] = useState('');
  const [pincodeMessage, setPincodeMessage] = useState<string | null>(null);
  const [addedToCartToast, setAddedToCartToast] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);

  // Reset quantity on size or variant change
  useEffect(() => {
    setSelectedQuantity(1);
  }, [selectedSize, selectedColor]);

  const totalVariantStock = currentVariant
    ? (currentVariant.sizeStock && Object.keys(currentVariant.sizeStock).length > 0)
      ? Object.values(currentVariant.sizeStock).reduce((sum, val) => sum + (Number(val) || 0), 0)
      : (currentVariant.stockCount !== undefined ? currentVariant.stockCount : Number(product?.stockCount || 0))
    : Number(product?.stockCount || 0);

  const totalProductStock = totalVariantStock;
  const isProductOutOfStock = totalProductStock <= 0;
  const isProductLowStock = totalProductStock > 0 && totalProductStock <= 5;

  const selectedSizeUnits = getSizeStock(selectedSize);
  const isSelectedSizeOutOfStock = isProductOutOfStock || selectedSizeUnits === 0;

  const effectiveQuantity = Math.max(1, Math.min(selectedQuantity, Math.max(1, selectedSizeUnits)));
  const currentTotalBasePrice = (Number(product?.price) || 0) * effectiveQuantity;
  const currentTotalOriginalPrice = (Number(product?.originalPrice) || Number(product?.price) || 0) * effectiveQuantity;

  const genuineReviews = Array.isArray(product?.reviews) ? product.reviews : [];
  const genuineReviewsCount = genuineReviews.length;
  const genuineRating = genuineReviewsCount > 0
    ? Number((genuineReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / genuineReviewsCount).toFixed(1))
    : 0;

  useEffect(() => {
    if (product) {
      setSelectedImage(0);
      setActiveVariantImage(null);
      const defaultCol = product.primaryColorName?.trim() || product.colorVariants?.[0]?.name || product.colors?.[0] || 'Default';
      setSelectedColor(defaultCol);
      const curV = product.colorVariants?.find(v => v.name === defaultCol);
      const curSizes = (curV?.sizes && curV.sizes.length > 0) ? curV.sizes : (product.sizes || []);
      const newInitialSize = curSizes.find(sz => {
        const u = curV?.sizeStock?.[sz] !== undefined ? curV.sizeStock[sz] : (product.sizeStock?.[sz] || 0);
        return u > 0;
      }) || curSizes[0] || 'Free Size';
      setSelectedSize(newInitialSize);
    }
  }, [product?.id]);

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
    if (target.src !== categoryFallback && !target.src.endsWith(categoryFallback)) {
      target.src = categoryFallback;
    }
  };

  const handleThumbnailError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    if (target.src !== categoryFallback && !target.src.endsWith(categoryFallback)) {
      target.src = categoryFallback;
    }
  };

  const handleSelectColorVariant = (variant: ColorVariant) => {
    setSelectedColor(variant.name);
    setSelectedImage(0);
    setActiveVariantImage(null);
    const varSizes = (variant.sizes && variant.sizes.length > 0) ? variant.sizes : (product?.sizes || []);
    if (varSizes.length > 0 && !varSizes.includes(selectedSize)) {
      const best = varSizes.find(sz => {
        const u = variant.sizeStock?.[sz] !== undefined ? variant.sizeStock[sz] : (product?.sizeStock?.[sz] || 0);
        return u > 0;
      }) || varSizes[0];
      setSelectedSize(best);
    }
  };

  const [isCheckingPin, setIsCheckingPin] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [deliveryEstimate, setDeliveryEstimate] = useState<DeliveryEstimate | null>(null);

  const evaluatePincodeEstimate = async (pinValue: string) => {
    const cleanPin = pinValue.replace(/\D/g, '').slice(0, 6);
    if (cleanPin.length === 6) {
      setIsCheckingPin(true);
      setPincodeMessage(null);
      // Instant postal fallback so shopper sees real-time result immediately
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
        setIsCheckingPin(false);
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

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    evaluatePincodeEstimate(pincode);
  };

  const handlePincodeChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 6);
    setPincode(clean);
    if (clean.length === 6) {
      evaluatePincodeEstimate(clean);
    } else {
      setDeliveryEstimate(null);
      setPincodeMessage(null);
    }
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
        setPincodeMessage(result.error || 'Unable to detect postal PIN code. Please enter 6 digits.');
      }
    } catch (err: any) {
      setPincodeMessage(err?.message || 'Location access denied or unavailable. Please type 6-digit PIN.');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleAdd = () => {
    const colorParam = availableVariants.length > 1 && selectedColor && selectedColor !== 'Default' && selectedColor !== 'Original' ? selectedColor : undefined;
    onAddToCart(product, selectedSize, undefined, colorParam, effectiveQuantity);
    setAddedToCartToast(true);
    setTimeout(() => setAddedToCartToast(false), 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl md:rounded-3xl shadow-2xl border border-pink-200/90 overflow-hidden relative max-h-[92vh] sm:max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-pink-900 via-pink-950 to-amber-950 text-amber-100 px-3.5 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between border-b border-amber-300/30 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden pr-2">
            <span className="bg-amber-400 text-pink-950 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded uppercase shrink-0">
              {product.category}
            </span>
            <span className="text-xs text-amber-200 font-semibold truncate">{product.collection}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/15 rounded-full text-amber-200 transition-colors shrink-0 active:scale-95"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body Grid with Hidden Scrollbars */}
        <div className="p-3.5 sm:p-5 md:p-6 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          
          {/* Left Column: Image Gallery */}
          <div className="space-y-2.5 sm:space-y-3">
            <div className="relative aspect-[4/3] sm:aspect-[3/4] max-h-[35vh] sm:max-h-[48vh] md:max-h-[52vh] bg-pink-50/70 rounded-xl sm:rounded-2xl overflow-hidden border border-pink-100 shadow-inner flex items-center justify-center">
              <img
                src={activeMainImage}
                alt={availableVariants.length > 1 && selectedColor && selectedColor !== 'Default' && selectedColor !== 'Original' ? `${product.name} - ${selectedColor}` : product.name}
                referrerPolicy="no-referrer"
                onError={handleMainImageError}
                className="w-full h-full object-cover object-top"
              />
              <button
                type="button"
                onClick={(e) => onToggleWishlist(product, e)}
                className={`absolute top-2.5 right-2.5 p-2 sm:p-2.5 rounded-full shadow-md backdrop-blur-md transition-all active:scale-90 z-20 ${
                  isWishlisted ? 'bg-pink-600 text-white' : 'bg-white/85 text-gray-700 hover:bg-white'
                }`}
                aria-label="Toggle wishlist"
              >
                <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isWishlisted ? 'fill-white' : ''}`} />
              </button>

              {/* OUT OF STOCK Image Overlay */}
              {isProductOutOfStock && (
                <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center z-10 select-none">
                  <div className="bg-red-600 text-white text-xs sm:text-sm font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-2xl border border-white/90 flex items-center gap-1.5 animate-pulse">
                    <AlertCircle className="w-4 h-4 text-white" />
                    <span>OUT OF STOCK</span>
                  </div>
                  <p className="text-white text-[11px] font-semibold mt-2 drop-shadow max-w-[200px]">
                    This product is currently out of stock.
                  </p>
                </div>
              )}
            </div>

            {/* Thumbnail Selectors (Scrollbar Hidden) */}
            {activeGalleryImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-1">
                {activeGalleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(idx)}
                    className={`w-12 h-16 sm:w-16 sm:h-20 rounded-lg overflow-hidden border-2 transition-all shrink-0 active:scale-95 ${
                      selectedImage === idx ? 'border-pink-700 ring-2 ring-pink-300 scale-105 shadow-sm' : 'border-gray-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover object-top" referrerPolicy="no-referrer" onError={handleThumbnailError} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Info & Buy Controls */}
          <div className="space-y-3 sm:space-y-4 flex flex-col justify-between">
            
            <div className="space-y-1.5">
              <span className="text-[10px] sm:text-xs font-black text-pink-700 uppercase tracking-widest block">
                Feat Premium Ethnic Wear
              </span>
              <h2 className="text-base sm:text-xl font-extrabold text-gray-900 leading-snug">
                {product.name}
              </h2>

              {/* Rating Pill */}
              <div className="flex items-center gap-2 pt-1">
                {genuineReviewsCount > 0 && genuineRating > 0 ? (
                  <>
                    <div className="bg-emerald-700 text-white text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                      <span>{genuineRating}</span>
                      <Star className="w-3 h-3 fill-white" />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">
                      {genuineReviewsCount} {genuineReviewsCount === 1 ? 'Rating & Verified Review' : 'Ratings & Verified Reviews'}
                    </span>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold bg-pink-50/80 px-2 py-1 rounded-lg border border-pink-100">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    <span>No Reviews Yet</span>
                  </div>
                )}
              </div>
            </div>

            {/* Price Box */}
            <div className="bg-gradient-to-r from-pink-50 to-amber-50/60 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-pink-200/80 flex items-baseline gap-2.5 sm:gap-3 flex-wrap">
              <span className="text-xl sm:text-2xl font-black text-pink-950">
                ₹{currentTotalBasePrice.toLocaleString('en-IN')}
              </span>
              <span className="text-xs sm:text-sm text-gray-400 line-through">
                ₹{currentTotalOriginalPrice.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] sm:text-xs font-black text-pink-800 bg-amber-200/80 px-2 py-0.5 rounded-md border border-amber-300/60">
                {product.discountPercent}% OFF
              </span>
              {effectiveQuantity > 1 && (
                <span className="text-[11px] font-black text-pink-900 bg-pink-100 px-2 py-0.5 rounded-lg border border-pink-200 shadow-2xs">
                  Total for {effectiveQuantity} Pieces
                </span>
              )}
            </div>

            {/* Out of Stock Notice Banner */}
            {isProductOutOfStock && (
              <div className="bg-red-50 border border-red-300 text-red-900 p-2.5 sm:p-3 rounded-xl flex items-center gap-2.5 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-red-700">
                    OUT OF STOCK
                  </h3>
                  <p className="text-[11px] text-red-700 font-semibold mt-0.5">
                    This item is currently sold out. Restocking soon!
                  </p>
                </div>
              </div>
            )}

            {/* Fast Finishing Stock Banner */}
            {isProductLowStock && (
              <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 border border-amber-300 text-amber-950 p-2.5 rounded-xl flex items-center gap-2.5 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-amber-400 text-neutral-950 flex items-center justify-center shrink-0 shadow-xs">
                  <Flame className="w-4 h-4 text-neutral-950 animate-bounce" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-neutral-950 leading-snug">
                    Fast finishing stock: only <span className="text-pink-900 underline decoration-pink-700">{totalProductStock} {totalProductStock === 1 ? 'piece' : 'pieces'}</span> left in {product.name}
                  </p>
                  <p className="text-[10px] text-amber-900 font-medium">
                    High demand! Grab yours now before stock sells out.
                  </p>
                </div>
              </div>
            )}

            {/* Color Choices Selector */}
            {availableVariants.length > 1 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                  <span className="flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-pink-700" />
                    <span>Select Color / Item Option:</span>
                  </span>
                  <span className="text-pink-900 bg-pink-100 font-extrabold px-2 py-0.5 rounded text-[11px]">
                    {selectedColor}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {availableVariants.map((variant, idx) => {
                    const isSelected = selectedColor === variant.name;
                    const variantImg = variant.imageUrl || variant.images?.[0] || product.images[0];
                    const photoCount = variant.images && variant.images.length > 0 ? variant.images.length : (variant.imageUrl ? 1 : 0);

                    const vUnits = (variant.sizeStock && Object.keys(variant.sizeStock).length > 0)
                      ? Object.values(variant.sizeStock).reduce((sum, count) => sum + (Number(count) || 0), 0)
                      : (variant.stockCount !== undefined ? Number(variant.stockCount) : 0);

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectColorVariant(variant)}
                        className={`flex items-center gap-2 p-1.5 rounded-xl border text-left text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-pink-950 text-amber-200 border-pink-950 shadow ring-2 ring-pink-300/60 scale-[1.02]'
                            : 'bg-white text-gray-800 border-pink-200 hover:border-pink-300 hover:bg-pink-50/50'
                        }`}
                      >
                        <div className="w-9 h-11 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-black/10">
                          {variantImg ? (
                            <img src={variantImg} alt={variant.name} className="w-full h-full object-cover object-top" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-pink-100 text-pink-800 text-[9px] font-bold">
                              {variant.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className={`block truncate ${isSelected ? 'text-amber-200' : 'text-gray-900'}`}>{variant.name}</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[9px] block ${isSelected ? 'text-pink-200/80' : 'text-gray-400'}`}>
                              {photoCount > 0 ? `${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}` : 'Color Shade'}
                            </span>
                            {vUnits <= 0 ? (
                              <span className="text-[8px] font-bold px-1 rounded bg-rose-100 text-rose-700">
                                Sold Out
                              </span>
                            ) : vUnits <= 5 ? (
                              <span className="text-[8px] font-black px-1 rounded bg-amber-100 text-amber-900">
                                {vUnits} left
                              </span>
                            ) : (
                              <span className="text-[8px] font-bold px-1 rounded bg-emerald-50 text-emerald-800">
                                {vUnits} in stock
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check className="w-3 h-3 text-amber-300 shrink-0 mr-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size Selector */}
            {activeSizes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700 flex-wrap gap-1.5">
                  <span className="flex items-center gap-1.5">
                    <span>Select Size:</span>
                    {selectedSizeUnits > 0 ? (
                      selectedSizeUnits <= 3 ? (
                        <span className="text-[10px] font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                          ⚡ Only {selectedSizeUnits} {selectedSizeUnits === 1 ? 'piece' : 'pieces'} left in {selectedSize} ({selectedColor})!
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          ✓ {selectedSizeUnits} {selectedSizeUnits === 1 ? 'piece' : 'pieces'} in stock for {selectedSize} ({selectedColor})
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        Out of Stock in Size {selectedSize} ({selectedColor})
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSizeChart(true)}
                    className="text-pink-700 hover:text-pink-900 text-[11px] underline cursor-pointer font-bold transition-colors"
                  >
                    Size Guide
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeSizes.map((sz) => {
                    const u = getSizeStock(sz);
                    const isZero = u === 0;
                    const isLow = u > 0 && u <= 3;
                    const isSelected = selectedSize === sz;

                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedSize(sz)}
                        className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-black border transition-all flex items-center gap-2 shadow-2xs ${
                          isSelected
                            ? 'bg-pink-950 text-amber-200 border-pink-950 shadow ring-2 ring-pink-400'
                            : isZero
                              ? 'bg-gray-100 text-gray-400 border-gray-200 hover:border-gray-300'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-pink-300 hover:bg-pink-50/50'
                        }`}
                      >
                        <span className={isZero && !isSelected ? 'line-through' : 'font-black'}>{sz}</span>
                        {isZero ? (
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1 rounded ${isSelected ? 'bg-rose-900/80 text-rose-200' : 'bg-rose-100 text-rose-600'}`}>
                            0 in stock
                          </span>
                        ) : isLow ? (
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${isSelected ? 'bg-amber-400 text-pink-950' : 'bg-amber-100 text-amber-900 border border-amber-300'}`}>
                            {u} {u === 1 ? 'piece' : 'pieces'} left
                          </span>
                        ) : (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-pink-900 text-amber-100' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
                            {u} {u === 1 ? 'pc' : 'pcs'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Individual Size Stock Details in Modal */}
                <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl p-2 sm:p-2.5 flex items-center gap-1.5 flex-wrap text-[11px]">
                  <span className="font-extrabold text-amber-950 uppercase tracking-wider text-[10px]">
                    Size Availability ({selectedColor}):
                  </span>
                  {activeSizes.map((sz) => {
                    const count = getSizeStock(sz);
                    const isZero = count === 0;
                    const isLow = count > 0 && count <= 3;
                    const isSelected = selectedSize === sz;

                    return (
                      <span
                        key={sz}
                        onClick={() => setSelectedSize(sz)}
                        className={`cursor-pointer px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                          isSelected
                            ? 'bg-pink-950 text-amber-200 border-pink-950'
                            : isZero
                              ? 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                              : isLow
                                ? 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold'
                                : 'bg-white text-gray-800 border-gray-200'
                        }`}
                      >
                        {sz}: <strong className="font-black">{count} {count === 1 ? 'pc' : 'pcs'}</strong>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity / Multiple Pieces Selector */}
            {!isSelectedSizeOutOfStock && (
              <div className="bg-gradient-to-r from-pink-50/90 via-white to-amber-50/80 border border-pink-200 rounded-xl p-2.5 sm:p-3 space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-gray-800 flex-wrap gap-1">
                  <span className="uppercase tracking-wider flex items-center gap-1.5 font-black text-pink-950 text-[11px]">
                    <Package className="w-3.5 h-3.5 text-pink-700" />
                    <span>Select Pieces / Quantity:</span>
                  </span>
                  <span className="text-[10px] font-extrabold text-pink-900 bg-white px-2 py-0.5 rounded-md border border-pink-200">
                    {effectiveQuantity} {effectiveQuantity === 1 ? 'Piece' : 'Pieces'} • Total: ₹{currentTotalBasePrice.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Stepper with Minus / Plus */}
                  <div className="flex items-center bg-white border border-pink-300 rounded-lg overflow-hidden shadow-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedQuantity(prev => Math.max(1, prev - 1))}
                      disabled={effectiveQuantity <= 1}
                      className="p-1.5 px-2.5 text-pink-900 hover:bg-pink-100 active:bg-pink-200 disabled:opacity-30 disabled:hover:bg-white transition-colors cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2.5 py-0.5 text-xs font-mono font-black text-pink-950 min-w-[2rem] text-center select-none">
                      {effectiveQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedQuantity(prev => Math.min(Math.max(1, selectedSizeUnits), prev + 1))}
                      disabled={effectiveQuantity >= selectedSizeUnits}
                      className="p-1.5 px-2.5 text-pink-900 hover:bg-pink-100 active:bg-pink-200 disabled:opacity-30 disabled:hover:bg-white transition-colors cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Quick Pick Chips */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {[1, 2, 3, 4, 5]
                      .filter(qty => qty <= selectedSizeUnits)
                      .map(qty => (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => setSelectedQuantity(qty)}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer border ${
                            effectiveQuantity === qty
                              ? 'bg-pink-900 text-amber-200 border-pink-950 shadow-xs'
                              : 'bg-white hover:bg-pink-50 text-gray-700 border-gray-200'
                          }`}
                        >
                          {qty} {qty === 1 ? 'pc' : 'pcs'}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Fabric Details & Specifications */}
            <div className="border border-pink-100 rounded-xl p-2.5 sm:p-3 space-y-1 text-xs text-gray-700 bg-pink-50/30">
              <div className="flex justify-between">
                <span className="font-bold text-gray-500">SKU Code:</span>
                <span className="font-mono font-bold text-pink-950">{product.sku || product.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-gray-500">Fabric:</span>
                <span className="font-semibold text-gray-800">{product.fabric}</span>
              </div>
              {product.length && product.length.trim() !== '' && (
                <div className="flex justify-between">
                  <span className="font-bold text-gray-500">Length:</span>
                  <span className="font-semibold text-gray-800">{product.length}</span>
                </div>
              )}
              {product.careInstructions && product.careInstructions.trim() !== '' && (
                <div className="flex justify-between">
                  <span className="font-bold text-gray-500">Care:</span>
                  <span className="font-semibold text-gray-800">{product.careInstructions}</span>
                </div>
              )}
            </div>

            {/* Shiprocket Delivery Day & Pincode Checker */}
            <div className="space-y-2.5 p-3 bg-gradient-to-br from-amber-50/70 via-pink-50/40 to-white rounded-2xl border border-pink-100 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="text-[11px] sm:text-xs font-extrabold text-pink-950 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-pink-800" />
                  <span>Estimated Delivery by Shiprocket</span>
                </label>
                <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-emerald-600" /> Fast Dispatch
                </span>
              </div>

              <form onSubmit={handleCheckPincode} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="postal-code"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    placeholder="Enter 6-Digit Pincode (e.g. 700001)"
                    className="w-full pl-8 pr-20 py-2 sm:py-1.5 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-700 bg-white shadow-inner font-semibold"
                  />
                  <button
                    type="button"
                    onClick={handleDetectLiveLocation}
                    disabled={isDetectingLocation || isCheckingPin}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] font-bold text-pink-700 hover:text-pink-900 bg-pink-50 hover:bg-pink-100 rounded-lg border border-pink-200 transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer shadow-2xs"
                    title="Auto-detect postal pincode via GPS"
                  >
                    {isDetectingLocation ? (
                      <RefreshCw className="w-2.5 h-2.5 animate-spin text-pink-700" />
                    ) : (
                      <Navigation className="w-2.5 h-2.5 text-pink-700" />
                    )}
                    <span>{isDetectingLocation ? 'Locating...' : 'Locate'}</span>
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={isCheckingPin || isDetectingLocation}
                  className="bg-pink-950 text-amber-200 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-extrabold hover:bg-pink-900 transition-colors flex items-center justify-center gap-1 disabled:opacity-60 cursor-pointer shadow-xs"
                >
                  {isCheckingPin ? (
                    <>
                      <Clock className="w-3 h-3 animate-spin" />
                      <span>Estimating...</span>
                    </>
                  ) : (
                    <span>Check</span>
                  )}
                </button>
              </form>

              {pincodeMessage && (
                <p className="text-[11px] font-medium text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200">
                  {pincodeMessage}
                </p>
              )}

              {deliveryEstimate && deliveryEstimate.isServiceable && (
                <div className="p-2.5 bg-white rounded-xl border border-emerald-200 shadow-2xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-xs font-extrabold text-gray-900">
                          Delivery by <span className="text-pink-900 underline font-black">{deliveryEstimate.estimatedDeliveryDate}</span>
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {deliveryEstimate.estimatedDays}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 pl-4 font-medium">
                        Via {deliveryEstimate.courierName}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-100 text-pink-900 whitespace-nowrap shrink-0">
                      {deliveryEstimate.isCodAvailable ? 'COD Available' : 'Prepaid Only'}
                    </span>
                  </div>

                  <div className="bg-pink-50/70 p-2 rounded-lg border border-pink-100 text-[10px] space-y-0.5">
                    <div className="flex items-center justify-between text-pink-950 font-bold">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 text-pink-700" />
                        <span>Origin: Khanyan Warehouse (712147)</span>
                      </span>
                      {deliveryEstimate.distanceKm !== undefined && (
                        <span className="bg-white px-1.5 py-0.2 rounded text-[9px] font-black text-pink-900 border border-pink-200">
                          ~{deliveryEstimate.distanceKm} km transit
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-600">
                      Destination: <strong>{deliveryEstimate.city ? `${deliveryEstimate.city}, ${deliveryEstimate.state}` : `PIN ${deliveryEstimate.pincode}`}</strong>
                    </p>
                  </div>

                  <div className="pt-1 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      {deliveryEstimate.dispatchTime}
                    </span>
                    <span className="text-emerald-700 font-bold">Verified</span>
                  </div>
                </div>
              )}
            </div>

            {/* Trust Assurances */}
            <div className="grid grid-cols-3 gap-1.5 text-[10px] text-gray-600 text-center pt-2 border-t border-gray-100">
              <div className="flex flex-col items-center">
                <ShieldCheck className="w-4 h-4 text-pink-700 mb-0.5" />
                <span>100% Authentic Fabric</span>
              </div>
              <div className="flex flex-col items-center">
                <RefreshCw className="w-4 h-4 text-pink-700 mb-0.5" />
                <span>5 Days Easy Returns</span>
              </div>
              <div className="flex flex-col items-center">
                <Truck className="w-4 h-4 text-pink-700 mb-0.5" />
                <span>Free Express Shipping</span>
              </div>
            </div>

            {/* Primary Action CTA Buttons */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  disabled={isSelectedSizeOutOfStock}
                  onClick={handleAdd}
                  className={`flex-1 font-extrabold py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 border ${
                    isSelectedSizeOutOfStock
                      ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed font-extrabold'
                      : 'bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-neutral-950 border-yellow-500 shadow-yellow-200/80 active:scale-95'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span>
                    {isProductOutOfStock
                      ? 'Out of Stock'
                      : isSelectedSizeOutOfStock
                      ? `Size ${selectedSize} Out of Stock`
                      : effectiveQuantity > 1
                      ? `Add ${effectiveQuantity} Pieces • ₹${currentTotalBasePrice.toLocaleString('en-IN')}`
                      : 'Add to Cart'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isSelectedSizeOutOfStock}
                  onClick={() => {
                    if (isSelectedSizeOutOfStock) return;
                    const colorParam = availableVariants.length > 1 && selectedColor && selectedColor !== 'Default' && selectedColor !== 'Original' ? selectedColor : undefined;
                    onBuyNow(product, selectedSize, colorParam, effectiveQuantity);
                    onClose();
                  }}
                  className={`flex-1 font-extrabold py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 border ${
                    isSelectedSizeOutOfStock
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed font-extrabold'
                      : 'bg-gradient-to-r from-pink-950 to-pink-900 hover:from-pink-900 hover:to-pink-800 text-amber-200 border-amber-300/40 active:scale-95'
                  }`}
                >
                  <Zap className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>
                    {isProductOutOfStock
                      ? 'Out of Stock'
                      : isSelectedSizeOutOfStock
                      ? `Size ${selectedSize} Out of Stock`
                      : effectiveQuantity > 1
                      ? `Buy ${effectiveQuantity} Pieces • ₹${currentTotalBasePrice.toLocaleString('en-IN')}`
                      : 'Buy Now'}
                  </span>
                </button>
              </div>

              {isProductOutOfStock ? (
                <p className="text-[11px] font-semibold text-rose-700 text-center bg-rose-50 p-2 rounded-lg border border-rose-200">
                  This product is currently out of stock. Please check back soon!
                </p>
              ) : isSelectedSizeOutOfStock ? (
                <p className="text-[11px] font-semibold text-rose-700 text-center bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                  Size {selectedSize} is currently out of stock. Please select another available size above.
                </p>
              ) : null}
            </div>

            {/* Toast Notification */}
            {addedToCartToast && (
              <div className="bg-emerald-600 text-white text-xs font-bold p-2.5 rounded-xl text-center animate-bounce shadow-md">
                ✓ Added {effectiveQuantity} {effectiveQuantity === 1 ? 'piece' : 'pieces'} to Cart ({selectedSize}{availableVariants.length > 1 && selectedColor && selectedColor !== 'Default' && selectedColor !== 'Original' ? ` • ${selectedColor}` : ''})!
              </div>
            )}

          </div>

        </div>

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
