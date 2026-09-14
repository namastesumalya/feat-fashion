import React from 'react';
import { CollectionType } from '../types';
import { Crown } from 'lucide-react';

export interface CollectionHaloItem {
  id: string;
  collectionValue: CollectionType | 'All';
  slug: string;
  label: string;
  sublabel?: string;
  image: string;
  haloGradient: string;
  haloBg: string;
  borderColor: string;
}

const COLLECTION_ITEMS: CollectionHaloItem[] = [
  {
    id: 'col-jashn',
    collectionValue: 'Jashn Collection',
    slug: 'jashn',
    label: 'JASHN',
    sublabel: 'Festive Couture',
    image: '/jashn.jpeg',
    haloGradient: 'from-amber-400 via-[#ff2a85] to-rose-600',
    haloBg: 'bg-gradient-to-b from-pink-50 to-amber-50',
    borderColor: 'border-amber-400'
  },
  {
    id: 'col-firdausi',
    collectionValue: 'Firdausi collection',
    slug: 'firdausi',
    label: 'FIRDAUSI',
    sublabel: 'Royal Chanderi',
    image: '/firdausi.jpeg',
    haloGradient: 'from-amber-400 via-pink-600 to-rose-700',
    haloBg: 'bg-gradient-to-b from-pink-50 to-amber-50',
    borderColor: 'border-amber-400'
  },
  {
    id: 'col-9tofivers',
    collectionValue: '9 to fivers collection',
    slug: '9-to-fivers',
    label: '9 TO FIVERS',
    sublabel: 'Daily & Office',
    image: '/9tofivers.jpeg',
    haloGradient: 'from-amber-400/80 via-orange-300/70 to-pink-200/50',
    haloBg: 'bg-amber-50/70',
    borderColor: 'border-amber-300'
  },
  {
    id: 'col-dealmaange',
    collectionValue: "'Deal maange more' Collection",
    slug: 'deal-maange-more',
    label: 'DEAL MAANGE MORE',
    sublabel: 'Super Steals',
    image: '/dealmangemore.jpeg',
    haloGradient: 'from-emerald-400/80 via-teal-300/70 to-cyan-200/50',
    haloBg: 'bg-emerald-50/70',
    borderColor: 'border-emerald-300'
  },
  {
    id: 'col-presentisgifted',
    collectionValue: "'Present is Gifted' Collection",
    slug: 'present-is-gifted',
    label: 'PRESENT IS GIFTED',
    sublabel: 'Luxury Hampers',
    image: '/Presentisgifted.jpeg',
    haloGradient: 'from-purple-500/80 via-pink-400/70 to-indigo-200/50',
    haloBg: 'bg-purple-50/70',
    borderColor: 'border-purple-300'
  }
];

interface TopCollectionStoriesProps {
  selectedCollection: string;
  onSelectCollection: (col: string) => void;
  onNavigateCollection?: (slug: string) => void;
}

export const TopCollectionStories: React.FC<TopCollectionStoriesProps> = ({
  selectedCollection,
  onSelectCollection,
  onNavigateCollection
}) => {
  const handleItemClick = (item: CollectionHaloItem) => {
    if (onNavigateCollection) {
      onNavigateCollection(item.slug);
      return;
    }
    if (selectedCollection === item.collectionValue) {
      onSelectCollection('All');
    } else {
      onSelectCollection(item.collectionValue);
      // Smoothly scroll down to product catalog
      const targetElement = document.getElementById('fashion-categories-section');
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <section className="w-full bg-gradient-to-r from-[#fff0f7] via-white to-[#fff0f7] border-b border-pink-100 py-3 sm:py-4 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        
        {/* Section Header */}
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Crown className="w-4 h-4 text-[#e51975]" />
            <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 tracking-tight font-serif uppercase">
              Exclusive Collections
            </h3>
          </div>
          {selectedCollection !== 'All' && (
            <button
              onClick={() => onSelectCollection('All')}
              className="text-[11px] font-bold text-[#e51975] hover:underline"
            >
              Clear Filter
            </button>
          )}
        </div>

        {/* Horizontal Scrolling Track matching categories.jpeg */}
        <div 
          className="flex items-start justify-between sm:justify-center gap-3 sm:gap-6 md:gap-8 overflow-x-auto no-scrollbar py-1 px-1 scroll-smooth"
          id="top-collection-capsules-track"
        >
          {COLLECTION_ITEMS.map((item) => {
            const isSelected = selectedCollection === item.collectionValue;

            return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className="group flex flex-col items-center shrink-0 focus:outline-none transition-transform duration-200"
                  id={`btn-collection-${item.id}`}
                  title={`Browse ${item.label}`}
                >
                {/* Glowing Arched Capsule Card */}
                <div 
                  className={`relative w-[62px] h-[82px] xs:w-[68px] xs:h-[90px] sm:w-[78px] sm:h-[102px] md:w-[86px] md:h-[112px] rounded-[22px] sm:rounded-[26px] p-[2.5px] sm:p-[3px] transition-all duration-300 overflow-hidden ${
                    isSelected 
                      ? 'scale-105 shadow-md ring-2 ring-[#e51975]' 
                      : 'hover:scale-105 hover:shadow-sm'
                  }`}
                >
                  {/* Soft Gradient Halo Background / Glow Border */}
                  <div 
                    className={`absolute inset-0 bg-gradient-to-b ${item.haloGradient} rounded-[22px] sm:rounded-[26px] opacity-90 group-hover:opacity-100 transition-opacity`}
                  />

                  {/* Inner Card Container */}
                  <div className={`relative w-full h-full ${item.haloBg} rounded-[20px] sm:rounded-[24px] overflow-hidden flex items-end justify-center border border-white/60 shadow-inner`}>
                    
                    {/* Model Photo Cutout */}
                    <img
                      src={item.image}
                      alt={item.label}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={(e) => {
                        if (e.currentTarget.src !== '/saree.jpeg' && !e.currentTarget.src.endsWith('/saree.jpeg')) {
                          e.currentTarget.src = '/saree.jpeg';
                        }
                      }}
                    />

                    {/* Subtle bottom soft shadow overlay */}
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 via-black/10 to-transparent pointer-events-none" />

                    {/* Active Selected Indicator Dot */}
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#e51975] ring-2 ring-white animate-pulse" />
                    )}
                  </div>
                </div>

                {/* Collection Label */}
                <span 
                  className={`mt-1.5 sm:mt-2 text-[10px] xs:text-[11px] sm:text-xs font-bold tracking-tight text-center whitespace-nowrap transition-colors duration-150 ${
                    isSelected 
                      ? 'text-[#e51975] font-black' 
                      : 'text-gray-800 group-hover:text-[#e51975]'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
};
