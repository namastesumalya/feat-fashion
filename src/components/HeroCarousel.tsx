import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BannerSlide } from '../types';

interface HeroCarouselProps {
  banners?: BannerSlide[];
  onSelectCollection: (collection: string) => void;
  onSelectCategory: (category: string) => void;
  onNavigate?: (path: string) => void;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  banners = [],
  onSelectCollection,
  onSelectCategory,
  onNavigate,
}) => {
  const slides = banners;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Intelligent fallback to match authentic visual if image endpoint fails or is cold
  const getAuthenticBannerImage = (slide: BannerSlide): string => {
    const t = (slide.title || '').toLowerCase();
    const d = (slide.description || '').toLowerCase();
    const tag = (slide.tag || '').toLowerCase();
    const combined = `${t} ${d} ${tag}`;

    if (combined.includes('dress') || combined.includes('denim') || combined.includes('wrap')) {
      return '/dealmangemore.jpeg';
    }
    if (combined.includes('kashmiri') || combined.includes('embroidery') || combined.includes('kashida')) {
      return '/firdausi.jpeg';
    }
    if (combined.includes('chikankari') || combined.includes('suit') || combined.includes('whitework')) {
      return '/suit.jpeg';
    }
    if (combined.includes('tant') || combined.includes('bengal') || combined.includes('handloom') || combined.includes('saree') || combined.includes('six yards')) {
      return '/saree.jpeg';
    }
    if (combined.includes('comfort') || combined.includes('curve') || combined.includes('kurti')) {
      return '/kurti.jpeg';
    }
    return '/saree.jpeg';
  };

  // Keep currentIndex in bounds when banners list updates
  useEffect(() => {
    if (currentIndex >= slides.length && slides.length > 0) {
      setCurrentIndex(0);
    }
  }, [slides.length, currentIndex]);

  const nextSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setCurrentIndex((prev) => (prev >= slides.length - 1 ? 0 : prev + 1));
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  }, [slides.length]);

  // Auto-carousel timer (5 seconds)
  useEffect(() => {
    if (isHovered || slides.length <= 1) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(timer);
  }, [nextSlide, isHovered, slides.length]);

  const handleCtaClick = (slide: BannerSlide) => {
    // 1. If custom ctaLink is provided by admin in Firestore
    if (slide.ctaLink && slide.ctaLink.trim()) {
      const link = slide.ctaLink.trim();
      
      // External link or absolute URL
      if (link.startsWith('http://') || link.startsWith('https://')) {
        try {
          const parsed = new URL(link);
          if (parsed.hostname.includes('featherhutfashion.com') || parsed.hostname === window.location.hostname) {
            const internalPath = parsed.pathname + parsed.search + parsed.hash;
            const lower = internalPath.toLowerCase();
            if (lower.includes('kurti')) onSelectCategory('Kurti');
            else if (lower.includes('sharee') || lower.includes('saree')) onSelectCategory('Sharee');
            else if (lower.includes('dress-material') || lower.includes('dress material')) onSelectCategory('Dress Materials');
            else if (lower.includes('indo-western') || lower.includes('indo western')) onSelectCategory('Indo Western dress');
            else if (lower.includes('suit')) onSelectCategory('Suit');

            if (onNavigate) {
              onNavigate(internalPath);
            }
            setTimeout(() => {
              const target = document.getElementById('fashion-categories-section') || document.getElementById('products-grid');
              if (target) target.scrollIntoView({ behavior: 'smooth' });
            }, 150);
            return;
          }
        } catch (_) {}

        window.open(link, '_blank', 'noopener,noreferrer');
        return;
      }
      
      // Anchor link on same page
      if (link.startsWith('#')) {
        const target = document.getElementById(link.replace('#', ''));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }

      // Internal page route or category query
      if (onNavigate) {
        onNavigate(link);
      }

      // Check if it corresponds to category or collection
      const lower = link.toLowerCase();
      if (lower.includes('kurti')) onSelectCategory('Kurti');
      else if (lower.includes('sharee') || lower.includes('saree')) onSelectCategory('Sharee');
      else if (lower.includes('dress-material') || lower.includes('dress material')) onSelectCategory('Dress Materials');
      else if (lower.includes('indo-western') || lower.includes('indo western')) onSelectCategory('Indo Western dress');
      else if (lower.includes('suit')) onSelectCategory('Suit');

      setTimeout(() => {
        const target = document.getElementById('fashion-categories-section') || document.getElementById('products-grid');
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      }, 150);
      return;
    }

    // 2. Collection or Category based destination
    if (slide.targetCollection && slide.targetCollection !== 'All') {
      onSelectCollection(slide.targetCollection);
    }
    if (slide.targetCategory && slide.targetCategory !== 'All') {
      onSelectCategory(slide.targetCategory);
    }

    if (onNavigate) onNavigate('/');
    setTimeout(() => {
      const target = document.getElementById('fashion-categories-section') || document.getElementById('products-grid');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  // If no banners loaded from Firestore, do not render mock or empty frame
  if (!slides || slides.length === 0) {
    return null;
  }

  const scrollToExplore = () => {
    const target = document.getElementById('fashion-categories-section') || document.getElementById('products-grid');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const activeSlide = slides[currentIndex] || slides[0];

  return (
    <section 
      id="hero-banner-section"
      className="relative w-full aspect-[16/9] min-h-[440px] sm:min-h-[500px] md:min-h-[580px] lg:min-h-[640px] max-h-[85vh] overflow-hidden select-none bg-neutral-950 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 1. Full-size Background Image with Fade In and Out Cross-fade Animation */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <AnimatePresence mode="sync">
          <motion.div
            key={`bg-${activeSlide.id}-${currentIndex}`}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 1.0, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute inset-0 w-full h-full"
          >
            {activeSlide.image ? (
              <img
                src={activeSlide.image}
                alt={activeSlide.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
                onError={(e) => {
                  const fallback = getAuthenticBannerImage(activeSlide);
                  const target = e.currentTarget;
                  if (target.src !== fallback && !target.src.endsWith(fallback)) {
                    target.src = fallback;
                  }
                }}
              />
            ) : (
              <img
                src={getAuthenticBannerImage(activeSlide)}
                alt={activeSlide.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 2. Cinematic Gradient Overlays (Ensures high contrast legibility exactly like herobanner.png) */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-black/20 pointer-events-none z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none z-10" />

      {/* 3. Left & Right Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 bg-black/35 hover:bg-black/75 text-white/80 hover:text-amber-300 p-2.5 sm:p-3.5 rounded-full border border-white/20 backdrop-blur-md transition-all active:scale-90 hover:scale-105 shadow-2xl opacity-60 hover:opacity-100 flex items-center justify-center cursor-pointer"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 bg-black/35 hover:bg-black/75 text-white/80 hover:text-amber-300 p-2.5 sm:p-3.5 rounded-full border border-white/20 backdrop-blur-md transition-all active:scale-90 hover:scale-105 shadow-2xl opacity-60 hover:opacity-100 flex items-center justify-center cursor-pointer"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
          </button>
        </>
      )}

      {/* 4. Text Content & Controls Overlay Over Background Image */}
      <div className="relative z-20 w-full h-full max-w-7xl mx-auto px-6 sm:px-12 md:px-16 lg:px-20 py-8 sm:py-12 md:py-16 flex flex-col justify-between">
        
        {/* Spacer top */}
        <div className="hidden sm:block h-2" />

        {/* Center Text Block: Eyebrow, Main Serif Heading, Description, Pill CTA */}
        <div className="my-auto max-w-xl sm:max-w-2xl lg:max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={`content-${activeSlide.id}-${currentIndex}`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="space-y-4 sm:space-y-6"
            >
              {/* Eyebrow / Tagline with thin gold line matching herobanner.png */}
              <div className="flex items-center gap-3">
                <span className="w-6 sm:w-10 h-[2px] bg-amber-400 inline-block shrink-0" />
                <span className="text-amber-300 font-bold text-xs sm:text-sm tracking-[0.22em] uppercase font-sans">
                  {activeSlide.tag || 'NEW ARRIVAL SPOTLIGHT'}
                </span>
              </div>

              {/* Main Heading: Large, luxurious serif typography matching herobanner.png */}
              <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-white leading-[1.12] drop-shadow-lg">
                {activeSlide.title}
              </h1>

              {/* Description Paragraph */}
              {activeSlide.description && (
                <p className="text-sm sm:text-base md:text-lg text-white/85 max-w-xl sm:max-w-2xl font-light leading-relaxed drop-shadow-sm font-sans">
                  {activeSlide.description}
                </p>
              )}

              {/* Pill CTA Button matching herobanner.png (white pill with dark text & arrow) */}
              <div className="pt-2 sm:pt-4">
                <button
                  type="button"
                  onClick={() => handleCtaClick(activeSlide)}
                  className="bg-white hover:bg-neutral-100 text-neutral-950 font-bold px-7 sm:px-9 py-3 sm:py-3.5 rounded-full text-xs sm:text-sm tracking-widest uppercase shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-3 cursor-pointer group/cta"
                >
                  <span>{activeSlide.ctaText || 'Shop Now'}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover/cta:translate-x-1" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 5. Bottom Navigation Bar: Progress Dashes (Left) & Scroll to Explore (Right) */}
        <div className="flex items-end justify-between w-full pt-4">
          
          {/* Bottom Left: Slide Dash Indicators matching herobanner.png */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {slides.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`h-[3px] rounded-full transition-all duration-500 cursor-pointer ${
                  currentIndex === idx
                    ? 'w-8 sm:w-12 bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]'
                    : 'w-4 sm:w-6 bg-white/40 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Bottom Right: Scroll to Explore matching herobanner.png */}
          <button
            type="button"
            onClick={scrollToExplore}
            className="hidden sm:flex flex-col items-center gap-1.5 text-[9px] sm:text-[11px] tracking-[0.28em] uppercase text-white/70 hover:text-amber-300 transition-colors font-sans cursor-pointer group"
          >
            <span>SCROLL TO EXPLORE</span>
            <ChevronDown className="w-3.5 h-3.5 text-amber-400 group-hover:translate-y-1 transition-transform animate-bounce" />
          </button>

        </div>

      </div>
    </section>
  );
};
