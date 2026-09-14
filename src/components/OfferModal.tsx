import React, { useState } from 'react';
import { X, Copy, Check, Gift, Tag, Award, Zap } from 'lucide-react';
import { PromoCode } from '../types';

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  promos: PromoCode[];
  onApplyPromoToCart?: (code: string) => void;
}

export const OfferModal: React.FC<OfferModalProps> = ({
  isOpen,
  onClose,
  promos,
  onApplyPromoToCart
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [spinResult, setSpinResult] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSpinWheel = () => {
    setIsSpinning(true);
    setTimeout(() => {
      const luckyCodes = ['Welcome76', 'FEAT6', 'FEAT2.0'];
      const won = luckyCodes[Math.floor(Math.random() * luckyCodes.length)];
      setSpinResult(won);
      setIsSpinning(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-pink-200 overflow-hidden relative animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-pink-800 via-pink-700 to-amber-700 text-amber-100 p-4 flex items-center justify-between border-b border-amber-300/30">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-400 text-pink-950 rounded-lg">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-amber-200">Feat Offer Corner</h3>
              <p className="text-xs text-amber-100/80">Exclusive Festive Discounts & Promo Codes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full text-amber-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 max-h-[80vh] overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-4 sm:space-y-5">
          
          {/* Spin & Win Mini Game */}
          <div className="bg-gradient-to-br from-amber-50 to-pink-50 p-4 rounded-xl border border-amber-200 text-center relative overflow-hidden">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-amber-600 animate-bounce" />
              <span className="font-extrabold text-xs uppercase text-pink-900 tracking-wider">Festive Lucky Coupon Generator</span>
            </div>
            <p className="text-xs text-gray-600 mb-3">Spin to unlock an instant secret promo code!</p>

            {spinResult ? (
              <div className="bg-white p-3 rounded-lg border border-amber-300 shadow-sm inline-block animate-pulse">
                <p className="text-xs text-gray-500 font-medium">🎉 Congratulations! You won:</p>
                <p className="text-xl font-black text-pink-700 font-mono tracking-widest my-1">{spinResult}</p>
                <button
                  onClick={() => handleCopy(spinResult)}
                  className="text-xs font-bold text-amber-800 underline"
                >
                  {copiedCode === spinResult ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleSpinWheel}
                disabled={isSpinning}
                className="bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-pink-950 font-black px-5 py-2 rounded-xl text-xs shadow-md transition-transform hover:scale-105 active:scale-95 border border-amber-300"
              >
                {isSpinning ? 'Spinning Wheel...' : '✨ SPIN & UNLOCK COUPON'}
              </button>
            )}
          </div>

          {/* Active Promo Codes List */}
          <div>
            <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-pink-600" />
              <span>Available Promo Codes</span>
            </h4>

            <div className="space-y-3">
              {/* Prepaid Special Offer Card */}
              <div className="border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-600 text-white font-bold text-xs px-2.5 py-0.5 rounded shadow-2xs flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-200" />
                      <span>PREPAID SPECIAL</span>
                    </span>
                    <span className="bg-amber-200/80 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-300">
                      NO CODE NEEDED
                    </span>
                  </div>
                  <p className="text-xs font-bold text-gray-900">Flat discount of 55 rupees on all prepaid orders</p>
                  <p className="text-[10px] text-gray-600">Automatically deducted at checkout when paying via UPI, Cards, NetBanking. (COD orders excluded)</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-1 rounded-md border border-amber-300">
                    Auto-Applied
                  </span>
                </div>
              </div>

              {promos
                .filter(p => p.code.toUpperCase() !== 'FEAT200' && p.code.toUpperCase() !== 'FLAT200')
                .map((promo) => (
                <div
                  key={promo.code}
                  className="border border-pink-200 bg-pink-50/40 rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-pink-300 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-pink-700 text-amber-200 font-mono font-extrabold text-xs px-2.5 py-0.5 rounded border border-amber-300/40 tracking-wider">
                        {promo.code}
                      </span>
                      {(promo.isFirstOrderOnly || promo.code.toUpperCase() === 'WELCOME76') && (
                        <span className="bg-amber-300 text-pink-950 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-400">
                          FIRST ORDER ONLY
                        </span>
                      )}
                      {promo.collectionRestricted && (
                        <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                          {promo.collectionRestricted}
                        </span>
                      )}
                      {(promo.categoriesRestricted?.length || promo.categoryRestricted) && (
                        <span className="bg-purple-100 text-purple-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-300">
                          {Array.isArray(promo.categoriesRestricted) ? promo.categoriesRestricted.join(' & ') : String(promo.categoryRestricted)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-gray-800">{promo.description}</p>
                    <p className="text-[10px] text-gray-500">
                      {promo.discountType === 'percent' ? `${promo.discountValue}% OFF` : `₹${promo.discountValue} OFF`}
                      {promo.minOrderValue > 0 ? ` • Min Order: ₹${promo.minOrderValue}` : ' • No Minimum Order'}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCopy(promo.code)}
                      className="bg-white hover:bg-pink-100 text-pink-900 border border-pink-300 px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      {copiedCode === promo.code ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Extra Bank & Gateway Perks */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center gap-3">
            <Award className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Instant Bank Discount</p>
              <p className="text-[11px] text-emerald-700">Get additional 10% Instant Discount on HDFC Bank & Axis Bank Credit Cards at payment step.</p>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 p-3 text-center border-t border-gray-100">
          <button
            onClick={onClose}
            className="text-xs font-bold text-gray-600 hover:text-gray-900"
          >
            Close & Continue Shopping
          </button>
        </div>

      </div>
    </div>
  );
};
