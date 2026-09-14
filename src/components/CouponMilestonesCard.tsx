import React, { useState } from 'react';
import { BadgePercent, Ticket, Check, Lock, Unlock, Sparkles, AlertCircle, ChevronRight, Zap } from 'lucide-react';
import { AppliedPromo } from '../types';

interface CouponMilestonesCardProps {
  currentAmount: number;
  appliedPromos?: (AppliedPromo | { code: string; discount: number; description?: string })[];
  onApplyPromo?: (code: string) => Promise<{ valid: boolean; message?: string }> | void;
  onRemovePromo?: (code: string) => void;
  variant?: 'drawer' | 'checkout' | 'product';
  isFirstOrder?: boolean;
}

export const CouponMilestonesCard: React.FC<CouponMilestonesCardProps> = ({
  currentAmount,
  appliedPromos = [],
  onApplyPromo,
  onRemovePromo,
  variant = 'drawer',
  isFirstOrder = false
}) => {
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isApplied = (code: string) => {
    const clean = code.trim().toUpperCase();
    return appliedPromos.some(p => p.code.trim().toUpperCase() === clean);
  };

  const handleTogglePromo = async (code: string) => {
    if (!onApplyPromo) return;
    const clean = code.trim().toUpperCase();
    setErrorMessage(null);

    if (isApplied(clean)) {
      if (onRemovePromo) onRemovePromo(clean);
      return;
    }

    // Mutual exclusivity: remove the other milestone code before applying
    if (clean === 'FEAT2.0' && isApplied('FEAT6') && onRemovePromo) {
      onRemovePromo('FEAT6');
    } else if (clean === 'FEAT6' && isApplied('FEAT2.0') && onRemovePromo) {
      onRemovePromo('FEAT2.0');
    }

    setBusyCode(clean);
    try {
      const res = await onApplyPromo(clean);
      if (res && !res.valid) {
        setErrorMessage(res.message || `Could not apply ${clean}`);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || `Error applying ${clean}`);
    } finally {
      setBusyCode(null);
    }
  };

  // Milestone Definitions
  const tiers = [
    {
      code: 'FEAT6',
      threshold: 1300,
      badge: '₹60 OFF',
      title: 'Orders ₹1,300 - ₹2,000',
      description: 'FEAT6 promo code is applicable when billing value is more than 1300 rupees (up to ₹2,000)',
      shortDesc: '₹60 discount for ₹1,300 - ₹2,000'
    },
    {
      code: 'FEAT2.0',
      threshold: 2000,
      badge: '₹200 OFF',
      title: 'Orders > ₹2,000',
      description: 'FEAT2.0 promo code is applicable when billing value is more than 2000 rupees',
      shortDesc: 'Flat ₹200 discount over ₹2,000'
    }
  ];

  // Available milestone tiers:
  // - under 1300: don't show FEAT6 or FEAT2.0
  // - under 2000 (over 1300): show FEAT6, don't show FEAT2.0
  // - over 2000: show FEAT2.0, don't show FEAT6 (they do not combine)
  const availableTiers = tiers.filter(tier => {
    if (currentAmount > 2000) {
      return tier.code === 'FEAT2.0';
    }
    if (currentAmount > 1300) {
      return tier.code === 'FEAT6';
    }
    return false;
  });

  // Progress calculations (capped at 2,000)
  const progressPercent = Math.min(100, Math.max(0, (currentAmount / 2000) * 100));

  // Milestone Status
  const feat6Unlocked = currentAmount > 1300 && currentAmount <= 2000;
  const feat2Unlocked = currentAmount > 2000;

  return (
    <div className="bg-gradient-to-br from-pink-50/90 via-white to-rose-50/50 rounded-2xl border border-pink-200 shadow-sm p-3.5 sm:p-4 space-y-3.5">
      {/* Header with Ek mein Do offer title & milestone tier pill */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-pink-950">
          <div className="p-1.5 bg-pink-600 text-amber-200 rounded-lg shadow-2xs">
            <BadgePercent className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-pink-950">
                Ek mein Do offer
              </h4>
              <span className="bg-pink-100 text-pink-900 border border-pink-200 text-[10px] font-extrabold px-1.5 py-0.2 rounded">
                Tier Rewards
              </span>
            </div>
            <p className="text-[11px] text-pink-900/80 font-medium">
              Shop more to unlock higher discount tiers!
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono font-black text-pink-950 bg-white px-2 py-0.5 rounded-lg border border-pink-200 shadow-2xs">
          Cart: ₹{Math.round(currentAmount).toLocaleString('en-IN')}
        </span>
      </div>

      {/* Active Stacked Coupons Banner */}
      {appliedPromos.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[10px] font-bold text-gray-500 uppercase flex items-center justify-between">
            <span>Applied Coupons:</span>
            <span className="text-emerald-700 font-extrabold">
              Total Savings: ₹{appliedPromos.reduce((acc, p) => acc + (p.discount || 0), 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {appliedPromos.map((p) => (
              <div
                key={p.code}
                className="bg-emerald-100/80 border border-emerald-300 text-emerald-950 px-2 py-1 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs"
              >
                <Check className="w-3 h-3 text-emerald-700 shrink-0" />
                <span className="font-mono font-black">{p.code}</span>
                <span className="font-extrabold text-[11px] text-emerald-800">
                  (-₹{p.discount.toLocaleString('en-IN')})
                </span>
                {onRemovePromo && (
                  <button
                    type="button"
                    onClick={() => onRemovePromo(p.code)}
                    className="ml-1 text-[11px] text-red-600 hover:text-red-800 font-bold px-1 rounded hover:bg-red-50 cursor-pointer"
                    title={`Remove ${p.code}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Milestone Alert Banner */}
      <div className="p-2.5 rounded-xl border text-xs leading-relaxed flex items-center gap-2 transition-all bg-white border-pink-200/90 shadow-2xs">
        <Sparkles className="w-4 h-4 text-pink-600 shrink-0" />
        <div className="flex-1 min-w-0">
          {currentAmount <= 1300 && (
            <p className="text-gray-800 text-[11px]">
              Shop for <span className="font-black text-pink-800">₹{(1300 - currentAmount + 1).toLocaleString('en-IN')}</span> more to unlock <span className="font-mono font-black text-pink-800 bg-pink-100 px-1 py-0.5 rounded">FEAT6</span> (₹60 OFF)!
            </p>
          )}
          {feat6Unlocked && (
            <p className="text-gray-800 text-[11px]">
              🎉 <span className="font-bold text-emerald-800">FEAT6 Unlocked!</span> Add <span className="font-black text-pink-800">₹{(2000 - currentAmount + 1).toLocaleString('en-IN')}</span> more to upgrade to <span className="font-mono font-black text-pink-800 bg-pink-100 px-1 py-0.5 rounded">FEAT2.0</span> (₹200 OFF)!
            </p>
          )}
          {feat2Unlocked && (
            <p className="text-emerald-900 font-bold text-[11px]">
              🔥 <span className="text-pink-900 font-black">Grand Milestone Reward Unlocked!</span> Enjoy <span className="font-mono font-black text-pink-800 bg-pink-100 px-1 py-0.5 rounded">FEAT2.0</span> for flat ₹200 OFF on your order!
            </p>
          )}
        </div>
      </div>

      {/* Visual Milestone Progress Track */}
      <div className="space-y-1.5 pt-0.5">
        <div className="relative w-full h-2 bg-pink-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Milestone Threshold Indicators */}
        <div className="flex justify-between text-[10px] text-gray-500 font-medium px-0.5">
          <div className={`flex flex-col items-start ${currentAmount > 1300 ? 'text-pink-900 font-bold' : ''}`}>
            <span>₹1,300</span>
            <span className="text-[9px] font-mono font-extrabold text-pink-700">FEAT6 (₹60 OFF)</span>
          </div>
          <div className={`flex flex-col items-end ${currentAmount > 2000 ? 'text-pink-900 font-bold' : ''}`}>
            <span>₹2,000+</span>
            <span className="text-[9px] font-mono font-extrabold text-pink-700">FEAT2.0 (₹200 OFF)</span>
          </div>
        </div>
      </div>

      {/* Available Milestone Coupons Grid (Ek mein Do offer) */}
      {availableTiers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {availableTiers.map((tier) => {
            const isCouponApplied = isApplied(tier.code);
            const isBusy = busyCode === tier.code.toUpperCase();

            return (
              <div
                key={tier.code}
                className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between ${
                  isCouponApplied
                    ? 'bg-emerald-50/90 border-emerald-300 shadow-2xs'
                    : 'bg-white border-pink-300 shadow-2xs hover:border-pink-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className={`font-mono font-black text-xs px-1.5 py-0.5 rounded border ${
                      isCouponApplied
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-pink-700 text-amber-200 border-pink-700'
                    }`}>
                      {tier.code}
                    </span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                      isCouponApplied
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}>
                      {tier.badge}
                    </span>
                  </div>

                  <p className="text-[11px] font-bold text-gray-900 leading-tight">
                    {tier.title}
                  </p>
                  <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5 leading-snug">
                    {tier.shortDesc}
                  </p>
                </div>

                {/* Action / Apply button */}
                <div className="mt-2 pt-1.5 border-t border-gray-100">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleTogglePromo(tier.code)}
                    className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isCouponApplied
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                        : 'bg-pink-600 hover:bg-pink-700 text-white shadow-2xs active:scale-95'
                    }`}
                  >
                    {isCouponApplied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Applied (Tap to Remove)</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-amber-200" />
                        <span>{isBusy ? 'Applying...' : 'Apply Coupon'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white/80 border border-dashed border-pink-300 rounded-xl p-3 text-center space-y-1">
          <p className="text-xs font-bold text-gray-800">
            No milestone coupons unlocked yet
          </p>
          <p className="text-[11px] text-pink-900">
            Add items worth <span className="font-black text-pink-700">₹{(1300 - currentAmount + 1).toLocaleString('en-IN')}</span> more to unlock <span className="font-mono font-black bg-pink-100 px-1.5 py-0.5 rounded text-pink-900">FEAT6</span> (₹60 OFF)!
          </p>
        </div>
      )}

      {/* Additional Quick Coupons (Welcome76 & Prepaid Bonus) */}
      <div className="pt-2 border-t border-pink-100 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-gray-500 uppercase">First Order:</span>
          {(() => {
            const isWelcomeApplied = isApplied('Welcome76');
            return (
              <button
                type="button"
                onClick={() => handleTogglePromo('Welcome76')}
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer flex items-center gap-1 ${
                  isWelcomeApplied
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-white hover:bg-pink-100/60 text-pink-900 border-pink-200 active:scale-95'
                }`}
              >
                {isWelcomeApplied ? <Check className="w-2.5 h-2.5 text-emerald-700" /> : <Ticket className="w-2.5 h-2.5 text-pink-600" />}
                <span>Welcome76 (Flat ₹76 OFF 1st Order)</span>
              </button>
            );
          })()}
        </div>

        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
          <Zap className="w-3 h-3 text-amber-600" />
          <span>Prepaid: Flat ₹55 Auto-OFF</span>
        </div>
      </div>

      {/* Error display */}
      {errorMessage && (
        <p className="text-[11px] font-semibold text-red-700 bg-red-50 p-2 rounded-lg border border-red-200 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  );
};
