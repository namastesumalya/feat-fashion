import React, { useEffect, useState } from 'react';
import { Feather, Heart } from 'lucide-react';

export interface FeatherParticle {
  id: string;
  mode: 'fly-up' | 'drop-down';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  createdAt: number;
}

interface FloatingFeatherAnimationProps {
  feathers: FeatherParticle[];
  onFeatherComplete: (id: string) => void;
}

export type FeatherTriggerInput = 
  | React.MouseEvent 
  | { clientX?: number; clientY?: number; featherCount?: number; durationMs?: number; label?: string } 
  | HTMLElement;

// Trigger fly-up feather animation when an item is ADDED to wishlist or Magic Feathers are earned
export function triggerFeatherAnimation(e?: FeatherTriggerInput) {
  let startX = (typeof window !== 'undefined' && Number.isFinite(window.innerWidth)) ? window.innerWidth / 2 : 400;
  let startY = (typeof window !== 'undefined' && Number.isFinite(window.innerHeight)) ? window.innerHeight / 2 : 300;
  let count = 1;

  if (e) {
    if ('featherCount' in e && typeof e.featherCount === 'number') {
      count = Math.min(12, Math.max(1, e.featherCount));
    }
    if ('clientX' in e && typeof e.clientX === 'number' && Number.isFinite(e.clientX) && Number.isFinite(e.clientY)) {
      startX = e.clientX;
      startY = e.clientY!;
    } else if ('getBoundingClientRect' in e && typeof (e as HTMLElement).getBoundingClientRect === 'function') {
      try {
        const rect = (e as HTMLElement).getBoundingClientRect();
        if (Number.isFinite(rect.left) && Number.isFinite(rect.top)) {
          startX = rect.left + (rect.width || 0) / 2;
          startY = rect.top + (rect.height || 0) / 2;
        }
      } catch (_) {}
    }
  }

  // Find navbar wishlist button or logo
  const wishlistBtn = typeof document !== 'undefined' ? document.getElementById('btn-wishlist') : null;
  let endX = (typeof window !== 'undefined' && Number.isFinite(window.innerWidth)) ? window.innerWidth - 70 : 350;
  let endY = 28;

  if (wishlistBtn) {
    try {
      const rect = wishlistBtn.getBoundingClientRect();
      if (Number.isFinite(rect.left) && Number.isFinite(rect.top) && rect.width > 0) {
        endX = rect.left + rect.width / 2;
        endY = rect.top + rect.height / 2;
      }
    } catch (_) {}
  }

  if (typeof window !== 'undefined') {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const jitterX = (Math.random() - 0.5) * 60;
        const jitterY = (Math.random() - 0.5) * 60;
        const featherEvent = new CustomEvent('spawn-feather-wishlist', {
          detail: {
            mode: 'fly-up',
            startX: Number.isFinite(startX + jitterX) ? startX + jitterX : 400,
            startY: Number.isFinite(startY + jitterY) ? startY + jitterY : 300,
            endX: Number.isFinite(endX) ? endX : 350,
            endY: Number.isFinite(endY) ? endY : 28
          }
        });
        window.dispatchEvent(featherEvent);
      }, i * 120);
    }
  }
}

// Trigger drop-down feather animation when an item is REMOVED from wishlist
export function triggerFeatherDropAnimation(e?: React.MouseEvent | { clientX: number; clientY: number } | HTMLElement) {
  // Find navbar wishlist button as start position
  const wishlistBtn = typeof document !== 'undefined' ? document.getElementById('btn-wishlist') : null;
  let startX = (typeof window !== 'undefined' && Number.isFinite(window.innerWidth)) ? window.innerWidth - 70 : 350;
  let startY = 28;

  if (wishlistBtn) {
    try {
      const rect = wishlistBtn.getBoundingClientRect();
      if (Number.isFinite(rect.left) && Number.isFinite(rect.top) && rect.width > 0) {
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
      }
    } catch (_) {}
  }

  // Drop down destination (gently drifts below the navbar into the viewport)
  const randomDrift = (Math.random() - 0.5) * 80;
  const endX = startX + randomDrift;
  const endY = startY + 300 + Math.random() * 60;

  if (typeof window !== 'undefined') {
    // Signal navbar icon to show detach/release pulse immediately
    window.dispatchEvent(new CustomEvent('feather-wishlist-drop'));

    const featherEvent = new CustomEvent('spawn-feather-wishlist', {
      detail: {
        mode: 'drop-down',
        startX: Number.isFinite(startX) ? startX : 350,
        startY: Number.isFinite(startY) ? startY : 28,
        endX: Number.isFinite(endX) ? endX : 350,
        endY: Number.isFinite(endY) ? endY : 328
      }
    });
    window.dispatchEvent(featherEvent);
  }
}

