import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Shield, Plus, Trash2, Package, Mail, TrendingUp, AlertTriangle, Send, 
  RefreshCw, CheckCircle, Bell, Lock, User, LogIn, LogOut, Calendar, Tag, 
  Zap, ArrowRight, ShieldCheck, Filter, Search, Copy, Layers, Eye, Megaphone, LayoutTemplate,
  Image, ImageIcon, ImagePlus, ArrowUp, ArrowDown, Star, Palette, ExternalLink, Link as LinkIcon,
  Gift, Clock, Edit, MessageSquare, AlertCircle, ArrowLeft, Home, Upload, UploadCloud, Loader2, Check, Sliders, ChevronDown, Sparkles, Truck,
  FileText, Printer, Download, Settings
} from 'lucide-react';
import { Product, Order, AutomatedEmail, CategoryType, CollectionType, PromoCode, LiveSaleConfig, BannerSlide, ColorVariant, AVAILABLE_STANDARD_SIZES } from '../types';
import { SaleAnnouncementModal } from './SaleAnnouncementModal';
import { SizeInventoryManager } from './SizeInventoryManager';
import { MarkdownEditor } from './MarkdownEditor';
import { generateTaxInvoiceHTML, downloadTaxInvoiceFile, printTaxInvoice, downloadTaxInvoice } from '../utils/invoiceGenerator';
import { generateShippingBillHTML, downloadShippingBillFile, printShippingBill, downloadShippingBill } from '../utils/shippingBillGenerator';
import { fetchShiprocketThermalLabel, fetchShiprocketInvoice, openShiprocketThermalLabelPrint } from '../utils/shiprocketLabelService';
import { getCategoryFallbackImage } from '../utils/productImage';
import { deduplicateProducts } from '../utils/productUtils';
import { 
  adminAuth, 
  signInAdminWithEmail, 
  signOutAdmin, 
  onAdminAuthStateChanged,
  AdminFirebaseUser,
  uploadAdminFile,
  MAX_UPLOAD_FILE_SIZE_BYTES,
  saveOrderToFirestore
} from '../firebaseAdmin';

const checkFileSizeLimit = (file: File): boolean => {
  if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    alert(`⚠️ File Size Exceeded:\n\n"${file.name}" is ${sizeMb} MB.\n\nMaximum allowable size is 1 MB per image. Please compress or resize this photo before uploading to guarantee instant page loads across all customer devices.`);
    return false;
  }
  return true;
};

const SALE_REASON_PRESETS = [
  'Grand Festive & Diwali Celebration Launch',
  'Celebrating 5th Brand Anniversary with Royal Patrons',
  'Exclusive Weekend Flash Clearance & Super Savings',
  'Wedding & Bridal Trousseau Season Special',
  'Independence Day Heritage Handloom Tribute',
  'First Order Welcome Privilege Gift for New Shoppers',
  'Monsoon Special Ethnic Wardrobe Refresh'
];

