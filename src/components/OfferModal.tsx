import React, { useState } from 'react';
import { X, Copy, Check, Gift, Tag, Award, Zap } from 'lucide-react';
import { PromoCode } from '../types';

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  promos: PromoCode[];
  onApplyPromoToCart?: (code: string) => Promise<{ valid: boolean; message?: string }> | void;
  appliedPromos?: { code: string; discount?: number }[];
  isFirstOrder?: boolean;
}

export const OfferModal: React.FC<OfferModalProps> = ({
  isOpen,
  onClose,
  promos,
  onApplyPromoToCart,
  appliedPromos = [],
  isFirstOrder = false
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [applyingCode, setApplyingCode] = useState<string | null>(null);
  const [applyFeedback, setApplyFeedback] = useState<{ code: string; msg: string; isError?: boolean } | null>(null);
  const [spinResult, setSpinResult] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  if (!isOpen) return null;

  const isCodeApplied = (code: string) => {
    return appliedPromos.some(p => p.code.toUpperCase() === code.toUpperCase());
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleApply = async (code: string) => {
    if (!onApplyPromoToCart) return;
    setApplyingCode(code);
    setApplyFeedback(null);
    try {
      const res = await onApplyPromoToCart(code);
      if (res && !res.valid) {
        setApplyFeedback({ code, msg: res.message || 'Could not apply code', isError: true });
      } else {
        setApplyFeedback({ code, msg: `Promo ${code} applied to cart!`, isError: false });
      }
    } catch (err: any) {
      setApplyFeedback({ code, msg: err?.message || 'Error applying code', isError: true });
    } finally {
      setApplyingCode(null);
    }
  };

  const handleSpinWheel = () => {
    setIsSpinning(true);
    setTimeout(() => {
      const luckyCodes = isFirstOrder 
        ? ['Welcome76', 'GORBO', 'BEAUTIFULYOU', 'INDIANA'] 
        : ['FEAT6', 'FEAT2.0', 'GORBO', 'BEAUTIFULYOU', 'INDIANA'];
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

          {/* Automatic Payment Offer (Not a Promo Code) */}
          <div className="border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 rounded-2xl p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="bg-amber-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg shadow-2xs flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-200" />
                  <span>PREPAID OFFER • ₹55 FLAT OFF</span>
                </span>
                <span className="bg-amber-200/90 text-amber-950 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-400">
                  PAYMENT BENEFIT (NOT A PROMO CODE)
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-300">
                Auto-Applied on UPI/Cards
              </span>
            </div>
            
            <p className="text-xs font-bold text-gray-900 leading-snug">
              Get an instant flat discount of ₹55 automatically on all prepaid orders (UPI, Credit/Debit Cards, NetBanking).
            </p>
            
            <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/80 text-[11px] text-amber-950 font-medium">
              💡 <strong>Stacking Allowed:</strong> Prepaid offer is <em>not</em> considered a promo code. You can freely apply promo codes like <strong className="font-mono text-pink-900 font-black">GORBO</strong> (5% OFF Sarees), <strong className="font-mono text-pink-900 font-black">BHUSWARG</strong> (6% OFF Firdausi), or <strong className="font-mono text-pink-900 font-black">BEAUTIFULYOU</strong> (4% OFF Dress Materials) alongside your ₹55 prepaid discount!
            </div>
          </div>

          {/* Feedback banner if code applied */}
          {applyFeedback && (
            <div className={`p-3 rounded-xl text-xs font-bold border flex items-center justify-between gap-2 ${
              applyFeedback.isError
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-emerald-50 text-emerald-900 border-emerald-300'
            }`}>
              <span>{applyFeedback.msg}</span>
              <button
                type="button"
                onClick={() => setApplyFeedback(null)}
                className="text-xs opacity-70 hover:opacity-100 font-bold px-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Active Promo Codes List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-pink-600" />
                <span>Available Promo Codes</span>
              </h4>
              <span className="text-[10px] text-pink-900 font-semibold bg-pink-100 px-2 py-0.5 rounded-full">
                Stack up to 2 codes + Prepaid ₹55
              </span>
            </div>

            <div className="space-y-3">
              {promos
                .filter(p => {
                  const code = p.code.toUpperCase();
                  if (code === 'FEAT200' || code === 'FLAT200') return false;
                  // If first order, don't show FEAT6 or FEAT2.0
                  if (isFirstOrder && (code === 'FEAT6' || code === 'FEAT2.0')) return false;
                  // If not first order, don't show WELCOME76
                  if (!isFirstOrder && code === 'WELCOME76') return false;
                  return true;
                })
                .map((promo) => {
                  const isApplied = isCodeApplied(promo.code);
                  const isBusy = applyingCode === promo.code;

                  return (
                    <div
                      key={promo.code}
                      className={`border rounded-xl p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isApplied
                          ? 'border-emerald-300 bg-emerald-50/50'
                          : 'border-pink-200 bg-pink-50/40 hover:border-pink-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-pink-700 text-amber-200 font-mono font-extrabold text-xs px-2.5 py-0.5 rounded border border-amber-300/40 tracking-wider">
                            {promo.code}
                          </span>
                          {isApplied && (
                            <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>APPLIED TO CART</span>
                            </span>
                          )}
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
                          <span className="text-emerald-700 font-semibold ml-1.5">• Stacks with ₹55 Prepaid Offer</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => handleCopy(promo.code)}
                          className="bg-white hover:bg-pink-100 text-pink-900 border border-pink-300 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Copy promo code"
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

                        {onApplyPromoToCart && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleApply(promo.code)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all shadow-2xs cursor-pointer flex items-center gap-1 ${
                              isApplied
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-pink-700 hover:bg-pink-800 text-amber-200 active:scale-95'
                            }`}
                          >
                            {isApplied ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </>
                            ) : (
                              <span>{isBusy ? 'Applying...' : 'Apply Code'}</span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
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
