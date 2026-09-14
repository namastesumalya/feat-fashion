import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingInputProps {
  rating: number;
  onChange: (rating: number) => void;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  showLabel?: boolean;
}

const RATING_LABELS: Record<number, string> = {
  1: '1.0 - Poor / Disappointed',
  2: '2.0 - Fair / Below expectations',
  3: '3.0 - Good / Met expectations',
  4: '4.0 - Very Good / Highly satisfied',
  5: '5.0 - Masterpiece / Outstanding craftsmanship'
};

export const StarRatingInput: React.FC<StarRatingInputProps> = ({
  rating,
  onChange,
  maxStars = 5,
  size = 'lg',
  disabled = false,
  showLabel = true
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const starSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9'
  };

  const currentDisplayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className="space-y-1.5">
      <div 
        className="flex items-center gap-1.5"
        onMouseLeave={() => !disabled && setHoverRating(null)}
      >
        {Array.from({ length: maxStars }, (_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= currentDisplayRating;
          const isHovered = hoverRating !== null && starValue <= hoverRating;

          return (
            <button
              key={starValue}
              type="button"
              id={`star-rating-btn-${starValue}`}
              disabled={disabled}
              onClick={() => !disabled && onChange(starValue)}
              onMouseEnter={() => !disabled && setHoverRating(starValue)}
              className={`transition-all duration-150 transform focus:outline-none ${
                disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:scale-115 active:scale-95'
              }`}
              aria-label={`Rate ${starValue} out of ${maxStars} stars`}
            >
              <Star
                className={`${starSizes[size]} ${
                  isFilled
                    ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                    : 'text-stone-300 fill-stone-100 hover:text-amber-300'
                } ${isHovered ? 'animate-pulse' : ''} transition-colors`}
              />
            </button>
          );
        })}
      </div>

      {showLabel && currentDisplayRating > 0 && (
        <p className="text-xs font-bold text-amber-900 bg-amber-50/80 px-2.5 py-1 rounded-lg inline-block border border-amber-200/60 animate-in fade-in duration-150">
          {RATING_LABELS[currentDisplayRating] || `${currentDisplayRating}.0 Stars`}
        </p>
      )}
    </div>
  );
};
