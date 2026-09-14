import React from 'react';
import { CategoryType } from '../types';

export interface CategoryHaloItem {
  id: string;
  categoryValue: CategoryType | 'All';
  slug: string;
  label: string;
  image: string;
  haloGradient: string;
  haloBg: string;
  borderColor: string;
}

const CATEGORY_ITEMS: CategoryHaloItem[] = [
  {
    id: 'cat-kurti',
    categoryValue: 'Kurti',
    slug: 'kurti',
    label: 'KURTI',
    image: '/kurti.jpeg',
    haloGradient: 'from-pink-400/80 via-rose-300/70 to-pink-200/50',
    haloBg: 'bg-pink-50/70',
    borderColor: 'border-pink-300'
  },
  {
    id: 'cat-sharee',
    categoryValue: 'Sharee',
    slug: 'sharee',
    label: 'SHAREE',
    image: '/saree.jpeg',
    haloGradient: 'from-amber-400 via-pink-500 to-rose-600',
    haloBg: 'bg-gradient-to-b from-pink-50 to-amber-50/80',
    borderColor: 'border-amber-400'
  },
  {
    id: 'cat-dress-materials',
    categoryValue: 'Dress Materials',
    slug: 'dress-materials',
    label: 'DRESS MATERIALS',
    image: '/dress.jpeg',
    haloGradient: 'from-amber-400/80 via-orange-300/70 to-pink-200/50',
    haloBg: 'bg-amber-50/70',
    borderColor: 'border-amber-300'
  },
  {
    id: 'cat-indo-western',
    categoryValue: 'Indo Western dress',
    slug: 'indo-western',
    label: 'INDO WESTERN DRESS',
    image: '/indo-western.jpeg',
    haloGradient: 'from-purple-400/80 via-pink-300/70 to-indigo-200/50',
    haloBg: 'bg-purple-50/70',
    borderColor: 'border-purple-300'
  },
  {
    id: 'cat-suit',
    categoryValue: 'Suit',
    slug: 'suit',
    label: 'SUIT',
    image: '/suit.jpeg',
    haloGradient: 'from-sky-400/80 via-teal-300/70 to-cyan-200/50',
    haloBg: 'bg-sky-50/70',
    borderColor: 'border-sky-300'
  }
];

interface TopCategoryStoriesProps {
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onNavigateCategory?: (slug: string) => void;
}

export const TopCategoryStories: React.FC<TopCategoryStoriesProps> = ({
  selectedCategory,
  onSelectCategory,
  onNavigateCategory
}) => {
  const handleItemClick = (item: CategoryHaloItem) => {
    if (onNavigateCategory) {
      onNavigateCategory(item.slug);
      return;
    }
    if (selectedCategory === item.categoryValue) {
      onSelectCategory('All');
    } else {
      onSelectCategory(item.categoryValue);
      // Smoothly scroll down to fashion categories or catalog if desired
      const targetElement = document.getElementById('fashion-categories-section');
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <section className="w-full bg-gradient-to-r from-[#fff0f7] via-white to-[#fff0f7] border-b border-pink-100 py-2.5 sm:py-3.5 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        
        {/* Horizontal Scrolling Track matching categories.jpeg */}
        <div 
          className="flex items-start justify-between sm:justify-center gap-3 sm:gap-6 md:gap-8 overflow-x-auto no-scrollbar py-1 px-1 scroll-smooth"
          id="top-category-capsules-track"
        >
          {CATEGORY_ITEMS.map((item) => {
            const isSelected = selectedCategory === item.categoryValue;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item)}
                className="group flex flex-col items-center shrink-0 focus:outline-none transition-transform duration-200"
                id={`btn-category-${item.id}`}
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
                        // Fallback image in case of broken link
                        if (e.currentTarget.src !== '/saree.jpeg' && !e.currentTarget.src.endsWith('/saree.jpeg')) {
                          e.currentTarget.src = '/saree.jpeg';
                        }
                      }}
                    />

                    {/* Subtle bottom soft shadow overlay */}
                    <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

                    {/* Active Selected Indicator Dot */}
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#e51975] ring-2 ring-white animate-pulse" />
                    )}
                  </div>
                </div>

                {/* Category Label */}
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
