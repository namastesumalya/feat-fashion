import React from 'react';
import { Plus, Sparkles, ArrowDown, ChevronDown } from 'lucide-react';

interface LoadMoreSkeletonCardProps {
  onLoadMore: () => void;
  remainingCount?: number;
  batchSize?: number;
  theme?: 'light' | 'dark';
}

export const LoadMoreSkeletonCard: React.FC<LoadMoreSkeletonCardProps> = ({
  onLoadMore,
  remainingCount,
  batchSize = 10,
  theme = 'light'
}) => {
  const isDark = theme === 'dark';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onLoadMore}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onLoadMore();
        }
      }}
      className={`rounded-2xl transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col justify-between relative border-2 border-dashed ${
        isDark
          ? 'bg-white/5 border-amber-300/40 hover:border-amber-300 hover:bg-white/10 hover:shadow-xl hover:shadow-amber-500/10'
          : 'bg-gradient-to-b from-pink-50/60 via-white to-pink-50/70 border-pink-300/80 hover:border-[#ff2a85] hover:bg-pink-50/90 hover:shadow-xl hover:shadow-pink-500/15'
      } hover:-translate-y-1 focus:outline-hidden focus:ring-2 focus:ring-[#ff2a85] text-left select-none`}
      aria-label={`Load more ${batchSize} products`}
    >
      {/* Top Simulated Image Box with Animated Pulsing Skeleton + Action Prompt */}
      <div className={`relative aspect-[3/4] overflow-hidden flex flex-col items-center justify-center p-4 text-center ${
        isDark ? 'bg-black/30' : 'bg-pink-100/40'
      }`}>
        {/* Shimmer / Pulse Skeleton Lines in Background */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent animate-pulse opacity-60" />

        {/* Floating Skeleton Pill at top */}
        <div className="absolute top-2.5 right-2.5">
          <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
            isDark ? 'bg-amber-400 text-pink-950 shadow-md' : 'bg-[#ff2a85] text-white shadow-xs'
          }`}>
            <Sparkles className="w-2.5 h-2.5" />
            <span>+{batchSize} More</span>
          </div>
        </div>

        {/* Central Clickable Trigger Circle */}
        <div className="relative z-10 flex flex-col items-center gap-2 group-hover:scale-105 transition-transform duration-300">
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${
            isDark
              ? 'bg-amber-400 text-pink-950 group-hover:bg-amber-300 group-hover:shadow-amber-400/40'
              : 'bg-gradient-to-r from-[#ff2a85] to-[#e51975] text-white group-hover:from-pink-600 group-hover:to-pink-700 group-hover:shadow-pink-500/30'
          }`}>
            <Plus className="w-6 h-6 sm:w-7 sm:h-7 stroke-[3] group-hover:rotate-90 transition-transform duration-300" />
          </div>

          <div className="space-y-0.5 mt-1">
            <span className={`block text-xs sm:text-sm font-black tracking-tight ${
              isDark ? 'text-amber-200' : 'text-pink-950'
            }`}>
              Load More
            </span>
            <span className={`block text-[10px] sm:text-[11px] font-bold ${
              isDark ? 'text-amber-300/80' : 'text-pink-600'
            }`}>
              Click to reveal next {batchSize}
            </span>
          </div>
        </div>

        {/* Bottom subtle indicator */}
        <div className="absolute bottom-2 inset-x-2 flex items-center justify-center gap-1">
          <ChevronDown className={`w-3.5 h-3.5 animate-bounce ${isDark ? 'text-amber-300' : 'text-[#ff2a85]'}`} />
          {remainingCount !== undefined && remainingCount > 0 && (
            <span className={`text-[10px] font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {remainingCount} items remaining
            </span>
          )}
        </div>
      </div>

      {/* Simulated Product Details Skeleton Footer */}
      <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
        <div>
          {/* Skeleton Category Bar */}
          <div className="flex items-center justify-between mb-2">
            <div className={`h-2.5 w-16 rounded-full animate-pulse ${isDark ? 'bg-white/20' : 'bg-pink-200'}`} />
            <div className={`h-2.5 w-10 rounded-full animate-pulse ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
          </div>

          {/* Skeleton Title Lines */}
          <div className="space-y-1.5">
            <div className={`h-3 w-4/5 rounded-sm animate-pulse ${isDark ? 'bg-white/20' : 'bg-gray-200'}`} />
            <div className={`h-3 w-3/5 rounded-sm animate-pulse ${isDark ? 'bg-white/15' : 'bg-gray-150 bg-gray-100'}`} />
          </div>
        </div>

        <div className="pt-2">
          {/* Skeleton Rating / Tags */}
          <div className="flex items-center gap-1.5 mb-2">
            <div className={`h-2 w-12 rounded-full animate-pulse ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
            <div className={`h-2 w-8 rounded-full animate-pulse ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
          </div>

          {/* Simulated Bottom Price & Action Button */}
          <div className="flex items-center justify-between pt-2 border-t border-dashed border-gray-200/50">
            <div className="space-y-1">
              <div className={`h-3.5 w-14 rounded-sm animate-pulse ${isDark ? 'bg-amber-400/40' : 'bg-pink-300/60'}`} />
            </div>
            <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
              isDark
                ? 'bg-white/15 text-amber-200 group-hover:bg-amber-400 group-hover:text-pink-950'
                : 'bg-pink-100 text-[#ff2a85] group-hover:bg-[#ff2a85] group-hover:text-white'
            } transition-colors`}>
              <span>Show</span>
              <ArrowDown className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
