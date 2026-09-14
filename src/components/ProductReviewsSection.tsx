import React, { useState, useRef } from 'react';
import { 
  Star, 
  CheckCircle2, 
  ThumbsUp, 
  MessageSquare, 
  ShieldCheck, 
  User, 
  Lock, 
  Filter,
  Check,
  Send,
  HelpCircle,
  ShoppingBag,
  Plus,
  X,
  Upload,
  Image as ImageIcon,
  AlertCircle,
  Maximize2
} from 'lucide-react';
import { Product, ProductReview, Order } from '../types';
import { StarRatingInput } from './StarRatingInput';

interface ProductReviewsSectionProps {
  product: Product;
  orders?: Order[];
  currentUser: any;
  onOpenAuth: () => void;
  onSubmitReview: (productId: string, review: {
    rating: number;
    comment: string;
    headline?: string;
    userName: string;
    userEmail?: string;
    sizePurchased?: string;
    fitFeedback?: 'Runs Small' | 'True to Size' | 'Runs Large';
    images?: string[];
  }) => Promise<void | ProductReview>;
}

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({
  product,
  orders = [],
  currentUser,
  onOpenAuth,
  onSubmitReview
}) => {
  // Modal / Expansion state for "+ Write a Review"
  const [isWritingReview, setIsWritingReview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [rating, setRating] = useState<number>(5);
  const [headline, setHeadline] = useState('');
  const [comment, setComment] = useState('');
  const [sizePurchased, setSizePurchased] = useState(product.sizes?.[0] || 'Free Size');
  const [fitFeedback, setFitFeedback] = useState<'Runs Small' | 'True to Size' | 'Runs Large'>('True to Size');
  const [userName, setUserName] = useState(currentUser?.displayName || currentUser?.email?.split('@')[0] || '');
  
  // Image Upload State (Up to 2 images)
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  // Lightbox Modal for viewing review photos
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');
  
  // Helpful votes state
  const [votedHelpful, setVotedHelpful] = useState<Record<string, boolean>>({});
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>({});

  // 1. Check if user is authenticated and has genuinely purchased this product
  const userEmail = (currentUser?.email || '').trim().toLowerCase();
  const userId = currentUser?.uid || '';
  
  const matchingPurchasedOrders = orders.filter(order => {
    const isUserOrder = 
      (userEmail && order.customerEmail?.trim().toLowerCase() === userEmail) ||
      (userId && (order as any).userId === userId);
    
    if (!isUserOrder) return false;
    return (order.items || []).some(item => item.product?.id === product.id);
  });

  const isVerifiedPurchaser = Boolean(currentUser && matchingPurchasedOrders.length > 0);
  const latestPurchasedOrder = matchingPurchasedOrders[0];

  // 2. Genuine Reviews list (strictly what's recorded)
  const allReviews: ProductReview[] = Array.isArray(product.reviews) ? product.reviews : [];
  const totalReviewsCount = allReviews.length;
  
  // Star breakdown calculation based on genuine reviews
  const ratingDistribution = {
    5: allReviews.filter(r => Math.round(r.rating) === 5).length,
    4: allReviews.filter(r => Math.round(r.rating) === 4).length,
    3: allReviews.filter(r => Math.round(r.rating) === 3).length,
    2: allReviews.filter(r => Math.round(r.rating) === 2).length,
    1: allReviews.filter(r => Math.round(r.rating) === 1).length
  };

  const calculateAverageRating = () => {
    if (totalReviewsCount === 0) return 0;
    const total = allReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
    return Number((total / totalReviewsCount).toFixed(1));
  };

  const avgRating = calculateAverageRating();

  // Filtered reviews
  const filteredReviews = allReviews.filter(r => {
    if (filterRating === 'all') return true;
    return Math.round(r.rating) === filterRating;
  });

  const handleHelpfulClick = (reviewId: string) => {
    if (votedHelpful[reviewId]) return;
    setVotedHelpful(prev => ({ ...prev, [reviewId]: true }));
    setHelpfulCounts(prev => ({
      ...prev,
      [reviewId]: (prev[reviewId] || 0) + 1
    }));
  };

  // Image Upload Handlers
  const handleProcessFiles = (files: FileList | null) => {
    setImageError(null);
    if (!files || files.length === 0) return;

    const remainingSlots = 2 - uploadedImages.length;
    if (remainingSlots <= 0) {
      setImageError('You can upload a maximum of 2 photos per review.');
      return;
    }

    const filesToRead = Array.from(files).slice(0, remainingSlots);
    filesToRead.forEach(file => {
      if (!file.type.startsWith('image/')) {
        setImageError('Only image files (JPG, PNG, WEBP) are supported.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setImageError('Image size exceeds 5MB. Please upload a smaller image.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setUploadedImages(prev => {
            if (prev.length >= 2) return prev;
            return [...prev, result];
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setUploadedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setImageError(null);
  };

  const handleOpenWriteReview = () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setIsWritingReview(true);
    setErrorMessage(null);
    setSubmitSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (!isVerifiedPurchaser) {
      setErrorMessage('Only genuine verified buyers who purchased this item can submit reviews.');
      return;
    }

    if (rating < 1 || rating > 5) {
      setErrorMessage('Please select a star rating between 1 and 5.');
      return;
    }

    if (!comment.trim() || comment.trim().length < 5) {
      setErrorMessage('Please write a review of at least 5 characters sharing your experience.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitReview(product.id, {
        rating,
        headline: headline.trim() || undefined,
        comment: comment.trim(),
        userName: userName.trim() || currentUser.displayName || 'Verified Buyer',
        userEmail: currentUser.email || '',
        sizePurchased,
        fitFeedback,
        images: uploadedImages
      });

      setSubmitSuccess(true);
      setComment('');
      setHeadline('');
      setUploadedImages([]);
      setTimeout(() => {
        setSubmitSuccess(false);
        setIsWritingReview(false);
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="product-reviews-section" className="bg-white rounded-3xl shadow-lg border border-pink-100 p-6 sm:p-8 space-y-8">
      
      {/* 1. Header & Title with "+ Write a Review" Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-pink-100 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-pink-700 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-200">
              Verified Customer Feedback
            </span>
            <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              100% Genuine Purchases
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-pink-950 font-serif mt-1">
            Ratings &amp; Genuine Customer Reviews
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {totalReviewsCount > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-50 px-3.5 py-1.5 rounded-2xl border border-amber-200">
              <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
              <span className="text-base font-black text-amber-950">{avgRating}</span>
              <span className="text-xs text-amber-800 font-medium">({totalReviewsCount})</span>
            </div>
          )}

          {/* "+ Write a Review" Button */}
          {!isWritingReview && (
            <button
              type="button"
              id="write-review-top-btn"
              onClick={handleOpenWriteReview}
              className="bg-gradient-to-r from-pink-950 to-pink-900 hover:from-pink-900 hover:to-pink-800 text-amber-200 font-extrabold text-xs px-4 py-2.5 rounded-2xl shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>Write a Review</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Rating Overview & Breakdown Grid (Displayed when there are genuine reviews) */}
      {totalReviewsCount > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-stone-50/70 p-6 rounded-3xl border border-stone-200/80">
          
          {/* Left: Overall Score Card */}
          <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
            <span className="text-5xl font-black text-pink-950 font-serif">{avgRating}</span>
            <div className="flex items-center gap-1 my-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < Math.round(avgRating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-stone-300 fill-stone-100'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs font-bold text-stone-700">
              Based on {totalReviewsCount} {totalReviewsCount === 1 ? 'verified review' : 'verified reviews'}
            </p>
          </div>

          {/* Right: Star Histogram Breakdown */}
          <div className="md:col-span-8 flex flex-col justify-center space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-stone-600 mb-1">
              <span>Rating Breakdown</span>
              <span>Filter by clicking stars</span>
            </div>

            {[5, 4, 3, 2, 1].map((stars) => {
              const count = (ratingDistribution as any)[stars] || 0;
              const percentage = totalReviewsCount > 0 ? Math.round((count / totalReviewsCount) * 100) : 0;
              const isSelected = filterRating === stars;

              return (
                <button
                  key={stars}
                  type="button"
                  id={`filter-star-${stars}`}
                  onClick={() => setFilterRating(filterRating === stars ? 'all' : stars)}
                  className={`w-full flex items-center gap-3 text-xs font-semibold p-1.5 rounded-xl transition-all ${
                    isSelected 
                      ? 'bg-amber-100/70 border border-amber-300' 
                      : 'hover:bg-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-1 w-14 shrink-0 justify-end font-bold text-stone-700">
                    <span>{stars}</span>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  </div>

                  <div className="flex-1 h-3 bg-stone-200/80 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="w-12 text-right text-stone-500 font-medium text-[11px]">
                    {count} ({percentage}%)
                  </div>
                </button>
              );
            })}
          </div>

        </div>
      ) : (
        <div className="text-center py-6 px-4 bg-stone-50/80 rounded-2xl border border-dashed border-stone-300">
          <p className="text-sm font-bold text-stone-800">
            No reviews submitted yet for this newly added design.
          </p>
          <p className="text-xs text-stone-500 mt-1">
            Be the first verified customer to share your genuine thoughts, fit feedback, and photos!
          </p>
        </div>
      )}

      {/* 3. User Review / Ratings Window (Opens when user clicks "+ Write a Review") */}
      {isWritingReview && (
        <div id="submit-review-card" className="bg-gradient-to-br from-pink-50/90 via-white to-amber-50/70 rounded-3xl p-6 sm:p-8 border-2 border-pink-300 shadow-md space-y-6 animate-in slide-in-from-top-4 duration-300">
          
          <div className="flex items-center justify-between border-b border-pink-200 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-pink-950 text-amber-200 flex items-center justify-center font-black text-sm">
                ★
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-pink-950">
                  Write a Genuine Review
                </h3>
                <p className="text-xs text-stone-600">
                  Share your experience, fit rating, and up to 2 product photos
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsWritingReview(false)}
              className="p-1.5 rounded-full text-stone-500 hover:text-stone-800 hover:bg-pink-100 transition-colors"
              aria-label="Close review form"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* State A: User is signed in, but has NOT purchased this product */}
          {currentUser && !isVerifiedPurchaser && (
            <div className="p-5 bg-amber-50/90 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-3">
              <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                <ShieldCheck className="w-5 h-5 text-amber-700" />
                <span>Genuine Verified Buyer Policy</span>
              </div>
              <p className="leading-relaxed">
                Hi <strong className="text-pink-950">{currentUser.displayName || currentUser.email}</strong>, to protect our community against fake ratings, reviews are strictly accepted only from verified customers who have purchased this specific item.
              </p>
              <p className="text-[11px] text-amber-800">
                💡 <em>Have you placed an order for this piece?</em> Please verify you are logged in with the exact email address used at checkout ({currentUser.email}).
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsWritingReview(false)}
                  className="bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold px-4 py-1.5 rounded-xl text-xs transition-colors"
                >
                  Close Window
                </button>
              </div>
            </div>
          )}

          {/* State B: User is signed in AND is a Verified Purchaser -> SHOW RATING & REVIEW FORM */}
          {currentUser && isVerifiedPurchaser && (
            <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in duration-200">
              
              {/* Purchase Confirmation Ribbon */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    Verified Purchase Confirmed: <strong>Order #{latestPurchasedOrder?.id.slice(-8)}</strong>
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                  Eligible for Review
                </span>
              </div>

              {/* 1. Star Rating Input */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-stone-800 uppercase tracking-wider">
                  1. Select Overall Star Rating <span className="text-rose-600">*</span>
                </label>
                <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs">
                  <StarRatingInput
                    rating={rating}
                    onChange={(newRating) => setRating(newRating)}
                    size="lg"
                    showLabel={true}
                  />
                </div>
              </div>

              {/* 2. Customer Image Upload (Up to 2 images) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-stone-800 uppercase tracking-wider">
                    2. Upload Product Photos <span className="text-stone-500 font-normal normal-case">(Optional, max 2 images)</span>
                  </label>
                  <span className="text-[11px] font-semibold text-pink-900 bg-pink-100/70 px-2 py-0.5 rounded-md">
                    {uploadedImages.length}/2 Photos Added
                  </span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleProcessFiles(e.target.files)}
                />

                {/* Upload Trigger Area */}
                {uploadedImages.length < 2 && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingImage(true); }}
                    onDragLeave={() => setIsDraggingImage(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingImage(false);
                      handleProcessFiles(e.dataTransfer.files);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                      isDraggingImage
                        ? 'border-pink-600 bg-pink-50'
                        : 'border-stone-300 hover:border-pink-500 bg-stone-50/60 hover:bg-pink-50/30'
                    }`}
                  >
                    <Upload className="w-6 h-6 text-pink-700 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-stone-800">
                      Click to browse or drag &amp; drop photos
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Showcase fabric sheen, border detailing, or festive try-on (JPG, PNG, WEBP)
                    </p>
                  </div>
                )}

                {imageError && (
                  <p className="text-xs font-bold text-rose-800 bg-rose-50 p-2 rounded-xl border border-rose-200 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{imageError}</span>
                  </p>
                )}

                {/* Uploaded Photos Preview List */}
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    {uploadedImages.map((imgSrc, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden border-2 border-pink-200 bg-stone-100 aspect-square">
                        <img 
                          src={imgSrc} 
                          alt={`Uploaded review photo ${idx + 1}`} 
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                          className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full transition-colors shadow"
                          title="Remove image"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <span className="absolute bottom-1 left-1 bg-black/60 text-[10px] text-white px-1.5 py-0.5 rounded font-bold">
                          Photo {idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Review Headline & Reviewer Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-stone-800">
                    Headline / Summary (Optional)
                  </label>
                  <input
                    type="text"
                    id="review-headline-input"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. Stunning weave &amp; perfect festive drape!"
                    className="w-full px-3.5 py-2 text-xs border border-stone-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-pink-700 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-stone-800">
                    Display Name on Review
                  </label>
                  <input
                    type="text"
                    id="review-username-input"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Your Name"
                    required
                    className="w-full px-3.5 py-2 text-xs border border-stone-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-pink-700 font-medium"
                  />
                </div>
              </div>

              {/* 4. Size & Fit Feedback */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-stone-200/90">
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-stone-800">
                    Size Purchased
                  </label>
                  <select
                    id="review-size-select"
                    value={sizePurchased}
                    onChange={(e) => setSizePurchased(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-stone-50 font-medium focus:outline-none focus:ring-2 focus:ring-pink-700"
                  >
                    {(product.sizes && product.sizes.length > 0 ? product.sizes : ['Free Size', 'S', 'M', 'L', 'XL', 'XXL']).map((sz) => (
                      <option key={sz} value={sz}>Size: {sz}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-stone-800">
                    Fit Experience
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['Runs Small', 'True to Size', 'Runs Large'] as const).map((fit) => (
                      <button
                        key={fit}
                        type="button"
                        onClick={() => setFitFeedback(fit)}
                        className={`text-[11px] font-bold py-1.5 px-2 rounded-lg border transition-all text-center ${
                          fitFeedback === fit
                            ? 'bg-pink-950 text-amber-200 border-pink-900 shadow-xs'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {fit}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5. Detailed Review Comment */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-stone-800">
                    Detailed Review <span className="text-rose-600">*</span>
                  </label>
                  <span className="text-[11px] text-stone-500">{comment.length} / 500 chars</span>
                </div>
                <textarea
                  id="review-comment-textarea"
                  rows={4}
                  maxLength={500}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share details about fabric softness, color vibrancy in daylight, weaving richness, and overall comfort..."
                  required
                  className="w-full px-3.5 py-2.5 text-xs border border-stone-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-pink-700 font-medium leading-relaxed"
                />
              </div>

              {errorMessage && (
                <p className="text-xs font-bold text-rose-800 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {errorMessage}
                </p>
              )}

              {submitSuccess && (
                <div className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 animate-bounce">
                  <Check className="w-4 h-4" />
                  <span>Thank you! Your verified rating and review have been submitted successfully.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  id="submit-product-review-btn"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-pink-950 to-pink-900 hover:from-pink-900 hover:to-pink-800 text-amber-200 font-extrabold px-8 py-3 rounded-2xl shadow-md transition-all text-xs flex items-center justify-center gap-2 hover:scale-102 active:scale-95 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span>Submitting Review...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-amber-300" />
                      <span>Submit Verified Review</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsWritingReview(false)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold px-5 py-3 rounded-2xl text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>

            </form>
          )}

        </div>
      )}

      {/* 4. Genuine Customer Reviews List */}
      <div className="space-y-4 pt-2">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-pink-800" />
            <h3 className="text-base font-extrabold text-stone-900">
              Customer Reviews ({filteredReviews.length})
            </h3>
          </div>

          {/* Filter Pills */}
          {totalReviewsCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-stone-500 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              <button
                type="button"
                onClick={() => setFilterRating('all')}
                className={`text-xs px-2.5 py-1 rounded-full font-bold transition-all ${
                  filterRating === 'all'
                    ? 'bg-pink-950 text-amber-200'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                All ({allReviews.length})
              </button>
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = (ratingDistribution as any)[stars] || 0;
                if (count === 0 && filterRating !== stars) return null;
                return (
                  <button
                    key={stars}
                    type="button"
                    onClick={() => setFilterRating(stars)}
                    className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 transition-all ${
                      filterRating === stars
                        ? 'bg-amber-400 text-pink-950 border border-amber-300'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    <span>{stars}★</span>
                    <span className="text-[10px] opacity-80">({count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Reviews List Cards */}
        {filteredReviews.length === 0 ? (
          <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-300 p-6 space-y-3">
            <p className="text-xs font-bold text-stone-700">
              {filterRating !== 'all' 
                ? `No ${filterRating}-star reviews match your filter.` 
                : 'No reviews submitted yet for this newly added design.'}
            </p>
            <p className="text-[11px] text-stone-500">
              Be the first verified customer to share your genuine review and upload photos!
            </p>
            {!isWritingReview && (
              <button
                type="button"
                onClick={handleOpenWriteReview}
                className="mt-2 bg-pink-950 hover:bg-pink-900 text-amber-200 font-extrabold text-xs px-4 py-2 rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-amber-300" />
                <span>+ Write the First Review</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((rev) => {
              const isHelpful = votedHelpful[rev.id];
              const helpfulCount = (rev.helpfulCount || 0) + (helpfulCounts[rev.id] || 0);

              return (
                <div 
                  key={rev.id} 
                  className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs space-y-3.5 transition-all hover:border-pink-200"
                >
                  
                  {/* Top line: Stars, Date & Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.round(rev.rating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-stone-300 fill-stone-100'
                            }`}
                          />
                        ))}
                      </div>
                      {rev.headline && (
                        <h4 className="text-xs sm:text-sm font-extrabold text-stone-900">
                          {rev.headline}
                        </h4>
                      )}
                    </div>

                    <span className="text-[11px] text-stone-500">
                      Reviewed on {rev.date}
                    </span>
                  </div>

                  {/* Review Text */}
                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                    {rev.comment}
                  </p>

                  {/* Customer Uploaded Photos (Up to 2 images) */}
                  {rev.images && rev.images.length > 0 && (
                    <div className="flex items-center gap-3 pt-1">
                      {rev.images.map((imgSrc, imgIdx) => (
                        <button
                          key={imgIdx}
                          type="button"
                          onClick={() => setSelectedLightboxImage(imgSrc)}
                          className="relative group w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-stone-300 shadow-2xs hover:border-pink-600 transition-all cursor-zoom-in"
                        >
                          <img 
                            src={imgSrc} 
                            alt={`Review photo ${imgIdx + 1}`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Maximize2 className="w-4 h-4 drop-shadow" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tags: Size purchased & Fit */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    {rev.sizePurchased && (
                      <span className="bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-md font-semibold border border-stone-200">
                        Size: {rev.sizePurchased}
                      </span>
                    )}
                    {rev.fitFeedback && (
                      <span className="bg-pink-50 text-pink-900 px-2.5 py-0.5 rounded-md font-semibold border border-pink-200">
                        Fit: {rev.fitFeedback}
                      </span>
                    )}
                  </div>

                  {/* Bottom: Reviewer details & Helpful button */}
                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-pink-100 text-pink-900 font-bold text-[10px] flex items-center justify-center">
                        {rev.userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-stone-900">{rev.userName}</span>
                      {rev.verified && (
                        <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Verified Buyer
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleHelpfulClick(rev.id)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                        isHelpful
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200'
                      }`}
                    >
                      <ThumbsUp className={`w-3 h-3 ${isHelpful ? 'text-emerald-700 fill-emerald-600' : ''}`} />
                      <span>{isHelpful ? 'Helpful' : 'Helpful'} ({helpfulCount})</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* 5. Lightbox Modal for zooming reviewer uploaded photos */}
      {selectedLightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedLightboxImage(null)}
        >
          <div 
            className="relative max-w-2xl max-h-[85vh] bg-stone-900 rounded-2xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedLightboxImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/70 hover:bg-black text-white rounded-full transition-colors z-10"
              aria-label="Close photo"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={selectedLightboxImage} 
              alt="Customer Review Photo" 
              className="max-h-[75vh] w-auto mx-auto object-contain rounded-xl"
            />
            <p className="text-center text-xs text-stone-300 font-medium py-2">
              📸 Genuine Customer Try-on / Product Photo
            </p>
          </div>
        </div>
      )}

    </section>
  );
};
