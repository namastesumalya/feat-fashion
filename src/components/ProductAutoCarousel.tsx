import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Crown, Radio, Flame, ArrowRight } from 'lucide-react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { deduplicateProducts } from '../utils/productUtils';

interface ProductAutoCarouselProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeType?: 'live' | 'new' | 'hot';
  products: Product[];
  onSelectProduct: (p: Product) => void;
  onAddToCart: (p: Product, size: string, e: React.MouseEvent) => void;
  wishlist: Product[];
  onToggleWishlist: (p: Product, e: React.MouseEvent) => void;
  onViewAll?: () => void;
  speedMs?: number; // interval speed in ms (default 3000)
}

export const ProductAutoCarousel: React.FC<ProductAutoCarouselProps> = ({
  title,
  subtitle,
  badgeText,
  badgeType = 'new',
  products,
  onSelectProduct,
  onAddToCart,
  wishlist,
  onToggleWishlist,
  onViewAll,
  speedMs = 3000,
}) => {
  const desktopScrollContainerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  
  // Mobile smooth 1-by-1 sliding carousel state
  const [mobileIndex, setMobileIndex] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);
  const touchStartXRef = useRef<number | null>(null);
  const touchDeltaXRef = useRef<number>(0);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const cleanProducts = useMemo(() => deduplicateProducts(products), [products]);
  const productCount = cleanProducts.length;

  // Cloned items for infinite smooth gliding: [...cleanProducts, first2Items]
  const extendedProducts = productCount >= 2 
    ? [...cleanProducts, cleanProducts[0], cleanProducts[1]]
    : cleanProducts;

  // Handle step forward (mobile)
  const handleMobileNext = useCallback(() => {
    if (productCount <= 1) return;
    setEnableTransition(true);
    setMobileIndex((prev) => prev + 1);
  }, [productCount]);

  // Handle step backward (mobile)
  const handleMobilePrev = useCallback(() => {
    if (productCount <= 1) return;
    if (mobileIndex === 0) {
      // Instantly jump to the end clone without transition, then smoothly slide back to productCount - 1
      setEnableTransition(false);
      setMobileIndex(productCount);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setEnableTransition(true);
          setMobileIndex(productCount - 1);
        });
      });
    } else {
      setEnableTransition(true);
      setMobileIndex((prev) => prev - 1);
    }
  }, [mobileIndex, productCount]);

  // When transition ends on clone index (productCount), silently snap back to 0 without animation
  const handleTransitionEnd = () => {
    if (mobileIndex >= productCount) {
      setEnableTransition(false);
      setMobileIndex(0);
    }
  };

  // Auto-play loop for mobile and desktop
  useEffect(() => {
    if (isHovered || isTouched || productCount <= 1) return;

    autoPlayTimerRef.current = setInterval(() => {
      // 1. Mobile smooth single-item reveal shift
      handleMobileNext();

      // 2. Desktop smooth horizontal list scroll
      if (desktopScrollContainerRef.current) {
        const container = desktopScrollContainerRef.current;
        const cardWidth = 280;
        const maxScrollLeft = container.scrollWidth - container.clientWidth;

        if (container.scrollLeft >= maxScrollLeft - 10) {
          container.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          container.scrollBy({ left: cardWidth, behavior: 'smooth' });
        }
      }
    }, speedMs);

    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
    };
  }, [isHovered, isTouched, productCount, speedMs, handleMobileNext]);

  // Desktop manual navigation
  const handleDesktopScrollLeft = () => {
    if (desktopScrollContainerRef.current) {
      desktopScrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const handleDesktopScrollRight = () => {
    if (desktopScrollContainerRef.current) {
      const container = desktopScrollContainerRef.current;
      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      if (container.scrollLeft >= maxScrollLeft - 10) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: 300, behavior: 'smooth' });
      }
    }
  };

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsTouched(true);
    touchStartXRef.current = e.touches[0].clientX;
    touchDeltaXRef.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    touchDeltaXRef.current = e.touches[0].clientX - touchStartXRef.current;
  };

  const handleTouchEnd = () => {
    const delta = touchDeltaXRef.current;
    if (delta < -35) {
      handleMobileNext();
    } else if (delta > 35) {
      handleMobilePrev();
    }
    touchStartXRef.current = null;
    touchDeltaXRef.current = 0;
    // Resume auto play after brief delay
    setTimeout(() => setIsTouched(false), 2000);
  };

  if (!products || products.length === 0) return null;

  // Active dot index (modulo product count)
  const activeDotIndex = mobileIndex % productCount;

  return (
    <section 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-pink-50/90 via-white to-pink-50/80 border border-pink-200/90 shadow-md p-3.5 sm:p-6 transition-all my-4 sm:my-6"
    >
      {/* Decorative background glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-pink-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-300/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Row */}
      <div className="relative z-10 flex items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4 pb-2.5 sm:pb-3 border-b border-pink-100">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Badge Icon */}
          {badgeType === 'live' ? (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#ff2a85] via-rose-600 to-[#db2777] text-white flex items-center justify-center shadow-md animate-pulse shrink-0">
              <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
          ) : badgeType === 'hot' ? (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200" />
            </div>
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#ff2a85] via-pink-600 to-pink-900 text-amber-200 flex items-center justify-center shadow-md shrink-0">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h2 className="text-base sm:text-xl font-black text-pink-950 font-serif tracking-tight">
                {title}
              </h2>
              {badgeText && (
                <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 sm:px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1 ${
                  badgeType === 'live'
                    ? 'bg-rose-600 text-white animate-pulse'
                    : badgeType === 'hot'
                    ? 'bg-amber-500 text-pink-950'
                    : 'bg-pink-900 text-amber-300'
                }`}>
                  {badgeType === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                  <span>{badgeText}</span>
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-0.5 line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Carousel Controls & View All (Desktop header controls) */}
        <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="flex items-center gap-1 text-[11px] sm:text-xs text-pink-900 hover:text-pink-950 font-extrabold hover:underline mr-1 sm:mr-2"
            >
              <span>Explore All</span>
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          )}

          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={handleDesktopScrollLeft}
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white hover:bg-pink-100 text-pink-950 border border-pink-200 shadow-xs transition-all hover:scale-105 active:scale-95"
              aria-label="Previous Products"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={handleDesktopScrollRight}
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-pink-900 hover:bg-pink-800 text-amber-200 border border-pink-900 shadow-xs transition-all hover:scale-105 active:scale-95"
              aria-label="Next Products"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE VIEW: Premium Continuous Gliding Carousel (2 visible items, left item moves out to smoothly reveal right item) */}
      <div 
        className="block sm:hidden py-1"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative flex items-center">
          
          {/* Left Arrow Button Overlay */}
          <button
            type="button"
            onClick={handleMobilePrev}
            className="absolute -left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 text-pink-950 border border-pink-200/90 shadow-md flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Previous Item"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Viewport Window for 2 Items */}
          <div className="w-full overflow-hidden px-1">
            <div 
              onTransitionEnd={handleTransitionEnd}
              className="flex gap-2.5"
              style={{
                transform: `translateX(calc(-${mobileIndex} * (50% + 5px)))`,
                transition: enableTransition 
                  ? 'transform 650ms cubic-bezier(0.25, 1, 0.35, 1)' 
                  : 'none',
                willChange: 'transform'
              }}
            >
              {extendedProducts.map((product, idx) => {
                const isWishlisted = wishlist.some((w) => w.id === product.id);

                return (
                  <div 
                    key={`${product.id}-${idx}`}
                    className="w-[calc(50%-5px)] shrink-0 select-none"
                  >
                    <ProductCard
                      product={product}
                      onSelect={onSelectProduct}
                      onAddToCart={onAddToCart}
                      isWishlisted={isWishlisted}
                      onToggleWishlist={onToggleWishlist}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Arrow Button Overlay */}
          <button
            type="button"
            onClick={handleMobileNext}
            className="absolute -right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-pink-950/95 text-amber-200 border border-pink-900 shadow-md flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Next Item"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Mobile Page Dots Indicator */}
        {productCount > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {Array.from({ length: Math.min(productCount, 8) }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setEnableTransition(true);
                  setMobileIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === (activeDotIndex % Math.min(productCount, 8))
                    ? 'w-5 bg-pink-900'
                    : 'w-1.5 bg-pink-200 hover:bg-pink-300'
                }`}
                aria-label={`Go to item ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Mobile Explore All Button Under Section */}
        {onViewAll && (
          <div className="mt-3 pt-2.5 border-t border-pink-100/80">
            <button
              type="button"
              onClick={onViewAll}
              className="w-full py-2.5 px-4 rounded-xl bg-pink-950 hover:bg-pink-900 text-amber-200 font-extrabold text-xs shadow-sm flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <span>Explore All {title}</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
            </button>
          </div>
        )}
      </div>

      {/* DESKTOP VIEW: Side-by-Side Product Horizontal Auto Carousel */}
      <div
        ref={desktopScrollContainerRef}
        className="hidden sm:flex gap-4 overflow-x-auto scrollbar-none scroll-smooth py-1 px-0.5 select-none"
      >
        {cleanProducts.map((product, idx) => {
          const isWishlisted = wishlist.some((w) => w.id === product.id);

          return (
            <div
              key={`${product.id}-${idx}`}
              className="w-[250px] md:w-[275px] shrink-0 transition-transform duration-300"
            >
              <ProductCard
                product={product}
                onSelect={onSelectProduct}
                onAddToCart={onAddToCart}
                isWishlisted={isWishlisted}
                onToggleWishlist={onToggleWishlist}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
};
