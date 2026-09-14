import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { TopCategoryStories } from './components/TopCategoryStories';
import { TopCollectionStories } from './components/TopCollectionStories';
import { HeroCarousel } from './components/HeroCarousel';
import { ProductCard } from './components/ProductCard';
import { OfferModal } from './components/OfferModal';
import { ProductDetailPage } from './components/ProductDetailPage';
import { CartDrawer } from './components/CartDrawer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { ProductAutoCarousel } from './components/ProductAutoCarousel';
import { GlowingRibbon } from './components/GlowingRibbon';
import { ExplorePage } from './components/ExplorePage';
import { AboutUsPage } from './components/AboutUsPage';
import { TermsAndConditionsPage } from './components/TermsAndConditionsPage';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { RefundCancellationPage } from './components/RefundCancellationPage';
import { ShippingDeliveryPage } from './components/ShippingDeliveryPage';
import { CategoryExplorePage, CATEGORY_CONFIGS } from './components/CategoryExplorePage';
import { CollectionExplorePage, EXCLUSIVE_COLLECTION_CONFIGS } from './components/CollectionExplorePage';
import { CheckoutPage } from './components/CheckoutPage';
import { UserDashboard } from './components/UserDashboard';
import { OrderDetailsPage } from './components/OrderDetailsPage';
import { AdminPortal } from './components/AdminPortal';
import { ContactAboutModal } from './components/ContactAboutModal';
import { PushNotificationToast } from './components/PushNotificationToast';
import { AuthModal } from './components/AuthModal';
import { CustomAlertModal, AlertModalState } from './components/CustomAlertModal';
import { AccountAuthBarrier } from './components/AccountAuthBarrier';
import { getStoredCustomerSession, subscribeToCustomerAuth, signOutCustomer, CustomerSession } from './services/authService';
import { savePendingReferralCode, getPendingReferralCode } from './services/referralService';
import { FloatingFeatherAnimation, triggerFeatherAnimation, triggerFeatherDropAnimation, FeatherParticle } from './components/FloatingFeatherAnimation';
import { 
  auth, 
  onAuthStateChanged, 
  signOut, 
  subscribeToProducts, 
  fetchProductsFromFirestore,
  subscribeToBanners, 
  fetchBannersFromFirestore,
  subscribeToOrders,
  fetchOrdersFromFirestore,
  subscribeToPromos,
  subscribeToLiveSale,
  saveProductToFirestore, 
  deleteProductFromFirestore, 
  saveBannerToFirestore, 
  deleteBannerFromFirestore,
  saveOrderToFirestore,
  updateOrderStatusInFirestore,
  savePromoToFirestore,
  deletePromoFromFirestore,
  saveLiveSaleToFirestore
} from './firebase';
import { Product, ProductReview, CartItem, Order, PushNotification, PromoCode, AppliedPromo, AutomatedEmail, DeliveryAddress, LiveSaleConfig, BannerSlide, CategoryType, CollectionType, ColorVariant } from './types';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_PROMOS, 
  INITIAL_EMAIL_CAMPAIGNS, 
  INITIAL_ORDERS, 
  INITIAL_BANNERS, 
  INITIAL_LIVE_SALE, 
  INITIAL_NOTIFICATIONS 
} from './data/initialData';
import { getCategoryFallbackImage } from './utils/productImage';
import { deduplicateProducts } from './utils/productUtils';
import { SlidersHorizontal, ArrowUpDown, Shield, ShieldCheck, Heart, Truck, RefreshCw, Phone, Check, Grid, Shirt, Layers, Flame, Crown, Briefcase, Gift, Tag, PartyPopper, Scissors, Gem, Youtube, Facebook, Instagram } from 'lucide-react';

// Clean up any deprecated legacy cache to ensure clean storage quotas
try {
  localStorage.removeItem('feat_orders');
  localStorage.removeItem('feat_products');
  localStorage.removeItem('feat_banners');
  localStorage.removeItem('feat_promos');
  localStorage.removeItem('feat_live_sale');
  localStorage.removeItem('feat_notifications');
  localStorage.removeItem('feat_emails');
} catch (e) {
  // Ignore storage access errors
}

// Helper function to ensure product ratings are strictly calculated from genuine customer reviews
export const normalizeProductRatings = (p: Product): Product => {
  const reviews = Array.isArray(p.reviews) ? p.reviews : [];
  if (reviews.length > 0) {
    const total = reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
    const avg = Number((total / reviews.length).toFixed(1));
    return {
      ...p,
      reviews,
      rating: avg,
      ratingCount: reviews.length
    };
  }
  return {
    ...p,
    reviews: [],
    rating: 0,
    ratingCount: 0
  };
};

export const getProductAvailableStock = (product: Product, size?: string): number => {
  if (size && product.sizeStock && product.sizeStock[size] !== undefined) {
    return Math.max(0, Number(product.sizeStock[size]) || 0);
  }
  if (product.stockCount !== undefined) {
    return Math.max(0, Number(product.stockCount) || 0);
  }
  return 0;
};

export const BANNED_FAKE_PRODUCT_IDS = new Set([
  '63BB430203DCS01SB',
  '63BB225316SSS01MGNTA',
  '63BB280204MEPS01WNE',
  'FEAT-TEST-VERIFY'
]);

export const isRealProduct = (p: { id?: string; sku?: string } | null | undefined): boolean => {
  if (!p || !p.id) return false;
  if (BANNED_FAKE_PRODUCT_IDS.has(p.id)) return false;
  if (p.sku && BANNED_FAKE_PRODUCT_IDS.has(p.sku)) return false;
  return true;
};

