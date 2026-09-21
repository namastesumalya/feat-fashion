import React, { useEffect, useState, useRef } from 'react';
import { 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  Coins, 
  ShieldCheck, 
  X, 
  ShoppingBag, 
  ArrowRight,
  Award
} from 'lucide-react';
import { MagicFeatherTransaction, FEATHER_RUPEE_VALUE } from '../services/referralService';
import { MagicFeatherSvg } from './MagicFeatherSvg';

interface RealWorld12DayFeatherCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: MagicFeatherTransaction | null;
  onFeathersLanded?: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  vRot: number;
  color: string;
  opacity: number;
  type: 'feather' | 'sparkle' | 'coin';
}

// Gentle Web Audio API synthesizer for magical reward chime
function playMagicalChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5, E5, G5, C6, E6, G6
    const startTime = ctx.currentTime + 0.05;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime + idx * 0.11);

      gain.gain.setValueAtTime(0, startTime + idx * 0.11);
      gain.gain.linearRampToValueAtTime(0.18, startTime + idx * 0.11 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + idx * 0.11 + 0.95);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime + idx * 0.11);
      osc.stop(startTime + idx * 0.11 + 1.0);
    });
  } catch (_) {
    // Audio is non-blocking
  }
}

export const RealWorld12DayFeatherCelebration: React.FC<RealWorld12DayFeatherCelebrationProps> = ({
  isOpen,
  onClose,
  transaction,
  onFeathersLanded
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [animatedCount, setAnimatedCount] = useState(0);
  const animRef = useRef<number | null>(null);

  const feathers = transaction?.feathers || 175;
  const rupees = transaction?.valueInRupees || feathers * FEATHER_RUPEE_VALUE;
  const friendName = transaction?.friendName || 'Rohit Verma';
  const orderBilling = transaction?.orderBillingValue || 3499;
  const rewardRate = transaction?.rewardPercent || 5.0;
  const orderId = transaction?.orderId || 'ORD-84920';

  // Trigger celebration on open
  useEffect(() => {
    if (!isOpen) {
      setParticles([]);
      setIsCollecting(false);
      return;
    }

    // Play chime sound
    playMagicalChime();

    // Number count-up animation
    let startVal = 0;
    const step = Math.max(1, Math.floor(feathers / 25));
    const timer = setInterval(() => {
      startVal += step;
      if (startVal >= feathers) {
        setAnimatedCount(feathers);
        clearInterval(timer);
      } else {
        setAnimatedCount(startVal);
      }
    }, 30);

    // Generate floating feather and sparkle particles
    const colors = ['#f59e0b', '#fbbf24', '#ec4899', '#f43f5e', '#fb7185', '#ffd700'];
    const initialParticles: Particle[] = Array.from({ length: 32 }).map((_, i) => ({
      id: i,
      x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800),
      y: -50 - Math.random() * 300,
      vx: (Math.random() - 0.5) * 2.5,
      vy: 1.8 + Math.random() * 2.4,
      size: 18 + Math.random() * 16,
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: 0.85 + Math.random() * 0.15,
      type: i % 4 === 0 ? 'sparkle' : 'feather'
    }));

    setParticles(initialParticles);

    // Particle physics loop
    const updatePhysics = () => {
      setParticles(prev => 
        prev.map(p => {
          let nextY = p.y + p.vy;
          let nextX = p.x + p.vx + Math.sin(nextY * 0.02) * 1.2;
          let nextRot = p.rotation + p.vRot;
          
          // Wrap around top if reached bottom
          if (nextY > (typeof window !== 'undefined' ? window.innerHeight + 60 : 900)) {
            nextY = -40;
            nextX = Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800);
          }

          return {
            ...p,
            x: nextX,
            y: nextY,
            rotation: nextRot
          };
        })
      );
      animRef.current = requestAnimationFrame(updatePhysics);
    };

    animRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      clearInterval(timer);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isOpen, feathers]);

  const handleCollect = () => {
    setIsCollecting(true);
    
    // Animate feathers converging into Available Balance card
    const targetCard = typeof document !== 'undefined' ? document.getElementById('feather-available-balance-card') : null;
    let targetX = typeof window !== 'undefined' ? window.innerWidth / 2 : 400;
    let targetY = typeof window !== 'undefined' ? window.innerHeight / 2 : 300;

    if (targetCard) {
      const rect = targetCard.getBoundingClientRect();
      targetX = rect.left + rect.width / 2;
      targetY = rect.top + rect.height / 2;
      // Scroll to view if out of viewport
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetCard.classList.add('ring-4', 'ring-amber-400', 'scale-105');
      setTimeout(() => {
        targetCard.classList.remove('ring-4', 'ring-amber-400', 'scale-105');
      }, 1800);
    }

    if (onFeathersLanded) {
      onFeathersLanded();
    }

    setTimeout(() => {
      onClose();
    }, 450);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Darkened backdrop with shimmering golden atmosphere */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity duration-300 animate-in fade-in" 
      />

      {/* Floating Animated Feathers Canvas / Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute transition-transform duration-75 ease-linear pointer-events-none"
            style={{
              left: `${p.x}px`,
              top: `${p.y}px`,
              transform: `rotate(${p.rotation}deg) scale(${p.type === 'sparkle' ? 0.75 : 1})`,
              opacity: p.opacity
            }}
          >
            {p.type === 'feather' ? (
              <div className="relative flex items-center justify-center filter drop-shadow-md">
                <MagicFeatherSvg 
                  className="w-7 h-7 sm:w-8 sm:h-8" 
                  style={{ color: p.color }} 
                />
              </div>
            ) : (
              <div 
                className="w-3.5 h-3.5 rounded-full bg-amber-300 animate-ping opacity-75 blur-[1px]" 
                style={{ backgroundColor: p.color }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Main Real-World Milestone Celebration Card */}
      <div 
        className="relative z-10 w-full max-w-lg bg-gradient-to-b from-white via-amber-50/40 to-white rounded-3xl border border-amber-300/80 shadow-[0_25px_70px_rgba(245,158,11,0.25)] p-6 sm:p-8 space-y-6 text-slate-900 animate-in zoom-in-95 duration-300 overflow-hidden"
      >
        {/* Shimmering Top Ambient Light */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-pink-500 to-amber-400" />
        
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Close celebration"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Milestone Badge & Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100/90 border border-amber-300/80 text-amber-900 text-xs font-black uppercase tracking-wider shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-spin-slow" />
            <span>Real-World Scenario: 12-Day Hold Cleared</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black font-serif text-slate-900 tracking-tight">
            Magic Feathers Unlocked! 🎉
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
            Your friend purchased using your referral link and kept the product for <strong>12+ days without returning</strong>.
          </p>
        </div>

        {/* Big Reward Highlight Box */}
        <div className="relative rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-pink-700 p-5 text-white shadow-md text-center overflow-hidden">
          <div className="absolute right-[-10px] top-[-10px] opacity-15 pointer-events-none">
            <MagicFeatherSvg className="w-36 h-36 text-white" />
          </div>

          <div className="relative z-10 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-200 block">
              Reward Credited to Your Account
            </span>
            <div className="flex items-center justify-center gap-2">
              <MagicFeatherSvg className="w-9 h-9 text-amber-300 animate-bounce" />
              <span className="text-4xl sm:text-5xl font-black font-serif tracking-tight text-white drop-shadow-sm">
                +{animatedCount}
              </span>
              <span className="text-lg font-bold text-amber-200 self-end mb-1">
                Feathers
              </span>
            </div>
            <div className="pt-1 flex items-center justify-center gap-2 text-xs sm:text-sm font-black text-amber-100">
              <span>Worth ₹{rupees.toFixed(2)}</span>
              <span>•</span>
              <span className="text-amber-200 font-medium">1 Feather = 50 Paisa</span>
            </div>
          </div>
        </div>

        {/* Real-World Scenario Breakdown: The 4-Step Verification Journey */}
        <div className="space-y-3 bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verified Referral Milestone</span>
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              No Return Initiated ✓
            </span>
          </div>

          <div className="space-y-2.5 pt-1 text-xs">
            {/* Step 1: Friend Order */}
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1">
                <span className="font-bold text-slate-800">Friend Purchased via Your Link:</span>
                <p className="text-slate-600 text-[11px]">
                  <strong>{friendName}</strong> placed order <span className="font-mono text-slate-700 font-bold">{orderId}</span> (Billing: ₹{orderBilling.toLocaleString('en-IN')}).
                </p>
              </div>
            </div>

            {/* Step 2: 12-Day Condition */}
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1">
                <span className="font-bold text-slate-800">12-Day Return Window Cleared:</span>
                <p className="text-slate-600 text-[11px]">
                  Friend kept the product past the 12-day return period. Product was not returned or cancelled!
                </p>
              </div>
            </div>

            {/* Step 3: Feathers Unlocked */}
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Coins className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1">
                <span className="font-bold text-slate-800">Unlocked from Pending to Available:</span>
                <p className="text-slate-600 text-[11px]">
                  Earned {rewardRate}% dynamic reward = <strong>+{feathers} Feathers</strong>, now ready to discount your next order.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleCollect}
            disabled={isCollecting}
            className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-pink-600 hover:from-amber-400 hover:to-pink-500 text-white font-black text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer transform active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>Claim Feathers into Balance</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </button>
        </div>

        <p className="text-center text-[10px] text-slate-400">
          Tip: You can use your Available Magic Feathers during checkout for instant discounts (₹0.50 per feather).
        </p>
      </div>
    </div>
  );
};
