import React, { useEffect, useRef } from 'react';
import { Sparkles, X, CheckCircle2, Gift, ArrowRight } from 'lucide-react';
import { FEATHER_RUPEE_VALUE } from '../services/referralService';

interface MagicFeatherCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  feathersEarned: number;
  friendName?: string;
  orderAmount?: number;
  title?: string;
  subtitle?: string;
  onGoToShop?: () => void;
}

/**
 * Synthesizes a gentle, ethereal crystal chime using Web Audio API
 */
function playMagicFeatherChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
    
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
      
      gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + idx * 0.1 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.1 + 0.8);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + idx * 0.1);
      osc.stop(ctx.currentTime + idx * 0.1 + 0.9);
    });
  } catch (_) {
    // Ignore audio permission or blocked playback
  }
}

/**
 * Animated SVG component for the Magic Feather
 */
export const MagicFeatherSvg: React.FC<{
  className?: string;
  size?: number;
  glow?: boolean;
}> = ({ className = '', size = 80, glow = true }) => {
  return (
    <div 
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Background Radiance Glow */}
      {glow && (
        <div 
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400/40 via-pink-500/30 to-teal-400/40 blur-xl animate-pulse pointer-events-none"
        />
      )}

      {/* Feather Graphic */}
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="relative z-10 drop-shadow-[0_8px_16px_rgba(236,72,153,0.35)] transition-transform duration-700 hover:scale-110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="featherGradient" x1="10%" y1="10%" x2="90%" y2="90%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="25%" stopColor="#ec4899" />
            <stop offset="65%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>

          <linearGradient id="rachisGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="50%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Halo Rings */}
        <circle cx="50" cy="50" r="42" stroke="url(#featherGradient)" strokeWidth="1" strokeDasharray="3 4" className="opacity-40 animate-spin" style={{ animationDuration: '24s' }} />

        {/* Feather Plume Silhouette (Curved organic vane) */}
        <path
          d="M25 80 C26 65 32 45 42 30 C48 20 60 12 76 14 C75 25 72 36 64 48 C56 60 45 74 25 80 Z"
          fill="url(#featherGradient)"
          opacity="0.95"
          filter="url(#softGlow)"
        />

        {/* Opposite delicate vane fringe */}
        <path
          d="M25 80 C32 72 38 60 43 50 C48 38 52 28 54 22 C62 26 67 34 68 44 C64 56 50 70 25 80 Z"
          fill="url(#featherGradient)"
          opacity="0.75"
        />

        {/* Individual fine barb cuts */}
        <path d="M42 30 Q54 26 68 20" stroke="#fef08a" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
        <path d="M46 38 Q60 34 72 32" stroke="#fdf2f8" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
        <path d="M50 48 Q64 46 72 45" stroke="#e0e7ff" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
        <path d="M44 58 Q56 58 64 60" stroke="#ccfbf1" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
        <path d="M38 68 Q48 68 54 72" stroke="#fef3c7" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />

        {/* Quill / Central Rachis Stem */}
        <path
          d="M20 86 Q38 60 76 14"
          stroke="url(#rachisGradient)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M19 87 L16 91"
          stroke="#d97706"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Celestial Star Sparkle atop the quill tip */}
        <g transform="translate(76, 14)">
          <path
            d="M0 -6 Q0 0 6 0 Q0 0 0 6 Q0 0 -6 0 Q0 0 0 -6 Z"
            fill="#ffffff"
            className="animate-ping"
            style={{ animationDuration: '2.5s' }}
          />
          <circle cx="0" cy="0" r="1.5" fill="#fef08a" />
        </g>
      </svg>
    </div>
  );
};

/**
 * Celebratory Modal when Magic Feathers are credited or unlocked
 */
export const MagicFeatherCelebrationModal: React.FC<MagicFeatherCelebrationProps> = ({
  isOpen,
  onClose,
  feathersEarned,
  friendName,
  orderAmount,
  title = 'Magic Feathers Credited!',
  subtitle,
  onGoToShop
}) => {
  const soundPlayedRef = useRef(false);

  useEffect(() => {
    if (isOpen && !soundPlayedRef.current) {
      soundPlayedRef.current = true;
      playMagicFeatherChime();
    }
    if (!isOpen) {
      soundPlayedRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const rupeeValue = (feathersEarned * FEATHER_RUPEE_VALUE).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 text-center shadow-2xl border-2 border-amber-300/80 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Shimmering Top Accent Gradient */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-pink-500 to-teal-400" />
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Ethereal Animated Feather */}
        <div className="relative my-2 py-4 flex justify-center items-center">
          <div className="relative animate-bounce" style={{ animationDuration: '3s' }}>
            <MagicFeatherSvg size={110} />
          </div>

          {/* Floating Sparkles */}
          <div className="absolute top-2 left-10 text-amber-400 animate-spin" style={{ animationDuration: '8s' }}>
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="absolute bottom-4 right-10 text-pink-400 animate-pulse">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
            <Gift className="w-3 h-3" />
            <span>Referral Reward Unlocked</span>
          </span>
          <h3 className="text-2xl font-serif font-black text-pink-950 pt-1">
            {title}
          </h3>
        </div>

        {/* Counter Badge */}
        <div className="my-5 p-4 rounded-2xl bg-gradient-to-br from-amber-50 via-pink-50 to-teal-50 border border-amber-200 shadow-inner">
          <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-purple-600 to-amber-600">
            +{feathersEarned} Feathers
          </div>
          <p className="text-xs font-bold text-gray-700 mt-1 flex items-center justify-center gap-1.5">
            <span>Worth</span>
            <span className="text-sm font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
              ₹{rupeeValue}
            </span>
            <span className="text-[11px] text-gray-500 font-medium">(1 Feather = 50 Paisa)</span>
          </p>
        </div>

        {/* Subtitle / Details */}
        <p className="text-xs text-gray-600 leading-relaxed mb-6">
          {subtitle || (
            <>
              {friendName ? (
                <>Your friend <strong className="text-gray-900">{friendName}</strong> placed an order {orderAmount ? `of ₹${orderAmount.toLocaleString('en-IN')}` : ''}. </>
              ) : (
                <>A friend used your permanent referral code! </>
              )}
              The 12-day return window has successfully passed without cancellation. These feathers are now in your <strong>Available Balance</strong> and can be used on your next purchase!
            </>
          )}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              playMagicFeatherChime();
            }}
            className="w-full sm:w-auto px-4 py-3 rounded-xl text-xs font-bold text-pink-950 bg-pink-100 hover:bg-pink-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-700" />
            <span>Replay Flutter</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              if (onGoToShop) onGoToShop();
            }}
            className="flex-1 w-full px-5 py-3 rounded-xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-pink-600 via-pink-700 to-amber-600 hover:brightness-110 shadow-lg shadow-pink-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Spend in Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Extra rules reminder */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] text-gray-400 font-medium">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Stacks on top of all promotional coupons!</span>
        </div>
      </div>
    </div>
  );
};
