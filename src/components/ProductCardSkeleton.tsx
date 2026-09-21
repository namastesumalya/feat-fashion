import React from 'react';
import { Sparkles, Feather } from 'lucide-react';

interface ProductCardSkeletonProps {
  isDark?: boolean;
}

export const ProductCardSkeleton: React.FC<ProductCardSkeletonProps> = ({ isDark = false }) => {
  return (
    <div
      className={`rounded-2xl overflow-hidden flex flex-col justify-between relative border transition-all duration-300 ${
        isDark
          ? 'bg-gradient-to-b from-white/10 via-pink-900/20 to-black/30 border-amber-300/30 shadow-lg'
          : 'bg-gradient-to-b from-white via-pink-50/40 to-white border-pink-200/80 shadow-xs'
      }`}
    >
      {/* Top Image Skeleton */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-gradient-to-br from-pink-100/70 via-rose-50 to-pink-100/50 flex items-center justify-center">
        {/* Shimmer overlay */}
        <div className="absolute inset-0 -translate-x-full animate-luxury-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

        {/* Floating feather watermark in center */}
        <div className="flex flex-col items-center justify-center gap-1.5 opacity-60">
          <div className="w-12 h-12 rounded-2xl bg-white/70 shadow-sm flex items-center justify-center text-[#ff2a85] animate-pulse">
            <Feather className="w-6 h-6 stroke-[1.75]" />
          </div>
          <span className="text-[10px] font-black tracking-wider uppercase bg-gradient-to-r from-pink-600 to-amber-600 bg-clip-text text-transparent">
            FEAT Fashion
          </span>
        </div>

        {/* Top Badges Skeletons */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          <div className="w-16 h-5 rounded-lg bg-pink-300/40 animate-pulse" />
        </div>

        {/* Heart Wishlist button placeholder */}
        <div className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/80 shadow-xs border border-pink-200/60 flex items-center justify-center" />
      </div>

      {/* Product Content Details Skeleton */}
      <div className="p-3 sm:p-3.5 flex flex-col flex-grow justify-between gap-2.5">
        {/* Color variants preview dots */}
        <div className="flex items-center gap-1.5 py-0.5">
          <div className="w-3.5 h-3.5 rounded-full bg-pink-200 animate-pulse" />
          <div className="w-3.5 h-3.5 rounded-full bg-amber-200 animate-pulse" />
          <div className="w-3.5 h-3.5 rounded-full bg-rose-200 animate-pulse" />
        </div>

        {/* Title skeleton - 2 lines */}
        <div className="space-y-1.5">
          <div
            className={`h-3.5 rounded-md animate-pulse ${
              isDark ? 'bg-amber-100/30' : 'bg-pink-950/15'
            } w-4/5`}
          />
          <div
            className={`h-3 rounded-md animate-pulse ${
              isDark ? 'bg-amber-100/20' : 'bg-pink-950/10'
            } w-3/5`}
          />
        </div>

        {/* Genuine Rating line */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-sm bg-amber-200/70 animate-pulse"
              />
            ))}
          </div>
          <div className="w-8 h-2.5 rounded bg-gray-200 animate-pulse" />
        </div>

        {/* Price & Cart row */}
        <div className="pt-2 border-t border-pink-100/60 flex items-center justify-between gap-2">
          <div className="space-y-1">
            <div
              className={`h-4 rounded-md animate-pulse ${
                isDark ? 'bg-amber-300/40' : 'bg-pink-600/30'
              } w-16`}
            />
            <div className="h-2.5 rounded bg-gray-200 animate-pulse w-10" />
          </div>

          {/* Add to Cart button skeleton */}
          <div className="w-20 h-7 rounded-xl bg-gradient-to-r from-pink-400/30 to-amber-400/30 animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export const ProductGridSkeleton: React.FC<{
  count?: number;
  title?: string;
}> = ({ count = 10, title = 'Curating Royal Handcrafted Ethnic Attires...' }) => {
  return (
    <div className="space-y-4">
      {/* Eye-Catching Luxury Shimmer Announcement Banner */}
      <div className="rounded-2xl p-[1.5px] bg-gradient-to-r from-[#ff2a85] via-amber-300 to-[#e51975] shadow-md shadow-pink-500/10 overflow-hidden">
        <div className="bg-white/95 backdrop-blur-md px-4 py-3 rounded-[15px] flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-pink-900">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-pink-100 text-[#ff2a85] animate-spin">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs sm:text-sm font-extrabold font-serif tracking-wide bg-gradient-to-r from-[#ff2a85] via-pink-900 to-amber-700 bg-clip-text text-transparent">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold text-pink-700 bg-pink-50 px-3 py-1 rounded-full border border-pink-200/80">
            <span className="w-2 h-2 rounded-full bg-[#ff2a85] animate-ping" />
            <span>Loading Feat products</span>
          </div>
        </div>
      </div>

      {/* Grid of Shimmer Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {[...Array(count)].map((_, i) => (
          <ProductCardSkeleton key={`skeleton-${i}`} />
        ))}
      </div>
    </div>
  );
};

export const FeaturedCollectionSkeleton: React.FC<{
  count?: number;
}> = ({ count = 5 }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-amber-200 text-xs font-bold px-1">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        <span>Loading exclusive designer collection items...</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {[...Array(count)].map((_, i) => (
          <ProductCardSkeleton key={`col-skel-${i}`} isDark={true} />
        ))}
      </div>
    </div>
  );
};
