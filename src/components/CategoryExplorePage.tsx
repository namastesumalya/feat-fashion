import React, { useState, useMemo, useEffect } from 'react';
import { Product, CategoryType } from '../types';
import { ProductCard } from './ProductCard';
import { LoadMoreSkeletonCard } from './LoadMoreSkeletonCard';
import { CatalogFilterBar } from './CatalogFilterBar';
import { deduplicateProducts } from '../utils/productUtils';
import { 
  ArrowLeft, Filter, Shirt, Crown, 
  Layers, Gift, Check, Award,
  ChevronDown, ChevronUp, ArrowRight
} from 'lucide-react';

export interface CategoryPageConfig {
  slug: string;
  categoryValue: CategoryType;
  title: string;
  subtitle: string;
  badge: string;
  heroImage: string;
  description: string;
  accentGradient: string;
  bannerBg: string;
}

export const CATEGORY_CONFIGS: Record<string, CategoryPageConfig> = {
  kurti: {
    slug: 'kurti',
    categoryValue: 'Kurti',
    title: 'Designer Kurtis & Tunics',
    subtitle: 'From everyday breathable mulmul to festive zari & anarkali silhouettes',
    badge: 'Artisanal Kurtis',
    heroImage: '/kurti.jpeg',
    description: 'Elegant designs, exquisite craftsmanship, premium fabrics, flexible fits, vibrant details, and timeless comfort make every "FEAT" kurti effortlessly stylish and you a real resolute.',
    accentGradient: 'from-[#ff2a85] via-pink-600 to-[#be185d]',
    bannerBg: 'bg-gradient-to-r from-pink-400/25 via-pink-300/15 to-white'
  },
  sharee: {
    slug: 'sharee',
    categoryValue: 'Sharee',
    title: 'Royal Heritage Sarees & Drapes',
    subtitle: 'Timeless Banarasi, tissue silk, organza, and royal handloom masterpieces',
    badge: 'Royal Handlooms & Golden Zari',
    heroImage: '/saree.jpeg',
    description: 'Six yards of royal handloom heritage, woven with pure golden zari artistry, grace, and majestic allure to embolden every celebration.',
    accentGradient: 'from-amber-950 via-pink-950 to-amber-900',
    bannerBg: 'bg-gradient-to-r from-amber-500/30 via-pink-500/25 to-amber-400/30'
  },
  'dress-materials': {
    slug: 'dress-materials',
    categoryValue: 'Dress Materials',
    title: 'Unstitched Dress Materials',
    subtitle: 'Custom tailored elegance with pure top, bottom, and dupatta sets',
    badge: '3-Piece Sets',
    heroImage: '/dress.jpeg',
    description: 'Create your perfect bespoke fit. Premium unstitched fabrics featuring hand block prints, chanderi weave dupattas, and pure cotton comfort.',
    accentGradient: 'from-pink-600 via-rose-500 to-pink-700',
    bannerBg: 'bg-gradient-to-r from-pink-300/25 via-rose-200/15 to-white'
  },
  'indo-western': {
    slug: 'indo-western',
    categoryValue: 'Indo Western dress',
    title: 'Indo Western Fusion & Co-Ords',
    subtitle: 'Modern silhouettes seamlessly blended with traditional Indian aesthetics',
    badge: 'Contemporary Fusion',
    heroImage: '/indo-western.jpeg',
    description: 'Contemporary party sets, festive capes, chic shrugs, and modern fusion co-ord sets designed for weddings, cocktails, and parties.',
    accentGradient: 'from-fuchsia-700 via-pink-600 to-rose-700',
    bannerBg: 'bg-gradient-to-r from-fuchsia-300/25 via-pink-200/15 to-white'
  },
  suit: {
    slug: 'suit',
    categoryValue: 'Suit',
    title: 'Royal Suits & Anarkali Sets',
    subtitle: 'Regal 3-piece ready-to-wear Anarkalis, Shararas, and Straight Suit sets',
    badge: 'Regal Sets',
    heroImage: '/suit.jpeg',
    description: 'Opulent festive wear featuring heavy resham work, mirror embroidery, flared Anarkalis, and stylish pant suits with designer dupattas.',
    accentGradient: 'from-pink-800 via-rose-700 to-pink-950',
    bannerBg: 'bg-gradient-to-r from-pink-400/25 via-rose-300/15 to-white'
  }
};

