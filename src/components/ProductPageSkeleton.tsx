import React from 'react';
import {
  ArrowLeft,
  Heart,
  Share2,
  Star,
  ShoppingBag,
  Zap,
  Truck,
  ShieldCheck,
  RefreshCw,
  Feather,
  Tag,
  Sparkles,
  ChevronRight,
  Flame,
  Clock,
  Package
} from 'lucide-react';
import { ProductCardSkeleton } from './ProductCardSkeleton';

interface ProductPageSkeletonProps {
  onBack?: () => void;
  productId?: string | null;
}

export const ProductPageSkeleton: React.FC<ProductPageSkeletonProps> = ({
  onBack,
  productId
}) => {
  return (
    <div
      className="min-h-screen pb-16 pt-4 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in"
      role="status"
      aria-live="polite"
      aria-label="Loading product details"
    >
      {/* Top Navigation & Breadcrumbs Bar Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-3 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-pink-200/80 bg-white/90 shadow-pink-100/40">
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-extrabold bg-[#ff2a85] hover:bg-[#e11d48] text-white transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Store</span>
          </button>

          <div className="hidden md:flex items-center gap-2 text-xs font-semibold pl-2 border-l border-gray-200">
            <span
              onClick={onBack}
              className="text-gray-400 hover:text-pink-700 cursor-pointer"
            >
              Home
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <div className="w-20 h-3 rounded-md bg-pink-300/40 animate-pulse" />
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <div className="w-32 h-3 rounded-md bg-pink-950/15 animate-pulse" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {productId && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-pink-700 bg-pink-50 border border-pink-200 px-2.5 py-1 rounded-xl">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff2a85] animate-ping" />
              <span>SKU: {productId}</span>
            </span>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-pink-200 bg-pink-50/70 text-xs font-extrabold text-pink-900">
            <Share2 className="w-3.5 h-3.5 text-pink-700" />
            <span>Share Item</span>
          </div>
        </div>
      </div>

      {/* Main Luxury Product Card Skeleton */}
      <div className="rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 border bg-gradient-to-b from-[#fffefc] via-[#fffbf4] to-[#fdf4f8] border-pink-200/90 shadow-pink-100/50 relative overflow-hidden">
        
        {/* Subtle Ambient Shimmer Top Sweep */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#ff2a85] to-transparent animate-luxury-shimmer opacity-80 pointer-events-none" />

        {/* LEFT COLUMN: Media Gallery Skeleton (md:col-span-6) */}
        <div className="md:col-span-6 space-y-4">
          {/* Main Large Image Viewport Skeleton */}
          <div className="relative aspect-[3/4] max-h-[580px] rounded-2xl overflow-hidden border border-pink-200/80 bg-gradient-to-br from-pink-100/60 via-amber-50/40 to-rose-100/50 flex flex-col items-center justify-center group shadow-inner">
            {/* Shimmer sweep */}
            <div className="absolute inset-0 -translate-x-full animate-luxury-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

            {/* Top-Left Category & Collection Badges */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <div className="h-6 w-20 rounded-full bg-gradient-to-r from-pink-500/40 to-amber-500/40 animate-pulse border border-white/60 shadow-xs" />
              <div className="h-6 w-24 rounded-full bg-pink-950/20 backdrop-blur-md animate-pulse border border-white/40 shadow-xs" />
            </div>

            {/* Top-Right Wishlist Heart Placeholder */}
            <div className="absolute top-3 right-3 p-3 rounded-full bg-white/90 shadow-md border border-pink-200/60 text-pink-300">
              <Heart className="w-5 h-5 fill-pink-100 text-pink-300" />
            </div>

            {/* Luxury Watermark & Loading Emblem */}
            <div className="flex flex-col items-center justify-center gap-3 p-6 text-center select-none z-10">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white/80 backdrop-blur-md shadow-md border border-pink-200/70 flex items-center justify-center text-[#ff2a85] animate-pulse">
                <Feather className="w-9 h-9 sm:w-11 sm:h-11 stroke-[1.6]" />
              </div>

              <div className="space-y-1">
                <span className="text-xs sm:text-sm font-black tracking-widest uppercase bg-gradient-to-r from-pink-700 via-pink-900 to-amber-700 bg-clip-text text-transparent font-serif block">
                  Feat Couture • Authentic Handloom
                </span>
                <span className="text-[11px] text-pink-900/60 font-semibold block">
                  Curating Master Artisan Photography...
                </span>
              </div>
            </div>

            {/* Bottom Photography Assurance Ribbon */}
            <div className="absolute bottom-3 left-3 right-3 bg-white/80 backdrop-blur-md rounded-xl p-2 border border-pink-200/60 flex items-center justify-between text-[11px] font-bold text-pink-950">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#ff2a85]" />
                <span>100% Real Handcrafted Article</span>
              </span>
              <span className="text-gray-400 text-[10px]">High Definition Preview</span>
            </div>
          </div>

          {/* Thumbnail Gallery Row Skeleton */}
          <div className="flex gap-3 overflow-x-auto pb-1">
            {[...Array(4)].map((_, idx) => (
              <div
                key={`thumb-${idx}`}
                className={`w-16 h-20 sm:w-20 sm:h-24 rounded-xl overflow-hidden border-2 bg-gradient-to-br from-pink-50 to-amber-50/60 shrink-0 relative ${
                  idx === 0 ? 'border-pink-500 ring-2 ring-pink-200 shadow-sm' : 'border-pink-200/70 opacity-80'
                }`}
              >
                <div className="absolute inset-0 -translate-x-full animate-luxury-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />
                <div className="w-full h-full flex items-center justify-center text-pink-300">
                  <Feather className="w-5 h-5 opacity-40" />
                </div>
              </div>
            ))}
          </div>

          {/* Trust Assurances Badges Row */}
          <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-700 text-center pt-3 border-t border-pink-200/60">
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

        {/* RIGHT COLUMN: Product Information & Purchase Section Skeleton (md:col-span-6) */}
        <div className="md:col-span-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            
            {/* Header Brand Subtitle & Title Skeleton */}
            <div className="space-y-2">
              <div className="h-3.5 w-44 rounded-full bg-pink-300/50 animate-pulse" />
              <div className="space-y-2 pt-1">
                <div className="h-7 sm:h-8 w-11/12 rounded-xl bg-pink-950/15 animate-pulse" />
                <div className="h-7 sm:h-8 w-3/4 rounded-xl bg-pink-950/10 animate-pulse" />
              </div>
            </div>

            {/* Ratings & Reviews Skeleton Line */}
            <div className="flex items-center gap-3 pt-1">
              <div className="h-7 w-28 rounded-lg bg-emerald-700/25 animate-pulse flex items-center px-2.5 gap-1.5">
                <Star className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                <div className="h-3 w-12 rounded bg-emerald-800/30" />
              </div>
              <div className="h-4 w-36 rounded bg-gray-200/80 animate-pulse" />
            </div>

            {/* Luxury Price & Discount Box Skeleton */}
            <div className="p-4 rounded-2xl border-2 border-amber-300/80 bg-gradient-to-r from-amber-100/80 via-pink-50 to-amber-100/70 flex flex-col gap-3 shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-luxury-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

              <div className="flex items-baseline gap-3 flex-wrap">
                {/* Current Price */}
                <div className="h-9 w-32 rounded-xl bg-pink-950/20 animate-pulse" />
                {/* Original MRP */}
                <div className="h-5 w-24 rounded-lg bg-gray-300/60 animate-pulse" />
                {/* Discount Badge */}
                <div className="h-7 w-24 rounded-lg bg-gradient-to-r from-amber-500/40 to-pink-600/40 animate-pulse" />
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-amber-200/80 pt-2 text-xs">
                <div className="h-4 w-40 rounded bg-emerald-200/60 animate-pulse" />
                <div className="h-4 w-28 rounded bg-pink-200/60 animate-pulse" />
              </div>
            </div>

            {/* Stock Urgency Banner Skeleton */}
            <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 border-2 border-amber-300/90 text-amber-950 p-3.5 rounded-2xl flex items-center gap-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-neutral-950 flex items-center justify-center shrink-0 shadow-xs">
                <Flame className="w-5 h-5 text-neutral-950 animate-bounce" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 w-48 rounded bg-amber-950/20 animate-pulse" />
                <div className="h-2.5 w-32 rounded bg-amber-950/10 animate-pulse" />
              </div>
            </div>

            {/* Available Coupon Offers Box Skeleton */}
            <div className="border border-pink-200/90 rounded-2xl p-3.5 space-y-3 bg-pink-50/70 shadow-2xs">
              <div className="flex items-center justify-between gap-2 border-b border-pink-200/70 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-pink-950 uppercase tracking-wider">
                  <Tag className="w-4 h-4 text-pink-800" />
                  <span>Available Offers for this Product</span>
                </div>
                <div className="h-4 w-24 rounded-full bg-pink-200/70 animate-pulse" />
              </div>

              <div className="space-y-2 pt-1">
                {[...Array(2)].map((_, i) => (
                  <div
                    key={`offer-skel-${i}`}
                    className="bg-white/95 rounded-xl p-3 border border-pink-200 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-20 rounded bg-pink-800/30 animate-pulse" />
                        <div className="h-4 w-24 rounded-full bg-amber-200/60 animate-pulse" />
                      </div>
                      <div className="h-3.5 w-48 rounded bg-gray-200 animate-pulse" />
                    </div>
                    <div className="h-7 w-20 rounded-xl bg-pink-100 animate-pulse shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            {/* Size Selector Skeleton */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                <span className="uppercase tracking-wider">Select Size:</span>
                <span className="text-pink-800 font-extrabold underline text-xs">Size Chart & Guide</span>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {['Free Size', 'S', 'M', 'L', 'XL'].map((sz, i) => (
                  <div
                    key={sz}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black border flex items-center gap-2 ${
                      i === 0
                        ? 'bg-pink-950 text-amber-200 border-pink-950 shadow-md ring-2 ring-pink-400'
                        : 'bg-white text-gray-400 border-gray-300'
                    }`}
                  >
                    <span>{sz}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                ))}
              </div>
            </div>

            {/* Color Shade Swatches Skeleton */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                Available Colors & Shades:
              </span>
              <div className="flex items-center gap-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={`color-skel-${i}`}
                    className={`w-10 h-10 rounded-xl border-2 p-0.5 ${
                      i === 0 ? 'border-pink-800 ring-2 ring-pink-300' : 'border-gray-200'
                    }`}
                  >
                    <div className="w-full h-full rounded-lg bg-pink-100 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* Fabric Specifications Table Skeleton */}
            <div className="border border-pink-200 rounded-2xl p-4 space-y-2 text-xs text-gray-800 bg-pink-50/30">
              <h3 className="font-extrabold text-pink-950 uppercase tracking-wider text-[11px] mb-2 border-b border-pink-200/80 pb-1">
                Fabric & Product Specifications
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-bold text-gray-500 block text-[10px] uppercase">SKU Code</span>
                  <div className="h-3.5 w-24 rounded bg-pink-950/20 animate-pulse mt-1" />
                </div>
                <div>
                  <span className="font-bold text-gray-500 block text-[10px] uppercase">Fabric</span>
                  <div className="h-3.5 w-28 rounded bg-gray-300/70 animate-pulse mt-1" />
                </div>
                <div>
                  <span className="font-bold text-gray-500 block text-[10px] uppercase">Occasion</span>
                  <div className="h-3.5 w-20 rounded bg-gray-300/70 animate-pulse mt-1" />
                </div>
                <div>
                  <span className="font-bold text-gray-500 block text-[10px] uppercase">Care Instructions</span>
                  <div className="h-3.5 w-24 rounded bg-gray-300/70 animate-pulse mt-1" />
                </div>
              </div>
            </div>

            {/* Shiprocket Delivery Estimation Skeleton */}
            <div className="p-3.5 bg-gradient-to-br from-amber-50/70 via-pink-50/40 to-white rounded-2xl border border-pink-100 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-pink-950">
                  <Truck className="w-4 h-4 text-pink-800" />
                  <span>Estimated Delivery by Shiprocket</span>
                </div>
                <div className="h-5 w-32 rounded-full bg-emerald-100 animate-pulse" />
              </div>

              <div className="flex items-center gap-2">
                <div className="h-10 flex-1 rounded-xl bg-white border border-pink-200 animate-pulse" />
                <div className="h-10 w-24 rounded-xl bg-pink-950/20 animate-pulse" />
              </div>
            </div>

          </div>

          {/* DUAL ACTION CTA BUTTONS SKELETON */}
          <div className="space-y-2 pt-4">
            <div className="flex items-center gap-3">
              {/* Add to Cart Button Skeleton */}
              <div className="flex-1 font-black py-4 rounded-2xl text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 border bg-yellow-400/70 text-neutral-900 border-yellow-500 shadow-yellow-200/80 animate-pulse cursor-wait">
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span>ADD TO CART</span>
              </div>

              {/* Buy Now Button Skeleton */}
              <div className="flex-1 font-black py-4 rounded-2xl text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 border bg-gradient-to-r from-amber-600/70 via-pink-700/70 to-amber-700/70 text-amber-100 border-amber-300/60 animate-pulse cursor-wait shadow-amber-900/30">
                <Zap className="w-4 h-4 text-amber-300 shrink-0" />
                <span>BUY NOW</span>
              </div>
            </div>

            <p className="text-[11px] text-center text-gray-500 font-semibold">
              🔒 256-Bit SSL Encrypted Safe Checkout • Free Pan-India Delivery
            </p>
          </div>

        </div>

      </div>

      {/* Description & Story Accordion Skeleton */}
      <div className="bg-white rounded-3xl shadow-lg border border-pink-100 p-6 sm:p-8 space-y-4">
        <h2 className="text-lg sm:text-xl font-extrabold text-pink-950 font-serif border-b border-pink-100 pb-2 flex items-center justify-between">
          <span>Description & Craftsmanship Story</span>
        </h2>
        <div className="space-y-2.5">
          <div className="h-4 w-full rounded bg-gray-200/80 animate-pulse" />
          <div className="h-4 w-11/12 rounded bg-gray-200/80 animate-pulse" />
          <div className="h-4 w-4/5 rounded bg-gray-200/80 animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-gray-200/80 animate-pulse" />
        </div>
      </div>

      {/* Related Products Grid Skeleton */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-pink-700 block">
              Curated For You
            </span>
            <h2 className="text-xl font-extrabold text-gray-900 font-serif">
              You May Also Like
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <ProductCardSkeleton key={`rel-skel-${i}`} />
          ))}
        </div>
      </div>
    </div>
  );
};
