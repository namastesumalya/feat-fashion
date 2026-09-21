export interface BannerSlide {
  id: string;
  tag: string;
  title: string;
  description: string;
  image: string;
  ctaText: string;
  ctaLink?: string;
  targetCollection?: string;
  targetCategory?: string;
}

export type CategoryType = 
  | 'Kurti' 
  | 'Sharee' 
  | 'Dress Materials' 
  | 'Indo Western dress' 
  | 'Suit';

export type CollectionType = 
  | '9 to fivers collection' 
  | 'Firdausi collection' 
  | "'Present is Gifted' Collection"
  | "'Gift is present' Collection" 
  | "'Deal maange more' Collection" 
  | 'Jashn Collection';

export interface ProductReview {
  id: string;
  userName: string;
  userEmail?: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
  headline?: string;
  sizePurchased?: string;
  fitFeedback?: 'Runs Small' | 'True to Size' | 'Runs Large';
  helpfulCount?: number;
  images?: string[];
}

export const AVAILABLE_STANDARD_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Free Size'] as const;
export type StandardSize = typeof AVAILABLE_STANDARD_SIZES[number];

export interface ColorVariant {
  name: string;
  imageUrl?: string;
  images?: string[];
  linkedProductId?: string;
  sizes?: string[];
  sizeStock?: Record<string, number>;
  stockCount?: number;
}

export interface Product {
  id: string;
  sku?: string;
  name: string;
  category: CategoryType;
  collection: CollectionType;
  price: number;
  originalPrice: number;
  discountPercent: number;
  rating: number;
  ratingCount: number;
  stockCount: number;
  sizeStock?: Record<string, number>;
  images: string[];
  description: string;
  fabric: string;
  length?: string;
  careInstructions: string;
  sizes: string[];
  colors?: string[];
  colorVariants?: ColorVariant[];
  primaryColorName?: string;
  isFeatured?: boolean;
  isfeatherd?: boolean;
  isTrending?: boolean;
  reviews: ProductReview[];
  tags: string[];
}

export interface CartItem {
  product: Product;
  selectedSize: string;
  selectedColor?: string;
  quantity: number;
}

export interface DeliveryAddress {
  id?: string;
  fullName: string;
  phone: string;
  pincode: string;
  addressLine: string;
  city: string;
  state: string;
  landmark?: string;
  type: 'Home' | 'Work' | 'Other';
  isDefault?: boolean;
}

export interface ShiprocketCourierOption {
  courier_company_id?: number | string;
  courier_name: string;
  rate?: number;
  estimated_delivery_days?: number | string;
  etd?: string;
  is_surface?: boolean;
  cod?: boolean | number;
}

export interface DeliveryEstimate {
  pincode: string;
  city?: string;
  state?: string;
  isServiceable: boolean;
  distanceKm?: number;
  originHub?: string;
  originPincode?: string;
  estimatedDeliveryDate: string; // e.g. "Thu, 4 Sep" or "Thursday, 4 September"
  estimatedDays: string; // e.g. "2-3 Days"
  courierName: string; // e.g. "Blue Dart Express (Shiprocket)"
  isCodAvailable: boolean;
  deliveryCharge: number;
  dispatchTime: string; // e.g. "Dispatches within 24 Hours from Khanyan, Hooghly (712147)"
  availableCouriers?: ShiprocketCourierOption[];
  source?: 'live_shiprocket' | 'shiprocket_serviceability_engine';
}

export interface OrderTrackingStep {
  status: 'Ordered' | 'Packed' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  timestamp: string;
  location: string;
  completed: boolean;
  description: string;
}

export interface ShiprocketScanActivity {
  date: string;
  status: string;
  activity: string;
  location: string;
  'sr-status'?: string;
  completed?: boolean;
  stage?: 'Ordered' | 'Packed' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
}

export interface ShiprocketTrackItem {
  id: number | string;
  awb_code: string;
  courier_name: string;
  current_status: string;
  origin: string;
  destination: string;
  edd: string;
  order_id: string;
  pickup_date?: string;
  delivery_date?: string | null;
}

export interface ShiprocketTrackingData {
  track_status: number;
  shipment_status: number;
  shipment_track: ShiprocketTrackItem[];
  shipment_track_activities: ShiprocketScanActivity[];
  track_url?: string;
  is_live?: boolean;
  last_updated?: string;
}

export interface Order {
  id: string;
  date: string;
  items: CartItem[];
  totalMrp: number;
  discountAmount: number;
  couponDiscount: number;
  prepaidDiscount?: number; // Flat ₹55 discount on prepaid/online orders
  deliveryCharge: number;
  finalAmount: number;
  deliveryAddress: DeliveryAddress;
  paymentMethod: 'PhonePe' | 'Razorpay' | 'UPI' | 'Card' | 'NetBanking' | 'COD' | string;
  paymentStatus: 'Paid' | 'Pending' | 'Failed' | 'Refund Initiated' | 'Refund Completed' | 'Void' | 'Pending Payment';
  orderStatus: 'Ordered' | 'Packed' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  trackingHistory?: OrderTrackingStep[];
  customerEmail: string;
  userId?: string;
  promoCodeUsed?: string;
  promoCodesUsed?: string[];
  appliedPromos?: AppliedPromo[];
  feathersUsed?: number; // Number of magic feathers redeemed in this order (1 feather = 50 paisa)
  feathersDiscount?: number; // Rupee discount from magic feathers
  referralCodeUsed?: string; // Referral code of the friend who referred this customer
  transactionId?: string;
  phonepeTransactionId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  // Refund Tracking
  refundId?: string;
  refundAmount?: number;
  refundStatus?: 'Initiated' | 'Processed' | 'Completed' | 'Failed';
  refundInitiatedAt?: string;
  refundEstimatedDays?: string;
  refundNote?: string;
  // Shiprocket Shipping Automation Fields
  shiprocketOrderId?: number | string;
  shiprocketShipmentId?: number | string;
  shiprocketAwbCode?: string;
  shiprocketCourierName?: string;
  shiprocketTrackingUrl?: string;
  shiprocketLabelUrl?: string;
  shiprocketInvoiceUrl?: string;
  shiprocketStatus?: string;
  shiprocketPickupScheduled?: boolean;
  shiprocketSyncStatus?: 'live_synced' | 'pending_pickup' | 'credentials_required' | 'pickup_failed' | 'simulated' | 'pending_payment';
  shiprocketSyncError?: string;
  shiprocketPickupDate?: string;
  shiprocketPickupToken?: string;
  cancellationReason?: string;
  cancelledAt?: string;
}

