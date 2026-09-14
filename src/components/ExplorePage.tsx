import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { deduplicateProducts } from '../utils/productUtils';
import { 
  ArrowLeft, Radio, Grid, Shirt, Layers, Flame, Crown, 
  Briefcase, Gift, Tag, SlidersHorizontal, ArrowUpDown, Filter, ChevronRight,
  ChevronDown, Check, Gem, Scissors
} from 'lucide-react';

interface ExplorePageProps {
  pageType: 'new-arrivals' | 'sales-on-live';
  products: Product[];
  onBackToHome: () => void;
  onSelectProduct: (p: Product) => void;
  onAddToCart: (p: Product, size: string, e: React.MouseEvent) => void;
  wishlist: Product[];
  onToggleWishlist: (p: Product, e: React.MouseEvent) => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({
  pageType,
  products,
  onBackToHome,
  onSelectProduct,
  onAddToCart,
  wishlist,
  onToggleWishlist,
}) => {
  // Filters for Section 1 (Fashion Categories)
  const [catCategory, setCatCategory] = useState<string>('All');
  const [catSortBy, setCatSortBy] = useState<'popularity' | 'priceLowHigh' | 'priceHighLow' | 'newest'>('newest');
  const [isCatSortOpen, setIsCatSortOpen] = useState(false);

  // Filters for Section 2 (Featured Collections)
  const [colCollection, setColCollection] = useState<string>('All');
  const [colSortBy, setColSortBy] = useState<'popularity' | 'priceLowHigh' | 'priceHighLow' | 'newest'>('popularity');
  const [isColSortOpen, setIsColSortOpen] = useState(false);

  // Derive target products set
  const displayProducts = useMemo(() => {
    const baseProducts = pageType === 'new-arrivals'
      ? products.filter(p => p.tags?.some(t => ['New', 'New Arrival', 'Festive', 'Best Seller', 'Firdausi', 'Jashn'].includes(t)) || p.isTrending || p.isFeatured)
      : products.filter(p => p.discountPercent > 0 || p.collection === "'Deal maange more' Collection" || p.originalPrice > p.price);
    const selected = baseProducts.length >= 3 ? baseProducts : products;
    return deduplicateProducts(selected);
  }, [pageType, products]);

  // Categories list
  const categoryTabs = [
    { id: 'All', label: 'All', desc: 'All Categories', icon: Grid },
    { id: 'Kurti', label: 'Kurti', desc: 'Designer Kurtis', icon: Shirt },
    { id: 'Sharee', label: 'Sharee', desc: 'Traditional Sarees', icon: Gem },
    { id: 'Dress Materials', label: 'Dress Materials', desc: 'Unstitched Sets', icon: Scissors },
    { id: 'Indo Western dress', label: 'Indo Western dress', desc: 'Contemporary Fusion', icon: Layers },
    { id: 'Suit', label: 'Suit', desc: 'Salwar & Anarkali', icon: Crown },
  ];

  // Collections list
  const collectionTabs = [
    { id: 'All', label: 'All Collections', desc: 'Complete Catalog', icon: Layers },
    { id: '9 to Fivers Collection', label: '9 to Fivers Collection', desc: 'Workwear Elegance', icon: Briefcase },
    { id: 'Firdausi Collection', label: 'Firdausi Collection', desc: 'Royal Silk & Banarasi', icon: Crown },
    { id: "'Present is Gifted' Collection", label: "'Present is Gifted' Collection", desc: 'Festive Hampers', icon: Gift },
    { id: "'Deal maange more' Collection", label: "'Deal maange more' Collection", desc: 'Super Saver Deals', icon: Tag },
    { id: 'Jashn Collection', label: 'Jashn Collection', desc: 'Celebration & Wedding', icon: Flame },
  ];

  // Helper matching logic for categories
  const matchCategory = (prodCategory: string | undefined, tabId: string) => {
    if (tabId === 'All') return true;
    if (!prodCategory) return false;
    return prodCategory.toLowerCase().trim() === tabId.toLowerCase().trim();
  };

  // Helper matching logic for collections
  const matchCollection = (prodCollection: string | undefined, tabId: string) => {
    if (tabId === 'All') return true;
    if (!prodCollection) return false;
    const pNorm = prodCollection.toLowerCase().replace(/['"]/g, '').trim();
    const tNorm = tabId.toLowerCase().replace(/['"]/g, '').trim();
    return pNorm === tNorm || pNorm.includes(tNorm) || tNorm.includes(pNorm);
  };

  // Section 1 filtered list
  const catFilteredProducts = useMemo(() => {
    const list = displayProducts
      .filter(p => matchCategory(p.category, catCategory))
      .sort((a, b) => {
        if (catSortBy === 'priceLowHigh') return a.price - b.price;
        if (catSortBy === 'priceHighLow') return b.price - a.price;
        if (catSortBy === 'newest') return (b.discountPercent || 0) - (a.discountPercent || 0);
        return (b.ratingCount || 0) - (a.ratingCount || 0);
      });
    return deduplicateProducts(list);
  }, [displayProducts, catCategory, catSortBy]);

  // Section 2 filtered list
  const colFilteredProducts = useMemo(() => {
    const list = displayProducts
      .filter(p => matchCollection(p.collection, colCollection))
      .sort((a, b) => {
        if (colSortBy === 'priceLowHigh') return a.price - b.price;
        if (colSortBy === 'priceHighLow') return b.price - a.price;
        if (colSortBy === 'newest') return (b.discountPercent || 0) - (a.discountPercent || 0);
        return (b.ratingCount || 0) - (a.ratingCount || 0);
      });
    return deduplicateProducts(list);
  }, [displayProducts, colCollection, colSortBy]);

  const isNew = pageType === 'new-arrivals';

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100/70 via-pink-50/40 to-white pb-16">
      {/* Top Navigation Bar & Breadcrumb */}
      <div className="bg-white/95 backdrop-blur-md border-b border-pink-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-[#ff2a85] hover:text-[#e11d48] bg-pink-50 hover:bg-pink-100 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition-all border border-pink-200 shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Back to Store</span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-gray-500 font-medium overflow-x-auto scrollbar-none">
            <span className="hover:text-pink-950 cursor-pointer shrink-0" onClick={onBackToHome}>Home</span>
            <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-300 shrink-0" />
            <span className="font-bold text-[#ff2a85] underline decoration-pink-300 shrink-0">
              {isNew ? 'New Arrivals' : 'Sales on Live'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-6 sm:space-y-10">
        
        {/* Banner Hero */}
        <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 text-white shadow-xl ${
          isNew 
            ? 'bg-gradient-to-r from-[#be185d] via-[#ec4899] to-[#db2777] border border-pink-300/40' 
            : 'bg-gradient-to-r from-[#e11d48] via-[#f43f5e] to-[#ff2a85] border border-rose-300/40'
        }`}>
          {/* Background Decorative Elements */}
          <div className="absolute top-0 right-0 w-48 sm:w-80 h-48 sm:h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 sm:w-80 h-48 sm:h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-2.5 sm:space-y-3">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-amber-400/20 text-amber-200 border border-amber-300/30">
              {isNew ? (
                <>
                  <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300" />
                  <span>Fresh Handloom & Couture</span>
                </>
              ) : (
                <>
                  <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-300 animate-pulse" />
                  <span>Live Markdowns & Festive Deals</span>
                </>
              )}
            </div>

            <h1 className="text-xl sm:text-3xl md:text-4xl font-black font-serif tracking-tight text-amber-100 leading-tight">
              {isNew ? 'New Arrivals Collection' : 'Sales on Live Collection'}
            </h1>

            <p className="text-[11px] sm:text-xs md:text-sm text-pink-100/90 leading-relaxed font-medium">
              {isNew 
                ? 'Discover our newest arrivals featuring authentic Chanderi silk sarees, designer kurtis, Banarasi ensembles, and organza salwar suits. Updated daily with Surat weaver craft.'
                : 'Exclusive price drop gallery featuring heavy discounts, seasonal flash deals, and special promotional offers across our full saree, suit, and kurti line.'}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-2 sm:gap-4 text-[11px] sm:text-xs font-bold text-amber-200">
              <span className="bg-black/30 px-2.5 py-1 rounded-lg backdrop-blur-xs">{displayProducts.length} Exclusive Items</span>
              <span className="hidden sm:inline">•</span>
              <span className="bg-black/30 px-2.5 py-1 rounded-lg backdrop-blur-xs">Express Nationwide Delivery</span>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* SECTION 1: FASHION CATEGORIES */}
        {/* ========================================== */}
        <section className="bg-white rounded-2xl sm:rounded-3xl border border-pink-200/90 shadow-md p-3.5 sm:p-5 md:p-7 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-pink-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-700" />
                <h2 className="text-base sm:text-xl font-black text-pink-950 font-serif">
                  1. Fashion Categories
                </h2>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-0.5">
                Filter {isNew ? 'new arrivals' : 'live sale'} items by specific apparel categories
              </p>
            </div>

            {/* Custom Sort Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCatSortOpen(!isCatSortOpen)}
                className="flex items-center gap-1.5 bg-pink-50 hover:bg-pink-100/70 border border-pink-200 rounded-xl px-3 py-1.5 text-xs font-bold text-pink-950 transition-all cursor-pointer shadow-2xs"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-pink-700 shrink-0" />
                <span className="text-[11px] font-normal text-gray-500">Sort:</span>
                <span className="font-extrabold">
                  {catSortBy === 'newest' ? 'Newest First' :
                   catSortBy === 'popularity' ? 'Popularity' :
                   catSortBy === 'priceLowHigh' ? 'Price: Low to High' :
                   'Price: High to Low'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-pink-700 transition-transform ${isCatSortOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCatSortOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-pink-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">
                    Sort Options
                  </div>
                  <div className="py-1">
                    {[
                      { label: 'Newest First', value: 'newest' },
                      { label: 'Popularity', value: 'popularity' },
                      { label: 'Price: Low to High', value: 'priceLowHigh' },
                      { label: 'Price: High to Low', value: 'priceHighLow' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setCatSortBy(opt.value as any);
                          setIsCatSortOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between hover:bg-pink-50 transition-colors ${
                          catSortBy === opt.value ? 'text-[#e51975] font-bold bg-pink-50/60' : 'text-gray-700'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {catSortBy === opt.value && <Check className="w-3.5 h-3.5 text-[#e51975]" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Category Cards Grid (2x3 on mobile, 6 cols on lg) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3.5">
            {categoryTabs.map((cat) => {
              const Icon = cat.icon;
              const isSelected = catCategory === cat.id;
              const count = displayProducts.filter(p => matchCategory(p.category, cat.id)).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCatCategory(cat.id)}
                  className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl text-left border transition-all flex flex-col justify-between group cursor-pointer ${
                    isSelected
                      ? 'bg-pink-950 text-amber-200 border-pink-950 shadow-md scale-102 ring-2 ring-amber-300/50'
                      : 'bg-white hover:bg-pink-50/70 text-pink-950 border-pink-200/80 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${
                      isSelected ? 'bg-pink-900 text-amber-300' : 'bg-pink-100 text-pink-900 group-hover:bg-pink-200'
                    }`}>
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      isSelected ? 'bg-pink-800 text-amber-200' : 'bg-pink-100 text-pink-950'
                    }`}>
                      {count}
                    </span>
                  </div>

                  <div>
                    <h3 className={`font-extrabold text-[11px] sm:text-xs md:text-sm line-clamp-1 ${
                      isSelected ? 'text-amber-200' : 'text-pink-950'
                    }`}>
                      {cat.label}
                    </h3>
                    <p className={`text-[9px] sm:text-[10px] mt-0.5 line-clamp-1 ${
                      isSelected ? 'text-amber-100/70' : 'text-gray-400'
                    }`}>
                      {cat.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Products Grid for Category Section */}
          {catFilteredProducts.length === 0 ? (
            <div className="py-10 text-center bg-pink-50/50 rounded-2xl border border-dashed border-pink-200 p-4">
              <p className="text-xs sm:text-sm font-bold text-gray-600">No items found under "{catCategory}"</p>
              <button
                onClick={() => setCatCategory('All')}
                className="mt-2 text-xs text-pink-700 font-extrabold hover:underline"
              >
                View All Categories
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-4.5">
              {catFilteredProducts.map((product) => (
                <ProductCard
                  key={`exp-cat-${product.id}`}
                  product={product}
                  onSelect={onSelectProduct}
                  onAddToCart={onAddToCart}
                  isWishlisted={wishlist.some(w => w.id === product.id)}
                  onToggleWishlist={onToggleWishlist}
                />
              ))}
            </div>
          )}
        </section>

        {/* ========================================== */}
        {/* SECTION 2: FEATURED COLLECTIONS */}
        {/* ========================================== */}
        <section className="bg-white rounded-2xl sm:rounded-3xl border border-pink-200/90 shadow-md p-3.5 sm:p-5 md:p-7 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-pink-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                <h2 className="text-base sm:text-xl font-black text-pink-950 font-serif">
                  2. Featured Collections
                </h2>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-0.5">
                Explore curated thematic collections for {isNew ? 'new arrivals' : 'live sale markdowns'}
              </p>
            </div>

            {/* Custom Sort Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsColSortOpen(!isColSortOpen)}
                className="flex items-center gap-1.5 bg-pink-50 hover:bg-pink-100/70 border border-pink-200 rounded-xl px-3 py-1.5 text-xs font-bold text-pink-950 transition-all cursor-pointer shadow-2xs"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-pink-700 shrink-0" />
                <span className="text-[11px] font-normal text-gray-500">Sort:</span>
                <span className="font-extrabold">
                  {colSortBy === 'popularity' ? 'Popularity' :
                   colSortBy === 'priceLowHigh' ? 'Price: Low to High' :
                   colSortBy === 'priceHighLow' ? 'Price: High to Low' :
                   'Newest First'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-pink-700 transition-transform ${isColSortOpen ? 'rotate-180' : ''}`} />
              </button>

              {isColSortOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-pink-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">
                    Sort Options
                  </div>
                  <div className="py-1">
                    {[
                      { label: 'Popularity', value: 'popularity' },
                      { label: 'Price: Low to High', value: 'priceLowHigh' },
                      { label: 'Price: High to Low', value: 'priceHighLow' },
                      { label: 'Newest First', value: 'newest' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setColSortBy(opt.value as any);
                          setIsColSortOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between hover:bg-pink-50 transition-colors ${
                          colSortBy === opt.value ? 'text-[#e51975] font-bold bg-pink-50/60' : 'text-gray-700'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {colSortBy === opt.value && <Check className="w-3.5 h-3.5 text-[#e51975]" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Collection Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3.5">
            {collectionTabs.map((col) => {
              const Icon = col.icon;
              const isSelected = colCollection === col.id;
              const count = displayProducts.filter(p => matchCollection(p.collection, col.id)).length;

              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setColCollection(col.id)}
                  className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl text-left border transition-all flex flex-col justify-between group cursor-pointer ${
                    isSelected
                      ? 'bg-pink-950 text-amber-200 border-pink-950 shadow-md scale-102 ring-2 ring-amber-300/50'
                      : 'bg-white hover:bg-pink-50/70 text-pink-950 border-pink-200/80 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${
                      isSelected ? 'bg-pink-900 text-amber-300' : 'bg-pink-100 text-pink-900 group-hover:bg-pink-200'
                    }`}>
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      isSelected ? 'bg-pink-800 text-amber-200' : 'bg-pink-100 text-pink-950'
                    }`}>
                      {count}
                    </span>
                  </div>

                  <div>
                    <h3 className={`font-extrabold text-[11px] sm:text-xs md:text-sm line-clamp-1 ${
                      isSelected ? 'text-amber-200' : 'text-pink-950'
                    }`}>
                      {col.label}
                    </h3>
                    <p className={`text-[9px] sm:text-[10px] mt-0.5 line-clamp-1 ${
                      isSelected ? 'text-amber-100/70' : 'text-gray-400'
                    }`}>
                      {col.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Products Grid for Collection Section */}
          {colFilteredProducts.length === 0 ? (
            <div className="py-10 text-center bg-pink-50/50 rounded-2xl border border-dashed border-pink-200 p-4">
              <p className="text-xs sm:text-sm font-bold text-gray-600">No items found under "{colCollection}"</p>
              <button
                onClick={() => setColCollection('All')}
                className="mt-2 text-xs text-pink-700 font-extrabold hover:underline"
              >
                View All Collections
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-4.5">
              {colFilteredProducts.map((product) => (
                <ProductCard
                  key={`exp-col-${product.id}`}
                  product={product}
                  onSelect={onSelectProduct}
                  onAddToCart={onAddToCart}
                  isWishlisted={wishlist.some(w => w.id === product.id)}
                  onToggleWishlist={onToggleWishlist}
                />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
};
