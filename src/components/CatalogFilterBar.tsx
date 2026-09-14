import React, { useState } from 'react';
import { 
  SlidersHorizontal, Check, X, ArrowUpDown, 
  RotateCcw, IndianRupee, Layers
} from 'lucide-react';

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

interface CatalogFilterBarProps {
  totalCount: number;
  // Price
  priceRange: string;
  onPriceChange: (val: string) => void;
  // Sort
  sortBy: string;
  onSortChange: (val: string) => void;
  // Primary custom filter (e.g. Fabric or Category)
  primaryFilterLabel?: string;
  primaryFilterOptions?: string[];
  selectedPrimaryFilter?: string;
  onPrimaryFilterChange?: (val: string) => void;
  // Secondary custom filter (e.g. Occasion)
  secondaryFilterLabel?: string;
  secondaryFilterOptions?: string[];
  selectedSecondaryFilter?: string;
  onSecondaryFilterChange?: (val: string) => void;
  // Reset
  onResetAll: () => void;
}

const PRICE_OPTIONS: FilterOption[] = [
  { label: 'All Prices', value: 'All' },
  { label: 'Under ₹999', value: 'under999' },
  { label: '₹999 - ₹1,999', value: '999-1999' },
  { label: 'Above ₹1,999', value: 'above1999' },
];

const SORT_OPTIONS: FilterOption[] = [
  { label: 'Most Popular', value: 'featured' },
  { label: 'Price: Low to High', value: 'priceLowHigh' },
  { label: 'Price: High to Low', value: 'priceHighLow' },
  { label: 'Biggest Discount', value: 'discount' },
];

