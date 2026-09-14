import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  ShoppingBag, 
  Heart, 
  User, 
  MoreVertical, 
  X, 
  Bell, 
  Tag, 
  ShieldCheck, 
  Phone, 
  BookOpen,
  LogOut, 
  CheckCheck,
  Package,
  Instagram,
  Facebook,
  Youtube,
  FileText,
  RefreshCcw,
  Truck
} from 'lucide-react';
import { Product, PushNotification } from '../types';
import searchBgFeathers from '../assets/images/light_bubblegum_feathers_1786721099304.jpg';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigateHome?: () => void;
  cartCount: number;
  wishlistCount: number;
  unreadNotifCount: number;
  notifications: PushNotification[];
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onOpenDashboard: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onOpenOffers?: () => void;
  onNavigateAbout?: () => void;
  onOpenContact?: () => void;
  onNavigatePolicy?: (path: string) => void;
  products: Product[];
  onSelectProduct: (p: Product) => void;
  currentUser: any;
  onMarkAllNotificationsRead?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  onNavigateHome,
  cartCount,
  wishlistCount,
  unreadNotifCount,
  notifications,
  onOpenCart,
  onOpenWishlist,
  onOpenDashboard,
  onOpenAuth,
  onSignOut,
  onOpenOffers,
  onNavigateAbout,
  onOpenContact,
  onNavigatePolicy,
  products,
  onSelectProduct,
  currentUser,
  onMarkAllNotificationsRead
}) => {
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [isSearchOpenDesktop, setIsSearchOpenDesktop] = useState(false);
  const [isWishlistBouncing, setIsWishlistBouncing] = useState(false);
  const [isWishlistDropping, setIsWishlistDropping] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Listen for floating feather wishlist hit and drop events
  useEffect(() => {
    const handleFeatherHit = () => {
      setIsWishlistBouncing(true);
      setTimeout(() => {
        setIsWishlistBouncing(false);
      }, 700);
    };

    const handleFeatherDrop = () => {
      setIsWishlistDropping(true);
      setTimeout(() => {
        setIsWishlistDropping(false);
      }, 700);
    };

    window.addEventListener('feather-wishlist-hit', handleFeatherHit);
    window.addEventListener('feather-wishlist-drop', handleFeatherDrop);
    return () => {
      window.removeEventListener('feather-wishlist-hit', handleFeatherHit);
      window.removeEventListener('feather-wishlist-drop', handleFeatherDrop);
    };
  }, []);

  const filteredSuggestions = searchQuery.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.collection.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  // Toggle desktop/tablet search bar expander
  const handleToggleSearchDesktop = () => {
    setIsSearchOpenDesktop(prev => {
      const nextState = !prev;
      if (nextState) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 150);
      }
      return nextState;
    });
  };

  // Close suggestions or desktop search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchSuggestions(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-white via-[#fff0f7] to-white border-b border-pink-100 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 flex flex-col gap-2 sm:gap-2.5">
        
        {/* Top Bar: (3-Dots Menu + Logo & Brand) on Left | Search (Desktop/Tablet), Profile, Wishlist, Cart on Right */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-3">
          
          {/* Left Group: 3-Dots Menu and Brand Logo & Title right beside it */}
          <div className="flex items-center gap-1 sm:gap-2.5 min-w-0 shrink">
            
            {/* 3-Dots Menu */}
            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-pink-50/60 active:bg-pink-100 rounded-full text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400"
                aria-label="Open navigation menu"
                id="btn-navbar-menu"
              >
                <MoreVertical className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.4]" />
              </button>

              {/* Dropdown Menu for 3-dots */}
              {isMenuOpen && (
                <div className="absolute left-0 top-11 sm:top-12 w-64 sm:w-72 bg-white rounded-2xl shadow-2xl border border-pink-100/80 py-2.5 z-50 text-gray-800 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Feat: Navigation</p>
                    <p className="text-sm font-bold text-[#e51975] font-luxury-serif tracking-wide">Feather Hut Fashion™</p>
                  </div>

                  <div className="py-1 text-xs sm:text-sm font-medium">
                    {/* Notifications */}
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setShowNotifModal(true);
                      }}
                      className="w-full px-4 py-2.5 hover:bg-pink-50 flex items-center justify-between text-left text-gray-700 hover:text-pink-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Bell className="w-4 h-4 text-[#e51975]" />
                        <span>Notifications</span>
                      </div>
                      {unreadNotifCount > 0 && (
                        <span className="bg-[#e51975] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {unreadNotifCount}
                        </span>
                      )}
                    </button>

                    {/* Offers & Deals */}
                    {onOpenOffers && (
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenOffers();
                        }}
                        className="w-full px-4 py-2.5 hover:bg-pink-50 flex items-center gap-3 text-left text-gray-700 hover:text-pink-700 transition-colors"
                      >
                        <Tag className="w-4 h-4 text-amber-600" />
                        <span>Special Offers & Coupons</span>
                      </button>
                    )}

                    {/* Track / View Orders */}
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        if (currentUser) {
                          onOpenDashboard();
                        } else {
                          onOpenAuth();
                        }
                      }}
                      className="w-full px-4 py-2.5 hover:bg-pink-50 flex items-center gap-3 text-left text-gray-700 hover:text-pink-700 transition-colors"
                    >
                      <Package className="w-4 h-4 text-blue-600" />
                      <span>Track Order & History</span>
                    </button>

                    {/* About Us Full Page */}
                    {onNavigateAbout && (
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          onNavigateAbout();
                        }}
                        className="w-full px-4 py-2.5 hover:bg-pink-50 flex items-center gap-3 text-left text-gray-700 hover:text-pink-700 transition-colors"
                      >
                        <BookOpen className="w-4 h-4 text-pink-600" />
                        <span>About Us & Heritage</span>
                      </button>
                    )}

                    {/* Customer Care & Contact */}
                    {onOpenContact && (
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenContact();
                        }}
                        className="w-full px-4 py-2.5 hover:bg-pink-50 flex items-center gap-3 text-left text-gray-700 hover:text-pink-700 transition-colors"
                      >
                        <Phone className="w-4 h-4 text-emerald-600" />
                        <span>Contact Helpline & Support</span>
                      </button>
                    )}

                    {/* Policy & Terms Dedicated Pages */}
                    {onNavigatePolicy && (
                      <div className="border-t border-gray-100 my-1 pt-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-1">
                          Legal & Policies
                        </p>
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            onNavigatePolicy('/terms');
                          }}
                          className="w-full px-4 py-1.5 hover:bg-pink-50 flex items-center gap-3 text-left text-xs text-gray-700 hover:text-pink-700 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-pink-600" />
                          <span>Terms &amp; Conditions</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            onNavigatePolicy('/privacy-policy');
                          }}
                          className="w-full px-4 py-1.5 hover:bg-pink-50 flex items-center gap-3 text-left text-xs text-gray-700 hover:text-pink-700 transition-colors"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                          <span>Privacy Policy</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            onNavigatePolicy('/return-and-cancellation');
                          }}
                          className="w-full px-4 py-1.5 hover:bg-pink-50 flex items-center gap-3 text-left text-xs text-gray-700 hover:text-pink-700 transition-colors"
                        >
                          <RefreshCcw className="w-3.5 h-3.5 text-amber-600" />
                          <span>Refund &amp; Cancellation</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            onNavigatePolicy('/shipping-and-delivery');
                          }}
                          className="w-full px-4 py-1.5 hover:bg-pink-50 flex items-center gap-3 text-left text-xs text-gray-700 hover:text-pink-700 transition-colors"
                        >
                          <Truck className="w-3.5 h-3.5 text-blue-600" />
                          <span>Shipping &amp; Delivery</span>
                        </button>
                      </div>
                    )}

                    {/* Social Media & Channels */}
                    <div className="border-t border-gray-100 my-1 pt-2.5 px-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                        Connect With Us
                      </p>
                      <div className="flex items-center gap-3 pb-1">
                        {/* Instagram */}
                        <a
                          href="https://www.instagram.com/featherhutfashion"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-xs hover:scale-110 active:scale-95 transition-transform"
                          title="Follow Feat on Instagram"
                          onClick={() => setIsMenuOpen(false)}
                          aria-label="Instagram"
                        >
                          <Instagram className="w-4 h-4 stroke-[2]" />
                        </a>

                        {/* Facebook */}
                        <a
                          href="https://www.facebook.com/share/1BWWt6ZKBr/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs hover:scale-110 active:scale-95 transition-transform"
                          title="Like us on Facebook"
                          onClick={() => setIsMenuOpen(false)}
                          aria-label="Facebook"
                        >
                          <Facebook className="w-4 h-4 stroke-[2]" />
                        </a>

                        {/* YouTube */}
                        <a
                          href="https://youtube.com/@featherhutfashion"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xs hover:scale-110 active:scale-95 transition-transform"
                          title="Watch styling on YouTube"
                          onClick={() => setIsMenuOpen(false)}
                          aria-label="YouTube"
                        >
                          <Youtube className="w-4 h-4 stroke-[2]" />
                        </a>
                      </div>
                    </div>

                    {currentUser && (
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          onSignOut();
                        }}
                        className="w-full px-4 py-2.5 hover:bg-red-50 flex items-center gap-3 text-left text-red-600 font-semibold transition-colors border-t border-gray-100 mt-1"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span>Sign Out</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Brand Area: Logo Image (No circle) + "FEAT Feather Hut Fashion™" right beside 3-dots */}
            <div 
              onClick={() => {
                onSearchChange('');
                if (onNavigateHome) onNavigateHome();
              }}
              className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 cursor-pointer select-none group min-w-0"
              id="brand-header-logo"
            >
              {/* Logo Image without circular border/mask */}
              <img
                src="/logo.png"
                alt="FEAT Feather Hut Fashion"
                className="h-7 xs:h-8 sm:h-10 md:h-11 w-auto object-contain max-w-[42px] xs:max-w-[55px] sm:max-w-[110px] drop-shadow-2xs group-hover:scale-105 transition-transform shrink-0"
                onError={(e) => {
                  e.currentTarget.src = '/logo.jpeg';
                }}
              />

              {/* Typography: FEAT Feather Hut Fashion™ (Sherif Luxury Font - Bold) - Mobile Optimized & Never Hidden */}
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1.5 md:gap-2 shrink-0 min-w-0 font-luxury-serif">
                <span className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold sm:font-extrabold text-[#e51975] tracking-wide group-hover:scale-105 transition-transform shrink-0 leading-none">
                  FEAT
                </span>
                <span className="text-[8px] xs:text-[9.5px] sm:text-xs md:text-[13.5px] font-bold text-[#e51975] tracking-wider uppercase whitespace-nowrap self-start sm:self-end leading-tight sm:leading-none sm:pb-0.5">
                  Feather Hut Fashion<span className="text-[6.5px] xs:text-[7.5px] sm:text-[9px] font-sans font-bold ml-0.5 opacity-90">™</span>
                </span>
              </div>
            </div>

          </div>

          {/* Right: Search Button (Tablet/Desktop), User Profile, Wishlist, Cart Icons */}
          <div className="flex items-center gap-0.5 xs:gap-1.5 sm:gap-2.5 md:gap-3 shrink-0">
            
            {/* Search Button: Visible on Tablet & Desktop (md:) beside signin/user profile button */}
            <button
              type="button"
              onClick={handleToggleSearchDesktop}
              className={`hidden md:flex w-9 h-9 items-center justify-center rounded-full transition-all relative focus:outline-none ${
                isSearchOpenDesktop || searchQuery
                  ? 'bg-pink-100 text-[#e51975] ring-2 ring-pink-300'
                  : 'text-gray-900 hover:text-[#e51975] hover:bg-pink-50/70 active:bg-pink-100'
              }`}
              title={isSearchOpenDesktop ? 'Close Search' : 'Search products'}
              id="btn-desktop-search-toggle"
            >
              {isSearchOpenDesktop && !searchQuery ? (
                <X className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <Search className="w-5 h-5 stroke-[2.2]" />
              )}
            </button>

            {/* User Profile / Sign In */}
            <button
              type="button"
              onClick={() => {
                if (currentUser) {
                  onOpenDashboard();
                } else {
                  onOpenAuth();
                }
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-gray-900 hover:text-[#e51975] hover:bg-pink-50/50 active:bg-pink-100 rounded-full transition-colors relative focus:outline-none"
              title={currentUser ? (currentUser.displayName || 'My Account') : 'Sign In'}
              id="btn-user-profile"
            >
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="Profile"
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover border border-pink-400"
                />
              ) : (
                <User className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.9]" />
              )}
            </button>

            {/* Wishlist Heart */}
            <button
              type="button"
              onClick={onOpenWishlist}
              className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-gray-900 hover:text-[#e51975] hover:bg-pink-50/50 active:bg-pink-100 rounded-full transition-all relative focus:outline-none ${
                isWishlistBouncing ? 'animate-wishlist-hit text-[#e51975] bg-pink-100 ring-2 ring-pink-400' : ''
              } ${
                isWishlistDropping ? 'animate-wishlist-drop text-gray-600 bg-pink-50/80' : ''
              }`}
              title="Wishlist"
              id="btn-wishlist"
            >
              <Heart className={`w-5 h-5 sm:w-6 sm:h-6 stroke-[1.9] transition-transform ${isWishlistBouncing ? 'fill-[#e51975] scale-110' : ''} ${isWishlistDropping ? 'scale-90 text-rose-500' : ''}`} />
              {wishlistCount > 0 && (
                <span className={`absolute top-0.5 right-0.5 bg-[#e51975] text-white text-[9px] sm:text-[10px] font-bold w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center shadow-xs transition-transform ${isWishlistBouncing ? 'scale-125 bg-amber-500 ring-2 ring-white' : ''} ${isWishlistDropping ? 'scale-90 bg-rose-600' : ''}`}>
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Cart Bag */}
            <button
              type="button"
              onClick={onOpenCart}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-gray-900 hover:text-[#e51975] hover:bg-pink-50/50 active:bg-pink-100 rounded-full transition-colors relative focus:outline-none"
              title="Shopping Cart"
              id="btn-cart"
            >
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.9]" />
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-[#e51975] text-white text-[9px] sm:text-[10px] font-bold w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

        </div>

        {/* Search Bar Container: Always visible on Mobile (< md), expandable on Tablet/Desktop (md:) */}
        <div 
          className={`w-full relative transition-all duration-200 ${
            isSearchOpenDesktop || searchQuery.trim().length > 0 
              ? 'block animate-in fade-in slide-in-from-top-1 duration-200' 
              : 'block md:hidden'
          }`} 
          ref={searchContainerRef}
        >
          <div 
            className="relative flex items-center w-full rounded-full border border-pink-200/90 hover:border-pink-400 focus-within:border-[#e51975] focus-within:ring-2 focus-within:ring-pink-200/60 px-3 sm:px-4 py-2 sm:py-2.5 shadow-xs transition-all overflow-hidden"
            style={{
              backgroundImage: `url(${searchBgFeathers}), url('/searchbackground.jpeg')`,
              backgroundColor: '#fff7fa',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            {/* Soft subtle semi-transparent overlay to ensure contrast and clear visibility of the light bubblegum feathers */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-[0.1px] pointer-events-none" />

            {/* Content sitting above background */}
            <div className="relative z-10 flex items-center w-full">
              {/* Search Icon */}
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-900 stroke-[2.2] shrink-0 ml-0.5" />
              
              {/* Vertical Divider */}
              <div className="h-4 sm:h-5 w-px bg-gray-400/80 mx-2 sm:mx-3 shrink-0" />

              {/* Input Field */}
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setShowSearchSuggestions(true);
                }}
                onFocus={() => setShowSearchSuggestions(true)}
                placeholder="Search Kurti, Suits, Indo western etc"
                className="w-full bg-transparent text-gray-900 placeholder:text-gray-600 text-xs sm:text-sm font-medium focus:outline-none"
                id="input-navbar-search"
              />

              {/* Clear / Close Button */}
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange('');
                    setShowSearchSuggestions(false);
                    if (window.innerWidth >= 768) {
                      setIsSearchOpenDesktop(false);
                    }
                  }}
                  className="p-1 hover:bg-white/80 active:bg-white rounded-full text-gray-500 hover:text-gray-800 transition-colors mr-0.5 shrink-0"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              ) : (
                /* Close icon on desktop when empty and expanded */
                <button
                  type="button"
                  onClick={() => setIsSearchOpenDesktop(false)}
                  className="hidden md:block p-1 hover:bg-white/80 active:bg-white rounded-full text-gray-400 hover:text-gray-700 transition-colors mr-0.5 shrink-0"
                  aria-label="Close search field"
                  title="Close search"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Auto-suggest Search Dropdown */}
          {showSearchSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-11 sm:top-12 bg-white text-gray-800 rounded-2xl shadow-2xl border border-pink-100 py-2 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="text-[10px] sm:text-[11px] font-semibold text-gray-400 px-3 sm:px-4 py-1 uppercase tracking-wider">
                Suggested Products
              </div>
              <div className="max-h-64 sm:max-h-80 overflow-y-auto">
                {filteredSuggestions.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectProduct(item);
                      setShowSearchSuggestions(false);
                    }}
                    className="px-3 sm:px-4 py-2 hover:bg-pink-50/80 active:bg-pink-100 flex items-center justify-between cursor-pointer border-b border-gray-50 last:border-none transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <img 
                        src={item.images[0]} 
                        alt={item.name} 
                        className="w-8 h-8 sm:w-9 sm:h-9 object-cover rounded-lg shrink-0 border border-gray-100" 
                        referrerPolicy="no-referrer" 
                      />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                        <p className="text-[10px] sm:text-xs text-[#e51975] font-medium truncate">{item.category} • {item.collection}</p>
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-amber-800 shrink-0">₹{item.price.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Notifications Modal (triggered from 3-dots menu) */}
      {showNotifModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-pink-100 max-w-md w-full p-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#e51975]" />
                <h3 className="font-extrabold text-sm text-gray-900">Push Notifications</h3>
                {unreadNotifCount > 0 && (
                  <span className="text-[10px] bg-pink-100 text-pink-900 font-bold px-2 py-0.5 rounded-full">
                    {unreadNotifCount} unread
                  </span>
                )}
              </div>
              <button 
                onClick={() => setShowNotifModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 my-2">
              {notifications.length === 0 ? (
                <p className="text-xs text-gray-400 py-8 text-center">No notifications right now</p>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`py-3 px-2 rounded-xl transition-colors ${
                      !n.read ? 'bg-pink-50/60 border-l-2 border-[#e51975]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-gray-900">{n.title}</p>
                      <span className="text-[9px] text-gray-400 font-mono">{n.timestamp}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{n.message}</p>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && onMarkAllNotificationsRead && (
              <div className="pt-2 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onMarkAllNotificationsRead();
                    setShowNotifModal(false);
                  }}
                  className="text-xs text-[#e51975] font-bold hover:bg-pink-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Mark All As Read</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
