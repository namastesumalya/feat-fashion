import React, { useState, useEffect, useMemo } from 'react';
import { Star, Heart, ShoppingBag, AlertCircle } from 'lucide-react';
import { Product } from '../types';
import { getProductMainImage, getCategoryFallbackImage } from '../utils/productImage';

interface ProductCardProps {
  product: Product;
  onSelect?: (p: Product) => void;
  onSelectProduct?: (p: Product) => void;
  onAddToCart: (p: Product, size: string, e: React.MouseEvent, color?: string) => void;
  isWishlisted: boolean;
  onToggleWishlist: (p: Product, e: React.MouseEvent) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  onSelectProduct,
  onAddToCart,
  isWishlisted,
  onToggleWishlist
}) => {
  const totalStock = (product.sizeStock && Object.keys(product.sizeStock).length > 0)
    ? Object.values(product.sizeStock).reduce((sum, val) => sum + (Number(val) || 0), 0)
    : Number(product.stockCount || 0);
  const isOutOfStock = totalStock <= 0;
  const isLowStock = totalStock > 0 && totalStock <= 5;
  const genuineReviews = Array.isArray(product.reviews) ? product.reviews : [];
  const genuineReviewsCount = genuineReviews.length;
  const genuineRating = genuineReviewsCount > 0
    ? Number((genuineReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / genuineReviewsCount).toFixed(1))
    : 0;

  const categoryFallback = getCategoryFallbackImage(product.category, product.collection, product.name);
  const mainImageUrl = getProductMainImage(product);

  const [cardImage, setCardImage] = useState<string>(mainImageUrl);
  const [imageFailed, setImageFailed] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  useEffect(() => {
    const initialImg = getProductMainImage(product);
    setCardImage(initialImg);
    setImageFailed(false);
    setRetryCount(0);
  }, [product.id, product.images, product.colorVariants, (product as any).image]);

  const handleImageError = () => {
    // If image fails, fallback to category fallback smoothly
    if (!imageFailed && cardImage !== categoryFallback) {
      setImageFailed(true);
      setCardImage(categoryFallback);
    }
  };

  const variants = useMemo(() => {
    const list: { name: string; imageUrl: string }[] = [];
    const primaryName = product.primaryColorName?.trim();
    if (primaryName) {
      list.push({
        name: primaryName,
        imageUrl: mainImageUrl
      });
    }
    if (product.colorVariants && product.colorVariants.length > 0) {
      product.colorVariants.forEach((v, i) => {
        if (!v.name || !v.name.trim()) return;
        const trimmed = v.name.trim();
        if (list.some(item => item.name.toLowerCase() === trimmed.toLowerCase())) return;
        list.push({
          name: trimmed,
          imageUrl: v.imageUrl || v.images?.[0] || product.images?.[i] || mainImageUrl
        });
      });
    } else if (product.colors && product.colors.length > 0) {
      product.colors.forEach((c, i) => {
        if (!c || !c.trim()) return;
        const trimmed = c.trim();
        if (list.some(item => item.name.toLowerCase() === trimmed.toLowerCase())) return;
        list.push({
          name: trimmed,
          imageUrl: product.images?.[i] || mainImageUrl
        });
      });
    }
    return list;
  }, [product, mainImageUrl]);

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(product);
    } else if (onSelectProduct) {
      onSelectProduct(product);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="rounded-2xl transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col justify-between relative bg-gradient-to-b from-white via-pink-50/40 to-white border border-pink-200/90 shadow-xs hover:shadow-xl hover:border-[#ff2a85] hover:-translate-y-1"
      id={`product-card-${product.id}`}
    >
      {/* Top Media Thumbnail Container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-pink-50/40">
        
        {/* Product Image */}
        <img
          src={cardImage}
          alt={`${product.name} - Feat: Feather Hut Fashion`}
          referrerPolicy="no-referrer"
          onError={handleImageError}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Wishlist Button Overlay */}
        <button
          onClick={(e) => onToggleWishlist(product, e)}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-all shadow ${
            isWishlisted
              ? 'bg-[#ff2a85] text-white'
              : 'bg-white/85 hover:bg-white text-gray-600 hover:text-[#ff2a85]'
          }`}
          title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-white' : ''}`} />
        </button>

        {/* Discount Badge */}
        {product.discountPercent > 0 && (
          <div className="absolute top-2.5 left-2.5 text-[11px] font-black px-2 py-0.5 rounded shadow bg-gradient-to-r from-[#ff2a85] to-[#db2777] text-white border border-pink-200">
            {product.discountPercent}% OFF
          </div>
        )}

        {/* Low Stock or Out of Stock Ribbon */}
        {isOutOfStock ? (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-2.5 text-center z-20 select-none">
            <div className="bg-red-600 text-white text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-xl border-2 border-white/80 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-white" />
              <span>OUT OF STOCK</span>
            </div>
            <span className="text-white text-[10px] sm:text-[11px] font-bold mt-1.5 drop-shadow">
              Currently Unavailable
            </span>
          </div>
        ) : isLowStock ? (
          <div className="absolute bottom-2 left-2 right-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-neutral-950 text-[10px] font-black px-2 py-1 rounded-xl flex items-center gap-1 shadow-lg border border-amber-300 z-10">
            <span className="w-2 h-2 rounded-full bg-neutral-950 animate-ping shrink-0" />
            <span className="truncate">Fast finishing stock: only {totalStock} left in {product.name}</span>
          </div>
        ) : null}

        {/* Collection Badge Pill */}
        <div className="absolute bottom-2 right-2 backdrop-blur-md text-[10px] font-semibold px-2 py-0.5 rounded bg-pink-950/75 text-pink-100">
          {product.collection}
        </div>
      </div>

      {/* Product Details Section */}
      <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
        <div>
          {/* Category & Fabric */}
          <div className="flex items-center justify-between text-[11px] font-bold mb-1">
            <span className="text-[#ff2a85] font-black">
              {product.category}
            </span>
            <span className="text-gray-500 font-normal truncate max-w-[110px]">{product.fabric}</span>
          </div>

          {/* Title */}
          <h3 className="text-xs sm:text-sm font-bold line-clamp-2 leading-snug text-black">
            {product.name}
          </h3>

          {/* Low Stock Warning or Out of Stock Badge */}
          {isLowStock ? (
            <div className="mt-1.5 bg-amber-50 border border-amber-300 text-amber-950 text-[10px] sm:text-[11px] font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse shrink-0" />
              <span className="truncate">Fast finishing stock: only {totalStock} left in {product.name}</span>
            </div>
          ) : isOutOfStock ? (
            <div className="mt-1.5 bg-red-50 border border-red-200 text-red-700 text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-md inline-flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-red-600 shrink-0" />
              <span>Out of Stock</span>
            </div>
          ) : null}
        </div>

        <div>
          {/* Ratings & Color Variants Preview */}
          <div className="flex items-center justify-between my-1.5">
            {genuineReviewsCount > 0 && genuineRating > 0 ? (
              <div className="flex items-center gap-1.5">
                <div className="bg-emerald-700 text-white text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <span>{genuineRating}</span>
                  <Star className="w-2.5 h-2.5 fill-white" />
                </div>
                <span className="text-[11px] text-gray-500 font-medium">({genuineReviewsCount})</span>
              </div>
            ) : (
              <div />
            )}

            {/* Colors Preview Real Thumbnails */}
            {variants.length > 1 && (
              <div className="flex items-center gap-1" title={`Available in: ${variants.map(v => v.name).join(', ')}`}>
                <div className="flex items-center -space-x-1.5">
                  {variants.slice(0, 3).map((v, idx) => (
                    <div
                      key={idx}
                      className="w-5 h-5 rounded-full border-2 border-white shadow-xs overflow-hidden bg-gray-100 shrink-0"
                    >
                      {v.imageUrl ? (
                        <img
                          src={v.imageUrl}
                          alt={v.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = categoryFallback;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-pink-100 flex items-center justify-center text-[8px] font-bold text-pink-900">
                          {v.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {variants.length > 3 && (
                  <span className="text-[10px] font-bold text-[#ff2a85]">
                    +{variants.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Individual Sizes Stock Chips */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap my-1.5" title="Individual stock per size">
              {product.sizes.map((sz) => {
                const u = (product.sizeStock && product.sizeStock[sz] !== undefined)
                  ? Number(product.sizeStock[sz])
                  : (product.stockCount > 0 ? Math.max(0, Math.floor(product.stockCount / product.sizes.length)) : 0);
                const isZero = u === 0;
                const isLow = u > 0 && u <= 3;
                return (
                  <span
                    key={sz}
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                      isZero
                        ? 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                        : isLow
                          ? 'bg-amber-50 text-amber-900 border-amber-300 font-black'
                          : 'bg-white text-gray-700 border-gray-200'
                    }`}
                  >
                    {sz}: <strong className={isLow ? 'text-amber-900' : isZero ? 'text-gray-400' : 'text-emerald-700'}>{u} {u === 1 ? 'pc' : 'pcs'}</strong>
                  </span>
                );
              })}
            </div>
          )}

          {/* Pricing Row */}
          <div className="flex items-baseline gap-2">
            <span className="text-base sm:text-lg font-black text-black">
              ₹{(product.price ?? 0).toLocaleString('en-IN')}
            </span>
            {(product.originalPrice !== undefined && product.originalPrice !== null) && (
              <span className="text-xs text-gray-400 line-through">
                ₹{(product.originalPrice ?? product.price ?? 0).toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Action Button: Yellow Background */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isOutOfStock) {
                const defaultColor = variants.length > 1 ? variants[0].name : undefined;
                const defaultSize = (product.sizes || []).find(sz => (product.sizeStock?.[sz] !== undefined ? product.sizeStock[sz] > 0 : true)) || product.sizes?.[0] || 'Free Size';
                onAddToCart(product, defaultSize, e, defaultColor);
              }
            }}
            disabled={isOutOfStock}
            className={`w-full mt-2.5 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border shadow-sm ${
              isOutOfStock
                ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed font-extrabold'
                : 'bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-neutral-950 border-yellow-500 shadow-yellow-200/80 hover:scale-[1.02] active:scale-95'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{isOutOfStock ? 'Out of stock' : 'Add to Cart'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