export interface PushNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'order' | 'inventory' | 'offer' | 'system';
  link?: string;
  targetEmail?: string;
  targetUserId?: string;
}

export interface AppliedPromo {
  code: string;
  discount: number;
  description: string;
}

export interface PromoCode {
  id?: string;
  name?: string; // Descriptive sale/coupon title e.g. "Festive Heritage Bonanza"
  code: string;
  discountType: 'percent' | 'flat';
  discountValue: number;
  minOrderValue: number;
  description: string;
  reasonForSale?: string; // Why admin is giving the coupon code & sale (e.g. "5th Anniversary Celebration", "Diwali Special")
  collectionRestricted?: CollectionType;
  categoryRestricted?: string | string[];
  categoriesRestricted?: string[];
  validFrom?: string; // ISO / datetime string for scheduling start
  validUntil?: string; // ISO / datetime string for expiry date & time
  showPopupAnnouncement?: boolean; // If true, triggers the custom popup window on website
  popupTitle?: string; // Custom headline for the website popup
  popupMessage?: string; // Custom message in website popup
  popupBadge?: string; // E.g. "SPECIAL OCCASION", "LIMITED TIME"
  active: boolean;
  isFirstOrderOnly?: boolean; // Exclusive for first-time orders
}

export interface LiveSaleConfig {
  active?: boolean;
  enabled?: boolean;
  title: string;
  bannerText?: string;
  couponCode?: string;
  endTime?: string;
  discountPercent?: number;
  targetType?: 'all' | 'specific_items' | 'category';
  targetCategory?: CategoryType;
  targetProductIds?: string[];
  endDate?: string;
}

export interface AutomatedEmail {
  id: string;
  recipientGroup: 'All Customers' | 'Abandoned Cart Users' | 'VIP Buyers' | 'Recent Shoppers';
  subject: string;
  body: string;
  type: 'Festive Sale' | 'Cart Reminder' | 'Order Dispatch' | 'New Collection Arrival';
  sentAt: string;
  status: 'Sent' | 'Scheduled' | 'Draft';
  openRate: string;
}

export interface FilterOptions {
  category?: string;
  collection?: string;
  searchQuery?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sortBy?: 'popularity' | 'priceLowHigh' | 'priceHighLow' | 'newest' | 'rating';
}

export interface PaymentLog {
  id: string;
  timestamp: string;
  orderId?: string;
  paymentId?: string;
  status: 'failed' | 'cancelled' | 'timeout' | 'error' | 'pending';
  errorCode?: string;
  errorReason?: string;
  errorDescription?: string;
  errorSource?: string;
  errorStep?: string;
  paymentMethod: string;
  amount: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  cartItemsCount?: number;
  itemsSummary?: string;
  elapsedSeconds?: number;
  deviceInfo?: {
    userAgent?: string;
    screenResolution?: string;
    online?: boolean;
  };
  actionAdvice?: string;
  createdAt: string;
}

export interface MagicFeatherTransaction {
  id: string;
  userId: string; // Recipient user ID who owns these feathers
  userEmail?: string;
  type: 'referral_earned' | 'order_redeemed' | 'order_refunded' | 'signup_bonus';
  orderId?: string;
  orderBillingValue?: number; // The billing value of the friend's order
  feathers: number; // e.g. 200 feathers or 40 feathers
  valueInRupees: number; // feathers * 0.50 (1 feather = 50 paisa)
  rewardPercent?: number; // Dynamic reward rate up to 5% (e.g. between 0.1% and 5.0%)
  status: 'pending' | 'credited' | 'cancelled' | 'redeemed';
  description?: string;
  createdAt: string; // ISO date of the transaction
  unlocksAt: string; // ISO date = createdAt + 12 days (or immediate for signup bonus)
  friendMaskedEmail?: string;
  friendName?: string;
  cancellationReason?: string;
  isNewCredit?: boolean; // Set when transitioned to credited, used to trigger animation
}

export interface UserReferralProfile {
  userId: string;
  userEmail: string;
  referralCode?: string; // One-time creation, cannot be edited once set!
  referralCodeCreatedAt?: string;
  referredByCode?: string; // Referral code of the user who referred this customer
  referredAt?: string;
  availableFeathers: number; // Ready to spend (1 feather = 50 paisa = ₹0.50)
  pendingFeathers: number; // Locked in 12-day return window
  lifetimeEarnedFeathers: number;
  totalRedeemedFeathers: number;
  transactions: MagicFeatherTransaction[];
}

