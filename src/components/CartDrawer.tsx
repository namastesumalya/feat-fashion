import React, { useState, useMemo } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag, ShieldCheck, Check, Palette, BadgePercent, Ticket } from 'lucide-react';
import { CartItem, PromoCode, AppliedPromo } from '../types';
import { getColorHex } from '../utils/colors';
import { getItemVariantImage, getCategoryFallbackImage } from '../utils/productImage';
import { CouponMilestonesCard } from './CouponMilestonesCard';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, size: string, delta: number, color?: string) => void;
  onRemoveItem: (productId: string, size: string, color?: string) => void;
  appliedPromo: { code: string; discount: number; description: string } | null;
  appliedPromos?: AppliedPromo[];
  onApplyPromo: (code: string) => Promise<{ valid: boolean; message?: string }> | void;
  onRemovePromo: (code?: string) => void;
  onProceedToCheckout: () => void;
  promos: PromoCode[];
  onExploreCategory?: (category: string) => void;
  onExploreCollection?: (collection: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  appliedPromo,
  appliedPromos,
  onApplyPromo,
  onRemovePromo,
  onProceedToCheckout,
  promos = [],
  onExploreCategory,
  onExploreCollection
}) => {
  const [promoError, setPromoError] = useState<string | null>(null);
  const [applyingCode, setApplyingCode] = useState<string | null>(null);

  const effectiveAppliedPromos = useMemo(() => {
    if (appliedPromos && appliedPromos.length > 0) return appliedPromos;
    if (appliedPromo) return [appliedPromo];
    return [];
  }, [appliedPromos, appliedPromo]);

  const isCodeApplied = (code: string) => {
    const clean = code.trim().toUpperCase();
    return effectiveAppliedPromos.some(p => p.code.toUpperCase() === clean);
  };

  const handleQuickApplyPromo = async (code: string) => {
    if (!onApplyPromo) return;
    const clean = code.trim().toUpperCase();
    if (isCodeApplied(clean)) {
      if (onRemovePromo) onRemovePromo(clean);
      return;
    }

    setApplyingCode(clean);
    setPromoError(null);
    try {
      const res = await onApplyPromo(clean);
      if (res && !res.valid) {
        setPromoError(res.message || `Could not apply coupon ${clean}`);
      }
    } catch (err: any) {
      setPromoError(err?.message || `Error applying ${clean}`);
    } finally {
      setApplyingCode(null);
    }
  };

  if (!isOpen) return null;

  const totalMrp = cartItems.reduce((acc, item) => acc + item.product.originalPrice * item.quantity, 0);
  const totalDiscount = cartItems.reduce((acc, item) => acc + (item.product.originalPrice - item.product.price) * item.quantity, 0);
  const subtotal = totalMrp - totalDiscount;
  const couponDiscount = Math.min(
    Math.max(0, subtotal - 1),
    effectiveAppliedPromos.reduce((sum, p) => sum + p.discount, 0)
  );
  // 100% Free delivery nationwide on all products (no extra shipping charges even under 1000 rupees)
  const deliveryFee = 0;
  const finalPayable = Math.max(subtotal > 0 ? 1 : 0, subtotal - couponDiscount + deliveryFee);

  const getItemImage = (item: CartItem) => {
    return getItemVariantImage(item.product, item.selectedColor);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-800 to-amber-700 text-amber-100 p-4 flex items-center justify-between border-b border-amber-300/30">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-300" />
            <h3 className="font-extrabold text-base text-amber-200">
              Shopping Cart ({cartItems.reduce((a, b) => a + b.quantity, 0)} Items)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full text-amber-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-4 space-y-4">
          {cartItems.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 bg-pink-50 text-pink-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                🛍️
              </div>
              <p className="font-bold text-gray-800 text-base">Your Cart is Empty!</p>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Explore our pink & golden festive kurtis, sarees, and suits collection to add items.
              </p>
              <button
                onClick={onClose}
                className="bg-amber-400 text-pink-950 font-bold px-5 py-2 rounded-xl text-xs hover:bg-amber-300 transition-all shadow"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <>
              {cartItems.map((item) => (
                <div
                  key={`${item.product.id}-${item.selectedSize}-${item.selectedColor || ''}`}
                  className="bg-white border border-pink-100 rounded-xl p-3 flex gap-3 shadow-sm hover:border-pink-200 transition-all"
                >
                  <img
                    src={getItemImage(item)}
                    alt={`${item.product.name} - ${item.selectedColor || 'Default'}`}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const fb = getCategoryFallbackImage(item.product?.category, item.product?.collection, item.product?.name);
                      if ((e.currentTarget as HTMLImageElement).src !== fb && !(e.currentTarget as HTMLImageElement).src.endsWith(fb)) {
                        (e.currentTarget as HTMLImageElement).src = fb;
                      }
                    }}
                    className="w-16 h-20 object-cover rounded-lg shrink-0 border border-pink-50"
                  />

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{item.product.name}</h4>
                        <button
                          onClick={() => onRemoveItem(item.product.id, item.selectedSize, item.selectedColor)}
                          className="text-gray-400 hover:text-red-500 p-0.5"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-gray-500 mt-1">
                        <span className="bg-pink-50 text-pink-800 font-bold px-1.5 py-0.5 rounded border border-pink-200">
                          Size: {item.selectedSize}
                        </span>
                        {item.selectedColor && item.selectedColor !== 'Default' && item.selectedColor !== 'Original' && ((item.product.colorVariants && item.product.colorVariants.length > 1) || (item.product.colors && item.product.colors.length > 1)) && (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 font-bold px-1.5 py-0.5 rounded border border-amber-200">
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-gray-300 shadow-inner"
                              style={{ backgroundColor: getColorHex(item.selectedColor) }}
                            />
                            <span>{item.selectedColor}</span>
                          </span>
                        )}
                        <span>• {item.product.category}</span>
                        {(() => {
                          const avail = (item.selectedSize && item.product.sizeStock && item.product.sizeStock[item.selectedSize] !== undefined)
                            ? Number(item.product.sizeStock[item.selectedSize])
                            : Number(item.product.stockCount || 0);
                          if (avail <= 0) {
                            return (
                              <span className="bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded text-[10px] border border-red-200">
                                Out of stock
                              </span>
                            );
                          }
                          if (avail > 0 && avail <= 3) {
                            return (
                              <span className="bg-amber-100 text-amber-900 font-black px-1.5 py-0.5 rounded text-[10px] border border-amber-300">
                                Only {avail} left in Size {item.selectedSize}
                              </span>
                            );
                          }
                          return (
                            <span className="bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[10px] border border-emerald-200">
                              {avail} pcs in stock
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-black text-gray-900">
                          ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-gray-400 line-through">
                          ₹{(item.product.originalPrice * item.quantity).toLocaleString('en-IN')}
                        </span>
                        {item.quantity > 1 && (
                          <span className="text-[10px] font-extrabold text-pink-700 bg-pink-50 px-1.5 py-0.5 rounded border border-pink-200">
                            {item.quantity} pieces
                          </span>
                        )}
                      </div>

                      {/* Quantity Stepper */}
                      {(() => {
                        const avail = (item.selectedSize && item.product.sizeStock && item.product.sizeStock[item.selectedSize] !== undefined)
                          ? Number(item.product.sizeStock[item.selectedSize])
                          : Number(item.product.stockCount || 0);
                        const isMax = item.quantity >= avail;

                        return (
                          <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, item.selectedSize, -1, item.selectedColor)}
                              className="p-1 hover:bg-gray-200 text-gray-600 rounded-l-lg transition-colors cursor-pointer"
                              title="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-xs font-bold text-gray-800">{item.quantity}</span>
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, item.selectedSize, 1, item.selectedColor)}
                              className={`p-1 text-gray-600 rounded-r-lg transition-colors cursor-pointer ${
                                isMax ? 'opacity-40 hover:bg-transparent text-gray-400' : 'hover:bg-gray-200'
                              }`}
                              title={isMax ? `Only ${avail} unit(s) available in stock` : 'Increase quantity'}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))}

              {/* Applied & Available Store Coupons & Milestones Card */}
              <CouponMilestonesCard
                currentAmount={subtotal}
                appliedPromos={effectiveAppliedPromos}
                onApplyPromo={onApplyPromo}
                onRemovePromo={onRemovePromo}
                variant="drawer"
              />

              {/* Flipkart Style Price Details Breakdown */}
              <div className="border border-gray-200 rounded-xl p-3.5 space-y-2 text-xs bg-white">
                <div className="font-extrabold text-gray-500 uppercase tracking-wider text-[10px] border-b pb-1.5">
                  Price Details
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Total MRP ({cartItems.length} items)</span>
                  <span>₹{totalMrp.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Product Discount</span>
                  <span>- ₹{totalDiscount.toLocaleString('en-IN')}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Coupon Discount ({appliedPromo.code})</span>
                    <span>- ₹{appliedPromo.discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Charges</span>
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-700 font-bold uppercase text-[10px]">FREE</span>
                  ) : (
                    <span>₹{deliveryFee}</span>
                  )}
                </div>

                <div className="border-t border-dashed pt-2 flex justify-between font-black text-sm text-gray-900">
                  <span>Total Amount</span>
                  <span className="text-pink-800">₹{finalPayable.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Checkout Action */}
        {cartItems.length > 0 && (
          <div className="p-4 bg-white border-t border-pink-100 shadow-lg flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-gray-400 font-medium uppercase">Total Payable</p>
              <p className="text-lg font-black text-pink-800">₹{finalPayable.toLocaleString('en-IN')}</p>
            </div>

            <button
              onClick={onProceedToCheckout}
              className="flex-1 bg-gradient-to-r from-pink-700 to-pink-600 hover:from-pink-800 hover:to-pink-700 text-amber-200 font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 border border-amber-300/40 active:scale-95"
              id="btn-proceed-checkout"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
