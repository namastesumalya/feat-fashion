import React, { useState, useMemo, useEffect } from 'react';
import { Product, CollectionType } from '../types';
import { ProductCard } from './ProductCard';
import { LoadMoreSkeletonCard } from './LoadMoreSkeletonCard';
import { CatalogFilterBar } from './CatalogFilterBar';
import { deduplicateProducts } from '../utils/productUtils';
import { 
  ArrowLeft, Filter, Crown, 
  Layers, Gift, Check, Flame, ShoppingBag, ShieldCheck, Search,
  ChevronDown, ChevronUp, ArrowRight
} from 'lucide-react';

export interface CollectionPageConfig {
  slug: string;
  collectionValue: CollectionType;
  title: string;
  subtitle: string;
  badge: string;
  heroImage: string;
  description: string;
  accentGradient: string;
}

export const EXCLUSIVE_COLLECTION_CONFIGS: Record<string, CollectionPageConfig> = {
  jashn: {
    slug: 'jashn',
    collectionValue: 'Jashn Collection',
    title: 'Jashn Royal Collection',
    subtitle: 'Grand Festive Couture & Regal Wedding Glamour',
    badge: 'Royal Festive Couture',
    heroImage: '/jashn.jpeg',
    description: 'Celebrate life’s grandest occasions with pure golden zari work, heavy resham embroidery, intricate gota patti embellishments, pure dupioni silks, and rich celebratory hues.',
    accentGradient: 'from-amber-950 via-pink-900 to-amber-900'
  },
  firdausi: {
    slug: 'firdausi',
    collectionValue: 'Firdausi collection',
    title: 'Firdausi Royal Silk Collection',
    subtitle: 'Royal Chanderi Weaves & Ethereal Gold Foil Zari',
    badge: 'Royal Handlooms & Gold Zari',
    heroImage: '/firdausi.jpeg',
    description: 'Named after the celestial garden of paradise, Firdausi features lightweight handloom Chanderi sets, delicate pastel palettes, and royal metallic zari work.',
    accentGradient: 'from-amber-900 via-pink-950 to-purple-950'
  },
  '9-to-fivers': {
    slug: '9-to-fivers',
    collectionValue: '9 to fivers collection',
    title: '9 to Fivers Collection',
    subtitle: 'Everyday Workwear & All-Day Breathable Cotton Chic',
    badge: 'Daily & Office Chic',
    heroImage: '/9tofivers.jpeg',
    description: 'Effortless corporate chic crafted from breathable pure Mulmul and soft cotton blends. Designed for boardroom confidence and commute comfort.',
    accentGradient: 'from-[#ff2a85] via-pink-600 to-rose-600'
  },
  'deal-maange-more': {
    slug: 'deal-maange-more',
    collectionValue: "'Deal maange more' Collection",
    title: 'Deal Maange More',
    subtitle: 'Unbeatable Festive Steals & Mega Discount Highlights',
    badge: 'Mega Steals & Flash Deals',
    heroImage: '/dealmangemore.jpeg',
    description: 'Premium craftsmanship at unmatched prices. Explore jaw-dropping festive deals, high-value combo sets, and flash clearance pieces.',
    accentGradient: 'from-pink-600 via-rose-500 to-pink-700'
  },
  'present-is-gifted': {
    slug: 'present-is-gifted',
    collectionValue: "'Present is Gifted' Collection",
    title: 'Present is Gifted',
    subtitle: 'Luxury Gift Ready Hampers & Elegantly Boxed Apparel',
    badge: 'Luxury Hampers',
    heroImage: '/Presentisgifted.jpeg',
    description: 'Curated apparel sets packaged in signature luxury gift boxes. Perfect for weddings, birthdays, festive returns, and honoring loved ones.',
    accentGradient: 'from-fuchsia-600 via-pink-600 to-rose-600'
  },
  'gift-is-present': {
    slug: 'present-is-gifted',
    collectionValue: "'Present is Gifted' Collection",
    title: 'Present is Gifted',
    subtitle: 'Luxury Gift Ready Hampers & Elegantly Boxed Apparel',
    badge: 'Luxury Hampers',
    heroImage: '/Presentisgifted.jpeg',
    description: 'Curated apparel sets packaged in signature luxury gift boxes. Perfect for weddings, birthdays, festive returns, and honoring loved ones.',
    accentGradient: 'from-fuchsia-600 via-pink-600 to-rose-600'
  }
};

interface CollectionExplorePageProps {
  collectionSlug: string;
  products: Product[];
  onBackToHome: () => void;
  onSelectProduct: (p: Product) => void;
  onAddToCart: (p: Product, size: string, e: React.MouseEvent) => void;
  wishlist: Product[];
  onToggleWishlist: (p: Product, e: React.MouseEvent) => void;
  onNavigateCollection: (slug: string) => void;
}