interface CategoryExplorePageProps {
  categorySlug: string;
  products: Product[];
  onBackToHome: () => void;
  onSelectProduct: (p: Product) => void;
  onAddToCart: (p: Product, size: string, e: React.MouseEvent) => void;
  wishlist: Product[];
  onToggleWishlist: (p: Product, e: React.MouseEvent) => void;
  onNavigateCategory: (slug: string) => void;
}

export const CategoryExplorePage: React.FC<CategoryExplorePageProps> = ({
  categorySlug,
  products,
  onBackToHome,
  onSelectProduct,
  onAddToCart,
  wishlist,
  onToggleWishlist,
  onNavigateCategory
}) => {
  // Normalize slug
  const rawSlug = categorySlug.replace(/^\//, '').toLowerCase();
  const cleanSlug = rawSlug === 'saree' ? 'sharee' : rawSlug;
  const config = CATEGORY_CONFIGS[cleanSlug] || CATEGORY_CONFIGS.kurti;

  // Sorting & Sub-filter states
  const [sortBy, setSortBy] = useState<'featured' | 'priceLowHigh' | 'priceHighLow' | 'discount'>('featured');
  const [selectedFabric, setSelectedFabric] = useState<string>('All');
  const [selectedOccasion, setSelectedOccasion] = useState<string>('All');
  const [priceRange, setPriceRange] = useState<string>('All');

  // Filter products for this category
  const categoryProducts = useMemo(() => {
    return products.filter(p => {
      if (!p.category) return false;
      const targetVal = config.categoryValue.toLowerCase().trim();
      const prodVal = p.category.toLowerCase().trim();
      
      // Strict separation of categories
      if (cleanSlug === 'dress-materials') {
        if (prodVal.includes('indo') || prodVal.includes('western')) return false;
        return (
          prodVal === 'dress materials' || 
          prodVal === 'dress material' || 
          prodVal === 'dress-materials' ||
          prodVal.includes('material') || 
          (prodVal.includes('dress') && prodVal.includes('material'))
        );
      }
      if (cleanSlug === 'indo-western') {
        return prodVal.includes('indo') || prodVal.includes('western');
      }
      if (cleanSlug === 'kurti') {
        return (prodVal === 'kurti' || prodVal.includes('kurti') || prodVal.includes('tunic')) && !prodVal.includes('indo');
      }
      if (cleanSlug === 'sharee') {
        return prodVal === 'sharee' || prodVal === 'saree' || prodVal.includes('sharee') || prodVal.includes('saree');
      }
      if (cleanSlug === 'suit') {
        return (prodVal === 'suit' || prodVal.includes('suit') || prodVal.includes('anarkali') || prodVal.includes('sharara')) && !prodVal.includes('indo');
      }
      return prodVal === targetVal || prodVal.includes(targetVal);
    });
  }, [products, config, cleanSlug]);

  // Extract available fabric types
  const availableFabrics = useMemo(() => {
    const fabrics = new Set<string>();
    categoryProducts.forEach(p => {
      if (p.fabric) fabrics.add(p.fabric);
    });
    return ['All', ...Array.from(fabrics)];
  }, [categoryProducts]);

  // Extract available occasions / collections
  const availableOccasions = useMemo(() => {
    const occasions = new Set<string>();
    categoryProducts.forEach(p => {
      if ((p as any).occasion) occasions.add((p as any).occasion);
      if (p.collection) occasions.add(p.collection);
    });
    return ['All', ...Array.from(occasions).slice(0, 5)];
  }, [categoryProducts]);

  // Filtered & Sorted items
  const filteredProducts = useMemo(() => {
    let result = [...categoryProducts];

    if (selectedFabric !== 'All') {
      result = result.filter(p => p.fabric?.toLowerCase() === selectedFabric.toLowerCase());
    }

    if (selectedOccasion !== 'All') {
      result = result.filter(p => 
        (p as any).occasion?.toLowerCase() === selectedOccasion.toLowerCase() ||
        p.collection?.toLowerCase() === selectedOccasion.toLowerCase()
      );
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
  }, [categoryProducts, selectedFabric, selectedOccasion, priceRange, sortBy]);

  // Progressive Pagination: Initial 10 items, load 10 more sequentially
  const [visibleCount, setVisibleCount] = useState<number>(10);

  // Reset pagination when category, fabric, occasion, price, or sort changes
  useEffect(() => {
    setVisibleCount(10);
  }, [cleanSlug, selectedFabric, selectedOccasion, priceRange, sortBy]);

  const displayedItems = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  // Available categories quick navigation bar
  const otherCategories = Object.values(CATEGORY_CONFIGS);
  const isSareeCategory = cleanSlug === 'sharee';

  return (
    <div className={`min-h-screen text-gray-900 flex flex-col animate-in fade-in duration-300 ${
      isSareeCategory 
        ? 'bg-gradient-to-b from-[#fffbf2] via-pink-50/50 to-[#fff8ed]' 
        : 'bg-gradient-to-b from-pink-100/70 via-pink-50/40 to-white'
    }`}>
      
      {/* Top Breadcrumb & Navigation Bar */}
      <div className={`sticky top-0 z-30 shadow-2xs border-b ${
        isSareeCategory ? 'bg-[#fffefc] border-amber-200/80' : 'bg-white border-pink-100'
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
            <span className="text-gray-500 font-medium">Categories</span>
            <span>/</span>
            <span className={`font-bold ${isSareeCategory ? 'text-amber-800 font-serif' : 'text-[#ff2a85]'}`}>{config.title}</span>
          </div>
        </div>
      </div>

      {/* Hero Category Banner */}
      <section className={`relative overflow-hidden bg-gradient-to-br ${config.accentGradient} text-white py-10 sm:py-16 px-4 sm:px-6`}>
        {/* Glow Circles */}
        <div className="absolute top-0 right-10 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
          
          <div className="md:col-span-8 space-y-3.5 sm:space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-amber-300/30 text-amber-200 text-xs font-bold backdrop-blur-xs">
              <Award className="w-3.5 h-3.5 text-amber-300" />
              <span>{config.badge} • 100% Genuine Handlooms</span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black font-serif tracking-tight text-white leading-tight">
              {config.title}
            </h1>

            <p className="text-xs sm:text-base text-pink-100/90 max-w-2xl leading-relaxed">
              {config.description}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-amber-200 font-semibold">
              <span className="bg-black/25 px-2.5 py-1 rounded-lg border border-white/10">
                {categoryProducts.length} Exclusive Designs
              </span>
              <span className="bg-black/25 px-2.5 py-1 rounded-lg border border-white/10">
                Ready to Dispatch
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

      {/* Quick Category Switcher Tabs */}
      <section className="bg-white border-b border-pink-100/80 sticky top-12 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar py-2.5">
            <span className="text-[11px] font-black uppercase text-gray-400 tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Shirt className="w-3.5 h-3.5" />
              <span>Categories:</span>
            </span>

            {otherCategories.map((cat) => {
              const isActive = cat.slug === cleanSlug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => onNavigateCategory(cat.slug)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? 'bg-pink-900 text-amber-300 shadow-sm ring-2 ring-pink-900/30'
                      : 'bg-gray-100 hover:bg-pink-50 text-gray-700 hover:text-pink-900 border border-gray-200/80'
                  }`}
                >
                  {isActive && <Check className="w-3 h-3 text-amber-300" />}
                  <span>{cat.categoryValue}</span>
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
          primaryFilterLabel="Fabric"
          primaryFilterOptions={availableFabrics}
          selectedPrimaryFilter={selectedFabric}
          onPrimaryFilterChange={(val) => setSelectedFabric(val)}
          secondaryFilterLabel="Occasion"
          secondaryFilterOptions={availableOccasions}
          selectedSecondaryFilter={selectedOccasion}
          onSecondaryFilterChange={(val) => setSelectedOccasion(val)}
          onResetAll={() => {
            setSelectedFabric('All');
            setPriceRange('All');
            setSelectedOccasion('All');
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
                <span>exclusive {config.categoryValue} designs</span>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-56 max-w-full h-1.5 bg-pink-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#ff2a85] to-amber-500 rounded-full transition-all duration-300"
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
                    <span>Reset to 10 Products</span>
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-pink-100 space-y-4 max-w-md mx-auto my-8">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-pink-50 text-[#e51975] flex items-center justify-center">
              <Shirt className="w-7 h-7" />
            </div>
            <h3 className="font-serif font-black text-xl text-gray-900">No items match your filter</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Try adjusting your price or fabric selection to see more pieces from our {config.title} catalog.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedFabric('All');
                setPriceRange('All');
                setSelectedOccasion('All');
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
