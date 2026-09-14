import React, { useState, useEffect, useMemo } from 'react';
import { Flame, ChevronLeft, ChevronRight, AlertCircle, ArrowRight } from 'lucide-react';
import { Product } from '../types';

interface FastFinishingStockBannerProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export const FastFinishingStockBanner: React.FC<FastFinishingStockBannerProps> = ({
  products,
  onSelectProduct
}) => {
  // Find all items on the website that are in short stock (1 to 5 pieces remaining)
  const shortStockProducts = useMemo(() => {
    return products.filter((p) => {
      const total = (p.sizeStock && Object.keys(p.sizeStock).length > 0)
        ? Object.values(p.sizeStock).reduce((sum, v) => sum + (Number(v) || 0), 0)
        : Number(p.stockCount || 0);
      return total > 0 && total <= 5;
    });
  }, [products]);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-cycle through short stock items if there are multiple
  useEffect(() => {
    if (shortStockProducts.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % shortStockProducts.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [shortStockProducts.length]);

  if (shortStockProducts.length === 0) {
    return null;
  }

  const activeProduct = shortStockProducts[currentIndex % shortStockProducts.length];
  const activeStock = (activeProduct.sizeStock && Object.keys(activeProduct.sizeStock).length > 0)
    ? Object.values(activeProduct.sizeStock).reduce((sum, v) => sum + (Number(v) || 0), 0)
    : Number(activeProduct.stockCount || 0);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + shortStockProducts.length) % shortStockProducts.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % shortStockProducts.length);
  };

  return (
    <div
      id="fast-finishing-stock-alert-banner"
      className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-neutral-950 py-2 px-3 sm:px-4 relative z-30 shadow-md border-b border-amber-300 overflow-hidden"
    >
      {/* Background Subtle Shimmer */}
      <div className="absolute inset-0 bg-white/10 pointer-events-none animate-pulse" />

      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm font-extrabold relative z-10">
        
        {/* Left Icon & Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1 bg-black text-amber-300 text-[10px] sm:text-xs font-black uppercase px-2.5 py-1 rounded-full shadow-xs tracking-wider">
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-bounce shrink-0" />
            <span>URGENT</span>
          </span>
        </div>

        {/* Center: Exact Required Message */}
        <div
          onClick={() => onSelectProduct(activeProduct)}
          className="flex-1 min-w-0 text-center cursor-pointer group flex items-center justify-center gap-2"
          title={`Click to view ${activeProduct.name}`}
        >
          <span className="text-white drop-shadow-sm font-black text-xs sm:text-sm truncate">
            Fast finishing stock: only <strong className="text-yellow-200 underline decoration-yellow-300 decoration-2 font-black">{activeStock} {activeStock === 1 ? 'piece' : 'pieces'}</strong> left in <span className="text-white underline decoration-white/60 group-hover:text-yellow-200 transition-colors">{activeProduct.name}</span>
          </span>
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-black bg-black/30 hover:bg-black/50 text-white px-2.5 py-0.5 rounded-full transition-colors shrink-0">
            <span>Shop Now</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>

        {/* Right: Controls if multiple short products */}
        <div className="flex items-center gap-1.5 shrink-0">
          {shortStockProducts.length > 1 && (
            <div className="flex items-center gap-1 bg-black/20 rounded-full p-0.5 text-white">
              <button
                onClick={handlePrev}
                className="p-1 hover:bg-black/30 rounded-full transition-colors active:scale-90"
                aria-label="Previous low stock item"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-bold px-1 select-none">
                {currentIndex + 1}/{shortStockProducts.length}
              </span>
              <button
                onClick={handleNext}
                className="p-1 hover:bg-black/30 rounded-full transition-colors active:scale-90"
                aria-label="Next low stock item"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