interface AdminPortalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onBackToHome?: () => void;
  products: Product[];
  orders: Order[];
  emails: AutomatedEmail[];
  promos: PromoCode[];
  banners?: BannerSlide[];
  liveSaleConfig?: LiveSaleConfig;
  onAddProduct: (prodData: Partial<Product>) => Promise<void>;
  onUpdateProduct?: (productId: string, data: Partial<Product>) => Promise<void>;
  onUpdateStock: (productId: string, stock: number) => Promise<void>;
  onDeleteProduct: (productId: string, sku?: string) => Promise<void>;
  onAddBanner?: (banner: Partial<BannerSlide>) => Promise<void>;
  onUpdateBanner?: (id: string, banner: Partial<BannerSlide>) => Promise<void>;
  onDeleteBanner?: (id: string) => Promise<void>;
  onUpdateOrderStatus: (orderId: string, status: Order['orderStatus']) => Promise<void>;
  onSendEmailCampaign: (campaign: { recipientGroup: string; subject: string; body: string; type: string }) => Promise<void>;
  onSavePromo?: (promo: PromoCode) => Promise<void>;
  onDeletePromo?: (code: string) => Promise<void>;
  onUpdateLiveSale?: (config: Partial<LiveSaleConfig>) => Promise<void>;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  isOpen = true,
  onClose,
  onBackToHome,
  products,
  orders,
  emails,
  promos,
  banners = [],
  liveSaleConfig,
  onAddProduct,
  onUpdateProduct,
  onUpdateStock,
  onDeleteProduct,
  onAddBanner,
  onUpdateBanner,
  onDeleteBanner,
  onUpdateOrderStatus,
  onSendEmailCampaign,
  onSavePromo,
  onDeletePromo,
  onUpdateLiveSale
}) => {
  // Admin Auth State
  const [adminUser, setAdminUser] = useState<AdminFirebaseUser | { email: string; displayName?: string; uid?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [submittingAuth, setSubmittingAuth] = useState(false);

  // Active Tab in Admin Dashboard
  const [activeTab, setActiveTab] = useState<'inventory' | 'add_product' | 'banners' | 'coupons' | 'flash_sale' | 'orders' | 'marketing' | 'analytics'>('inventory');

  // Search & Filters in Inventory
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('All');

  // Search, Filters & Sorting in Orders Tab
  const [orderSearchInput, setOrderSearchInput] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');
  const [orderSortBy, setOrderSortBy] = useState<'newest' | 'oldest' | 'amount_high' | 'amount_low'>('newest');
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Invoice & Shipping Bill Viewer Modal & Instant Generator State
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<Order | null>(null);
  const [shippingBillModalOrder, setShippingBillModalOrder] = useState<Order | null>(null);
  const [quickInvoiceOrderId, setQuickInvoiceOrderId] = useState('');
  const [quickInvoiceError, setQuickInvoiceError] = useState<string | null>(null);
  const [quickInvoiceLoading, setQuickInvoiceLoading] = useState(false);
  const [generatingLabelOrderId, setGeneratingLabelOrderId] = useState<string | null>(null);
  const [generatingInvoiceOrderId, setGeneratingInvoiceOrderId] = useState<string | null>(null);

  // Product Editing Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProductSaving, setEditProductSaving] = useState(false);
  const [isPublishingProduct, setIsPublishingProduct] = useState(false);

  // Product Delete Confirmation Popup Modal State
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string; sku?: string } | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  // Banner State & Form
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState<Partial<BannerSlide>>({
    tag: 'NEW ARRIVAL SPOTLIGHT',
    title: '',
    description: '',
    image: '',
    ctaText: 'Shop Now',
    ctaLink: '',
    targetCollection: 'All',
    targetCategory: 'All'
  });
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  // File Upload & Progress States for featdb-admin Firebase Storage
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerProgress, setBannerProgress] = useState(0);

  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [galleryProgress, setGalleryProgress] = useState(0);
  const [uploadingVariantIdx, setUploadingVariantIdx] = useState<number | null>(null);
  const [variantProgress, setVariantProgress] = useState(0);

  const [uploadingEditGallery, setUploadingEditGallery] = useState(false);
  const [editGalleryProgress, setEditGalleryProgress] = useState(0);
  const [uploadingEditVariantIdx, setUploadingEditVariantIdx] = useState<number | null>(null);
  const [editVariantProgress, setEditVariantProgress] = useState(0);

  // Add Product Form State
  const [newProd, setNewProd] = useState<{
    name: string;
    sku: string;
    category: CategoryType;
    collection: CollectionType;
    price: number;
    originalPrice: number;
    stockCount: number;
    fabric: string;
    length: string;
    primaryColorName: string;
    description: string;
    careInstructions: string;
    sizes: string[];
    sizeStock: Record<string, number>;
    colors: string[];
    colorVariants: ColorVariant[];
    images: string[];
  }>({
    name: '',
    sku: '',
    category: 'Kurti',
    collection: 'Firdausi collection',
    price: 1999,
    originalPrice: 3999,
    stockCount: 12,
    fabric: 'Pure Chanderi Silk',
    length: '',
    primaryColorName: '',
    description: 'Designer festive wear piece with exquisite hand-embroidered zari highlights.',
    careInstructions: '',
    sizes: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    sizeStock: {
      'S': 2,
      'M': 2,
      'L': 2,
      'XL': 2,
      'XXL': 2,
      'XXXL': 2,
      'Free Size': 0
    },
    colors: [],
    colorVariants: [],
    images: []
  });
  const [customImageUrl, setCustomImageUrl] = useState('');

  // Coupon Form & Edit State
  const [newPromo, setNewPromo] = useState<PromoCode>({
    name: 'Grand Festive Celebration Offer',
    code: '',
    discountType: 'percent',
    discountValue: 20,
    minOrderValue: 999,
    description: 'Special seasonal promotional discount across ethnic wear.',
    reasonForSale: 'Celebrating the Joy of Festive Season & Royal Indian Craftsmanship with our patrons worldwide!',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    showPopupAnnouncement: true,
    popupTitle: '🌸 Grand Festive Celebration Sale & Special Coupon!',
    popupBadge: 'GRAND FESTIVE SPECIAL',
    popupMessage: 'We are celebrating our grand festive ethnic launch! Use this exclusive gift code to enjoy instant savings on all handcrafted items.',
    active: true
  });
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [previewPromoModal, setPreviewPromoModal] = useState<PromoCode | null>(null);
  const [deleteConfirmPromo, setDeleteConfirmPromo] = useState<PromoCode | null>(null);
  const [deleteConfirmBanner, setDeleteConfirmBanner] = useState<BannerSlide | null>(null);
  const [isDeletingBanner, setIsDeletingBanner] = useState(false);
  const [couponSaving, setCouponSaving] = useState(false);

  // Live Flash Sale State
  const [saleTitle, setSaleTitle] = useState(liveSaleConfig?.title || '⚡ FESTIVE FLASH SALE: Flat % OFF!');
  const [saleDiscount, setSaleDiscount] = useState(liveSaleConfig?.discountPercent || 20);
  const [saleTarget, setSaleTarget] = useState<'all' | 'specific_items' | 'category'>(liveSaleConfig?.targetType || 'all');
  const [saleActive, setSaleActive] = useState(liveSaleConfig?.active || false);
  const [saleSaving, setSaleSaving] = useState(false);

  // Email Campaign Form State
  const [campaignData, setCampaignData] = useState({
    recipientGroup: 'All Customers',
    subject: '🌸 Exclusive Pink & Golden Festive Offer at Feat!',
    body: 'Explore our latest hand-woven zari sarees & designer kurtis with flat 20% OFF using coupon FEAT20.',
    type: 'Festive Sale'
  });
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [productToast, setProductToast] = useState<string | null>(null);

  // Persistent Media Management & Cloud Hydration State
  const [mediaStatus, setMediaStatus] = useState<{
    memoryCachedCount: number;
    diskCachedCount: number;
    persistentVolumeActive: boolean;
    persistentVolumePath?: string | null;
    cloudinaryConfigured: boolean;
    lastHydrationTime: string | null;
    isHydrating: boolean;
  } | null>(null);
  const [isRehydratingMedia, setIsRehydratingMedia] = useState(false);
  const [mediaRehydrateMsg, setMediaRehydrateMsg] = useState<string | null>(null);

  const fetchMediaStatus = useCallback(async () => {
    try {
      const adminToken = localStorage.getItem('feat_admin_token') || sessionStorage.getItem('feat_admin_token');
      const res = await fetch('/api/admin/media/status', {
        headers: adminToken ? { 'x-admin-token': adminToken } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setMediaStatus(data);
      }
    } catch (_) {}
  }, []);

  const handleRehydrateMedia = async () => {
    setIsRehydratingMedia(true);
    setMediaRehydrateMsg(null);
    try {
      const adminToken = localStorage.getItem('feat_admin_token') || sessionStorage.getItem('feat_admin_token');
      const res = await fetch('/api/admin/media/rehydrate', {
        method: 'POST',
        headers: adminToken ? { 'x-admin-token': adminToken } : {}
      });
      const data = await res.json();
      if (data.success) {
        setMediaRehydrateMsg(`✅ Synced ${data.synced} images from Firestore! Total cached: ${data.total}`);
        fetchMediaStatus();
      } else {
        setMediaRehydrateMsg('⚠️ Sync completed with notice.');
      }
    } catch (e: any) {
      setMediaRehydrateMsg(`❌ Rehydrate error: ${e.message}`);
    } finally {
      setIsRehydratingMedia(false);
      setTimeout(() => setMediaRehydrateMsg(null), 8000);
    }
  };

  // Shiprocket Diagnostics & Credential Management State
  const [shiprocketTestStatus, setShiprocketTestStatus] = useState<{
    configured?: boolean;
    authenticated?: boolean;
    hasOrderPermission?: boolean;
    orderPermissionError?: string;
    pickupLocations?: string[];
    configuredLocation?: string;
    statusMessage?: string;
    message?: string;
    isBlocked?: boolean;
    cooldownRemainingSec?: number;
    channel?: {
      id: number;
      name: string;
      store_name?: string;
    };
    channels?: Array<{
      id: number;
      name: string;
      store_name?: string;
      status?: string;
      orders_synced_on?: string;
      inventory_synced_on?: string;
    }>;
    currentConfig?: {
      hasToken?: boolean;
      tokenExpiry?: string;
      expiresInHours?: number;
      tokenAccount?: string;
      email?: string;
      pickupLocation?: string;
      channelId?: number | string;
      autoRenewEnabled?: boolean;
      authMode?: string;
    };
  } | null>(null);
  const [testingShiprocket, setTestingShiprocket] = useState(false);
  const [showShiprocketModal, setShowShiprocketModal] = useState(false);
  const [shiprocketForm, setShiprocketForm] = useState({
    token: '',
    email: '',
    password: '',
    pickupLocation: 'Primary',
    channelId: ''
  });
  const [savingShiprocketCreds, setSavingShiprocketCreds] = useState(false);
  const [shiprocketCredsFeedback, setShiprocketCredsFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [dispatchingOrderId, setDispatchingOrderId] = useState<string | null>(null);
  const [schedulingPickupOrderId, setSchedulingPickupOrderId] = useState<string | null>(null);
  const [orderActionFeedback, setOrderActionFeedback] = useState<{ [orderId: string]: { success: boolean; message: string } }>({});

  const fetchShiprocketHealth = async (force = false) => {
    setTestingShiprocket(true);
    try {
      const res = await fetch(`/api/shiprocket/test${force ? '?force=true' : ''}`);
      const data = await res.json();
      setShiprocketTestStatus(data);
      if (data.configuredLocation) {
        setShiprocketForm(prev => ({ ...prev, pickupLocation: data.configuredLocation }));
      }
      if (data.currentConfig) {
        setShiprocketForm(prev => ({
          ...prev,
          email: prev.email || data.currentConfig.email || '',
          pickupLocation: prev.pickupLocation || data.currentConfig.pickupLocation || 'Primary',
          channelId: prev.channelId || String(data.currentConfig.channelId || data.channel?.id || '')
        }));
      } else if (data.channel?.id) {
        setShiprocketForm(prev => ({
          ...prev,
          channelId: prev.channelId || String(data.channel.id)
        }));
      }
    } catch (err: any) {
      setShiprocketTestStatus({
        configured: false,
        authenticated: false,
        message: 'Could not connect to Shiprocket test endpoint: ' + err.message
      });
    } finally {
      setTestingShiprocket(false);
    }
  };

  const handleResetShiprocketCooldown = async () => {
    setTestingShiprocket(true);
    try {
      await fetch('/api/shiprocket/reset-cooldown', { method: 'POST' });
      await fetchShiprocketHealth(true);
    } catch (err: any) {
      console.error(err);
    } finally {
      setTestingShiprocket(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchShiprocketHealth(false);
    }
    if (activeTab === 'inventory') {
      fetchMediaStatus();
    }
  }, [activeTab, fetchMediaStatus]);

  const handleSaveShiprocketCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingShiprocketCreds(true);
    setShiprocketCredsFeedback(null);
    try {
      const res = await fetch('/api/shiprocket/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shiprocketForm)
      });
      const data = await res.json();
      if (data.authenticated || data.success) {
        if (data.hasOrderPermission === false) {
          setShiprocketCredsFeedback({
            success: false,
            message: data.message || 'Authenticated with Shiprocket, but Order Creation permission is missing (HTTP 403). In Shiprocket Dashboard > Settings > API > Configure, ensure your API User has the "Orders (create, update)" module enabled.'
          });
          fetchShiprocketHealth(true);
        } else {
          setShiprocketCredsFeedback({
            success: true,
            message: data.message || 'Successfully authenticated with Shiprocket API v2 with full Order permissions!'
          });
          fetchShiprocketHealth(true);
          setTimeout(() => {
            setShowShiprocketModal(false);
            setShiprocketCredsFeedback(null);
          }, 2500);
        }
      } else {
        setShiprocketCredsFeedback({
          success: false,
          message: data.error || 'Authentication failed. Please verify credentials or direct API token.'
        });
      }
    } catch (err: any) {
      setShiprocketCredsFeedback({
        success: false,
        message: err.message || 'Network error saving credentials'
      });
    } finally {
      setSavingShiprocketCreds(false);
    }
  };

  const handleDispatchOrderToShiprocket = async (orderId: string) => {
    setDispatchingOrderId(orderId);
    const target = orders.find(o => o.id === orderId);
    try {
      const adminToken = localStorage.getItem('feat_admin_token') || sessionStorage.getItem('feat_admin_token');
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/dispatch-shiprocket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { 'x-admin-token': adminToken } : {})
        },
        body: JSON.stringify({ order: target })
      });
      const rawText = await res.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        const titleMatch = rawText.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : '';
        throw new Error(title || `Server returned HTML error (${res.status}) instead of JSON`);
      }

      if (data.success) {
        setOrderActionFeedback(prev => ({
          ...prev,
          [orderId]: { success: true, message: data.message || 'Shipment created & courier scheduled!' }
        }));
        // Update local order object if returned
        if (data.order) {
          if (target) {
            Object.assign(target, data.order);
            if (!data.order.shiprocketSyncError) {
              delete target.shiprocketSyncError;
            }
          }
          await saveOrderToFirestore(data.order).catch(e => console.warn('Firestore update note:', e));
        }
      } else {
        setOrderActionFeedback(prev => ({
          ...prev,
          [orderId]: { success: false, message: data.error || data.message || 'Dispatch failed' }
        }));
      }
    } catch (err: any) {
      setOrderActionFeedback(prev => ({
        ...prev,
        [orderId]: { success: false, message: err.message || 'Dispatch request failed' }
      }));
    } finally {
      setDispatchingOrderId(null);
    }
  };

  const handleScheduleOrderPickup = async (orderId: string) => {
    setSchedulingPickupOrderId(orderId);
    const target = orders.find(o => o.id === orderId);
    try {
      const adminToken = localStorage.getItem('feat_admin_token') || sessionStorage.getItem('feat_admin_token');
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/schedule-pickup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { 'x-admin-token': adminToken } : {})
        },
        body: JSON.stringify({ order: target })
      });
      const rawText = await res.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        const titleMatch = rawText.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : '';
        throw new Error(title || `Server returned HTML error (${res.status}) instead of JSON`);
      }

      if (data.success) {
        setOrderActionFeedback(prev => ({
          ...prev,
          [orderId]: { success: true, message: data.message || 'Courier pickup scheduled!' }
        }));
        if (data.order) {
          if (target) {
            Object.assign(target, data.order);
            if (!data.order.shiprocketSyncError) {
              delete target.shiprocketSyncError;
            }
          }
          await saveOrderToFirestore(data.order).catch(e => console.warn('Firestore update note:', e));
        }
      } else {
        setOrderActionFeedback(prev => ({
          ...prev,
          [orderId]: { success: false, message: data.error || 'Courier pickup scheduling rejected' }
        }));
      }
    } catch (err: any) {
      setOrderActionFeedback(prev => ({
        ...prev,
        [orderId]: { success: false, message: err.message || 'Pickup scheduling error' }
      }));
    } finally {
      setSchedulingPickupOrderId(null);
    }
  };

  // Banner Handlers
  const handleSaveBannerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerError(null);
    setBannerSuccess(null);

    if (!bannerForm.title || !bannerForm.title.trim()) {
      setBannerError('Please enter a headline title for the hero banner.');
      return;
    }

    if (!bannerForm.image || !bannerForm.image.trim()) {
      setBannerError('Please upload an image from your device for the hero banner.');
      return;
    }

    setBannerSaving(true);
    try {
      if (editingBannerId && onUpdateBanner) {
        await onUpdateBanner(editingBannerId, {
          ...bannerForm,
          tag: bannerForm.tag || 'NEW ARRIVAL SPOTLIGHT',
          ctaText: bannerForm.ctaText || 'Shop Now',
          ctaLink: bannerForm.ctaLink || '',
          targetCollection: bannerForm.targetCollection || 'All',
          targetCategory: bannerForm.targetCategory || 'All'
        });
        setBannerSuccess('Hero banner updated and published live to website!');
      } else if (onAddBanner) {
        await onAddBanner({
          ...bannerForm,
          tag: bannerForm.tag || 'NEW ARRIVAL SPOTLIGHT',
          ctaText: bannerForm.ctaText || 'Shop Now',
          ctaLink: bannerForm.ctaLink || '',
          targetCollection: bannerForm.targetCollection || 'All',
          targetCategory: bannerForm.targetCategory || 'All'
        });
        setBannerSuccess('New hero banner added and published live to website!');
      }
      setBannerForm({
        tag: 'NEW ARRIVAL SPOTLIGHT',
        title: '',
        description: '',
        image: '',
        ctaText: 'Shop Now',
        ctaLink: '',
        targetCollection: 'All',
        targetCategory: 'All'
      });
      setEditingBannerId(null);
      setTimeout(() => setBannerSuccess(null), 4000);
    } catch (err) {
      console.error('Failed to save banner:', err);
      setBannerError('Failed to publish hero banner. Please check connection and try again.');
    } finally {
      setBannerSaving(false);
    }
  };

  // Upload Handlers for featdb-admin Firebase Storage
  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBannerError(null);
    setBannerSuccess(null);

    // Strict 1 MB limit (1,048,576 bytes) for hero banner section
    const MAX_BANNER_SIZE = 1 * 1024 * 1024;
    if (file.size > MAX_BANNER_SIZE) {
      const sizeMb = (file.size / MAX_BANNER_SIZE).toFixed(2);
      const errMsg = `⚠️ File Size Restricted: "${file.name}" is ${sizeMb} MB. Maximum allowable upload size for hero banners is 1 MB. Please compress or resize your image to under 1 MB.`;
      setBannerError(errMsg);
      alert(`⚠️ File Size Exceeded:\n\n"${file.name}" is ${sizeMb} MB.\n\nMaximum allowable size is 1 MB for hero banners. Please compress or resize your photo to under 1 MB before uploading.`);
      e.target.value = '';
      return;
    }

    setUploadingBanner(true);
    setBannerProgress(10);
    try {
      const downloadUrl = await uploadAdminFile(file, 'banners', (p) => setBannerProgress(p));
      setBannerForm(prev => ({ ...prev, image: downloadUrl }));
      setBannerSuccess(`Hero banner image "${file.name}" (${(file.size / 1024).toFixed(0)} KB) uploaded successfully!`);
    } catch (err: any) {
      console.error('Failed to upload banner to Firebase Storage:', err);
      const errorMsg = err.message || 'Failed to upload banner image.';
      setBannerError(errorMsg);
      alert(errorMsg);
    } finally {
      setUploadingBanner(false);
      setBannerProgress(0);
      e.target.value = '';
    }
  };

  const handleGalleryFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter(f => checkFileSizeLimit(f));
    if (validFiles.length === 0) {
      e.target.value = '';
      return;
    }
    setUploadingGallery(true);
    setGalleryProgress(10);
    try {
      const uploadedUrls: string[] = [];
      const total = validFiles.length;
      for (let i = 0; i < total; i++) {
        const file = validFiles[i];
        const url = await uploadAdminFile(file, 'products', (p) => {
          const overall = Math.round(((i / total) * 100) + (p / total));
          setGalleryProgress(overall);
        });
        uploadedUrls.push(url);
      }
      setNewProd(prev => {
        const existing = (prev.images || []).filter(img => img.trim() !== '');
        return { ...prev, images: [...existing, ...uploadedUrls] };
      });
    } catch (err: any) {
      console.error('Failed to upload gallery images to Firebase Storage:', err);
      alert(err.message || 'Failed to upload gallery images.');
    } finally {
      setUploadingGallery(false);
      setGalleryProgress(0);
      e.target.value = '';
    }
  };

  const handleSingleGalleryFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!checkFileSizeLimit(file)) {
      e.target.value = '';
      return;
    }
    setUploadingGallery(true);
    setGalleryProgress(10);
    try {
      const url = await uploadAdminFile(file, 'products', (p) => setGalleryProgress(p));
      setNewProd(prev => {
        const updated = [...(prev.images || [])];
        updated[index] = url;
        return { ...prev, images: updated };
      });
    } catch (err: any) {
      console.error('Failed to replace gallery image:', err);
      alert(err.message || 'Failed to replace image.');
    } finally {
      setUploadingGallery(false);
      setGalleryProgress(0);
      e.target.value = '';
    }
  };

  // Color Variant Multi-Photo Upload Handlers for New Product
  const handleVariantMultipleFilesUpload = async (variantIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter(f => checkFileSizeLimit(f));
    if (validFiles.length === 0) {
      e.target.value = '';
      return;
    }
    setUploadingVariantIdx(variantIdx);
    setVariantProgress(10);
    try {
      const uploadedUrls: string[] = [];
      const total = validFiles.length;
      for (let i = 0; i < total; i++) {
        const file = validFiles[i];
        const url = await uploadAdminFile(file, 'variants', (p) => {
          const overall = Math.round(((i / total) * 100) + (p / total));
          setVariantProgress(overall);
        });
        uploadedUrls.push(url);
      }

      setNewProd(prev => {
        const updated = [...(prev.colorVariants || [])];
        if (updated[variantIdx]) {
          const existingImages = updated[variantIdx].images || (updated[variantIdx].imageUrl ? [updated[variantIdx].imageUrl!] : []);
          const merged = [...existingImages, ...uploadedUrls].filter(Boolean);
          updated[variantIdx] = {
            ...updated[variantIdx],
            images: merged,
            imageUrl: merged[0] || ''
          };
        }
        const updatedGallery = (prev.images && prev.images.length > 0)
          ? prev.images
          : uploadedUrls;
        return { ...prev, colorVariants: updated, images: updatedGallery };
      });
    } catch (err: any) {
      console.error('Failed to upload color variant photos:', err);
      alert(err.message || 'Failed to upload variant photos.');
    } finally {
      setUploadingVariantIdx(null);
      setVariantProgress(0);
      e.target.value = '';
    }
  };

  const handleRemoveVariantPhoto = (variantIdx: number, photoIdx: number) => {
    setNewProd(prev => {
      const updated = [...(prev.colorVariants || [])];
      if (updated[variantIdx]) {
        const existing = updated[variantIdx].images || (updated[variantIdx].imageUrl ? [updated[variantIdx].imageUrl!] : []);
        const filtered = existing.filter((_, idx) => idx !== photoIdx);
        updated[variantIdx] = {
          ...updated[variantIdx],
          images: filtered,
          imageUrl: filtered[0] || ''
        };
      }
      return { ...prev, colorVariants: updated };
    });
  };

  const handleSetPrimaryVariantPhoto = (variantIdx: number, photoIdx: number) => {
    setNewProd(prev => {
      const updated = [...(prev.colorVariants || [])];
      if (updated[variantIdx]) {
        const existing = updated[variantIdx].images || (updated[variantIdx].imageUrl ? [updated[variantIdx].imageUrl!] : []);
        if (existing[photoIdx]) {
          const selected = existing[photoIdx];
          const reordered = [selected, ...existing.filter((_, idx) => idx !== photoIdx)];
          updated[variantIdx] = {
            ...updated[variantIdx],
            images: reordered,
            imageUrl: selected
          };
        }
      }
      return { ...prev, colorVariants: updated };
    });
  };

  const handleAddVariantPhotoUrl = (variantIdx: number, url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setNewProd(prev => {
      const updated = [...(prev.colorVariants || [])];
      if (updated[variantIdx]) {
        const existing = updated[variantIdx].images || (updated[variantIdx].imageUrl ? [updated[variantIdx].imageUrl!] : []);
        const merged = [...existing, trimmed];
        updated[variantIdx] = {
          ...updated[variantIdx],
          images: merged,
          imageUrl: merged[0] || ''
        };
      }
      return { ...prev, colorVariants: updated };
    });
  };

  const handleEditGalleryFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingProduct) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter(f => checkFileSizeLimit(f));
    if (validFiles.length === 0) {
      e.target.value = '';
      return;
    }
    setUploadingEditGallery(true);
    setEditGalleryProgress(10);
    try {
      const uploadedUrls: string[] = [];
      const total = validFiles.length;
      for (let i = 0; i < total; i++) {
        const file = validFiles[i];
        const url = await uploadAdminFile(file, 'products', (p) => {
          const overall = Math.round(((i / total) * 100) + (p / total));
          setEditGalleryProgress(overall);
        });
        uploadedUrls.push(url);
      }
      setEditingProduct(prev => {
        if (!prev) return null;
        const existing = (prev.images || []).filter(img => img.trim() !== '');
        return { ...prev, images: [...existing, ...uploadedUrls] };
      });
    } catch (err: any) {
      console.error('Failed to upload edit gallery images to Firebase Storage:', err);
      alert(err.message || 'Failed to upload edit gallery images.');
    } finally {
      setUploadingEditGallery(false);
      setEditGalleryProgress(0);
      e.target.value = '';
    }
  };

  const handleSingleEditGalleryFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingProduct) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (!checkFileSizeLimit(file)) {
      e.target.value = '';
      return;
    }
    setUploadingEditGallery(true);
    setEditGalleryProgress(10);
    try {
      const url = await uploadAdminFile(file, 'products', (p) => setEditGalleryProgress(p));
      setEditingProduct(prev => {
        if (!prev) return null;
        const updated = [...(prev.images || [])];
        updated[index] = url;
        return { ...prev, images: updated };
      });
    } catch (err: any) {
      console.error('Failed to replace edit gallery image:', err);
      alert(err.message || 'Failed to replace image.');
    } finally {
      setUploadingEditGallery(false);
      setEditGalleryProgress(0);
      e.target.value = '';
    }
  };

  // Color Variant Multi-Photo Upload Handlers for Edit Product
  const handleEditVariantMultipleFilesUpload = async (variantIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingProduct) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter(f => checkFileSizeLimit(f));
    if (validFiles.length === 0) {
      e.target.value = '';
      return;
    }
    setUploadingEditVariantIdx(variantIdx);
    setEditVariantProgress(10);
    try {
      const uploadedUrls: string[] = [];
      const total = validFiles.length;
      for (let i = 0; i < total; i++) {
        const file = validFiles[i];
        const url = await uploadAdminFile(file, 'variants', (p) => {
          const overall = Math.round(((i / total) * 100) + (p / total));
          setEditVariantProgress(overall);
        });
        uploadedUrls.push(url);
      }

      setEditingProduct(prev => {
        if (!prev) return null;
        const cur = prev.colorVariants || (prev.colors || []).map(c => ({ name: c, imageUrl: '', images: [] }));
        const updated = [...cur];
        if (updated[variantIdx]) {
          const existingImages = updated[variantIdx].images || (updated[variantIdx].imageUrl ? [updated[variantIdx].imageUrl!] : []);
          const merged = [...existingImages, ...uploadedUrls].filter(Boolean);
          updated[variantIdx] = {
            ...updated[variantIdx],
            images: merged,
            imageUrl: merged[0] || ''
          };
        }
        const updatedGallery = (prev.images && prev.images.length > 0)
          ? prev.images
          : uploadedUrls;
        return { ...prev, colorVariants: updated, images: updatedGallery };
      });
    } catch (err: any) {
      console.error('Failed to upload edit variant photos:', err);
      alert(err.message || 'Failed to upload variant photos.');
    } finally {
      setUploadingEditVariantIdx(null);
      setEditVariantProgress(0);
      e.target.value = '';
    }
  };

  const handleRemoveEditVariantPhoto = (variantIdx: number, photoIdx: number) => {
    setEditingProduct(prev => {
      if (!prev) return null;
      const cur = prev.colorVariants || (prev.colors || []).map(c => ({ name: c, imageUrl: '', images: [] }));
      const updated = [...cur];
      if (updated[variantIdx]) {
        const existing = updated[variantIdx].images || (updated[variantIdx].imageUrl ? [updated[variantIdx].imageUrl!] : []);
        const filtered = existing.filter((_, idx) => idx !== photoIdx);
        updated[variantIdx] = {
          ...updated[variantIdx],
          images: filtered,
          imageUrl: filtered[0] || ''
        };
      }
      return { ...prev, colorVariants: updated };
    });
  };

  const handleSetPrimaryEditVariantPhoto = (variantIdx: number, photoIdx: number) => {
    setEditingProduct(prev => {
      if (!prev) return null;
      const cur = prev.colorVariants || (prev.colors || []).map(c => ({ name: c, imageUrl: '', images: [] }));
      const updated = [...cur];
      if (updated[variantIdx]) {
        const existing = updated[variantIdx].images || (updated[variantIdx].imageUrl ? [updated[variantIdx].imageUrl!] : []);
        if (existing[photoIdx]) {
          const selected = existing[photoIdx];
          const reordered = [selected, ...existing.filter((_, idx) => idx !== photoIdx)];
          updated[variantIdx] = {
            ...updated[variantIdx],
            images: reordered,
            imageUrl: selected
          };
        }
      }
      return { ...prev, colorVariants: updated };
    });
  };

  const handleAddEditVariantPhotoUrl = (variantIdx: number, url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setEditingProduct(prev => {
      if (!prev) return null;
      const cur = prev.colorVariants || (prev.colors || []).map(c => ({ name: c, imageUrl: '', images: [] }));
      const updated = [...cur];
      if (updated[variantIdx]) {
        const existing = updated[variantIdx].images || (updated[variantIdx].imageUrl ? [updated[variantIdx].imageUrl!] : []);
        const merged = [...existing, trimmed];
        updated[variantIdx] = {
          ...updated[variantIdx],
          images: merged,
          imageUrl: merged[0] || ''
        };
      }
      return { ...prev, colorVariants: updated };
    });
  };

  const handleEditBannerClick = (b: BannerSlide) => {
    setEditingBannerId(b.id);
    setBannerForm({
      tag: b.tag || 'NEW ARRIVAL SPOTLIGHT',
      title: b.title || '',
      description: b.description || '',
      image: b.image || '',
      ctaText: b.ctaText || 'Shop Now',
      ctaLink: b.ctaLink || '',
      targetCollection: b.targetCollection || 'All',
      targetCategory: b.targetCategory || 'All'
    });
    setBannerError(null);
    setBannerSuccess(null);

    // Scroll smoothly to the hero banner editor form so the admin sees the active edit view
    setTimeout(() => {
      const formEl = document.getElementById('hero-banner-editor-form');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
  };

  // Open Product Edit Modal with Initialized Variants & Stock
  const handleOpenEditProduct = (p: Product) => {
    const defaultSizes = (p.sizes && p.sizes.length > 0) ? p.sizes : ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    const defaultStock = p.sizeStock || {};

    let preparedVariants: ColorVariant[] = [];
    if (p.colorVariants && p.colorVariants.length > 0) {
      preparedVariants = p.colorVariants.map(v => {
        const vSizes = (v.sizes && v.sizes.length > 0) ? v.sizes : [...defaultSizes];
        const vStock = v.sizeStock ? { ...v.sizeStock } : { ...defaultStock };
        return {
          ...v,
          sizes: vSizes,
          sizeStock: vStock,
          stockCount: v.stockCount !== undefined ? v.stockCount : vSizes.reduce((sum, sz) => sum + (Number(vStock[sz]) || 0), 0)
        };
      });
    } else if (p.colors && p.colors.length > 0) {
      preparedVariants = p.colors.map((c, idx) => ({
        name: c,
        imageUrl: p.images?.[idx] || p.images?.[0] || '',
        images: [p.images?.[idx] || p.images?.[0] || ''].filter(Boolean),
        sizes: [...defaultSizes],
        sizeStock: { ...defaultStock },
        stockCount: defaultSizes.reduce((sum, sz) => sum + (Number(defaultStock[sz]) || 0), 0)
      }));
    }

    setEditingProduct({
      ...p,
      sku: p.sku || p.id,
      colorVariants: preparedVariants
    });
  };

  // Product Full Edit Handler
  const handleSaveEditedProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !onUpdateProduct) return;
    setEditProductSaving(true);
    try {
      const validImages = (editingProduct.images || []).map(img => img.trim()).filter(Boolean).filter(img => !img.includes('1610030469983'));
      const variantPhotos = (editingProduct.colorVariants || []).flatMap(v => v.images || (v.imageUrl ? [v.imageUrl] : [])).map(img => img.trim()).filter(Boolean).filter(img => !img.includes('1610030469983'));
      const defaultImg = getCategoryFallbackImage(editingProduct.category, editingProduct.collection, editingProduct.name);
      const finalImages = validImages.length > 0
        ? validImages
        : (variantPhotos.length > 0 ? variantPhotos : (defaultImg ? [defaultImg] : []));

      const originalPrice = Number(editingProduct.originalPrice) || Number(editingProduct.price) || 1999;
      const price = Number(editingProduct.price) || 1999;
      const discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);

      const sizes = editingProduct.sizes !== undefined ? editingProduct.sizes : ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
      const sizeStock = editingProduct.sizeStock || {};
      const calculatedTotalStock = sizes.reduce((sum, sz) => sum + (Number(sizeStock[sz]) || 0), 0);

      const trimmedPrimaryColor = (editingProduct.primaryColorName && editingProduct.primaryColorName.trim())
        ? editingProduct.primaryColorName.trim()
        : undefined;

      const rawVariants = (editingProduct.colorVariants && editingProduct.colorVariants.length > 0)
        ? editingProduct.colorVariants.filter(v => v.name && v.name.trim() !== '').map((v, idx) => {
            const rawImages = (v.images || (v.imageUrl ? [v.imageUrl] : [])).map(img => img.trim()).filter(Boolean);
            const primaryImg = rawImages[0] || v.imageUrl || finalImages[idx] || finalImages[0] || defaultImg;
            const vSizes = (v.sizes && v.sizes.length > 0) ? v.sizes : [...sizes];
            const vStock = v.sizeStock || {};
            const vUnits = vSizes.reduce((sum, sz) => sum + (Number(vStock[sz]) || 0), 0);
            return {
              name: v.name.trim(),
              imageUrl: primaryImg,
              images: rawImages.length > 0 ? rawImages : [primaryImg],
              sizes: vSizes,
              sizeStock: vStock,
              stockCount: vUnits
            };
          })
        : (editingProduct.colors || []).filter(c => c && c.trim() !== '').map((c, idx) => ({
            name: c,
            imageUrl: finalImages[idx] || finalImages[0] || defaultImg,
            images: [finalImages[idx] || finalImages[0] || defaultImg].filter(Boolean),
            sizes: [...sizes],
            sizeStock: { ...sizeStock },
            stockCount: calculatedTotalStock
          }));

      let colorVariants: ColorVariant[] = [];
      if (trimmedPrimaryColor) {
        const primaryVariant: ColorVariant = {
          name: trimmedPrimaryColor,
          imageUrl: finalImages[0] || defaultImg,
          images: finalImages,
          sizes: [...sizes],
          sizeStock: { ...sizeStock },
          stockCount: calculatedTotalStock
        };
        const otherVariants = rawVariants.filter(v => v.name.toLowerCase() !== trimmedPrimaryColor.toLowerCase());
        colorVariants = [primaryVariant, ...otherVariants];
      } else {
        colorVariants = rawVariants;
      }
      
      const colors = colorVariants.map(v => v.name).filter(Boolean);
      const totalVariantsUnits = colorVariants.reduce((sum, v) => sum + (v.stockCount || 0), 0);
      const finalStockCount = Math.max(calculatedTotalStock, totalVariantsUnits);

      const trimmedSku = (editingProduct.sku && editingProduct.sku.trim())
        ? editingProduct.sku.trim()
        : (editingProduct.id || '');

      const trimmedLength = (editingProduct.length && editingProduct.length.trim())
        ? editingProduct.length.trim()
        : undefined;

      await onUpdateProduct(editingProduct.id, {
        ...editingProduct,
        sku: trimmedSku,
        primaryColorName: trimmedPrimaryColor,
        length: trimmedLength,
        images: finalImages,
        price,
        originalPrice,
        colors: colors,
        colorVariants,
        sizes,
        sizeStock,
        stockCount: finalStockCount,
        discountPercent: Math.max(0, discountPercent)
      });
      setEditingProduct(null);
    } catch (err) {
      console.error('Failed to update product:', err);
    } finally {
      setEditProductSaving(false);
    }
  };

  // Handle Confirmed Product Deletion
  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete || isDeletingProduct) return;
    setIsDeletingProduct(true);
    try {
      const deletedName = productToDelete.name;
      const deletedSku = productToDelete.sku || productToDelete.id;
      await onDeleteProduct(productToDelete.id, productToDelete.sku);
      if (editingProduct?.id === productToDelete.id) {
        setEditingProduct(null);
      }
      setProductToDelete(null);
      setProductToast(`🗑️ "${deletedName}" (${deletedSku}) has been permanently deleted.`);
      setTimeout(() => {
        setProductToast(null);
      }, 5000);
    } catch (err) {
      console.error('Failed to delete product item:', err);
    } finally {
      setIsDeletingProduct(false);
    }
  };

  // Listen to Admin Auth state and restore persistent admin session
  useEffect(() => {
    try {
      const storedSession = sessionStorage.getItem('feather_admin_session');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        if (parsed && (parsed.user || parsed.email)) {
          setAdminUser(parsed.user || parsed);
          setAuthLoading(false);
          // Ensure client-side Firebase Auth is authenticated
          signInAdminWithEmail(adminAuth, 'admin@featherhutfashion.com', 'Feather@123').catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Failed to parse admin session:', e);
    }

    const unsubscribe = onAdminAuthStateChanged(adminAuth, (user) => {
      if (user) {
        setAdminUser(user);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isOpen === false) return null;

  // Handle Admin Credentials Login via Server API & Resilient Client-Side Fallback for Netlify / Static Hosting
  const handleAdminAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setSubmittingAuth(true);

    const inputUser = email.trim().toLowerCase();
    const inputPass = password.trim();

    // 1. Try server API endpoint first if available (Express backend)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: inputUser,
          password: inputPass,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data.success && data.user) {
          setAdminUser(data.user);
          // Also establish Firebase Auth session for featdb-admin
          signInAdminWithEmail(adminAuth, 'admin@featherhutfashion.com', 'Feather@123').catch(() => {});
          try {
            sessionStorage.setItem('feather_admin_session', JSON.stringify({
              token: data.token,
              user: data.user,
            }));
          } catch (err) {
            console.warn('Could not persist admin session to sessionStorage:', err);
          }
          setAuthSuccess('Admin authenticated successfully! Loading dashboard...');
          setSubmittingAuth(false);
          return;
        } else if (data && data.error) {
          // Explicit error from backend (e.g. invalid credentials, missing env, or rate limit lockout)
          setAuthError(data.error);
          setSubmittingAuth(false);
          return;
        }
      }
    } catch (err) {
      // Backend not running (e.g. Netlify / Vercel static hosting) - proceed to static/client fallback
    }

    // 2. Client-Side Authentication Fallback if running on static CDN without backend server
    const configuredUser = (
      (import.meta as any).env?.VITE_ADMIN_USERNAME || 'admin@featherhutfashion.com'
    ).trim().toLowerCase();

    const configuredPass = (
      (import.meta as any).env?.VITE_ADMIN_PASSWORD || 'Feather@123'
    ).trim();

    const isUserMatch = configuredUser ? (
      inputUser === configuredUser ||
      inputUser === `${configuredUser}.com` ||
      inputUser.replace('.com', '') === configuredUser.replace('.com', '')
    ) : false;

    const isPassMatch = configuredPass ? inputPass === configuredPass : false;

    if (isUserMatch && isPassMatch) {
      const dummyToken = btoa(`${inputUser}:${Date.now()}`);
      const adminSessionUser = {
        uid: 'admin_featherhutfashion',
        email: inputUser.includes('@') ? inputUser : `${inputUser}@featherhutfashion.com`,
        displayName: 'Featherhut Merchant Admin'
      };
      setAdminUser(adminSessionUser);
      try {
        sessionStorage.setItem('feather_admin_session', JSON.stringify({
          token: dummyToken,
          user: adminSessionUser,
        }));
      } catch (err) {
        console.warn('Could not persist admin session to sessionStorage:', err);
      }
      setAuthSuccess('Admin authenticated successfully! Loading dashboard...');
      setSubmittingAuth(false);
      return;
    }

    // 3. Firebase Auth Fallback (if admin user is registered in Firebase featdb-admin)
    try {
      const fbUserCred = await signInAdminWithEmail(adminAuth, inputUser, inputPass);
      if (fbUserCred && fbUserCred.user) {
        setAdminUser(fbUserCred.user);
        try {
          sessionStorage.setItem('feather_admin_session', JSON.stringify({
            token: await fbUserCred.user.getIdToken(),
            user: fbUserCred.user,
          }));
        } catch (err) {}
        setAuthSuccess('Admin authenticated successfully! Loading dashboard...');
        setSubmittingAuth(false);
        return;
      }
    } catch (fbErr: any) {
      // Firebase auth failed
    }

    setAuthError('Invalid Admin ID or Password. Please check your credentials and try again.');
    setSubmittingAuth(false);
  };

  // Handle Admin Sign Out
  const handleAdminSignOut = async () => {
    try {
      sessionStorage.removeItem('feather_admin_session');
    } catch (e) {
      console.warn('Failed to clear admin session:', e);
    }
    setAdminUser(null);
    setEmail('');
    setPassword('');
    setAuthError(null);
    setAuthSuccess(null);
    try {
      await signOutAdmin(adminAuth);
    } catch (err) {
      console.warn('Admin sign out notice:', err);
    }
  };

  // Create Product Submit
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPublishingProduct) return;
    setIsPublishingProduct(true);

    try {
      const validImages = newProd.images.map(img => img.trim()).filter(Boolean).filter(img => !img.includes('1610030469983'));
      const variantPhotos = (newProd.colorVariants || []).flatMap(v => v.images || (v.imageUrl ? [v.imageUrl] : [])).map(img => img.trim()).filter(Boolean).filter(img => !img.includes('1610030469983'));
      const defaultImg = getCategoryFallbackImage(newProd.category, newProd.collection, newProd.name);
      const finalImages = validImages.length > 0
        ? validImages
        : (variantPhotos.length > 0 ? variantPhotos : (defaultImg ? [defaultImg] : []));
      
      const trimmedPrimaryColor = (newProd.primaryColorName && newProd.primaryColorName.trim())
        ? newProd.primaryColorName.trim()
        : undefined;

      const sizes = newProd.sizes !== undefined ? newProd.sizes : ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
      const sizeStock = newProd.sizeStock || {};
      const calculatedTotalStock = sizes.reduce((sum, sz) => sum + (Number(sizeStock[sz]) || 0), 0);
      const effectiveStock = calculatedTotalStock > 0 ? calculatedTotalStock : (Number(newProd.stockCount) || 12);
      const effectiveSizeStock: Record<string, number> = { ...sizeStock };
      if (calculatedTotalStock === 0) {
        sizes.forEach(sz => {
          effectiveSizeStock[sz] = Math.max(1, Math.floor(effectiveStock / sizes.length) || 1);
        });
      }

      const validVariants = (newProd.colorVariants || []).filter(v => v.name && v.name.trim() !== '').map((v, idx) => {
        const rawImages = (v.images || (v.imageUrl ? [v.imageUrl] : [])).map(img => img.trim()).filter(Boolean);
        const primaryImg = rawImages[0] || v.imageUrl || finalImages[idx] || finalImages[0] || defaultImg;
        const vSizes = (v.sizes && v.sizes.length > 0) ? v.sizes : [...sizes];
        const vStock = v.sizeStock || {};
        const vUnits = vSizes.reduce((sum, sz) => sum + (Number(vStock[sz]) || 0), 0);
        return {
          name: v.name.trim(),
          imageUrl: primaryImg,
          images: rawImages.length > 0 ? rawImages : [primaryImg],
          sizes: vSizes,
          sizeStock: vStock,
          stockCount: vUnits
        };
      });

      let finalVariants: ColorVariant[] = [];
      if (trimmedPrimaryColor) {
        const primaryVariant: ColorVariant = {
          name: trimmedPrimaryColor,
          imageUrl: finalImages[0] || defaultImg,
          images: finalImages,
          sizes: [...sizes],
          sizeStock: effectiveSizeStock,
          stockCount: effectiveStock
        };
        const otherVariants = validVariants.filter(v => v.name.toLowerCase() !== trimmedPrimaryColor.toLowerCase());
        finalVariants = [primaryVariant, ...otherVariants];
      } else if (validVariants.length > 0) {
        finalVariants = validVariants;
      } else if (newProd.colors && newProd.colors.length > 0) {
        finalVariants = newProd.colors.filter(c => c && c.trim() !== '').map((c, idx) => ({
          name: c,
          imageUrl: finalImages[idx] || finalImages[0] || defaultImg,
          images: [finalImages[idx] || finalImages[0] || defaultImg].filter(Boolean),
          sizes: [...sizes],
          sizeStock: effectiveSizeStock,
          stockCount: effectiveStock
        }));
      }

      const finalColors = finalVariants.map(v => v.name);
      const allVariantsStock = finalVariants.reduce((sum, v) => sum + (v.stockCount || 0), 0);
      const finalStockCount = Math.max(effectiveStock, allVariantsStock);

      const finalSku = (newProd.sku && newProd.sku.trim())
        ? newProd.sku.trim()
        : `FEAT-${newProd.category.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

      const trimmedLength = (newProd.length && newProd.length.trim())
        ? newProd.length.trim()
        : undefined;

      await onAddProduct({
        ...newProd,
        id: finalSku,
        sku: finalSku,
        primaryColorName: trimmedPrimaryColor,
        length: trimmedLength,
        images: finalImages,
        colors: finalColors,
        colorVariants: finalVariants,
        sizes,
        sizeStock: effectiveSizeStock,
        stockCount: finalStockCount,
        rating: 0,
        ratingCount: 0,
        discountPercent: Math.round(((newProd.originalPrice - newProd.price) / newProd.originalPrice) * 100),
        reviews: [],
        tags: ['New Arrival', newProd.category, newProd.fabric]
      });

      const productName = newProd.name || 'New Item';
      setProductToast(`✨ "${productName}" (SKU: ${finalSku}) has been successfully published to catalog!`);
      setTimeout(() => {
        setProductToast(null);
      }, 6000);

      setNewProd({
        name: '',
        sku: '',
        category: 'Kurti',
        collection: 'Firdausi collection',
        price: 1999,
        originalPrice: 3999,
        stockCount: 12,
        fabric: 'Pure Chanderi Silk',
        length: '',
        primaryColorName: '',
        description: 'Designer festive wear piece with exquisite hand-embroidered zari highlights.',
        careInstructions: '',
        sizes: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
        sizeStock: {
          'S': 2,
          'M': 2,
          'L': 2,
          'XL': 2,
          'XXL': 2,
          'XXXL': 2,
          'Free Size': 0
        },
        colors: [],
        colorVariants: [],
        images: []
      });

      // Switch to Inventory & SKU Tab
      setActiveTab('inventory');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error while publishing product:', err);
      setActiveTab('inventory');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsPublishingProduct(false);
    }
  };

  // Create Promo Submit
  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromo.code.trim()) return;
    setCouponSaving(true);
    if (onSavePromo) {
      await onSavePromo({
        ...newPromo,
        code: newPromo.code.trim().toUpperCase()
      });
    }
    setCouponSaving(false);
    setNewPromo({
      name: 'Grand Festive Celebration Offer',
      code: '',
      discountType: 'percent',
      discountValue: 20,
      minOrderValue: 999,
      description: 'Special seasonal promotional discount across ethnic wear.',
      reasonForSale: 'Celebrating the Joy of Festive Season & Royal Indian Craftsmanship with our patrons worldwide!',
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      showPopupAnnouncement: true,
      popupTitle: '🌸 Grand Festive Celebration Sale & Special Coupon!',
      popupBadge: 'GRAND FESTIVE SPECIAL',
      popupMessage: 'We are celebrating our grand festive ethnic launch! Use this exclusive gift code to enjoy instant savings on all handcrafted items.',
      active: true
    });
  };

  // Edit Promo Submit
  const handleUpdatePromoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromo || !editingPromo.code.trim()) return;
    setCouponSaving(true);
    if (onSavePromo) {
      await onSavePromo({
        ...editingPromo,
        code: editingPromo.code.trim().toUpperCase()
      });
    }
    setCouponSaving(false);
    setEditingPromo(null);
  };

  // Trigger Live Flash Sale
  const handleToggleLiveSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaleSaving(true);
    if (onUpdateLiveSale) {
      await onUpdateLiveSale({
        active: !saleActive,
        title: saleTitle,
        discountPercent: Number(saleDiscount),
        targetType: saleTarget
      });
    }
    setSaleActive(!saleActive);
    setSaleSaving(false);
  };

  // Trigger Email Marketing
  const handleTriggerEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSending(true);
    await onSendEmailCampaign(campaignData);
    setEmailSending(false);
    setEmailSuccess(true);
    setTimeout(() => setEmailSuccess(false), 3000);
  };

  // Filtered Products for Inventory
  const filteredProducts = deduplicateProducts(products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          p.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCatFilter === 'All' || p.category === selectedCatFilter;
    return matchesSearch && matchesCat;
  }));

  // Filtered and Sorted Orders for Orders Dispatch Tab
  const effectiveOrderSearch = (orderSearchQuery || '').trim().toLowerCase();
  const filteredAndSortedOrders = orders.filter(o => {
    // Status Filter
    if (orderStatusFilter !== 'All' && o.orderStatus !== orderStatusFilter) {
      return false;
    }

    if (!effectiveOrderSearch) return true;

    const cleanSearch = effectiveOrderSearch.replace(/^#/, '');
    const orderIdLower = (o.id || '').toLowerCase();
    const matchesId = orderIdLower.includes(effectiveOrderSearch) || orderIdLower.includes(cleanSearch);
    const matchesEmail = (o.customerEmail || '').toLowerCase().includes(effectiveOrderSearch);
    const matchesTxn = (o.transactionId || '').toLowerCase().includes(effectiveOrderSearch);
    const matchesCustName = (o.deliveryAddress?.fullName || '').toLowerCase().includes(effectiveOrderSearch);
    const matchesPhone = (o.deliveryAddress?.phone || '').toLowerCase().includes(effectiveOrderSearch);
    const matchesCity = (o.deliveryAddress?.city || '').toLowerCase().includes(effectiveOrderSearch);
    const matchesState = (o.deliveryAddress?.state || '').toLowerCase().includes(effectiveOrderSearch);
    const matchesPincode = (o.deliveryAddress?.pincode || '').toLowerCase().includes(effectiveOrderSearch);
    const matchesMethod = (o.paymentMethod || '').toLowerCase().includes(effectiveOrderSearch);
    const matchesPaymentStatus = (o.paymentStatus || '').toLowerCase().includes(effectiveOrderSearch);
    const matchesItems = o.items.some(item => 
      (item.product.name || '').toLowerCase().includes(effectiveOrderSearch) ||
      (item.product.sku || '').toLowerCase().includes(effectiveOrderSearch) ||
      (item.product.id || '').toLowerCase().includes(effectiveOrderSearch) ||
      (item.selectedSize || '').toLowerCase().includes(effectiveOrderSearch)
    );

    return matchesId || matchesEmail || matchesTxn || matchesCustName || matchesPhone || matchesCity || matchesState || matchesPincode || matchesMethod || matchesPaymentStatus || matchesItems;
  }).sort((a, b) => {
    if (orderSortBy === 'newest') {
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
    }
    if (orderSortBy === 'oldest') {
      return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
    }
    if (orderSortBy === 'amount_high') {
      return b.finalAmount - a.finalAmount;
    }
    if (orderSortBy === 'amount_low') {
      return a.finalAmount - b.finalAmount;
    }
    return 0;
  });

  const handleCopyOrderId = (id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(id);
      setCopiedOrderId(id);
      setTimeout(() => setCopiedOrderId(null), 2500);
    }
  };

  const findOrderById = async (targetId: string): Promise<Order | null> => {
    const cleanTarget = targetId.trim().toUpperCase()
      .replace(/^#/, '')
      .replace(/^INV-FEAT-/, '')
      .replace(/^INV-/, '')
      .replace(/^SRE01-/, '')
      .replace(/^SR-/, '');
    if (!cleanTarget) return null;

    // Search existing loaded orders
    const found = orders.find(o => 
      o.id.toUpperCase() === cleanTarget || 
      o.id.toUpperCase().includes(cleanTarget) ||
      (cleanTarget.length >= 6 && o.id.toUpperCase().endsWith(cleanTarget))
    );
    if (found) return found;

    // Direct fetch from server if order was placed in another session
    try {
      const adminToken = localStorage.getItem('feat_admin_token') || '';
      const res = await fetch(`/api/orders/${encodeURIComponent(cleanTarget)}`, {
        headers: {
          'x-admin-token': adminToken
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.order) {
          return data.order;
        }
      }
    } catch (e) {
      console.warn('Could not fetch order by ID:', e);
    }
    return null;
  };

  const handleGenerateInvoiceByOrderId = async (idToFind: string) => {
    if (!idToFind.trim()) {
      setQuickInvoiceError('Please enter an Order ID');
      return;
    }
    setQuickInvoiceLoading(true);
    setQuickInvoiceError(null);
    try {
      const order = await findOrderById(idToFind);
      if (order) {
        setInvoiceModalOrder(order);
        setQuickInvoiceError(null);
      } else {
        setQuickInvoiceError(`Order "${idToFind}" not found. Please verify the Order ID.`);
      }
    } catch (err: any) {
      setQuickInvoiceError(err.message || 'Failed to locate invoice');
    } finally {
      setQuickInvoiceLoading(false);
    }
  };

  const handleDownloadInvoiceByOrderId = async (idToFind: string) => {
    if (!idToFind.trim()) {
      setQuickInvoiceError('Please enter an Order ID to download');
      return;
    }
    setQuickInvoiceLoading(true);
    setQuickInvoiceError(null);
    try {
      const order = await findOrderById(idToFind);
      if (order) {
        downloadTaxInvoiceFile(order);
      } else {
        setQuickInvoiceError(`Order "${idToFind}" not found. Please verify the Order ID.`);
      }
    } catch (err: any) {
      setQuickInvoiceError(err.message || 'Failed to download invoice');
    } finally {
      setQuickInvoiceLoading(false);
    }
  };

  /**
   * Automated Route: Print Shipping Label (100x150 mm / 4x6" Thermal PDF)
   * Follows the 3-step Shiprocket pipeline:
   * Step 1: Create Order on Shiprocket
   * Step 2: Assign AWB & Courier partner
   * Step 3: Fetch the direct PDF link with label_size: 'thermal' and open in browser print window
   */
  const handlePrintShippingLabel = async (order: Order) => {
    // If the thermal label PDF URL is already available, open it directly in a browser print window
    if (order.shiprocketLabelUrl && order.shiprocketLabelUrl.startsWith('http')) {
      openShiprocketThermalLabelPrint(order.shiprocketLabelUrl);
      setShippingBillModalOrder({ ...order });
      return;
    }

    setGeneratingLabelOrderId(order.id);
    try {
      const res = await fetchShiprocketThermalLabel(order.id);
      if (res.success && res.label_url) {
        order.shiprocketLabelUrl = res.label_url;
        if (res.awb_code) order.shiprocketAwbCode = res.awb_code;
        if (res.courier_name) order.shiprocketCourierName = res.courier_name;
        if (res.shipment_id) order.shiprocketShipmentId = res.shipment_id as any;
        if (res.order) {
          Object.assign(order, res.order);
        }

        // Open the Shiprocket PDF link directly in browser print window
        openShiprocketThermalLabelPrint(res.label_url);
        setShippingBillModalOrder({ ...order });
      } else {
        if (res.credentialsRequired) {
          alert('Shiprocket API authentication is required to fetch live shipping labels. Please go to Admin Settings -> Shiprocket to configure your credentials or API token.');
        } else {
          alert(res.error || 'Failed to fetch shipping label from Shiprocket. Please check wallet balance or order details.');
        }
      }
    } catch (err: any) {
      alert(err.message || 'Error generating shipping label');
    } finally {
      setGeneratingLabelOrderId(null);
    }
  };

  const handleFetchShiprocketInvoice = async (order: Order) => {
    if (order.shiprocketInvoiceUrl && order.shiprocketInvoiceUrl.startsWith('http')) {
      window.open(order.shiprocketInvoiceUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    setGeneratingInvoiceOrderId(order.id);
    try {
      const res = await fetchShiprocketInvoice(order.id);
      if (res.success && res.invoice_url) {
        order.shiprocketInvoiceUrl = res.invoice_url;
        if (res.order) {
          Object.assign(order, res.order);
        }
        setShippingBillModalOrder({ ...order });
        window.open(res.invoice_url, '_blank', 'noopener,noreferrer');
      } else {
        if (res.credentialsRequired) {
          alert('Shiprocket API authentication required. Please configure credentials in Settings.');
        } else {
          alert(res.error || 'Failed to generate Shiprocket invoice. Please verify order is synced.');
        }
      }
    } catch (err: any) {
      alert(err.message || 'Error generating Shiprocket invoice');
    } finally {
      setGeneratingInvoiceOrderId(null);
    }
  };

  const handlePrintShippingLabelByOrderId = async (idToFind: string) => {
    if (!idToFind.trim()) {
      setQuickInvoiceError('Please enter an Order ID to Print Shipping Label');
      return;
    }
    setQuickInvoiceLoading(true);
    setQuickInvoiceError(null);
    try {
      const order = await findOrderById(idToFind);
      if (order) {
        await handlePrintShippingLabel(order);
      } else {
        setQuickInvoiceError(`Order "${idToFind}" not found. Please verify the Order ID.`);
      }
    } catch (err: any) {
      setQuickInvoiceError(err.message || 'Failed to print shipping label');
    } finally {
      setQuickInvoiceLoading(false);
    }
  };

  const handleGenerateShippingBillByOrderId = async (idToFind: string) => {
    if (!idToFind.trim()) {
      setQuickInvoiceError('Please enter an Order ID for Shipping Bill');
      return;
    }
    setQuickInvoiceLoading(true);
    setQuickInvoiceError(null);
    try {
      const order = await findOrderById(idToFind);
      if (order) {
        setShippingBillModalOrder(order);
        setQuickInvoiceError(null);
      } else {
        setQuickInvoiceError(`Order "${idToFind}" not found. Please verify the Order ID.`);
      }
    } catch (err: any) {
      setQuickInvoiceError(err.message || 'Failed to locate shipping bill');
    } finally {
      setQuickInvoiceLoading(false);
    }
  };

  const handleDownloadShippingBillByOrderId = async (idToFind: string) => {
    if (!idToFind.trim()) {
      setQuickInvoiceError('Please enter an Order ID to download Shipping Bill');
      return;
    }
    setQuickInvoiceLoading(true);
    setQuickInvoiceError(null);
    try {
      const order = await findOrderById(idToFind);
      if (order) {
        downloadShippingBillFile(order);
      } else {
        setQuickInvoiceError(`Order "${idToFind}" not found. Please verify the Order ID.`);
      }
    } catch (err: any) {
      setQuickInvoiceError(err.message || 'Failed to download shipping bill');
    } finally {
      setQuickInvoiceLoading(false);
    }
  };

  const totalRevenue = orders.reduce((acc, o) => acc + o.finalAmount, 0);
  const lowStockCount = products.filter(p => p.stockCount <= 10).length;

  return (
    <div className="min-h-screen bg-[#fcf9f5] flex flex-col font-sans text-gray-900 selection:bg-pink-200 selection:text-pink-900">
      
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-pink-950 via-pink-900 to-amber-950 text-amber-100 px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-amber-400/30 shadow-md">
        <div className="flex items-center gap-3">
          <div 
            onClick={() => (onBackToHome || onClose)?.()}
            className="cursor-pointer flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-pink-950 font-black flex items-center justify-center text-xl shadow border border-amber-300 group-hover:scale-105 transition-transform">
              <Shield className="w-6 h-6 text-pink-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base text-amber-200 tracking-tight font-serif">
                  Feat Merchant & Admin Dashboard
                </h1>
              </div>
              <p className="text-[11px] text-amber-100/80 font-medium hidden sm:block">
                Dedicated Admin Portal • Inventory & SKU Management • Date-Valid Coupons • Flash Sale Trigger
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {adminUser && (
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl text-xs border border-amber-300/20">
              <User className="w-3.5 h-3.5 text-amber-300" />
              <span className="font-bold text-amber-200 truncate max-w-[120px] sm:max-w-[200px]">{adminUser.email}</span>
              <button
                onClick={handleAdminSignOut}
                className="p-1 hover:bg-white/20 rounded text-amber-300 transition-colors ml-1"
                title="Sign Out Admin"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={() => (onBackToHome || onClose)?.()}
            className="px-3.5 py-1.5 bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 hover:text-amber-100 rounded-xl text-xs font-bold transition-all border border-amber-300/30 flex items-center gap-1.5"
            aria-label="Back to Store"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden xs:inline">Back to Store</span>
          </button>
        </div>
      </header>

      {/* CONDITION 1: IF ADMIN IS NOT SIGNED IN ON FEATDBADMIN */}
      {!adminUser ? (
        <main className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-pink-950/5 via-pink-50/40 to-[#fcf9f5]">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-pink-300 overflow-hidden">
            
            {/* Admin Login Header */}
            <div className="bg-gradient-to-br from-pink-950 via-pink-900 to-amber-950 p-7 text-amber-100 text-center relative border-b border-amber-400/30">
              <div className="w-14 h-14 rounded-2xl bg-amber-400 text-pink-950 flex items-center justify-center mx-auto mb-3 shadow-lg border border-amber-300 ring-4 ring-amber-400/20">
                <Shield className="w-7 h-7 text-pink-950" />
              </div>
              <h2 className="text-xl font-extrabold text-amber-200 font-serif tracking-tight">Merchant Admin Portal</h2>
              <p className="text-xs text-amber-100/80 mt-1 font-medium">
                Restricted Store Access
              </p>
            </div>

            <div className="p-6 sm:p-8 space-y-4">
              {authError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold p-3.5 rounded-2xl flex items-start gap-2.5 shadow-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              {authSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3.5 rounded-2xl flex items-start gap-2.5 shadow-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{authSuccess}</span>
                </div>
              )}

              <form onSubmit={handleAdminAuthSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-1.5">
                    Admin ID / Email
                  </label>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="gobackifyouarenotadmin@goback.home"
                    className="w-full px-4 py-2.5 text-xs border border-gray-300 rounded-2xl focus:ring-2 focus:ring-pink-800 focus:border-pink-800 font-medium bg-pink-50/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-1.5">
                    Admin Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-2.5 text-xs border border-gray-300 rounded-2xl focus:ring-2 focus:ring-pink-800 focus:border-pink-800 font-medium bg-pink-50/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingAuth}
                  className="w-full bg-gradient-to-r from-pink-950 via-pink-900 to-amber-950 hover:from-pink-900 hover:to-amber-900 text-amber-200 font-black py-3 px-4 rounded-2xl text-xs shadow-xl transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 mt-2 border border-amber-400/30 cursor-pointer"
                >
                  {submittingAuth ? (
                    <span className="animate-pulse">Authenticating Admin...</span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-amber-300" />
                      <span>Authenticate & Enter Dashboard</span>
                    </>
                  )}
                </button>
              </form>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => (onBackToHome || onClose)?.()}
                  className="text-gray-600 hover:text-pink-900 font-semibold flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Website</span>
                </button>
                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-pink-700 shrink-0" />
                  <span>Authorized Only</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      ) : (
        /* CONDITION 2: IF ADMIN IS SIGNED IN ON FEATDBADMIN */
        <div className="flex-1 flex flex-col">
          {/* Tab Navigation Row */}
          <div className="bg-pink-50/95 border-b border-pink-200/80 px-4 sm:px-8 py-2.5 flex items-center gap-2 overflow-x-auto shrink-0 text-xs font-bold sticky top-[65px] z-30 shadow-2xs backdrop-blur-md">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'inventory' ? 'bg-pink-900 text-amber-200 shadow' : 'text-gray-700 hover:bg-pink-100/80'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Inventory & SKUs ({products.length})</span>
              {lowStockCount > 0 && (
                <span className="bg-amber-400 text-pink-950 text-[10px] px-1.5 rounded-full font-black">
                  {lowStockCount} Low
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('add_product')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'add_product' ? 'bg-pink-900 text-amber-200 shadow' : 'text-gray-700 hover:bg-pink-100/80'
              }`}
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>Upload New Item</span>
            </button>

            <button
              onClick={() => setActiveTab('banners')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'banners' ? 'bg-pink-900 text-amber-200 shadow' : 'text-gray-700 hover:bg-pink-100/80'
              }`}
            >
              <LayoutTemplate className="w-4 h-4 text-amber-300" />
              <span>Hero Banners ({banners.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('coupons')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'coupons' ? 'bg-pink-900 text-amber-200 shadow' : 'text-gray-700 hover:bg-pink-100/80'
              }`}
            >
              <Tag className="w-4 h-4 text-amber-300" />
              <span>Date-Valid Coupons ({promos.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('flash_sale')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'flash_sale' ? 'bg-pink-900 text-amber-200 shadow' : 'text-gray-700 hover:bg-pink-100/80'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Live Flash Sale</span>
              {saleActive && (
                <span className="bg-emerald-500 text-white text-[9px] px-1.5 rounded-full font-black uppercase">
                  ACTIVE
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'orders' ? 'bg-pink-900 text-amber-200 shadow' : 'text-gray-700 hover:bg-pink-100/80'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Orders Dispatch ({orders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('marketing')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'marketing' ? 'bg-pink-900 text-amber-200 shadow' : 'text-gray-700 hover:bg-pink-100/80'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Marketing & Broadcasts</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'analytics' ? 'bg-pink-900 text-amber-200 shadow' : 'text-gray-700 hover:bg-pink-100/80'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Revenue Analytics</span>
            </button>
          </div>

          {/* Main Content Body */}
          <main className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto space-y-6">

              {/* TAB 1: Inventory & SKU Table */}
              {activeTab === 'inventory' && (
                <div className="space-y-4">
                  {productToast && (
                    <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 shadow-md animate-fade-in">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold">{productToast}</span>
                      </div>
                      <button 
                        onClick={() => setProductToast(null)} 
                        className="text-emerald-700 hover:text-emerald-900 text-xs font-black underline cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Persistent Cloud & Railway Media Sync Bar */}
                  <div className="bg-white p-4 rounded-2xl border border-pink-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-pink-100/70 text-pink-900 rounded-xl">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-extrabold text-xs text-gray-900">Media Persistence & Cloud Storage</h5>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                            Dual-Tier Active
                          </span>
                          {mediaStatus?.persistentVolumeActive && (
                            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-300">
                              Railway Volume Attached
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {mediaStatus 
                            ? `${mediaStatus.memoryCachedCount} images loaded in RAM cache (${mediaStatus.diskCachedCount} on disk). All images are backed up in Firestore to survive redeployments.`
                            : 'All product images uploaded by admin are permanently saved to Firestore settings collection and cached in RAM/disk.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                      {mediaRehydrateMsg && (
                        <span className="text-[11px] font-bold text-gray-700 bg-pink-50 px-2.5 py-1 rounded-lg border border-pink-200">
                          {mediaRehydrateMsg}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleRehydrateMedia}
                        disabled={isRehydratingMedia}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-900 hover:bg-pink-950 text-amber-200 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                        title="Rehydrate and sync all images from Firestore to Railway disk & memory cache"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRehydratingMedia ? 'animate-spin' : ''}`} />
                        <span>{isRehydratingMedia ? 'Syncing...' : 'Sync Media from Cloud'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 bg-pink-50/50 p-4 rounded-2xl border border-pink-100">
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-900">Live Inventory & SKU Tracker</h4>
                      <p className="text-xs text-gray-500">Search products, inspect SKU codes, adjust stock levels or delete discontinued lines.</p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {/* Search Bar */}
                      <div className="relative flex-1 sm:w-64">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search title, SKU, or ID..."
                          className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-xl bg-white"
                        />
                      </div>

                      {/* Category Filter */}
                      <select
                        value={selectedCatFilter}
                        onChange={(e) => setSelectedCatFilter(e.target.value)}
                        className="text-xs font-bold px-3 py-1.5 border border-gray-300 rounded-xl bg-white"
                      >
                        <option value="All">All Categories</option>
                        <option value="Kurti">Kurti</option>
                        <option value="Sharee">Sharee</option>
                        <option value="Dress Materials">Dress Materials</option>
                        <option value="Indo Western dress">Indo Western dress</option>
                        <option value="Suit">Suit</option>
                      </select>
                    </div>
                  </div>

                  {/* Inventory Table */}
                  <div className="border border-pink-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-pink-50 text-pink-900 font-extrabold uppercase text-[10px] border-b border-pink-100">
                        <tr>
                          <th className="p-3">Product / SKU</th>
                          <th className="p-3">Category & Fabric</th>
                          <th className="p-3">Price & MRP</th>
                          <th className="p-3">Stock Level</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredProducts.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-12 text-center text-gray-500">
                              <Package className="w-10 h-10 text-pink-300 mx-auto mb-2" />
                              <p className="font-extrabold text-sm text-gray-800">No Products in Inventory</p>
                              <p className="text-xs text-gray-400 mt-1">Upload your first textile product using the "Upload New Item" tab.</p>
                            </td>
                          </tr>
                        ) : (
                          filteredProducts.map((p) => {
                          const isLow = p.stockCount > 0 && p.stockCount <= 10;
                          const isOut = p.stockCount === 0;
                          return (
                            <tr key={`admin-prod-${p.id}`} className="hover:bg-pink-50/40 transition-colors">
                              <td className="p-3 flex items-center gap-3">
                                <img src={p.images[0]} alt="" className="w-10 h-12 object-cover rounded-lg border shadow-xs" referrerPolicy="no-referrer" />
                                <div>
                                  <p className="font-bold text-gray-900 line-clamp-1">{p.name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] bg-pink-100 text-pink-900 font-mono font-extrabold px-1.5 py-0.5 rounded border border-pink-200">
                                      SKU: {p.sku || p.id}
                                    </span>
                                    {p.sku && p.id !== p.sku && (
                                      <span className="text-[10px] text-gray-400 font-mono">Ref ID: {p.id}</span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="p-3">
                                <span className="font-bold text-pink-800 block">{p.category}</span>
                                <span className="text-[10px] text-gray-500 block">{p.collection}</span>
                                <span className="text-[10px] text-amber-700 font-medium block">{p.fabric}</span>
                                {p.length && p.length.trim() !== '' && (
                                  <span className="text-[10px] text-gray-600 font-medium block">Length: {p.length}</span>
                                )}
                                {p.primaryColorName && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100/80 border border-amber-300 rounded text-[10px] font-bold text-amber-950 mt-1">
                                    <span>⭐ Primary:</span>
                                    <span>{p.primaryColorName}</span>
                                  </span>
                                )}
                                {p.colors && p.colors.length > 0 && (
                                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                    {p.colors.map((c, cIdx) => {
                                      const variant = p.colorVariants?.find(v => v.name.toLowerCase() === c.toLowerCase());
                                      return (
                                        <span
                                          key={cIdx}
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-pink-50 border border-pink-200 rounded text-[10px] font-semibold text-pink-950"
                                        >
                                          {variant?.imageUrl ? (
                                            <img
                                              src={variant.imageUrl}
                                              alt={c}
                                              className="w-3.5 h-3.5 rounded object-cover border border-pink-300 shrink-0"
                                              referrerPolicy="no-referrer"
                                            />
                                          ) : (
                                            <span className="w-1.5 h-1.5 rounded-full bg-pink-700 shrink-0" />
                                          )}
                                          <span>{c}</span>
                                          {variant?.linkedProductId && (
                                            <span className="text-[9px] text-amber-700 font-bold" title={`Links to Product ID: ${variant.linkedProductId}`}>🔗</span>
                                          )}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>

                              <td className="p-3">
                                <span className="font-bold text-gray-900 block">₹{p.price}</span>
                                <span className="text-[10px] text-gray-400 line-through">₹{p.originalPrice}</span>
                                <span className="text-[10px] text-emerald-600 font-bold ml-1">({p.discountPercent}% OFF)</span>
                              </td>

                              <td className="p-3">
                                <div className="space-y-2">
                                  {/* Overall Stock Status & Total Units */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono font-bold text-xs text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs">
                                      Total: <strong className="text-pink-950 font-black">{p.stockCount}</strong> {p.stockCount === 1 ? 'piece' : 'pieces'}
                                    </span>

                                    {isOut ? (
                                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200 uppercase tracking-wide">
                                        Out of Stock
                                      </span>
                                    ) : isLow ? (
                                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Fast Finishing
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold">
                                        In Stock
                                      </span>
                                    )}
                                  </div>

                                  {/* Exact Per-Size Units Breakdown */}
                                  {p.sizes && p.sizes.length > 0 ? (
                                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                      {p.sizes.map((sz) => {
                                        const units = p.sizeStock && p.sizeStock[sz] !== undefined
                                          ? Number(p.sizeStock[sz])
                                          : (p.stockCount > 0 ? Math.max(0, Math.floor(p.stockCount / p.sizes.length)) : 0);
                                        const isSzZero = units === 0;
                                        const isSzLow = units > 0 && units <= 3;

                                        return (
                                          <button
                                            key={sz}
                                            type="button"
                                            onClick={() => handleOpenEditProduct(p)}
                                            className={`px-2 py-1 rounded-lg text-xs font-mono font-bold border transition-all hover:scale-105 cursor-pointer shadow-2xs flex items-center gap-1 ${
                                              isSzZero
                                                ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                                                : isSzLow
                                                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 font-black'
                                                  : 'bg-white text-gray-800 border-gray-200 hover:border-pink-300 hover:bg-pink-50/50'
                                            }`}
                                            title={`Size ${sz}: ${units} pieces in stock (Click to edit in product modal)`}
                                          >
                                            <span className="font-extrabold text-gray-900">{sz}:</span>
                                            <span className={`font-black ${isSzZero ? 'text-rose-600' : isSzLow ? 'text-amber-800' : 'text-emerald-700'}`}>
                                              {units} {units === 1 ? 'pc' : 'pcs'}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="text-[11px] text-gray-400 italic">
                                      Single / Standard Size ({p.stockCount} {p.stockCount === 1 ? 'piece' : 'pieces'})
                                    </div>
                                  )}
                                </div>
                              </td>

                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleOpenEditProduct(p)}
                                    className="text-pink-900 hover:text-pink-950 px-2 py-1.5 rounded-xl bg-pink-100/80 hover:bg-pink-200 transition-colors flex items-center gap-1 font-bold text-[11px]"
                                    title="Edit Price, Specifications, Captions, Sizes"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setProductToDelete({ id: p.id, name: p.name, sku: p.sku || p.id })}
                                    className="text-rose-600 hover:text-rose-800 p-1.5 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Delete Product from Catalog"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: Upload New Item & SKUs */}
              {activeTab === 'add_product' && (
                <div className="max-w-3xl mx-auto bg-white p-6 rounded-3xl border border-pink-200 shadow-sm space-y-5">
                  <div className="border-b border-pink-100 pb-3">
                    <h3 className="font-extrabold text-base text-pink-950 font-serif">Upload New Textile / Designer Apparel</h3>
                    <p className="text-xs text-gray-500">Fill in product specifications, assigned SKU code, category, fabric details, and high-res imagery.</p>
                  </div>

                  <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-gray-700 block mb-1">Item Title / Product Name</label>
                        <input
                          type="text"
                          required
                          value={newProd.name}
                          onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                          placeholder="e.g. Bandhani Chanderi Silk Kurti with Zari Embroidery"
                          className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-pink-700 font-medium"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="font-bold text-gray-700 block">Assigned SKU Code *</label>
                          <button
                            type="button"
                            onClick={() => setNewProd({ ...newProd, sku: 'FEAT-' + newProd.category.substring(0, 3).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900) })}
                            className="text-[10px] text-pink-800 font-bold hover:underline"
                          >
                            Auto-Generate SKU
                          </button>
                        </div>
                        <input
                          type="text"
                          required
                          value={newProd.sku}
                          onChange={(e) => setNewProd({ ...newProd, sku: e.target.value })}
                          placeholder="e.g. FEAT-KRT-824 or write custom SKU"
                          className="w-full px-3 py-2 border rounded-xl font-mono font-bold text-pink-900 bg-pink-50/30"
                        />
                        {(() => {
                          const targetSku = newProd.sku && newProd.sku.trim();
                          const matched = targetSku ? products.find(p => p.sku && p.sku.trim().toLowerCase() === targetSku.toLowerCase()) : null;
                          if (!matched) return null;
                          return (
                            <div className="mt-2 p-2.5 bg-gradient-to-r from-amber-50 to-pink-50 border border-amber-300 rounded-xl text-xs space-y-1">
                              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                                <Layers className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                <span>Matches Existing SKU: {matched.sku}</span>
                              </div>
                              <p className="text-[11px] text-amber-900 leading-snug">
                                This upload will link to <strong>"{matched.name}"</strong> as an additional color variant! The first uploaded dress will remain the default view, and shoppers will have options to switch between color variants on the product page.
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-extrabold text-pink-950 block mb-1 text-xs flex items-center justify-between">
                          <span>Select Category <span className="text-pink-600">*</span></span>
                          <span className="text-[10px] font-bold text-pink-600 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-full">{newProd.category}</span>
                        </label>
                        <div className="relative">
                          <select
                            value={newProd.category}
                            onChange={(e) => setNewProd({ ...newProd, category: e.target.value as CategoryType })}
                            className="w-full appearance-none px-3.5 py-2.5 bg-white border-2 border-pink-300 hover:border-pink-500 focus:border-pink-600 focus:ring-2 focus:ring-pink-200 rounded-xl font-bold text-gray-900 shadow-sm cursor-pointer pr-10 text-xs transition-all"
                          >
                            <option value="Kurti" className="text-gray-900 bg-white font-medium py-1">Kurti</option>
                            <option value="Sharee" className="text-gray-900 bg-white font-medium py-1">Sharee</option>
                            <option value="Dress Materials" className="text-gray-900 bg-white font-medium py-1">Dress Materials</option>
                            <option value="Indo Western dress" className="text-gray-900 bg-white font-medium py-1">Indo Western dress</option>
                            <option value="Suit" className="text-gray-900 bg-white font-medium py-1">Suit</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-pink-600">
                            <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="font-extrabold text-pink-950 block mb-1 text-xs flex items-center justify-between">
                          <span>Select Collection <span className="text-pink-600">*</span></span>
                          <span className="text-[10px] font-bold text-pink-600 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-full truncate max-w-[130px]">{newProd.collection}</span>
                        </label>
                        <div className="relative">
                          <select
                            value={newProd.collection}
                            onChange={(e) => setNewProd({ ...newProd, collection: e.target.value as CollectionType })}
                            className="w-full appearance-none px-3.5 py-2.5 bg-white border-2 border-pink-300 hover:border-pink-500 focus:border-pink-600 focus:ring-2 focus:ring-pink-200 rounded-xl font-bold text-gray-900 shadow-sm cursor-pointer pr-10 text-xs transition-all"
                          >
                            <option value="9 to fivers collection" className="text-gray-900 bg-white font-medium py-1">9 to fivers collection</option>
                            <option value="Firdausi collection" className="text-gray-900 bg-white font-medium py-1">Firdausi collection</option>
                            <option value="'Present is Gifted' Collection" className="text-gray-900 bg-white font-medium py-1">'Present is Gifted' Collection</option>
                            <option value="'Gift is present' Collection" className="text-gray-900 bg-white font-medium py-1">'Gift is present' Collection</option>
                            <option value="'Deal maange more' Collection" className="text-gray-900 bg-white font-medium py-1">'Deal maange more' Collection</option>
                            <option value="Jashn Collection" className="text-gray-900 bg-white font-medium py-1">Jashn Collection</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-pink-600">
                            <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-gray-700 block mb-1">Selling Price (₹)</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={newProd.price}
                          onChange={(e) => setNewProd({ ...newProd, price: Number(e.target.value) })}
                          className="w-full px-3 py-2 border rounded-xl font-bold"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-gray-700 block mb-1">Original MRP (₹)</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={newProd.originalPrice}
                          onChange={(e) => setNewProd({ ...newProd, originalPrice: Number(e.target.value) })}
                          className="w-full px-3 py-2 border rounded-xl font-bold text-gray-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-bold text-gray-700 block mb-1">Fabric & Finish Specifications</label>
                        <input
                          type="text"
                          required
                          value={newProd.fabric}
                          onChange={(e) => setNewProd({ ...newProd, fabric: e.target.value })}
                          placeholder="e.g. Pure Organza Silk with Zari Dupatta"
                          className="w-full px-3 py-2 border rounded-xl font-medium"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-gray-700 block mb-1 flex items-center justify-between">
                          <span>Garment Length (Optional)</span>
                          <span className="text-[11px] text-gray-400 font-normal">Leave blank if none</span>
                        </label>
                        <input
                          type="text"
                          value={newProd.length || ''}
                          onChange={(e) => setNewProd({ ...newProd, length: e.target.value })}
                          placeholder="e.g. 44 Inches, Calf Length, Floor Length"
                          className="w-full px-3 py-2 border rounded-xl font-medium"
                        />
                        <p className="text-[10px] text-gray-500 mt-1">If left blank, length will not be shown on the website.</p>
                      </div>
                    </div>

                    {/* Dedicated Size Selection & Manual Per-Size Units Inventory Manager */}
                    <div className="pt-1">
                      <SizeInventoryManager
                        selectedSizes={newProd.sizes}
                        sizeStock={newProd.sizeStock || {}}
                        onChange={(sizes, sizeStock, totalUnits) => {
                          setNewProd({
                            ...newProd,
                            sizes,
                            sizeStock,
                            stockCount: totalUnits
                          });
                        }}
                      />
                    </div>

                    {/* Real Item Color Variants & Multi-Photo Manager */}
                    <div className="space-y-4 bg-gradient-to-r from-pink-50/70 to-amber-50/50 p-4 rounded-2xl border border-pink-200">
                      {/* Primary Product Color Variant Name Field */}
                      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border-2 border-pink-200/90 shadow-xs space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <label className="font-extrabold text-xs text-pink-950 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-pink-700" />
                            <span>Primary Color Variant Name</span>
                            <span className="text-[10px] font-normal text-gray-500 lowercase">(optional)</span>
                          </label>
                          <span className="text-[10px] text-gray-500 font-medium italic">
                            Leave blank if item has no other color variants
                          </span>
                        </div>
                        <input
                          type="text"
                          value={newProd.primaryColorName}
                          onChange={(e) => setNewProd({ ...newProd, primaryColorName: e.target.value })}
                          placeholder="e.g. Royal Maroon, Rani Pink, Peacock Blue (or leave blank)"
                          className="w-full px-3.5 py-2.5 border border-pink-200 rounded-xl text-xs font-bold text-gray-900 bg-pink-50/20 focus:bg-white focus:border-pink-600 focus:outline-hidden transition-all"
                        />
                        <p className="text-[11px] text-gray-600 leading-relaxed">
                          {newProd.primaryColorName.trim() ? (
                            <span className="text-pink-900 font-semibold flex items-center gap-1">
                              <span>⭐</span>
                              <span>
                                This primary product will show <strong>first</strong> in the product page as <strong>"{newProd.primaryColorName.trim()}"</strong> with its main gallery photos, alongside the other color variants below.
                              </span>
                            </span>
                          ) : (
                            <span>
                              ℹ️ If this product doesn't have any other color variants, leave this field blank and the main website won't show any color variant name for this product. If you add other color variants below, enter a name here so this primary product shows first.
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-pink-200/60">
                        <div>
                          <label className="font-extrabold text-xs text-pink-950 uppercase tracking-wider flex items-center gap-1.5">
                            <Palette className="w-4 h-4 text-pink-700" />
                            <span>Additional Color Variants & Photos ({newProd.colorVariants?.length || 0} Color Options)</span>
                          </label>
                          <p className="text-[11px] text-gray-600 mt-0.5">
                            Add extra color shades and upload separate photos (front, back, fabric detail) for each color option.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const cur = newProd.colorVariants || [];
                            const defaultSizes = (newProd.sizes && newProd.sizes.length > 0) ? [...newProd.sizes] : ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
                            const defaultStock: Record<string, number> = {};
                            defaultSizes.forEach(s => {
                              defaultStock[s] = newProd.sizeStock?.[s] !== undefined ? newProd.sizeStock[s] : 2;
                            });
                            const updated = [
                              ...cur,
                              {
                                name: '',
                                imageUrl: '',
                                images: [],
                                sizes: defaultSizes,
                                sizeStock: defaultStock,
                                stockCount: Object.values(defaultStock).reduce((a, b) => a + (Number(b) || 0), 0)
                              }
                            ];
                            setNewProd({
                              ...newProd,
                              colorVariants: updated,
                              colors: updated.map(v => v.name).filter(Boolean)
                            });
                          }}
                          className="px-3 py-1.5 bg-pink-900 hover:bg-pink-800 text-amber-200 font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1 shrink-0 active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5 text-amber-300" />
                          <span>Add Color Option</span>
                        </button>
                      </div>

                      {/* Variant List with Multi-Photo Upload */}
                      <div className="space-y-3">
                        {newProd.colorVariants && newProd.colorVariants.length > 0 ? (
                          newProd.colorVariants.map((v, vIdx) => {
                            const variantImages = (v.images && v.images.length > 0)
                              ? v.images
                              : (v.imageUrl ? [v.imageUrl] : []);

                            return (
                              <div key={vIdx} className="bg-white p-4 rounded-2xl border border-pink-200 shadow-xs space-y-3.5">
                                <div className="flex items-center justify-between gap-2 border-b border-pink-100 pb-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-pink-100 text-pink-900 text-[10px] flex items-center justify-center font-black">
                                      {vIdx + 1}
                                    </span>
                                    <span className="text-xs font-black text-pink-950">
                                      {v.name.trim() ? v.name : 'Untitled Color Shade'}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-900 font-extrabold rounded-full">
                                      {variantImages.length} {variantImages.length === 1 ? 'Photo' : 'Photos'}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = newProd.colorVariants.filter((_, i) => i !== vIdx);
                                      setNewProd({
                                        ...newProd,
                                        colorVariants: updated,
                                        colors: updated.map(item => item.name).filter(Boolean)
                                      });
                                    }}
                                    className="text-gray-400 hover:text-red-600 text-xs font-semibold flex items-center gap-1 p-1 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Remove Variant</span>
                                  </button>
                                </div>

                                <div className="space-y-3">
                                  {/* Color Shade Name Input */}
                                  <div>
                                    <label className="block text-[10px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                                      Color Shade Name *
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      value={v.name}
                                      onChange={(e) => {
                                        const updated = [...newProd.colorVariants];
                                        updated[vIdx] = { ...updated[vIdx], name: e.target.value };
                                        setNewProd({
                                          ...newProd,
                                          colorVariants: updated,
                                          colors: updated.map(item => item.name).filter(Boolean)
                                        });
                                      }}
                                      placeholder="e.g. Royal Maroon, Rani Pink, Peacock Teal, Mustard Yellow"
                                      className="w-full px-3 py-1.5 border border-pink-200 rounded-xl text-xs font-bold text-gray-900 bg-pink-50/20 focus:bg-white focus:border-pink-500 focus:outline-hidden"
                                    />
                                  </div>

                                  {/* Multi-Photo Upload & Direct URL Controls */}
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <label className="text-[10px] font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                                        <ImageIcon className="w-3 h-3 text-pink-700" />
                                        <span>Photos for this Color ({variantImages.length} uploaded)</span>
                                      </label>
                                      {uploadingVariantIdx === vIdx && (
                                        <span className="text-[10px] text-pink-700 font-bold flex items-center gap-1">
                                          <Loader2 className="w-3 h-3 animate-spin" /> Uploading ({variantProgress}%)...
                                        </span>
                                      )}
                                    </div>

                                    {/* Upload Buttons & Add URL Row */}
                                    <div className="flex flex-wrap items-center gap-2">
                                      <label className={`cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                                        uploadingVariantIdx === vIdx
                                          ? 'bg-pink-100 text-pink-700 border-pink-300 cursor-not-allowed'
                                          : 'bg-pink-900 hover:bg-pink-800 text-amber-200 border-pink-950 shadow-xs active:scale-95'
                                      }`}>
                                        <Upload className="w-3.5 h-3.5 text-amber-300" />
                                        <span>Upload Photos from Device (Select 1 or More)</span>
                                        <input
                                          type="file"
                                          multiple
                                          accept="image/*"
                                          className="hidden"
                                          disabled={uploadingVariantIdx !== null}
                                          onChange={(e) => handleVariantMultipleFilesUpload(vIdx, e)}
                                        />
                                      </label>
                                    </div>

                                    {/* Photos Grid Preview */}
                                    {variantImages.length > 0 ? (
                                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1">
                                        {variantImages.map((imgUrl, pIdx) => {
                                          const isPrimary = pIdx === 0;
                                          return (
                                            <div
                                              key={pIdx}
                                              className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 bg-gray-50 group transition-all ${
                                                isPrimary ? 'border-pink-600 ring-2 ring-pink-200' : 'border-gray-200'
                                              }`}
                                            >
                                              <img
                                                src={imgUrl}
                                                alt={`${v.name} photo ${pIdx + 1}`}
                                                className="w-full h-full object-cover object-top"
                                                referrerPolicy="no-referrer"
                                              />
                                              
                                              {/* Primary Badge */}
                                              {isPrimary && (
                                                <div className="absolute top-1 left-1 bg-pink-700 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow">
                                                  Main
                                                </div>
                                              )}

                                              {/* Overlay actions */}
                                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                                                {!isPrimary && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleSetPrimaryVariantPhoto(vIdx, pIdx)}
                                                    className="px-1.5 py-0.5 bg-amber-400 text-pink-950 text-[9px] font-black rounded hover:bg-amber-300 transition-colors"
                                                    title="Make primary photo for this color"
                                                  >
                                                    Set Main
                                                  </button>
                                                )}
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveVariantPhoto(vIdx, pIdx)}
                                                  className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                                  title="Delete photo"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="p-3 bg-pink-50/50 rounded-xl border border-dashed border-pink-200 text-center">
                                        <p className="text-[11px] text-gray-500 font-medium">
                                          No photos added for this color yet. Click "Upload Photos" above to add front, back, or detail shots.
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Dedicated Size Selection & Manual Unit Inventory for this Color Variant */}
                                  <div className="pt-3 border-t border-pink-200/80">
                                    <SizeInventoryManager
                                      idPrefix={`new-variant-sizes-${vIdx}`}
                                      title={`Size Selection & Units for ${v.name.trim() || `Color Option #${vIdx + 1}`}`}
                                      subtitle={`Choose active sizes and manually configure inventory units strictly for the "${v.name.trim() || `Color Option #${vIdx + 1}`}" variant.`}
                                      badgeLabel={`${v.name.trim() || `Color #${vIdx + 1}`} Stock`}
                                      selectedSizes={v.sizes !== undefined ? v.sizes : (newProd.sizes || ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'])}
                                      sizeStock={v.sizeStock || {}}
                                      onChange={(sizes, sizeStock, totalUnits) => {
                                        const updated = [...newProd.colorVariants];
                                        updated[vIdx] = {
                                          ...updated[vIdx],
                                          sizes,
                                          sizeStock,
                                          stockCount: totalUnits
                                        };
                                        setNewProd({
                                          ...newProd,
                                          colorVariants: updated
                                        });
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center p-4 bg-white/70 rounded-xl border border-pink-200/80">
                            <Palette className="w-6 h-6 text-pink-400 mx-auto mb-1" />
                            <p className="text-xs text-gray-600 font-semibold">
                              No color variants created yet. Click "Add Color Variant" above to write shade names manually and upload item images from your device.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <MarkdownEditor
                      id="new-product-description"
                      label="Product Description & Craftsmanship Story (Markdown Supported)"
                      value={newProd.description}
                      onChange={(val) => setNewProd({ ...newProd, description: val })}
                      rows={5}
                      required
                    />

                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Care Instructions (Optional)</label>
                      <input
                        type="text"
                        value={newProd.careInstructions || ''}
                        onChange={(e) => setNewProd({ ...newProd, careInstructions: e.target.value })}
                        placeholder="e.g. Dry clean only. Store wrapped in muslin cloth."
                        className="w-full px-3 py-2 border rounded-xl font-medium"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">If left empty, no care instructions will be displayed on the product page.</p>
                    </div>

                    {/* Multi-Image Gallery Manager with Device Upload */}
                    <div className="space-y-3 bg-pink-50/40 p-4 rounded-2xl border border-pink-100">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <label className="font-extrabold text-xs text-pink-950 uppercase tracking-wider flex items-center gap-1.5">
                            <ImagePlus className="w-4 h-4 text-pink-700" />
                            <span>Item Image Gallery ({newProd.images.length} {newProd.images.length === 1 ? 'Image' : 'Images'})</span>
                          </label>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Upload photos directly from your device. Images are automatically saved to database. Photo #1 serves as the cover photo.
                          </p>
                        </div>
                        
                        <label className={`cursor-pointer px-4 py-2 bg-gradient-to-r from-pink-900 to-pink-950 hover:from-pink-800 hover:to-pink-900 text-amber-200 font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-2 shrink-0 border border-amber-300/30 ${
                          uploadingGallery ? 'opacity-70 pointer-events-none' : ''
                        }`}>
                          {uploadingGallery ? (
                            <>
                              <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                              <span>Uploading ({galleryProgress}%)...</span>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="w-4 h-4 text-amber-300" />
                              <span>Upload Images from Device</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            disabled={uploadingGallery}
                            onChange={handleGalleryFilesUpload}
                          />
                        </label>
                      </div>

                      {uploadingGallery && (
                        <div className="p-3 bg-pink-900 text-amber-200 rounded-xl space-y-1.5 text-xs">
                          <div className="flex items-center justify-between font-bold text-[11px]">
                            <span className="flex items-center gap-1.5">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                              <span>Uploading to database...</span>
                            </span>
                            <span>{galleryProgress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-pink-950 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-amber-400 to-amber-200 transition-all duration-300" style={{ width: `${galleryProgress}%` }} />
                          </div>
                        </div>
                      )}

                      <div className="space-y-2.5">
                        {newProd.images.length > 0 ? (
                          newProd.images.map((imgUrl, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-pink-200 shadow-xs">
                              {/* Live Thumbnail Preview */}
                              <div className="w-12 h-14 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shrink-0 relative flex items-center justify-center text-gray-300">
                                {imgUrl.trim() ? (
                                  <img
                                    src={imgUrl}
                                    alt={`Preview ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <Image className="w-5 h-5 text-gray-300" />
                                )}
                                {idx === 0 && (
                                  <span className="absolute bottom-0 inset-x-0 bg-pink-950/90 text-amber-300 text-[8px] font-black uppercase text-center py-0.5">
                                    Cover
                                  </span>
                                )}
                              </div>

                              {/* Image Information & Replace from device */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-bold text-gray-700 flex items-center gap-1">
                                    <span>{idx === 0 ? 'Cover Photo (Main)' : `Gallery Image #${idx + 1}`}</span>
                                    <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5">
                                      <CheckCircle className="w-2.5 h-2.5" /> Firebase Storage
                                    </span>
                                  </span>
                                  {idx > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...newProd.images];
                                        const [chosen] = updated.splice(idx, 1);
                                        updated.unshift(chosen);
                                        setNewProd({ ...newProd, images: updated });
                                      }}
                                      className="text-[10px] text-pink-700 hover:text-pink-950 font-bold hover:underline"
                                    >
                                      Set as Main Cover
                                    </button>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="cursor-pointer text-[11px] font-semibold text-pink-800 hover:text-pink-950 hover:underline flex items-center gap-1">
                                    <Upload className="w-3 h-3 text-pink-700" />
                                    <span>Replace this image from device</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => handleSingleGalleryFileUpload(idx, e)}
                                    />
                                  </label>
                                </div>
                              </div>

                              {/* Actions: Move & Delete */}
                              <div className="flex items-center gap-1 shrink-0">
                                {idx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...newProd.images];
                                      [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
                                      setNewProd({ ...newProd, images: updated });
                                    }}
                                    className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded"
                                    title="Move Up"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {idx < newProd.images.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...newProd.images];
                                      [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
                                      setNewProd({ ...newProd, images: updated });
                                    }}
                                    className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded"
                                    title="Move Down"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = newProd.images.filter((_, i) => i !== idx);
                                    setNewProd({ ...newProd, images: updated });
                                  }}
                                  className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded"
                                  title="Remove Image"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center p-6 bg-white rounded-xl border border-dashed border-pink-200">
                            <UploadCloud className="w-8 h-8 text-pink-400 mx-auto mb-1.5" />
                            <p className="text-xs font-bold text-pink-950">No product photos added yet</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">Click the "Upload Images from Device" button above to select product photos.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isPublishingProduct}
                      className={`w-full bg-pink-900 hover:bg-pink-800 text-amber-200 font-extrabold py-3 px-4 rounded-2xl shadow-lg transition-all text-xs flex items-center justify-center gap-2 border border-amber-300/30 ${
                        isPublishingProduct ? 'opacity-75 cursor-not-allowed' : ''
                      }`}
                    >
                      {isPublishingProduct ? (
                        <>
                          <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                          <span>Publishing Item to Catalog...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 text-amber-300" />
                          <span>Publish Item to Catalog & Store</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 2.5: Hero Banners Management */}
              {activeTab === 'banners' && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-pink-900 via-pink-950 to-pink-900 text-amber-200 p-5 rounded-3xl border border-amber-400/30 shadow-lg flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="font-extrabold text-base text-amber-100 font-serif flex items-center gap-2">
                        <LayoutTemplate className="w-5 h-5 text-amber-300" />
                        <span>Hero Section Banner Manager & Shop Now Link Setup</span>
                      </h3>
                      <p className="text-xs text-amber-200/80 mt-1">
                        Upload custom high-res hero banners from your device, configure the Shop Now button destination link/category/collection, and publish live to your homepage.
                      </p>
                    </div>
                  </div>

                  {/* Alert Notifications */}
                  {bannerError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold p-3.5 rounded-2xl flex items-start gap-2.5 shadow-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{bannerError}</span>
                    </div>
                  )}

                  {bannerSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3.5 rounded-2xl flex items-start gap-2.5 shadow-xs">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{bannerSuccess}</span>
                    </div>
                  )}

                  {/* Banner Creation / Edit Form */}
                  <div
                    id="hero-banner-editor-form"
                    className={`p-5 rounded-3xl transition-all duration-200 shadow-xs space-y-4 text-xs ${
                      editingBannerId
                        ? 'bg-white border-2 border-amber-400 shadow-md ring-4 ring-amber-300/20'
                        : 'bg-white border border-pink-200'
                    }`}
                  >
                    {/* Active Edit Mode Alert Banner */}
                    {editingBannerId && (
                      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-amber-950">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                          <div>
                            <span className="font-extrabold text-xs block text-amber-950">Active Edit Mode</span>
                            <span className="text-[11px] text-amber-800">
                              Editing hero banner slide: <strong>"{bannerForm.title || editingBannerId}"</strong>
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBannerId(null);
                            setBannerForm({
                              tag: 'NEW ARRIVAL SPOTLIGHT',
                              title: '',
                              description: '',
                              image: '',
                              ctaText: 'Shop Now',
                              ctaLink: '',
                              targetCollection: 'All',
                              targetCategory: 'All'
                            });
                            setBannerError(null);
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                        >
                          ✕ Cancel Editing
                        </button>
                      </div>
                    )}

                    <h4 className="font-extrabold text-xs text-pink-950 uppercase tracking-wider flex items-center justify-between border-b border-pink-100 pb-3">
                      <span className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-pink-700" />
                        <span>{editingBannerId ? 'Edit Hero Banner Slide' : 'Add New Hero Banner Slide'}</span>
                      </span>
                      {editingBannerId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBannerId(null);
                            setBannerForm({
                              tag: 'NEW ARRIVAL SPOTLIGHT',
                              title: '',
                              description: '',
                              image: '',
                              ctaText: 'Shop Now',
                              ctaLink: '',
                              targetCollection: 'All',
                              targetCategory: 'All'
                            });
                            setBannerError(null);
                          }}
                          className="text-[10px] text-gray-500 hover:text-gray-800 underline font-normal cursor-pointer"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </h4>

                    <form onSubmit={handleSaveBannerSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-gray-700 block mb-1">Banner Tagline / Eyebrow Caption</label>
                          <input
                            type="text"
                            required
                            value={bannerForm.tag || ''}
                            onChange={(e) => setBannerForm({ ...bannerForm, tag: e.target.value })}
                            placeholder="e.g. GRAND FESTIVE COLLECTION 2026"
                            className="w-full px-3 py-2 border rounded-xl font-semibold text-pink-900 bg-pink-50/20"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-gray-700 block mb-1">Headline Title *</label>
                          <input
                            type="text"
                            required
                            value={bannerForm.title || ''}
                            onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                            placeholder="e.g. Royal Chanderi Silk Sarees"
                            className="w-full px-3 py-2 border rounded-xl font-bold text-gray-900"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <label className="font-bold text-gray-700 block text-xs">
                            Hero Banner Visual — 16:9 Aspect Ratio (1920×1080 recommended) *
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full text-[10px] font-bold border border-rose-200">
                              Max 1 MB strictly restricted
                            </span>
                            {bannerForm.image && (
                              <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                                <CheckCircle className="w-3 h-3" /> 16:9 Image Attached
                              </span>
                            )}
                          </div>
                        </div>

                        <label className={`cursor-pointer flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-2xl transition-all ${
                          uploadingBanner
                            ? 'border-pink-300 bg-pink-50/50 pointer-events-none'
                            : 'border-pink-300 hover:border-pink-500 bg-pink-50/30 hover:bg-pink-50'
                        }`}>
                          {uploadingBanner ? (
                            <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                              <Loader2 className="w-5 h-5 text-pink-700 animate-spin" />
                              <span className="text-xs text-pink-900 font-bold">Uploading to Firebase Storage ({bannerProgress}%)...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1 py-1 text-center">
                              <div className="flex items-center gap-2">
                                <Upload className="w-4 h-4 text-pink-700" />
                                <span className="text-xs font-bold text-pink-950">
                                  {bannerForm.image ? 'Choose Replacement 16:9 Banner from Device' : 'Click to Upload 16:9 Banner Image from Device'}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-500 font-medium">
                                Accepts JPG, PNG, WebP • Strict 1 MB file size limit enforced
                              </span>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingBanner}
                            onChange={handleBannerFileUpload}
                          />
                        </label>

                        {/* Direct Image URL input as an alternative or quick edit */}
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[11px] font-bold text-gray-500 shrink-0">Or Image URL:</span>
                          <input
                            type="text"
                            value={bannerForm.image || ''}
                            onChange={(e) => setBannerForm(prev => ({ ...prev, image: e.target.value }))}
                            placeholder="https://images.unsplash.com/... or /api/images/..."
                            className="w-full px-3 py-1.5 border border-pink-200 rounded-xl text-xs font-mono bg-white text-gray-800"
                          />
                        </div>

                        {bannerForm.image && (
                          <div className="mt-2 aspect-[16/9] w-full max-w-lg rounded-2xl overflow-hidden border border-pink-200 bg-gray-950 relative shadow-inner">
                            <img
                              src={bannerForm.image}
                              alt="Banner preview"
                              className="w-full h-full object-cover opacity-90"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent p-4 flex flex-col justify-between text-white pointer-events-none">
                              <div className="flex items-center gap-2">
                                <span className="w-4 h-[2px] bg-amber-400 inline-block" />
                                <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
                                  {bannerForm.tag || 'CANDID CAPTURE MOMENTS'}
                                </span>
                              </div>
                              <div>
                                <h4 className="font-serif text-lg text-white font-normal line-clamp-1">
                                  {bannerForm.title || 'Capturing fleeting moments of time.'}
                                </h4>
                                <span className="mt-2 inline-block bg-white text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                                  {bannerForm.ctaText || 'EXPLORE PORTFOLIO'} →
                                </span>
                              </div>
                            </div>
                            <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                              <span className="bg-black/70 text-amber-200 text-[9px] font-bold px-2 py-0.5 rounded-md shadow-xs border border-amber-400/30">
                                16:9 Preview
                              </span>
                              <button
                                type="button"
                                onClick={() => setBannerForm(prev => ({ ...prev, image: '' }))}
                                className="p-1 bg-red-600 text-white rounded-md hover:bg-red-700 shadow-xs cursor-pointer"
                                title="Remove Banner"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* CTA Configuration & Destination Link */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-pink-50/50 p-3.5 rounded-2xl border border-pink-200">
                        <div className="sm:col-span-4">
                          <label className="font-bold text-gray-700 block mb-1">CTA Button Text</label>
                          <input
                            type="text"
                            required
                            value={bannerForm.ctaText || 'Shop Now'}
                            onChange={(e) => setBannerForm({ ...bannerForm, ctaText: e.target.value })}
                            className="w-full px-3 py-2 border rounded-xl font-bold text-gray-800 bg-white"
                          />
                        </div>

                        <div className="sm:col-span-8 space-y-1.5">
                          <label className="font-bold text-gray-700 block mb-1">
                            Shop Now Button Destination Link (URL or Store Page)
                          </label>
                          <input
                            type="text"
                            value={bannerForm.ctaLink || ''}
                            onChange={(e) => setBannerForm({ ...bannerForm, ctaLink: e.target.value })}
                            placeholder="e.g. /category/kurti, /collection/firdausi, https://..., #products-grid"
                            className="w-full px-3 py-2 border rounded-xl font-mono text-xs font-semibold text-pink-950 bg-white"
                          />

                          <div className="flex flex-wrap gap-1 pt-1">
                            <span className="text-[10px] text-gray-500 font-bold mr-1 self-center">Presets:</span>
                            {[
                              { label: 'All Products', link: '#products-grid' },
                              { label: 'Kurtis', link: '/kurti' },
                              { label: 'Sharees', link: '/sharee' },
                              { label: 'Dress Materials', link: '/dress-materials' },
                              { label: 'Indo Western', link: '/indo-western' },
                              { label: 'Suits', link: '/suit' },
                              { label: 'New Arrivals', link: '/new-arrivals' },
                              { label: 'Live Flash Sale', link: '/sales-on-live' },
                              { label: 'Jashn', link: '/jashn' },
                              { label: 'Firdausi', link: '/firdausi' },
                            ].map((preset) => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => setBannerForm(prev => ({ ...prev, ctaLink: preset.link }))}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                  bannerForm.ctaLink === preset.link
                                    ? 'bg-pink-900 text-amber-200 border-pink-950'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-pink-100 hover:text-pink-950'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-gray-700 block mb-1">Target Collection Filter (Fallback)</label>
                          <select
                            value={bannerForm.targetCollection || 'All'}
                            onChange={(e) => setBannerForm({ ...bannerForm, targetCollection: e.target.value as CollectionType })}
                            className="w-full px-3 py-2 border rounded-xl bg-white font-semibold"
                          >
                            <option value="All">All Collections</option>
                            <option value="Firdausi collection">Firdausi collection</option>
                            <option value="Nazneen Collection">Nazneen Collection</option>
                            <option value="Aalishan Silk Edition">Aalishan Silk Edition</option>
                            <option value="Festive Zari Weaves">Festive Zari Weaves</option>
                          </select>
                        </div>

                        <div>
                          <label className="font-bold text-gray-700 block mb-1">Target Category Filter (Fallback)</label>
                          <select
                            value={bannerForm.targetCategory || 'All'}
                            onChange={(e) => setBannerForm({ ...bannerForm, targetCategory: e.target.value as CategoryType })}
                            className="w-full px-3 py-2 border rounded-xl bg-white font-semibold"
                          >
                            <option value="All">All Categories</option>
                            <option value="Kurti">Kurti</option>
                            <option value="Sharee">Sharee</option>
                            <option value="Dress Materials">Dress Materials</option>
                            <option value="Indo Western dress">Indo Western dress</option>
                            <option value="Suit">Suit</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-gray-700 block mb-1">Sub-heading Description</label>
                        <textarea
                          rows={2}
                          value={bannerForm.description || ''}
                          onChange={(e) => setBannerForm({ ...bannerForm, description: e.target.value })}
                          placeholder="e.g. Handwoven with gold & silver zari motifs. Flat 20% OFF today."
                          className="w-full px-3 py-2 border rounded-xl font-medium"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={bannerSaving}
                        className={`w-full font-extrabold py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs cursor-pointer ${
                          editingBannerId
                            ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'
                            : 'bg-pink-900 hover:bg-pink-800 text-amber-200'
                        }`}
                      >
                        {bannerSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Saving Changes...</span>
                          </>
                        ) : editingBannerId ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-white" />
                            <span>Save & Update Hero Banner (Live)</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 text-amber-300" />
                            <span>Publish Hero Banner to Website</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Active Banners Grid */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-xs text-pink-950 uppercase tracking-wider flex items-center gap-2">
                        <span>Active Hero Banners ({banners.length})</span>
                        {banners.length > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                      </h4>
                    </div>

                    {banners.length === 0 ? (
                      <div className="bg-white border border-dashed border-pink-300 rounded-3xl p-8 text-center space-y-2">
                        <Sliders className="w-8 h-8 text-pink-400 mx-auto" />
                        <p className="font-extrabold text-sm text-pink-950">No Custom Hero Banners Added Yet</p>
                        <p className="text-xs text-gray-500 max-w-md mx-auto">
                          Upload a hero banner image using the form above to showcase on your homepage and configure custom Shop Now links.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {banners.map((b) => {
                          const isCurrentlyEditing = b.id === editingBannerId;
                          return (
                            <div
                              key={b.id}
                              className={`bg-white rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between transition-all ${
                                isCurrentlyEditing
                                  ? 'border-2 border-amber-400 ring-4 ring-amber-300/30'
                                  : 'border border-pink-200'
                              }`}
                            >
                              <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-950">
                                <img src={b.image} alt={b.title} className="w-full h-full object-cover opacity-85" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent p-4 flex flex-col justify-between text-white">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-3 h-[1.5px] bg-amber-400 inline-block" />
                                      <span className="text-[9px] font-black uppercase tracking-widest text-amber-300">
                                        {b.tag || 'CANDID CAPTURE MOMENTS'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {isCurrentlyEditing && (
                                        <span className="text-[9px] font-black bg-amber-500 text-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                          Editing
                                        </span>
                                      )}
                                      <span className="text-[9px] font-bold bg-black/60 text-white/80 px-1.5 py-0.5 rounded border border-white/20">
                                        16:9 Widescreen
                                      </span>
                                    </div>
                                  </div>
                                  <div>
                                    <h5 className="font-serif font-normal text-base text-white line-clamp-1">{b.title}</h5>
                                    {b.description && <p className="text-[11px] text-white/80 line-clamp-1 font-light">{b.description}</p>}
                                  </div>
                                </div>
                              </div>

                              <div className="p-3 bg-pink-50/50 flex flex-col gap-2 text-xs border-t border-pink-100">
                                <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-gray-600 font-semibold">
                                  <div className="flex items-center gap-1.5">
                                    <span className="bg-white px-2 py-0.5 rounded border border-gray-200 font-bold text-pink-950">
                                      CTA: {b.ctaText || 'Shop Now'}
                                    </span>
                                    {b.ctaLink && (
                                      <span className="bg-amber-100 text-pink-950 px-2 py-0.5 rounded border border-amber-200 font-mono">
                                        Link: {b.ctaLink}
                                      </span>
                                    )}
                                  </div>
                                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[9px] font-bold">
                                    Live on Website
                                  </span>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-1 border-t border-pink-100/60">
                                  <button
                                    type="button"
                                    onClick={() => handleEditBannerClick(b)}
                                    className={`px-3 py-1 font-bold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                                      isCurrentlyEditing
                                        ? 'bg-amber-500 text-black shadow-xs font-extrabold'
                                        : 'bg-pink-100 hover:bg-pink-200 text-pink-900'
                                    }`}
                                  >
                                    <Edit className="w-3 h-3" />
                                    <span>{isCurrentlyEditing ? 'Editing Now' : 'Edit'}</span>
                                  </button>
                                  {onDeleteBanner && (
                                    <button
                                      type="button"
                                      onClick={() => setDeleteConfirmBanner(b)}
                                      className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                                      title="Delete Hero Banner"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'coupons' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Create / Schedule Coupon Form */}
                  <div className="lg:col-span-5 bg-pink-50/70 p-5 sm:p-6 rounded-3xl border border-pink-200 shadow-sm space-y-4 text-xs">
                    <div className="flex items-center justify-between border-b border-pink-200/80 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-pink-900 text-amber-300 flex items-center justify-center font-bold">
                          <Tag className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-pink-950">Create & Schedule Coupon</h4>
                          <p className="text-[11px] text-gray-500 font-medium">Manage coupon name, validity dates, occasion & website popup</p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleSavePromo} className="space-y-3.5">
                      {/* Coupon Name & Code */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="font-bold text-gray-800 block mb-1">Coupon Title / Name</label>
                          <input
                            type="text"
                            value={newPromo.name || ''}
                            onChange={(e) => setNewPromo({ ...newPromo, name: e.target.value })}
                            placeholder="e.g. Grand Festive Celebration"
                            className="w-full px-3 py-2 border border-pink-200 rounded-xl font-bold text-pink-950 bg-white"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-gray-800 block mb-1">Coupon Code *</label>
                          <input
                            type="text"
                            required
                            value={newPromo.code}
                            onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                            placeholder="e.g. FESTIVE25"
                            className="w-full px-3 py-2 border border-pink-200 rounded-xl font-mono font-black text-pink-900 bg-white tracking-wider"
                          />
                        </div>
                      </div>

                      {/* Discount Type, Value & Min Order */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="font-bold text-gray-700 block mb-1">Discount Type</label>
                          <select
                            value={newPromo.discountType}
                            onChange={(e) => setNewPromo({ ...newPromo, discountType: e.target.value as 'percent' | 'flat' })}
                            className="w-full px-2 py-2 border border-pink-200 rounded-xl bg-white font-medium"
                          >
                            <option value="percent">Percentage (%)</option>
                            <option value="flat">Flat Cash (₹)</option>
                          </select>
                        </div>

                        <div>
                          <label className="font-bold text-gray-700 block mb-1">
                            {newPromo.discountType === 'percent' ? 'Discount %' : 'Flat Amount (₹)'}
                          </label>
                          <input
                            type="number"
                            required
                            min={1}
                            value={newPromo.discountValue}
                            onChange={(e) => setNewPromo({ ...newPromo, discountValue: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-pink-200 rounded-xl font-black text-pink-900 bg-white"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-gray-700 block mb-1">Min Order (₹)</label>
                          <input
                            type="number"
                            min={0}
                            value={newPromo.minOrderValue}
                            onChange={(e) => setNewPromo({ ...newPromo, minOrderValue: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-pink-200 rounded-xl font-bold bg-white"
                          />
                        </div>
                      </div>

                      {/* Scheduling: Validity Start & Expiry */}
                      <div className="p-3 bg-white rounded-2xl border border-pink-200 space-y-2">
                        <div className="flex items-center gap-1.5 text-pink-950 font-extrabold text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-pink-700" />
                          <span>Schedule Validity & Expiry Timelines</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-semibold text-gray-600 block mb-0.5 text-[10px]">Valid From Date</label>
                            <input
                              type="date"
                              value={newPromo.validFrom ? newPromo.validFrom.split('T')[0] : ''}
                              onChange={(e) => setNewPromo({ ...newPromo, validFrom: e.target.value })}
                              className="w-full px-2 py-1.5 border rounded-lg bg-pink-50/40 text-xs font-medium"
                            />
                          </div>

                          <div>
                            <label className="font-semibold text-gray-600 block mb-0.5 text-[10px]">Expiry Date (Valid Until)</label>
                            <input
                              type="date"
                              value={newPromo.validUntil ? newPromo.validUntil.split('T')[0] : ''}
                              onChange={(e) => setNewPromo({ ...newPromo, validUntil: e.target.value })}
                              className="w-full px-2 py-1.5 border rounded-lg bg-pink-50/40 text-xs font-medium"
                            />
                          </div>
                        </div>
                      </div>

                      {/* WHY Admin is giving the coupon code / sale */}
                      <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="font-extrabold text-amber-950 flex items-center gap-1.5 text-[11px]">
                            <Gift className="w-3.5 h-3.5 text-amber-700" />
                            <span>Why Give This Coupon/Sale (Visitor Context)</span>
                          </label>
                          <span className="text-[9px] font-bold text-amber-800 bg-amber-200/70 px-1.5 py-0.5 rounded">Shown in Popup</span>
                        </div>

                        <textarea
                          rows={2}
                          value={newPromo.reasonForSale || ''}
                          onChange={(e) => setNewPromo({ ...newPromo, reasonForSale: e.target.value })}
                          placeholder="e.g. Celebrating our Grand Festive launch & patron appreciation with royal handloom savings."
                          className="w-full px-3 py-2 border border-amber-300 rounded-xl bg-white text-xs font-medium text-gray-900"
                        />

                        {/* Quick Preset Buttons */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-amber-900">Quick Occasion Presets:</span>
                          <div className="flex flex-wrap gap-1">
                            {SALE_REASON_PRESETS.map((preset, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setNewPromo({ ...newPromo, reasonForSale: preset })}
                                className="text-[10px] bg-white hover:bg-amber-100 text-amber-950 font-semibold px-2 py-0.5 rounded-lg border border-amber-300 transition-colors text-left"
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Website Popup Announcement Controls */}
                      <div className="p-3 bg-rose-50/70 rounded-2xl border border-rose-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="font-extrabold text-rose-950 flex items-center gap-1.5 text-[11px]">
                            <Megaphone className="w-3.5 h-3.5 text-rose-600" />
                            <span>Show Custom Popup Message on Website</span>
                          </label>
                          <input
                            type="checkbox"
                            checked={newPromo.showPopupAnnouncement || false}
                            onChange={(e) => setNewPromo({ ...newPromo, showPopupAnnouncement: e.target.checked })}
                            className="w-4 h-4 accent-pink-700 cursor-pointer rounded"
                          />
                        </div>

                        {newPromo.showPopupAnnouncement && (
                          <div className="space-y-2 pt-1 border-t border-rose-200">
                            <div>
                              <label className="font-bold text-gray-700 block mb-0.5 text-[10px]">Popup Headline Title</label>
                              <input
                                type="text"
                                value={newPromo.popupTitle || ''}
                                onChange={(e) => setNewPromo({ ...newPromo, popupTitle: e.target.value })}
                                placeholder="🌸 Grand Festive Celebration Sale & Special Coupon!"
                                className="w-full px-2.5 py-1.5 border rounded-lg bg-white text-xs font-bold"
                              />
                            </div>
                            <div>
                              <label className="font-bold text-gray-700 block mb-0.5 text-[10px]">Popup Badge Tag</label>
                              <input
                                type="text"
                                value={newPromo.popupBadge || ''}
                                onChange={(e) => setNewPromo({ ...newPromo, popupBadge: e.target.value })}
                                placeholder="GRAND FESTIVE SPECIAL"
                                className="w-full px-2.5 py-1.5 border rounded-lg bg-white text-xs font-bold text-pink-900"
                              />
                            </div>
                            <div>
                              <label className="font-bold text-gray-700 block mb-0.5 text-[10px]">Popup Custom Message</label>
                              <textarea
                                rows={2}
                                value={newPromo.popupMessage || ''}
                                onChange={(e) => setNewPromo({ ...newPromo, popupMessage: e.target.value })}
                                placeholder="Enjoy exclusive savings on authentic handloom sarees, kurtis & designer salwar suits."
                                className="w-full px-2.5 py-1.5 border rounded-lg bg-white text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Collection Restriction & Description */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="font-bold text-gray-700 block mb-1">Collection Restriction</label>
                          <select
                            value={newPromo.collectionRestricted || ''}
                            onChange={(e) => setNewPromo({ 
                              ...newPromo, 
                              collectionRestricted: e.target.value ? (e.target.value as CollectionType) : undefined 
                            })}
                            className="w-full px-2 py-1.5 border rounded-xl bg-white font-medium text-xs"
                          >
                            <option value="">All Collections (Storewide)</option>
                            <option value="Jashn Collection">Jashn Collection (Wedding & Festive)</option>
                            <option value="Firdausi collection">Firdausi collection (Royal Silk)</option>
                            <option value="9 to fivers collection">9 to fivers collection (Workwear)</option>
                            <option value="'Present is Gifted' Collection">'Present is Gifted' Collection (Hampers)</option>
                            <option value="'Deal maange more' Collection">'Deal maange more' Collection (Budget)</option>
                          </select>
                        </div>

                        <div>
                          <label className="font-bold text-gray-700 block mb-1">Short Description</label>
                          <input
                            type="text"
                            value={newPromo.description}
                            onChange={(e) => setNewPromo({ ...newPromo, description: e.target.value })}
                            placeholder="e.g. Extra 15% OFF across catalog"
                            className="w-full px-3 py-1.5 border rounded-xl bg-white text-xs"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={couponSaving}
                        className="w-full bg-pink-900 hover:bg-pink-800 text-amber-200 font-extrabold py-3 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 mt-2 text-xs"
                      >
                        <Tag className="w-4 h-4 text-amber-300" />
                        <span>{couponSaving ? 'Saving Coupon...' : 'Activate & Save Scheduled Coupon'}</span>
                      </button>
                    </form>
                  </div>

                  {/* List of Active, Scheduled, & Expired Coupons */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-pink-950 uppercase tracking-wider">
                          Store Coupons & Validity Timelines ({promos.length})
                        </h4>
                        <p className="text-[11px] text-gray-500 font-medium">Coupons with reasons for sale, validity schedules, & website popups</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[700px] overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pr-1">
                      {promos.map((promo) => {
                        const now = new Date();
                        const startDate = promo.validFrom ? new Date(promo.validFrom.includes('T') ? promo.validFrom : promo.validFrom + 'T00:00:00') : null;
                        const endDate = promo.validUntil ? new Date(promo.validUntil.includes('T') ? promo.validUntil : promo.validUntil + 'T23:59:59') : null;
                        
                        const isExpired = endDate ? now > endDate : false;
                        const isUpcoming = startDate ? now < startDate : false;
                        const isValid = promo.active && !isExpired && !isUpcoming;

                        return (
                          <div
                            key={promo.code}
                            className={`p-4 rounded-3xl border bg-white shadow-xs space-y-3 relative overflow-hidden transition-all hover:shadow-md ${
                              isValid ? 'border-pink-300 ring-1 ring-pink-100' : isExpired ? 'border-gray-200 opacity-60' : 'border-amber-300 bg-amber-50/20'
                            }`}
                          >
                            {/* Top row: Code + Status Badge */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-sm text-pink-950 bg-pink-100/90 px-3 py-1 rounded-xl border border-pink-200 shadow-2xs">
                                  {promo.code}
                                </span>
                                {promo.showPopupAnnouncement && (
                                  <span className="bg-rose-100 text-rose-800 text-[9px] font-black px-2 py-0.5 rounded-full border border-rose-300 flex items-center gap-1" title="Website Popup Enabled">
                                    <Megaphone className="w-2.5 h-2.5 text-rose-600" /> POPUP
                                  </span>
                                )}
                              </div>

                              <div>
                                {isValid ? (
                                  <span className="bg-emerald-100 text-emerald-900 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 shadow-2xs">
                                    <CheckCircle className="w-3 h-3 text-emerald-600" /> ACTIVE
                                  </span>
                                ) : isExpired ? (
                                  <span className="bg-gray-100 text-gray-600 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-gray-200">
                                    EXPIRED
                                  </span>
                                ) : (
                                  <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-amber-600" /> SCHEDULED
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Title and Discount */}
                            <div>
                              {promo.name && (
                                <h5 className="font-serif font-black text-xs text-pink-950 leading-snug">
                                  {promo.name}
                                </h5>
                              )}
                              <p className="text-sm font-black text-pink-800 mt-0.5">
                                {promo.discountType === 'percent' ? `${promo.discountValue}% OFF` : `₹${promo.discountValue} Flat Discount`}
                                {promo.collectionRestricted && (
                                  <span className="text-[10px] font-bold text-gray-500 ml-1.5">
                                    ({promo.collectionRestricted})
                                  </span>
                                )}
                                {(promo.categoriesRestricted?.length || promo.categoryRestricted) && (
                                  <span className="text-[10px] font-bold text-purple-700 ml-1.5">
                                    ({Array.isArray(promo.categoriesRestricted) ? promo.categoriesRestricted.join(' & ') : String(promo.categoryRestricted)})
                                  </span>
                                )}
                              </p>
                            </div>

                            {/* Reason for Sale if set */}
                            {promo.reasonForSale && (
                              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2 text-[10px] text-amber-950 font-medium leading-relaxed">
                                <span className="font-extrabold block text-amber-900 mb-0.5">Occasion / Reason:</span>
                                "{promo.reasonForSale}"
                              </div>
                            )}

                            {/* Timelines and Expiry Info */}
                            <div className="pt-2 border-t border-gray-100 text-[10px] text-gray-500 space-y-1">
                              <p className="flex items-center justify-between">
                                <span>Min Order:</span>
                                <span className="font-bold text-gray-800">₹{promo.minOrderValue}</span>
                              </p>
                              <p className="flex items-center justify-between">
                                <span>Valid Dates:</span>
                                <span className="font-semibold text-pink-900">
                                  {promo.validFrom ? promo.validFrom.split('T')[0] : 'Immediate'} → {promo.validUntil ? promo.validUntil.split('T')[0] : 'No Expiry'}
                                </span>
                              </p>
                            </div>

                            {/* Action Buttons: Preview Popup, Edit, Delete */}
                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-1">
                              <button
                                type="button"
                                onClick={() => setPreviewPromoModal(promo)}
                                className="text-[10px] font-bold text-pink-800 hover:text-pink-950 bg-pink-50 hover:bg-pink-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                                title="Preview website popup modal for this coupon"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Preview Popup</span>
                              </button>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingPromo(promo)}
                                  className="text-[10px] font-bold text-gray-700 hover:text-pink-900 bg-gray-50 hover:bg-pink-50 p-1.5 rounded-lg transition-colors flex items-center gap-1"
                                  title="Edit Coupon Details & Schedule"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>

                                {onDeletePromo && (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmPromo(promo)}
                                    className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                                    title="Delete Coupon"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 4: Live Flash Sale Controller */}
              {activeTab === 'flash_sale' && (
                <div className="max-w-2xl mx-auto bg-white p-6 rounded-3xl border border-pink-200 shadow-sm space-y-5">
                  <div className="flex items-center gap-3 border-b border-pink-100 pb-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-400 text-pink-950 font-black flex items-center justify-center">
                      <Zap className="w-6 h-6 text-pink-950" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-pink-950 font-serif">Live Flash Sale Controller</h3>
                      <p className="text-xs text-gray-500">Trigger storewide flash sales with custom extra discount percentages and ticker announcement banners.</p>
                    </div>
                  </div>

                  <form onSubmit={handleToggleLiveSale} className="space-y-4 text-xs">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Live Sale Announcement Title</label>
                      <input
                        type="text"
                        required
                        value={saleTitle}
                        onChange={(e) => setSaleTitle(e.target.value)}
                        placeholder="⚡ MIDNIGHT FLASH SALE: Extra 20% OFF on all Sarees!"
                        className="w-full px-3 py-2 border rounded-xl font-bold text-gray-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-gray-700 block mb-1">Sale Extra Discount %</label>
                        <input
                          type="number"
                          required
                          min={5}
                          max={90}
                          value={saleDiscount}
                          onChange={(e) => setSaleDiscount(Number(e.target.value))}
                          className="w-full px-3 py-2 border rounded-xl font-black text-pink-900 text-sm"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-gray-700 block mb-1">Sale Target Scope</label>
                        <select
                          value={saleTarget}
                          onChange={(e) => setSaleTarget(e.target.value as any)}
                          className="w-full px-3 py-2 border rounded-xl bg-white font-semibold"
                        >
                          <option value="all">All Products in Store</option>
                          <option value="category">Specific Category</option>
                          <option value="specific_items">Select Specific Items</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 flex items-center justify-between">
                      <div>
                        <p className="font-extrabold text-xs text-pink-950">Live Sale Switch</p>
                        <p className="text-[11px] text-gray-600">
                          {saleActive ? 'Flash sale is currently LIVE on store frontend!' : 'Flash sale is currently turned OFF.'}
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={saleSaving}
                        className={`px-5 py-2.5 rounded-2xl font-black text-xs shadow transition-all flex items-center gap-1.5 ${
                          saleActive
                            ? 'bg-rose-600 hover:bg-rose-700 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        <Zap className="w-4 h-4" />
                        <span>{saleActive ? 'Stop Live Sale' : 'Launch Live Flash Sale'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 5: Order Stage Dispatcher */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-pink-100 shadow-xs">
                    <div>
                      <h4 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                        <Package className="w-5 h-5 text-pink-700" />
                        <span>Orders Dispatch & Management</span>
                        <span className="bg-pink-100 text-pink-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
                          {orders.length} Total
                        </span>
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Search, filter by order ID or customer details, sort, and update real-time dispatch tracking.
                      </p>
                    </div>

                    {/* Quick Stats Pill */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-bold">
                        Pending: {orders.filter(o => o.orderStatus === 'Ordered' || o.orderStatus === 'Packed').length}
                      </span>
                      <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 font-bold">
                        In-Transit: {orders.filter(o => o.orderStatus === 'Shipped' || o.orderStatus === 'Out for Delivery').length}
                      </span>
                      <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-bold">
                        Delivered: {orders.filter(o => o.orderStatus === 'Delivered').length}
                      </span>
                    </div>
                  </div>

                  {/* Instant GST Tax Invoice & Shipping Bill Generator by Order ID */}
                  <div className="bg-gradient-to-r from-pink-950 via-pink-900 to-amber-950 text-white p-4 sm:p-5 rounded-2xl shadow-sm border border-amber-400/30">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold border border-amber-400/30 shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-serif font-black text-base text-amber-100 flex items-center gap-2 flex-wrap">
                              <span>Generate Order Tax Invoice & Shipping Bill</span>
                              <span className="text-[10px] font-sans font-extrabold bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-400/30">
                                Admin Official Bills
                              </span>
                            </h4>
                            <p className="text-xs text-pink-200/80">
                              Generate, view, and download the GST tax invoice and courier package shipping bill for any Order ID.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 flex-wrap">
                        <div className="relative">
                          <input
                            type="text"
                            value={quickInvoiceOrderId}
                            onChange={(e) => {
                              setQuickInvoiceOrderId(e.target.value);
                              setQuickInvoiceError(null);
                            }}
                            placeholder="Enter Order ID (e.g. ORD-174...)"
                            className="w-full sm:w-60 px-3.5 py-2 text-xs bg-black/40 border border-pink-700/70 rounded-xl text-white placeholder:text-pink-300/50 font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/70 transition-all"
                          />
                          {quickInvoiceOrderId && (
                            <button
                              type="button"
                              onClick={() => {
                                setQuickInvoiceOrderId('');
                                setQuickInvoiceError(null);
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-pink-300 hover:text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Invoice Actions */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={quickInvoiceLoading || !quickInvoiceOrderId.trim()}
                            onClick={() => handleGenerateInvoiceByOrderId(quickInvoiceOrderId)}
                            className="px-3 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-pink-950 font-black text-xs rounded-xl flex items-center justify-center gap-1 shadow-sm active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                            title="View GST Tax Invoice"
                          >
                            <FileText className="w-3.5 h-3.5 text-pink-950" />
                            <span>Invoice</span>
                          </button>

                          <button
                            type="button"
                            disabled={quickInvoiceLoading || !quickInvoiceOrderId.trim()}
                            onClick={() => handleDownloadInvoiceByOrderId(quickInvoiceOrderId)}
                            className="p-2 bg-white/10 hover:bg-white/20 border border-pink-400/40 text-amber-200 font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40"
                            title="Download Invoice HTML"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Automated Shiprocket Shipping Label Actions */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            disabled={quickInvoiceLoading || !quickInvoiceOrderId.trim()}
                            onClick={() => handlePrintShippingLabelByOrderId(quickInvoiceOrderId)}
                            className="px-3.5 py-2 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-emerald-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                            title="Step 3: Print 100x150 mm (4x6 inch) thermal shipping label directly in browser print window"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-950" />
                            <span>Print Shipping Label</span>
                            <span className="text-[10px] bg-emerald-950 text-emerald-200 px-1.5 py-0.5 rounded font-mono font-bold">
                              100x150mm
                            </span>
                          </button>

                          <button
                            type="button"
                            disabled={quickInvoiceLoading || !quickInvoiceOrderId.trim()}
                            onClick={() => handleGenerateShippingBillByOrderId(quickInvoiceOrderId)}
                            className="px-2.5 py-2 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-200 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40"
                            title="Preview Shipping Label Modal"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={quickInvoiceLoading || !quickInvoiceOrderId.trim()}
                            onClick={() => handleDownloadShippingBillByOrderId(quickInvoiceOrderId)}
                            className="p-2 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-400/40 text-emerald-200 font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40"
                            title="Download Shipping Bill / PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {quickInvoiceError && (
                      <div className="mt-3 text-xs text-rose-200 bg-rose-950/80 border border-rose-600/50 px-3.5 py-2 rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{quickInvoiceError}</span>
                      </div>
                    )}
                  </div>

                  {/* Orders Search & Filter Control Bar */}
                  <div className="bg-white p-4 rounded-2xl border border-pink-200/80 shadow-xs space-y-3.5">
                    {/* Search Form with Search Button */}
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        setOrderSearchQuery(orderSearchInput);
                      }}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                    >
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-pink-700 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={orderSearchInput}
                          onChange={(e) => {
                            setOrderSearchInput(e.target.value);
                            setOrderSearchQuery(e.target.value);
                          }}
                          placeholder="Search by Order ID (e.g. #ORD-...), Customer Name, Email, Phone, Txn ID, SKU..."
                          className="w-full pl-10 pr-9 py-2.5 text-xs bg-pink-50/40 border border-pink-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 font-medium placeholder:text-gray-400 transition-all"
                        />
                        {(orderSearchInput || orderSearchQuery) && (
                          <button
                            type="button"
                            onClick={() => {
                              setOrderSearchInput('');
                              setOrderSearchQuery('');
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-900 p-0.5 rounded-full hover:bg-pink-100 transition-colors"
                            title="Clear search"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Explicit Search Action Button */}
                      <button
                        type="submit"
                        className="bg-pink-900 hover:bg-pink-950 text-amber-200 px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs hover:shadow transition-all shrink-0 active:scale-98"
                      >
                        <Search className="w-3.5 h-3.5 text-amber-300" />
                        <span>Search Orders</span>
                      </button>

                      {/* Sort Dropdown */}
                      <div className="flex items-center gap-1.5 bg-pink-50/50 border border-pink-200 rounded-xl px-2.5 py-1.5 shrink-0">
                        <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">Sort:</span>
                        <select
                          value={orderSortBy}
                          onChange={(e) => setOrderSortBy(e.target.value as typeof orderSortBy)}
                          className="bg-transparent text-xs font-bold text-pink-950 focus:outline-none cursor-pointer pr-1"
                        >
                          <option value="newest">Date: Newest First</option>
                          <option value="oldest">Date: Oldest First</option>
                          <option value="amount_high">Amount: High to Low (₹)</option>
                          <option value="amount_low">Amount: Low to High (₹)</option>
                        </select>
                      </div>
                    </form>

                    {/* Status Filter Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-gray-100">
                      <span className="text-[11px] font-bold text-gray-400 mr-1 flex items-center gap-1">
                        <Filter className="w-3 h-3 text-pink-700" />
                        <span>Status:</span>
                      </span>
                      {[
                        { id: 'All', label: 'All Orders', count: orders.length },
                        { id: 'Ordered', label: 'Ordered', count: orders.filter(o => o.orderStatus === 'Ordered').length },
                        { id: 'Packed', label: 'Packed', count: orders.filter(o => o.orderStatus === 'Packed').length },
                        { id: 'Shipped', label: 'Shipped', count: orders.filter(o => o.orderStatus === 'Shipped').length },
                        { id: 'Out for Delivery', label: 'Out for Delivery', count: orders.filter(o => o.orderStatus === 'Out for Delivery').length },
                        { id: 'Delivered', label: 'Delivered', count: orders.filter(o => o.orderStatus === 'Delivered').length },
                        { id: 'Cancelled', label: 'Cancelled', count: orders.filter(o => o.orderStatus === 'Cancelled').length }
                      ].map((chip) => {
                        const isActive = orderStatusFilter === chip.id;
                        return (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => setOrderStatusFilter(chip.id)}
                            className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                              isActive 
                                ? 'bg-pink-900 text-amber-200 shadow-xs' 
                                : 'bg-gray-50 text-gray-600 hover:bg-pink-50 hover:text-pink-900 border border-gray-200/80'
                            }`}
                          >
                            <span>{chip.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              isActive ? 'bg-pink-800 text-amber-300' : 'bg-gray-200/70 text-gray-700'
                            }`}>
                              {chip.count}
                            </span>
                          </button>
                        );
                      })}

                      {(orderSearchQuery || orderStatusFilter !== 'All') && (
                        <button
                          type="button"
                          onClick={() => {
                            setOrderSearchInput('');
                            setOrderSearchQuery('');
                            setOrderStatusFilter('All');
                          }}
                          className="text-[11px] font-bold text-pink-700 hover:text-pink-950 underline ml-auto flex items-center gap-1 py-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Reset Filters</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Active Filter Summary Bar */}
                  {(orderSearchQuery || orderStatusFilter !== 'All') && (
                    <div className="flex items-center justify-between text-xs bg-amber-50/70 border border-amber-200 px-3.5 py-2 rounded-xl text-amber-950 font-medium">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold">Active Filter:</span>
                        {orderSearchQuery && (
                          <span className="bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold flex items-center gap-1">
                            Query: "{orderSearchQuery}"
                          </span>
                        )}
                        {orderStatusFilter !== 'All' && (
                          <span className="bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-md text-[11px] font-bold">
                            Status: {orderStatusFilter}
                          </span>
                        )}
                        <span className="text-gray-500">
                          (Found {filteredAndSortedOrders.length} of {orders.length} orders)
                        </span>
                      </div>
                    </div>
                  )}

                  {orders.length === 0 ? (
                    <div className="bg-white border border-pink-100 rounded-2xl p-12 text-center text-gray-500 space-y-2">
                      <Package className="w-10 h-10 text-pink-300 mx-auto" />
                      <p className="font-extrabold text-sm text-gray-800">No Customer Orders Yet</p>
                      <p className="text-xs text-gray-400 max-w-md mx-auto">
                        Customer orders placed on the website will show up here for live dispatch stage management and tracking updates.
                      </p>
                    </div>
                  ) : filteredAndSortedOrders.length === 0 ? (
                    <div className="bg-white border border-pink-100 rounded-2xl p-12 text-center text-gray-500 space-y-3">
                      <Search className="w-10 h-10 text-pink-300 mx-auto animate-bounce" />
                      <p className="font-extrabold text-base text-gray-800">No Orders Found</p>
                      <p className="text-xs text-gray-500 max-w-md mx-auto">
                        No orders matched your search query {orderSearchQuery ? <strong className="text-pink-950 font-mono">"{orderSearchQuery}"</strong> : ''} {orderStatusFilter !== 'All' ? `with status "${orderStatusFilter}"` : ''}.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setOrderSearchInput('');
                          setOrderSearchQuery('');
                          setOrderStatusFilter('All');
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-pink-900 hover:bg-pink-950 text-amber-200 rounded-xl text-xs font-bold transition-all shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Clear Search & Show All Orders</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredAndSortedOrders.map((o) => (
                        <div key={o.id} className="border border-pink-200/80 bg-white p-4 rounded-2xl shadow-xs space-y-3 hover:border-pink-300 hover:shadow-sm transition-all">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-1 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-lg">
                                  <span className="font-extrabold text-xs text-pink-950 font-mono">
                                    #{o.id}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyOrderId(o.id)}
                                    className="text-pink-700 hover:text-pink-950 p-0.5 transition-colors"
                                    title="Copy Order ID"
                                  >
                                    {copiedOrderId === o.id ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                                {copiedOrderId === o.id && (
                                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                    Copied ID!
                                  </span>
                                )}
                                <span className="text-xs font-bold text-gray-700">{o.customerEmail}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1 flex-wrap">
                                <span>📅 {o.date}</span>
                                <span>•</span>
                                <span className={`font-bold px-1.5 py-0.2 rounded text-[9px] ${
                                  o.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                                }`}>
                                  Payment: {o.paymentMethod || 'PhonePe'} ({o.paymentStatus})
                                </span>
                                {o.transactionId && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono text-gray-500">Txn: {o.transactionId}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setInvoiceModalOrder(o)}
                                className="px-2.5 py-1.5 bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-900 text-xs font-bold rounded-xl flex items-center gap-1 shadow-2xs transition-all active:scale-98 cursor-pointer"
                                title="View GST Tax Invoice"
                              >
                                <FileText className="w-3.5 h-3.5 text-pink-700" />
                                <span className="hidden sm:inline">Invoice</span>
                              </button>

                              <button
                                type="button"
                                disabled={generatingLabelOrderId === o.id}
                                onClick={() => handlePrintShippingLabel(o)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-2xs transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                                title="Print 100x150mm (4x6 inch) Thermal Shipping Label"
                              >
                                {generatingLabelOrderId === o.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-200" />
                                ) : (
                                  <Printer className="w-3.5 h-3.5 text-emerald-200" />
                                )}
                                <span className="hidden sm:inline">Print Label</span>
                              </button>

                              <span className="text-xs text-gray-600 font-bold">Dispatch Status:</span>
                              <select
                                value={o.orderStatus}
                                onChange={(e) => onUpdateOrderStatus(o.id, e.target.value as Order['orderStatus'])}
                                className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer shadow-xs transition-all ${
                                  o.orderStatus === 'Delivered' 
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                                    : o.orderStatus === 'Cancelled'
                                    ? 'bg-red-50 border-red-300 text-red-900'
                                    : o.orderStatus === 'Shipped' || o.orderStatus === 'Out for Delivery'
                                    ? 'bg-blue-50 border-blue-300 text-blue-950'
                                    : 'bg-amber-50 border-amber-300 text-pink-950'
                                }`}
                              >
                                <option value="Ordered">Ordered (New)</option>
                                <option value="Packed">Packed</option>
                                <option value="Shipped">Shipped</option>
                                <option value="Out for Delivery">Out for Delivery</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </div>
                          </div>

                          {/* Ordered Products & SKU Breakdown */}
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Ordered Items</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {o.items.map((i, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-pink-50/30 p-2 rounded-xl border border-pink-100 text-xs">
                                {(() => {
                                  let itemImg = i.product.images?.[0];
                                  if (i.selectedColor && i.product.colorVariants && i.product.colorVariants.length > 0) {
                                    const v = i.product.colorVariants.find(cv => cv.name.trim().toLowerCase() === i.selectedColor?.trim().toLowerCase());
                                    if (v) {
                                      if (v.images && v.images.length > 0 && v.images[0]) itemImg = v.images[0];
                                      else if (v.imageUrl) itemImg = v.imageUrl;
                                    }
                                  }
                                  return itemImg ? (
                                    <img src={itemImg} alt="" className="w-10 h-12 object-cover rounded-lg border border-pink-100 shrink-0" referrerPolicy="no-referrer" />
                                  ) : null;
                                })()}
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-gray-900 truncate">{i.product.name}</p>
                                  <div className="flex items-center gap-2 text-[10px] text-gray-500 flex-wrap">
                                    <span className="font-mono font-bold text-pink-800 bg-pink-100/70 px-1 py-0.2 rounded">
                                      SKU: {i.product.sku || (i.product as any).skucode || i.product.id}
                                    </span>
                                    <span>Size: <strong>{i.selectedSize || (i as any).size || 'Free Size'}</strong></span>
                                    {i.selectedColor && i.selectedColor !== 'Default' && (
                                      <span className="bg-pink-100 text-pink-900 px-1.5 py-0.2 rounded font-bold">
                                        Color: {i.selectedColor}
                                      </span>
                                    )}
                                    <span>Qty: <strong>{i.quantity}</strong></span>
                                  </div>
                                </div>
                                  <span className="font-bold text-pink-950 text-xs">
                                    ₹{(i.product.price * i.quantity).toLocaleString('en-IN')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Delivery Address & Order Total */}
                          <div className="flex flex-wrap items-center justify-between text-xs text-gray-600 gap-2 pt-2 border-t border-gray-100">
                            {o.deliveryAddress ? (
                              <span className="text-[11px] text-gray-500">
                                📍 <strong className="text-gray-700">{o.deliveryAddress.fullName}</strong> - {o.deliveryAddress.addressLine}, {o.deliveryAddress.city}, {o.deliveryAddress.state} ({o.deliveryAddress.pincode}) | 📞 {o.deliveryAddress.phone}
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400">Standard Delivery Address</span>
                            )}
                            <span className="font-black text-pink-950 text-sm ml-auto">
                              Total Paid: ₹{o.finalAmount.toLocaleString('en-IN')}
                            </span>
                          </div>

                          {/* Tax Invoice & Shipping Bill Official Actions Bar */}
                          <div className="bg-gradient-to-r from-pink-50/80 via-white to-amber-50/60 p-3 rounded-2xl border border-pink-200/90 space-y-2.5">
                            {/* 1. GST Tax Invoice Row */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pink-100 pb-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-pink-100 text-pink-900 flex items-center justify-center shrink-0 border border-pink-200">
                                  <FileText className="w-3.5 h-3.5 text-pink-800" />
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-black text-gray-900">GST Tax Invoice:</span>
                                  <span className="font-mono text-[11px] font-bold text-pink-900 bg-pink-100/90 px-2 py-0.5 rounded-md border border-pink-200">
                                    INV-FEAT-{o.id.toUpperCase()}
                                  </span>
                                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                                    HSN 6204 • 5% GST
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                                <button
                                  type="button"
                                  onClick={() => setInvoiceModalOrder(o)}
                                  className="px-2.5 py-1.5 bg-pink-900 hover:bg-pink-950 text-amber-200 text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs transition-all active:scale-98 cursor-pointer"
                                  title="View the customer's identical tax invoice in modal preview"
                                >
                                  <Eye className="w-3.5 h-3.5 text-amber-300" />
                                  <span>View Invoice</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => downloadTaxInvoiceFile(o)}
                                  className="px-2.5 py-1.5 bg-white hover:bg-pink-50 border border-pink-200 text-pink-900 text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs transition-all active:scale-98 cursor-pointer"
                                  title="Download Tax Invoice HTML file"
                                >
                                  <Download className="w-3.5 h-3.5 text-pink-700" />
                                  <span>Download</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => printTaxInvoice(o)}
                                  className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                                  title="Print invoice or save as PDF"
                                >
                                  <Printer className="w-3.5 h-3.5 text-amber-700" />
                                  <span className="hidden sm:inline">Print / PDF</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Unified Official Shiprocket Courier Pickup & Thermal Shipping Label Card */}
                          <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200 shadow-2xs transition-all">
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                                      <Truck className="w-3.5 h-3.5 text-emerald-700" />
                                      <span>Shiprocket Logistics</span>
                                    </span>
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                      <Check className="w-3 h-3 text-emerald-700" />
                                      <span>Live Courier Pickup Scheduled</span>
                                    </span>
                                    <span className="text-[10px] font-semibold text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-200">
                                      Thermal Label 100x150 mm (4x6")
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3 text-xs flex-wrap">
                                    <span>Courier: <strong className="text-gray-900">{o.shiprocketCourierName || 'Blue Dart Air'}</strong></span>
                                    {o.shiprocketAwbCode && (
                                      <span className="flex items-center gap-1">
                                        <span className="text-gray-600">AWB:</span>
                                        <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono font-bold text-pink-900 text-[11px]">
                                          {o.shiprocketAwbCode}
                                        </code>
                                      </span>
                                    )}
                                    {o.shiprocketPickupDate && (
                                      <span className="text-gray-600">
                                        Pickup: <strong className="text-gray-900">{o.shiprocketPickupDate}</strong>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    disabled={generatingLabelOrderId === o.id}
                                    onClick={() => handlePrintShippingLabel(o)}
                                    className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                                    title="Print 100x150mm thermal shipping label"
                                  >
                                    {generatingLabelOrderId === o.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-200" />
                                    ) : (
                                      <Printer className="w-3.5 h-3.5 text-emerald-200" />
                                    )}
                                    <span>Print Shipping Label</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setShippingBillModalOrder(o)}
                                    className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs font-bold rounded-xl flex items-center gap-1 shadow-2xs transition-all active:scale-98 cursor-pointer"
                                    title="Preview Shipping Label in Modal"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-emerald-800" />
                                    <span>Preview</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => downloadShippingBillFile(o)}
                                    className="p-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-1 shadow-2xs transition-all active:scale-98 cursor-pointer"
                                    title="Download Shipping Label PDF"
                                  >
                                    <Download className="w-3.5 h-3.5 text-emerald-800" />
                                  </button>

                                  {o.shiprocketAwbCode && (
                                    <a
                                      href={o.shiprocketTrackingUrl || `https://shiprocket.co/tracking/${o.shiprocketAwbCode}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold rounded-xl flex items-center gap-1 transition-all"
                                      title="Track shipment live on Shiprocket"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      <span>Track</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: Marketing & Broadcasts */}
              {activeTab === 'marketing' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <form onSubmit={handleTriggerEmail} className="bg-pink-50/50 p-5 rounded-3xl border border-pink-200 space-y-3 text-xs">
                    <h4 className="font-extrabold text-xs text-pink-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-pink-700" />
                      <span>Send Customer Engagement Broadcast</span>
                    </h4>

                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Target Audience</label>
                      <select
                        value={campaignData.recipientGroup}
                        onChange={(e) => setCampaignData({ ...campaignData, recipientGroup: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl bg-white"
                      >
                        <option>All Customers</option>
                        <option>Abandoned Cart Users</option>
                        <option>VIP Buyers</option>
                        <option>Recent Shoppers</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Subject Line</label>
                      <input
                        type="text"
                        required
                        value={campaignData.subject}
                        onChange={(e) => setCampaignData({ ...campaignData, subject: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Email Content</label>
                      <textarea
                        rows={4}
                        required
                        value={campaignData.body}
                        onChange={(e) => setCampaignData({ ...campaignData, body: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl bg-white font-medium"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={emailSending}
                      className="w-full bg-pink-900 hover:bg-pink-800 text-amber-200 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow"
                    >
                      <Send className="w-3.5 h-3.5 text-amber-300" />
                      <span>{emailSending ? 'Dispatching Broadcast...' : 'Send Email Broadcast'}</span>
                    </button>

                    {emailSuccess && (
                      <p className="text-xs font-bold text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-center">
                        ✓ Broadcast successfully dispatched to {campaignData.recipientGroup}!
                      </p>
                    )}
                  </form>

                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                      Dispatched Campaigns ({emails.length})
                    </h4>

                    <div className="space-y-2">
                      {emails.map((e) => (
                        <div key={e.id} className="border border-gray-200 bg-white p-3.5 rounded-2xl space-y-1 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-900">{e.subject}</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                              {e.openRate} Open Rate
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-600 line-clamp-2">{e.body}</p>
                          <div className="text-[10px] text-gray-400 flex justify-between pt-1">
                            <span>Group: {e.recipientGroup}</span>
                            <span>{e.sentAt}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: Analytics */}
              {activeTab === 'analytics' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-center">
                      <span className="text-[10px] font-extrabold uppercase text-amber-800">Total Sales Revenue</span>
                      <p className="text-2xl font-black text-pink-900 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</p>
                    </div>

                    <div className="bg-pink-50 p-4 rounded-2xl border border-pink-200 text-center">
                      <span className="text-[10px] font-extrabold uppercase text-pink-800">Total Orders</span>
                      <p className="text-2xl font-black text-pink-900 mt-1">{orders.length}</p>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-center">
                      <span className="text-[10px] font-extrabold uppercase text-amber-800">Active Products</span>
                      <p className="text-2xl font-black text-pink-900 mt-1">{products.length}</p>
                    </div>

                    <div className="bg-red-50 p-4 rounded-2xl border border-red-200 text-center">
                      <span className="text-[10px] font-extrabold uppercase text-red-800">Low Stock Alerts</span>
                      <p className="text-2xl font-black text-red-700 mt-1">{lowStockCount}</p>
                    </div>
                  </div>
                </div>
              )}

            </main>
          </div>
        )}

      {/* FULL PRODUCT EDIT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-pink-300 shadow-2xl p-6 relative space-y-4 my-8 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-pink-950 font-serif">Edit Apparel Item Specifications & Price</h3>
                <p className="text-[11px] text-gray-500">Modify title, selling price, MRP, sizes, fabric specifications, captions, or delete from website.</p>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Product Title / Name</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-bold text-gray-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-mono font-bold text-pink-900 bg-pink-50/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl font-bold text-emerald-800 text-sm"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Original MRP (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingProduct.originalPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, originalPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl font-bold text-gray-500 line-through text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-pink-950 block mb-1 text-xs flex items-center justify-between">
                    <span>Category <span className="text-pink-600">*</span></span>
                    <span className="text-[10px] font-bold text-pink-600 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-full">{editingProduct.category}</span>
                  </label>
                  <div className="relative">
                    <select
                      value={editingProduct.category}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as CategoryType })}
                      className="w-full appearance-none px-3.5 py-2.5 bg-white border-2 border-pink-300 hover:border-pink-500 focus:border-pink-600 focus:ring-2 focus:ring-pink-200 rounded-xl font-bold text-gray-900 shadow-sm cursor-pointer pr-10 text-xs transition-all"
                    >
                      <option value="Kurti" className="text-gray-900 bg-white font-medium py-1">Kurti</option>
                      <option value="Sharee" className="text-gray-900 bg-white font-medium py-1">Sharee</option>
                      <option value="Dress Materials" className="text-gray-900 bg-white font-medium py-1">Dress Materials</option>
                      <option value="Indo Western dress" className="text-gray-900 bg-white font-medium py-1">Indo Western dress</option>
                      <option value="Suit" className="text-gray-900 bg-white font-medium py-1">Suit</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-pink-600">
                      <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-extrabold text-pink-950 block mb-1 text-xs flex items-center justify-between">
                    <span>Collection <span className="text-pink-600">*</span></span>
                    <span className="text-[10px] font-bold text-pink-600 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-full truncate max-w-[130px]">{editingProduct.collection}</span>
                  </label>
                  <div className="relative">
                    <select
                      value={editingProduct.collection}
                      onChange={(e) => setEditingProduct({ ...editingProduct, collection: e.target.value as CollectionType })}
                      className="w-full appearance-none px-3.5 py-2.5 bg-white border-2 border-pink-300 hover:border-pink-500 focus:border-pink-600 focus:ring-2 focus:ring-pink-200 rounded-xl font-bold text-gray-900 shadow-sm cursor-pointer pr-10 text-xs transition-all"
                    >
                      <option value="9 to fivers collection" className="text-gray-900 bg-white font-medium py-1">9 to fivers collection</option>
                      <option value="Firdausi collection" className="text-gray-900 bg-white font-medium py-1">Firdausi collection</option>
                      <option value="'Present is Gifted' Collection" className="text-gray-900 bg-white font-medium py-1">'Present is Gifted' Collection</option>
                      <option value="'Gift is present' Collection" className="text-gray-900 bg-white font-medium py-1">'Gift is present' Collection</option>
                      <option value="'Deal maange more' Collection" className="text-gray-900 bg-white font-medium py-1">'Deal maange more' Collection</option>
                      <option value="Jashn Collection" className="text-gray-900 bg-white font-medium py-1">Jashn Collection</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-pink-600">
                      <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Fabric & Specifications</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.fabric || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, fabric: e.target.value })}
                    placeholder="e.g. Pure Chanderi Silk with Zari Embroidery"
                    className="w-full px-3 py-2 border rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1 flex items-center justify-between">
                    <span>Garment Length (Optional)</span>
                    <span className="text-[11px] text-gray-400 font-normal">Leave blank if none</span>
                  </label>
                  <input
                    type="text"
                    value={editingProduct.length || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, length: e.target.value })}
                    placeholder="e.g. 44 Inches, Calf Length, Floor Length"
                    className="w-full px-3 py-2 border rounded-xl font-medium"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">If left blank, length will not be shown on the website.</p>
                </div>
              </div>

              {/* Dedicated Size Selection & Manual Per-Size Units Inventory Manager */}
              <div className="pt-1">
                <SizeInventoryManager
                  selectedSizes={editingProduct.sizes || ['S', 'M', 'L', 'XL', 'XXL', 'XXXL']}
                  sizeStock={editingProduct.sizeStock || {}}
                  onChange={(sizes, sizeStock, totalUnits) => {
                    setEditingProduct({
                      ...editingProduct,
                      sizes,
                      sizeStock,
                      stockCount: totalUnits
                    });
                  }}
                />
              </div>

              {/* Edit Product Real Item Color Variants & Multi-Photo Manager */}
              <div className="space-y-4 bg-gradient-to-r from-pink-50/70 to-amber-50/50 p-4 rounded-2xl border border-pink-200">
                {/* Primary Product Color Variant Name Field */}
                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border-2 border-pink-200/90 shadow-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <label className="font-extrabold text-xs text-pink-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-pink-700" />
                      <span>Primary Color Variant Name</span>
                      <span className="text-[10px] font-normal text-gray-500 lowercase">(optional)</span>
                    </label>
                    <span className="text-[10px] text-gray-500 font-medium italic">
                      Leave blank if item has no other color variants
                    </span>
                  </div>
                  <input
                    type="text"
                    value={editingProduct.primaryColorName || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, primaryColorName: e.target.value })}
                    placeholder="e.g. Royal Maroon, Rani Pink, Peacock Blue (or leave blank)"
                    className="w-full px-3.5 py-2.5 border border-pink-200 rounded-xl text-xs font-bold text-gray-900 bg-pink-50/20 focus:bg-white focus:border-pink-600 focus:outline-hidden transition-all"
                  />
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    {(editingProduct.primaryColorName && editingProduct.primaryColorName.trim()) ? (
                      <span className="text-pink-900 font-semibold flex items-center gap-1">
                        <span>⭐</span>
                        <span>
                          This primary product will show <strong>first</strong> in the product page as <strong>"{editingProduct.primaryColorName.trim()}"</strong> with its main gallery photos, alongside the other color variants below.
                        </span>
                      </span>
                    ) : (
                      <span>
                        ℹ️ If this product doesn't have any other color variants, leave this field blank and the main website won't show any color variant name for this product. If you add other color variants below, enter a name here so this primary product shows first.
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-pink-200/60">
                  <div>
                    <label className="font-extrabold text-xs text-pink-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-pink-700" />
                      <span>Additional Color Variants & Photos ({((editingProduct.colorVariants && editingProduct.colorVariants.length > 0) ? editingProduct.colorVariants : (editingProduct.colors || [])).length} Color Options)</span>
                    </label>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      Add multiple color shades and upload multiple photos (front, back, fabric detail) for each color option.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = (editingProduct.colorVariants && editingProduct.colorVariants.length > 0)
                        ? editingProduct.colorVariants
                        : (editingProduct.colors || []).map(c => ({ name: c, imageUrl: '', images: [] }));
                      const defaultSizes = (editingProduct.sizes && editingProduct.sizes.length > 0) ? [...editingProduct.sizes] : ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
                      const defaultStock: Record<string, number> = {};
                      defaultSizes.forEach(s => {
                        defaultStock[s] = editingProduct.sizeStock?.[s] !== undefined ? editingProduct.sizeStock[s] : 2;
                      });
                      const updated = [
                        ...cur,
                        {
                          name: '',
                          imageUrl: '',
                          images: [],
                          sizes: defaultSizes,
                          sizeStock: defaultStock,
                          stockCount: Object.values(defaultStock).reduce((a, b) => a + (Number(b) || 0), 0)
                        }
                      ];
                      setEditingProduct({
                        ...editingProduct,
                        colorVariants: updated,
                        colors: updated.map(v => v.name).filter(Boolean)
                      });
                    }}
                    className="px-3 py-1.5 bg-pink-900 hover:bg-pink-800 text-amber-200 font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1 shrink-0 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-300" />
                    <span>Add Color Option</span>
                  </button>
                </div>

                {/* Variant List with Multi-Photo Upload */}
                <div className="space-y-3">
                  {((editingProduct.colorVariants && editingProduct.colorVariants.length > 0)
                    ? editingProduct.colorVariants
                    : (editingProduct.colors && editingProduct.colors.length > 0)
                      ? editingProduct.colors.map(c => ({ name: c, imageUrl: '', images: [] }))
                      : []
                  ).map((v, vIdx) => {
                    const variantImages = (v.images && v.images.length > 0)
                      ? v.images
                      : (v.imageUrl ? [v.imageUrl] : []);

                    return (
                      <div key={vIdx} className="bg-white p-4 rounded-2xl border border-pink-200 shadow-xs space-y-3.5">
                        <div className="flex items-center justify-between gap-2 border-b border-pink-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-pink-100 text-pink-900 text-[10px] flex items-center justify-center font-black">
                              {vIdx + 1}
                            </span>
                            <span className="text-xs font-black text-pink-950">
                              {v.name.trim() ? v.name : 'Untitled Color Shade'}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-900 font-extrabold rounded-full">
                              {variantImages.length} {variantImages.length === 1 ? 'Photo' : 'Photos'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const cur = editingProduct.colorVariants || (editingProduct.colors || []).map(c => ({ name: c, imageUrl: '', images: [] }));
                              const updated = cur.filter((_, i) => i !== vIdx);
                              setEditingProduct({
                                ...editingProduct,
                                colorVariants: updated,
                                colors: updated.map(item => item.name).filter(Boolean)
                              });
                            }}
                            className="text-gray-400 hover:text-red-600 text-xs font-semibold flex items-center gap-1 p-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove Variant</span>
                          </button>
                        </div>

                        <div className="space-y-3">
                          {/* Color Shade Name Input */}
                          <div>
                            <label className="block text-[10px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                              Color Shade Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={v.name}
                              onChange={(e) => {
                                const cur = editingProduct.colorVariants || (editingProduct.colors || []).map(c => ({ name: c, imageUrl: '', images: [] }));
                                const updated = [...cur];
                                updated[vIdx] = { ...updated[vIdx], name: e.target.value };
                                setEditingProduct({
                                  ...editingProduct,
                                  colorVariants: updated,
                                  colors: updated.map(item => item.name).filter(Boolean)
                                });
                              }}
                              placeholder="e.g. Royal Maroon, Rani Pink, Peacock Teal, Mustard Yellow"
                              className="w-full px-3 py-1.5 border border-pink-200 rounded-xl text-xs font-bold text-gray-900 bg-pink-50/20 focus:bg-white focus:border-pink-500 focus:outline-hidden"
                            />
                          </div>

                          {/* Multi-Photo Upload & Gallery Row */}
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <label className="text-[10px] font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                                <ImageIcon className="w-3 h-3 text-pink-700" />
                                <span>Photos for this Color ({variantImages.length} uploaded)</span>
                              </label>
                              {uploadingEditVariantIdx === vIdx && (
                                <span className="text-[10px] text-pink-700 font-bold flex items-center gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" /> Uploading ({editVariantProgress}%)...
                                </span>
                              )}
                            </div>

                            {/* Upload Button */}
                            <div className="flex flex-wrap items-center gap-2">
                              <label className={`cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                                uploadingEditVariantIdx === vIdx
                                  ? 'bg-pink-100 text-pink-700 border-pink-300 cursor-not-allowed'
                                  : 'bg-pink-900 hover:bg-pink-800 text-amber-200 border-pink-950 shadow-xs active:scale-95'
                              }`}>
                                <Upload className="w-3.5 h-3.5 text-amber-300" />
                                <span>Upload Photos from Device (Select 1 or More)</span>
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*"
                                  className="hidden"
                                  disabled={uploadingEditVariantIdx !== null}
                                  onChange={(e) => handleEditVariantMultipleFilesUpload(vIdx, e)}
                                />
                              </label>
                            </div>

                            {/* Photos Grid Preview */}
                            {variantImages.length > 0 ? (
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1">
                                {variantImages.map((imgUrl, pIdx) => {
                                  const isPrimary = pIdx === 0;
                                  return (
                                    <div
                                      key={pIdx}
                                      className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 bg-gray-50 group transition-all ${
                                        isPrimary ? 'border-pink-600 ring-2 ring-pink-200' : 'border-gray-200'
                                      }`}
                                    >
                                      <img
                                        src={imgUrl}
                                        alt={`${v.name} photo ${pIdx + 1}`}
                                        className="w-full h-full object-cover object-top"
                                        referrerPolicy="no-referrer"
                                      />
                                      
                                      {/* Primary Badge */}
                                      {isPrimary && (
                                        <div className="absolute top-1 left-1 bg-pink-700 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow">
                                          Main
                                        </div>
                                      )}

                                      {/* Overlay actions */}
                                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                                        {!isPrimary && (
                                          <button
                                            type="button"
                                            onClick={() => handleSetPrimaryEditVariantPhoto(vIdx, pIdx)}
                                            className="px-1.5 py-0.5 bg-amber-400 text-pink-950 text-[9px] font-black rounded hover:bg-amber-300 transition-colors"
                                            title="Make primary photo for this color"
                                          >
                                            Set Main
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveEditVariantPhoto(vIdx, pIdx)}
                                          className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                          title="Delete photo"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-3 bg-pink-50/50 rounded-xl border border-dashed border-pink-200 text-center">
                                <p className="text-[11px] text-gray-500 font-medium">
                                  No photos added for this color yet. Click "Upload Photos" above to add front, back, or detail shots.
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Dedicated Size Selection & Manual Unit Inventory for this Color Variant */}
                          <div className="pt-3 border-t border-pink-200/80">
                            <SizeInventoryManager
                              idPrefix={`edit-variant-sizes-${vIdx}`}
                              title={`Size Selection & Units for ${v.name.trim() || `Color Option #${vIdx + 1}`}`}
                              subtitle={`Choose active sizes and manually configure inventory units strictly for the "${v.name.trim() || `Color Option #${vIdx + 1}`}" variant.`}
                              badgeLabel={`${v.name.trim() || `Color #${vIdx + 1}`} Stock`}
                              selectedSizes={v.sizes !== undefined ? v.sizes : (editingProduct.sizes || ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'])}
                              sizeStock={v.sizeStock || {}}
                              onChange={(sizes, sizeStock, totalUnits) => {
                                const cur = (editingProduct.colorVariants && editingProduct.colorVariants.length > 0)
                                  ? editingProduct.colorVariants
                                  : (editingProduct.colors || []).map(c => ({ name: c, imageUrl: '', images: [] }));
                                const updated = [...cur];
                                updated[vIdx] = {
                                  ...updated[vIdx],
                                  sizes,
                                  sizeStock,
                                  stockCount: totalUnits
                                };
                                setEditingProduct({
                                  ...editingProduct,
                                  colorVariants: updated
                                });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Care Instructions</label>
                <input
                  type="text"
                  value={editingProduct.careInstructions || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, careInstructions: e.target.value })}
                  placeholder="e.g. Dry Clean Only. Store wrapped in muslin."
                  className="w-full px-3 py-2 border rounded-xl font-medium"
                />
              </div>

              <MarkdownEditor
                id="edit-product-description"
                label="Item Description & Craftsmanship Story (Markdown Supported)"
                value={editingProduct.description || ''}
                onChange={(val) => setEditingProduct({ ...editingProduct, description: val })}
                rows={5}
                required
              />

              {/* Edit Product Multi-Image Gallery Manager with Device Upload */}
              <div className="space-y-3 bg-pink-50/40 p-4 rounded-2xl border border-pink-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="font-extrabold text-xs text-pink-950 uppercase tracking-wider flex items-center gap-1.5">
                      <ImagePlus className="w-4 h-4 text-pink-700" />
                      <span>Item Image Gallery ({(editingProduct.images || []).length} {(editingProduct.images || []).length === 1 ? 'Image' : 'Images'})</span>
                    </label>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Upload photos directly from your device. Images are automatically saved to database. Photo #1 serves as the cover photo.
                    </p>
                  </div>

                  <label className={`cursor-pointer px-4 py-2 bg-gradient-to-r from-pink-900 to-pink-950 hover:from-pink-800 hover:to-pink-900 text-amber-200 font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-2 shrink-0 border border-amber-300/30 ${
                    uploadingEditGallery ? 'opacity-70 pointer-events-none' : ''
                  }`}>
                    {uploadingEditGallery ? (
                      <>
                        <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                        <span>Uploading ({editGalleryProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4 text-amber-300" />
                        <span>Upload Images from Device</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={uploadingEditGallery}
                      onChange={handleEditGalleryFilesUpload}
                    />
                  </label>
                </div>

                {uploadingEditGallery && (
                  <div className="p-3 bg-pink-900 text-amber-200 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-bold text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                        <span>Uploading to featdb-admin Firebase Storage...</span>
                      </span>
                      <span>{editGalleryProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-pink-950 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-400 to-amber-200 transition-all duration-300" style={{ width: `${editGalleryProgress}%` }} />
                    </div>
                  </div>
                )}

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {(editingProduct.images && editingProduct.images.length > 0) ? (
                    editingProduct.images.map((imgUrl, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-pink-200 shadow-xs">
                        {/* Live Thumbnail Preview */}
                        <div className="w-12 h-14 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shrink-0 relative flex items-center justify-center text-gray-300">
                          {imgUrl.trim() ? (
                            <img
                              src={imgUrl}
                              alt={`Preview ${idx + 1}`}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Image className="w-5 h-5 text-gray-300" />
                          )}
                          {idx === 0 && (
                            <span className="absolute bottom-0 inset-x-0 bg-pink-950/90 text-amber-300 text-[8px] font-black uppercase text-center py-0.5">
                              Cover
                            </span>
                          )}
                        </div>

                        {/* Image info & device replace */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-gray-700 flex items-center gap-1">
                              <span>{idx === 0 ? 'Cover Photo (Main)' : `Gallery Image #${idx + 1}`}</span>
                              <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5">
                                <CheckCircle className="w-2.5 h-2.5" /> Firebase Storage
                              </span>
                            </span>
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...(editingProduct.images || [])];
                                  const [chosen] = updated.splice(idx, 1);
                                  updated.unshift(chosen);
                                  setEditingProduct({ ...editingProduct, images: updated });
                                }}
                                className="text-[10px] text-pink-700 hover:text-pink-950 font-bold hover:underline"
                              >
                                Set as Main Cover
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="cursor-pointer text-[11px] font-semibold text-pink-800 hover:text-pink-950 hover:underline flex items-center gap-1">
                              <Upload className="w-3 h-3 text-pink-700" />
                              <span>Replace this image from device</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleSingleEditGalleryFileUpload(idx, e)}
                              />
                            </label>
                          </div>
                        </div>

                        {/* Actions: Move & Delete */}
                        <div className="flex items-center gap-1 shrink-0">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...(editingProduct.images || [])];
                                [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
                                setEditingProduct({ ...editingProduct, images: updated });
                              }}
                              className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {idx < (editingProduct.images || []).length - 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...(editingProduct.images || [])];
                                [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
                                setEditingProduct({ ...editingProduct, images: updated });
                              }}
                              className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (editingProduct.images || []).filter((_, i) => i !== idx);
                              setEditingProduct({ ...editingProduct, images: updated });
                            }}
                            className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded"
                            title="Remove Image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-4 bg-white rounded-xl border border-dashed border-pink-200">
                      <UploadCloud className="w-6 h-6 text-pink-400 mx-auto mb-1" />
                      <p className="text-xs font-bold text-pink-950">No images yet</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Click "Upload Images from Device" above.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3 border-t border-pink-100">
                <button
                  type="button"
                  onClick={() => setProductToDelete({ id: editingProduct.id, name: editingProduct.name, sku: editingProduct.sku || editingProduct.id })}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Item</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editProductSaving}
                    className="px-5 py-2.5 bg-pink-900 hover:bg-pink-800 text-amber-200 font-extrabold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4 text-amber-300" />
                    <span>Save Product Changes</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. Preview Website Announcement Popup Modal */}
      {previewPromoModal && (
        <SaleAnnouncementModal
          promo={previewPromoModal}
          isOpen={!!previewPromoModal}
          onClose={() => setPreviewPromoModal(null)}
        />
      )}

      {/* 2. Edit Coupon Modal */}
      {editingPromo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-pink-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-950 via-pink-900 to-amber-950 text-amber-100 p-5 flex items-center justify-between border-b border-amber-400/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold border border-amber-400/30">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-lg text-amber-100 flex items-center gap-2">
                    <span>Edit Coupon:</span>
                    <span className="font-mono bg-pink-900/90 text-amber-300 px-2.5 py-0.5 rounded-xl border border-amber-400/40 text-sm font-bold">
                      {editingPromo.code}
                    </span>
                  </h3>
                  <p className="text-[11px] text-amber-200/80">
                    Update validity dates, discount amounts, occasion reason & website popup
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingPromo(null)}
                className="p-2 text-amber-200/80 hover:text-amber-100 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Close edit coupon modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleUpdatePromoSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-1 text-xs">
              
              {/* Title, Code & Active Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5">
                  <label className="font-extrabold text-pink-950 block mb-1">Coupon Title / Name *</label>
                  <input
                    type="text"
                    required
                    value={editingPromo.name || ''}
                    onChange={(e) => setEditingPromo({ ...editingPromo, name: e.target.value })}
                    placeholder="e.g. Grand Festive Celebration Offer"
                    className="w-full px-3 py-2 border border-pink-200 rounded-xl font-bold text-gray-900 bg-pink-50/20"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="font-extrabold text-pink-950 block mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    value={editingPromo.code}
                    onChange={(e) => setEditingPromo({ ...editingPromo, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. FESTIVE25"
                    className="w-full px-3 py-2 border border-pink-200 rounded-xl font-mono font-black text-pink-900 bg-pink-50/20 tracking-wider"
                  />
                </div>

                <div className="sm:col-span-3 flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2 bg-pink-50/70 border border-pink-200 rounded-xl cursor-pointer hover:bg-pink-100/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={editingPromo.active !== false}
                      onChange={(e) => setEditingPromo({ ...editingPromo, active: e.target.checked })}
                      className="w-4 h-4 accent-pink-700 rounded cursor-pointer"
                    />
                    <span className="font-extrabold text-pink-950 text-xs">Active</span>
                  </label>
                </div>
              </div>

              {/* Discount Type, Value & Min Order */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-extrabold text-gray-700 block mb-1">Discount Type</label>
                  <select
                    value={editingPromo.discountType}
                    onChange={(e) => setEditingPromo({ ...editingPromo, discountType: e.target.value as 'percent' | 'flat' })}
                    className="w-full px-2.5 py-2 border border-pink-200 rounded-xl bg-white font-semibold"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat Cash (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="font-extrabold text-gray-700 block mb-1">
                    {editingPromo.discountType === 'percent' ? 'Discount % *' : 'Flat Amount (₹) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingPromo.discountValue}
                    onChange={(e) => setEditingPromo({ ...editingPromo, discountValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-pink-200 rounded-xl font-black text-pink-900 bg-white"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-gray-700 block mb-1">Min Order (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={editingPromo.minOrderValue || 0}
                    onChange={(e) => setEditingPromo({ ...editingPromo, minOrderValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-pink-200 rounded-xl font-bold bg-white"
                  />
                </div>
              </div>

              {/* Validity Dates */}
              <div className="p-3.5 bg-pink-50/50 rounded-2xl border border-pink-200 space-y-2">
                <div className="flex items-center gap-1.5 text-pink-950 font-extrabold text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-pink-700" />
                  <span>Validity Schedule Timelines</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-gray-600 block mb-0.5 text-[10px]">Valid From</label>
                    <input
                      type="date"
                      value={editingPromo.validFrom ? editingPromo.validFrom.split('T')[0] : ''}
                      onChange={(e) => setEditingPromo({ ...editingPromo, validFrom: e.target.value })}
                      className="w-full px-3 py-1.5 border border-pink-200 rounded-lg bg-white text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-gray-600 block mb-0.5 text-[10px]">Expiry Date (Valid Until)</label>
                    <input
                      type="date"
                      value={editingPromo.validUntil ? editingPromo.validUntil.split('T')[0] : ''}
                      onChange={(e) => setEditingPromo({ ...editingPromo, validUntil: e.target.value })}
                      className="w-full px-3 py-1.5 border border-pink-200 rounded-lg bg-white text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Occasion / Reason for Sale */}
              <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-amber-950 flex items-center gap-1.5 text-[11px]">
                    <Gift className="w-3.5 h-3.5 text-amber-700" />
                    <span>Occasion / Reason For Sale (Shown to Visitors)</span>
                  </label>
                  <span className="text-[9px] font-bold text-amber-800 bg-amber-200/70 px-1.5 py-0.5 rounded">Shown in Popup</span>
                </div>
                <textarea
                  rows={2}
                  value={editingPromo.reasonForSale || ''}
                  onChange={(e) => setEditingPromo({ ...editingPromo, reasonForSale: e.target.value })}
                  placeholder="e.g. Celebrating our Grand Festive launch with exclusive patron savings."
                  className="w-full px-3 py-2 border border-amber-300 rounded-xl bg-white text-xs font-medium text-gray-900"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {SALE_REASON_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditingPromo({ ...editingPromo, reasonForSale: preset })}
                      className="text-[10px] bg-white hover:bg-amber-100 text-amber-950 font-semibold px-2 py-0.5 rounded-lg border border-amber-300 transition-colors text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Website Popup Announcement Settings */}
              <div className="p-3.5 bg-rose-50/70 rounded-2xl border border-rose-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-rose-950 flex items-center gap-1.5 text-[11px]">
                    <Megaphone className="w-3.5 h-3.5 text-rose-600" />
                    <span>Show Custom Popup Modal on Website</span>
                  </label>
                  <input
                    type="checkbox"
                    checked={editingPromo.showPopupAnnouncement || false}
                    onChange={(e) => setEditingPromo({ ...editingPromo, showPopupAnnouncement: e.target.checked })}
                    className="w-4 h-4 accent-pink-700 cursor-pointer rounded"
                  />
                </div>

                {editingPromo.showPopupAnnouncement && (
                  <div className="space-y-2 pt-2 border-t border-rose-200">
                    <div>
                      <label className="font-bold text-gray-700 block mb-0.5 text-[10px]">Popup Headline Title</label>
                      <input
                        type="text"
                        value={editingPromo.popupTitle || ''}
                        onChange={(e) => setEditingPromo({ ...editingPromo, popupTitle: e.target.value })}
                        placeholder="🌸 Grand Festive Celebration Sale & Special Coupon!"
                        className="w-full px-3 py-1.5 border rounded-lg bg-white text-xs font-bold text-pink-950"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-gray-700 block mb-0.5 text-[10px]">Popup Badge Tag</label>
                      <input
                        type="text"
                        value={editingPromo.popupBadge || ''}
                        onChange={(e) => setEditingPromo({ ...editingPromo, popupBadge: e.target.value })}
                        placeholder="GRAND FESTIVE SPECIAL"
                        className="w-full px-3 py-1.5 border rounded-lg bg-white text-xs font-bold text-pink-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-gray-700 block mb-0.5 text-[10px]">Popup Custom Message</label>
                      <textarea
                        rows={2}
                        value={editingPromo.popupMessage || ''}
                        onChange={(e) => setEditingPromo({ ...editingPromo, popupMessage: e.target.value })}
                        placeholder="Enjoy exclusive savings on authentic handloom sarees, kurtis & designer salwar suits."
                        className="w-full px-3 py-1.5 border rounded-lg bg-white text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Collection Restriction & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-gray-700 block mb-1">Collection Restriction</label>
                  <select
                    value={editingPromo.collectionRestricted || ''}
                    onChange={(e) => setEditingPromo({ 
                      ...editingPromo, 
                      collectionRestricted: e.target.value ? (e.target.value as CollectionType) : undefined 
                    })}
                    className="w-full px-3 py-2 border rounded-xl bg-white font-medium text-xs"
                  >
                    <option value="">All Collections (Storewide)</option>
                    <option value="Jashn Collection">Jashn Collection (Wedding & Festive)</option>
                    <option value="Firdausi collection">Firdausi collection (Royal Silk)</option>
                    <option value="9 to fivers collection">9 to fivers collection (Workwear)</option>
                    <option value="'Present is Gifted' Collection">'Present is Gifted' Collection (Hampers)</option>
                    <option value="'Deal maange more' Collection">'Deal maange more' Collection (Budget)</option>
                  </select>
                </div>

                <div>
                  <label className="font-extrabold text-gray-700 block mb-1">Short Description</label>
                  <input
                    type="text"
                    value={editingPromo.description || ''}
                    onChange={(e) => setEditingPromo({ ...editingPromo, description: e.target.value })}
                    placeholder="e.g. Extra 15% OFF across catalog"
                    className="w-full px-3 py-2 border rounded-xl bg-white text-xs font-medium"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-pink-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmPromo(editingPromo)}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Coupon</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPromo(null)}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={couponSaving}
                    className="px-5 py-2.5 bg-pink-900 hover:bg-pink-800 text-amber-200 font-extrabold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4 text-amber-300" />
                    <span>{couponSaving ? 'Saving...' : 'Save Coupon Changes'}</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 3. Custom Delete Coupon Confirmation Modal */}
      {deleteConfirmPromo && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-pink-200 p-6 space-y-5 animate-in zoom-in-95 duration-200 relative">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto shadow-inner border border-rose-200">
              <AlertTriangle className="w-7 h-7 text-rose-600" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-serif font-black text-xl text-pink-950">
                Are You Sure?
              </h3>
              <p className="text-xs text-gray-700 leading-relaxed font-medium">
                Do you want to permanently delete coupon code <span className="font-mono font-black text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-200 text-xs">{deleteConfirmPromo.code}</span>?
              </p>
              <p className="text-[11px] text-gray-500">
                If yes, this coupon will be deleted immediately and removed from your store. If no, this action will be cancelled.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPromo(null)}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onDeletePromo && deleteConfirmPromo) {
                    await onDeletePromo(deleteConfirmPromo.code);
                    if (editingPromo?.code === deleteConfirmPromo.code) {
                      setEditingPromo(null);
                    }
                    setDeleteConfirmPromo(null);
                  }
                }}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Delete Immediately</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3.5. CUSTOM POPUP CONFIRMATION MODAL: DELETE HERO BANNER */}
      {deleteConfirmBanner && (
        <div className="fixed inset-0 z-[125] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-rose-200 p-6 space-y-4 animate-in zoom-in-95 duration-200 relative">
            <button
              type="button"
              onClick={() => !isDeletingBanner && setDeleteConfirmBanner(null)}
              disabled={isDeletingBanner}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Warning Icon Badge */}
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto shadow-inner border border-rose-200">
              <Trash2 className="w-7 h-7 text-rose-600" />
            </div>

            {/* Title and Confirmation Prompt */}
            <div className="text-center space-y-2">
              <h3 className="font-serif font-black text-xl text-pink-950">
                Are You Sure?
              </h3>
              <p className="text-xs text-gray-700 leading-relaxed font-medium">
                Do you want to permanently delete this hero banner from your store homepage?
              </p>

              {/* Banner Details Preview */}
              <div className="p-3 bg-rose-50/80 rounded-2xl border border-rose-200/80 text-left space-y-2 mt-2">
                {deleteConfirmBanner.image && (
                  <div className="aspect-[16/9] w-full rounded-xl overflow-hidden bg-black relative border border-rose-200">
                    <img
                      src={deleteConfirmBanner.image}
                      alt={deleteConfirmBanner.title || 'Banner'}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                    {deleteConfirmBanner.tag || 'Hero Slide'}
                  </span>
                  <p className="font-bold text-xs text-gray-900 mt-1 line-clamp-1">
                    {deleteConfirmBanner.title || 'Untitled Banner'}
                  </p>
                  {deleteConfirmBanner.ctaLink && (
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                      Target: {deleteConfirmBanner.ctaLink}
                    </p>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-gray-500 pt-1">
                If yes, this banner will be removed from Firestore and your live website immediately. If not, this action will be cancelled.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingBanner}
                onClick={() => setDeleteConfirmBanner(null)}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                No, Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingBanner}
                onClick={async () => {
                  if (onDeleteBanner && deleteConfirmBanner) {
                    try {
                      setIsDeletingBanner(true);
                      await onDeleteBanner(deleteConfirmBanner.id);
                      if (editingBannerId === deleteConfirmBanner.id) {
                        setEditingBannerId(null);
                        setBannerForm({
                          tag: 'NEW ARRIVAL SPOTLIGHT',
                          title: '',
                          description: '',
                          image: '',
                          ctaText: 'Shop Now',
                          ctaLink: '',
                          targetCollection: 'All',
                          targetCategory: 'All'
                        });
                      }
                      setDeleteConfirmBanner(null);
                    } finally {
                      setIsDeletingBanner(false);
                    }
                  }
                }}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70"
              >
                {isDeletingBanner ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>Yes, Delete Banner</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. CUSTOM POPUP CONFIRMATION MODAL: DELETE PRODUCT ITEM */}
      {productToDelete && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-rose-200 p-6 space-y-4 animate-in zoom-in-95 duration-200 relative">
            <button
              type="button"
              onClick={() => !isDeletingProduct && setProductToDelete(null)}
              disabled={isDeletingProduct}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Warning Icon Badge */}
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto shadow-inner border border-rose-200">
              <Trash2 className="w-7 h-7 text-rose-600" />
            </div>

            {/* Title and Confirmation Prompt */}
            <div className="text-center space-y-2">
              <h3 className="font-serif font-black text-xl text-pink-950">
                Are you sure to delete?
              </h3>
              <p className="text-xs text-gray-700 leading-relaxed font-medium">
                Are you sure you want to permanently delete this item from your catalog?
              </p>
              
              {/* Product details card */}
              <div className="p-3 bg-rose-50/80 rounded-2xl border border-rose-200/80 text-left space-y-1 mt-2">
                <p className="font-bold text-xs text-gray-900 line-clamp-1">{productToDelete.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold bg-white text-pink-900 px-2 py-0.5 rounded border border-pink-200">
                    SKU: {productToDelete.sku || productToDelete.id}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">ID: {productToDelete.id}</span>
                </div>
              </div>

              <p className="text-[11px] text-gray-500 pt-1">
                If yes, this item will be deleted permanently. If not, this action will be cancelled.
              </p>
            </div>

            {/* Actions: Cancel vs Delete */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={handleConfirmDeleteProduct}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70"
              >
                {isDeletingProduct ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>Yes, Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. SHIPROCKET CREDENTIALS & COURIER PICKUP CONFIGURATION MODAL */}
      {showShiprocketModal && (
        <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-pink-200 p-6 space-y-5 animate-in zoom-in-95 duration-200 relative my-8">
            <button
              type="button"
              onClick={() => setShowShiprocketModal(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-pink-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-pink-900 text-amber-200 flex items-center justify-center shrink-0 shadow-md">
                <Truck className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h3 className="font-serif font-black text-lg text-pink-950">
                  Shiprocket Courier Pickup Settings
                </h3>
                <p className="text-xs text-gray-500">
                  Configure live fulfillment so paid Razorpay orders get picked up by couriers.
                </p>
              </div>
            </div>

            {/* Rate Limit Alert Banner if blocked */}
            {shiprocketTestStatus?.isBlocked && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl flex items-center justify-between text-xs text-rose-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Shiprocket temporary rate limit cooldown active ({shiprocketTestStatus.cooldownRemainingSec || 0}s remaining).</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetShiprocketCooldown}
                  disabled={testingShiprocket}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] shrink-0"
                >
                  {testingShiprocket ? 'Resetting...' : 'Reset Lockout Now'}
                </button>
              </div>
            )}

            {/* Explanatory Guide Banner */}
            <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl text-xs space-y-2 text-amber-950 leading-relaxed">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Shiprocket Access Modules &amp; Recommended Setup</span>
              </p>
              <div className="space-y-1.5 text-[11px] text-amber-900">
                <p>
                  <strong>Shiprocket has 5 access modules:</strong> Orders (create, update), Settings, Shipments, Listings, and Courier. Selecting all of these is 100% correct (there is <em>no</em> separate &quot;Buyer Details&quot; module).
                </p>
                <div className="mt-1 p-2.5 bg-white/80 rounded-xl border border-amber-300 space-y-1.5 text-[10.5px]">
                  <p className="font-bold text-amber-950">Why does automated login return 403, and why is a Direct Bearer Token recommended?</p>
                  <p className="text-gray-700 leading-normal">
                    Shiprocket&apos;s login endpoint (<code>/v1/external/auth/login</code>) uses strict cloud-firewall bot detection that often blocks automated logins from hosting servers. However, <strong>all actual shipping &amp; order endpoints accept a Direct Bearer Token without any firewall blockage</strong>.
                  </p>
                  <div className="pt-1">
                    <p className="font-semibold text-pink-900">How to get your Bearer Token in 10 seconds:</p>
                    <p className="text-gray-600">Run this single command in your computer&apos;s Terminal, Command Prompt, or Postman:</p>
                    <code className="block mt-1 p-2 bg-slate-900 text-pink-300 rounded-lg font-mono text-[10px] break-all select-all">
                      {`curl -X POST https://apiv2.shiprocket.in/v1/external/auth/login -H "Content-Type: application/json" -d '{"email": "${shiprocketForm.email || 'api2@featherhutfashion.com'}", "password": "YOUR_PASSWORD"}'`}
                    </code>
                    <p className="text-[10px] text-gray-500 mt-1">
                      Copy the <code>&quot;token&quot;</code> from the output, paste it into the <strong>Direct Bearer Token</strong> field below, and click <strong>&quot;Save &amp; Verify&quot;</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Credentials Form */}
            <form onSubmit={handleSaveShiprocketCredentials} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-800 flex items-center gap-1.5">
                    <span>Shiprocket Direct Bearer Token</span>
                    <span className="text-emerald-700 font-extrabold text-[10px] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Recommended (Bypasses 403)</span>
                  </label>
                  <a
                    href="https://app.shiprocket.in/api-user"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-pink-700 hover:underline flex items-center gap-0.5 font-semibold"
                  >
                    <span>Shiprocket API User Panel</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                {shiprocketTestStatus?.authenticated && shiprocketTestStatus?.hasOrderPermission === false && (
                  <div className="mb-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-rose-900 font-bold">API Token Lacks &quot;Orders&quot; Permission (HTTP 403)</strong>
                      <span className="text-[10.5px]">This token authenticates, but Shiprocket rejected order creation: <em>{shiprocketTestStatus.orderPermissionError || 'Unauthorized. You do not have permission for this action.'}</em>. In Shiprocket Settings &gt; API, ensure your API User has <strong>&quot;Orders (create, update)&quot;</strong> enabled, or generate a fresh Bearer Token.</span>
                    </div>
                  </div>
                )}

                {shiprocketTestStatus?.currentConfig?.hasToken && shiprocketTestStatus?.hasOrderPermission !== false && (
                  <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Direct Bearer Token is ACTIVE &amp; Order Permissions Verified.</strong>
                      {shiprocketTestStatus.currentConfig.tokenAccount && ` Linked: ${shiprocketTestStatus.currentConfig.tokenAccount}.`}
                      {shiprocketTestStatus.currentConfig.tokenExpiry && ` Valid until: ${shiprocketTestStatus.currentConfig.tokenExpiry}.`}
                    </span>
                  </div>
                )}

                <input
                  type="password"
                  value={shiprocketForm.token}
                  onChange={(e) => setShiprocketForm({ ...shiprocketForm, token: e.target.value })}
                  placeholder={shiprocketTestStatus?.currentConfig?.hasToken ? "Paste a new JWT token to update (eyJ...)" : "Paste JWT Bearer Token (eyJ...)"}
                  className="w-full px-3 py-2 bg-pink-50/40 border border-pink-200 rounded-xl font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Pasting a direct Bearer token immediately resolves login lockouts and allows real AWB generation. Any leading <code>Bearer </code> or quotation marks are automatically stripped.
                </p>
              </div>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-[10px] font-bold text-gray-400 uppercase">Or Dedicated API User Credentials</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-800 block mb-1">
                    Dedicated API User Email <span className="text-[10px] text-pink-700 font-normal">(Not main login)</span>
                  </label>
                  <input
                    type="email"
                    value={shiprocketForm.email}
                    onChange={(e) => setShiprocketForm({ ...shiprocketForm, email: e.target.value })}
                    placeholder="api-user@example.com"
                    className="w-full px-3 py-2 bg-pink-50/40 border border-pink-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  <p className="text-[9.5px] text-gray-500 mt-0.5">
                    Must be created in Shiprocket &gt; Settings &gt; API &gt; Configure.
                  </p>
                </div>
                <div>
                  <label className="font-bold text-gray-800 block mb-1">API User Password</label>
                  <input
                    type="password"
                    value={shiprocketForm.password}
                    onChange={(e) => setShiprocketForm({ ...shiprocketForm, password: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 bg-pink-50/40 border border-pink-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  <p className="text-[9.5px] text-gray-500 mt-0.5">
                    The password created for the API user.
                  </p>
                </div>
              </div>

              {/* Automated 24/7 Token Self-Renewal & Security Status */}
              <div className="bg-gradient-to-br from-emerald-50/80 via-teal-50/50 to-pink-50/40 border border-emerald-200/90 p-3.5 rounded-2xl space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>Automatic Token Self-Renewal (Zero Manual Work)</span>
                  </div>
                  {shiprocketTestStatus?.currentConfig?.autoRenewEnabled ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-900 font-extrabold px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                      <Check className="w-2.5 h-2.5 text-emerald-700" /> Auto-Renewal Enabled
                    </span>
                  ) : (
                    <span className="text-[10px] bg-indigo-50 text-indigo-900 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                      Save API Password to Activate
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-gray-700 leading-relaxed">
                  <strong>Never Copy-Paste Tokens Again:</strong> When your API User email and password are saved, our backend server automatically logs in, fetches the official 10-day JWT token, and seamlessly renews it in the background before it expires.
                </p>

                <div className="flex items-start gap-2 bg-white/90 p-2.5 rounded-xl border border-emerald-100 text-[10.5px] text-gray-600 leading-normal">
                  <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>100% Server-Side Protection:</strong> All Shiprocket tokens and credentials are encrypted and stored exclusively on the private backend server. They are <em>never</em> sent to customer browsers or client devices, ensuring no malicious user can intercept or benefit from your account.
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-800 block mb-1">
                  Registered Pickup Location Nickname
                </label>
                <input
                  type="text"
                  value={shiprocketForm.pickupLocation}
                  onChange={(e) => setShiprocketForm({ ...shiprocketForm, pickupLocation: e.target.value })}
                  placeholder="Primary (or your exact warehouse nickname in Shiprocket)"
                  className="w-full px-3 py-2 bg-pink-50/40 border border-pink-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Must match the Pickup Location name configured in Shiprocket &gt; Settings &gt; Pickup Locations (e.g. <em>Primary</em> or <em>Warehouse-1</em>).
                </p>
              </div>

              {/* Connected Store Channels & Razorpay Channel Info */}
              <div className="bg-gradient-to-br from-indigo-50/70 to-pink-50/50 border border-indigo-200/80 p-3.5 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-700" />
                    <span>Connected Store Channel (Razorpay / Custom)</span>
                  </span>
                  {shiprocketTestStatus?.channels && shiprocketTestStatus.channels.length > 0 && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-900 font-extrabold px-2 py-0.5 rounded-full border border-indigo-200">
                      {shiprocketTestStatus.channels.length} Channels Detected
                    </span>
                  )}
                </div>

                {shiprocketTestStatus?.channels && shiprocketTestStatus.channels.length > 0 ? (
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-gray-700 block">
                      Select Primary Order Channel:
                    </label>
                    <select
                      value={shiprocketForm.channelId || String(shiprocketTestStatus.channel?.id || '')}
                      onChange={(e) => setShiprocketForm({ ...shiprocketForm, channelId: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {shiprocketTestStatus.channels.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          {ch.store_name || ch.name} (Channel ID: {ch.id}) - {ch.status || 'Active'}
                        </option>
                      ))}
                    </select>

                    <div className="p-2.5 bg-white/90 rounded-xl border border-indigo-100 text-[11px] text-gray-700 space-y-1.5">
                      <p className="font-bold text-indigo-950 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Connected: FEAT (Razorpay) - Channel 12095318</span>
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-[10.5px] text-gray-600 pl-1">
                        <li>
                          <strong>"Last Inventory Sync: Inventory Sync is Off" — Completely Normal:</strong> Razorpay is a payment gateway, not an inventory management warehouse (like Shopify). Razorpay does not manage inventory stocks, so Shiprocket automatically keeps inventory sync off.
                        </li>
                        <li>
                          <strong>"Last Order Sync: Never Synced" — Completely Normal:</strong> Shiprocket shows "Never Synced" until the first sync cycle runs or orders are placed through Razorpay.
                        </li>
                        <li>
                          <strong>Automated Dispatch:</strong> Feather Hut Fashion also sends checkout orders directly to this channel via the Shiprocket API for instant AWB generation.
                        </li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-600 space-y-1">
                    <p>
                      Active Channel: <strong className="text-gray-900 font-mono">{shiprocketTestStatus?.channel?.store_name || shiprocketTestStatus?.channel?.name || 'FEAT (Razorpay)'} (ID: {shiprocketTestStatus?.channel?.id || '12095318'})</strong>
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Orders booked through Feather Hut Fashion will automatically link to this store channel on Shiprocket.
                    </p>
                  </div>
                )}
              </div>

              {/* Real-time Tracking Webhook Card */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                    <Truck className="w-3.5 h-3.5 text-pink-700" />
                    <span>Real-time Courier Tracking Webhook Setup</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                    <Check className="w-2.5 h-2.5 text-emerald-700" /> Webhook Ready
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  In your <strong>Shiprocket Dashboard &gt; Settings &gt; API &gt; Webhooks</strong>, click <strong>Add Webhook</strong> and configure with:
                </p>

                {/* Webhook URL for featherhutfashion.com */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-gray-700">
                    <span>1. Webhook URL (Production Website):</span>
                    <span className="text-[10px] text-pink-900 font-bold">Recommended with www</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value="https://www.featherhutfashion.com/api/delivery-updates/webhook"
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-mono text-[11px] text-gray-800 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          navigator.clipboard.writeText("https://www.featherhutfashion.com/api/delivery-updates/webhook");
                          setShiprocketCredsFeedback({
                            success: true,
                            message: "Copied Production Webhook URL (https://www.featherhutfashion.com/api/delivery-updates/webhook) to clipboard!"
                          });
                        }
                      }}
                      className="px-3 py-1.5 bg-pink-900 hover:bg-pink-800 text-amber-200 text-xs font-bold rounded-lg shrink-0 flex items-center gap-1 shadow-xs transition-colors"
                      title="Copy URL"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    <em>Use <code>https://www.featherhutfashion.com/...</code> (the naked domain redirects POST requests with HTTP 405).</em>
                  </p>
                </div>

                {/* Webhook Security Token */}
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-gray-700">
                    <span>2. Webhook Token (Security):</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value="feather_hut_fashion_2026"
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-mono text-[11px] text-pink-900 font-bold select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          navigator.clipboard.writeText("feather_hut_fashion_2026");
                          setShiprocketCredsFeedback({
                            success: true,
                            message: "Copied Webhook Token (feather_hut_fashion_2026) to clipboard!"
                          });
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg shrink-0 flex items-center gap-1 shadow-xs transition-colors"
                      title="Copy Token"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-gray-500 space-y-0.5 pt-0.5 border-t border-slate-200">
                  <p>• <strong>Event to select in Shiprocket:</strong> <code>Tracking</code> (or Order / Shipment Status)</p>
                  <p>• <strong>Sandbox / Dev URL (if testing in preview):</strong> <code className="select-all">{typeof window !== 'undefined' ? window.location.origin : ''}/api/delivery-updates/webhook</code></p>
                </div>
              </div>

              {/* Feedback Notice */}
              {shiprocketCredsFeedback && (
                <div className={`p-3 rounded-xl border text-xs font-bold ${
                  shiprocketCredsFeedback.success 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}>
                  {shiprocketCredsFeedback.message}
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowShiprocketModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingShiprocketCreds}
                  className="px-5 py-2.5 bg-pink-900 hover:bg-pink-800 text-amber-200 font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingShiprocketCreds ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                      <span>Authenticating with Shiprocket...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-amber-300" />
                      <span>Test & Save Credentials</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin GST Tax Invoice Preview Modal */}
      {invoiceModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[96vh] rounded-3xl shadow-2xl border border-pink-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-pink-950 via-pink-900 to-amber-950 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-amber-400/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold border border-amber-400/30 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-serif font-black text-base sm:text-lg text-amber-100">
                      GST Tax Invoice Preview
                    </h3>
                    <span className="font-mono font-bold text-xs bg-pink-900/90 text-amber-300 px-2.5 py-0.5 rounded-lg border border-amber-400/30">
                      INV-FEAT-{invoiceModalOrder.id.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/80 mt-0.5">
                    Customer: <strong className="text-white">{invoiceModalOrder.deliveryAddress?.fullName || invoiceModalOrder.customerEmail}</strong> • Date: {invoiceModalOrder.date} • Total: ₹{invoiceModalOrder.finalAmount.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => downloadTaxInvoiceFile(invoiceModalOrder)}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-pink-950 text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-98"
                  title="Download Tax Invoice HTML file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={() => printTaxInvoice(invoiceModalOrder)}
                  className="px-3 py-2 bg-pink-800/80 hover:bg-pink-700 text-amber-200 border border-pink-600/60 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Print or Save as PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-300" />
                  <span>Print / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadTaxInvoice(invoiceModalOrder)}
                  className="px-2.5 py-2 bg-black/30 hover:bg-black/50 text-white/90 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                  title="Open in new window"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Tab</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInvoiceModalOrder(null)}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
                  title="Close Invoice Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Iframe Content */}
            <div className="flex-1 bg-gray-100 overflow-hidden relative min-h-[500px]">
              <iframe
                title={`Invoice-${invoiceModalOrder.id}`}
                srcDoc={generateTaxInvoiceHTML(invoiceModalOrder)}
                className="w-full h-full min-h-[550px] sm:min-h-[650px] border-0 bg-white"
              />
            </div>

            {/* Modal Footer */}
            <div className="bg-pink-50/90 px-5 py-3 border-t border-pink-200/80 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-pink-950">Invoice No:</span>
                <span className="font-mono text-pink-900 font-bold bg-white px-2 py-0.5 rounded border border-pink-200">
                  INV-FEAT-{invoiceModalOrder.id.toUpperCase()}
                </span>
                <span className="text-[11px] text-gray-500">• 5% Statutory GST Breakdown Included • HSN 6204</span>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setInvoiceModalOrder(null)}
                  className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => downloadTaxInvoiceFile(invoiceModalOrder)}
                  className="px-4 py-1.5 bg-pink-900 hover:bg-pink-950 text-amber-200 rounded-xl font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-300" />
                  <span>Download HTML</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Admin Official Courier Shipping Bill / Package Label Preview Modal */}
      {shippingBillModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl max-h-[96vh] rounded-3xl shadow-2xl border border-emerald-300 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-stone-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center font-bold border border-emerald-400/30 shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-serif font-black text-base sm:text-lg text-emerald-100">
                      Shipping Bill / Package Label
                    </h3>
                    <span className="font-mono font-bold text-xs bg-emerald-900/90 text-emerald-300 px-2.5 py-0.5 rounded-lg border border-emerald-400/30">
                      {shippingBillModalOrder.shiprocketAwbCode ? `AWB: ${shippingBillModalOrder.shiprocketAwbCode}` : `REF: SRE01-${shippingBillModalOrder.id}`}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200/80 mt-0.5">
                    Ship To: <strong className="text-white">{shippingBillModalOrder.deliveryAddress?.fullName || 'Customer'}</strong> • {shippingBillModalOrder.deliveryAddress?.city || 'City'}, {shippingBillModalOrder.deliveryAddress?.state || 'State'} ({shippingBillModalOrder.deliveryAddress?.pincode || 'Pincode'})
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={generatingLabelOrderId === shippingBillModalOrder.id}
                  onClick={() => handlePrintShippingLabel(shippingBillModalOrder)}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-emerald-950 text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                  title="Step 3: Open 100x150 mm (4x6 inch) thermal label PDF in browser print window"
                >
                  {generatingLabelOrderId === shippingBillModalOrder.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-950" />
                  ) : (
                    <Printer className="w-3.5 h-3.5 text-emerald-950" />
                  )}
                  <span>Print on Thermal Printer</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-200 px-1.5 py-0.5 rounded font-mono font-bold">
                    100x150mm
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadShippingBillFile(shippingBillModalOrder)}
                  className="px-3 py-2 bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-600/60 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Download Shipping Label PDF"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadShippingBill(shippingBillModalOrder)}
                  className="px-2.5 py-2 bg-black/30 hover:bg-black/50 text-white/90 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                  title="Open in new window"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Tab</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShippingBillModalOrder(null)}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
                  title="Close Shipping Bill Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Shiprocket Status & Action Strip */}
            {shippingBillModalOrder.shiprocketLabelUrl ? (
              <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2 text-emerald-950 font-bold">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Official Shiprocket Thermal Label Loaded (100x150 mm)</span>
                  {shippingBillModalOrder.shiprocketAwbCode && (
                    <span className="font-mono text-[11px] bg-white border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded-md">
                      AWB: {shippingBillModalOrder.shiprocketAwbCode}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={generatingInvoiceOrderId === shippingBillModalOrder.id}
                    onClick={() => handleFetchShiprocketInvoice(shippingBillModalOrder)}
                    className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    title="View or fetch official Shiprocket Tax Invoice"
                  >
                    {generatingInvoiceOrderId === shippingBillModalOrder.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-700" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-pink-700" />
                    )}
                    <span>{shippingBillModalOrder.shiprocketInvoiceUrl ? 'View Shiprocket Invoice' : 'Fetch Shiprocket Invoice'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2 text-amber-950 font-medium">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Shiprocket live thermal label not yet generated. Showing formatted store package bill.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={generatingLabelOrderId === shippingBillModalOrder.id}
                    onClick={() => handlePrintShippingLabel(shippingBillModalOrder)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    {generatingLabelOrderId === shippingBillModalOrder.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>Fetch Official Label from Shiprocket</span>
                  </button>
                  <button
                    type="button"
                    disabled={generatingInvoiceOrderId === shippingBillModalOrder.id}
                    onClick={() => handleFetchShiprocketInvoice(shippingBillModalOrder)}
                    className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    title="Fetch official Shiprocket Tax Invoice"
                  >
                    {generatingInvoiceOrderId === shippingBillModalOrder.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-700" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-pink-700" />
                    )}
                    <span>Fetch Shiprocket Invoice</span>
                  </button>
                </div>
              </div>
            )}

            {/* Modal Iframe Content */}
            <div className="flex-1 bg-stone-100 overflow-hidden relative min-h-[360px] sm:min-h-[500px]">
              {shippingBillModalOrder.shiprocketLabelUrl ? (
                <iframe
                  title={`Shipping-Bill-${shippingBillModalOrder.id}`}
                  src={shippingBillModalOrder.shiprocketLabelUrl}
                  className="w-full h-full min-h-[360px] sm:min-h-[620px] border-0 bg-white"
                />
              ) : (
                <iframe
                  title={`Shipping-Bill-${shippingBillModalOrder.id}`}
                  srcDoc={generateShippingBillHTML(shippingBillModalOrder)}
                  className="w-full h-full min-h-[360px] sm:min-h-[620px] border-0 bg-stone-100"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-emerald-50/90 px-5 py-3 border-t border-emerald-200/80 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-emerald-950">Courier Partner:</span>
                <span className="font-semibold text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-200">
                  {shippingBillModalOrder.shiprocketCourierName || 'Shiprocket Live Partner'}
                </span>
                <span className="text-[11px] text-stone-500">• 100x150 mm (4x6") Thermal Label • Barcode & Courier AWB Ready</span>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setShippingBillModalOrder(null)}
                  className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={generatingLabelOrderId === shippingBillModalOrder.id}
                  onClick={() => handlePrintShippingLabel(shippingBillModalOrder)}
                  className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Print Label (100x150mm)</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
