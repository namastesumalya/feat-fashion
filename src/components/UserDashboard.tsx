import React, { useState, useEffect } from 'react';
import { 
  X, Package, Clock, Truck, CheckCircle2, AlertCircle, MapPin, 
  ChevronRight, RefreshCw, User, Mail, Shield, LogOut, FileText, 
  ExternalLink, Ban, AlertTriangle, ArrowRight, Download, Edit3, 
  Plus, Check, Navigation, Phone, Home, Briefcase, Compass, ArrowLeft,
  ShieldCheck, Sparkles, Gift, Share2, Copy, Coins, Award, HelpCircle,
  Search
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { userDb } from '../firebase';
import { sanitizeForFirestore } from '../firebaseAdmin';
import { Order, DeliveryAddress, Product } from '../types';
import { downloadTaxInvoice } from '../utils/invoiceGenerator';
import { getLiveLocationAndAddress } from '../utils/geolocation';
import { lookupCityStateByPincode } from '../utils/pincodeLookup';
import { ShiprocketTracker } from './ShiprocketTracker';
import { AccountAuthBarrier } from './AccountAuthBarrier';
import { getStoredCustomerSession } from '../services/authService';
import { 
  getUserReferralProfile, 
  createUserReferralCode, 
  acknowledgeFeatherCredit, 
  checkReferralCodeAvailability,
  UserReferralProfile, 
  MagicFeatherTransaction, 
  FEATHER_RUPEE_VALUE, 
  MagicFeatherSvg 
} from '../services/referralService';
import { triggerFeatherAnimation } from './FloatingFeatherAnimation';
import { RealWorld12DayFeatherCelebration } from './RealWorld12DayFeatherCelebration';

export interface UserDashboardProps {
  isOpen?: boolean;
  onClose?: () => void;
  onBackToHome?: () => void;
  orders: Order[];
  allProducts?: Product[];
  onSelectProduct?: (product: Product) => void;
  onOpenOrderDetails?: (order: Order) => void;
  currentUser?: any;
  onSignOut?: () => void;
  onCancelOrder?: (orderId: string, reason: string) => Promise<{ success: boolean; order?: Order }>;
  onUpdateOrderAddress?: (orderId: string, address: DeliveryAddress) => Promise<{ success: boolean; order?: Order }>;
}

interface UserProfileData {
  name: string;
  email: string;
  phone: string;
  defaultAddress?: DeliveryAddress;
}

const EMPTY_ADDRESS: DeliveryAddress = {
  fullName: '',
  phone: '',
  pincode: '',
  addressLine: '',
  city: '',
  state: 'West Bengal',
  landmark: '',
  type: 'Home'
};

export const UserDashboard: React.FC<UserDashboardProps> = ({
  isOpen,
  onClose,
  onBackToHome,
  orders,
  allProducts = [],
  onSelectProduct,
  onOpenOrderDetails,
  currentUser,
  onSignOut,
  onCancelOrder,
  onUpdateOrderAddress
}) => {
  // Navigate to item product page even if out of stock
  const handleViewProduct = (itemProduct: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!itemProduct) return;

    // Find the latest product version from allProducts if available (matches id or sku or name)
    const matched = (allProducts || []).find(
      p => p.id === itemProduct.id || 
      (p.sku && itemProduct.sku && p.sku === itemProduct.sku) ||
      (p.name && itemProduct.name && p.name.trim().toLowerCase() === itemProduct.name.trim().toLowerCase())
    );

    const targetProduct: Product = matched || {
      id: itemProduct.id || 'prod-' + Math.random().toString(36).substring(2, 7),
      name: itemProduct.name || 'Ethnic Handloom Weave',
      price: Number(itemProduct.price) || 999,
      originalPrice: Number(itemProduct.originalPrice) || Number(itemProduct.price) || 1499,
      discountPercent: Number(itemProduct.discountPercent) || 20,
      rating: Number(itemProduct.rating) || 0,
      ratingCount: Number(itemProduct.ratingCount) || 0,
      images: Array.isArray(itemProduct.images) && itemProduct.images.length > 0 ? itemProduct.images : ['/images/placeholder.jpg'],
      category: itemProduct.category || 'Kurti',
      collection: (itemProduct.collection as any) || 'Jashn Collection',
      fabric: itemProduct.fabric || 'Cotton Blend / Silk',
      careInstructions: itemProduct.careInstructions || 'Dry clean recommended for handloom longevity.',
      description: itemProduct.description || 'Authentic traditional handloom masterpiece.',
      sizes: Array.isArray(itemProduct.sizes) && itemProduct.sizes.length > 0 ? itemProduct.sizes : ['Free Size'],
      stockCount: typeof itemProduct.stockCount === 'number' ? itemProduct.stockCount : 0,
      sizeStock: itemProduct.sizeStock || {},
      colors: itemProduct.colors || ['Default'],
      colorVariants: itemProduct.colorVariants || [],
      reviews: itemProduct.reviews || [],
      tags: itemProduct.tags || ['Handloom', 'Authentic'],
      sku: itemProduct.sku
    };

    if (onSelectProduct) {
      onClose();
      onSelectProduct(targetProduct);
    }
  };

  // Strict Security Isolation: Only display orders belonging exclusively to the authenticated user
  const userEmail = currentUser?.email?.toLowerCase().trim();
  const userUid = currentUser?.uid;

  const effectiveOrders = orders.filter(o => {
    if (!userEmail && !userUid) return false;
    const orderEmail = o.customerEmail?.toLowerCase().trim();
    const orderUid = (o as any).userId || (o as any).customerUid;
    const emailMatches = Boolean(userEmail && orderEmail && orderEmail === userEmail);
    const uidMatches = Boolean(userUid && orderUid && orderUid === userUid);
    return emailMatches || uidMatches;
  });

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(effectiveOrders[0] || null);

  // Keep selected order synchronized when effective orders change
  useEffect(() => {
    if (effectiveOrders.length > 0) {
      if (!selectedOrder || !effectiveOrders.some(o => o.id === selectedOrder.id)) {
        setSelectedOrder(effectiveOrders[0]);
      }
    } else {
      setSelectedOrder(null);
    }
  }, [effectiveOrders]);
  const [activeTab, setActiveTab] = useState<'orders' | 'profile' | 'addresses' | 'referrals'>('orders');
  
  // Magic Feathers Loyalty & Referral State
  const [referralProfile, setReferralProfile] = useState<UserReferralProfile | null>(null);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [newCodeInput, setNewCodeInput] = useState('');
  const [creatingCode, setCreatingCode] = useState(false);
  const [createCodeError, setCreateCodeError] = useState<string | null>(null);
  const [createCodeSuccess, setCreateCodeSuccess] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Live Referral Code Availability State (Must check if taken before enabling save)
  const [checkingCodeAvailability, setCheckingCodeAvailability] = useState(false);
  const [codeAvailability, setCodeAvailability] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'unverified'>('idle');
  const [codeAvailabilityMsg, setCodeAvailabilityMsg] = useState<string | null>(null);
  const [verifiedAvailableCode, setVerifiedAvailableCode] = useState<string | null>(null);
  
  // Real-world 12-day referral maturity celebration state
  const [celebrationTx, setCelebrationTx] = useState<MagicFeatherTransaction | null>(null);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);

  const fetchReferralData = async () => {
    if (!currentUser?.uid && !currentUser?.email) return;
    setLoadingReferrals(true);
    try {
      const data = await getUserReferralProfile(currentUser?.uid || '', currentUser?.email || '');
      setReferralProfile(data);
      if (data.referralCode) {
        setNewCodeInput(data.referralCode);
      }

      // Check if any transaction was matured by the backend (friend kept order 12+ days without return)
      if (typeof window !== 'undefined' && data?.transactions) {
        const uncelebratedMatured = data.transactions.find(tx => 
          tx.status === 'credited' && 
          tx.type === 'referral_earned' && 
          tx.orderId !== 'SIGNUP_REFERRAL' &&
          tx.orderId !== 'SIGNUP_BONUS' &&
          (tx.isNewCredit || !sessionStorage.getItem(`celebrated_matured_tx_${tx.id}`))
        );

        if (uncelebratedMatured) {
          sessionStorage.setItem(`celebrated_matured_tx_${uncelebratedMatured.id}`, 'true');
          setCelebrationTx(uncelebratedMatured);
          setIsCelebrationOpen(true);
          acknowledgeFeatherCredit(uncelebratedMatured.id);
        }
      }
    } catch (err) {
      console.error('Failed to load referral profile:', err);
    } finally {
      setLoadingReferrals(false);
    }
  };

  useEffect(() => {
    fetchReferralData();
  }, [currentUser]);

  // Explicit check whether referral code is available or already taken
  const performCheck = async (targetCode?: string) => {
    const raw = targetCode !== undefined ? targetCode : newCodeInput;
    const clean = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (!clean) {
      setCodeAvailability('idle');
      setCodeAvailabilityMsg(null);
      setVerifiedAvailableCode(null);
      return;
    }

    if (clean.length < 3) {
      setCodeAvailability('invalid');
      setCodeAvailabilityMsg('Referral code must be at least 3 characters long.');
      setVerifiedAvailableCode(null);
      return;
    }

    if (clean.length > 15) {
      setCodeAvailability('invalid');
      setCodeAvailabilityMsg('Referral code cannot exceed 15 characters.');
      setVerifiedAvailableCode(null);
      return;
    }

    setCodeAvailability('checking');
    setCodeAvailabilityMsg(`Checking if "${clean}" is taken across all users...`);
    setCheckingCodeAvailability(true);
    setCreateCodeError(null);

    try {
      const res = await checkReferralCodeAvailability(clean, currentUser?.uid, currentUser?.email);
      if (res.available) {
        setCodeAvailability('available');
        setCodeAvailabilityMsg(res.message || `✓ Great! Code "${clean}" is available. Save button is now enabled.`);
        setVerifiedAvailableCode(clean);
      } else {
        setCodeAvailability('taken');
        setCodeAvailabilityMsg(res.error || `❌ Code "${clean}" is already taken by another user. Please choose another.`);
        setVerifiedAvailableCode(null);
      }
    } catch (_) {
      setCodeAvailability('taken');
      setCodeAvailabilityMsg(`Unable to verify code availability for "${clean}". Please try again.`);
      setVerifiedAvailableCode(null);
    } finally {
      setCheckingCodeAvailability(false);
    }
  };

  // Immediate input handler - invalidates save button the millisecond user types or edits
  const handleCodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setNewCodeInput(val);
    setCreateCodeError(null);
    
    // Invalidate previously verified code so Save button is strictly disabled
    if (val !== verifiedAvailableCode) {
      setVerifiedAvailableCode(null);
      if (!val) {
        setCodeAvailability('idle');
        setCodeAvailabilityMsg(null);
      } else if (val.length < 3) {
        setCodeAvailability('invalid');
        setCodeAvailabilityMsg('Referral code must be at least 3 characters.');
      } else if (val.length > 15) {
        setCodeAvailability('invalid');
        setCodeAvailabilityMsg('Referral code cannot exceed 15 characters.');
      } else {
        setCodeAvailability('unverified');
        setCodeAvailabilityMsg('Code changed. Checking availability...');
      }
    }
  };

  // Debounced auto-check when typing stops
  useEffect(() => {
    if (referralProfile?.referralCode) {
      setCodeAvailability('idle');
      setCodeAvailabilityMsg(null);
      setVerifiedAvailableCode(null);
      return;
    }

    const clean = newCodeInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean || clean.length < 3 || clean.length > 15) {
      return;
    }

    const timer = setTimeout(() => {
      performCheck(clean);
    }, 400);

    return () => clearTimeout(timer);
  }, [newCodeInput, referralProfile?.referralCode, currentUser]);

  // Handle Referral Code Creation (One-time, non-editable permanent creation)
  const handleCreatePermanentCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateCodeError(null);
    setCreateCodeSuccess(null);
    
    const clean = newCodeInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean) {
      setCreateCodeError('Please enter a referral code.');
      return;
    }

    if (clean.length < 3) {
      setCreateCodeError('Referral code must be at least 3 characters long.');
      return;
    }

    if (codeAvailability !== 'available' || verifiedAvailableCode !== clean) {
      setCreateCodeError(`Please verify code availability first. "${clean}" has not been confirmed as available.`);
      return;
    }

    setCreatingCode(true);
    try {
      const res = await createUserReferralCode(currentUser?.uid || '', currentUser?.email || '', clean);
      if (!res.success) {
        setCreateCodeError(res.error || 'Failed to create referral code.');
        if (res.error && res.error.toLowerCase().includes('already taken')) {
          setCodeAvailability('taken');
          setCodeAvailabilityMsg(res.error);
          setVerifiedAvailableCode(null);
        }
      } else {
        setCreateCodeSuccess(`Your permanent referral code "${res.referralCode}" is successfully activated! Share it to start earning up to 5% (0.1%–5.0% dynamic) in Magic Feathers.`);
        // Trigger feather celebration animation
        triggerFeatherAnimation({
          featherCount: 18,
          durationMs: 3000,
          label: 'Magic Feather Code Created! ✨'
        });
        await fetchReferralData();
      }
    } catch (err: any) {
      setCreateCodeError(err.message || 'Error creating referral code. Try another one.');
    } finally {
      setCreatingCode(false);
    }
  };

  // Order Cancellation State
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Ordered by mistake / change of mind');
  const [customReason, setCustomReason] = useState('');
  const [cancelFeedback, setCancelFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // User Profile State (Persisted in Firestore database)
  const [profile, setProfile] = useState<UserProfileData>({
    name: currentUser?.displayName || 'Feat Shopper',
    email: currentUser?.email || '',
    phone: '',
    defaultAddress: undefined
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState<UserProfileData>(profile);

  // Saved Addresses List (populated manually by user or from Firestore)
  const [savedAddresses, setSavedAddresses] = useState<DeliveryAddress[]>([]);

  // Edit / Add Address Modal State
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(null);
  const [addressFormData, setAddressFormData] = useState<DeliveryAddress>(EMPTY_ADDRESS);

  // Change Order Delivery Location Modal State (Before Shiprocket Pickup)
  const [orderAddressModalOpen, setOrderAddressModalOpen] = useState(false);
  const [orderAddressFormData, setOrderAddressFormData] = useState<DeliveryAddress>(EMPTY_ADDRESS);
  const [isUpdatingOrderAddress, setIsUpdatingOrderAddress] = useState(false);
  const [orderAddressNotice, setOrderAddressNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Live Geolocation Status State
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string | null>(null);

  // Sync profile & saved addresses from Firestore when currentUser changes
  useEffect(() => {
    if (currentUser?.uid) {
      setProfile(prev => ({
        ...prev,
        name: currentUser.displayName || prev.name,
        email: currentUser.email || prev.email
      }));
      setProfileFormData(prev => ({
        ...prev,
        name: currentUser.displayName || prev.name,
        email: currentUser.email || prev.email
      }));

      // Fetch user profile and addresses from Firestore database
      const fetchUserData = async () => {
        try {
          const userDocRef = doc(userDb, 'users', currentUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            if (data.profile) {
              setProfile(data.profile);
              setProfileFormData(data.profile);
            }
            if (Array.isArray(data.savedAddresses) && data.savedAddresses.length > 0) {
              setSavedAddresses(data.savedAddresses);
            }
          }
        } catch (err) {
          console.info('Firestore user profile load notice:', err);
        }
      };

      fetchUserData();
    }
  }, [currentUser]);

  // Keep selected order in sync if orders array updates
  useEffect(() => {
    if (selectedOrder) {
      const updated = orders.find(o => o.id === selectedOrder.id);
      if (updated) {
        setSelectedOrder(updated);
      }
    } else if (effectiveOrders.length > 0) {
      setSelectedOrder(effectiveOrders[0]);
    }
  }, [orders]);

  if (isOpen === false) return null;

  if (!currentUser) {
    return (
      <AccountAuthBarrier
        onAuthSuccess={() => {}}
        onBackToHome={onBackToHome || onClose || (() => { window.location.href = '/'; })}
      />
    );
  }

  const canCancelSelectedOrder = selectedOrder && (selectedOrder.orderStatus === 'Ordered' || selectedOrder.orderStatus === 'Packed');
  const canChangeOrderAddress = selectedOrder && (selectedOrder.orderStatus === 'Ordered' || selectedOrder.orderStatus === 'Packed');
  const isOrderDispatched = selectedOrder && ['Shipped', 'Out for Delivery', 'Delivered'].includes(selectedOrder.orderStatus);
  const isOrderCancelled = selectedOrder && selectedOrder.orderStatus === 'Cancelled';

  // Geolocation Handler
  const handleFetchLiveLocation = async (target: 'profile' | 'saved_address' | 'order_address') => {
    setIsLocating(true);
    setLocationError(null);
    setLocationSuccessMsg(null);

    const result = await getLiveLocationAndAddress();

    setIsLocating(false);

    if (result.success && result.address) {
      const detected = result.address;
      setLocationSuccessMsg(`📍 Live location detected: ${detected.city}, ${detected.state} - ${detected.pincode}`);
      
      if (target === 'profile') {
        setProfileFormData(prev => ({
          ...prev,
          defaultAddress: {
            ...(prev.defaultAddress || EMPTY_ADDRESS),
            ...detected,
            fullName: prev.defaultAddress?.fullName || prev.name,
            phone: prev.defaultAddress?.phone || prev.phone
          }
        }));
      } else if (target === 'saved_address') {
        setAddressFormData(prev => ({
          ...prev,
          ...detected,
          fullName: prev.fullName || profile.name,
          phone: prev.phone || profile.phone
        }));
      } else if (target === 'order_address') {
        setOrderAddressFormData(prev => ({
          ...prev,
          ...detected,
          fullName: prev.fullName || (selectedOrder?.deliveryAddress?.fullName || profile.name),
          phone: prev.phone || (selectedOrder?.deliveryAddress?.phone || profile.phone)
        }));
      }
    } else {
      setLocationError(
        result.error || 
        'Location service is off or permission was denied. Please turn on your device GPS / location and allow location access in your browser, then click "Set Live Location" again.'
      );
    }
  };

  // Pincode auto-lookup state for Saved Address Modal
  const [isLookingUpSavedPin, setIsLookingUpSavedPin] = useState(false);
  const [savedPinLookupStatus, setSavedPinLookupStatus] = useState<{ city: string; state: string } | null>(null);

  const handleSavedAddressPincodeChange = async (rawPin: string) => {
    const cleanPin = rawPin.replace(/\D/g, '').slice(0, 6);
    setAddressFormData(prev => ({ ...prev, pincode: cleanPin }));

    if (cleanPin.length === 6) {
      setIsLookingUpSavedPin(true);
      const res = await lookupCityStateByPincode(cleanPin);
      setIsLookingUpSavedPin(false);
      if (res.success && res.city && res.state) {
        setAddressFormData(prev => ({
          ...prev,
          city: res.city,
          state: res.state
        }));
        setSavedPinLookupStatus({ city: res.city, state: res.state });
      } else {
        setSavedPinLookupStatus(null);
      }
    } else {
      setSavedPinLookupStatus(null);
    }
  };

  // Pincode auto-lookup state for Order Address Update Modal
  const [isLookingUpOrderPin, setIsLookingUpOrderPin] = useState(false);
  const [orderPinLookupStatus, setOrderPinLookupStatus] = useState<{ city: string; state: string } | null>(null);

  const handleOrderAddressPincodeChange = async (rawPin: string) => {
    const cleanPin = rawPin.replace(/\D/g, '').slice(0, 6);
    setOrderAddressFormData(prev => ({ ...prev, pincode: cleanPin }));

    if (cleanPin.length === 6) {
      setIsLookingUpOrderPin(true);
      const res = await lookupCityStateByPincode(cleanPin);
      setIsLookingUpOrderPin(false);
      if (res.success && res.city && res.state) {
        setOrderAddressFormData(prev => ({
          ...prev,
          city: res.city,
          state: res.state
        }));
        setOrderPinLookupStatus({ city: res.city, state: res.state });
      } else {
        setOrderPinLookupStatus(null);
      }
    } else {
      setOrderPinLookupStatus(null);
    }
  };

  // Profile Save (Persists to Firestore Database)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(profileFormData);
    setIsEditingProfile(false);

    if (currentUser?.uid) {
      try {
        const payload = {
          profile: profileFormData,
          displayName: profileFormData.name,
          phone: profileFormData.phone,
          updatedAt: new Date().toISOString()
        };
        if (userDb) {
          await setDoc(doc(userDb, 'users', currentUser.uid), sanitizeForFirestore(payload), { merge: true }).catch(() => {});
        }
      } catch (err) {
        console.warn('Firestore profile save note:', err);
      }
    }

    setCancelFeedback({
      type: 'success',
      message: 'Your profile information has been updated successfully!'
    });
  };

  // Save / Add Address (Persists to featdb-user Firestore Database)
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    let updatedList: DeliveryAddress[];
    if (editingAddressIndex !== null) {
      updatedList = [...savedAddresses];
      updatedList[editingAddressIndex] = addressFormData;
    } else {
      updatedList = [...savedAddresses, addressFormData];
    }
    setSavedAddresses(updatedList);
    setAddressModalOpen(false);
    setEditingAddressIndex(null);

    if (currentUser?.uid && userDb) {
      try {
        const payload = {
          savedAddresses: updatedList,
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(userDb, 'users', currentUser.uid), sanitizeForFirestore(payload), { merge: true }).catch(() => {});
      } catch (err) {
        console.warn('Firestore address save note:', err);
      }
    }
  };

  const handleDeleteAddress = async (index: number) => {
    const updated = savedAddresses.filter((_, idx) => idx !== index);
    setSavedAddresses(updated);

    if (currentUser?.uid && userDb) {
      try {
        const payload = {
          savedAddresses: updated,
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(userDb, 'users', currentUser.uid), sanitizeForFirestore(payload), { merge: true }).catch(() => {});
      } catch (err) {
        console.warn('Firestore address delete note:', err);
      }
    }
  };

  // Open Edit Order Address Modal
  const handleOpenOrderAddressModal = () => {
    if (!selectedOrder || !selectedOrder.deliveryAddress) return;
    setOrderAddressFormData({ ...selectedOrder.deliveryAddress });
    setLocationError(null);
    setLocationSuccessMsg(null);
    setOrderAddressModalOpen(true);
  };

  // Submit Order Address Update (Before Courier Pickup)
  const handleSaveOrderAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setIsUpdatingOrderAddress(true);
    setOrderAddressNotice(null);

    try {
      if (onUpdateOrderAddress) {
        const result = await onUpdateOrderAddress(selectedOrder.id, orderAddressFormData);
        if (result.success && result.order) {
          setSelectedOrder(result.order);
        }
      } else {
        const res = await fetch(`/api/orders/${selectedOrder.id}/address`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderAddressFormData)
        });
        const data = await res.json();
        if (res.ok && data.order) {
          setSelectedOrder(data.order);
        } else {
          throw new Error(data.error || 'Failed to update order address');
        }
      }

      setCancelFeedback({
        type: 'success',
        message: `Order #${selectedOrder.id} delivery address updated to "${orderAddressFormData.city}, ${orderAddressFormData.pincode}". Shiprocket courier routing refreshed.`
      });
      setOrderAddressModalOpen(false);
    } catch (err: any) {
      setOrderAddressNotice({
        type: 'error',
        message: err.message || 'Unable to update address. The parcel might have already been picked up.'
      });
    } finally {
      setIsUpdatingOrderAddress(false);
    }
  };

  const handleExecuteCancel = async () => {
    if (!selectedOrder) return;
    setIsCancelling(true);
    setCancelFeedback(null);

    const finalReason = cancelReason === 'Other' ? (customReason.trim() || 'Customer request') : cancelReason;

    try {
      let updatedOrder: Order | undefined;
      if (onCancelOrder) {
        const result = await onCancelOrder(selectedOrder.id, finalReason);
        if (result.success && result.order) {
          updatedOrder = result.order;
          setSelectedOrder(result.order);
        }
      } else {
        const customer = getStoredCustomerSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (customer?.token) {
          headers['x-auth-token'] = customer.token;
        }
        const res = await fetch(`/api/orders/${selectedOrder.id}/cancel`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ reason: finalReason })
        });
        const data = await res.json();
        if (res.ok && data.order) {
          updatedOrder = data.order;
          setSelectedOrder(data.order);
        } else {
          throw new Error(data.error || 'Cancellation request failed');
        }
      }

      const isCod = selectedOrder.paymentMethod === 'COD';
      const msg = isCod
        ? `Order #${selectedOrder.id} has been cancelled successfully. Shiprocket courier pickup has been revoked. Since this was a Cash on Delivery (COD) order, no payment was charged.`
        : `Order #${selectedOrder.id} cancelled successfully. Shiprocket courier pickup recalled and automated refund of ₹${(selectedOrder.finalAmount ?? 0).toLocaleString('en-IN')} initiated to your original ${selectedOrder.paymentMethod} account.`;

      setCancelFeedback({
        type: 'success',
        message: msg
      });
      setCancelModalOpen(false);
    } catch (err: any) {
      setCancelFeedback({
        type: 'error',
        message: err.message || 'Unable to cancel order at this moment. Please contact customer support.'
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] pb-20">
      {/* Top Header / Breadcrumbs Bar */}
      <div className="bg-white/95 backdrop-blur-md border-b border-pink-100 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <button
            onClick={onBackToHome || onClose}
            className="flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-pink-900 transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 text-pink-700 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Store</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 font-medium hidden sm:inline">
              {currentUser?.email ? `Signed in as ${currentUser.email}` : 'Feat Customer Account'}
            </span>
            {currentUser && onSignOut && (
              <button
                onClick={onSignOut}
                className="text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-full border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        
        {/* Account Title Banner */}
        <div className="bg-gradient-to-r from-pink-950 via-pink-900 to-amber-950 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-pink-800/40 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
            <Package className="w-64 h-64 text-amber-200" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-amber-300 shadow-inner shrink-0">
                <Package className="w-7 h-7" />
              </div>
              <div>
                <h1 className="font-black text-xl sm:text-2xl text-amber-100 font-serif">
                  Feat Customer Account &amp; Order Tracker
                </h1>
                <p className="text-xs sm:text-sm text-pink-200/90 mt-1 max-w-xl">
                  Track your orders in real time with Shiprocket, download GST tax invoices, manage your profile and delivery addresses.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Sidebar Tabs */}
          <div className="md:col-span-4 lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-pink-100 p-2 shadow-2xs space-y-1">
              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  activeTab === 'orders'
                    ? 'bg-pink-900 text-amber-200 shadow-sm'
                    : 'text-gray-700 hover:bg-pink-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4" />
                  <span>My Orders &amp; Tracking</span>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  activeTab === 'orders' ? 'bg-amber-400 text-pink-950' : 'bg-gray-100 text-gray-700'
                }`}>
                  {effectiveOrders.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                  activeTab === 'profile'
                    ? 'bg-pink-900 text-amber-200 shadow-sm'
                    : 'text-gray-700 hover:bg-pink-50'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Visitor Profile</span>
              </button>

              <button
                onClick={() => setActiveTab('addresses')}
                className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                  activeTab === 'addresses'
                    ? 'bg-pink-900 text-amber-200 shadow-sm'
                    : 'text-gray-700 hover:bg-pink-50'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>Saved Addresses</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('referrals');
                  fetchReferralData();
                }}
                className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  activeTab === 'referrals'
                    ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-pink-700 text-white shadow-md'
                    : 'text-gray-700 hover:bg-amber-50/70'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <MagicFeatherSvg className="w-4 h-4" />
                  </div>
                  <span>Magic Feathers &amp; Referrals</span>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  activeTab === 'referrals'
                    ? 'bg-white text-amber-900'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {referralProfile?.availableFeathers ?? 0}
                </span>
              </button>
            </div>

            {/* Quick Contact Box */}
            <div className="bg-gradient-to-br from-pink-50 to-amber-50 rounded-2xl border border-pink-200/80 p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 text-pink-950 font-bold">
                <Shield className="w-4 h-4 text-pink-700" />
                <span>Feat Care Guarantee</span>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Handcrafted pure handlooms. Need order assistance or exchange support?
              </p>
              <a
                href="https://wa.me/917869579735"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-900 hover:underline pt-1"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp (+91 7869579735)</span>
              </a>
            </div>
          </div>

          {/* Main Panel Content */}
          <div className="md:col-span-8 lg:col-span-9 bg-white rounded-3xl border border-pink-100 p-4 sm:p-6 shadow-2xs space-y-5">
            
            {/* Feedback Alerts */}
            {cancelFeedback && (
              <div className={`p-4 rounded-xl text-xs font-medium flex items-start gap-2.5 border ${
                cancelFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}>
                {cancelFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-bold">{cancelFeedback.type === 'success' ? 'Success Notification' : 'Notice'}</p>
                  <p className="mt-0.5">{cancelFeedback.message}</p>
                </div>
                <button onClick={() => setCancelFeedback(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-4">
                
                {/* Orders List Header */}
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <h4 className="text-xs font-extrabold text-gray-900 font-serif">
                      Your Orders History ({effectiveOrders.length})
                    </h4>
                    <p className="text-[11px] text-gray-500 font-medium">
                      Tap any order to open full tracking, item details &amp; tax invoice
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {effectiveOrders.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-xs bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                      <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="font-bold text-gray-700">No orders placed yet</p>
                      <p className="text-gray-400 mt-1">Explore Feat catalog to place your first authentic ethnic wear order!</p>
                    </div>
                  ) : (
                    effectiveOrders.map((order) => (
                      <div
                        key={order.id}
                        onClick={() => {
                          if (onOpenOrderDetails) {
                            onOpenOrderDetails(order);
                          } else {
                            setSelectedOrder(order);
                          }
                        }}
                        className="p-4 rounded-2xl border border-pink-100 bg-white hover:bg-pink-50/40 hover:border-pink-300 hover:shadow-md cursor-pointer transition-all space-y-3 group"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-gray-900 bg-stone-50 px-2 py-0.5 rounded border border-gray-200">
                              Order #{order.id}
                            </span>
                            <span className="text-[11px] text-gray-500">{order.date}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                              order.orderStatus === 'Delivered'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : order.orderStatus === 'Cancelled'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : order.orderStatus === 'Shipped' || order.orderStatus === 'Out for Delivery'
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}>
                              ● {order.orderStatus}
                            </span>
                            {order.orderStatus === 'Cancelled' && (
                              order.paymentMethod === 'COD' ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                                  COD (₹0 Due)
                                </span>
                              ) : (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  order.paymentStatus === 'Refund Completed'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : 'bg-teal-50 text-teal-800 border-teal-200'
                                }`}>
                                  {order.paymentStatus === 'Refund Completed' ? '✓ Refund Credited' : '↺ Refund Initiated'}
                                </span>
                              )
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <div className="relative w-12 h-14 rounded-xl border border-pink-200 overflow-hidden shrink-0 bg-stone-50 shadow-2xs">
                            <img
                              src={order.items[0]?.product.images?.[0] || '/images/placeholder.jpg'}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            {order.items.length > 1 && (
                              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center font-bold py-0.5">
                                +{order.items.length - 1}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-xs sm:text-sm text-gray-900 group-hover:text-pink-900 transition-colors line-clamp-1">
                              {order.items?.[0]?.product?.name || 'Item'}
                            </h5>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 mt-1">
                              <span>{(order.items || []).length} Item(s)</span>
                              <span>•</span>
                              <span>Total: <strong className="text-gray-900 font-serif">₹{(order.finalAmount ?? 0).toLocaleString('en-IN')}</strong></span>
                              <span>•</span>
                              <span className="text-pink-800 font-medium">{order.paymentMethod} ({order.paymentStatus})</span>
                              {order.shiprocketAwbCode && (
                                <span className="font-mono text-[10px] text-purple-800 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                                  AWB: {order.shiprocketAwbCode}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 text-xs font-bold text-pink-700 group-hover:text-pink-950 shrink-0">
                            <span className="hidden sm:inline">View Details</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}

            {/* TAB 2: VISITOR PROFILE & EDIT INFO */}
            {activeTab === 'profile' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                    Visitor Profile Information
                  </h4>
                  {!isEditingProfile && (
                    <button
                      onClick={() => {
                        setProfileFormData(profile);
                        setLocationError(null);
                        setLocationSuccessMsg(null);
                        setIsEditingProfile(true);
                      }}
                      className="bg-pink-700 hover:bg-pink-800 text-amber-100 text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                      <span>Edit Info</span>
                    </button>
                  )}
                </div>

                {!isEditingProfile ? (
                  <div className="bg-gradient-to-r from-pink-50 to-amber-50/50 p-5 rounded-2xl border border-pink-200 space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-base text-gray-900">
                        {profile.name}
                      </h3>
                      <p className="text-xs text-gray-600 flex items-center gap-1.5 font-medium">
                        <Mail className="w-3.5 h-3.5 text-pink-700" />
                        <span>{profile.email}</span>
                      </p>
                      <p className="text-xs text-gray-600 flex items-center gap-1.5 font-medium">
                        <Phone className="w-3.5 h-3.5 text-pink-700" />
                        <span>{profile.phone}</span>
                      </p>
                    </div>

                    {profile.defaultAddress && profile.defaultAddress.addressLine ? (
                      <div className="bg-white p-3.5 rounded-xl border border-pink-100 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-gray-500 font-semibold text-[10px] uppercase">
                          <span>Default Shipping Address</span>
                          <span className="text-pink-700 font-bold">{profile.defaultAddress.type || 'Home'}</span>
                        </div>
                        <p className="font-bold text-gray-800">{profile.defaultAddress.fullName} ({profile.defaultAddress.phone})</p>
                        <p className="text-gray-600">{profile.defaultAddress.addressLine}, {profile.defaultAddress.city}, {profile.defaultAddress.state} - {profile.defaultAddress.pincode}</p>
                      </div>
                    ) : null}

                    {currentUser && onSignOut && (
                      <div className="pt-2">
                        <button
                          onClick={() => {
                            onSignOut();
                            onClose();
                          }}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors"
                        >
                          <LogOut className="w-4 h-4 text-rose-600" />
                          <span>Sign Out of Account</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* EDIT PROFILE FORM */
                  <form onSubmit={handleSaveProfile} className="bg-white p-5 rounded-2xl border border-pink-200 shadow-sm space-y-4 text-xs">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-pink-700" />
                        <span>Edit Visitor Profile</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={profileFormData.name}
                          onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                          className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs"
                          placeholder="Your Name"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={profileFormData.email}
                          onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })}
                          className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs"
                          placeholder="your.email@example.com"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-bold text-gray-700 mb-1">10-Digit Mobile Number</label>
                        <input
                          type="tel"
                          value={profileFormData.phone}
                          onChange={(e) => setProfileFormData({ ...profileFormData, phone: e.target.value })}
                          className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs"
                          placeholder="e.g. 9980815269"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="px-4 py-2 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-pink-700 hover:bg-pink-800 text-amber-100 rounded-xl font-bold shadow-md transition-all flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>Save Profile Changes</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* TAB 3: SAVED DELIVERY ADDRESSES */}
            {activeTab === 'addresses' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                    Saved Delivery Addresses ({savedAddresses.length})
                  </h4>
                  <button
                    onClick={() => {
                      setEditingAddressIndex(null);
                      setAddressFormData({
                        ...EMPTY_ADDRESS,
                        fullName: profile.name,
                        phone: profile.phone
                      });
                      setLocationError(null);
                      setLocationSuccessMsg(null);
                      setAddressModalOpen(true);
                    }}
                    className="bg-pink-700 hover:bg-pink-800 text-amber-100 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-300" />
                    <span>Add New Address</span>
                  </button>
                </div>

                {savedAddresses.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 border-dashed rounded-2xl p-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-pink-50 text-pink-700 flex items-center justify-center mx-auto">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">No Saved Addresses Yet</p>
                      <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                        You can add a delivery address now or enter it during checkout when placing an order.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingAddressIndex(null);
                        setAddressFormData({
                          ...EMPTY_ADDRESS,
                          fullName: profile.name,
                          phone: profile.phone
                        });
                        setLocationError(null);
                        setLocationSuccessMsg(null);
                        setAddressModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 bg-pink-700 hover:bg-pink-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Address</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedAddresses.map((addr, idx) => (
                      <div
                        key={idx}
                        className="border border-pink-200 bg-white p-4 rounded-2xl shadow-xs space-y-2 text-xs relative group hover:border-pink-300 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-gray-900 flex items-center gap-1.5">
                            {addr.type === 'Work' ? <Briefcase className="w-3.5 h-3.5 text-blue-600" /> : <Home className="w-3.5 h-3.5 text-pink-700" />}
                            <span>{addr.fullName}</span>
                          </span>
                          <span className="bg-pink-50 text-pink-800 text-[10px] font-bold px-2 py-0.5 rounded border border-pink-200">
                            {addr.type}
                          </span>
                        </div>

                        <p className="text-gray-700 leading-relaxed">
                          {addr.addressLine}, {addr.city}, {addr.state} - <strong>{addr.pincode}</strong>
                          {addr.landmark && <span className="block text-gray-400 text-[11px]">Landmark: {addr.landmark}</span>}
                        </p>

                        <p className="text-gray-500 font-medium text-[11px]">
                          Phone: {addr.phone}
                        </p>

                        <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingAddressIndex(idx);
                              setAddressFormData(addr);
                              setLocationError(null);
                              setLocationSuccessMsg(null);
                              setAddressModalOpen(true);
                            }}
                            className="text-pink-700 hover:text-pink-900 font-bold text-[11px] px-2 py-1 rounded hover:bg-pink-50 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(idx)}
                            className="text-rose-600 hover:text-rose-800 font-bold text-[11px] px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: MAGIC FEATHERS & REFERRAL REWARDS */}
            {activeTab === 'referrals' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                
                {/* Header Banner */}
                <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-pink-900 rounded-3xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden">
                  <div className="absolute right-0 top-0 bottom-0 opacity-15 pointer-events-none flex items-center pr-6">
                    <MagicFeatherSvg className="w-64 h-64 text-white" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-inner">
                          <MagicFeatherSvg className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg sm:text-xl font-black font-serif text-white tracking-wide">
                              Magic Feathers Rewards &amp; Referral Program
                            </h3>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/25 text-amber-100 border border-white/30">
                              1 Feather = 50 Paisa
                            </span>
                          </div>
                          <p className="text-xs text-amber-100/90 mt-0.5">
                            Earn up to 5% (0.1%–5.0% dynamic per order) in Magic Feathers when friends purchase with your code!
                          </p>
                        </div>
                      </div>

                      {/* Backend-Authoritative Milestone Badge */}
                      <div 
                        className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-inner"
                        title="Magic Feathers are automatically credited to your Available Balance when your friend keeps the order for 12 or more days without cancellation or return."
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                        <span>Backend Automated: Credited After 12 Days Kept (0 Returns)</span>
                      </div>
                    </div>

                    {/* Stats Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div id="feather-available-balance-card" className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/20 transition-all duration-300">
                        <div className="flex items-center justify-between text-amber-100 text-xs font-medium">
                          <span>Available Balance</span>
                          <Coins className="w-4 h-4 text-amber-300" />
                        </div>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-2xl font-black text-white font-serif">
                            {referralProfile?.availableFeathers ?? 0}
                          </span>
                          <span className="text-xs text-amber-200 font-bold">
                            (₹{((referralProfile?.availableFeathers ?? 0) * FEATHER_RUPEE_VALUE).toFixed(2)})
                          </span>
                        </div>
                        <p className="text-[10px] text-amber-200/80 mt-1">
                          Ready to use on checkout for extra discounts
                        </p>
                      </div>

                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/20">
                        <div className="flex items-center justify-between text-amber-100 text-xs font-medium">
                          <span>Pending 12-Day Hold</span>
                          <Clock className="w-4 h-4 text-amber-300" />
                        </div>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-2xl font-black text-white font-serif">
                            {referralProfile?.pendingFeathers ?? 0}
                          </span>
                          <span className="text-xs text-amber-200 font-bold">
                            (₹{((referralProfile?.pendingFeathers ?? 0) * FEATHER_RUPEE_VALUE).toFixed(2)})
                          </span>
                        </div>
                        <p className="text-[10px] text-amber-200/80 mt-1">
                          Unlocks 12 days after friend's delivery
                        </p>
                      </div>

                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/20">
                        <div className="flex items-center justify-between text-amber-100 text-xs font-medium">
                          <span>Lifetime Earned</span>
                          <Award className="w-4 h-4 text-amber-300" />
                        </div>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-2xl font-black text-white font-serif">
                            {referralProfile?.lifetimeEarnedFeathers ?? 0}
                          </span>
                          <span className="text-xs text-amber-200 font-bold">
                            (₹{((referralProfile?.lifetimeEarnedFeathers ?? 0) * FEATHER_RUPEE_VALUE).toFixed(2)})
                          </span>
                        </div>
                        <p className="text-[10px] text-amber-200/80 mt-1">
                          Total rewards earned from referrals
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 1: Referral Code Creation / Sharing Box */}
                <div className="bg-white rounded-2xl border border-amber-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                        <Share2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-gray-900 font-serif">
                          Your Personal Referral Code
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          {referralProfile?.referralCode 
                            ? 'One-time permanent referral code (cannot be edited)'
                            : 'Create your unique permanent code to share with friends and family'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {referralProfile?.referralCode ? (
                    // User already has a permanent referral code
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-amber-50 via-rose-50/50 to-amber-50 border-2 border-amber-300/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                              Your Active Code:
                            </span>
                            <span className="text-[10px] font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full border border-amber-300">
                              Permanent &amp; Locked
                            </span>
                          </div>
                          <div className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-amber-950">
                            {referralProfile.referralCode}
                          </div>
                          <p className="text-[11px] text-gray-500">
                            Created on {referralProfile.referralCodeCreatedAt ? new Date(referralProfile.referralCodeCreatedAt).toLocaleDateString('en-IN') : 'Account creation'} • One-time creation
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const shareUrl = `${window.location.origin}/?ref=${encodeURIComponent(referralProfile.referralCode!)}`;
                              navigator.clipboard.writeText(shareUrl);
                              setCopiedLink(true);
                              setTimeout(() => setCopiedLink(false), 2500);
                            }}
                            className="px-4 py-2 bg-pink-900 hover:bg-pink-950 text-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedLink ? 'Copied Link! ✓' : 'Copy Referral Link'}</span>
                          </button>

                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(
                              `Hey! Check out authentic ethnic wear sarees & kurtis at Feat (Feather Hut Fashion). Use my referral code "${referralProfile.referralCode}" or click this link to shop: ${window.location.origin}/?ref=${referralProfile.referralCode}`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Share on WhatsApp</span>
                          </a>
                        </div>
                      </div>

                      {/* Shareable Link Display */}
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 flex items-center justify-between gap-2 text-xs">
                        <span className="text-gray-500 font-medium truncate font-mono text-[11px]">
                          {`${window.location.origin}/?ref=${referralProfile.referralCode}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const shareUrl = `${window.location.origin}/?ref=${encodeURIComponent(referralProfile.referralCode!)}`;
                            navigator.clipboard.writeText(shareUrl);
                            setCopiedLink(true);
                            setTimeout(() => setCopiedLink(false), 2500);
                          }}
                          className="text-pink-900 hover:text-pink-950 font-bold text-xs shrink-0 cursor-pointer"
                        >
                          {copiedLink ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // User does NOT have a code yet - Show one-time creation form
                    (() => {
                      const clean = newCodeInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
                      const isSaveEnabled = 
                        !creatingCode && 
                        !checkingCodeAvailability && 
                        codeAvailability === 'available' && 
                        verifiedAvailableCode === clean && 
                        clean.length >= 3;

                      return (
                        <form onSubmit={handleCreatePermanentCode} className="space-y-4">
                          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs space-y-2 text-amber-950">
                            <div className="flex items-center gap-2 font-bold text-amber-900">
                              <ShieldCheck className="w-4 h-4 text-amber-700" />
                              <span>Important Rule: One-Time Creation</span>
                            </div>
                            <p className="text-[11px] text-amber-900/90 leading-relaxed">
                              Once created, your referral code <strong>will be permanently linked to your profile and cannot be changed or edited in the future</strong>. The save button is unlocked ONLY when your code is checked and confirmed as available.
                            </p>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="block text-xs font-bold text-gray-700">
                                Choose Your Referral Code (3-15 letters/numbers):
                              </label>
                              {codeAvailability === 'checking' && (
                                <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                                  <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                                  <span>Checking if code is taken...</span>
                                </span>
                              )}
                              {codeAvailability === 'available' && (
                                <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Available ✓</span>
                                </span>
                              )}
                              {codeAvailability === 'taken' && (
                                <span className="text-[11px] text-rose-700 font-bold flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Already Taken ✕</span>
                                </span>
                              )}
                            </div>

                            {/* Input + Dedicated Check Availability Button */}
                            <div className="flex flex-col sm:flex-row gap-2">
                              <div className="relative flex-1">
                                <input
                                  type="text"
                                  maxLength={15}
                                  value={newCodeInput}
                                  onChange={handleCodeInputChange}
                                  placeholder="e.g. PRIYA20, ROHIT99, FEATANIL"
                                  className={`w-full px-3.5 py-2.5 rounded-xl border font-mono font-bold text-sm tracking-wider uppercase outline-none transition-all ${
                                    codeAvailability === 'available'
                                      ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-400/30'
                                      : codeAvailability === 'taken'
                                      ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-400/30'
                                      : codeAvailability === 'checking'
                                      ? 'border-amber-400 bg-amber-50/30'
                                      : 'border-pink-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500'
                                  }`}
                                />
                              </div>
                              <button
                                type="button"
                                id="btn-check-code-availability"
                                onClick={() => performCheck()}
                                disabled={checkingCodeAvailability || clean.length < 3}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 select-none cursor-pointer border ${
                                  checkingCodeAvailability
                                    ? 'bg-amber-100 text-amber-900 border-amber-300 cursor-wait'
                                    : codeAvailability === 'available'
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                                    : codeAvailability === 'taken'
                                    ? 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200'
                                    : 'bg-white hover:bg-pink-50 text-gray-800 border-gray-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
                                }`}
                              >
                                {checkingCodeAvailability ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
                                    <span>Checking...</span>
                                  </>
                                ) : codeAvailability === 'available' ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Verified Available</span>
                                  </>
                                ) : codeAvailability === 'taken' ? (
                                  <>
                                    <Ban className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Already Taken</span>
                                  </>
                                ) : (
                                  <>
                                    <Search className="w-3.5 h-3.5 text-gray-600" />
                                    <span>Check Availability</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Availability helper status banner */}
                            {codeAvailabilityMsg && (
                              <div className={`p-2.5 rounded-xl text-xs font-bold flex items-start gap-2 border transition-all ${
                                codeAvailability === 'available'
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-2xs'
                                  : codeAvailability === 'taken'
                                  ? 'bg-rose-50 text-rose-900 border-rose-300 shadow-2xs'
                                  : codeAvailability === 'checking'
                                  ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs'
                                  : 'bg-gray-50 text-gray-700 border-gray-200'
                              }`}>
                                {codeAvailability === 'available' ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                ) : codeAvailability === 'taken' ? (
                                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                ) : codeAvailability === 'checking' ? (
                                  <RefreshCw className="w-4 h-4 text-amber-600 animate-spin shrink-0 mt-0.5" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1">
                                  <p>{codeAvailabilityMsg}</p>
                                  {codeAvailability === 'taken' && (
                                    <p className="text-[11px] font-normal text-rose-800 mt-1">
                                      Tip: Try adding numbers or initials, e.g. <span className="font-mono font-bold">{clean}26</span>, <span className="font-mono font-bold">{clean}99</span>, or <span className="font-mono font-bold">FEAT{clean}</span>
                                    </p>
                                  )}
                                  {codeAvailability === 'available' && (
                                    <p className="text-[11px] font-normal text-emerald-800 mt-0.5">
                                      ✓ Verified available! Click below to permanently link and lock this code to your account.
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* The Permanent Save Button - Enabled ONLY when verified available */}
                            <button
                              type="submit"
                              id="btn-save-referral-code"
                              disabled={!isSaveEnabled}
                              className={`w-full py-3 px-5 rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-md flex items-center justify-center gap-2 select-none border ${
                                isSaveEnabled
                                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white cursor-pointer ring-2 ring-emerald-400/50 border-emerald-600 shadow-emerald-700/25 active:scale-[0.99]'
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300'
                              }`}
                            >
                              {creatingCode ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                                  <span>Locking Permanent Code...</span>
                                </>
                              ) : checkingCodeAvailability ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                                  <span>Checking If Code Is Taken First...</span>
                                </>
                              ) : codeAvailability === 'taken' ? (
                                <>
                                  <Ban className="w-4 h-4 text-rose-500" />
                                  <span>Cannot Save: Code Already Taken (Choose Another)</span>
                                </>
                              ) : codeAvailability === 'available' ? (
                                <>
                                  <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
                                  <span>Save &amp; Lock Permanent Referral Code</span>
                                </>
                              ) : codeAvailability === 'unverified' ? (
                                <>
                                  <Search className="w-4 h-4 text-gray-400" />
                                  <span>Check Code Availability to Enable Save</span>
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="w-4 h-4 text-gray-400" />
                                  <span>Enter &amp; Check Referral Code First</span>
                                </>
                              )}
                            </button>

                            {createCodeError && (
                              <p className="text-xs text-rose-600 font-medium mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>{createCodeError}</span>
                              </p>
                            )}
                            {createCodeSuccess && (
                              <p className="text-xs text-emerald-700 font-medium mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>{createCodeSuccess}</span>
                              </p>
                            )}
                          </div>
                        </form>
                      );
                    })()
                  )}
                </div>

                {/* Section 2: Program Rules & Breakdown Card */}
                <div className="bg-gradient-to-br from-pink-50/50 to-amber-50/50 rounded-2xl border border-pink-100 p-5 sm:p-6 space-y-3.5">
                  <h4 className="font-black text-sm text-pink-950 font-serif flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-pink-700" />
                    <span>How Magic Feathers Work (Full Terms)</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-700">
                    <div className="bg-white/80 p-3 rounded-xl border border-pink-100/80 space-y-1">
                      <div className="font-bold text-pink-950 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-pink-100 text-pink-800 text-[10px] font-black flex items-center justify-center">1</span>
                        <span>Earn Upto 5% Magic Feathers</span>
                      </div>
                      <p className="text-[11px] text-gray-600 pl-6">
                        When a friend checks out with your permanent code, you earn up to 5% of their order billing value credited as Magic Feathers.
                      </p>
                    </div>

                    <div className="bg-white/80 p-3 rounded-xl border border-pink-100/80 space-y-1">
                      <div className="font-bold text-pink-950 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black flex items-center justify-center">2</span>
                        <span>1 Magic Feather = 50 Paisa (₹0.50)</span>
                      </div>
                      <p className="text-[11px] text-gray-600 pl-6">
                        Every 2 feathers equal ₹1.00. 100 feathers give you ₹50.00 off on your next fashion order.
                      </p>
                    </div>

                    <div className="bg-white/80 p-3 rounded-xl border border-pink-100/80 space-y-1">
                      <div className="font-bold text-pink-950 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black flex items-center justify-center">3</span>
                        <span>12-Day Return Period Condition</span>
                      </div>
                      <p className="text-[11px] text-gray-600 pl-6">
                        Magic Feathers mature and unlock 12 days after your friend's order if they do not return or cancel the product. No credit on cancelled/returned orders.
                      </p>
                    </div>

                    <div className="bg-white/80 p-3 rounded-xl border border-pink-100/80 space-y-1">
                      <div className="font-bold text-pink-950 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center">4</span>
                        <span>Stacks On Top of Promo Codes</span>
                      </div>
                      <p className="text-[11px] text-gray-600 pl-6">
                        You can use your Magic Feathers alongside store promo codes (like Welcome76 or FEAT2.0) for double savings!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 3: Transactions & 12-Day Maturity Ledger */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-4 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-900 font-serif">
                        Magic Feathers History &amp; 12-Day Maturity Tracker
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Detailed log of all referral rewards and feather redemptions
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={fetchReferralData}
                      disabled={loadingReferrals}
                      className="text-xs font-bold text-pink-800 hover:text-pink-950 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingReferrals ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {(!referralProfile?.transactions || referralProfile.transactions.length === 0) ? (
                    <div className="text-center py-10 bg-amber-50/30 rounded-2xl border border-dashed border-amber-200 text-gray-500 text-xs space-y-2">
                      <MagicFeatherSvg className="w-8 h-8 text-amber-400 mx-auto opacity-70" />
                      <p className="font-bold text-gray-700">No Magic Feather transactions yet</p>
                      <p className="text-gray-400 text-[11px] max-w-sm mx-auto">
                        Share your permanent code with friends. Once they make a purchase, your Magic Feathers reward (up to 5%) will appear here!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 overflow-x-auto">
                      {referralProfile.transactions.map((tx) => {
                        const isPending = tx.status === 'pending';
                        const isMatured = tx.status === 'credited';
                        const isCancelled = tx.status === 'cancelled';
                        const isRedeemed = tx.status === 'redeemed';

                        // Calculate remaining days
                        let remainingDays = 0;
                        if (tx.unlocksAt) {
                          const diff = new Date(tx.unlocksAt).getTime() - Date.now();
                          remainingDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
                        }

                        const txTitle = tx.type === 'order_redeemed' 
                          ? 'Redeemed during checkout' 
                          : tx.friendName 
                          ? `Referral Reward (${tx.friendName})`
                          : tx.rewardPercent
                          ? `Referral Reward (${tx.rewardPercent}% of Order)`
                          : 'Referral Reward (Up to 5% of Order)';

                        return (
                          <div
                            key={tx.id}
                            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                              isPending
                                ? 'bg-amber-50/60 border-amber-200'
                                : isMatured
                                ? 'bg-emerald-50/40 border-emerald-200'
                                : isCancelled
                                ? 'bg-rose-50/40 border-rose-200 opacity-70'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-gray-900">
                                  {txTitle}
                                </span>
                                {tx.orderId && (
                                  <span className="text-[10px] font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-600">
                                    #{tx.orderId}
                                  </span>
                                )}
                                {isPending && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>Unlocks in {remainingDays} {remainingDays === 1 ? 'day' : 'days'}</span>
                                  </span>
                                )}
                                {isMatured && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    <span>Available</span>
                                  </span>
                                )}
                                {isCancelled && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                    Cancelled / Returned
                                  </span>
                                )}
                                {isRedeemed && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                    Used in Purchase
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-gray-500">
                                <span>{new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                {tx.orderBillingValue ? (
                                  <span>
                                    Order Value: ₹{(tx.orderBillingValue ?? 0).toLocaleString('en-IN')}
                                    {tx.rewardPercent ? ` (${tx.rewardPercent}% = ${tx.feathers} feathers)` : ` (${tx.feathers} feathers)`}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-center">
                              <div className="text-right">
                                <div className={`text-sm font-black ${
                                  tx.feathers > 0 ? 'text-emerald-700' : 'text-rose-700'
                                } flex items-center justify-end gap-1`}>
                                  <MagicFeatherSvg className="w-3.5 h-3.5 inline-block" />
                                  <span>{tx.feathers > 0 ? `+${tx.feathers}` : tx.feathers} Feathers</span>
                                </div>
                                <span className="text-[10px] text-gray-500 font-bold block">
                                  {tx.feathers > 0 ? `+₹${(tx.feathers * FEATHER_RUPEE_VALUE).toFixed(2)}` : `-₹${(Math.abs(tx.feathers) * FEATHER_RUPEE_VALUE).toFixed(2)}`}
                                </span>
                              </div>

                              {/* Status Badge: 12-Day Return Hold (Backend Automatically Credits on Maturity) */}
                              {isPending && (
                                <div 
                                  className="px-2.5 py-1.5 bg-amber-50 border border-amber-200/80 text-amber-900 rounded-lg text-[10px] font-bold shadow-2xs shrink-0 flex items-center gap-1.5"
                                  title="Held for 12 days to verify order is kept without return. Backend will automatically credit to Available Balance once 12 days pass."
                                >
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>12-Day Return Hold</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

      {/* MODAL 1: ADD / EDIT SAVED ADDRESS MODAL */}
      {addressModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-pink-200 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-gray-900">
                  {editingAddressIndex !== null ? 'Edit Delivery Address' : 'Add New Delivery Address'}
                </h3>
              </div>
              <button 
                onClick={() => setAddressModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-3.5 text-xs">
              {/* Geolocation Button */}
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-emerald-950 block">Auto-detect using GPS?</span>
                  <span className="text-[11px] text-emerald-800">Click to fetch your current live location automatically.</span>
                </div>
                <button
                  type="button"
                  disabled={isLocating}
                  onClick={() => handleFetchLiveLocation('saved_address')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm shrink-0 disabled:opacity-50"
                >
                  <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Locating...' : '📍 Set Live Location'}</span>
                </button>
              </div>

              {locationError && (
                <div className="p-3 bg-rose-50 text-rose-900 border border-rose-200 rounded-xl text-[11px] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Location Permission Guidance</p>
                    <p className="mt-0.5">{locationError}</p>
                  </div>
                </div>
              )}

              {locationSuccessMsg && (
                <div className="p-2.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{locationSuccessMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Recipient Name *</label>
                  <input
                    type="text"
                    required
                    value={addressFormData.fullName}
                    onChange={(e) => setAddressFormData({ ...addressFormData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs"
                    placeholder="Recipient's Name"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={addressFormData.phone}
                    onChange={(e) => setAddressFormData({ ...addressFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs"
                    placeholder="10-digit mobile"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">Street Address / House No / Area *</label>
                  <input
                    type="text"
                    required
                    value={addressFormData.addressLine}
                    onChange={(e) => setAddressFormData({ ...addressFormData, addressLine: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs"
                    placeholder="Full street address, flat, or building"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-gray-700">PIN Code *</label>
                    {isLookingUpSavedPin && (
                      <span className="text-[10px] text-pink-700 font-bold flex items-center gap-1">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        <span>Detecting...</span>
                      </span>
                    )}
                    {!isLookingUpSavedPin && savedPinLookupStatus && (
                      <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" />
                        <span>Auto-filled</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={addressFormData.pincode}
                    onChange={(e) => handleSavedAddressPincodeChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs font-mono"
                    placeholder="6-digit PIN (e.g. 712147)"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Address Type</label>
                  <select
                    value={addressFormData.type}
                    onChange={(e) => setAddressFormData({ ...addressFormData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs"
                  >
                    <option value="Home">Home</option>
                    <option value="Work">Work</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-gray-700">City / District *</label>
                    {savedPinLookupStatus?.city && (
                      <span className="text-[10px] text-gray-400 font-medium">From PIN</span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={addressFormData.city}
                    onChange={(e) => setAddressFormData({ ...addressFormData, city: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs"
                    placeholder="City / District"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-gray-700">State *</label>
                    {savedPinLookupStatus?.state && (
                      <span className="text-[10px] text-gray-400 font-medium">From PIN</span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={addressFormData.state}
                    onChange={(e) => setAddressFormData({ ...addressFormData, state: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs"
                    placeholder="State"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAddressModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-pink-700 hover:bg-pink-800 text-amber-100 rounded-xl font-bold shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Address</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CHANGE ORDER DELIVERY LOCATION (BEFORE SHIPROCKET PICKUP) */}
      {orderAddressModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-pink-200 p-5 sm:p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900">
                    Change Delivery Location for #{selectedOrder.id}
                  </h3>
                  <span className="text-[11px] text-emerald-700 font-medium block">
                    ● Order status is "{selectedOrder.orderStatus}" (Unpicked by Courier)
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setOrderAddressModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explanation of Shiprocket Address Routing */}
            <div className="bg-amber-50/90 border border-amber-200 p-3 rounded-xl text-xs space-y-1 text-amber-950">
              <p className="font-bold flex items-center gap-1 text-amber-900">
                <Truck className="w-3.5 h-3.5 text-amber-700" />
                <span>Shiprocket Courier Routing Update:</span>
              </p>
              <p className="text-[11px] text-amber-900/80">
                Because your parcel has not yet been picked up by the courier, your address can be updated. Shiprocket will automatically regenerate the shipping label and route the delivery to this new destination.
              </p>
            </div>

            <form onSubmit={handleSaveOrderAddress} className="space-y-3.5 text-xs">
              
              {/* Geolocation Button */}
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-emerald-950 block">Use Current GPS Location?</span>
                  <span className="text-[11px] text-emerald-800">Set the destination to where you are right now.</span>
                </div>
                <button
                  type="button"
                  disabled={isLocating}
                  onClick={() => handleFetchLiveLocation('order_address')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm shrink-0 disabled:opacity-50"
                >
                  <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Locating...' : '📍 Set Live Location'}</span>
                </button>
              </div>

              {locationError && (
                <div className="p-3 bg-rose-50 text-rose-900 border border-rose-200 rounded-xl text-[11px] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Location Permission Guidance</p>
                    <p className="mt-0.5">{locationError}</p>
                  </div>
                </div>
              )}

              {locationSuccessMsg && (
                <div className="p-2.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{locationSuccessMsg}</span>
                </div>
              )}

              {orderAddressNotice && (
                <div className="p-3 bg-rose-50 text-rose-900 border border-rose-200 rounded-xl text-xs">
                  {orderAddressNotice.message}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Recipient Name *</label>
                  <input
                    type="text"
                    required
                    value={orderAddressFormData.fullName}
                    onChange={(e) => setOrderAddressFormData({ ...orderAddressFormData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs"
                    placeholder="Recipient's Name"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">10-Digit Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={orderAddressFormData.phone}
                    onChange={(e) => setOrderAddressFormData({ ...orderAddressFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs"
                    placeholder="10-digit mobile"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">New Street Address / Flat / Building *</label>
                  <input
                    type="text"
                    required
                    value={orderAddressFormData.addressLine}
                    onChange={(e) => setOrderAddressFormData({ ...orderAddressFormData, addressLine: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs"
                    placeholder="Full street address, flat, or building"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-gray-700">PIN Code *</label>
                    {isLookingUpOrderPin && (
                      <span className="text-[10px] text-pink-700 font-bold flex items-center gap-1">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        <span>Detecting...</span>
                      </span>
                    )}
                    {!isLookingUpOrderPin && orderPinLookupStatus && (
                      <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" />
                        <span>Auto-filled</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={orderAddressFormData.pincode}
                    onChange={(e) => handleOrderAddressPincodeChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs font-mono"
                    placeholder="6-digit PIN (e.g. 712147)"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Landmark (Optional)</label>
                  <input
                    type="text"
                    value={orderAddressFormData.landmark || ''}
                    onChange={(e) => setOrderAddressFormData({ ...orderAddressFormData, landmark: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs"
                    placeholder="Nearby landmark"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-gray-700">City / District *</label>
                    {orderPinLookupStatus?.city && (
                      <span className="text-[10px] text-gray-400 font-medium">From PIN</span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={orderAddressFormData.city}
                    onChange={(e) => setOrderAddressFormData({ ...orderAddressFormData, city: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs"
                    placeholder="City / District"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-gray-700">State *</label>
                    {orderPinLookupStatus?.state && (
                      <span className="text-[10px] text-gray-400 font-medium">From PIN</span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={orderAddressFormData.state}
                    onChange={(e) => setOrderAddressFormData({ ...orderAddressFormData, state: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs"
                    placeholder="State"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isUpdatingOrderAddress}
                  onClick={() => setOrderAddressModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingOrderAddress}
                  className="px-5 py-2 bg-pink-700 hover:bg-pink-800 text-amber-100 rounded-xl font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUpdatingOrderAddress ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating Shiprocket...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm New Delivery Location</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ORDER CANCELLATION CONFIRMATION */}
      {cancelModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-rose-200 p-5 sm:p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Ban className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-gray-900">
                  Cancel Order #{selectedOrder.id}
                </h3>
              </div>
              <button 
                onClick={() => setCancelModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {selectedOrder.paymentMethod === 'COD' ? (
                <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-amber-950">
                  <p className="font-bold flex items-center gap-1.5 text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-700" />
                    <span>⚠️ Cash on Delivery (COD) Notice:</span>
                  </p>
                  <p className="text-[11px] mt-1 leading-relaxed">
                    Since this order was placed with Cash on Delivery, no money was charged upfront. Cancelling will recall the Shiprocket courier pickup with <strong>₹0 due</strong> and no refund required.
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-emerald-950">
                  <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>100% Money-Back Automated Refund:</span>
                  </p>
                  <p className="text-[11px] mt-1 leading-relaxed">
                    Cancelling will immediately recall the Shiprocket courier dispatch and initiate an automated 100% full refund of <strong>₹{(selectedOrder.finalAmount ?? 0).toLocaleString('en-IN')}</strong> back to your original payment method ({selectedOrder.paymentMethod}). Most UPI and bank transfers credit within 5-7 business days.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-700 mb-1.5">
                  Please select a reason for cancellation:
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none text-xs"
                >
                  <option value="Ordered by mistake / change of mind">Ordered by mistake / change of mind</option>
                  <option value="Found another design or color on Feat">Found another design or color on Feat</option>
                  <option value="Incorrect shipping address or contact phone">Incorrect shipping address or contact phone</option>
                  <option value="Delivery timeline is not suitable">Delivery timeline is not suitable</option>
                  <option value="Payment verification issue">Payment verification issue</option>
                  <option value="Other">Other reason</option>
                </select>
              </div>

              {cancelReason === 'Other' && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Describe reason:
                  </label>
                  <textarea
                    rows={2}
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Provide details..."
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition-colors text-xs"
              >
                Keep Order
              </button>

              <button
                type="button"
                disabled={isCancelling}
                onClick={handleExecuteCancel}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md hover:shadow-rose-600/30 transition-all flex items-center gap-1.5 text-xs disabled:opacity-50"
              >
                {isCancelling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Cancelling Shiprocket...</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5" />
                    <span>Confirm Order Cancellation</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* REAL-WORLD SCENARIO 12-DAY FEATHER CELEBRATION MODAL */}
      <RealWorld12DayFeatherCelebration
        isOpen={isCelebrationOpen}
        onClose={() => setIsCelebrationOpen(false)}
        transaction={celebrationTx}
        onFeathersLanded={() => {
          fetchReferralData();
        }}
      />

    </div>
  );
};