export const CatalogFilterBar: React.FC<CatalogFilterBarProps> = ({
  totalCount,
  priceRange,
  onPriceChange,
  sortBy,
  onSortChange,
  primaryFilterLabel = 'Fabric',
  primaryFilterOptions = [],
  selectedPrimaryFilter = 'All',
  onPrimaryFilterChange,
  secondaryFilterLabel,
  secondaryFilterOptions = [],
  selectedSecondaryFilter = 'All',
  onSecondaryFilterChange,
  onResetAll
}) => {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const hasActiveFilters = 
    priceRange !== 'All' || 
    selectedPrimaryFilter !== 'All' || 
    (secondaryFilterLabel && selectedSecondaryFilter !== 'All') ||
    sortBy !== 'featured';

  const activeFiltersCount = 
    (priceRange !== 'All' ? 1 : 0) +
    (selectedPrimaryFilter !== 'All' ? 1 : 0) +
    (secondaryFilterLabel && selectedSecondaryFilter !== 'All' ? 1 : 0) +
    (sortBy !== 'featured' ? 1 : 0);

  const getSortLabel = (val: string) => {
    const found = SORT_OPTIONS.find(o => o.value === val);
    return found ? found.label : 'Popularity';
  };

  const getPriceLabel = (val: string) => {
    const found = PRICE_OPTIONS.find(o => o.value === val);
    return found ? found.label : 'All Prices';
  };

  return (
    <div className="space-y-3 w-full">
      {/* Main Filter Action Bar */}
      <div className="flex items-center justify-between gap-3">
        
        {/* Filter Trigger Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs border cursor-pointer ${
              activeFiltersCount > 0
                ? 'bg-pink-950 text-amber-300 border-pink-900 ring-2 ring-pink-900/20'
                : 'bg-white hover:bg-pink-50 text-pink-950 border-pink-200/90'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-[#e51975]" />
            <span className="font-extrabold text-sm">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-400 text-pink-950 font-black text-[11px] flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Quick Clear Button if active */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetAll}
              className="flex items-center gap-1.5 text-xs font-bold text-[#e51975] hover:text-pink-900 bg-pink-50 hover:bg-pink-100/80 px-3 py-2 rounded-xl transition-colors border border-pink-200"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>

      </div>

      {/* Applied Filter Tags (Shows only when user chooses something) */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
          <span className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">Applied:</span>

          {selectedPrimaryFilter !== 'All' && onPrimaryFilterChange && (
            <span className="inline-flex items-center gap-1.5 bg-pink-100/80 text-pink-950 px-3 py-1 rounded-xl font-bold border border-pink-200 shadow-2xs">
              <span>{primaryFilterLabel}: {selectedPrimaryFilter}</span>
              <button 
                type="button" 
                onClick={() => onPrimaryFilterChange('All')} 
                className="hover:bg-pink-200/80 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {secondaryFilterLabel && selectedSecondaryFilter !== 'All' && onSecondaryFilterChange && (
            <span className="inline-flex items-center gap-1.5 bg-pink-100/80 text-pink-950 px-3 py-1 rounded-xl font-bold border border-pink-200 shadow-2xs">
              <span>{secondaryFilterLabel}: {selectedSecondaryFilter}</span>
              <button 
                type="button" 
                onClick={() => onSecondaryFilterChange('All')} 
                className="hover:bg-pink-200/80 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {priceRange !== 'All' && (
            <span className="inline-flex items-center gap-1.5 bg-amber-100/90 text-amber-950 px-3 py-1 rounded-xl font-bold border border-amber-200 shadow-2xs">
              <span>Price: {getPriceLabel(priceRange)}</span>
              <button 
                type="button" 
                onClick={() => onPriceChange('All')} 
                className="hover:bg-amber-200/80 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {sortBy !== 'featured' && (
            <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-800 px-3 py-1 rounded-xl font-bold border border-gray-200 shadow-2xs">
              <span>Sort: {getSortLabel(sortBy)}</span>
              <button 
                type="button" 
                onClick={() => onSortChange('featured')} 
                className="hover:bg-gray-200 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Comprehensive Filter Modal / Drawer */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-pink-100 flex items-center justify-between bg-gradient-to-r from-pink-50 to-white">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#e51975]" />
                <h3 className="font-serif font-black text-lg text-gray-900">Filter & Sort Collection</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-6 overflow-y-auto flex-1 text-xs">
              
              {/* Primary Filter Options (e.g. Fabric or Category) */}
              {primaryFilterOptions.length > 1 && onPrimaryFilterChange && (
                <div className="space-y-2.5">
                  <label className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#e51975]" />
                    <span>{primaryFilterLabel}</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {primaryFilterOptions.map((opt) => {
                      const isSelected = selectedPrimaryFilter === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => onPrimaryFilterChange(opt)}
                          className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 border ${
                            isSelected
                              ? 'bg-pink-900 text-amber-200 border-pink-900 shadow-xs'
                              : 'bg-gray-50 text-gray-700 hover:bg-pink-50 hover:text-pink-900 border-gray-200'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Price Filter Options */}
              <div className="space-y-2.5">
                <label className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-[#e51975]" />
                  <span>Price Range</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRICE_OPTIONS.map((opt) => {
                    const isSelected = priceRange === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onPriceChange(opt.value)}
                        className={`p-2.5 rounded-xl font-bold text-left transition-all border flex items-center justify-between ${
                          isSelected
                            ? 'bg-pink-900 text-amber-200 border-pink-900 shadow-xs'
                            : 'bg-gray-50 text-gray-700 hover:bg-pink-50 hover:text-pink-900 border-gray-200'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-300" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sort Order Options */}
              <div className="space-y-2.5">
                <label className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#e51975]" />
                  <span>Sort By</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SORT_OPTIONS.map((opt) => {
                    const isSelected = sortBy === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onSortChange(opt.value)}
                        className={`p-2.5 rounded-xl font-bold text-left transition-all border flex items-center justify-between ${
                          isSelected
                            ? 'bg-pink-900 text-amber-200 border-pink-900 shadow-xs'
                            : 'bg-gray-50 text-gray-700 hover:bg-pink-50 hover:text-pink-900 border-gray-200'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-300" />}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-3 bg-gray-50">
              <button
                type="button"
                onClick={() => {
                  onResetAll();
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200/70 transition-colors"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="flex-1 px-5 py-2.5 rounded-xl bg-pink-900 text-amber-200 text-xs font-extrabold shadow-md hover:bg-pink-950 transition-all text-center"
              >
                Show {totalCount} Items
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
