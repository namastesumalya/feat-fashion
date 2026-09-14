import { Product, PromoCode, AutomatedEmail, Order, BannerSlide, LiveSaleConfig, PushNotification } from '../types';

export const INITIAL_BANNERS: BannerSlide[] = [];

export const INITIAL_LIVE_SALE: LiveSaleConfig = {
  enabled: false,
  title: '⚡ Flash Sale',
  bannerText: '',
  couponCode: 'FEAT6',
  endTime: ''
};

export const INITIAL_NOTIFICATIONS: PushNotification[] = [];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_PROMOS: PromoCode[] = [
  {
    code: 'Welcome76',
    name: 'First Order Welcome Offer',
    discountType: 'flat',
    discountValue: 76,
    minOrderValue: 0,
    description: 'Flat ₹76 off on your first order',
    reasonForSale: 'Welcome gift exclusively for first-time shoppers!',
    active: true,
    isFirstOrderOnly: true
  },
  {
    code: 'FEAT6',
    name: 'Order Savings (> ₹1,300)',
    discountType: 'flat',
    discountValue: 60,
    minOrderValue: 1300,
    description: 'FEAT6 - ₹60 off on purchase over ₹1,300',
    reasonForSale: 'Flat ₹60 off on purchase over ₹1,300',
    active: true
  },
  {
    code: 'INDIANA',
    name: 'Suit & Indo-Western Special',
    discountType: 'percent',
    discountValue: 2,
    minOrderValue: 0,
    description: 'Additional 2% Off on Suit Sets & Indo-Western sets',
    reasonForSale: 'Special discount on exquisite Suit Sets and Indo-Western sets',
    categoriesRestricted: ['Suit', 'Indo Western dress'],
    active: true
  },
  {
    code: 'GORBO',
    name: 'Royal Heritage Sarees',
    discountType: 'percent',
    discountValue: 5,
    minOrderValue: 0,
    description: 'Additional 5% discount on Sarees (excluding Firdausi collection)',
    reasonForSale: 'Exclusive 5% off on our authentic handcrafted sarees (excluding Firdausi collection)',
    categoriesRestricted: ['Sharee'],
    active: true
  },
  {
    code: 'BEAUTIFULYOU',
    name: 'Dress Materials Delight',
    discountType: 'percent',
    discountValue: 4,
    minOrderValue: 0,
    description: 'Additional 4% discount on Dress Materials',
    reasonForSale: 'Special 4% off on unstitched cotton & silk dress materials',
    categoriesRestricted: ['Dress Materials'],
    active: true
  },
  {
    code: 'BHUSWARG',
    name: 'Firdausi Collection Special',
    discountType: 'percent',
    discountValue: 6,
    minOrderValue: 0,
    description: 'Additional 6% discount on Firdausi collection',
    reasonForSale: 'Celebratory 6% discount on the heavenly Firdausi Collection',
    collectionRestricted: 'Firdausi collection',
    active: true
  },
  {
    code: 'FEAT2.0',
    name: 'Grand Celebration Offer (> ₹2,000)',
    discountType: 'flat',
    discountValue: 200,
    minOrderValue: 2000,
    description: 'FEAT2.0 - ₹200 off on purchase over ₹2,000',
    reasonForSale: 'Flat ₹200 off on purchase over ₹2,000',
    active: true
  }
];

export const INITIAL_EMAIL_CAMPAIGNS: AutomatedEmail[] = [];

export const INITIAL_ORDERS: Order[] = [];
