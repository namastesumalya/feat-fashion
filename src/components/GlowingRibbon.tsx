import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Order } from '../types';

interface GlowingRibbonProps {
  onOpenOfferModal?: () => void;
  onApplyPromo?: (code: string) => Promise<{ valid: boolean; message?: string }> | void;
  appliedPromo?: { code: string; discount: number; description: string } | null;
  currentUser?: any;
  orders?: Order[];
}

export const GlowingRibbon: React.FC<GlowingRibbonProps> = ({
  onApplyPromo,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard?.writeText?.('WELCOME76');
      if (onApplyPromo) {
        onApplyPromo('WELCOME76');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <aside 
      aria-label="Promotional announcement"
      className="bg-gradient-to-r from-pink-950 via-[#831843] to-pink-900 text-amber-100 py-1.5 px-2 relative border-b border-amber-400/30 shadow-xs z-40 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center text-center">
        <p className="text-[10px] min-[360px]:text-[11px] sm:text-xs md:text-sm font-medium text-amber-50 whitespace-nowrap tracking-tight flex items-center justify-center gap-1 sm:gap-1.5 leading-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overflow-x-auto">
          <span>Use promo code</span>
          <button
            type="button"
            onClick={handleCopy}
            title="Click to copy WELCOME76"
            className="font-bold font-mono text-amber-300 hover:text-amber-200 underline underline-offset-2 cursor-pointer transition-colors inline-flex items-center gap-0.5"
          >
            <span>WELCOME76</span>
            {copied ? (
              <Check className="w-3 h-3 text-emerald-300 stroke-[3]" />
            ) : (
              <Copy className="w-2.5 h-2.5 text-amber-300/80" />
            )}
          </button>
          <span>for</span>
          <span className="font-bold text-amber-300">Flat ₹76 OFF</span>
          <span>on your first order!</span>
        </p>
      </div>
    </aside>
  );
};

