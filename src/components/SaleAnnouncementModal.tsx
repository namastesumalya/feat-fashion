import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Clock, Tag, Gift, ArrowRight, ShieldCheck, Zap, Info, Calendar } from 'lucide-react';
import { PromoCode } from '../types';

interface SaleAnnouncementModalProps {
  promo: PromoCode | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyPromo?: (code: string) => void;
}

export const SaleAnnouncementModal: React.FC<SaleAnnouncementModalProps> = ({
  promo,
  isOpen,
  onClose,
  onApplyPromo
}) => {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  // Expiry countdown timer
  useEffect(() => {
    if (!promo?.validUntil) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const expiryDateStr = promo.validUntil.includes('T') ? promo.validUntil : `${promo.validUntil}T23:59:59`;
      const difference = new Date(expiryDateStr).getTime() - new Date().getTime();

      if (difference <= 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [promo?.validUntil]);

  if (!isOpen || !promo) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(promo.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleApply = () => {
    if (onApplyPromo) {
      onApplyPromo(promo.code);
      setApplied(true);
      setTimeout(() => {
        setApplied(false);
        onClose();
      }, 900);
    } else {
      handleCopyCode();
    }
  };

  const formattedExpiry = promo.validUntil ? (() => {
    try {
      const d = new Date(promo.validUntil.includes('T') ? promo.validUntil : `${promo.validUntil}T23:59:59`);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: promo.validUntil.includes('T') ? '2-digit' : undefined,
        minute: promo.validUntil.includes('T') ? '2-digit' : undefined
      });
    } catch {
      return promo.validUntil;
    }
  })() : null;

  const formattedValidFrom = promo.validFrom ? (() => {
    try {
      const d = new Date(promo.validFrom.includes('T') ? promo.validFrom : `${promo.validFrom}T00:00:00`);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return promo.validFrom;
    }
  })() : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-pink-200 overflow-hidden relative transform transition-all animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Top Decorative Festive Header */}
        <div className="relative bg-gradient-to-r from-pink-950 via-pink-900 to-amber-900 text-amber-100 p-5 sm:p-6 overflow-hidden border-b border-amber-400/30">
          {/* Subtle background glow & motifs */}
          <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-8 -top-8 w-36 h-36 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-white/20 rounded-full text-amber-200 transition-colors z-10"
            aria-label="Close sale popup"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Eyebrow Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-amber-400 text-pink-950 shadow-sm border border-amber-300">
              <Tag className="w-3 h-3 text-pink-950" />
              <span>{promo.popupBadge || 'SPECIAL CELEBRATION OFFER'}</span>
            </span>
            {promo.collectionRestricted && (
              <span className="text-[10px] font-bold text-amber-200 bg-white/10 px-2 py-0.5 rounded-full border border-amber-300/30">
                {promo.collectionRestricted}
              </span>
            )}
          </div>

          <h3 className="font-serif text-xl sm:text-2xl font-black text-amber-100 tracking-tight leading-snug">
            {promo.popupTitle || promo.name || 'Grand Festive Sale & Gift Coupon!'}
          </h3>

          <p className="text-xs text-amber-200/90 mt-1 font-medium leading-relaxed">
            {promo.popupMessage || promo.description || 'Enjoy exclusive savings on authentic handloom sarees, kurtis & designer salwar suits.'}
          </p>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          
          {/* Reason for Sale Banner - Specifying WHY admin is giving the coupon code */}
          {promo.reasonForSale && (
            <div className="bg-gradient-to-r from-amber-50 to-pink-50 rounded-2xl p-4 border border-amber-200/80 shadow-xs relative overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-400/20 text-amber-900 shrink-0 mt-0.5">
                  <Gift className="w-5 h-5 text-amber-800" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-950">
                      Why We Are Giving This Special Offer
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-700" />
                  </div>
                  <p className="text-xs text-gray-800 font-semibold leading-relaxed">
                    "{promo.reasonForSale}"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Coupon Code Voucher Card */}
          <div className="bg-gradient-to-br from-pink-50 via-white to-amber-50 border-2 border-dashed border-pink-300 rounded-2xl p-4 sm:p-5 text-center relative overflow-hidden shadow-inner">
            <div className="space-y-1 mb-3">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                Use Coupon Code at Checkout
              </span>
              <div className="text-2xl sm:text-3xl font-black text-pink-950">
                {promo.discountType === 'percent' ? (
                  <span>GET <span className="text-pink-700">{promo.discountValue}% OFF</span></span>
                ) : (
                  <span>GET <span className="text-pink-700">₹{promo.discountValue} FLAT OFF</span></span>
                )}
              </div>
            </div>

            {/* Coupon Code Pill with Copy Action */}
            <div className="inline-flex items-center justify-center gap-2 sm:gap-3 bg-pink-950 text-amber-200 px-4 sm:px-6 py-2.5 rounded-2xl shadow-md border border-amber-400/40 my-1">
              <Tag className="w-4 h-4 text-amber-400" />
              <span className="font-mono font-black text-base sm:text-lg tracking-widest select-all">
                {promo.code}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="ml-2 bg-amber-400 hover:bg-amber-300 text-pink-950 px-2.5 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1"
                title="Copy coupon code"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-gray-500 font-medium mt-2">
              Minimum cart order value: <strong className="text-gray-800">₹{promo.minOrderValue}</strong>
            </p>
          </div>

          {/* Expiry Date & Countdown Timer Indicator */}
          {formattedExpiry && (
            <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                <span className="font-extrabold text-rose-950 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-rose-600 animate-pulse" />
                  <span>Coupon Validity & Expiry:</span>
                </span>
                <span className="font-black text-rose-900 bg-white px-2.5 py-0.5 rounded-lg border border-rose-200">
                  Use Before: {formattedExpiry}
                </span>
              </div>

              {/* Real-time countdown boxes if time left */}
              {timeLeft && (
                <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                  <div className="bg-white rounded-xl py-1.5 px-1 border border-rose-200 shadow-2xs">
                    <span className="block text-sm font-black text-rose-950 leading-tight">{timeLeft.days}</span>
                    <span className="text-[9px] uppercase font-bold text-gray-500">Days</span>
                  </div>
                  <div className="bg-white rounded-xl py-1.5 px-1 border border-rose-200 shadow-2xs">
                    <span className="block text-sm font-black text-rose-950 leading-tight">{timeLeft.hours}</span>
                    <span className="text-[9px] uppercase font-bold text-gray-500">Hours</span>
                  </div>
                  <div className="bg-white rounded-xl py-1.5 px-1 border border-rose-200 shadow-2xs">
                    <span className="block text-sm font-black text-rose-950 leading-tight">{timeLeft.minutes}</span>
                    <span className="text-[9px] uppercase font-bold text-gray-500">Mins</span>
                  </div>
                  <div className="bg-white rounded-xl py-1.5 px-1 border border-rose-200 shadow-2xs">
                    <span className="block text-sm font-black text-rose-950 leading-tight">{timeLeft.seconds}</span>
                    <span className="text-[9px] uppercase font-bold text-gray-500">Secs</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Schedule / Validity Date Summary if not expiring soon */}
          {!formattedExpiry && formattedValidFrom && (
            <div className="bg-pink-50 border border-pink-200 rounded-xl p-2.5 text-center text-xs text-pink-900 font-semibold flex items-center justify-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-pink-700" />
              <span>Valid From: {formattedValidFrom}</span>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 sm:p-5 bg-pink-50/50 border-t border-pink-100 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-xl transition-colors text-center order-2 sm:order-1"
          >
            Explore Catalog First
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="w-full sm:flex-1 bg-gradient-to-r from-pink-900 via-pink-800 to-amber-700 hover:from-pink-800 hover:to-amber-600 text-amber-200 font-extrabold py-3 px-5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-xs order-1 sm:order-2 border border-amber-300/40"
          >
            {applied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Coupon Applied to Cart!</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Claim Offer & Apply to Cart</span>
                <ArrowRight className="w-4 h-4 text-amber-300" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
