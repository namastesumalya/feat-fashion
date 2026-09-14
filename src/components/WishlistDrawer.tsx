import React, { useMemo } from 'react';
import { X, Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { Product } from '../types';
import { deduplicateProducts } from '../utils/productUtils';

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  wishlist: Product[];
  onRemoveFromWishlist: (product: Product, e?: React.MouseEvent) => void;
  onAddToCart: (product: Product, size: string, e?: React.MouseEvent) => void;
  onSelectProduct: (product: Product) => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({
  isOpen,
  onClose,
  wishlist,
  onRemoveFromWishlist,
  onAddToCart,
  onSelectProduct,
}) => {
  const cleanWishlist = useMemo(() => deduplicateProducts(wishlist), [wishlist]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-900 via-pink-950 to-pink-900 text-amber-100 p-4 flex items-center justify-between border-b border-amber-400/30">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-400 fill-pink-500" />
            <h3 className="font-extrabold text-base text-amber-200 font-serif">
              My Wishlist ({cleanWishlist.length} {cleanWishlist.length === 1 ? 'Item' : 'Items'})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full text-amber-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wishlist Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {cleanWishlist.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <div className="w-16 h-16 bg-pink-50 text-pink-600 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner">
                ❤️
              </div>
              <p className="font-bold text-gray-800 text-base font-serif">Your Wishlist is Empty!</p>
              <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                Save your favorite festive kurtis, sarees, dress materials and suits to review or purchase them anytime.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 bg-pink-900 text-amber-200 font-bold px-6 py-2.5 rounded-xl text-xs hover:bg-pink-800 transition-all shadow-md"
              >
                Explore Collection
              </button>
            </div>
          ) : (
            cleanWishlist.map((product) => {
              const defaultSize = (product.sizes || []).find(sz => (product.sizeStock?.[sz] !== undefined ? Number(product.sizeStock[sz]) > 0 : true)) || product.sizes?.[0] || 'Free Size';

              return (
                <div
                  key={`wish-${product.id}`}
                  className="bg-white rounded-2xl border border-pink-100 p-3 shadow-xs hover:shadow-md transition-all flex gap-3 relative group"
                >
                  <div
                    className="w-20 h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0 cursor-pointer relative"
                    onClick={() => onSelectProduct(product)}
                  >
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    {product.discountPercent > 0 && (
                      <span className="absolute top-1 left-1 bg-pink-900 text-amber-300 font-extrabold text-[9px] px-1.5 py-0.5 rounded-md">
                        {product.discountPercent}% OFF
                      </span>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4
                          onClick={() => onSelectProduct(product)}
                          className="font-bold text-xs text-gray-900 truncate hover:text-pink-900 cursor-pointer font-serif"
                        >
                          {product.name}
                        </h4>
                        <button
                          type="button"
                          onClick={(e) => onRemoveFromWishlist(product, e)}
                          className="text-gray-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                          title="Remove from Wishlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-[10px] text-pink-800 font-semibold mt-0.5">
                        {product.category} • {product.collection}
                      </p>

                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="font-extrabold text-xs text-pink-950">₹{product.price.toLocaleString()}</span>
                        {product.originalPrice > product.price && (
                          <span className="text-[10px] text-gray-400 line-through">₹{product.originalPrice.toLocaleString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      {(() => {
                        const isOutOfStock = (product.sizeStock && Object.keys(product.sizeStock).length > 0)
                          ? Object.values(product.sizeStock).reduce((sum, v) => sum + (Number(v) || 0), 0) <= 0
                          : (Number(product.stockCount) || 0) <= 0;

                        return (
                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={(e) => {
                              if (!isOutOfStock) {
                                onAddToCart(product, defaultSize, e);
                              }
                            }}
                            className={`flex-1 font-bold py-1.5 px-3 rounded-xl text-[11px] transition-all flex items-center justify-center gap-1.5 shadow-xs ${
                              isOutOfStock
                                ? 'bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed'
                                : 'bg-pink-900 hover:bg-pink-800 text-amber-200'
                            }`}
                          >
                            <ShoppingBag className={`w-3.5 h-3.5 ${isOutOfStock ? 'text-gray-400' : 'text-amber-300'}`} />
                            <span>{isOutOfStock ? 'Out of stock' : `Add to Cart (${defaultSize})`}</span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {wishlist.length > 0 && (
          <div className="p-4 border-t border-pink-100 bg-pink-50/50 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-gray-600">
              {wishlist.length} Saved {wishlist.length === 1 ? 'Outfit' : 'Outfits'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-pink-900 hover:text-pink-950 font-extrabold flex items-center gap-1 underline"
            >
              <span>Continue Browsing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
