import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, Feather } from 'lucide-react';

interface LoadingScreenProps {
  onLoaded?: () => void;
  minDurationMs?: number;
  isProductsLoaded?: boolean;
}

// Custom High-Fidelity SVG Feather for luxury fashion look
const LuxuryFeatherSVG: React.FC<{
  className?: string;
  gradientId: string;
  startColor: string;
  endColor: string;
  quillColor?: string;
}> = ({ className = 'w-10 h-10', gradientId, startColor, endColor, quillColor = '#ffffff' }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id={gradientId} x1="10%" y1="0%" x2="90%" y2="100%">
        <stop offset="0%" stopColor={startColor} />
        <stop offset="100%" stopColor={endColor} />
      </linearGradient>
      <filter id={`glow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    {/* Left feather vanes with fine styling */}
    <path
      d="M50 15 C30 25, 20 40, 25 60 C26 62, 33 55, 37 50 C32 58, 30 68, 38 72 C41 68, 44 63, 46 58 C44 68, 45 78, 50 82 Z"
      fill={`url(#${gradientId})`}
      opacity="0.95"
      filter={`url(#glow-${gradientId})`}
    />
    {/* Right feather vanes */}
    <path
      d="M50 15 C70 23, 78 38, 73 58 C72 60, 65 54, 61 49 C66 57, 68 67, 60 71 C57 67, 54 62, 52 57 C54 67, 53 77, 50 82 Z"
      fill={`url(#${gradientId})`}
      opacity="0.88"
      filter={`url(#glow-${gradientId})`}
    />
    {/* Center feather rachis / quill spine */}
    <path
      d="M50 12 Q50 50 49 92"
      stroke={quillColor}
      strokeWidth="2.2"
      strokeLinecap="round"
      opacity="0.95"
    />
    {/* Quill tip extension */}
    <path
      d="M49 92 L48.5 98"
      stroke={quillColor}
      strokeWidth="1.8"
      strokeLinecap="round"
      opacity="0.8"
    />
  </svg>
);

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  onLoaded,
  minDurationMs = 2000,
  isProductsLoaded
}) => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const maxDurationMs = 3800; // Safeguard so user is never stuck
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const productsReady = isProductsLoaded === undefined ? true : isProductsLoaded;

      // Target progress calculation
      let currentPct: number;
      if (productsReady) {
        currentPct = Math.min(100, Math.floor((elapsed / minDurationMs) * 100));
      } else {
        // Softly hold at 88% while products complete hydration
        currentPct = Math.min(88, Math.floor((elapsed / minDurationMs) * 88));
      }

      setProgress(currentPct);

      // Dismiss condition: products are ready after minDuration, or timeout reached
      if (elapsed >= maxDurationMs || (elapsed >= minDurationMs && productsReady)) {
        setProgress(100);
        setIsReady(true);
        clearInterval(interval);
        setTimeout(() => {
          setIsVisible(false);
        }, 350);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [minDurationMs, isProductsLoaded]);

  const handleSkip = () => {
    setIsVisible(false);
  };

  return (
    <AnimatePresence onExitComplete={onLoaded}>
      {isVisible && (
        <motion.div
          key="feat-loading-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03, filter: 'blur(8px)' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999999] flex flex-col items-center justify-center overflow-hidden select-none bg-gradient-to-b from-[#fff0f7] via-[#ffffff] to-[#fff3f9]"
          role="status"
          aria-live="polite"
          aria-label="Loading FEAT Feather Hut Fashion"
        >
          {/* Ambient luminous glow background orbs */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-pink-300/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-rose-200/35 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[580px] bg-gradient-to-r from-pink-200/25 via-amber-100/35 to-rose-200/25 rounded-full blur-3xl pointer-events-none" />

          {/* Gentle background drifting feather particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={`bg-feather-${i}`}
                initial={{
                  y: -50,
                  x: `${15 + i * 15}%`,
                  opacity: 0,
                  rotate: -20 + i * 15
                }}
                animate={{
                  y: ['0vh', '110vh'],
                  x: [`${15 + i * 15}%`, `${12 + i * 15 + (i % 2 === 0 ? 6 : -6)}%`],
                  opacity: [0, 0.45, 0.45, 0],
                  rotate: [-30 + i * 12, 30 - i * 12]
                }}
                transition={{
                  duration: 8 + i * 2,
                  repeat: Infinity,
                  ease: 'linear',
                  delay: i * 1.3
                }}
                className="absolute text-pink-300/40"
              >
                <Feather style={{ width: `${18 + i * 4}px`, height: `${18 + i * 4}px` }} />
              </motion.div>
            ))}
          </div>

          {/* Central Container */}
          <div className="relative z-10 flex flex-col items-center max-w-lg mx-auto px-5 text-center">
            
            {/* Brand Logo & Name */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="flex flex-col items-center gap-2 mb-4 sm:mb-6"
            >
              <div className="relative group">
                {/* Radiant logo aura */}
                <div className="absolute -inset-2 bg-gradient-to-tr from-[#ff2a85] via-amber-300 to-pink-400 rounded-full blur-md opacity-40 animate-pulse" />
                <img
                  src="/logo.png"
                  alt="FEAT"
                  className="relative h-14 sm:h-16 w-auto object-contain drop-shadow-md"
                  onError={(e) => {
                    e.currentTarget.src = '/logo.jpeg';
                  }}
                />
              </div>

              <div className="flex flex-col items-center font-luxury-serif">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#e51975] tracking-wider">
                  FEAT
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest -mt-0.5">
                  Feather Hut Fashion™
                </span>
              </div>
            </motion.div>

            {/* ========================================================= */}
            {/* HIGHLIGHTED TAGLINE CONTAINER WITH SURROUNDING FEATHERS  */}
            {/* ========================================================= */}
            <div className="relative w-full max-w-sm sm:max-w-md my-3 sm:my-4 py-8 px-6 flex items-center justify-center">

              {/* --- ANIMATED SURROUNDING FEATHERS --- */}

              {/* Feather 1: Top-Left Floating Arc (Rose & Hot Pink) */}
              <motion.div
                animate={{
                  y: [-12, 10, -12],
                  x: [-8, 6, -8],
                  rotate: [-24, 6, -24],
                  scale: [0.95, 1.06, 0.95]
                }}
                transition={{
                  duration: 4.2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className="absolute -top-4 left-1 sm:left-3 pointer-events-none drop-shadow-lg z-20"
              >
                <div className="relative">
                  <div className="absolute inset-0 rounded-full blur-sm bg-pink-400/40 animate-pulse" />
                  <LuxuryFeatherSVG
                    gradientId="feat-grad-1"
                    startColor="#ff2a85"
                    endColor="#f43f5e"
                    quillColor="#ffffff"
                    className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-md"
                  />
                </div>
              </motion.div>

              {/* Feather 2: Top-Right Swirling Feather (Gold & Rose) */}
              <motion.div
                animate={{
                  y: [10, -12, 10],
                  x: [6, -8, 6],
                  rotate: [24, -12, 24],
                  scale: [1.05, 0.94, 1.05]
                }}
                transition={{
                  duration: 3.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.4
                }}
                className="absolute -top-5 right-1 sm:right-3 pointer-events-none drop-shadow-lg z-20"
              >
                <div className="relative">
                  <div className="absolute inset-0 rounded-full blur-sm bg-amber-300/40 animate-pulse" />
                  <LuxuryFeatherSVG
                    gradientId="feat-grad-2"
                    startColor="#f59e0b"
                    endColor="#ec4899"
                    quillColor="#fef08a"
                    className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-md"
                  />
                </div>
              </motion.div>

              {/* Feather 3: Bottom-Left Swooping Drift (Magenta & Violet) */}
              <motion.div
                animate={{
                  y: [12, -10, 12],
                  x: [-9, 5, -9],
                  rotate: [-34, -10, -34],
                  scale: [0.92, 1.08, 0.92]
                }}
                transition={{
                  duration: 4.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.8
                }}
                className="absolute -bottom-5 left-3 sm:left-6 pointer-events-none drop-shadow-lg z-20"
              >
                <div className="relative">
                  <div className="absolute inset-0 rounded-full blur-sm bg-purple-300/40 animate-pulse" />
                  <LuxuryFeatherSVG
                    gradientId="feat-grad-3"
                    startColor="#fb7185"
                    endColor="#d946ef"
                    quillColor="#ffffff"
                    className="w-11 h-11 sm:w-13 sm:h-13 drop-shadow-md"
                  />
                </div>
              </motion.div>

              {/* Feather 4: Bottom-Right Orbiting Feather (Coral & Gold) */}
              <motion.div
                animate={{
                  y: [-10, 12, -10],
                  x: [7, -9, 7],
                  rotate: [30, -8, 30],
                  scale: [1.06, 0.94, 1.06]
                }}
                transition={{
                  duration: 4.0,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 1.2
                }}
                className="absolute -bottom-4 right-3 sm:right-6 pointer-events-none drop-shadow-lg z-20"
              >
                <div className="relative">
                  <div className="absolute inset-0 rounded-full blur-sm bg-pink-400/40 animate-pulse" />
                  <LuxuryFeatherSVG
                    gradientId="feat-grad-4"
                    startColor="#ec4899"
                    endColor="#f59e0b"
                    quillColor="#ffffff"
                    className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-md"
                  />
                </div>
              </motion.div>

              {/* Feather 5: Left-Center Floating Ambient Feather */}
              <motion.div
                animate={{
                  x: [-14, 2, -14],
                  y: [-6, 6, -6],
                  rotate: [-52, -26, -52],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{
                  duration: 3.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.6
                }}
                className="absolute -left-6 sm:-left-8 top-1/2 -translate-y-1/2 pointer-events-none drop-shadow-md z-20"
              >
                <LuxuryFeatherSVG
                  gradientId="feat-grad-5"
                  startColor="#f43f5e"
                  endColor="#fb923c"
                  quillColor="#ffffff"
                  className="w-9 h-9 sm:w-11 sm:h-11"
                />
              </motion.div>

              {/* Feather 6: Right-Center Floating Ambient Feather */}
              <motion.div
                animate={{
                  x: [12, -4, 12],
                  y: [6, -6, 6],
                  rotate: [48, 24, 48],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{
                  duration: 4.0,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 1.0
                }}
                className="absolute -right-6 sm:-right-8 top-1/2 -translate-y-1/2 pointer-events-none drop-shadow-md z-20"
              >
                <LuxuryFeatherSVG
                  gradientId="feat-grad-6"
                  startColor="#e11d48"
                  endColor="#c084fc"
                  quillColor="#ffffff"
                  className="w-9 h-9 sm:w-11 sm:h-11"
                />
              </motion.div>

              {/* Surrounding Orbiting Sparkles & Stardust */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 pointer-events-none flex items-center justify-center z-10"
              >
                <div className="absolute top-1 left-8">
                  <Sparkles className="w-4 h-4 text-amber-400 fill-amber-300 animate-ping opacity-80" />
                </div>
                <div className="absolute bottom-1 right-8">
                  <Sparkles className="w-4 h-4 text-pink-400 fill-pink-300 animate-pulse" />
                </div>
                <div className="absolute top-8 right-2">
                  <div className="w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_10px_#f59e0b]" />
                </div>
                <div className="absolute bottom-8 left-2">
                  <div className="w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_10px_#ec4899]" />
                </div>
              </motion.div>

              {/* --- THE HIGHLIGHTED TAGLINE CARD --- */}
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full rounded-3xl p-[2.5px] bg-gradient-to-r from-[#ff2a85] via-amber-300 via-50% to-[#e51975] shadow-2xl shadow-pink-500/25"
              >
                <div className="bg-white/95 backdrop-blur-xl rounded-[22px] px-6 sm:px-8 py-5 sm:py-6 flex flex-col items-center">
                  
                  {/* THE HIGHLIGHTED WORDS: "Wear Feat, Wear Confidence" */}
                  <div className="font-luxury-serif tracking-tight text-center leading-tight sm:leading-snug">
                    <motion.div
                      animate={{
                        filter: [
                          'drop-shadow(0 2px 8px rgba(229, 25, 117, 0.25))',
                          'drop-shadow(0 4px 16px rgba(229, 25, 117, 0.45))',
                          'drop-shadow(0 2px 8px rgba(229, 25, 117, 0.25))'
                        ]
                      }}
                      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                      className="text-2xl sm:text-3xl md:text-[34px] font-black bg-gradient-to-r from-[#e51975] via-[#ff2a85] to-[#c2185b] bg-clip-text text-transparent"
                    >
                      Wear Feat,
                    </motion.div>
                    
                    <motion.div
                      animate={{
                        filter: [
                          'drop-shadow(0 2px 10px rgba(245, 158, 11, 0.2))',
                          'drop-shadow(0 4px 18px rgba(245, 158, 11, 0.45))',
                          'drop-shadow(0 2px 10px rgba(245, 158, 11, 0.2))'
                        ]
                      }}
                      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                      className="text-2xl sm:text-3xl md:text-[34px] font-black bg-gradient-to-r from-[#b45309] via-[#e51975] to-[#d97706] bg-clip-text text-transparent mt-0.5"
                    >
                      Wear Confidence
                    </motion.div>
                  </div>

                  {/* Elegant divider ribbon */}
                  <div className="flex items-center gap-2 mt-3.5 w-full max-w-[180px]">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-pink-300" />
                    <div className="w-1.5 h-1.5 rotate-45 bg-[#e51975]" />
                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-pink-300" />
                  </div>

                  {/* Subtext */}
                  <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-2">
                    Elegance &amp; Grace in Every Stitch
                  </p>
                </div>
              </motion.div>

            </div>

            {/* Loading Progress Bar & Status */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col items-center w-full max-w-xs sm:max-w-sm mt-3 sm:mt-4 gap-2.5"
            >
              <div className="w-full bg-pink-100/90 rounded-full h-1.5 sm:h-2 overflow-hidden p-[1px] border border-pink-200/60 shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#ff2a85] via-amber-300 to-[#e51975] rounded-full"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: 'linear' }}
                />
              </div>

              <div className="flex items-center justify-between w-full text-[11px] font-bold text-gray-500 px-1">
                <span className="flex items-center gap-1.5 text-[#e51975]">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#e51975] animate-ping" />
                  {progress >= 100
                    ? 'Entering FEAT Fashion...'
                    : (isProductsLoaded === false)
                    ? 'Curating 120+ Ethnic Styles...'
                    : 'Unveiling Collection...'}
                </span>
                <span className="font-mono text-gray-700 font-bold">{progress}%</span>
              </div>
            </motion.div>

            {/* Optional Skip / Enter Store Link */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              whileHover={{ opacity: 1, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSkip}
              className="mt-5 sm:mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-[#e51975] transition-colors py-1.5 px-4 rounded-full hover:bg-pink-50/80 border border-transparent hover:border-pink-200 cursor-pointer"
            >
              <span>{isReady ? 'Enter Website' : 'Skip into store'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