export const CollectionExplorePage: React.FC<CollectionExplorePageProps> = ({
  collectionSlug,
  products,
  onBackToHome,
  onSelectProduct,
  onAddToCart,
  wishlist,
  onToggleWishlist,
  onNavigateCollection
}) => {
  // Normalize slug
  const cleanSlug = collectionSlug.replace(/^\//, '').toLowerCase();
  const config = EXCLUSIVE_COLLECTION_CONFIGS[cleanSlug] || EXCLUSIVE_COLLECTION_CONFIGS.jashn;

  // Sorting & Sub-filter states
  const [sortBy, setSortBy] = useState<'featured' | 'priceLowHigh' | 'priceHighLow' | 'discount'>('featured');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [priceRange, setPriceRange] = useState<string>('All');

  // Filter products for this exclusive collection
  const collectionProducts = useMemo(() => {
    return products.filter(p => {
      if (!p.collection) return false;
      const targetVal = config.collectionValue.toLowerCase().trim();
      const prodVal = p.collection.toLowerCase().trim();

      if (cleanSlug === 'deal-maange-more') {
        return prodVal.includes('deal') || prodVal.includes('maange');
      }
      if (cleanSlug === 'present-is-gifted' || cleanSlug === 'gift-is-present') {
        return prodVal.includes('gift') || prodVal.includes('present');
      }
      if (cleanSlug === '9-to-fivers') {
        return prodVal.includes('9') || prodVal.includes('five');
      }
      return prodVal === targetVal || prodVal.includes(targetVal);
    });
  }, [products, config, cleanSlug]);

  // Available Categories inside this collection
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    collectionProducts.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return ['All', ...Array.from(cats)];
  }, [collectionProducts]);

  // Filtered & Sorted items
  const filteredProducts = useMemo(() => {
    let result = [...collectionProducts];

    if (selectedCategoryFilter !== 'All') {
      result = result.filter(p => p.category?.toLowerCase() === selectedCategoryFilter.toLowerCase());
    }

    if (priceRange !== 'All') {
      if (priceRange === 'under999') result = result.filter(p => p.price < 999);
      else if (priceRange === '999-1999') result = result.filter(p => p.price >= 999 && p.price <= 1999);
      else if (priceRange === 'above1999') result = result.filter(p => p.price > 1999);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'priceLowHigh') return a.price - b.price;
      if (sortBy === 'priceHighLow') return b.price - a.price;
      if (sortBy === 'discount') return (b.discountPercent || 0) - (a.discountPercent || 0);
      return (b.ratingCount || 0) - (a.ratingCount || 0);
    });

    return deduplicateProducts(result);
  }, [collectionProducts, selectedCategoryFilter, priceRange, sortBy]);

  // Progressive Pagination: Initial 10 items, load 10 more sequentially
  const [visibleCount, setVisibleCount] = useState<number>(10);

  // Reset pagination when collection, category filter, price, or sort changes
  useEffect(() => {
    setVisibleCount(10);
  }, [cleanSlug, selectedCategoryFilter, priceRange, sortBy]);

  const displayedItems = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const otherCollections = Object.values(EXCLUSIVE_COLLECTION_CONFIGS);
  const isRoyalCollection = cleanSlug === 'jashn' || cleanSlug === 'firdausi';

  return (
    <div className={`min-h-screen text-gray-900 flex flex-col animate-in fade-in duration-300 ${
      isRoyalCollection 
        ? 'bg-gradient-to-b from-[#fffbf2] via-pink-50/50 to-[#fff8ed]' 
        : 'bg-gradient-to-b from-pink-100/70 via-pink-50/40 to-white'
    }`}>
      
      {/* Top Breadcrumb & Navigation Bar */}
      <div className={`sticky top-0 z-30 shadow-2xs border-b ${
        isRoyalCollection ? 'bg-[#fffefc] border-amber-200/80' : 'bg-white border-pink-100'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-700 hover:text-[#e51975] transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-[#e51975]" />
            <span>Back to Store</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="hover:underline cursor-pointer" onClick={onBackToHome}>Home</span>
            <span>/</span>
            <span className="text-gray-500 font-medium">Collections</span>
            <span>/</span>
            <span className={`font-bold ${isRoyalCollection ? 'text-amber-800 font-serif' : 'text-[#ff2a85]'}`}>{config.title}</span>
          </div>
        </div>
      </div>

      {/* Hero Collection Banner */}
      <section className={`relative overflow-hidden bg-gradient-to-br ${config.accentGradient} text-white py-10 sm:py-16 px-4 sm:px-6`}>
        {/* Glow Circles */}
        <div className="absolute top-0 right-10 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
          
          <div className="md:col-span-8 space-y-3.5 sm:space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-amber-300/30 text-amber-200 text-xs font-bold backdrop-blur-xs">
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span>{config.badge} • Exclusive Surat Line</span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black font-serif tracking-tight text-white leading-tight">
              {config.title}
            </h1>

            <p className="text-xs sm:text-base text-pink-100/90 max-w-2xl leading-relaxed">
              {config.description}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-amber-200 font-semibold">
              <span className="bg-black/25 px-2.5 py-1 rounded-lg border border-white/10">
                {collectionProducts.length} Signature Creations
              </span>
              <span className="bg-black/25 px-2.5 py-1 rounded-lg border border-white/10">
                Authentic Craftsmanship
              </span>
              <span className="bg-black/25 px-2.5 py-1 rounded-lg border border-white/10">
                Direct Loom Pricing
              </span>
            </div>
          </div>

          <div className="md:col-span-4 hidden md:block">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20">
              <img
                src={config.heroImage}
                alt={config.title}
                className="w-full h-full object-cover object-top"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

        </div>
      </section>

      {/* Quick Collection Switcher Tabs */}
      <section className="bg-white border-b border-pink-100/80 sticky top-12 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar py-2.5">
            <span className="text-[11px] font-black uppercase text-gray-400 tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#e51975]" />
              <span>Collections:</span>
            </span>

            {otherCollections.map((col) => {
              const isActive = col.slug === cleanSlug;
              return (
                <button
                  key={col.slug}
                  type="button"
                  onClick={() => onNavigateCollection(col.slug)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? 'bg-pink-900 text-amber-300 shadow-sm ring-2 ring-pink-900/30'
                      : 'bg-gray-100 hover:bg-pink-50 text-gray-700 hover:text-pink-900 border border-gray-200/80'
                  }`}
                >
                  {isActive && <Check className="w-3 h-3 text-amber-300" />}
                  <span>{col.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Catalog View */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full space-y-6">
        
        {/* Filter & Sort Controls Custom Bar */}
        <CatalogFilterBar
          totalCount={filteredProducts.length}
          priceRange={priceRange}
          onPriceChange={(val) => setPriceRange(val)}
          sortBy={sortBy}
          onSortChange={(val: any) => setSortBy(val)}
          primaryFilterLabel="Category"
          primaryFilterOptions={availableCategories}
          selectedPrimaryFilter={selectedCategoryFilter}
          onPrimaryFilterChange={(val) => setSelectedCategoryFilter(val)}
          onResetAll={() => {
            setSelectedCategoryFilter('All');
            setPriceRange('All');
            setSortBy('featured');
          }}
        />

        {/* Product Grid */}
        {filteredProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-6">
              {displayedItems.map((product) => {
                const isWishlisted = wishlist.some((w) => w.id === product.id);

                return (
                  <div key={product.id} className="w-full">
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

              {/* Skeleton Product Card at end of grid acting as Load More */}
              {visibleCount < filteredProducts.length && (
                <div className="w-full">
                  <LoadMoreSkeletonCard
                    onLoadMore={() => setVisibleCount(prev => Math.min(prev + 10, filteredProducts.length))}
                    remainingCount={filteredProducts.length - visibleCount}
                    batchSize={Math.min(10, filteredProducts.length - visibleCount)}
                    theme="light"
                  />
                </div>
              )}
            </div>

            {/* Progressive Pagination Controls */}
            <div className="pt-8 pb-4 border-t border-pink-100 flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-white px-4 py-2 rounded-full border border-pink-200/80 shadow-xs">
                <span>Showing</span>
                <span className="text-[#e51975] font-black">{Math.min(visibleCount, filteredProducts.length)}</span>
                <span>of</span>
                <span className="text-[#e51975] font-black">{filteredProducts.length}</span>
                <span>creations in {config.title}</span>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-56 max-w-full h-1.5 bg-pink-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-[#ff2a85] rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.round((Math.min(visibleCount, filteredProducts.length) / Math.max(1, filteredProducts.length)) * 100))}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto">
                {visibleCount > 10 && (
                  <button
                    type="button"
                    onClick={() => {
                      setVisibleCount(10);
                      window.scrollTo({ top: 380, behavior: 'smooth' });
                    }}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-gray-700 hover:text-pink-950 border border-pink-200/90 font-extrabold text-xs hover:bg-pink-50 shadow-xs active:scale-[0.98] transition-all"
                  >
                    <ChevronUp className="w-4 h-4 text-[#e51975] stroke-[2.5]" />
                    <span>Reset to 10 Pieces</span>
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-pink-100 space-y-4 max-w-md mx-auto my-8">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-pink-50 text-[#e51975] flex items-center justify-center">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="font-serif font-black text-xl text-gray-900">No items match your filter</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Try adjusting your price or category selection to see more pieces from our {config.title} line.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryFilter('All');
                setPriceRange('All');
              }}
              className="px-5 py-2.5 rounded-full bg-pink-900 text-amber-200 font-extrabold text-xs shadow-sm hover:bg-pink-950 transition-all"
            >
              Clear All Filters
            </button>
          </div>
        )}

      </main>

    </div>
  );
};