export const FloatingFeatherAnimation: React.FC<FloatingFeatherAnimationProps> = ({
  feathers,
  onFeatherComplete
}) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden">
      {feathers.map(feather => (
        <SingleFloatingFeather
          key={feather.id}
          feather={feather}
          onComplete={() => onFeatherComplete(feather.id)}
        />
      ))}
    </div>
  );
};

interface SingleFloatingFeatherProps {
  feather: FeatherParticle;
  onComplete: () => void;
}

const SingleFloatingFeather: React.FC<SingleFloatingFeatherProps> = ({ feather, onComplete }) => {
  const safeStartX = Number.isFinite(feather.startX) ? feather.startX : (typeof window !== 'undefined' ? window.innerWidth / 2 : 400);
  const safeStartY = Number.isFinite(feather.startY) ? feather.startY : 300;
  const safeEndX = Number.isFinite(feather.endX) ? feather.endX : (typeof window !== 'undefined' ? window.innerWidth - 70 : 350);
  const safeEndY = Number.isFinite(feather.endY) ? feather.endY : 28;

  const [pos, setPos] = useState({ x: safeStartX, y: safeStartY });
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [opacity, setOpacity] = useState(1);
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number; size: number }>>([]);

  const isDropping = feather.mode === 'drop-down';

  useEffect(() => {
    const startTime = performance.now();
    const duration = isDropping ? 1350 : 1100; // 1.35s for gentle drop, 1.1s for fly-up
    const startX = safeStartX;
    const startY = safeStartY;
    const endX = safeEndX;
    const endY = safeEndY;

    // Control point for curved flight path (if flying up)
    const midX = (startX + endX) / 2 + (startX > endX ? 40 : -40);
    const midY = Math.min(startY, endY) - 100;

    let animFrameId: number;
    let sparkleCounter = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);

      let currentX = startX;
      let currentY = startY;
      let swayAngle = 0;
      let currentScale = 1;
      let currentOpacity = 1;

      if (isDropping) {
        // --- FEATHER DROPPING DOWN PHYSICS ---
        const gravityProgress = Math.pow(progress, 1.25);
        const swayPhase = Math.sin(progress * Math.PI * 4.5);
        const lateralDrift = swayPhase * 42 * (1 - progress * 0.3);
        
        currentX = startX + (endX - startX) * progress + lateralDrift;
        currentY = startY + (endY - startY) * gravityProgress + Math.sin(progress * Math.PI * 9) * 5;

        swayAngle = swayPhase * 40 + 15;

        if (progress < 0.15) {
          currentScale = 0.8 + (progress / 0.15) * 0.35;
          currentOpacity = 1;
        } else if (progress > 0.65) {
          const fadeProgress = (progress - 0.65) / 0.35;
          currentScale = 1.15 - fadeProgress * 0.45;
          currentOpacity = Math.max(0, 1 - fadeProgress);
        } else {
          currentScale = 1.15;
          currentOpacity = 1;
        }
      } else {
        // --- FEATHER FLYING UP PHYSICS ---
        const easeProgress = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const t = easeProgress;
        currentX = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * midX + Math.pow(t, 2) * endX;
        
        const windFlutter = Math.sin(progress * Math.PI * 6) * 16 * (1 - progress * 0.5);
        currentY = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * midY + Math.pow(t, 2) * endY + windFlutter;

        swayAngle = Math.sin(progress * Math.PI * 5) * 35 + (endX > startX ? 20 : -20);
        
        if (progress < 0.2) {
          currentScale = 0.6 + (progress / 0.2) * 0.6;
        } else if (progress > 0.8) {
          currentScale = 1.2 - ((progress - 0.8) / 0.2) * 0.7;
        } else {
          currentScale = 1.2;
        }
      }

      const validX = Number.isFinite(currentX) ? currentX : startX;
      const validY = Number.isFinite(currentY) ? currentY : startY;

      setPos({ x: validX, y: validY });
      setRotation(Number.isFinite(swayAngle) ? swayAngle : 0);
      setScale(Number.isFinite(currentScale) ? currentScale : 1);
      setOpacity(Number.isFinite(currentOpacity) ? currentOpacity : 1);

      // Spawn trail sparkles
      sparkleCounter++;
      if (sparkleCounter % 4 === 0 && progress < (isDropping ? 0.75 : 0.85)) {
        setSparkles(prev => [
          ...prev.slice(-8),
          {
            id: Date.now() + Math.random(),
            x: validX + (Math.random() - 0.5) * 14,
            y: validY + (Math.random() - 0.5) * 14,
            size: Math.random() * 8 + 5
          }
        ]);
      }

      if (progress < 1) {
        animFrameId = requestAnimationFrame(animate);
      } else {
        if (!isDropping && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('feather-wishlist-hit'));
        }
        setOpacity(0);
        setTimeout(onComplete, 100);
      }
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [safeStartX, safeStartY, safeEndX, safeEndY, onComplete, isDropping]);

  return (
    <>
      {/* Sparkle Trail */}
      {sparkles.map(sp => {
        const safeLeft = Number.isFinite(sp.x) ? sp.x : 0;
        const safeTop = Number.isFinite(sp.y) ? sp.y : 0;
        const safeSize = Number.isFinite(sp.size) && sp.size > 0 ? sp.size : 8;
        return (
          <div
            key={sp.id}
            className="fixed pointer-events-none transition-all duration-500 transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${safeLeft}px`,
              top: `${safeTop}px`,
              opacity: 0.8,
              animation: 'feather-sparkle-fade 0.5s ease-out forwards'
            }}
          >
            <Heart 
              className={`${isDropping ? 'text-pink-300 fill-pink-300' : 'text-amber-300 fill-amber-300'} drop-shadow-xs`} 
              style={{ width: `${safeSize}px`, height: `${safeSize}px` }} 
            />
          </div>
        );
      })}

      {/* Floating / Dropping Feather */}
      <div
        className="fixed pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-[99999] transition-opacity duration-75"
        style={{
          left: `${Number.isFinite(pos.x) ? pos.x : 0}px`,
          top: `${Number.isFinite(pos.y) ? pos.y : 0}px`,
          transform: `translate(-50%, -50%) rotate(${Number.isFinite(rotation) ? rotation : 0}deg) scale(${Number.isFinite(scale) ? scale : 1})`,
          opacity: Number.isFinite(opacity) ? opacity : 1
        }}
      >
        <div className="relative flex items-center justify-center">
          {/* Glowing Aura backdrop */}
          <div 
            className={`absolute inset-0 w-12 h-12 -translate-x-1 -translate-y-1 rounded-full blur-md opacity-70 animate-pulse ${
              isDropping 
                ? 'bg-gradient-to-br from-rose-400 via-pink-300 to-amber-200' 
                : 'bg-gradient-to-tr from-[#ff2a85] via-amber-300 to-pink-400'
            }`} 
          />
          
          {/* Feather SVG Graphic */}
          <div 
            className={`relative p-2 rounded-full shadow-xl border border-white/80 text-white flex items-center justify-center ${
              isDropping
                ? 'bg-gradient-to-br from-gray-700 via-rose-600 to-pink-500'
                : 'bg-gradient-to-tr from-[#e51975] via-[#ff4d9d] to-amber-300'
            }`}
          >
            <Feather className="w-5 h-5 text-white drop-shadow-md stroke-[2.2]" />
          </div>
        </div>
      </div>
    </>
  );
};