export default function App() {
  // App Core State (Loaded directly from Firestore database & backend API)
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<PushNotification[]>(INITIAL_NOTIFICATIONS);
  const [promos, setPromos] = useState<PromoCode[]>(INITIAL_PROMOS);
  const [emails, setEmails] = useState<AutomatedEmail[]>(INITIAL_EMAIL_CAMPAIGNS);
  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const [liveSaleConfig, setLiveSaleConfig] = useState<LiveSaleConfig>(INITIAL_LIVE_SALE);
  
  // Cart State (Persisted across browser refresh)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('feat_cart_items_v2') || localStorage.getItem('feat_cart_items');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(item => isRealProduct(item?.product));
        }
      }
    } catch (e) {}
    return [];
  });

  // Wishlist State (Persisted across browser refresh)
  const [wishlist, setWishlist] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('feat_wishlist_items_v2') || localStorage.getItem('feat_wishlist_items');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(item => isRealProduct(item));
        }
      }
    } catch (e) {}
    return [];
  });

  const [appliedPromos, setAppliedPromos] = useState<AppliedPromo[]>(() => {
    try {
      const saved = localStorage.getItem('feat_applied_promos_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Keep single appliedPromo derived memo for backwards compatibility
  const appliedPromo = useMemo(() => {
    if (appliedPromos.length === 0) return null;
    return {
      code: appliedPromos.map(p => p.code).join(' + '),
      discount: appliedPromos.reduce((sum, p) => sum + p.discount, 0),
      description: appliedPromos.map(p => `${p.code} (-₹${p.discount})`).join(', ')
    };
  }, [appliedPromos]);

  // Sync appliedPromos to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('feat_applied_promos_v2', JSON.stringify(appliedPromos));
    } catch (e) {}
  }, [appliedPromos]);

  // Sync Cart to LocalStorage on every cart modification
  useEffect(() => {
    try {
      localStorage.setItem('feat_cart_items_v2', JSON.stringify(cart));
      localStorage.setItem('feat_cart_items', JSON.stringify(cart));
    } catch (e) {}
  }, [cart]);

  // Sync Wishlist to LocalStorage on every wishlist modification
  useEffect(() => {
    try {
      localStorage.setItem('feat_wishlist_items_v2', JSON.stringify(wishlist));
      localStorage.setItem('feat_wishlist_items', JSON.stringify(wishlist));
    } catch (e) {}
  }, [wishlist]);

  // Floating Feather Wishlist Particles (Fly-up on add, Drop-down on remove)
  const [activeFeathers, setActiveFeathers] = useState<FeatherParticle[]>([]);

  useEffect(() => {
    const handleSpawnFeather = (event: Event) => {
      const customEvent = event as CustomEvent<{ mode?: 'fly-up' | 'drop-down'; startX: number; startY: number; endX: number; endY: number }>;
      if (!customEvent.detail) return;
      const { mode = 'fly-up', startX, startY, endX, endY } = customEvent.detail;
      const newFeather: FeatherParticle = {
        id: `feather-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        mode,
        startX,
        startY,
        endX,
        endY,
        createdAt: Date.now()
      };
      setActiveFeathers(prev => [...prev, newFeather]);
    };

    window.addEventListener('spawn-feather-wishlist', handleSpawnFeather);
    return () => window.removeEventListener('spawn-feather-wishlist', handleSpawnFeather);
  }, []);

  const handleFeatherComplete = (id: string) => {
    setActiveFeathers(prev => prev.filter(f => f.id !== id));
  };

  // Global Custom Alert Modal State
  const [customAlert, setCustomAlert] = useState<AlertModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning'
  });

  const showAlert = (message: string, type: 'error' | 'warning' | 'info' | 'success' = 'warning', title?: string) => {
    setCustomAlert({
      isOpen: true,
      title: title || (type === 'error' ? 'Validation Error' : type === 'warning' ? 'Inventory Notice' : 'Notice'),
      message,
      type
    });
  };

  // Filter State
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCollection, setSelectedCollection] = useState<string>('All');
  const [featherdCollection, setfeatherdCollection] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'popularity' | 'priceLowHigh' | 'priceHighLow' | 'newest' | 'rating'>('popularity');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(10000);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  // User Auth State
  const [currentUser, setCurrentUser] = useState<CustomerSession | any>(() => getStoredCustomerSession());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingBuyNowAction, setPendingBuyNowAction] = useState<{
    product: Product;
    size: string;
    color?: string;
    quantity?: number;
  } | null>(null);
  const [authIntentNotice, setAuthIntentNotice] = useState<{
    title?: string;
    subtitle?: string;
  } | null>(null);

  // Strictly isolated customer orders for the authenticated user
  const userOrders = useMemo(() => {
    if (!currentUser) return [];
    const userEmail = currentUser.email?.toLowerCase().trim();
    const userUid = currentUser.uid;
    return orders.filter(o => {
      const orderEmail = o.customerEmail?.toLowerCase().trim();
      const orderUid = (o as any).userId || (o as any).customerUid;
      return (userEmail && orderEmail && orderEmail === userEmail) || (userUid && orderUid && orderUid === userUid);
    });
  }, [orders, currentUser]);

  // Modals Visibility State
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product | null>(null);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isContactAboutOpen, setIsContactAboutOpen] = useState(false);
  const [initialContactTab, setInitialContactTab] = useState<'about' | 'contact'>('about');
  const getResolvedPath = () => {
    const p = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    if (p.includes('admin') || hash.includes('admin') || search.includes('page=admin') || search.includes('admin=true')) {
      return '/admin';
    }
    if (p.includes('checkout') || hash.includes('checkout') || search.includes('page=checkout')) {
      return '/checkout';
    }
    if (
      p.includes('order-detail') || 
      p.includes('order-details') || 
      hash.includes('order-detail') || 
      hash.includes('order-details') || 
      search.includes('page=order-detail') || 
      search.includes('page=order-details')
    ) {
      return '/order-details';
    }
    if (
      p.includes('account') || 
      p.includes('dashboard') || 
      p.includes('my-orders') || 
      hash.includes('account') || 
      hash.includes('dashboard') || 
      hash.includes('my-orders') || 
      search.includes('page=account') || 
      search.includes('page=dashboard') || 
      search.includes('page=my-orders')
    ) {
      return '/account';
    }
    if (p.includes('terms') || hash.includes('terms') || search.includes('page=terms')) {
      return '/terms';
    }
    if (p.includes('privacy') || hash.includes('privacy') || search.includes('page=privacy')) {
      return '/privacy-policy';
    }
    if (
      p.includes('return') || 
      p.includes('refund') || 
      p.includes('cancellation') || 
      hash.includes('return') || 
      hash.includes('refund') || 
      hash.includes('cancellation') || 
      search.includes('page=refund') || 
      search.includes('page=return')
    ) {
      return '/return-and-cancellation';
    }
    if (
      p.includes('shipping') || 
      p.includes('delivery') || 
      hash.includes('shipping') || 
      hash.includes('delivery') || 
      search.includes('page=shipping') || 
      search.includes('page=delivery')
    ) {
      return '/shipping-and-delivery';
    }
    return p;
  };

  const [currentPath, setCurrentPath] = useState<string>(getResolvedPath);

  const handleSelectProduct = (product: Product | null) => {
    setSelectedProductDetails(product);
    if (product) {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('product', product.id);
      window.history.pushState({ productId: product.id }, '', currentUrl.pathname + currentUrl.search);
    } else {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('product');
      window.history.pushState({}, '', currentUrl.pathname + (currentUrl.search ? currentUrl.search : ''));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToPath = (path: string) => {
    window.history.pushState({}, '', path);
    const resolved = getResolvedPath();
    setCurrentPath(resolved);
    
    // Check if the destination path includes a product query param (?product=)
    try {
      const url = new URL(path, window.location.origin);
      const prodId = url.searchParams.get('product');
      if (prodId && products.length > 0) {
        const found = products.find(p => p.id === prodId);
        setSelectedProductDetails(found || null);
      } else {
        setSelectedProductDetails(null);
      }
    } catch {
      setSelectedProductDetails(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Monitor location changes for all routes, browser back/forward, and ?product= deep links
  useEffect(() => {
    const handleLocationChange = () => {
      const resolved = getResolvedPath();
      setCurrentPath(resolved);

      const params = new URLSearchParams(window.location.search);
      const urlProductId = params.get('product');
      if (urlProductId && products.length > 0) {
        const found = products.find(p => p.id === urlProductId);
        if (found) {
          setSelectedProductDetails(found);
          return;
        }
      }
      if (!urlProductId) {
        setSelectedProductDetails(null);
      }

      const urlOrderId = params.get('id') || params.get('orderId');
      if (urlOrderId && orders.length > 0) {
        const foundOrder = orders.find(o => o.id === urlOrderId);
        if (foundOrder) {
          setSelectedOrderForDetails(foundOrder);
        }
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    // Global SPA internal link handler so ANY <a> link in navbar, footer, etc. transitions instantly
    const handleGlobalLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href) return;

      if (
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        target.target === '_blank' ||
        target.hasAttribute('download')
      ) {
        return;
      }

      if (href.startsWith('/') || href.startsWith('#') || href.startsWith('?')) {
        e.preventDefault();
        handleNavigateToPath(href);
      }
    };
    document.addEventListener('click', handleGlobalLinkClick);

    // Private Admin Keyboard Shortcut: Ctrl + Shift + A (or Cmd + Shift + A)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        if (currentPath.includes('admin')) {
          handleNavigateToPath('/');
        } else {
          handleNavigateToPath('/admin');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
      document.removeEventListener('click', handleGlobalLinkClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [products, currentPath]);

  // Update document title and SEO meta descriptions dynamically based on route and product selection
  useEffect(() => {
    let title = 'Feat: Feather Hut Fashion | Authentic Indian Ethnic Sarees, Kurtis & Salwar Suits';
    let desc = 'Shop authentic Indian ethnic wear at Feat: Feather Hut Fashion. Handloom Chanderi silk sarees, designer kurtis, Banarasi ensembles, salwar suits, and dress materials.';

    if (selectedProductDetails) {
      title = `${selectedProductDetails.name} - ₹${selectedProductDetails.price.toLocaleString('en-IN')} | Feat: Feather Hut Fashion`;
      desc = `Buy ${selectedProductDetails.name} in ${selectedProductDetails.fabric || 'authentic silk'} online at Feat: Feather Hut Fashion. 100% Handcrafted ethnic wear with express shipping across India.`;
    } else if (currentPath.includes('admin')) {
      title = 'Merchant Admin Dashboard | Feat: Feather Hut Fashion';
      desc = 'Administrative management portal for products, inventory, orders, and promotional coupons.';
    } else if (currentPath.includes('about-us')) {
      title = 'About Us & Heritage | Feat: Feather Hut Fashion';
      desc = 'Discover the legacy of Feat: Feather Hut Fashion. Master weavers from Surat & Bengal crafting authentic sarees, kurtis, and ethnic attire.';
    } else if (currentPath.includes('terms')) {
      title = 'Terms & Conditions | Feat: Feather Hut Fashion';
      desc = 'Official Terms & Conditions of Feat: Feather Hut Fashion (GSTIN: 19APAPC3078H1Z1, Khanyan, Hoogly, West Bengal-712147).';
    } else if (currentPath.includes('privacy')) {
      title = 'Privacy Policy & Customer Security | Feat: Feather Hut Fashion';
      desc = 'Privacy policy and data protection standards of Feat: Feather Hut Fashion. 256-bit SSL secured customer data.';
    } else if (currentPath.includes('return') || currentPath.includes('refund') || currentPath.includes('cancellation')) {
      title = 'Refund, Return & Cancellation Policy | Feat: Feather Hut Fashion';
      desc = 'Transparent 2-day return window, 7-day refund processing, and hassle-free cancellation policy.';
    } else if (currentPath.includes('shipping') || currentPath.includes('delivery')) {
      title = 'Shipping & Delivery Timelines | Feat: Feather Hut Fashion';
      desc = 'Pan-India shipping schedules, 1-2 days dispatch, and live courier tracking with Blue Dart, Delhivery, DTDC, and India Post.';
    } else if (selectedCategory && selectedCategory !== 'All') {
      title = `${selectedCategory} Collection | Feat: Feather Hut Fashion`;
      desc = `Explore our curated collection of authentic ${selectedCategory} crafted with premium fabrics and handloom artistry.`;
    }

    document.title = title;
    
    // Update meta description tag dynamically
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', desc);
    }
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', title);
    }
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      ogDesc.setAttribute('content', desc);
    }
  }, [currentPath, selectedProductDetails, selectedCategory]);

  // Firebase auth state listener & real-time Firestore synchronization
  useEffect(() => {
    fetchProducts();
    fetchOrders();
    fetchNotifications();
    fetchPromos();
    fetchLiveSale();
    fetchBanners();

    // Real-time Firestore sync for Products
    const unsubscribeProducts = subscribeToProducts((firestoreProducts) => {
      if (Array.isArray(firestoreProducts) && firestoreProducts.length > 0) {
        const cleanList = deduplicateProducts(
          firestoreProducts
            .filter(isRealProduct)
            .map(normalizeProductRatings)
        );
        if (cleanList.length > 0) {
          setProducts(cleanList);
        }
      }
    });

    // Real-time Firestore sync for Hero Banners
    const unsubscribeBanners = subscribeToBanners((firestoreBanners) => {
      if (Array.isArray(firestoreBanners) && firestoreBanners.length > 0) {
        setBanners(firestoreBanners);
      }
    });

    // Real-time Firestore sync for Orders
    const unsubscribeOrders = subscribeToOrders((firestoreOrders) => {
      if (Array.isArray(firestoreOrders) && firestoreOrders.length > 0) {
        setOrders(firestoreOrders);
      }
    });

    // Real-time Firestore sync for Promos
    const unsubscribePromos = subscribeToPromos((firestorePromos) => {
      if (Array.isArray(firestorePromos) && firestorePromos.length > 0) {
        setPromos(firestorePromos);
      }
    });

    // Real-time Firestore sync for Live Sale Config
    const unsubscribeLiveSale = subscribeToLiveSale((firestoreLiveSale) => {
      if (firestoreLiveSale) {
        setLiveSaleConfig(firestoreLiveSale);
      }
    });

    const unsubscribeAuth = subscribeToCustomerAuth((user) => {
      setCurrentUser(user);
    });

    // Auto-detect referral code from URL: ?ref=CODE or ?referral=CODE
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const incomingRef = searchParams.get('ref') || searchParams.get('referral');
      if (incomingRef) {
        savePendingReferralCode(incomingRef.trim().toUpperCase());
      }
    } catch (_) {}

    return () => {
      unsubscribeProducts();
      unsubscribeBanners();
      unsubscribeOrders();
      unsubscribePromos();
      unsubscribeLiveSale();
      unsubscribeAuth();
    };
  }, []);

  // SEO Dynamic Document Title & Meta Manager
  useEffect(() => {
    if (selectedProductDetails) {
      document.title = `${selectedProductDetails.name} - Buy Online | Feat: Feather Hut Fashion`;
    } else if (currentPath.includes('new-arrivals')) {
      document.title = `New Arrivals Collection | Feat: Feather Hut Fashion`;
    } else if (selectedCategory !== 'All') {
      document.title = `${selectedCategory} Collection - Buy Online | Feat: Feather Hut Fashion`;
    } else if (selectedCollection !== 'All') {
      document.title = `${selectedCollection} | Feat: Feather Hut Fashion`;
    } else {
      document.title = `Feat: Feather Hut Fashion | Authentic Ethnic Sarees, Kurtis & Salwar Suits`;
    }
  }, [selectedProductDetails, currentPath, selectedCategory, selectedCollection]);

  const fetchBanners = async () => {
    try {
      // 1. Primary: Fast server API endpoint (cached in memory and synced with Firestore)
      try {
        const res = await fetch('/api/banners');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setBanners(data);
            return;
          }
        }
      } catch (e) {
        // Server offline, fallback to Firestore client
      }

      // 2. Fallback to client Firestore only if server returned empty or offline
      const firestoreBanners = await fetchBannersFromFirestore();
      if (Array.isArray(firestoreBanners) && firestoreBanners.length > 0) {
        setBanners(firestoreBanners);
      }
    } catch (err) {
      // Offline fallback
    }
  };

  const fetchPromos = async () => {
    try {
      const res = await fetch('/api/promos');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setPromos(data);
      }
    } catch (err) {
      // Backend unavailable on static platforms
    }
  };

  const fetchLiveSale = async () => {
    try {
      const res = await fetch('/api/live-sale');
      if (!res.ok) return;
      const data = await res.json();
      if (data && typeof data === 'object') {
        setLiveSaleConfig(data);
      }
    } catch (err) {
      // Backend unavailable on static platforms
    }
  };

  const fetchProducts = async () => {
    try {
      // 1. Primary: Fetch real-time products directly from Admin Firebase Firestore
      let firestoreItems: Product[] = [];
      try {
        firestoreItems = await fetchProductsFromFirestore();
      } catch (err) {
        console.info('Firestore initial fetch notice:', err);
      }

      if (firestoreItems && firestoreItems.length > 0) {
        const cleanList = deduplicateProducts(firestoreItems.filter(isRealProduct).map(normalizeProductRatings));
        if (cleanList.length > 0) {
          setProducts(cleanList);
          return;
        }
      }

      // 2. Secondary fallback: Query backend server cache if Firestore SDK is initializing
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.products) && data.products.length > 0) {
            const cleanList = deduplicateProducts(data.products.filter(isRealProduct).map(normalizeProductRatings));
            if (cleanList.length > 0) {
              setProducts(cleanList);
            }
          }
        }
      } catch (e) {
        // Backend offline or running purely static
      }
    } catch (err) {
      console.warn('Catalog fetch notice:', err);
    }
  };

  const fetchOrders = async () => {
    const customer = getStoredCustomerSession();
    const adminToken = localStorage.getItem('feat_admin_token') || sessionStorage.getItem('feat_admin_token');

    try {
      // 1. Fetch real orders directly from Firestore first
      const firestoreOrders = await fetchOrdersFromFirestore();
      if (firestoreOrders && firestoreOrders.length > 0) {
        setOrders(firestoreOrders);
        return;
      }
    } catch (err) {
      console.info('Firestore initial orders fetch notice:', err);
    }

    try {
      const headers: Record<string, string> = {};
      if (adminToken) {
        headers['x-admin-token'] = adminToken;
      } else if (customer?.token) {
        headers['x-auth-token'] = customer.token;
      }

      // If neither admin nor authenticated customer, do not fetch private order histories
      if (!adminToken && !customer?.token) {
        setOrders([]);
        return;
      }

      const res = await fetch('/api/orders', { headers });
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch (err) {
      // Backend unavailable on static platforms
    }
  };

  useEffect(() => {
    const adminToken = localStorage.getItem('feat_admin_token') || sessionStorage.getItem('feat_admin_token');
    if (currentUser || currentPath.includes('admin') || adminToken) {
      fetchOrders();
    } else {
      setOrders([]);
    }
    fetchNotifications();
  }, [currentUser, currentPath]);

  const fetchNotifications = async () => {
    try {
      const email = (currentUser?.email || '').toLowerCase().trim();
      const userId = (currentUser?.uid || '').trim();
      const adminToken = localStorage.getItem('feat_admin_token') || sessionStorage.getItem('feat_admin_token') || '';
      const params = new URLSearchParams();
      if (email) params.set('email', email);
      if (userId) params.set('userId', userId);
      if (adminToken) params.set('adminToken', adminToken);
      const url = params.toString() ? `/api/notifications?${params.toString()}` : '/api/notifications';

      const res = await fetch(url, {
        headers: {
          ...(email ? { 'x-user-email': email } : {}),
          ...(userId ? { 'x-user-id': userId } : {}),
          ...(adminToken ? { 'x-admin-token': adminToken } : {})
        }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.notifications)) {
        const isAdmin = Boolean(adminToken || currentPath.includes('admin'));
        const safeNotifications = data.notifications.filter((n: PushNotification) => {
          if (isAdmin) return true;
          if (n.targetEmail || n.targetUserId) {
            const matchesEmail = email && n.targetEmail && n.targetEmail.toLowerCase() === email;
            const matchesUser = userId && n.targetUserId && n.targetUserId === userId;
            return Boolean(matchesEmail || matchesUser);
          }
          return true;
        });
        setNotifications(safeNotifications);
      }
    } catch (err) {
      // Backend unavailable on static platforms
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      const email = (currentUser?.email || '').toLowerCase().trim();
      const userId = (currentUser?.uid || '').trim();
      const adminToken = localStorage.getItem('feat_admin_token') || sessionStorage.getItem('feat_admin_token') || '';
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(email ? { 'x-user-email': email } : {}),
          ...(userId ? { 'x-user-id': userId } : {}),
          ...(adminToken ? { 'x-admin-token': adminToken } : {})
        },
        body: JSON.stringify({ email, userId })
      });
    } catch (err) {}
  };

  // Cart Operations
  const handleAddToCart = (product: Product, selectedSize: string, eOrColor?: React.MouseEvent | string, selectedColor?: string, quantityToAdd = 1) => {
    let color = 'Default';
    if (typeof eOrColor === 'string') {
      color = eOrColor || product.colors?.[0] || 'Default';
    } else {
      if (eOrColor && 'stopPropagation' in eOrColor) {
        eOrColor.stopPropagation();
      }
      color = selectedColor || product.colors?.[0] || 'Default';
    }

    const availableStock = getProductAvailableStock(product, selectedSize);
    const existing = cart.find(item => item.product.id === product.id && item.selectedSize === selectedSize && (item.selectedColor || 'Default') === color);
    const currentQty = existing ? existing.quantity : 0;

    if (availableStock <= 0) {
      showAlert(
        `Sorry, "${product.name}" (Size: ${selectedSize || 'Standard'}) is currently Out of Stock.`,
        'warning',
        'Out of Stock'
      );
      return false;
    }

    if (currentQty + quantityToAdd > availableStock) {
      if (availableStock === 1) {
        showAlert(
          `Only 1 piece is available in stock for "${product.name}" (Size: ${selectedSize || 'Standard'}). You already have 1 in your shopping bag.`,
          'warning',
          'Stock Limit Reached'
        );
      } else {
        showAlert(
          `Only ${availableStock} piece(s) available in stock for "${product.name}" (Size: ${selectedSize || 'Standard'}). You already have ${currentQty} in your shopping bag and cannot add more.`,
          'warning',
          'Stock Limit Reached'
        );
      }
      return false;
    }

    setCart(prev => {
      const ex = prev.find(item => item.product.id === product.id && item.selectedSize === selectedSize && (item.selectedColor || 'Default') === color);
      if (ex) {
        return prev.map(item =>
          item.product.id === product.id && item.selectedSize === selectedSize && (item.selectedColor || 'Default') === color
            ? { ...item, quantity: item.quantity + quantityToAdd }
            : item
        );
      }
      return [...prev, { product, selectedSize, selectedColor: color, quantity: quantityToAdd }];
    });
    return true;
  };

  const handleUpdateQuantity = (productId: string, size: string, delta: number, color?: string) => {
    if (delta > 0) {
      const item = cart.find(i => i.product.id === productId && i.selectedSize === size && (!color || (i.selectedColor || 'Default') === (color || 'Default')));
      if (item) {
        const availableStock = getProductAvailableStock(item.product, size);
        if (item.quantity + delta > availableStock) {
          showAlert(
            availableStock === 1
              ? `Only 1 piece is available in stock for "${item.product.name}" (Size: ${size}).`
              : `Only ${availableStock} piece(s) available in stock for "${item.product.name}" (Size: ${size}). You cannot add more than active inventory.`,
            'warning',
            'Stock Limit Reached'
          );
          return;
        }
      }
    }

    setCart(prev =>
      prev
        .map(item => {
          if (item.product.id === productId && item.selectedSize === size && (!color || item.selectedColor === color)) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveCartItem = (productId: string, size: string, color?: string) => {
    setCart(prev => prev.filter(item => !(item.product.id === productId && item.selectedSize === size && (!color || item.selectedColor === color))));
  };

  // Wishlist Toggle
  const handleToggleWishlist = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const exists = wishlist.some(p => p.id === product.id || (product.sku && p.sku === product.sku));
    if (exists) {
      setWishlist(prev => prev.filter(p => p.id !== product.id && (!product.sku || p.sku !== product.sku)));
      triggerFeatherDropAnimation(e);
    } else {
      setWishlist(prev => deduplicateProducts([...prev, product]));
      triggerFeatherAnimation(e);
    }
  };

  // Multi-Coupon Promo Handler with stacking & security loop-hole prevention
  const handleApplyPromo = async (code: string, contextPrice?: number): Promise<{ valid: boolean; message?: string }> => {
    if (!code || !code.trim()) {
      return { valid: false, message: 'Please select a coupon code' };
    }

    let cleanCode = code.trim().toUpperCase();
    if (cleanCode === 'FEAT 2.0' || cleanCode === 'FEAT20') cleanCode = 'FEAT2.0';

    if (cleanCode === 'FEAT200' || cleanCode === 'FLAT200' || cleanCode === 'FEAT 200' || cleanCode === 'FLAT 200') {
      return { valid: false, message: 'The coupon code FEAT200 has been discontinued.' };
    }

    // Toggle off / remove if already applied
    const isAlreadyApplied = appliedPromos.some(p => p.code.toUpperCase() === cleanCode);
    if (isAlreadyApplied) {
      handleRemovePromo(cleanCode);
      return { valid: true, message: `Coupon ${cleanCode} removed` };
    }

    const totalMrp = cart.reduce((acc, item) => acc + item.product.originalPrice * item.quantity, 0);
    const totalDiscount = cart.reduce((acc, item) => acc + (item.product.originalPrice - item.product.price) * item.quantity, 0);
    const cartTotal = totalMrp - totalDiscount;
    const effectiveTotal = cartTotal > 0 ? cartTotal : (contextPrice || (selectedProductDetails ? selectedProductDetails.price : 0));
    const activeItems = cart.length > 0 
      ? cart.map(i => ({ product: i.product, quantity: i.quantity }))
      : (selectedProductDetails ? [{ product: selectedProductDetails, quantity: 1 }] : []);

    const targetCodes = Array.from(new Set([...appliedPromos.map(p => p.code), cleanCode]));

    try {
      const res = await fetch('/api/promos/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codes: targetCodes,
          cartTotal: effectiveTotal,
          items: activeItems,
          collectionNames: activeItems.map(i => i.product.collection).filter(Boolean),
          categoryNames: activeItems.map(i => i.product.category).filter(Boolean),
          userEmail: currentUser?.email,
          userPhone: currentUser?.phone,
          userId: currentUser?.uid
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.valid && Array.isArray(data.results)) {
          setAppliedPromos(data.results);
          return { valid: true };
        } else if (data.valid) {
          setAppliedPromos([{ code: data.code, discount: data.discount, description: data.description }]);
          return { valid: true };
        }
        return { valid: false, message: data.message };
      } else {
        const errorData = await res.json().catch(() => null);
        if (errorData?.message) {
          return { valid: false, message: errorData.message };
        }
      }
    } catch (err) {}

    // Static fallback verification with multi-coupon support and security loophole prevention
    const found = promos.find(p => p.code.toUpperCase() === cleanCode && p.active);
    if (!found) {
      return { valid: false, message: 'Invalid or expired coupon code' };
    }

    if (found.isFirstOrderOnly || cleanCode === 'WELCOME76') {
      const hasPriorOrder = orders.some(o => {
        // Exclude cancelled or returned orders
        if (o.orderStatus === 'Cancelled' || (o.orderStatus as string) === 'Returned') return false;
        // Exclude void or failed payment status
        if (o.paymentStatus === 'Void' || o.paymentStatus === 'Failed') return false;
        // Exclude test orders and dummy developer orders
        const oid = (o.id || '').toUpperCase();
        if (oid.startsWith('TEST') || oid.startsWith('DEMO') || oid.includes('MOCK') || oid.includes('DUMMY')) return false;
        // Exclude small test payment transactions
        if ((o.finalAmount || 0) <= 10) return false;

        const orderEmail = (o.customerEmail || '').trim().toLowerCase();
        if (orderEmail.endsWith('@example.com') || orderEmail.includes('mock') || orderEmail.includes('dummy')) return false;

        const userEmail = (currentUser?.email || '').trim().toLowerCase();
        const orderPhone = (o.deliveryAddress?.phone || '').replace(/\D/g, '');
        const userPhone = (currentUser?.phone || '').replace(/\D/g, '');
        const orderUid = o.userId || '';
        const userUid = currentUser?.uid || '';

        const normOrderPhone = orderPhone.slice(-10);
        const normUserPhone = userPhone.slice(-10);
        const phoneMatches = Boolean(
          normUserPhone.length >= 10 &&
          normOrderPhone.length >= 10 &&
          normOrderPhone === normUserPhone
        );

        return (userEmail && orderEmail && userEmail === orderEmail) ||
               phoneMatches ||
               (userUid && orderUid && userUid === orderUid);
      });
      if (hasPriorOrder) {
        return { valid: false, message: 'Promo code Welcome76 is valid only on your first order.' };
      }
    }

    const isFirdausi = (prod: any) => {
      const col = (prod?.collection || '').toLowerCase();
      const name = (prod?.name || '').toLowerCase();
      const tags = Array.isArray(prod?.tags) ? prod.tags.map((t: any) => String(t).toLowerCase()) : [];
      return col.includes('firdausi') || name.includes('firdausi') || tags.some((t: string) => t.includes('firdausi'));
    };

    const isSaree = (prod: any) => {
      const cat = (prod?.category || '').toLowerCase();
      const name = (prod?.name || '').toLowerCase();
      const tags = Array.isArray(prod?.tags) ? prod.tags.map((t: any) => String(t).toLowerCase()) : [];
      return cat.includes('sharee') || cat.includes('saree') || name.includes('saree') || name.includes('sharee') || tags.some((t: string) => t.includes('saree') || t.includes('sharee'));
    };

    if (cleanCode === 'FEAT6') {
      if (effectiveTotal <= 1300) {
        return { valid: false, message: 'FEAT6 promo code is applicable when billing value is more than 1300 rupees.' };
      }
      if (effectiveTotal > 2000) {
        return { valid: false, message: 'FEAT6 is valid for purchases up to ₹2,000. For orders over ₹2,000, you get FEAT2.0 (₹200 OFF).' };
      }
      if (appliedPromos.some(p => p.code.toUpperCase() === 'FEAT2.0')) {
        return { valid: false, message: 'FEAT6 cannot be combined with FEAT2.0. Over ₹2,000, you only get FEAT2.0.' };
      }
    }

    if (cleanCode === 'FEAT2.0' && effectiveTotal <= 2000) {
      return { valid: false, message: 'Promo code FEAT2.0 is valid only on product value exceeding ₹2,000.' };
    }

    if (cleanCode === 'INDIANA') {
      const matchingItems = activeItems.filter(i => {
        const cat = (i.product.category || '').toLowerCase();
        const name = (i.product.name || '').toLowerCase();
        return cat.includes('suit') || cat.includes('indo') || name.includes('suit') || name.includes('indo');
      });
      if (activeItems.length > 0 && matchingItems.length === 0) {
        return { valid: false, message: 'Promo code INDIANA is valid only for Suit Sets and Indo-Western sets.' };
      }
    }

    if (cleanCode === 'GORBO') {
      const matchingItems = activeItems.filter(i => isSaree(i.product) && !isFirdausi(i.product));
      if (activeItems.length > 0 && matchingItems.length === 0) {
        return { valid: false, message: 'Promo code GORBO is valid only for Sarees (excluding Firdausi collection).' };
      }
    }

    if (cleanCode === 'BEAUTIFULYOU') {
      const matchingItems = activeItems.filter(i => {
        const cat = (i.product.category || '').toLowerCase();
        const name = (i.product.name || '').toLowerCase();
        return cat.includes('dress material') || name.includes('dress material') || name.includes('unstitched');
      });
      if (activeItems.length > 0 && matchingItems.length === 0) {
        return { valid: false, message: 'Promo code BEAUTIFULYOU is valid only for Dress Materials.' };
      }
    }

    if (cleanCode === 'BHUSWARG') {
      const matchingItems = activeItems.filter(i => isFirdausi(i.product));
      if (activeItems.length > 0 && matchingItems.length === 0) {
        return { valid: false, message: 'Promo code BHUSWARG is valid only for the Firdausi collection.' };
      }
    }

    if (found.minOrderValue && effectiveTotal < found.minOrderValue) {
      return { valid: false, message: `Minimum order value for ${found.code} is ₹${found.minOrderValue}` };
    }

    // Compute fallback discount
    let calcDiscount = 0;
    if (cleanCode === 'FEAT2.0') {
      calcDiscount = 200;
    } else if (cleanCode === 'FEAT6') {
      calcDiscount = 60;
    } else if (cleanCode === 'INDIANA') {
      const matchingItems = activeItems.filter(i => {
        const cat = (i.product.category || '').toLowerCase();
        const name = (i.product.name || '').toLowerCase();
        return cat.includes('suit') || cat.includes('indo') || name.includes('suit') || name.includes('indo');
      });
      const eligibleTotal = matchingItems.length > 0 ? matchingItems.reduce((sum, i) => sum + (i.product.price * i.quantity), 0) : effectiveTotal;
      calcDiscount = Math.round((eligibleTotal * 2) / 100);
    } else if (cleanCode === 'GORBO') {
      const matchingItems = activeItems.filter(i => isSaree(i.product) && !isFirdausi(i.product));
      const eligibleTotal = matchingItems.length > 0 ? matchingItems.reduce((sum, i) => sum + (i.product.price * i.quantity), 0) : effectiveTotal;
      calcDiscount = Math.round((eligibleTotal * 5) / 100);
    } else if (cleanCode === 'BEAUTIFULYOU') {
      const matchingItems = activeItems.filter(i => {
        const cat = (i.product.category || '').toLowerCase();
        const name = (i.product.name || '').toLowerCase();
        return cat.includes('dress material') || name.includes('dress material') || name.includes('unstitched');
      });
      const eligibleTotal = matchingItems.length > 0 ? matchingItems.reduce((sum, i) => sum + (i.product.price * i.quantity), 0) : effectiveTotal;
      calcDiscount = Math.round((eligibleTotal * 4) / 100);
    } else if (cleanCode === 'BHUSWARG') {
      const matchingItems = activeItems.filter(i => isFirdausi(i.product));
      const eligibleTotal = matchingItems.length > 0 ? matchingItems.reduce((sum, i) => sum + (i.product.price * i.quantity), 0) : effectiveTotal;
      calcDiscount = Math.round((eligibleTotal * 6) / 100);
    } else if (found.discountType === 'percent') {
      calcDiscount = Math.round((effectiveTotal * found.discountValue) / 100);
    } else {
      calcDiscount = Math.min(effectiveTotal > 0 ? effectiveTotal : found.discountValue, found.discountValue);
    }

    // Enforce security rule: order payable must never drop below ₹1
    const currentTotalDiscount = appliedPromos.reduce((sum, p) => sum + p.discount, 0);
    const maxAllowedDiscount = Math.max(0, effectiveTotal - 1);
    const remainingBudget = Math.max(0, maxAllowedDiscount - currentTotalDiscount);
    const safeDiscount = Math.min(calcDiscount, remainingBudget);

    if (safeDiscount <= 0 && calcDiscount > 0) {
      return { valid: false, message: 'Maximum eligible discount reached for this order.' };
    }

    const newApplied: AppliedPromo = {
      code: found.code,
      discount: safeDiscount,
      description: found.description
    };

    setAppliedPromos(prev => {
      let filtered = prev.filter(p => p.code.toUpperCase() !== cleanCode);
      if (cleanCode === 'FEAT2.0') {
        filtered = filtered.filter(p => p.code.toUpperCase() !== 'FEAT6');
      } else if (cleanCode === 'FEAT6') {
        filtered = filtered.filter(p => p.code.toUpperCase() !== 'FEAT2.0');
      }
      return [...filtered, newApplied];
    });
    return { valid: true };
  };

  const handleRemovePromo = (code?: string) => {
    if (!code) {
      setAppliedPromos([]);
      return;
    }
    const clean = code.trim().toUpperCase();
    const remaining = appliedPromos.filter(p => p.code.toUpperCase() !== clean);
    if (remaining.length === 0) {
      setAppliedPromos([]);
      return;
    }

    const totalMrp = cart.reduce((acc, item) => acc + item.product.originalPrice * item.quantity, 0);
    const totalDiscount = cart.reduce((acc, item) => acc + (item.product.originalPrice - item.product.price) * item.quantity, 0);
    const cartTotal = totalMrp - totalDiscount;
    const effectiveTotal = cartTotal > 0 ? cartTotal : (selectedProductDetails ? selectedProductDetails.price : 0);
    const activeItems = cart.length > 0 
      ? cart.map(i => ({ product: i.product, quantity: i.quantity }))
      : (selectedProductDetails ? [{ product: selectedProductDetails, quantity: 1 }] : []);

    fetch('/api/promos/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codes: remaining.map(r => r.code),
        cartTotal: effectiveTotal,
        items: activeItems,
        collectionNames: activeItems.map(i => i.product.collection).filter(Boolean),
        categoryNames: activeItems.map(i => i.product.category).filter(Boolean),
        userEmail: currentUser?.email,
        userPhone: currentUser?.phone,
        userId: currentUser?.uid
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.valid && Array.isArray(data.results)) {
          setAppliedPromos(data.results);
        } else {
          setAppliedPromos(remaining);
        }
      })
      .catch(() => setAppliedPromos(remaining));
  };

  // Synchronize applied promo discounts when cart or active items change with debouncing
  useEffect(() => {
    if (appliedPromos.length === 0) return;
    const totalMrp = cart.reduce((acc, item) => acc + item.product.originalPrice * item.quantity, 0);
    const totalDiscount = cart.reduce((acc, item) => acc + (item.product.originalPrice - item.product.price) * item.quantity, 0);
    const cartTotal = totalMrp - totalDiscount;
    const effectiveTotal = cartTotal > 0 ? cartTotal : (selectedProductDetails ? selectedProductDetails.price : 0);

    // Immediate client-side revocation when billing value changes:
    // - Under 2000 rupees: don't show or keep FEAT2.0
    // - Under 1300 rupees OR over 2000 rupees: don't show or keep FEAT6 (over 2000 user gets FEAT2.0 only)
    // - Do not combine FEAT6 and FEAT2.0
    // - Remove any legacy FEAT200 / FLAT200
    let filteredPromos = appliedPromos.filter(p => {
      const code = p.code.toUpperCase();
      if (code === 'FEAT200' || code === 'FLAT200') return false;
      if (code === 'FEAT2.0' && effectiveTotal <= 2000) return false;
      if (code === 'FEAT6' && (effectiveTotal <= 1300 || effectiveTotal > 2000)) return false;
      return true;
    });

    if (filteredPromos.some(p => p.code.toUpperCase() === 'FEAT2.0')) {
      filteredPromos = filteredPromos.filter(p => p.code.toUpperCase() !== 'FEAT6');
    }

    if (filteredPromos.length !== appliedPromos.length) {
      setAppliedPromos(filteredPromos);
      if (filteredPromos.length === 0) return;
    }

    if (filteredPromos.length === 0) return;

    const activeItems = cart.length > 0 
      ? cart.map(i => ({ product: i.product, quantity: i.quantity }))
      : (selectedProductDetails ? [{ product: selectedProductDetails, quantity: 1 }] : []);

    const timeoutId = setTimeout(() => {
      fetch('/api/promos/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codes: filteredPromos.map(p => p.code),
          cartTotal: effectiveTotal,
          items: activeItems,
          collectionNames: activeItems.map(i => i.product.collection).filter(Boolean),
          categoryNames: activeItems.map(i => i.product.category).filter(Boolean),
          userEmail: currentUser?.email,
          userPhone: currentUser?.phone,
          userId: currentUser?.uid
        })
      })
        .then(res => {
          if (!res.ok) return null;
          return res.json();
        })
        .then(data => {
          if (data && data.valid && Array.isArray(data.results)) {
            setAppliedPromos(data.results);
          }
        })
        .catch(() => {});
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [cart, selectedProductDetails]);

  // Buy Now Flow (Gated by Auth, then direct to PhonePe Checkout Modal)
  const handleBuyNow = (product: Product, size: string, color?: string, quantity = 1) => {
    if (!currentUser) {
      setPendingBuyNowAction({ product, size, color, quantity });
      setAuthIntentNotice({
        title: `Sign in to Buy "${product.name}" via PhonePe`,
        subtitle: `Please sign in or create an account to proceed directly to PhonePe Payment Gateway.`
      });
      setIsAuthModalOpen(true);
      return;
    }

    handleAddToCart(product, size, undefined, color, quantity);
    setIsCartOpen(false);
    handleNavigateToPath('/checkout');
  };

  // Complete Order Checkout with static host fallback
  const handleCompleteOrder = async (orderData: {
    orderId?: string;
    deliveryAddress: DeliveryAddress;
    paymentMethod: 'PhonePe' | 'Razorpay' | 'UPI' | 'Card' | 'NetBanking' | 'COD' | string;
    customerEmail: string;
    transactionId?: string;
    phonepeTransactionId?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    feathersUsed?: number;
    feathersDiscount?: number;
    referralCodeUsed?: string;
  }) => {
    const totalMrp = cart.reduce((acc, item) => acc + item.product.originalPrice * item.quantity, 0);
    const totalDiscount = cart.reduce((acc, item) => acc + (item.product.originalPrice - item.product.price) * item.quantity, 0);
    const subtotal = totalMrp - totalDiscount;
    const couponDiscount = appliedPromo ? appliedPromo.discount : 0;
    const isPrepaidOrder = orderData.paymentMethod !== 'COD';
    const prepaidDiscount = (isPrepaidOrder && subtotal > 0) ? 55 : 0;
    const feathersDiscount = orderData.feathersDiscount || 0;
    // 100% Free delivery nationwide on all products (zero delivery charge even under 1000 rupees)
    const deliveryCharge = 0;
    const finalAmount = Math.max(0, subtotal - couponDiscount - prepaidDiscount - feathersDiscount + deliveryCharge);

    const primarySku = (cart[0]?.product?.sku && cart[0]?.product?.sku.trim())
      ? cart[0].product.sku.trim()
      : ((cart[0]?.product as any)?.skucode && (cart[0]?.product as any).skucode.trim())
      ? (cart[0]?.product as any).skucode.trim()
      : (cart[0]?.product?.id || 'FEAT');
    const cleanSku = String(primarySku).replace(/[^A-Za-z0-9-_]/g, '').toUpperCase();
    const fallbackSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderId = (orderData.orderId && orderData.orderId.trim())
      ? orderData.orderId.trim()
      : `${cleanSku}-${fallbackSuffix}`;

    const customer = getStoredCustomerSession();
    const effectiveUserId = currentUser?.uid || customer?.uid || undefined;
    const effectiveToken = customer?.token || undefined;

    const orderPayload = {
      id: orderId,
      userId: effectiveUserId,
      items: cart,
      deliveryAddress: orderData.deliveryAddress,
      paymentMethod: orderData.paymentMethod,
      customerEmail: orderData.customerEmail,
      promoCodeUsed: appliedPromos.map(p => p.code).join(', ') || undefined,
      promoCodesUsed: appliedPromos.map(p => p.code),
      appliedPromos: appliedPromos,
      transactionId: orderData.transactionId || orderData.razorpayPaymentId || orderData.phonepeTransactionId,
      phonepeTransactionId: orderData.phonepeTransactionId,
      razorpayOrderId: orderData.razorpayOrderId,
      razorpayPaymentId: orderData.razorpayPaymentId,
      razorpaySignature: orderData.razorpaySignature,
      feathersUsed: orderData.feathersUsed,
      feathersDiscount: orderData.feathersDiscount,
      referralCodeUsed: orderData.referralCodeUsed,
      totalMrp,
      discountAmount: totalDiscount,
      couponDiscount,
      prepaidDiscount,
      deliveryCharge,
      finalAmount
    };

    let createdOrderFromServer: Order | null = null;
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(effectiveToken ? { 'x-auth-token': effectiveToken } : {}),
          ...(effectiveUserId ? { 'x-user-id': effectiveUserId } : {})
        },
        body: JSON.stringify(orderPayload),
        signal: AbortSignal.timeout(25000)
      });
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData?.error || 'Order rejected by server due to inventory validation.');
      }
      if (resData && resData.order) {
        createdOrderFromServer = resData.order;
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch') && !err.message.includes('timeout')) {
        throw err;
      }
      console.warn('Backend order placement notice:', err);
    }

    const mockAwb = `SR-BD-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const newOrder: Order = createdOrderFromServer || {
      id: orderId,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      items: [...cart],
      totalMrp,
      discountAmount: totalDiscount,
      couponDiscount,
      prepaidDiscount,
      feathersUsed: orderData.feathersUsed,
      feathersDiscount: orderData.feathersDiscount,
      referralCodeUsed: orderData.referralCodeUsed,
      deliveryCharge,
      finalAmount,
      deliveryAddress: orderData.deliveryAddress,
      paymentMethod: orderData.paymentMethod as any,
      paymentStatus: orderData.paymentMethod === 'COD' ? 'Pending' : 'Paid',
      orderStatus: 'Ordered',
      customerEmail: orderData.customerEmail,
      promoCodeUsed: appliedPromos.map(p => p.code).join(', ') || undefined,
      promoCodesUsed: appliedPromos.map(p => p.code),
      appliedPromos: appliedPromos,
      transactionId: orderData.transactionId || orderData.razorpayPaymentId || orderData.phonepeTransactionId,
      phonepeTransactionId: orderData.phonepeTransactionId,
      razorpayOrderId: orderData.razorpayOrderId,
      razorpayPaymentId: orderData.razorpayPaymentId,
      razorpaySignature: orderData.razorpaySignature,
      shiprocketOrderId: Math.floor(10000000 + Math.random() * 90000000),
      shiprocketShipmentId: Math.floor(20000000 + Math.random() * 90000000),
      shiprocketAwbCode: mockAwb,
      shiprocketCourierName: 'BlueDart Express (Shiprocket)',
      shiprocketTrackingUrl: `https://shiprocket.co/tracking/${mockAwb}`,
      shiprocketStatus: 'Pickup Scheduled',
      shiprocketPickupScheduled: true,
      trackingHistory: [
        {
          status: 'Ordered',
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          location: 'Feat Store Online',
          completed: true,
          description: orderData.paymentMethod === 'Razorpay' 
            ? 'Order confirmed via Razorpay Secure Gateway' 
            : orderData.paymentMethod === 'PhonePe' 
            ? 'Order confirmed via PhonePe Payment Gateway' 
            : 'Order placed & Payment Verified'
        },
        {
          status: 'Packed',
          timestamp: 'Scheduled Today',
          location: 'Feat Central Warehouse, Khanyan, Hooghly (712147)',
          completed: false,
          description: 'Quality check, SKU barcode scan & handloom gift packaging'
        },
        {
          status: 'Shipped',
          timestamp: 'Expected Tomorrow',
          location: 'Shiprocket Logistics Hub',
          completed: false,
          description: 'Shiprocket automated pickup scheduled via BlueDart Express'
        },
        {
          status: 'Out for Delivery',
          timestamp: 'Pending Dispatch',
          location: 'Destination Delivery Hub',
          completed: false,
          description: 'Agent delivery assignment'
        },
        {
          status: 'Delivered',
          timestamp: 'Pending',
          location: orderData.deliveryAddress?.city || 'Customer Address',
          completed: false,
          description: 'Expected within 3-5 business days'
        }
      ]
    };

    // 1. Direct Firestore write for order
    try {
      await saveOrderToFirestore(newOrder);
    } catch (fsErr) {
      console.warn('Firestore order save notice:', fsErr);
    }

    setOrders(prev => [newOrder, ...prev]);

    setProducts(prev => {
      const updated = prev.map(prod => {
        const cartItemsForProd = cart.filter(ci => ci.product.id === prod.id);
        if (cartItemsForProd.length > 0) {
          let newStockCount = prod.stockCount;
          const updatedSizeStock = { ...(prod.sizeStock || {}) };
          
          for (const ci of cartItemsForProd) {
            newStockCount = Math.max(0, newStockCount - ci.quantity);
            const sizeKey = ci.selectedSize || (ci as any).size;
            if (sizeKey) {
              const currentSizeQty = updatedSizeStock[sizeKey] !== undefined
                ? updatedSizeStock[sizeKey]
                : (prod.stockCount > 0 ? Math.max(0, Math.floor(prod.stockCount / (prod.sizes.length || 1))) : 0);
              updatedSizeStock[sizeKey] = Math.max(0, currentSizeQty - ci.quantity);
            }
          }
          
          const updatedProd = { 
            ...prod, 
            stockCount: newStockCount,
            sizeStock: updatedSizeStock
          };

          // Update stock in Firestore
          saveProductToFirestore(updatedProd).catch(e => console.warn('Firestore stock sync note:', e));

          return updatedProd;
        }
        return prod;
      });
      return updated;
    });

    setNotifications(prev => {
      const notif: PushNotification = {
        id: 'notif-' + Date.now(),
        title: '🎉 Order Confirmed!',
        message: `Your order #${newOrder.id} of ₹${finalAmount.toLocaleString('en-IN')} has been placed successfully.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false,
        type: 'order'
      };
      return [notif, ...prev];
    });

    setCart([]);
    setAppliedPromos([]);
    return newOrder;
  };

  // Cancel Order & Recall Shiprocket Courier Pickup with Automated Refund Engine
  const handleCancelOrder = async (orderId: string, reason: string): Promise<{ success: boolean; order?: Order }> => {
    try {
      const customer = getStoredCustomerSession();
      const adminToken = localStorage.getItem('feat_admin_token') || sessionStorage.getItem('feat_admin_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) {
        headers['x-admin-token'] = adminToken;
      } else if (customer?.token) {
        headers['x-auth-token'] = customer.token;
      }

      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason })
      });

      const data = await response.json();
      if (response.ok && data.order) {
        setOrders(prev => prev.map(o => o.id === orderId ? data.order : o));

        // Sync cancellation to Firestore
        await saveOrderToFirestore(data.order).catch(e => console.warn('Firestore cancellation note:', e));

        const isPaid = data.order.paymentStatus === 'Refund Initiated' || data.order.paymentStatus === 'Refund Completed';
        const notifText = isPaid
          ? `Order #${orderId} was cancelled. Shiprocket pickup revoked and automated refund of ₹${data.order.finalAmount.toLocaleString('en-IN')} initiated to your original ${data.order.paymentMethod} account.`
          : `Order #${orderId} was cancelled. Shiprocket pickup revoked. No payment collected (Cash on Delivery).`;

        setNotifications(prev => {
          const notif: PushNotification = {
            id: 'notif-' + Date.now(),
            title: '⚠️ Order Cancelled',
            message: notifText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false,
            type: 'order',
            targetEmail: data.order.customerEmail,
            targetUserId: data.order.userId
          };
          return [notif, ...prev];
        });

        return { success: true, order: data.order };
      } else {
        throw new Error(data.error || 'Failed to cancel order');
      }
    } catch (err: any) {
      // Local fallback for offline/static hosting
      const existing = orders.find(o => o.id === orderId);
      if (existing) {
        const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
        const isPaid = existing.paymentStatus === 'Paid';
        const isCod = existing.paymentMethod === 'COD';

        const fallbackRefundId = (isPaid && !isCod)
          ? 'RFND_OFFLINE_' + Date.now().toString(36).toUpperCase()
          : undefined;

        const cancelledOrder: Order = {
          ...existing,
          orderStatus: 'Cancelled',
          cancelledAt: nowStr,
          cancellationReason: reason || 'Cancelled by customer',
          paymentStatus: (isPaid && !isCod) ? 'Refund Initiated' : (isCod ? 'Void' : existing.paymentStatus),
          refundId: fallbackRefundId,
          refundAmount: (isPaid && !isCod) ? existing.finalAmount : 0,
          refundStatus: (isPaid && !isCod) ? 'Initiated' : undefined,
          refundEstimatedDays: (isPaid && !isCod) ? '5-7 business days' : undefined,
          refundNote: (isPaid && !isCod) ? `Automated refund registered via ${existing.paymentMethod}` : 'COD - No payment collected',
          shiprocketStatus: 'Cancelled',
          shiprocketPickupScheduled: false,
          trackingHistory: [
            ...existing.trackingHistory,
            {
              status: 'Cancelled',
              timestamp: nowStr,
              location: 'Feat Central Operations',
              completed: true,
              description: (isPaid && !isCod)
                ? `Order cancelled (${reason || 'Customer request'}). Shiprocket pickup revoked. Refund of ₹${existing.finalAmount.toLocaleString('en-IN')} initiated.`
                : `Order cancelled (${reason || 'Customer request'}). Shiprocket pickup revoked. No payment collected (COD).`
            }
          ]
        };

        setOrders(prev => prev.map(o => o.id === orderId ? cancelledOrder : o));

        await saveOrderToFirestore(cancelledOrder).catch(e => console.warn(e));

        return { success: true, order: cancelledOrder };
      }
      throw err;
    }
  };

  // Update Order Delivery Address
  const handleUpdateOrderAddress = async (orderId: string, address: DeliveryAddress): Promise<{ success: boolean; order?: Order }> => {
    try {
      const response = await fetch(`/api/orders/${orderId}/address`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });

      const data = await response.json();
      if (response.ok && data.order) {
        setOrders(prev => prev.map(o => o.id === orderId ? data.order : o));
        await saveOrderToFirestore(data.order).catch(e => console.warn('Firestore address update note:', e));
        return { success: true, order: data.order };
      } else {
        throw new Error(data.error || 'Failed to update order address');
      }
    } catch (err: any) {
      const existing = orders.find(o => o.id === orderId);
      if (existing) {
        const updatedOrder: Order = {
          ...existing,
          deliveryAddress: address
        };
        setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
        await saveOrderToFirestore(updatedOrder).catch(e => console.warn(e));
        return { success: true, order: updatedOrder };
      }
      throw err;
    }
  };

  // Admin Actions with Firestore persistence & static host fallback
  const handleAddProduct = async (prodData: Partial<Product>) => {
    const sizes = prodData.sizes || ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    const sizeStock = prodData.sizeStock || {};
    const calculatedTotal = sizes.reduce((sum, sz) => sum + (Number(sizeStock[sz]) || 0), 0);

    const customSku = prodData.sku && prodData.sku.trim() ? prodData.sku.trim() : '';
    const customId = prodData.id && prodData.id.trim() ? prodData.id.trim() : '';
    const assignedSku = customSku || customId || `FEAT-${Math.floor(1000 + Math.random() * 9000)}`;
    const assignedId = customId || customSku || assignedSku;

    // Check if an existing product already shares this exact SKU
    const existingProduct = products.find(p => 
      (p.sku && p.sku.trim().toLowerCase() === assignedSku.toLowerCase()) ||
      p.id === assignedId
    );

    if (existingProduct) {
      // Intelligently merge as an interactive Color Variant under the existing product
      // This keeps the first uploaded product's primary image and settings by default on catalog,
      // while shoppers get options for all color variants on the product detail page!
      const incomingVariants = (prodData.colorVariants && prodData.colorVariants.length > 0)
        ? prodData.colorVariants
        : [];
      const incomingColors = prodData.colors || [];
      const incomingImages = (prodData.images && prodData.images.length > 0) ? prodData.images : [];

      const mergedVariants: ColorVariant[] = [...(existingProduct.colorVariants || [])];
      if (mergedVariants.length === 0 && existingProduct.images && existingProduct.images.length > 0) {
        mergedVariants.push({
          name: existingProduct.colors?.[0] || 'Original',
          imageUrl: existingProduct.images[0],
          images: existingProduct.images
        });
      }

      if (incomingVariants.length > 0) {
        for (const inv of incomingVariants) {
          if (!inv || !inv.name) continue;
          const matchIdx = mergedVariants.findIndex(v => v.name.trim().toLowerCase() === inv.name.trim().toLowerCase());
          const primaryImg = inv.imageUrl || inv.images?.[0] || incomingImages[0] || existingProduct.images[0];
          const variantImgs = (inv.images && inv.images.length > 0) ? inv.images : (primaryImg ? [primaryImg] : incomingImages);
          if (matchIdx !== -1) {
            mergedVariants[matchIdx] = {
              ...mergedVariants[matchIdx],
              imageUrl: primaryImg,
              images: variantImgs,
              sizes: inv.sizes || mergedVariants[matchIdx].sizes,
              sizeStock: inv.sizeStock || mergedVariants[matchIdx].sizeStock,
              stockCount: inv.stockCount !== undefined ? inv.stockCount : mergedVariants[matchIdx].stockCount
            };
          } else {
            mergedVariants.push({
              name: inv.name.trim(),
              imageUrl: primaryImg,
              images: variantImgs,
              sizes: inv.sizes,
              sizeStock: inv.sizeStock,
              stockCount: inv.stockCount
            });
          }
        }
      } else if (incomingImages.length > 0) {
        const detectedColor = incomingColors[0] || (prodData.name ? prodData.name.replace(existingProduct.name, '').trim() : '') || `Option ${mergedVariants.length + 1}`;
        const matchIdx = mergedVariants.findIndex(v => v.name.trim().toLowerCase() === detectedColor.toLowerCase());
        if (matchIdx !== -1) {
          mergedVariants[matchIdx] = {
            ...mergedVariants[matchIdx],
            imageUrl: incomingImages[0],
            images: incomingImages
          };
        } else {
          mergedVariants.push({
            name: detectedColor || 'New Color',
            imageUrl: incomingImages[0],
            images: incomingImages
          });
        }
      }

      const mergedColors = Array.from(new Set([
        ...(existingProduct.colors || []),
        ...incomingColors,
        ...mergedVariants.map(v => v.name)
      ])).filter(Boolean);

      // Preserve first uploaded product image at index 0 (default view), append new variant photos
      const mergedImages = [
        ...existingProduct.images,
        ...incomingImages.filter(img => !existingProduct.images.includes(img))
      ];

      const mergedSizeStock = { ...(existingProduct.sizeStock || {}) };
      for (const [sz, count] of Object.entries(sizeStock)) {
        mergedSizeStock[sz] = (Number(mergedSizeStock[sz]) || 0) + (Number(count) || 0);
      }

      const mergedProduct: Product = {
        ...existingProduct,
        colorVariants: mergedVariants,
        colors: mergedColors,
        images: mergedImages,
        sizeStock: mergedSizeStock,
        stockCount: Object.values(mergedSizeStock).reduce((sum: number, count: any) => sum + (Number(count) || 0), 0) || (existingProduct.stockCount + calculatedTotal),
      };

      setProducts(prev => prev.map(p => p.id === existingProduct.id ? mergedProduct : p));

      try {
        await Promise.allSettled([
          saveProductToFirestore(mergedProduct),
          fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mergedProduct)
          })
        ]);
      } catch (err) {
        console.warn('Persistence notice:', err);
      }
      return;
    }

    const finalStock = calculatedTotal > 0 ? calculatedTotal : (Number(prodData.stockCount) || 10);
    const finalSizeStock: Record<string, number> = { ...sizeStock };
    if (calculatedTotal === 0) {
      sizes.forEach(sz => {
        finalSizeStock[sz] = Math.max(1, Math.floor(finalStock / sizes.length) || 1);
      });
    }

    const newProduct: Product = {
      id: assignedId,
      sku: assignedSku,
      name: prodData.name || 'New Exclusive Ensemble',
      category: (prodData.category || 'Kurti') as CategoryType,
      collection: (prodData.collection || 'Jashn Collection') as CollectionType,
      price: Number(prodData.price) || 1999,
      originalPrice: Number(prodData.originalPrice) || 3999,
      discountPercent: Number(prodData.discountPercent) || 50,
      rating: 0,
      ratingCount: 0,
      stockCount: finalStock,
      images: (prodData.images && prodData.images.length > 0)
        ? prodData.images.filter((img: string) => img && typeof img === 'string' && !img.includes('1610030469983'))
        : [getCategoryFallbackImage(prodData.category, prodData.collection, prodData.name)],
      description: prodData.description || 'Exclusive handcrafted designer ensemble with intricate zari & thread detailing.',
      fabric: prodData.fabric || 'Pure Cotton Silk Blend',
      length: (prodData.length && prodData.length.trim() !== '') ? prodData.length.trim() : undefined,
      careInstructions: (prodData.careInstructions && prodData.careInstructions.trim() !== '') ? prodData.careInstructions.trim() : '',
      sizes,
      sizeStock: finalSizeStock,
      colors: prodData.colors || [],
      colorVariants: prodData.colorVariants || [],
      primaryColorName: (prodData.primaryColorName && prodData.primaryColorName.trim() !== '') ? prodData.primaryColorName.trim() : undefined,
      isFeatured: prodData.isFeatured ?? prodData.isfeatherd ?? false,
      isfeatherd: prodData.isfeatherd ?? prodData.isFeatured ?? false,
      isTrending: prodData.isTrending ?? true,
      tags: prodData.tags || ['New Arrival', 'Exclusive', (prodData.category || 'Kurti')],
      reviews: []
    };

    // 1. Immediately update in-memory state
    setProducts(prev => [newProduct, ...prev.filter(p => p.id !== newProduct.id)]);

    // 2. Persist to Firestore & Server concurrently in background
    try {
      await Promise.allSettled([
        saveProductToFirestore(newProduct),
        fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProduct)
        })
      ]);
    } catch (err) {
      console.warn('Persistence notice:', err);
    }
  };

  const handleUpdateProduct = async (productId: string, updatedData: Partial<Product>) => {
    const assignedSku = updatedData.sku && updatedData.sku.trim()
      ? updatedData.sku.trim()
      : undefined;

    const hasLengthKey = 'length' in updatedData;
    const finalLength = hasLengthKey
      ? ((updatedData.length && updatedData.length.trim() !== '') ? updatedData.length.trim() : undefined)
      : undefined;

    const hasPrimaryColorKey = 'primaryColorName' in updatedData;
    const finalPrimaryColor = hasPrimaryColorKey
      ? ((updatedData.primaryColorName && updatedData.primaryColorName.trim() !== '') ? updatedData.primaryColorName.trim() : undefined)
      : undefined;

    const updatedPayload = {
      ...updatedData,
      ...(hasLengthKey ? { length: finalLength } : {}),
      ...(hasPrimaryColorKey ? { primaryColorName: finalPrimaryColor } : {}),
      ...(assignedSku ? { sku: assignedSku } : {})
    };

    // Find target product to merge for Firestore
    const existing = products.find(p => p.id === productId);
    if (existing) {
      const merged = { ...existing, ...updatedPayload };
      if (hasLengthKey && !finalLength) {
        delete merged.length;
      }
      if (hasPrimaryColorKey && !finalPrimaryColor) {
        delete (merged as any).primaryColorName;
      }
      try {
        await saveProductToFirestore(merged);
      } catch (fsErr) {
        console.warn('Firestore update notice:', fsErr);
      }
    }

    try {
      await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload)
      });
    } catch (err) {}

    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      const merged = { ...p, ...updatedPayload };
      if (hasLengthKey && !finalLength) {
        delete merged.length;
      }
      return merged;
    }));
  };

  const handleUpdateStock = async (productId: string, stockCount: number) => {
    await handleUpdateProduct(productId, { stockCount });
  };

  // Submit Customer Star Rating & Product Review
  const handleSubmitProductReview = async (productId: string, reviewData: {
    rating: number;
    comment: string;
    headline?: string;
    userName: string;
    userEmail?: string;
    sizePurchased?: string;
    fitFeedback?: 'Runs Small' | 'True to Size' | 'Runs Large';
    images?: string[];
  }): Promise<ProductReview> => {
    const newReview: ProductReview = {
      id: 'rev-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      userName: reviewData.userName.trim() || currentUser?.displayName || 'Verified Buyer',
      userEmail: reviewData.userEmail || currentUser?.email || '',
      rating: reviewData.rating,
      headline: reviewData.headline?.trim() || undefined,
      comment: reviewData.comment.trim(),
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      verified: true,
      sizePurchased: reviewData.sizePurchased,
      fitFeedback: reviewData.fitFeedback || 'True to Size',
      helpfulCount: 0,
      images: reviewData.images ? reviewData.images.slice(0, 2) : []
    };

    let updatedTargetProduct: Product | null = null;

    setProducts(prev => {
      const updated = prev.map(p => {
        if (p.id === productId) {
          const currentReviews = p.reviews || [];
          const updatedReviews = [newReview, ...currentReviews];
          const totalRatingSum = updatedReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
          const newAvg = Number((totalRatingSum / updatedReviews.length).toFixed(1));

          const updatedProd: Product = {
            ...p,
            reviews: updatedReviews,
            rating: newAvg,
            ratingCount: updatedReviews.length
          };
          updatedTargetProduct = updatedProd;
          return updatedProd;
        }
        return p;
      });
      return updated;
    });

    if (updatedTargetProduct) {
      setSelectedProductDetails(updatedTargetProduct);
      saveProductToFirestore(updatedTargetProduct).catch(e => console.warn('Firestore review sync note:', e));
    }

    try {
      await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData)
      });
    } catch (err) {
      console.warn('API review endpoint sync notice:', err);
    }

    setNotifications(prev => {
      const notif: PushNotification = {
        id: 'notif-' + Date.now(),
        title: '⭐ Review Submitted!',
        message: `Thank you for reviewing "${updatedTargetProduct ? (updatedTargetProduct as Product).name : 'product'}" with a ${newReview.rating}★ rating.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false,
        type: 'system'
      };
      return [notif, ...prev];
    });

    return newReview;
  };

  const handleAddBanner = async (banner: Partial<BannerSlide>) => {
    const newBanner: BannerSlide = {
      id: banner.id || `slide-${Date.now()}`,
      tag: banner.tag || 'NEW ARRIVAL',
      title: banner.title || 'Exclusive Ethnic Collection',
      description: banner.description || '',
      image: banner.image || '',
      ctaText: banner.ctaText || 'Shop Now',
      ctaLink: banner.ctaLink || '',
      targetCollection: banner.targetCollection || 'All',
      targetCategory: banner.targetCategory || 'All'
    };

    // 1. Direct Firestore write
    try {
      await saveBannerToFirestore(newBanner);
    } catch (fsErr) {
      console.warn('Firestore direct banner save notice:', fsErr);
    }

    // 2. Server API write
    try {
      const res = await fetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBanner)
      });
      if (res.ok) {
        const saved = await res.json();
        if (saved && saved.id) {
          newBanner.id = saved.id;
        }
      }
    } catch (err) {}

    // 3. In-memory UI state
    setBanners(prev => [newBanner, ...prev.filter(b => b.id !== newBanner.id)]);
  };

  const handleUpdateBanner = async (id: string, banner: Partial<BannerSlide>) => {
    const existing = banners.find(b => b.id === id);
    const merged: BannerSlide = {
      id,
      tag: banner.tag ?? existing?.tag ?? 'NEW ARRIVAL SPOTLIGHT',
      title: banner.title ?? existing?.title ?? '',
      description: banner.description ?? existing?.description ?? '',
      image: banner.image ?? existing?.image ?? '',
      ctaText: banner.ctaText ?? existing?.ctaText ?? 'Shop Now',
      ctaLink: banner.ctaLink ?? existing?.ctaLink ?? '',
      targetCollection: banner.targetCollection ?? existing?.targetCollection ?? 'All',
      targetCategory: banner.targetCategory ?? existing?.targetCategory ?? 'All'
    };

    // 1. Immediately update in-memory state for instant feedback
    setBanners(prev => prev.map(b => b.id === id ? merged : b));

    // 2. Persist to backend server API
    try {
      await fetch(`/api/banners/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged)
      });
    } catch (err) {
      console.warn('Backend banner update error:', err);
    }

    // 3. Persist to Firestore databases
    try {
      await saveBannerToFirestore(merged);
    } catch (fsErr) {
      console.warn('Firestore banner update notice:', fsErr);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    // 1. Immediately update in-memory state
    setBanners(prev => prev.filter(b => b.id !== id));

    // 2. Delete from backend server API
    try {
      await fetch(`/api/banners/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Backend banner delete error:', err);
    }

    // 3. Delete from Firestore databases
    try {
      await deleteBannerFromFirestore(id);
    } catch (fsErr) {
      console.warn('Firestore banner delete notice:', fsErr);
    }
  };

  const handleDeleteProduct = async (productId: string, sku?: string) => {
    const existing = products.find(p => p.id === productId || (sku && p.sku === sku));
    const targetSku = sku || existing?.sku;
    const targetId = existing?.id || productId;

    // 1. Immediately update in-memory state
    setProducts(prev => prev.filter(p => p.id !== targetId && p.id !== productId && (!targetSku || p.sku !== targetSku)));

    // 2. Direct Firestore document delete (deletes both ID and SKU if different)
    try {
      await deleteProductFromFirestore(targetId, targetSku);
    } catch (fsErr) {
      console.warn('Firestore product delete notice:', fsErr);
    }

    // 3. Server API delete
    try {
      await fetch(`/api/products/${encodeURIComponent(targetId)}`, { method: 'DELETE' });
      if (targetSku && targetSku !== targetId) {
        await fetch(`/api/products/${encodeURIComponent(targetSku)}`, { method: 'DELETE' }).catch(() => {});
      }
    } catch (err) {}
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order['orderStatus']) => {
    // 1. Direct Firestore write
    try {
      await updateOrderStatusInFirestore(orderId, status);
    } catch (fsErr) {
      console.warn('Firestore order status update notice:', fsErr);
    }

    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
    } catch (err) {}

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, orderStatus: status } : o));
  };

  const handleSendEmailCampaign = async (campaign: { recipientGroup: string; subject: string; body: string; type: string }) => {
    try {
      await fetch('/api/admin/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign)
      });
    } catch (err) {}

    setEmails(prev => {
      const newMail: AutomatedEmail = {
        id: `EM-${Date.now().toString().slice(-3)}`,
        recipientGroup: campaign.recipientGroup as any,
        subject: campaign.subject,
        body: campaign.body,
        type: campaign.type as any,
        sentAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'Sent',
        openRate: '100%'
      };
      return [newMail, ...prev];
    });
  };

  const handleSavePromo = async (promo: PromoCode) => {
    // 1. Direct Firestore write
    try {
      await savePromoToFirestore(promo);
    } catch (fsErr) {
      console.warn('Firestore promo save notice:', fsErr);
    }

    try {
      await fetch('/api/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promo)
      });
    } catch (err) {}

    setPromos(prev => {
      const exists = prev.some(p => p.code === promo.code);
      return exists ? prev.map(p => p.code === promo.code ? promo : p) : [promo, ...prev];
    });
  };

  const handleDeletePromo = async (code: string) => {
    // 1. Direct Firestore write
    try {
      await deletePromoFromFirestore(code);
    } catch (fsErr) {
      console.warn('Firestore promo delete notice:', fsErr);
    }

    try {
      await fetch(`/api/promos/${code}`, { method: 'DELETE' });
    } catch (err) {}

    setPromos(prev => prev.filter(p => p.code !== code));
  };

  const handleUpdateLiveSale = async (config: Partial<LiveSaleConfig>) => {
    const fullConfig: LiveSaleConfig = {
      ...liveSaleConfig,
      ...config
    };

    // 1. Direct Firestore write
    try {
      await saveLiveSaleToFirestore(fullConfig);
    } catch (fsErr) {
      console.warn('Firestore live sale save notice:', fsErr);
    }

    try {
      await fetch('/api/live-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
    } catch (err) {}

    setLiveSaleConfig(prev => ({ ...prev, ...config }));

    const isLive = config.active ?? (config as any).enabled;
    if (isLive === true) {
      setNotifications(prev => {
        const notif: PushNotification = {
          id: 'notif-' + Date.now(),
          title: '⚡ Flash Sale Alert!',
          message: `Get extra ${config.discountPercent || 6}% OFF on all Kurti sets & couture collections with code ${config.couponCode || 'FEAT6'}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false,
          type: 'offer'
        };
        return [notif, ...prev.filter(n => n.type !== 'offer')];
      });
    } else if (isLive === false) {
      setNotifications(prev => prev.filter(n => n.type !== 'offer'));
    }
  };

  // Filtered Products List Math for Fashion Categories Section
  const displayedProducts = useMemo(() => {
    const list = products
      .filter(p => {
        if (selectedCategory !== 'All') {
          const pCat = (p.category || '').toString().trim().toLowerCase();
          const selCat = selectedCategory.toString().trim().toLowerCase();
          if (pCat !== selCat) return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            (p.name || '').toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q) ||
            (p.collection || '').toLowerCase().includes(q) ||
            (p.fabric || '').toLowerCase().includes(q) ||
            (p.description || '').toLowerCase().includes(q) ||
            (Array.isArray(p.tags) && p.tags.some(t => (t || '').toLowerCase().includes(q)));
          if (!matches) return false;
        }
        if (Number(p.price) > maxPriceFilter) return false;
        if (inStockOnly && Number(p.stockCount) === 0) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priceLowHigh') return a.price - b.price;
        if (sortBy === 'priceHighLow') return b.price - a.price;
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'newest') return b.id.localeCompare(a.id);
        return (b.ratingCount || 0) - (a.ratingCount || 0); // Popularity
      });
    return deduplicateProducts(list);
  }, [products, selectedCategory, searchQuery, maxPriceFilter, inStockOnly, sortBy]);

  // featherd Collection Products for Section 2
  const featherdCollectionProducts = useMemo(() => {
    const list = products
      .filter(p => {
        if (featherdCollection !== 'All') {
          const pCol = (p.collection || '').toString().trim().toLowerCase();
          const selCol = featherdCollection.toString().trim().toLowerCase();
          if (pCol !== selCol) {
            if (
              (selCol.includes('present') || selCol.includes('gift')) &&
              (pCol.includes('present') || pCol.includes('gift'))
            ) {
              // matches present is gifted / gift is present
            } else {
              return false;
            }
          }
        }
        if (Number(p.price) > maxPriceFilter) return false;
        if (inStockOnly && Number(p.stockCount) === 0) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            (p.name || '').toLowerCase().includes(q) ||
            (p.description || '').toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q);
          if (!matches) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priceLowHigh') return a.price - b.price;
        if (sortBy === 'priceHighLow') return b.price - a.price;
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'newest') return b.id.localeCompare(a.id);
        return (b.ratingCount || 0) - (a.ratingCount || 0); // Popularity
      });
    return deduplicateProducts(list);
  }, [products, featherdCollection, maxPriceFilter, inStockOnly, searchQuery, sortBy]);

  // New Arrivals Products (Auto Carousel)
  const finalNewArrivals = useMemo(() => {
    const newArrivalsProducts = products.filter(p => 
      p.tags?.some(t => ['New', 'New Arrival', 'Festive', 'Best Seller', 'Firdausi', 'Jashn'].includes(t)) || p.isTrending || p.isfeatherd
    );
    const raw = newArrivalsProducts.length >= 3 ? newArrivalsProducts : products.slice(0, 8);
    return deduplicateProducts(raw);
  }, [products]);

  // Sales on Live Products (Auto Carousel)
  const finalSalesOnLive = useMemo(() => {
    const salesOnLiveProducts = products
      .filter(p => p.discountPercent > 0 || p.collection === "'Deal maange more' Collection" || p.tags?.includes('Deal'))
      .sort((a, b) => b.discountPercent - a.discountPercent);
    const raw = salesOnLiveProducts.length >= 3 ? salesOnLiveProducts : products.filter(p => p.originalPrice > p.price);
    return deduplicateProducts(raw);
  }, [products]);

  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const unreadNotifCount = notifications.filter(n => !n.read).length;

  // Dedicated Admin Page route (/admin or /adminpanel)
  if (currentPath.includes('admin')) {
    return (
      <AdminPortal
        isOpen={true}
        onBackToHome={() => handleNavigateToPath('/')}
        products={products}
        orders={orders}
        emails={emails}
        promos={promos}
        banners={banners}
        liveSaleConfig={liveSaleConfig}
        onAddProduct={handleAddProduct}
        onUpdateProduct={handleUpdateProduct}
        onUpdateStock={handleUpdateStock}
        onDeleteProduct={handleDeleteProduct}
        onAddBanner={handleAddBanner}
        onUpdateBanner={handleUpdateBanner}
        onDeleteBanner={handleDeleteBanner}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        onSendEmailCampaign={handleSendEmailCampaign}
        onSavePromo={handleSavePromo}
        onDeletePromo={handleDeletePromo}
        onUpdateLiveSale={handleUpdateLiveSale}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff0f7] via-[#ffeaf4] via-40% to-[#fff5fa] text-gray-900 font-sans flex flex-col selection:bg-pink-300 selection:text-pink-950">
      
      {/* Top Banner Ribbon above Navbar */}
      <GlowingRibbon
        onOpenOfferModal={() => setIsOfferModalOpen(true)}
        onApplyPromo={handleApplyPromo}
        appliedPromo={appliedPromo}
        currentUser={currentUser}
        orders={orders}
      />

      {/* Navbar with matching design */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNavigateHome={() => handleNavigateToPath('/')}
        cartCount={cartItemCount}
        wishlistCount={wishlist.length}
        unreadNotifCount={unreadNotifCount}
        notifications={notifications}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onOpenDashboard={() => {
          if (!currentUser) {
            setIsAuthModalOpen(true);
          } else {
            handleNavigateToPath('/account');
          }
        }}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onSignOut={() => signOut(auth)}
        onOpenOffers={() => setIsOfferModalOpen(true)}
        onNavigateAbout={() => handleNavigateToPath('/about-us')}
        onOpenContact={() => setIsContactAboutOpen(true)}
        onNavigatePolicy={(path) => handleNavigateToPath(path)}
        products={products}
        onSelectProduct={(p) => handleSelectProduct(p)}
        currentUser={currentUser}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
      />

      {selectedProductDetails ? (
        <ProductDetailPage
          product={selectedProductDetails}
          allProducts={products}
          orders={orders}
          currentUser={currentUser}
          onBack={() => handleSelectProduct(null)}
          onSelectProduct={(p) => handleSelectProduct(p)}
          onAddToCart={(prod, size, color, quantity = 1) => {
            handleAddToCart(prod, size, color, color, quantity);
          }}
          onBuyNow={(prod, size, color, quantity = 1) => {
            handleBuyNow(prod, size, color, quantity);
          }}
          isWishlisted={wishlist.some(w => w.id === selectedProductDetails.id)}
          onToggleWishlist={handleToggleWishlist}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onSubmitReview={handleSubmitProductReview}
          appliedPromo={appliedPromo}
          appliedPromos={appliedPromos}
          onApplyPromo={handleApplyPromo}
          onRemovePromo={handleRemovePromo}
          onExploreCategory={(cat) => {
            handleSelectProduct(null);
            setSelectedCategory(cat);
            setSelectedCollection('All');
            setTimeout(() => {
              const target = document.getElementById('fashion-categories-section');
              if (target) target.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
          onExploreCollection={(col) => {
            handleSelectProduct(null);
            setSelectedCollection(col);
            setSelectedCategory('All');
            setTimeout(() => {
              const target = document.getElementById('fashion-categories-section');
              if (target) target.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
          promos={promos}
        />
      ) : currentPath.includes('checkout') ? (
        <CheckoutPage
          cartItems={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveCartItem}
          appliedPromo={appliedPromo}
          appliedPromos={appliedPromos}
          onApplyPromo={handleApplyPromo}
          onRemovePromo={handleRemovePromo}
          onExploreCategory={(cat) => {
            handleNavigateToPath('/');
            setSelectedCategory(cat);
            setSelectedCollection('All');
            setTimeout(() => {
              const target = document.getElementById('fashion-categories-section');
              if (target) target.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
          onExploreCollection={(col) => {
            handleNavigateToPath('/');
            setSelectedCollection(col);
            setSelectedCategory('All');
            setTimeout(() => {
              const target = document.getElementById('fashion-categories-section');
              if (target) target.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
          currentUser={currentUser}
          onBackToHome={() => handleNavigateToPath('/')}
          onNavigateToOrder={(orderId) => {
            handleNavigateToPath(`/order-details?id=${orderId}`);
          }}
          promos={promos}
          onCompleteOrder={handleCompleteOrder}
        />
      ) : (currentPath.includes('account') || currentPath.includes('dashboard') || currentPath.includes('my-orders')) ? (
        !currentUser ? (
          <AccountAuthBarrier
            onAuthenticated={(user) => {
              setCurrentUser(user);
            }}
            onBackToHome={() => handleNavigateToPath('/')}
          />
        ) : (
          <UserDashboard
            orders={userOrders}
            allProducts={products}
            onSelectProduct={(p) => handleSelectProduct(p)}
            onOpenOrderDetails={(ord) => {
              setSelectedOrderForDetails(ord);
              handleNavigateToPath(`/order-details?id=${ord.id}`);
            }}
            currentUser={currentUser}
            onSignOut={() => signOutCustomer()}
            onCancelOrder={handleCancelOrder}
            onUpdateOrderAddress={handleUpdateOrderAddress}
            onBackToHome={() => handleNavigateToPath('/')}
            onClose={() => handleNavigateToPath('/')}
          />
        )
      ) : currentPath.includes('order-details') ? (
        !currentUser ? (
          <AccountAuthBarrier
            onAuthenticated={(user) => {
              setCurrentUser(user);
            }}
            onBackToHome={() => handleNavigateToPath('/')}
          />
        ) : (
          <OrderDetailsPage
            order={
              selectedOrderForDetails && (
                (selectedOrderForDetails.customerEmail?.toLowerCase().trim() === currentUser.email?.toLowerCase().trim()) ||
                ((selectedOrderForDetails as any).userId && (selectedOrderForDetails as any).userId === currentUser.uid)
              )
                ? selectedOrderForDetails
                : userOrders.find(o => o.id === new URLSearchParams(window.location.search).get('id')) || null
            }
            orders={userOrders}
            onSelectOrder={(ord) => {
              setSelectedOrderForDetails(ord);
              handleNavigateToPath(`/order-details?id=${ord.id}`);
            }}
            onBack={() => {
              handleNavigateToPath('/account');
            }}
            onSelectProduct={(p) => handleSelectProduct(p)}
            onCancelOrder={async (orderId, reason) => {
              const res = await handleCancelOrder(orderId, reason);
              return res.success;
            }}
            onNavigateHome={() => handleNavigateToPath('/')}
            onNavigatePolicy={(path) => handleNavigateToPath(path)}
          />
        )
      ) : currentPath.includes('terms') ? (
        <TermsAndConditionsPage
          onBackToHome={() => handleNavigateToPath('/')}
          onNavigatePolicy={(path) => handleNavigateToPath(path)}
          onExploreCollection={(col) => {
            handleNavigateToPath('/');
            setSelectedCollection(col);
            setSelectedCategory('All');
            setTimeout(() => {
              const target = document.getElementById('fashion-categories-section');
              if (target) target.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
        />
      ) : currentPath.includes('privacy') ? (
        <PrivacyPolicyPage
          onBackToHome={() => handleNavigateToPath('/')}
          onNavigatePolicy={(path) => handleNavigateToPath(path)}
          onExploreCollection={(col) => {
            handleNavigateToPath('/');
            setSelectedCollection(col);
            setSelectedCategory('All');
            setTimeout(() => {
              const target = document.getElementById('fashion-categories-section');
              if (target) target.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
        />
      ) : (currentPath.includes('return') || currentPath.includes('refund') || currentPath.includes('cancellation')) ? (
        <RefundCancellationPage
          onBackToHome={() => handleNavigateToPath('/')}
          onNavigatePolicy={(path) => handleNavigateToPath(path)}
          onExploreCollection={(col) => {
            handleNavigateToPath('/');
            setSelectedCollection(col);
            setSelectedCategory('All');
            setTimeout(() => {
              const target = document.getElementById('fashion-categories-section');
              if (target) target.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
        />
      ) : (currentPath.includes('shipping') || currentPath.includes('delivery')) ? (
        <ShippingDeliveryPage
          onBackToHome={() => handleNavigateToPath('/')}
          onNavigatePolicy={(path) => handleNavigateToPath(path)}
          onExploreCollection={(col) => {
            handleNavigateToPath('/');
            setSelectedCollection(col);
            setSelectedCategory('All');
            setTimeout(() => {
              const target = document.getElementById('fashion-categories-section');
              if (target) target.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
        />
      ) : currentPath.includes('about-us') ? (
        <AboutUsPage
          onBackToHome={() => handleNavigateToPath('/')}
          onExploreCollection={(col) => {
            handleNavigateToPath('/');
            setSelectedCollection(col);
            setSelectedCategory('All');
            setTimeout(() => {
              const target = document.getElementById('fashion-categories-section');
              if (target) target.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
        />
      ) : (currentPath.includes('jashn') || currentPath.includes('firdausi') || currentPath.includes('9-to-fivers') || currentPath.includes('deal-maange-more') || currentPath.includes('present-is-gifted') || currentPath.includes('gift-is-present')) ? (
        <CollectionExplorePage
          collectionSlug={
            currentPath.includes('deal-maange-more') ? 'deal-maange-more' :
            (currentPath.includes('present-is-gifted') || currentPath.includes('gift-is-present')) ? 'present-is-gifted' :
            currentPath.includes('9-to-fivers') ? '9-to-fivers' :
            currentPath.includes('firdausi') ? 'firdausi' :
            'jashn'
          }
          products={products}
          onBackToHome={() => handleNavigateToPath('/')}
          onSelectProduct={(p) => handleSelectProduct(p)}
          onAddToCart={handleAddToCart}
          wishlist={wishlist}
          onToggleWishlist={handleToggleWishlist}
          onNavigateCollection={(slug) => handleNavigateToPath(`/${slug}`)}
        />
      ) : (currentPath.includes('kurti') || currentPath.includes('sharee') || currentPath.includes('dress-materials') || currentPath.includes('indo-western') || currentPath.includes('suit')) ? (
        <CategoryExplorePage
          categorySlug={
            currentPath.includes('dress-materials') ? 'dress-materials' :
            currentPath.includes('indo-western') ? 'indo-western' :
            currentPath.includes('sharee') ? 'sharee' :
            currentPath.includes('suit') ? 'suit' :
            'kurti'
          }
          products={products}
          onBackToHome={() => handleNavigateToPath('/')}
          onSelectProduct={(p) => handleSelectProduct(p)}
          onAddToCart={handleAddToCart}
          wishlist={wishlist}
          onToggleWishlist={handleToggleWishlist}
          onNavigateCategory={(slug) => handleNavigateToPath(`/${slug}`)}
        />
      ) : currentPath.includes('new-arrivals') || currentPath.includes('sales-on-live') ? (
        <ExplorePage
          pageType={currentPath.includes('new-arrivals') ? 'new-arrivals' : 'sales-on-live'}
          products={products}
          onBackToHome={() => handleNavigateToPath('/')}
          onSelectProduct={(p) => handleSelectProduct(p)}
          onAddToCart={handleAddToCart}
          wishlist={wishlist}
          onToggleWishlist={handleToggleWishlist}
        />
      ) : (
        <>
          {/* Top Category Stories / Quick Capsule Row (Categories: Kurti, Sharee, Dress Materials, Indo Western Dress, Suit) */}
          <TopCategoryStories
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => setSelectedCategory(cat)}
            onNavigateCategory={(slug) => handleNavigateToPath(`/${slug}`)}
          />

          {/* Hero Banner Auto Carousel Section */}
          <HeroCarousel
            banners={banners}
            onSelectCollection={(col) => {
              setSelectedCollection(col);
              if (col !== 'All') setSelectedCategory('All');
            }}
            onSelectCategory={(cat) => {
              if (cat !== 'All') setSelectedCategory(cat);
            }}
            onNavigate={(path) => handleNavigateToPath(path)}
          />

          {/* Exclusive Collection Stories / Quick Capsule Row (Under Banner Section) */}
          <TopCollectionStories
            selectedCollection={selectedCollection}
            onSelectCollection={(col) => setSelectedCollection(col)}
            onNavigateCollection={(slug) => handleNavigateToPath(`/${slug}`)}
          />

          {/* Main Product Catalog Section */}
          <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full space-y-8">

            {/* Section 0A: New Arrivals Auto Carousel */}
            <ProductAutoCarousel
              title="New Arrivals"
              subtitle="Explore our freshest handloom drops & couture ethnic wear"
              badgeText="FRESH DROP"
              badgeType="new"
              products={finalNewArrivals}
              onSelectProduct={(p) => handleSelectProduct(p)}
              onAddToCart={handleAddToCart}
              wishlist={wishlist}
              onToggleWishlist={handleToggleWishlist}
              onViewAll={() => handleNavigateToPath('/new-arrivals')}
              speedMs={2800}
            />

            {/* Section 0B: Sales on Live Auto Carousel */}
            <ProductAutoCarousel
              title="Sales on Live"
              subtitle="Limited time festive markdowns & flash price drops — Live now!"
              badgeText="LIVE SALE"
              badgeType="live"
              products={finalSalesOnLive}
              onSelectProduct={(p) => handleSelectProduct(p)}
              onAddToCart={handleAddToCart}
              wishlist={wishlist}
              onToggleWishlist={handleToggleWishlist}
              onViewAll={() => handleNavigateToPath('/sales-on-live')}
              speedMs={2400}
            />
        
            {/* Section 1: Fashion Categories Header & Filter Controls Toolbar */}
        <div id="fashion-categories-section" className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#ffeef6] via-white to-[#fff2f9] border-2 border-pink-200 shadow-lg p-5 sm:p-6 transition-all">
          {/* Subtle decorative glow highlights */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-pink-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between gap-4">
            
            {/* Title */}
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-pink-950 font-serif tracking-tight flex items-center gap-2">
                <span className="w-2.5 h-6 rounded-full bg-gradient-to-b from-[#ff2a85] to-amber-400 inline-block" />
                <span>{selectedCategory !== 'All' ? `${selectedCategory} Category` : 'Fashion Categories'}</span>
              </h2>
              <p className="text-xs text-pink-900/70 font-medium mt-0.5 pl-4">
                {displayedProducts.length} items available in {selectedCategory === 'All' ? 'all categories' : selectedCategory}
              </p>
            </div>

            {/* Integrated Filters Button */}
            <div>
              <button
                type="button"
                onClick={() => setIsFilterOpen(true)}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all shadow-md border ${
                  isFilterOpen || (maxPriceFilter < 10000 || sortBy !== 'popularity')
                    ? 'bg-pink-950 text-amber-200 border-amber-300/40'
                    : 'bg-white text-gray-900 border-pink-200/90 hover:bg-pink-50'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Filters</span>
                {(maxPriceFilter < 10000 || sortBy !== 'popularity') && (
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-pink-950 font-black text-[10px] flex items-center justify-center">
                    {(maxPriceFilter < 10000 ? 1 : 0) + (sortBy !== 'popularity' ? 1 : 0)}
                  </span>
                )}
              </button>
            </div>

          </div>

          {/* Category Icons Selector Row */}
          <div className="relative z-10 mt-4 pt-4 border-t border-pink-100/90">
            <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:flex-wrap sm:gap-3">
              {[
                { id: 'All', label: 'All', icon: Grid },
                { id: 'Kurti', label: 'Kurti', icon: Shirt },
                { id: 'Sharee', label: 'Sharee', icon: Gem },
                { id: 'Dress Materials', label: 'Dress Materials', icon: Scissors },
                { id: 'Indo Western dress', label: 'Indo Western', fullLabel: 'Indo Western dress', icon: Layers },
                { id: 'Suit', label: 'Suit', icon: Crown },
              ].map((cat) => {
                const IconComp = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`group flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-extrabold transition-all border ${
                      isSelected
                        ? 'bg-gradient-to-r from-pink-950 via-pink-900 to-amber-950 text-amber-200 border-amber-300/50 shadow-md ring-2 ring-pink-900/20 scale-[1.02]'
                        : 'bg-white/95 text-gray-800 border-pink-200/90 hover:bg-pink-50 hover:text-pink-950 hover:border-pink-300 shadow-sm hover:scale-[1.01]'
                    }`}
                  >
                    <div className={`p-1.5 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-amber-400/20 text-amber-300'
                        : 'bg-pink-100/80 text-pink-700 group-hover:bg-pink-200 group-hover:text-pink-900'
                    }`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] sm:text-xs text-center sm:text-left tracking-tight truncate max-w-full">
                      <span className="sm:hidden">{cat.label}</span>
                      <span className="hidden sm:inline">{cat.fullLabel || cat.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Product Cards Grid for Section 1 (Fashion Categories) */}
        {displayedProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-pink-100 p-12 text-center space-y-3 shadow-sm">
            <div className="w-16 h-16 bg-pink-50 text-pink-600 rounded-full flex items-center justify-center mx-auto text-3xl">
              🔍
            </div>
            <h3 className="font-extrabold text-base text-gray-900">No Products Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              No textile items match your search or price filters. Try adjusting your category or clearing filters.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
                setMaxPriceFilter(10000);
              }}
              className="bg-amber-400 text-pink-950 font-bold px-4 py-2 rounded-xl text-xs hover:bg-amber-300 transition-all shadow"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {displayedProducts.map((product) => (
              <ProductCard
                key={`disp-${product.id}`}
                product={product}
                onSelect={(p) => handleSelectProduct(p)}
                onAddToCart={handleAddToCart}
                isWishlisted={wishlist.some(w => w.id === product.id)}
                onToggleWishlist={handleToggleWishlist}
              />
            ))}
          </div>
        )}

        {/* Section 2: Curated Special Collections Showcase Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pink-950 via-pink-900 to-amber-950 border border-amber-300/40 shadow-2xl p-5 sm:p-6 text-amber-100 transition-all mt-10 space-y-6">
          {/* Subtle background ambient glows */}
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-300/20 pb-3">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-amber-200 font-serif flex items-center gap-2 tracking-tight">
                  <Crown className="w-5 h-5 text-amber-300" />
                  <span>Featured Collections</span>
                </h3>
                <p className="text-xs text-amber-100/70 mt-0.5">
                  Exclusive items curated for special themes and festive occasions
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(true)}
                  className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all shadow-md border ${
                    isFilterOpen || (maxPriceFilter < 10000 || sortBy !== 'popularity')
                      ? 'bg-amber-400 text-pink-950 border-amber-300 font-black'
                      : 'bg-white/10 hover:bg-white/20 text-amber-100 border-amber-300/30'
                  }`}
                >
                  <SlidersHorizontal className={`w-4 h-4 shrink-0 ${
                    isFilterOpen || (maxPriceFilter < 10000 || sortBy !== 'popularity')
                      ? 'text-pink-950'
                      : 'text-amber-300'
                  }`} />
                  <span>Filters</span>
                  {(maxPriceFilter < 10000 || sortBy !== 'popularity') && (
                    <span className={`w-5 h-5 rounded-full font-black text-[10px] flex items-center justify-center ${
                      isFilterOpen || (maxPriceFilter < 10000 || sortBy !== 'popularity')
                        ? 'bg-pink-950 text-amber-200'
                        : 'bg-amber-400 text-pink-950'
                    }`}>
                      {(maxPriceFilter < 10000 ? 1 : 0) + (sortBy !== 'popularity' ? 1 : 0)}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Collection Grid Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
              {[
                {
                  id: 'All',
                  label: 'All Collections',
                  desc: 'Complete Catalog',
                  icon: Layers,
                },
                {
                  id: '9 to fivers collection',
                  label: '9 to Fivers Collection',
                  desc: 'Workwear Elegance',
                  icon: Briefcase,
                },
                {
                  id: 'Firdausi collection',
                  label: 'Firdausi Collection',
                  desc: 'Royal Silk & Banarasi',
                  icon: Crown,
                },
                {
                  id: "'Present is Gifted' Collection",
                  label: "'Present is Gifted' Collection",
                  desc: 'Festive Hampers',
                  icon: Gift,
                },
                {
                  id: "'Deal maange more' Collection",
                  label: "'Deal maange more' Collection",
                  desc: 'Super Saver Deals',
                  icon: Tag,
                },
                {
                  id: 'Jashn Collection',
                  label: 'Jashn Collection',
                  desc: 'Celebration & Wedding',
                  icon: PartyPopper,
                },
              ].map((col) => {
                const IconComp = col.icon;
                const isSelected = featherdCollection === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setfeatherdCollection(col.id)}
                    className={`group flex flex-col items-start p-3 sm:p-3.5 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-amber-400 text-pink-950 border-amber-300 shadow-lg scale-[1.02] font-black'
                        : 'bg-white/10 hover:bg-white/20 text-amber-100 border-amber-300/30 hover:border-amber-300/60 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className={`p-2 rounded-xl transition-colors ${
                        isSelected
                          ? 'bg-pink-950 text-amber-300'
                          : 'bg-amber-300/20 text-amber-200 group-hover:bg-amber-300/30'
                      }`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-pink-950 animate-pulse" />
                      )}
                    </div>
                    <span className="text-xs font-black tracking-tight line-clamp-1">
                      {col.label}
                    </span>
                    <span className={`text-[10px] mt-0.5 line-clamp-1 ${
                      isSelected ? 'text-pink-950/80 font-medium' : 'text-amber-200/70'
                    }`}>
                      {col.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Items Grid for Selected featherd Collection */}
          <div className="relative z-10 pt-2">
            {featherdCollectionProducts.length === 0 ? (
              <div className="bg-white/5 rounded-2xl border border-amber-300/20 p-8 text-center text-amber-200 text-xs font-medium">
                No items found in this collection currently.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {featherdCollectionProducts.map((product) => (
                  <ProductCard
                    key={`col-${product.id}`}
                    product={product}
                    onSelect={(p) => handleSelectProduct(p)}
                    onAddToCart={handleAddToCart}
                    isWishlisted={wishlist.some(w => w.id === product.id)}
                    onToggleWishlist={handleToggleWishlist}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

      </main>
        </>
      )}

      {/* Footer (Flipkart Inspired) */}
      <footer className="bg-pink-950 text-amber-100 border-t-2 border-amber-400/40 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-xs">
          
          <div className="space-y-3 col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="Feat: feather Hut Fashion" 
                className="h-10 sm:h-12 w-auto object-contain max-w-[120px] drop-shadow-xs shrink-0"
                onError={(e) => {
                  e.currentTarget.src = '/logo.jpeg';
                }}
              />
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight font-serif text-amber-200 leading-tight">
                  Feat:
                </span>
                <span className="text-xs font-bold text-amber-100 font-serif whitespace-nowrap">
                  Feather Hut Fashion<span className="text-[9px] font-sans">™</span>
                </span>
              </div>
            </div>
            <p className="text-amber-100/70 text-[11px] leading-relaxed">
              Feat: feather Hut Fashion is your premier destination for authentic Indian textiles, silk sarees, designer kurtis, dress materials, and salwar suits. Crafted with weaver heritage from Surat & Banaras.
            </p>
            {/* Social Media Links */}
            <div className="pt-2">
              <h5 className="font-extrabold text-amber-300 uppercase tracking-wider text-[10px] mb-2">Connect With Us</h5>
              <div className="flex items-center gap-2">
                <a
                  href="https://www.facebook.com/share/1BWWt6ZKBr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-amber-400/10 hover:bg-amber-400 text-amber-200 hover:text-pink-950 rounded-xl border border-amber-300/30 transition-all flex items-center justify-center"
                  title="Facebook"
                  aria-label="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href="https://www.instagram.com/featherhutfashion"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-amber-400/10 hover:bg-amber-400 text-amber-200 hover:text-pink-950 rounded-xl border border-amber-300/30 transition-all flex items-center justify-center"
                  title="Instagram"
                  aria-label="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href="https://youtube.com/@featherhutfashion"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-amber-400/10 hover:bg-amber-400 text-amber-200 hover:text-pink-950 rounded-xl border border-amber-300/30 transition-all flex items-center justify-center"
                  title="YouTube"
                  aria-label="YouTube"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-extrabold text-amber-300 uppercase tracking-wider text-[11px]">Store Categories</h4>
            <ul className="space-y-1.5 text-amber-100/80">
              <li onClick={() => { setSelectedCategory('Kurti'); setSelectedCollection('All'); }} className="hover:text-amber-300 cursor-pointer">Kurtis</li>
              <li onClick={() => { setSelectedCategory('Sharee'); setSelectedCollection('All'); }} className="hover:text-amber-300 cursor-pointer">Sharees (Sarees)</li>
              <li onClick={() => { setSelectedCategory('Dress Materials'); setSelectedCollection('All'); }} className="hover:text-amber-300 cursor-pointer">Dress Materials</li>
              <li onClick={() => { setSelectedCategory('Indo Western dress'); setSelectedCollection('All'); }} className="hover:text-amber-300 cursor-pointer">Indo Western Dress</li>
              <li onClick={() => { setSelectedCategory('Suit'); setSelectedCollection('All'); }} className="hover:text-amber-300 cursor-pointer">Salwar Suits</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-extrabold text-amber-300 uppercase tracking-wider text-[11px]">Customer Care & Policies</h4>
            <ul className="space-y-1.5 text-amber-100/80">
              <li onClick={() => handleNavigateToPath('/terms')} className="hover:text-amber-300 cursor-pointer">Terms & Conditions</li>
              <li onClick={() => handleNavigateToPath('/privacy-policy')} className="hover:text-amber-300 cursor-pointer">Privacy Policy</li>
              <li onClick={() => handleNavigateToPath('/return-and-cancellation')} className="hover:text-amber-300 cursor-pointer">Refund & Cancellation</li>
              <li onClick={() => handleNavigateToPath('/shipping-and-delivery')} className="hover:text-amber-300 cursor-pointer">Shipping & Delivery</li>
              <li onClick={() => { setInitialContactTab('contact'); setIsContactAboutOpen(true); }} className="hover:text-amber-300 cursor-pointer">Contact Support</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-extrabold text-amber-300 uppercase tracking-wider text-[11px]">Business Credentials &amp; HQ</h4>
            <div className="space-y-2 text-[11px] text-amber-100/90 leading-snug">
              <div className="bg-pink-900/60 p-3 rounded-xl border border-amber-300/20 space-y-1.5">
                <p className="font-bold text-white text-xs">Feather Hut Fashion</p>
                <p className="text-amber-200 font-mono text-[10px]">
                  <strong className="text-white">GSTIN:</strong> 19APAPC3078H1Z1
                </p>
                <p className="text-amber-100/80">
                  <strong className="text-amber-300">Registered Office:</strong> Khanyan, Hoogly, West Bengal-712147
                </p>
              </div>

              <ul className="space-y-1.5 pt-1">
                <li onClick={() => handleNavigateToPath('/about-us')} className="hover:text-amber-300 cursor-pointer font-medium flex items-center gap-1 text-xs text-amber-200">
                  <span>About Our Heritage &amp; Story</span>
                </li>
                <li className="text-[11px]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>Helpline:</span>
                    <a href="tel:7869579735" className="text-amber-300 font-bold hover:underline">7869579735</a>
                    <a href="https://wa.me/917869579735" target="_blank" rel="noopener noreferrer" className="px-1.5 py-0.5 bg-emerald-700/60 hover:bg-emerald-600 text-emerald-100 text-[10px] rounded font-semibold transition-colors">
                      WhatsApp
                    </a>
                  </div>
                </li>
                <li className="text-[11px] break-all">
                  <span>Support: </span>
                  <a href="mailto:support@featherhutfashion.com" className="text-amber-200 hover:underline">support@featherhutfashion.com</a>
                </li>
              </ul>
            </div>
          </div>

        </div>

        {/* Payment Gateway Trust & Security Bar (PG Compliance & Verification) */}
        <div className="border-t border-amber-400/20 bg-pink-950/60 py-5 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div className="space-y-1">
              <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-bold text-amber-200">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold">
                  🔒 256-BIT SSL ENCRYPTED
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950/80 border border-blue-400/30 text-blue-300 text-[10px] font-bold">
                  🛡️ 100% SECURE GATEWAY
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-400/30 text-amber-300 text-[10px] font-bold">
                  🧵 100% AUTHENTIC WEAVE
                </span>
              </div>
              <p className="text-[10px] text-amber-100/60">
                Authorized Online Merchant | GSTIN: 19APAPC3078H1Z1 | Payments processed securely via encrypted banking gateways.
              </p>
            </div>

            {/* Payment Method Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-bold text-white">
              <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/15">UPI (GPay / PhonePe / Paytm)</span>
              <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/15">RuPay</span>
              <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/15">Visa</span>
              <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/15">MasterCard</span>
              <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/15">NetBanking</span>
              <span className="px-2.5 py-1 rounded-md bg-emerald-900/50 border border-emerald-500/30 text-emerald-200">Cash on Delivery</span>
            </div>
          </div>
        </div>

        <div className="bg-pink-950/90 border-t border-amber-400/20 py-4 px-4 text-center text-[11px] text-amber-200/60 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} Feather Hut Fashion (GSTIN: 19APAPC3078H1Z1). Registered Office: Khanyan, Hoogly, West Bengal-712147. All Rights Reserved.</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleNavigateToPath('/admin')}
              className="text-amber-200/60 hover:text-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="Restricted Store Management Portal (Ctrl + Shift + A)"
            >
              <span>🔒 Merchant Portal</span>
            </button>
          </div>
        </div>
      </footer>

      {/* MODALS & DRAWERS */}

      {/* Offer Modal */}
      <OfferModal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        promos={promos}
      />


      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveCartItem}
        appliedPromo={appliedPromo}
        appliedPromos={appliedPromos}
        onApplyPromo={handleApplyPromo}
        onRemovePromo={handleRemovePromo}
        onExploreCategory={(cat) => {
          setIsCartOpen(false);
          handleSelectProduct(null);
          setSelectedCategory(cat);
          setSelectedCollection('All');
          setTimeout(() => {
            const target = document.getElementById('fashion-categories-section');
            if (target) target.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }}
        onExploreCollection={(col) => {
          setIsCartOpen(false);
          handleSelectProduct(null);
          setSelectedCollection(col);
          setSelectedCategory('All');
          setTimeout(() => {
            const target = document.getElementById('fashion-categories-section');
            if (target) target.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          if (!currentUser) {
            setAuthIntentNotice({
              title: 'Sign in to Checkout',
              subtitle: 'Please sign in or create an account to proceed to checkout.'
            });
            setIsAuthModalOpen(true);
          } else {
            handleNavigateToPath('/checkout');
          }
        }}
        promos={promos}
      />

      {/* Wishlist Drawer */}
      <WishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlist={wishlist}
        onRemoveFromWishlist={handleToggleWishlist}
        onAddToCart={(p, size, e) => {
          handleAddToCart(p, size, e);
        }}
        onSelectProduct={(p) => {
          setIsWishlistOpen(false);
          handleSelectProduct(p);
        }}
      />

      {/* Visitor Auth Portal Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingBuyNowAction(null);
          setAuthIntentNotice(null);
        }}
        intentTitle={authIntentNotice?.title}
        intentSubtitle={authIntentNotice?.subtitle}
        onSuccess={(user) => {
          setIsAuthModalOpen(false);
          if (pendingBuyNowAction) {
            const { product, size, color, quantity } = pendingBuyNowAction;
            handleAddToCart(product, size, undefined, color, quantity || 1);
            setPendingBuyNowAction(null);
            setAuthIntentNotice(null);
            handleNavigateToPath('/checkout');
          } else if (cart.length > 0) {
            handleNavigateToPath('/checkout');
          }
        }}
      />

      {/* Contact & About Us Modal */}
      <ContactAboutModal
        isOpen={isContactAboutOpen}
        onClose={() => setIsContactAboutOpen(false)}
        initialTab={initialContactTab}
      />

      {/* Filter & Sort Popup Modal (Only Sort Order & Price Limit) */}
      {isFilterOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsFilterOpen(false)}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-pink-200 p-5 sm:p-6 space-y-5 sm:space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-pink-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-pink-100 text-pink-900 rounded-2xl">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-pink-950">Filter & Sort</h3>
                  <p className="text-xs text-gray-500">Adjust price limit and sorting options</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-pink-50 rounded-full font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* 1. Sort Order */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-gray-700 uppercase tracking-wider block">
                Sort Order
              </label>
              <div className="relative flex items-center bg-pink-50/70 border border-pink-200 rounded-2xl px-3 py-2.5">
                <ArrowUpDown className="w-4 h-4 text-pink-700 shrink-0 mr-2" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-gray-900 w-full focus:outline-none cursor-pointer"
                >
                  <option value="popularity">Popularity</option>
                  <option value="priceLowHigh">Price: Low to High</option>
                  <option value="priceHighLow">Price: High to Low</option>
                  <option value="rating">Customer Rating</option>
                  <option value="newest">New Arrivals</option>
                </select>
              </div>
            </div>

            {/* 2. Price Limit Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-extrabold text-gray-700 uppercase tracking-wider">
                  Price Limit
                </label>
                <span className="font-black text-pink-950 bg-pink-100 px-2.5 py-1 rounded-xl border border-pink-200">
                  ₹{maxPriceFilter.toLocaleString('en-IN')}
                </span>
              </div>
              <input
                type="range"
                min={500}
                max={10000}
                step={250}
                value={maxPriceFilter}
                onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                className="w-full h-2 bg-pink-100 rounded-lg appearance-none cursor-pointer accent-pink-700"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-bold px-0.5">
                <span>₹500</span>
                <span>₹10,000</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-pink-100">
              <button
                type="button"
                onClick={() => {
                  setMaxPriceFilter(10000);
                  setSortBy('popularity');
                }}
                className="flex-1 py-3 text-xs font-bold text-gray-700 hover:text-pink-950 bg-gray-100 hover:bg-pink-100/60 rounded-2xl transition-all"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="flex-1 py-3 text-xs font-extrabold text-amber-200 bg-pink-950 hover:bg-pink-900 rounded-2xl shadow-lg transition-all"
              >
                Apply
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Push Notification Toast */}
      <PushNotificationToast
        notifications={notifications}
        onOpenDashboard={() => handleNavigateToPath('/account')}
      />

      {/* Global Custom Alert / Stock Notice Modal */}
      <CustomAlertModal
        isOpen={customAlert.isOpen}
        title={customAlert.title}
        message={customAlert.message}
        type={customAlert.type}
        onClose={() => setCustomAlert(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Floating Feather Animation when item added to wishlist */}
      <FloatingFeatherAnimation
        feathers={activeFeathers}
        onFeatherComplete={handleFeatherComplete}
      />

    </div>
  );
}
