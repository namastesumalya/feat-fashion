import React, { useState } from 'react';
import { AVAILABLE_STANDARD_SIZES } from '../types';
import { 
  Check, 
  Plus, 
  Minus, 
  Trash2, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  PackageCheck,
  PlusCircle,
  X
} from 'lucide-react';

export interface SizeInventoryManagerProps {
  selectedSizes: string[];
  sizeStock?: Record<string, number>;
  onChange?: (sizes: string[], sizeStock: Record<string, number>, totalUnits: number) => void;
  onChangeSizes?: (sizes: string[]) => void;
  onChangeSizeStock?: (sizeStock: Record<string, number>, calculatedTotalStock: number) => void;
  idPrefix?: string;
  title?: string;
  subtitle?: string;
  badgeLabel?: string;
}

export const SizeInventoryManager: React.FC<SizeInventoryManagerProps> = ({
  selectedSizes = [],
  sizeStock = {},
  onChange,
  onChangeSizes,
  onChangeSizeStock,
  idPrefix = 'size-mgmt',
  title = 'Size Selection & Manual Unit Inventory',
  subtitle = 'Select standard sizes or add custom ones. Enter inventory units manually per size — saved directly to your database.',
  badgeLabel = 'Total Combined Units'
}) => {
  const [bulkQty, setBulkQty] = useState<number>(0);
  const [customSizeInput, setCustomSizeInput] = useState<string>('');

  // Clean current stock without injecting fake default units
  const currentStock: Record<string, number> = { ...sizeStock };
  selectedSizes.forEach(sz => {
    if (currentStock[sz] === undefined) {
      currentStock[sz] = 0;
    }
  });

  const calculateTotal = (stockMap: Record<string, number>, sizes: string[]) => {
    return sizes.reduce((sum, sz) => sum + (Number(stockMap[sz]) || 0), 0);
  };

  const emitChanges = (newSizes: string[], newStock: Record<string, number>) => {
    const total = calculateTotal(newStock, newSizes);
    if (onChange) {
      onChange(newSizes, newStock, total);
    }
    if (onChangeSizes) {
      onChangeSizes(newSizes);
    }
    if (onChangeSizeStock) {
      onChangeSizeStock(newStock, total);
    }
  };

  const handleToggleSize = (size: string) => {
    const cleanSize = size.trim();
    if (!cleanSize) return;

    let newSizes: string[];
    const updatedStock = { ...currentStock };

    if (selectedSizes.includes(cleanSize)) {
      // Unselect size
      newSizes = selectedSizes.filter(s => s !== cleanSize);
    } else {
      // Select size with 0 initial units (Admin sets units manually)
      newSizes = [...selectedSizes, cleanSize];
      if (updatedStock[cleanSize] === undefined) {
        updatedStock[cleanSize] = 0;
      }
    }
    emitChanges(newSizes, updatedStock);
  };

  const handleRemoveSize = (size: string) => {
    const newSizes = selectedSizes.filter(s => s !== size);
    const updatedStock = { ...currentStock };
    delete updatedStock[size];
    emitChanges(newSizes, updatedStock);
  };

  const handleSetStockForSize = (size: string, qty: number) => {
    const validQty = Math.max(0, isNaN(qty) ? 0 : qty);
    const updatedStock = {
      ...currentStock,
      [size]: validQty
    };
    emitChanges(selectedSizes, updatedStock);
  };

  const handleAdjustStock = (size: string, delta: number) => {
    const current = Number(currentStock[size]) || 0;
    handleSetStockForSize(size, Math.max(0, current + delta));
  };

  const handleApplyBulk = () => {
    const updatedStock = { ...currentStock };
    selectedSizes.forEach(sz => {
      updatedStock[sz] = Math.max(0, bulkQty);
    });
    emitChanges(selectedSizes, updatedStock);
  };

  const handlePresetSelect = (sizesToSelect: string[]) => {
    const updatedStock = { ...currentStock };
    sizesToSelect.forEach(sz => {
      if (updatedStock[sz] === undefined) {
        updatedStock[sz] = 0;
      }
    });
    emitChanges(sizesToSelect, updatedStock);
  };

  const handleAddCustomSize = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const formatted = customSizeInput.trim();
    if (!formatted) return;

    if (!selectedSizes.includes(formatted)) {
      const newSizes = [...selectedSizes, formatted];
      const updatedStock = { ...currentStock, [formatted]: 0 };
      emitChanges(newSizes, updatedStock);
    }
    setCustomSizeInput('');
  };

  const totalUnits = calculateTotal(currentStock, selectedSizes);

  return (
    <div className="space-y-4 bg-gradient-to-br from-pink-50/80 via-white to-amber-50/50 p-4 sm:p-5 rounded-2xl border border-pink-200/90 shadow-xs">
      
      {/* Header with Title and Total Units Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pink-100 pb-3">
        <div>
          <label className="font-extrabold text-xs sm:text-sm text-pink-950 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-pink-700" />
            <span>{title}</span>
          </label>
          <p className="text-[11px] text-gray-600 mt-0.5">
            {subtitle}
          </p>
        </div>

        {/* Live Total Units Counter */}
        <div className="flex items-center gap-2 bg-pink-950 text-amber-200 px-3.5 py-1.5 rounded-xl border border-amber-300/30 shadow-xs">
          <PackageCheck className="w-4 h-4 text-amber-300" />
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-amber-300/80 block leading-tight">{badgeLabel}</span>
            <span className="text-sm font-black font-mono leading-none">{totalUnits} Units</span>
          </div>
        </div>
      </div>

      {/* Standard Size Selection Chips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-gray-700">
          <span>Choose Standard Sizes:</span>
          <span className="text-[11px] text-pink-800 font-semibold">
            {selectedSizes.length} active sizes
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {AVAILABLE_STANDARD_SIZES.map((sz) => {
            const isSelected = selectedSizes.includes(sz);
            const units = Number(currentStock[sz]) || 0;
            return (
              <button
                key={sz}
                type="button"
                id={`${idPrefix}-size-toggle-${sz.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => handleToggleSize(sz)}
                className={`py-2.5 px-3 rounded-xl font-black text-xs transition-all flex flex-col items-center justify-center gap-1 border cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-b from-pink-900 to-pink-950 text-amber-200 border-pink-950 shadow-md ring-2 ring-pink-300/60 scale-[1.02]'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-pink-300 hover:bg-pink-50/50'
                }`}
              >
                <div className="flex items-center gap-1">
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-300" />}
                  <span>{sz}</span>
                </div>
                <span className={`text-[10px] font-mono font-medium ${
                  isSelected 
                    ? units === 0 ? 'text-rose-300 font-bold' : 'text-amber-300/90' 
                    : 'text-gray-400'
                }`}>
                  {isSelected ? `${units} units` : 'Off'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Size Presets & Custom Size Adder */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-pink-100/60">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-gray-500 font-bold mr-1">Quick Presets:</span>
            <button
              type="button"
              onClick={() => handlePresetSelect(['S', 'M', 'L', 'XL', 'XXL', 'XXXL'])}
              className="px-2.5 py-1 rounded-lg bg-pink-100/80 hover:bg-pink-200 text-pink-950 font-bold transition-colors cursor-pointer"
            >
              S to XXXL (6 Sizes)
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect(['S', 'M', 'L', 'XL', 'XXL'])}
              className="px-2.5 py-1 rounded-lg bg-pink-100/80 hover:bg-pink-200 text-pink-950 font-bold transition-colors cursor-pointer"
            >
              Popular (S–XXL)
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect(['XL', 'XXL', 'XXXL'])}
              className="px-2.5 py-1 rounded-lg bg-pink-100/80 hover:bg-pink-200 text-pink-950 font-bold transition-colors cursor-pointer"
            >
              Plus (XL, XXL, XXXL)
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect(['Free Size'])}
              className="px-2.5 py-1 rounded-lg bg-pink-100/80 hover:bg-pink-200 text-pink-950 font-bold transition-colors cursor-pointer"
            >
              Free Size Only
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect([...AVAILABLE_STANDARD_SIZES])}
              className="px-2.5 py-1 rounded-lg bg-pink-900 text-amber-200 font-bold hover:bg-pink-800 transition-colors cursor-pointer"
            >
              All 7 Sizes
            </button>
            <button
              type="button"
              onClick={() => emitChanges([], {})}
              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors cursor-pointer"
            >
              Clear All
            </button>
          </div>

          {/* Add Custom Size (e.g. 4XL, 38, 40, XS) */}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Add Custom Size (e.g. 4XL, XS)"
              value={customSizeInput}
              onChange={(e) => setCustomSizeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomSize();
                }
              }}
              className="px-2.5 py-1 text-xs border border-pink-200 rounded-lg bg-white w-44 font-medium focus:ring-1 focus:ring-pink-700"
            />
            <button
              type="button"
              onClick={() => handleAddCustomSize()}
              className="px-2.5 py-1 bg-pink-950 hover:bg-pink-900 text-amber-200 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Individual Units Controller per Selected Size */}
      {selectedSizes.length > 0 ? (
        <div className="space-y-3 pt-2 border-t border-pink-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-pink-950 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-pink-700" />
              <span>Manual Units per Size:</span>
            </span>

            {/* Bulk Stock Apply Toolbar */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-pink-200 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-600">Set All To:</span>
              <input
                type="number"
                min={0}
                value={bulkQty}
                onChange={(e) => setBulkQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-14 px-2 py-0.5 text-center text-xs font-mono font-bold border border-gray-300 rounded-lg bg-pink-50/30"
              />
              <button
                type="button"
                onClick={handleApplyBulk}
                className="px-2.5 py-0.5 bg-pink-900 hover:bg-pink-800 text-amber-200 font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Apply this unit count to all currently selected sizes"
              >
                <Layers className="w-3 h-3 text-amber-300" />
                <span>Apply to All Sizes</span>
              </button>
            </div>
          </div>

          {/* Grid of Individual Size Unit Controllers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {selectedSizes.map((sz) => {
              const qty = Number(currentStock[sz]) || 0;
              const isZero = qty === 0;
              const isLow = qty > 0 && qty <= 3;

              return (
                <div
                  key={sz}
                  className={`p-3 rounded-xl border transition-all ${
                    isZero 
                      ? 'bg-rose-50/70 border-rose-200' 
                      : isLow 
                        ? 'bg-amber-50/70 border-amber-200' 
                        : 'bg-white border-pink-200 shadow-2xs'
                  }`}
                >
                  {/* Card Header: Size Pill + Status + Remove */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-lg bg-pink-950 text-amber-200 font-black text-xs">
                        {sz}
                      </span>
                      {isZero ? (
                        <span className="text-[9px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md">
                          0 Units (Out)
                        </span>
                      ) : isLow ? (
                        <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-600" /> Low ({qty})
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> {qty} Units
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSize(sz)}
                      className="text-gray-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                      title={`Remove size ${sz}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quantity Stepper & Direct Number Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleAdjustStock(sz, -1)}
                        className="w-8 h-8 rounded-lg bg-pink-100 hover:bg-pink-200 text-pink-950 font-black text-sm flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
                        disabled={qty <= 0}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex-1 relative">
                        <input
                          type="number"
                          min={0}
                          value={qty}
                          onChange={(e) => handleSetStockForSize(sz, parseInt(e.target.value) || 0)}
                          className={`w-full py-1 text-center font-mono font-black text-sm border rounded-lg focus:ring-2 focus:ring-pink-700 ${
                            isZero 
                              ? 'bg-rose-100/60 border-rose-300 text-rose-900' 
                              : isLow 
                                ? 'bg-amber-100/60 border-amber-300 text-amber-950' 
                                : 'bg-pink-50/30 border-pink-200 text-pink-950'
                          }`}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAdjustStock(sz, 1)}
                        className="w-8 h-8 rounded-lg bg-pink-100 hover:bg-pink-200 text-pink-950 font-black text-sm flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick Unit Increment Buttons */}
                    <div className="grid grid-cols-4 gap-1">
                      <button
                        type="button"
                        onClick={() => handleSetStockForSize(sz, 0)}
                        className="py-0.5 text-[9px] font-bold rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                        title="Set to 0 units"
                      >
                        0 (Out)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustStock(sz, 1)}
                        className="py-0.5 text-[9px] font-bold rounded bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors cursor-pointer font-mono"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustStock(sz, 5)}
                        className="py-0.5 text-[9px] font-bold rounded bg-pink-50 hover:bg-pink-100 text-pink-900 border border-pink-200 font-mono transition-colors cursor-pointer"
                      >
                        +5
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustStock(sz, 10)}
                        className="py-0.5 text-[9px] font-bold rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-mono transition-colors cursor-pointer"
                      >
                        +10
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 text-center text-amber-900 space-y-1">
          <p className="font-extrabold text-xs">⚠️ No sizes selected yet</p>
          <p className="text-[11px] text-amber-800">
            Click on any standard size above (or choose a quick preset / type a custom size) to activate sizes and specify manual inventory units.
          </p>
        </div>
      )}
    </div>
  );
};
