import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, Lock, Trash2, Plus, Minus, Banknote, CheckCircle, ArrowLeft,
  FileText, ArrowRight, Navigation, AlertCircle, ShoppingBag, Edit3, 
  AlertTriangle, RefreshCw, HelpCircle, XCircle, Clock, Timer, Hourglass, 
  AlertOctagon, Truck, MapPin, Zap, BookmarkCheck, Check, Info, Tag, Sparkles,
  BadgePercent, Ticket, Loader2
} from 'lucide-react';
import { CartItem, DeliveryAddress, Order, PaymentLog, DeliveryEstimate, PromoCode, AppliedPromo } from '../types';
import { downloadTaxInvoice } from '../utils/invoiceGenerator';
import { getLiveLocationAndAddress } from '../utils/geolocation';
import { lookupCityStateByPincode } from '../utils/pincodeLookup';
import { getColorHex } from '../utils/colors';
import { CustomAlertModal, AlertModalState } from './CustomAlertModal';
import { logPaymentFailureToFirestore, userDb } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getShiprocketDeliveryEstimate, computeFallbackEstimate } from '../utils/deliveryEstimation';
import { getItemVariantImage, getCategoryFallbackImage } from '../utils/productImage';
import { CouponMilestonesCard } from './CouponMilestonesCard';

export const sanitizeIndianPhone = (raw: string | undefined | null): string => {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length > 10) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length > 10) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
};

interface CheckoutPageProps {
  cartItems: CartItem[];
  onUpdateQuantity?: (productId: string, size: string, delta: number, color?: string) => void;
  onRemoveItem?: (productId: string, size: string, color?: string) => void;
  appliedPromo: { code: string; discount: number; description: string } | null;
  appliedPromos?: AppliedPromo[];
  onApplyPromo?: (code: string) => Promise<{ valid: boolean; message?: string }>;
  onRemovePromo?: (code?: string) => void;
  currentUser?: any;
  onBackToHome: () => void;
  onNavigateToOrder?: (orderId: string) => void;
  promos?: PromoCode[];
  onExploreCategory?: (category: string) => void;
  onExploreCollection?: (collection: string) => void;
  onCompleteOrder: (orderData: {
    orderId?: string;
    deliveryAddress: DeliveryAddress;
    paymentMethod: 'PhonePe' | 'Razorpay' | 'UPI' | 'Card' | 'NetBanking' | 'COD' | string;
    customerEmail: string;
    transactionId?: string;
    phonepeTransactionId?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
  }) => Promise<any>;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  appliedPromo,
  appliedPromos,
  onApplyPromo,
  onRemovePromo,
  currentUser,
  onBackToHome,
  onNavigateToOrder,
  promos = [],
  onExploreCategory,
  onExploreCollection,
  onCompleteOrder
}) => {
  const [step, setStep] = useState<'checkout' | 'processing' | 'success'>('checkout');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Centralized Custom Alert Modal State
  const [customAlert, setCustomAlert] = useState<AlertModalState>({
    isOpen: false,
    message: '',
    type: 'warning'
  });

  const showAlert = (message: string, type: 'warning' | 'error' | 'info' | 'success' = 'warning', title?: string) => {
    setCustomAlert({
      isOpen: true,
      message,
      type,
      title
    });
  };

  // Promo code state
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  // Address State
  const [address, setAddress] = useState<DeliveryAddress>(() => {
    try {
      const stored = localStorage.getItem('feat_saved_delivery_address');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.fullName && parsed?.phone && parsed?.addressLine) {
          return {
            ...parsed,
            phone: sanitizeIndianPhone(parsed.phone)
          };
        }
      }
    } catch (e) {}
    return {
      fullName: currentUser?.displayName || '',
      phone: sanitizeIndianPhone(currentUser?.phoneNumber || ''),
      pincode: '',
      addressLine: '',
      city: '',
      state: 'West Bengal',
      type: 'Home'
    };
  });

  const [customerEmail, setCustomerEmail] = useState(() => {
    try {
      const stored = localStorage.getItem('feat_saved_customer_email');
      if (stored && stored.includes('@')) return stored;
    } catch (e) {}
    return currentUser?.email || '';
  });

  // Mobile Checkout & Payment Verification State
  const activeOrderRef = useRef<string>('');
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const isPollingRef = useRef<boolean>(false);
  const [isPlacingCod, setIsPlacingCod] = useState(false);

  // Sync with current user profile changes
  useEffect(() => {
    if (currentUser) {
      if (currentUser.email && !customerEmail) setCustomerEmail(currentUser.email);
      if (currentUser.displayName && !address.fullName) {
        setAddress(prev => ({ ...prev, fullName: currentUser.displayName }));
      }
    }
  }, [currentUser]);

  // Payment Method State: Razorpay (Online Cards/UPI/Netbanking) or COD
  const [paymentMethod, setPaymentMethod] = useState<'Razorpay' | 'COD'>('Razorpay');
  const [isRazorpayLoading, setIsRazorpayLoading] = useState(false);

  // Active Payment Session & Timer State (for 30s threshold detection)
  const [isPaymentSessionActive, setIsPaymentSessionActive] = useState(false);
  const [paymentSessionSeconds, setPaymentSessionSeconds] = useState(0);

  // Detailed Razorpay Failure / Error Tracking State
  const [paymentFailureDetails, setPaymentFailureDetails] = useState<{
    title?: string;
    code?: string;
    description: string;
    reason?: string;
    source?: string;
    step?: string;
    paymentId?: string;
    orderId?: string;
    actionAdvice?: string;
    timestamp: string;
  } | null>(null);

  // Query server order payment status (Crucial for mobile users switching from Google Pay / PhonePe / UPI)
  const verifyOrderPayment = async (orderIdToCheck: string): Promise<boolean> => {
    if (!orderIdToCheck) return false;
    try {
      const res = await fetch(`/api/razorpay/order-status/${encodeURIComponent(orderIdToCheck)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'Paid') {
          console.info('[Mobile Payment Verification] Order confirmed PAID:', data);
          setIsPaymentSessionActive(false);
          setIsRazorpayLoading(false);
          setPaymentFailureDetails(null);
          setIsVerifyingPayment(false);
          isPollingRef.current = false;
          
          await processOrder(data.order?.transactionId || data.order?.razorpayPaymentId || `RZP_${Date.now()}`, {
            razorpayOrderId: data.order?.razorpayOrderId,
            razorpayPaymentId: data.order?.razorpayPaymentId || data.order?.transactionId,
            razorpaySignature: data.order?.razorpaySignature
          });
          return true;
        }
      }
    } catch (err) {
      console.warn('[Mobile Payment Verification Notice]:', err);
    }
    return false;
  };

  // Re-check payment status when mobile user switches back to browser tab from UPI app
  useEffect(() => {
    const handleVisibilityOrFocus = async () => {
      if (document.visibilityState === 'visible' && activeOrderRef.current && (isPaymentSessionActive || isVerifyingPayment || paymentFailureDetails)) {
        console.info('[Mobile Checkout] Regained browser focus. Checking UPI status for:', activeOrderRef.current);
        await verifyOrderPayment(activeOrderRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [isPaymentSessionActive, isVerifyingPayment, paymentFailureDetails]);

  // Ticking effect for active payment session
  useEffect(() => {
    let interval: any = null;
    if (isPaymentSessionActive) {
      interval = setInterval(() => {
        setPaymentSessionSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setPaymentSessionSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPaymentSessionActive]);

  // Live Geolocation state
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string | null>(null);

  const [confirmedOrderId, setConfirmedOrderId] = useState<string>('');
  const [confirmedAmount, setConfirmedAmount] = useState<number>(0);
  const [orderedItemsSnapshot, setOrderedItemsSnapshot] = useState<CartItem[]>([]);

  // Stable SKU-based Order Reference
  const primarySku = (cartItems && cartItems[0]?.product?.sku && cartItems[0].product.sku.trim())
    ? cartItems[0].product.sku.trim()
    : ((cartItems && cartItems[0]?.product as any)?.skucode && (cartItems[0]?.product as any).skucode.trim())
    ? (cartItems[0]?.product as any).skucode.trim()
    : (cartItems && cartItems[0]?.product?.id || 'FEAT');
  const cleanSku = String(primarySku).replace(/[^A-Za-z0-9-_]/g, '').toUpperCase();

  const [orderRef, setOrderRef] = useState<string>(() => {
    return `${cleanSku}-${Math.floor(1000 + Math.random() * 9000)}`;
  });

  useEffect(() => {
    if (cartItems && cartItems.length > 0 && !confirmedOrderId) {
      const currentSku = (cartItems[0]?.product?.sku && cartItems[0].product.sku.trim())
        ? cartItems[0].product.sku.trim()
        : ((cartItems[0]?.product as any)?.skucode && (cartItems[0]?.product as any).skucode.trim())
        ? (cartItems[0]?.product as any).skucode.trim()
        : (cartItems[0]?.product?.id || 'FEAT');
      const clean = String(currentSku).replace(/[^A-Za-z0-9-_]/g, '').toUpperCase();
      if (!orderRef.startsWith(clean)) {
        setOrderRef(`${clean}-${Math.floor(1000 + Math.random() * 9000)}`);
      }
    }
  }, [cartItems, confirmedOrderId, orderRef]);

  // Price & GST Calculations
  const totalMrp = cartItems.reduce((acc, item) => acc + (Number(item.product.originalPrice) || Number(item.product.price)) * item.quantity, 0);
  const totalDiscount = cartItems.reduce((acc, item) => acc + (Math.max(0, (Number(item.product.originalPrice) || Number(item.product.price)) - Number(item.product.price))) * item.quantity, 0);
  const subtotal = totalMrp - totalDiscount;
  const effectiveAppliedPromos = (appliedPromos && appliedPromos.length > 0)
    ? appliedPromos
    : (appliedPromo ? [appliedPromo] : []);
  const couponDiscount = Math.min(
    Math.max(0, subtotal - 1),
    effectiveAppliedPromos.reduce((sum, p) => sum + p.discount, 0)
  );
  // Flat discount of 55 rupees on all prepaid orders, no promo code required, but COD orders will not get this discount
  const isPrepaid = paymentMethod !== 'COD';
  const prepaidDiscount = (isPrepaid && (subtotal - couponDiscount) > 55) ? 55 : 0;
  // 100% Free delivery nationwide on all orders (no shipping charges)
  const deliveryFee = 0;
  const finalPayable = Math.max(subtotal > 0 ? 1 : 0, subtotal - couponDiscount - prepaidDiscount + deliveryFee);

  const getItemImage = (item: CartItem) => {
    return getItemVariantImage(item.product, item.selectedColor);
  };

  const isAddressComplete = (addr: DeliveryAddress, email: string) => {
    return Boolean(
      addr?.fullName?.trim() &&
      addr?.phone?.trim() &&
      addr?.phone.replace(/\D/g, '').length >= 10 &&
      addr?.pincode?.trim() &&
      addr?.pincode.replace(/\D/g, '').length >= 6 &&
      addr?.addressLine?.trim() &&
      addr?.city?.trim() &&
      email?.trim() &&
      email.includes('@')
    );
  };

  // Saved Addresses List State
  const [savedAddressesList, setSavedAddressesList] = useState<DeliveryAddress[]>(() => {
    try {
      const saved = localStorage.getItem('feat_saved_addresses_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [saveAddressForFuture, setSaveAddressForFuture] = useState(true);
  const [deliveryEstimate, setDeliveryEstimate] = useState<DeliveryEstimate | null>(null);
  const [isEstimatingDelivery, setIsEstimatingDelivery] = useState(false);

  // Sync saved address & Cloud Firestore profile on mount
  useEffect(() => {
    setStep('checkout');
    setPaymentFailureDetails(null);

    let savedAddr: DeliveryAddress | null = null;
    let savedEmail = '';

    try {
      const storedAddr = localStorage.getItem('feat_saved_delivery_address');
      if (storedAddr) {
        savedAddr = JSON.parse(storedAddr);
      }
      savedEmail = localStorage.getItem('feat_saved_customer_email') || '';

      const storedList = localStorage.getItem('feat_saved_addresses_list');
      if (storedList) {
        const parsed = JSON.parse(storedList);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedAddressesList(parsed);
          if (!savedAddr && parsed[0]) {
            savedAddr = parsed[0];
          }
        }
      }
    } catch (e) {}

    // Cloud sync from featdb-user Firestore if user is authenticated
    if (currentUser?.uid && userDb) {
      getDoc(doc(userDb, 'users', currentUser.uid)).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.savedAddresses) && data.savedAddresses.length > 0) {
            setSavedAddressesList(data.savedAddresses);
            try {
              localStorage.setItem('feat_saved_addresses_list', JSON.stringify(data.savedAddresses));
            } catch (e) {}
            if (!savedAddr && data.defaultAddress) {
              setAddress(data.defaultAddress);
              setIsEditingAddress(false);
            }
          }
        }
      }).catch(() => {});
    }

    if (savedAddr) {
      setAddress(savedAddr);
    }
    if (savedEmail) {
      setCustomerEmail(savedEmail);
    }

    const currentAddr = savedAddr || address;
    const currentEmail = savedEmail || customerEmail;
    if (isAddressComplete(currentAddr, currentEmail)) {
      setIsEditingAddress(false);
    } else {
      setIsEditingAddress(true);
    }
  }, [currentUser]);

  // Shiprocket Estimated Delivery Date for destination pincode
  useEffect(() => {
    const pin = address?.pincode ? address.pincode.replace(/\D/g, '').slice(0, 6) : '';
    if (pin.length === 6) {
      setIsEstimatingDelivery(true);
      const instant = computeFallbackEstimate(pin, true);
      setDeliveryEstimate(instant);

      getShiprocketDeliveryEstimate(pin, 0.5, true)
        .then((res) => {
          if (res && res.isServiceable) {
            setDeliveryEstimate(res);
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsEstimatingDelivery(false);
        });
    } else {
      setDeliveryEstimate(null);
    }
  }, [address?.pincode]);

  // Persistence helper for Address
  const persistAddressToStorageAndCloud = async (addrToSave: DeliveryAddress, emailToSave: string) => {
    try {
      localStorage.setItem('feat_saved_delivery_address', JSON.stringify(addrToSave));
      if (emailToSave) {
        localStorage.setItem('feat_saved_customer_email', emailToSave);
      }
      localStorage.setItem('feat_has_saved_address', 'true');

      let currentList: DeliveryAddress[] = [];
      const savedListStr = localStorage.getItem('feat_saved_addresses_list');
      if (savedListStr) {
        try {
          const parsed = JSON.parse(savedListStr);
          if (Array.isArray(parsed)) currentList = parsed;
        } catch (e) {}
      }

      const cleanPin = addrToSave.pincode.replace(/\D/g, '');
      const addrId = addrToSave.id || `addr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const normalizedAddr: DeliveryAddress = {
        ...addrToSave,
        id: addrId,
        isDefault: true
      };

      const existingIdx = currentList.findIndex(a => 
        (a.id && a.id === addrToSave.id) ||
        (a.pincode === cleanPin && a.addressLine.toLowerCase().trim() === addrToSave.addressLine.toLowerCase().trim())
      );

      let updatedList: DeliveryAddress[] = [];
      if (existingIdx >= 0) {
        currentList[existingIdx] = normalizedAddr;
        updatedList = [...currentList];
      } else {
        updatedList = [normalizedAddr, ...currentList.map(a => ({ ...a, isDefault: false }))].slice(0, 6);
      }

      localStorage.setItem('feat_saved_addresses_list', JSON.stringify(updatedList));
      setSavedAddressesList(updatedList);

      if (currentUser?.uid && userDb) {
        try {
          const userDocRef = doc(userDb, 'users', currentUser.uid);
          await setDoc(userDocRef, {
            savedAddresses: updatedList,
            defaultAddress: normalizedAddr,
            email: emailToSave || currentUser.email || '',
            lastUpdated: new Date().toISOString()
          }, { merge: true });
        } catch (cErr) {
          console.warn('[Firestore Sync] Address sync notice:', cErr);
        }
      }
    } catch (err) {
      console.warn('Address save notice:', err);
    }
  };

  const handleSelectSavedAddress = (savedAddr: DeliveryAddress) => {
    setAddress(savedAddr);
    setIsEditingAddress(false);
  };

  const handleFetchModalLiveLocation = async () => {
    setIsLocating(true);
    setLocationError(null);
    setLocationSuccessMsg(null);

    const result = await getLiveLocationAndAddress();
    setIsLocating(false);

    if (result.success && result.address) {
      const detected = result.address;
      setAddress(prev => ({
        ...prev,
        addressLine: detected.addressLine || prev.addressLine,
        city: detected.city || prev.city,
        state: detected.state || prev.state,
        pincode: detected.pincode || prev.pincode,
        landmark: detected.landmark || prev.landmark
      }));
      setLocationSuccessMsg(`📍 Live location detected: ${detected.city}, ${detected.state} - ${detected.pincode}`);
    } else {
      setLocationError(
        result.error || 
        'Location service is off or permission was denied. Please turn on your device GPS / location and allow location access in your browser, then click "Auto-Detect Pin Code via GPS" again.'
      );
    }
  };

  // Pincode auto-lookup state
  const [isLookingUpPin, setIsLookingUpPin] = useState(false);
  const [pinLookupStatus, setPinLookupStatus] = useState<{ city: string; state: string } | null>(null);

  const handlePincodeChange = async (rawPin: string) => {
    const cleanPin = rawPin.replace(/\D/g, '').slice(0, 6);
    setAddress(prev => ({ ...prev, pincode: cleanPin }));

    if (cleanPin.length === 6) {
      setIsLookingUpPin(true);
      const res = await lookupCityStateByPincode(cleanPin);
      setIsLookingUpPin(false);
      if (res.success && res.city && res.state) {
        setAddress(prev => ({
          ...prev,
          city: res.city,
          state: res.state
        }));
        setPinLookupStatus({ city: res.city, state: res.state });
      } else {
        setPinLookupStatus(null);
      }
    } else {
      setPinLookupStatus(null);
    }
  };

  // Ensure Razorpay script is dynamically available
  const ensureRazorpayLoaded = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        resolve(true);
        return;
      }
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true));
        existingScript.addEventListener('error', () => resolve(false));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSaveAddress = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!address.fullName?.trim() || !address.phone?.trim() || !address.pincode?.trim() || !address.addressLine?.trim() || !address.city?.trim() || !customerEmail?.trim()) {
      showAlert('Please fill in all delivery and contact details (Full Name, 10-digit Phone, Email, Pincode, Address, City).', 'warning', 'Delivery Address Incomplete');
      return false;
    }
    if (address.phone.replace(/\D/g, '').length < 10) {
      showAlert('Please enter a valid 10-digit mobile number.', 'warning', 'Invalid Mobile Number');
      return false;
    }
    if (address.pincode.replace(/\D/g, '').length < 6) {
      showAlert('Please enter a valid 6-digit postal pincode.', 'warning', 'Invalid Pincode');
      return false;
    }

    if (saveAddressForFuture) {
      persistAddressToStorageAndCloud(address, customerEmail);
    } else {
      try {
        localStorage.setItem('feat_saved_delivery_address', JSON.stringify(address));
        localStorage.setItem('feat_saved_customer_email', customerEmail);
      } catch (err) {}
    }

    setIsEditingAddress(false);
    return true;
  };

  // Logging function that writes failed/timeout/cancelled transaction metadata to Firestore 'payment_logs'
  const logFailedPayment = async (metadata: {
    status: 'failed' | 'cancelled' | 'timeout' | 'error';
    errorCode?: string;
    errorReason?: string;
    errorDescription?: string;
    errorSource?: string;
    errorStep?: string;
    paymentId?: string;
    orderId?: string;
    actionAdvice?: string;
    elapsedSeconds?: number;
  }) => {
    try {
      const itemsList = cartItems.map(it => `${it.product.name} (x${it.quantity}, ${it.selectedSize || 'Free'})`).join('; ');
      const logPayload: Partial<PaymentLog> = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        orderId: metadata.orderId || orderRef,
        paymentId: metadata.paymentId || '',
        status: metadata.status,
        errorCode: metadata.errorCode || 'UNKNOWN_ERROR',
        errorReason: metadata.errorReason || '',
        errorDescription: metadata.errorDescription || '',
        errorSource: metadata.errorSource || 'gateway',
        errorStep: metadata.errorStep || 'payment_authorization',
        paymentMethod: paymentMethod || 'Razorpay',
        amount: finalPayable,
        customerName: address.fullName?.trim() || 'Guest Shopper',
        customerEmail: customerEmail || '',
        customerPhone: address.phone || '',
        cartItemsCount: cartItems.reduce((acc, it) => acc + it.quantity, 0),
        itemsSummary: itemsList,
        elapsedSeconds: metadata.elapsedSeconds !== undefined ? metadata.elapsedSeconds : paymentSessionSeconds,
        actionAdvice: metadata.actionAdvice || '',
        deviceInfo: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          screenResolution: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
          online: typeof navigator !== 'undefined' ? navigator.onLine : true
        },
        createdAt: new Date().toISOString()
      };

      console.info('[Payment Diagnostics] Logging failed/timeout transaction to Firestore:', logPayload);
      await logPaymentFailureToFirestore(logPayload);
    } catch (err) {
      console.warn('[Payment Diagnostics] Error saving payment log to Firestore:', err);
    }
  };

  const handleCancelPendingPaymentSession = async (reasonText?: string) => {
    const elapsed = paymentSessionSeconds;
    setIsPaymentSessionActive(false);
    setIsRazorpayLoading(false);

    await logFailedPayment({
      status: 'cancelled',
      errorCode: 'SESSION_CANCELLED_BY_USER',
      errorReason: reasonText || (elapsed >= 30 
        ? `User manually aborted pending payment session after waiting ${elapsed}s for gateway response.`
        : `User cancelled the pending payment session (${elapsed}s).`),
      errorDescription: 'User cancelled the pending payment session. Page controls restored.',
      errorSource: 'customer',
      errorStep: 'payment_authentication',
      elapsedSeconds: elapsed,
      actionAdvice: 'You can switch to Cash on Delivery for guaranteed fulfillment or retry with instant UPI / Net Banking.'
    });

    setPaymentFailureDetails({
      title: 'Payment Session Cancelled',
      description: elapsed >= 30 
        ? `Pending payment was cancelled after waiting ${elapsed}s for gateway / bank authorization.`
        : 'Payment session was closed before authorization was completed.',
      reason: 'No money has been debited. You can immediately place your order via Cash on Delivery or retry with UPI / Card.',
      code: 'SESSION_ABORTED',
      source: 'customer',
      step: 'payment_authentication',
      actionAdvice: 'Choose Cash on Delivery below for instant confirmation, or click Retry Payment to relaunch Razorpay.',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });
  };

  const handleManualRetryPayment = async () => {
    const elapsed = paymentSessionSeconds;
    if (elapsed >= 30) {
      await logFailedPayment({
        status: 'timeout',
        errorCode: 'GATEWAY_TIMEOUT_RETRY',
        errorReason: `Payment request exceeded 30s threshold (${elapsed}s elapsed). User initiated manual retry.`,
        errorDescription: 'Payment authorization timed out; re-initiating fresh gateway checkout session.',
        errorSource: 'gateway',
        errorStep: 'payment_authorization',
        elapsedSeconds: elapsed,
        actionAdvice: 'Triggering fresh Razorpay checkout popup.'
      });
    }

    setIsPaymentSessionActive(false);
    setPaymentSessionSeconds(0);
    setPaymentFailureDetails(null);
    setTimeout(() => {
      handleOpenRazorpayModal();
    }, 100);
  };

  const handleOpenRazorpayModal = async () => {
    if (cartItems.length === 0) {
      showAlert('Your shopping bag is empty. Please add items before proceeding.', 'warning', 'Shopping Bag Empty');
      return;
    }

    if (!agreeTerms) {
      showAlert('Please accept the Terms & Conditions and Refund Policy to proceed.', 'warning', 'Policy Acceptance Required');
      return;
    }

    if (!isAddressComplete(address, customerEmail)) {
      setIsEditingAddress(true);
      showAlert('Please fill in and save your complete delivery and contact details first.', 'warning', 'Address Required');
      return;
    }

    try {
      localStorage.setItem('feat_saved_delivery_address', JSON.stringify(address));
      localStorage.setItem('feat_saved_customer_email', customerEmail);
    } catch (err) {}

    setIsRazorpayLoading(true);
    setIsPaymentSessionActive(true);
    setPaymentSessionSeconds(0);
    setPaymentFailureDetails(null);

    try {
      const isLoaded = await ensureRazorpayLoaded();
      if (!isLoaded || typeof (window as any).Razorpay === 'undefined') {
        showAlert('Unable to load Razorpay payment gateway. Please check your internet connection and try again.', 'error', 'Gateway Connection Error');
        setIsRazorpayLoading(false);
        setIsPaymentSessionActive(false);
        await logFailedPayment({
          status: 'error',
          errorCode: 'SCRIPT_LOAD_ERROR',
          errorReason: 'Razorpay SDK script failed to load into browser environment.',
          errorDescription: 'Checkout gateway script was blocked or failed to download from CDN.',
          errorSource: 'gateway',
          errorStep: 'script_initialization',
          elapsedSeconds: 0,
          actionAdvice: 'Please disable aggressive adblockers or check your network connectivity.'
        });
        return;
      }

      let activeRzpOrderId = '';
      let activeKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_TW2OaZD6oLmiqp';

      try {
        const rzpRes = await fetch('/api/razorpay/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: finalPayable,
            orderId: orderRef,
            customerEmail,
            customerPhone: address.phone,
            items: cartItems
          }),
          signal: AbortSignal.timeout(6000)
        });
        const rzpData = await rzpRes.json();
        if (!rzpRes.ok) {
          showAlert(rzpData?.error || 'Unable to initiate payment due to inventory validation.', 'error', 'Stock Validation Notice');
          setIsRazorpayLoading(false);
          setIsPaymentSessionActive(false);
          await logFailedPayment({
            status: 'failed',
            errorCode: 'STOCK_VALIDATION_FAILED',
            errorReason: rzpData?.error || 'Server validation rejected order creation.',
            errorDescription: 'Inventory stock or order creation check failed on backend.',
            errorSource: 'server',
            errorStep: 'order_creation',
            elapsedSeconds: paymentSessionSeconds,
            actionAdvice: 'Please review available stock quantities in your bag.'
          });
          return;
        }
        activeRzpOrderId = rzpData.orderId || rzpData.id || '';
        if (rzpData.keyId) activeKeyId = rzpData.keyId;
      } catch (err: any) {
        console.warn('Razorpay backend create-order warning:', err);
      }

      const options = {
        key: activeKeyId,
        amount: Math.round(finalPayable * 100),
        currency: 'INR',
        name: 'Feather Hut Fashion',
        description: `Order ${orderRef} • Authentic Indian Ethnic Wear`,
        image: (typeof window !== 'undefined' ? window.location.origin : '') + '/saree.jpeg',
        order_id: activeRzpOrderId || undefined,
        handler: async function (response: any) {
          const elapsed = paymentSessionSeconds;
          setIsPaymentSessionActive(false);
          setIsRazorpayLoading(false);
          setPaymentFailureDetails(null);
          console.info('Razorpay payment authorization success:', response);

          await processOrder(response.razorpay_payment_id || `RZP_${Date.now()}`, {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature
          });
        },
        prefill: {
          name: address.fullName || currentUser?.displayName || '',
          email: customerEmail || currentUser?.email || '',
          contact: address.phone || currentUser?.phoneNumber || ''
        },
        notes: {
          order_reference: orderRef,
          shipping_pincode: address.pincode,
          city: address.city,
          state: address.state
        },
        theme: {
          color: '#e51975'
        },
        modal: {
          ondismiss: function () {
            const elapsed = paymentSessionSeconds;
            setIsPaymentSessionActive(false);
            setIsRazorpayLoading(false);

            logFailedPayment({
              status: 'cancelled',
              errorCode: 'POPUP_DISMISSED',
              errorReason: elapsed >= 30 
                ? `Customer closed payment modal after ${elapsed}s wait. Latency or bank authorization delay likely.`
                : 'Customer closed Razorpay popup without authorizing payment.',
              errorDescription: 'Transaction was cancelled by user dismissing the checkout gateway modal.',
              errorSource: 'customer',
              errorStep: 'payment_authorization',
              elapsedSeconds: elapsed,
              actionAdvice: 'You can retry with instant UPI / Net Banking, or switch to Cash on Delivery for instant confirmation.'
            });

            setPaymentFailureDetails({
              title: 'Payment Incomplete',
              description: 'The Razorpay payment window was closed before your transaction was authorized.',
              reason: 'No money has been debited. If your bank server timed out or you prefer not to enter card details, you can place your order via Cash on Delivery with zero extra charges.',
              code: 'POPUP_CLOSED',
              source: 'customer',
              step: 'payment_authorization',
              actionAdvice: 'Click "Retry Payment" to relaunch Razorpay or select "Place COD Order" below.',
              timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            });
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        const elapsed = paymentSessionSeconds;
        setIsPaymentSessionActive(false);
        setIsRazorpayLoading(false);
        console.error('Razorpay payment failed callback:', resp);

        const errorObj = resp?.error || {};
        const parsed = {
          title: 'Payment Failed',
          description: errorObj?.description || errorObj?.message || 'Transaction could not be completed by bank.',
          reason: errorObj?.reason || 'Authorization was declined by issuer or payment network.',
          code: errorObj?.code || 'PAYMENT_FAILED',
          source: errorObj?.source || 'gateway',
          step: errorObj?.step || 'payment_authorization',
          paymentId: errorObj?.metadata?.payment_id,
          orderId: errorObj?.metadata?.order_id,
          actionAdvice: 'You can retry with another payment mode (UPI, Netbanking, Cards) or select Cash on Delivery below.',
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };

        setPaymentFailureDetails(parsed);
        logFailedPayment({
          status: 'failed',
          errorCode: parsed.code,
          errorReason: parsed.reason,
          errorDescription: parsed.description,
          errorSource: parsed.source,
          errorStep: parsed.step,
          paymentId: parsed.paymentId,
          orderId: parsed.orderId,
          actionAdvice: parsed.actionAdvice,
          elapsedSeconds: elapsed
        });
      });
      rzp.open();
    } catch (err: any) {
      const elapsed = paymentSessionSeconds;
      setIsPaymentSessionActive(false);
      setIsRazorpayLoading(false);
      console.error('Razorpay popup launch error:', err);
      const parsed = {
        title: 'Gateway Connection Failed',
        description: err?.message || 'Could not connect to Razorpay secure checkout servers.',
        reason: 'Network or client-side connection error prevented gateway popup from launching.',
        code: 'GATEWAY_LAUNCH_ERROR',
        source: 'gateway',
        step: 'gateway_initialization',
        actionAdvice: 'Please check your network connectivity, disable adblockers for checkout, and retry.',
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      setPaymentFailureDetails(parsed);
      logFailedPayment({
        status: 'error',
        errorCode: 'GATEWAY_LAUNCH_ERROR',
        errorReason: parsed.reason,
        errorDescription: parsed.description,
        errorSource: 'gateway',
        errorStep: 'gateway_initialization',
        actionAdvice: parsed.actionAdvice,
        elapsedSeconds: elapsed
      });
    }
  };

  const processOrder = async (txnId?: string, rzpDetails?: {
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
  }) => {
    if (step === 'processing' || step === 'success') return;
    setStep('processing');

    try {
      const payableSnapshot = finalPayable;
      setConfirmedAmount(payableSnapshot);
      setOrderedItemsSnapshot([...cartItems]);
      const currentOrderRef = orderRef;

      const orderPromise = onCompleteOrder({
        orderId: currentOrderRef,
        deliveryAddress: address,
        paymentMethod,
        customerEmail,
        transactionId: txnId || (paymentMethod === 'Razorpay' ? rzpDetails?.razorpayPaymentId : 'TXN_' + Date.now()),
        phonepeTransactionId: txnId,
        razorpayOrderId: rzpDetails?.razorpayOrderId,
        razorpayPaymentId: rzpDetails?.razorpayPaymentId,
        razorpaySignature: rzpDetails?.razorpaySignature
      });

      const res: any = await orderPromise;

      if (saveAddressForFuture) {
        persistAddressToStorageAndCloud(address, customerEmail);
      }

      const finalId = res?.id || currentOrderRef;
      setConfirmedOrderId(finalId);
      if (res && typeof res.finalAmount === 'number') {
        setConfirmedAmount(res.finalAmount);
      } else {
        setConfirmedAmount(payableSnapshot);
      }
      setStep('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Order processing error:', err);
      setStep('checkout');
      showAlert(err.message || 'Could not place order due to an inventory verification error.', 'error', 'Order Verification Failed');
    }
  };

  // STEP: PROCESSING SCREEN
  if (step === 'processing') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-16 text-center animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl border border-pink-200 shadow-xl p-8 sm:p-12 space-y-6 max-w-lg mx-auto">
          <div className="w-20 h-20 border-4 border-pink-100 border-t-[#e51975] rounded-full animate-spin mx-auto shadow-sm" />
          <div className="space-y-2">
            <h3 className="font-extrabold text-gray-900 text-xl font-serif">Securing Your Order &amp; Inventory...</h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Verifying payment settlement and generating your official GST Tax Invoice. Please do not close or refresh this page.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-2 text-xs font-semibold text-gray-500">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>256-Bit SSL Encrypted Handshake</span>
          </div>
        </div>
      </div>
    );
  }

  // STEP: SUCCESS SCREEN
  if (step === 'success') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl border border-pink-200 shadow-xl overflow-hidden">
          {/* Success Banner */}
          <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-6 sm:p-8 text-center space-y-3">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-xs text-white rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <span className="bg-white/20 text-white text-xs font-black tracking-widest px-3.5 py-1 rounded-full uppercase border border-white/20">
              Order Confirmed &amp; Payment Received!
            </span>
            <h2 className="text-2xl sm:text-3xl font-black font-serif text-amber-200">
              Order ID: {confirmedOrderId}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-md mx-auto">
              Your official GST tax invoice and live courier tracking link have been dispatched to <strong>{customerEmail}</strong>.
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Tax Invoice Breakdown Box */}
            <div className="bg-purple-50/70 p-5 rounded-2xl border border-purple-200 text-xs space-y-3 max-w-xl mx-auto">
              <div className="border-b border-purple-200 pb-3 flex justify-between items-start">
                <div>
                  <p className="font-black text-purple-950 text-sm">Feather Hut Fashion</p>
                  <p className="text-[11px] text-gray-600">GSTIN: 19APAPC3078H1Z1</p>
                  <p className="text-[11px] text-gray-600">Reg. Office: Khanyan, Hoogly, West Bengal - 712147</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-[#e51975] text-white text-xs rounded-full font-bold shadow-xs">
                    PAID VIA {paymentMethod}
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-gray-700">
                <p className="font-bold text-purple-950">Delivery Address:</p>
                <p>{address.fullName}, {address.addressLine}, {address.city}, {address.state} - {address.pincode}</p>
                <p className="text-[11px] text-gray-500">Contact: {address.phone}</p>
              </div>

              <div className="border-t border-purple-200 pt-3 flex justify-between text-sm font-black text-purple-950">
                <span>Amount Paid (Incl. 5% GST &amp; Free Shipping):</span>
                <span>₹{(confirmedAmount > 0 ? confirmedAmount : finalPayable).toLocaleString('en-IN')}</span>
              </div>

              <div className="pt-2 text-[11px] text-gray-500 flex items-center justify-between border-t border-purple-100">
                <span>Standard SLA: 2-Day Return Window</span>
                <span>Support: 7869579735</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const invoiceItems = orderedItemsSnapshot.length > 0 ? orderedItemsSnapshot : [...cartItems];
                  const invTotalMrp = invoiceItems.reduce((s, i) => s + (Number(i.product?.originalPrice) || Number(i.product?.price) || 0) * i.quantity, 0);
                  const invSellingPrice = invoiceItems.reduce((s, i) => s + (Number(i.product?.price) || 0) * i.quantity, 0);
                  const invDiscount = Math.max(0, invTotalMrp - invSellingPrice);
                  const invoiceOrder: Order = {
                    id: confirmedOrderId || orderRef || 'FEAT-ORD-LIVE',
                    date: new Date().toISOString().replace('T', ' ').substring(0, 16),
                    items: invoiceItems,
                    totalMrp: invTotalMrp,
                    discountAmount: invDiscount,
                    couponDiscount: appliedPromo?.discount || 0,
                    deliveryCharge: 0,
                    finalAmount: confirmedAmount > 0 ? confirmedAmount : finalPayable,
                    deliveryAddress: address,
                    paymentMethod: paymentMethod as any,
                    paymentStatus: 'Paid',
                    orderStatus: 'Ordered',
                    customerEmail: customerEmail,
                    transactionId: confirmedOrderId,
                    trackingHistory: []
                  };
                  downloadTaxInvoice(invoiceOrder);
                }}
                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold px-5 py-3 rounded-xl text-xs sm:text-sm shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#e51975]" />
                <span>Download Tax Invoice (PDF)</span>
              </button>

              {onNavigateToOrder && (
                <button
                  type="button"
                  onClick={() => onNavigateToOrder(confirmedOrderId)}
                  className="bg-purple-950 hover:bg-purple-900 text-amber-200 font-bold px-5 py-3 rounded-xl text-xs sm:text-sm shadow-md transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Truck className="w-4 h-4 text-amber-300" />
                  <span>Track Parcel &amp; View Details</span>
                </button>
              )}

              <button
                onClick={onBackToHome}
                className="bg-amber-400 hover:bg-amber-300 text-pink-950 font-black px-6 py-3 rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>

        <CustomAlertModal
          isOpen={customAlert.isOpen}
          onClose={() => setCustomAlert(prev => ({ ...prev, isOpen: false }))}
          message={customAlert.message}
          type={customAlert.type}
          title={customAlert.title}
        />
      </div>
    );
  }

  // EMPTY CART SCREEN
  if (cartItems.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-16 text-center animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl border border-pink-200 shadow-xl p-8 sm:p-12 space-y-5 max-w-md mx-auto">
          <div className="w-16 h-16 bg-pink-100 text-pink-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <ShoppingBag className="w-8 h-8 text-pink-700" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-gray-900 text-xl font-serif">Your Shopping Bag is Empty</h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Looks like you haven't added any handcrafted sarees, kurtis, or dress materials to your cart yet.
            </p>
          </div>
          <button
            onClick={onBackToHome}
            className="w-full bg-gradient-to-r from-pink-700 to-purple-800 hover:from-pink-800 hover:to-purple-900 text-amber-200 font-extrabold py-3.5 px-6 rounded-2xl text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Explore Handloom Collections</span>
          </button>
        </div>
      </div>
    );
  }

  // MAIN CHECKOUT SCREEN (Dedicated Full Page)
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 animate-in fade-in duration-200">
      
      {/* Top Header & Breadcrumb Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-pink-200/80">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToHome}
            className="p-2 rounded-xl bg-white border border-pink-200 hover:bg-pink-50 text-gray-700 hover:text-pink-700 transition-colors cursor-pointer shadow-2xs"
            title="Return to store"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-950 font-serif tracking-tight flex items-center gap-2">
              <span>Secure Express Checkout</span>
              <Lock className="w-5 h-5 text-amber-500" />
            </h1>
            <p className="text-xs text-gray-600 font-medium">
              Feather Hut Fashion • GSTIN: 19APAPC3078H1Z1 • 256-Bit SSL Encrypted
            </p>
          </div>
        </div>

        {/* Reassurance Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <Truck className="w-3.5 h-3.5 text-emerald-600" /> 100% Free Shipping
          </span>
          <span className="inline-flex items-center gap-1 text-purple-800 font-bold bg-purple-50 px-3 py-1.5 rounded-full border border-purple-200">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Authentic Handloom Guarantee
          </span>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Shipping Address, Courier ETA, Bag Review & Payment Choice (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">

          {/* 1. DELIVERY ADDRESS SECTION */}
          <div className="bg-white rounded-2xl border border-pink-200 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-pink-700 text-white text-xs font-black flex items-center justify-center">1</span>
                <h2 className="text-sm sm:text-base font-extrabold text-gray-950 uppercase tracking-wider">
                  Delivery Address &amp; Contact
                </h2>
              </div>

              {!isEditingAddress && isAddressComplete(address, customerEmail) && (
                <button
                  type="button"
                  onClick={() => setIsEditingAddress(true)}
                  className="text-xs font-bold text-pink-700 hover:text-pink-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-pink-200 hover:bg-pink-50 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Change / Edit</span>
                </button>
              )}
            </div>

            {/* Saved Address Summary Mode */}
            {!isEditingAddress && isAddressComplete(address, customerEmail) ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-gradient-to-r from-pink-50/50 to-purple-50/40 border border-pink-200/90 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-gray-900 text-sm sm:text-base">{address.fullName}</p>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 border border-pink-200">
                        {address.type || 'Home'}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-gray-700">📱 {address.phone}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                    {address.addressLine}{address.landmark ? `, Near ${address.landmark}` : ''}, {address.city}, {address.state} - <strong className="text-gray-950 font-bold">{address.pincode}</strong>
                  </p>
                  <p className="text-xs text-gray-600 pt-0.5">
                    Invoice &amp; tracking updates: <strong className="text-gray-900 font-semibold">{customerEmail}</strong>
                  </p>
                </div>

                {/* Switch Between Stored Addresses */}
                {savedAddressesList.length > 1 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Saved Addresses on File:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {savedAddressesList.map((addr, idx) => {
                        const isSelected = addr.pincode === address.pincode && addr.addressLine === address.addressLine;
                        return (
                          <button
                            key={addr.id || idx}
                            type="button"
                            onClick={() => handleSelectSavedAddress(addr)}
                            className={`p-3 rounded-xl text-left text-xs border transition-all cursor-pointer ${
                              isSelected 
                                ? 'border-pink-600 bg-pink-50/80 ring-1 ring-pink-500' 
                                : 'border-gray-200 hover:border-pink-300 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold text-gray-900">
                              <span>{addr.fullName}</span>
                              <span className="text-[10px] text-gray-500">{addr.type}</span>
                            </div>
                            <p className="text-gray-600 truncate mt-0.5">{addr.addressLine}, {addr.city} ({addr.pincode})</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Address Edit Form */
              <form onSubmit={handleSaveAddress} className="space-y-4">
                {/* Auto Location GPS Quick-Fill */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-pink-50/60 rounded-xl border border-pink-200">
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <Navigation className="w-4 h-4 text-pink-700 shrink-0" />
                    <span>In a hurry? Auto-detect your pincode &amp; city via browser GPS.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchModalLiveLocation}
                    disabled={isLocating}
                    className="shrink-0 bg-white hover:bg-pink-100/60 border border-pink-300 text-pink-900 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-60"
                  >
                    {isLocating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-pink-700" />
                        <span>Locating...</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-3.5 h-3.5 text-pink-700" />
                        <span>Auto-Detect Pin Code via GPS</span>
                      </>
                    )}
                  </button>
                </div>

                {locationSuccessMsg && (
                  <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>{locationSuccessMsg}</span>
                  </p>
                )}

                {locationError && (
                  <p className="text-xs text-rose-700 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{locationError}</span>
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Priyadarshini Sen"
                      value={address.fullName}
                      onChange={(e) => setAddress(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 bg-gray-50/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Mobile Phone Number (10 Digits) *</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-2.5 rounded-l-xl border border-r-0 border-gray-300 bg-gray-100 text-gray-600 text-xs font-semibold">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="9876543210"
                        value={address.phone}
                        onChange={(e) => setAddress(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-pink-500 bg-gray-50/50 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-gray-700">Email Address (For Instant GST Invoice &amp; Courier Tracking) *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. priya.sen@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 bg-gray-50/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                      <span>Postal Pincode *</span>
                      {isLookingUpPin && <span className="text-[10px] text-pink-700 font-semibold animate-pulse">Auto-filling city &amp; state...</span>}
                      {pinLookupStatus && <span className="text-[10px] text-emerald-700 font-bold">✓ {pinLookupStatus.city}, {pinLookupStatus.state}</span>}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="postal-code"
                      required
                      maxLength={6}
                      placeholder="e.g. 700001"
                      value={address.pincode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 bg-gray-50/50 font-mono font-bold text-gray-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">City / District *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kolkata"
                      value={address.city}
                      onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 bg-gray-50/50"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-gray-700">Flat, House No., Building, Street Address *</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="e.g. 42B Southern Avenue, Lake Gardens, Block 2, Flat 3A"
                      value={address.addressLine}
                      onChange={(e) => setAddress(prev => ({ ...prev, addressLine: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 bg-gray-50/50 resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Landmark (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Opposite Kali Temple"
                      value={address.landmark || ''}
                      onChange={(e) => setAddress(prev => ({ ...prev, landmark: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 bg-gray-50/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">State *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. West Bengal"
                      value={address.state}
                      onChange={(e) => setAddress(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 bg-gray-50/50"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-gray-700">Address Type</label>
                    <div className="flex gap-2 pt-0.5">
                      {(['Home', 'Work', 'Other'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setAddress(prev => ({ ...prev, type }))}
                          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            (address.type || 'Home') === type
                              ? 'bg-pink-700 text-white border-pink-700 shadow-2xs'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-pink-300'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={saveAddressForFuture}
                      onChange={(e) => setSaveAddressForFuture(e.target.checked)}
                      className="rounded text-pink-600 focus:ring-pink-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs text-gray-700 font-medium">Save this address for fast checkout in future</span>
                  </label>

                  <button
                    type="submit"
                    className="bg-pink-800 hover:bg-pink-900 text-amber-100 font-bold px-5 py-2 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
                  >
                    Save &amp; Deliver Here
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 2. SHIPROCKET LIVE DELIVERY ESTIMATE BANNER */}
          {deliveryEstimate && (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50 rounded-2xl border border-emerald-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl mt-0.5 shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-extrabold text-emerald-950">
                      Estimated Arrival: {deliveryEstimate.estimatedDeliveryDate || 'Within 2-4 Days'}
                    </h3>
                    <span className="bg-emerald-200 text-emerald-900 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                      100% Free
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Carrier Partner: <strong className="text-gray-900">{deliveryEstimate.courierName || 'Shiprocket Express'}</strong> • {deliveryEstimate.dispatchTime || 'Dispatches in 1-2 Business Days'}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider block">
                  Zero Delivery Charge
                </span>
                <span className="text-[11px] text-gray-500">Pan-India Express Air</span>
              </div>
            </div>
          )}

          {/* 3. ORDER ITEMS REVIEW SECTION */}
          <div className="bg-white rounded-2xl border border-pink-200 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-pink-700 text-white text-xs font-black flex items-center justify-center">2</span>
                <h2 className="text-sm sm:text-base font-extrabold text-gray-950 uppercase tracking-wider">
                  Review Items in Your Purchase ({cartItems.reduce((acc, i) => acc + i.quantity, 0)} Units)
                </h2>
              </div>
              <span className="text-xs font-bold text-gray-500">
                {cartItems.length} {cartItems.length === 1 ? 'Product' : 'Products'}
              </span>
            </div>

            <div className="space-y-3 divide-y divide-pink-100/70">
              {cartItems.map((item) => (
                <div
                  key={`${item.product.id}-${item.selectedSize}-${item.selectedColor || ''}`}
                  className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5">
                    <img
                      src={getItemImage(item)}
                      alt={item.product.name}
                      className="w-16 h-20 object-cover rounded-xl shrink-0 border border-pink-100 shadow-2xs"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const fb = getCategoryFallbackImage(item.product?.category, item.product?.collection, item.product?.name);
                        if ((e.currentTarget as HTMLImageElement).src !== fb && !(e.currentTarget as HTMLImageElement).src.endsWith(fb)) {
                          (e.currentTarget as HTMLImageElement).src = fb;
                        }
                      }}
                    />
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-gray-900 text-xs sm:text-sm line-clamp-1">
                        {item.product.name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                        <span className="bg-pink-50 border border-pink-100 text-pink-900 px-2 py-0.5 rounded-md font-bold">
                          Size: {item.selectedSize || 'Free Size'}
                        </span>
                        {item.selectedColor && item.selectedColor !== 'Default' && item.selectedColor !== 'Original' && ((item.product.colorVariants && item.product.colorVariants.length > 1) || (item.product.colors && item.product.colors.length > 1)) && (
                          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-medium">
                            <span 
                              className="w-2.5 h-2.5 rounded-full border border-black/20" 
                              style={{ backgroundColor: getColorHex(item.selectedColor) }} 
                            />
                            {item.selectedColor}
                          </span>
                        )}
                        <span className="text-gray-400">SKU: {item.product.sku || 'FEAT-01'}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="font-black text-gray-950 text-sm">
                          ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                        </span>
                        {item.product.originalPrice > item.product.price && (
                          <span className="text-xs text-gray-400 line-through">
                            ₹{(item.product.originalPrice * item.quantity).toLocaleString('en-IN')}
                          </span>
                        )}
                        {item.quantity > 1 && (
                          <span className="text-[10px] font-extrabold text-pink-900 bg-pink-100 px-1.5 py-0.5 rounded border border-pink-200">
                            {item.quantity} pieces
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quantity and Controls */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0">
                    <div className="flex items-center border border-pink-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity && onUpdateQuantity(item.product.id, item.selectedSize, -1, item.selectedColor)}
                        disabled={item.quantity <= 1}
                        className="p-1.5 hover:bg-pink-50 text-gray-600 disabled:opacity-30 transition-colors cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-gray-900 font-mono">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity && onUpdateQuantity(item.product.id, item.selectedSize, 1, item.selectedColor)}
                        className="p-1.5 hover:bg-pink-50 text-gray-600 transition-colors cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="font-black text-sm text-gray-900 w-20 text-right">
                      ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                    </span>

                    {onRemoveItem && (
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.product.id, item.selectedSize, item.selectedColor)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove item from bag"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. SELECT PAYMENT METHOD */}
          <div className="bg-white rounded-2xl border border-pink-200 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-pink-700 text-white text-xs font-black flex items-center justify-center">3</span>
                <h2 className="text-sm sm:text-base font-extrabold text-gray-950 uppercase tracking-wider">
                  Select Payment Method
                </h2>
              </div>
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> 100% Encrypted &amp; Protected
              </span>
            </div>

            <div className="space-y-3">
              {/* Option 1: Razorpay Gateway (UPI, Cards, NetBanking) */}
              <label 
                className={`p-4 rounded-2xl border transition-all block cursor-pointer ${
                  paymentMethod === 'Razorpay'
                    ? 'border-pink-600 bg-gradient-to-r from-pink-50/60 to-purple-50/40 ring-1 ring-pink-500 shadow-2xs'
                    : 'border-gray-200 hover:border-pink-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="payment_option"
                      checked={paymentMethod === 'Razorpay'}
                      onChange={() => setPaymentMethod('Razorpay')}
                      className="mt-1 w-4 h-4 text-pink-700 focus:ring-pink-500 cursor-pointer"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-gray-950">
                          Online Payment (Cards, UPI, NetBanking, Wallets)
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase border border-emerald-300 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-emerald-600" />
                          <span>Flat ₹55 OFF Applied</span>
                        </span>
                      </div>
                      <p className="text-xs text-emerald-700 font-semibold">
                        ⚡ Instant ₹55 flat discount automatically applied on all prepaid orders! No promo code required.
                      </p>
                      <p className="text-xs text-gray-500">
                        Fast &amp; secure checkout with Google Pay, PhonePe, Paytm, BHIM UPI, Credit/Debit Cards, Net Banking, and Cred.
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-gray-500 font-semibold">
                        <span className="bg-gray-100 px-2 py-0.5 rounded">UPI / QR</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded">Visa &amp; Mastercard</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded">RuPay</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded">NetBanking (50+ Banks)</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded">Zero Gateway Surcharge</span>
                      </div>
                    </div>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                </div>
              </label>

              {/* Option 2: Cash on Delivery (COD) */}
              <label 
                className={`p-4 rounded-2xl border transition-all block cursor-pointer ${
                  paymentMethod === 'COD'
                    ? 'border-pink-600 bg-gradient-to-r from-pink-50/60 to-purple-50/40 ring-1 ring-pink-500 shadow-2xs'
                    : 'border-gray-200 hover:border-pink-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="payment_option"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                      className="mt-1 w-4 h-4 text-pink-700 focus:ring-pink-500 cursor-pointer"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-gray-950">
                          Cash on Delivery (COD)
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-bold uppercase">
                          Standard
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Pay cash upon doorstep delivery.
                      </p>
                      <p className="text-[11px] text-amber-800 font-medium bg-amber-50 p-2 rounded-lg border border-amber-200">
                        ⚠️ Note: COD orders will not get the flat ₹55 discount. Pay online to get Flat ₹55 OFF!
                      </p>
                    </div>
                  </div>
                  <Banknote className="w-5 h-5 text-gray-700 shrink-0 mt-0.5" />
                </div>
              </label>
            </div>

            {/* Active Payment Session & Progress Widget (Latency Detection) */}
            {isPaymentSessionActive && (
              <div className={`p-4 rounded-2xl border space-y-3 transition-all ${
                paymentSessionSeconds >= 30 
                  ? 'border-amber-400 bg-amber-50/95 ring-2 ring-amber-300/60' 
                  : 'border-pink-300 bg-gradient-to-br from-pink-50/90 to-purple-50/90'
              }`}>
                <div className="flex items-center justify-between gap-2 border-b border-pink-200/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-xl ${paymentSessionSeconds >= 30 ? 'bg-amber-100 text-amber-800' : 'bg-pink-100 text-pink-700'}`}>
                      {paymentSessionSeconds >= 30 ? (
                        <AlertOctagon className="w-5 h-5 animate-pulse text-amber-700" />
                      ) : (
                        <Hourglass className="w-5 h-5 animate-spin text-pink-700" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-extrabold ${paymentSessionSeconds >= 30 ? 'text-amber-950' : 'text-pink-950'}`}>
                          {paymentSessionSeconds >= 30 ? 'Payment Taking Longer Than Usual' : 'Processing Secure Payment'}
                        </h4>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          paymentSessionSeconds >= 30 
                            ? 'bg-amber-200 text-amber-900 animate-pulse border border-amber-300' 
                            : 'bg-pink-200 text-pink-900'
                        }`}>
                          <Timer className="w-3 h-3" />
                          {Math.floor(paymentSessionSeconds / 60).toString().padStart(2, '0')}:{(paymentSessionSeconds % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 font-medium">
                        {paymentSessionSeconds >= 30 
                          ? `Elapsed: ${paymentSessionSeconds}s • Bank server or UPI app response delayed` 
                          : `Elapsed: ${paymentSessionSeconds}s of standard 30s authorization window`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCancelPendingPaymentSession('User cancelled pending session from progress widget.')}
                    className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-200/50 transition-colors"
                    title="Cancel payment session"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-medium text-gray-600">
                    <span>
                      {paymentSessionSeconds < 6 && '1/3 Initializing Gateway & Validating Order...'}
                      {paymentSessionSeconds >= 6 && paymentSessionSeconds < 18 && '2/3 Awaiting Bank / UPI App Approval...'}
                      {paymentSessionSeconds >= 18 && paymentSessionSeconds < 30 && '3/3 Finalizing Secure Authorization...'}
                      {paymentSessionSeconds >= 30 && '⚠️ Gateway Response Latency Threshold Exceeded'}
                    </span>
                    <span className="font-mono font-bold text-[10px]">
                      {paymentSessionSeconds >= 30 ? `${paymentSessionSeconds}s` : `${Math.min(100, Math.round((paymentSessionSeconds / 30) * 100))}%`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200/80 rounded-full h-2 overflow-hidden shadow-inner">
                    <div 
                      className={`h-full transition-all duration-1000 ease-out ${
                        paymentSessionSeconds >= 30 
                          ? 'bg-amber-500 animate-pulse' 
                          : 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(8, Math.round((paymentSessionSeconds / 30) * 100)))}%` }}
                    />
                  </div>
                </div>

                {paymentSessionSeconds >= 30 && (
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleManualRetryPayment}
                      className="flex-1 bg-rose-900 hover:bg-rose-950 text-amber-200 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Payment (Razorpay)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleCancelPendingPaymentSession('Switched to COD after latency delay');
                        setPaymentMethod('COD');
                      }}
                      className="px-3 py-2 bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Banknote className="w-3.5 h-3.5 text-gray-600" />
                      <span>Switch to COD</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Error & Diagnostic Banner if previous attempt failed */}
            {paymentFailureDetails && !isPaymentSessionActive && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider">
                      {paymentFailureDetails.title || 'Payment Notice'}
                    </h4>
                    <p className="text-xs text-rose-900 leading-relaxed">
                      {paymentFailureDetails.description}
                    </p>
                    {paymentFailureDetails.actionAdvice && (
                      <p className="text-[11px] text-gray-700 bg-white/70 p-2 rounded-lg border border-rose-100">
                        💡 <strong>Recommended:</strong> {paymentFailureDetails.actionAdvice}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleOpenRazorpayModal}
                    className="bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Again (Razorpay)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentFailureDetails(null);
                      setPaymentMethod('COD');
                    }}
                    className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Banknote className="w-3.5 h-3.5 text-gray-600" />
                    <span>Switch to Cash on Delivery</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Order Summary, Coupon Input & Final Action Button (4 or 5 cols, Sticky) */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-24 space-y-5">
          
          {/* Promo Code & Spend Milestone Rewards Card */}
          <div className="space-y-3">
            <CouponMilestonesCard
              currentAmount={subtotal}
              appliedPromos={effectiveAppliedPromos}
              onApplyPromo={onApplyPromo}
              onRemovePromo={onRemovePromo}
              variant="checkout"
            />

            {/* Cross-Market Other Product Coupons Banner */}
            <div className="p-3 bg-gradient-to-r from-amber-50 to-pink-50 border border-amber-200 rounded-2xl space-y-2 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
                <BadgePercent className="w-3.5 h-3.5 text-pink-700" />
                <Ticket className="w-3.5 h-3.5 text-pink-700" />
                <span>Special Coupons on Other Collections:</span>
              </div>
              <p className="text-[11px] text-amber-900">
                Add matching items from these collections to unlock and stack additional discounts in this order:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                {[
                  { code: 'GORBO', discount: '5% OFF', name: 'Sarees (excl. Firdausi)', cat: 'Sarees' },
                  { code: 'INDIANA', discount: '2% OFF', name: 'Suit Sets', cat: 'Suit Sets' },
                  { code: 'BEAUTIFULYOU', discount: '4% OFF', name: 'Dress Materials', cat: 'Dress Materials' },
                  { code: 'BHUSWARG', discount: '6% OFF', name: 'Firdausi Collection', col: 'Firdausi' },
                ].map((mc) => (
                  <button
                    key={mc.code}
                    type="button"
                    onClick={() => {
                      if (mc.cat && onExploreCategory) onExploreCategory(mc.cat);
                      else if (mc.col && onExploreCollection) onExploreCollection(mc.col);
                      else onBackToHome();
                    }}
                    className="text-left bg-white/90 hover:bg-white p-2 rounded-lg border border-amber-200/80 text-xs transition-colors flex items-center justify-between gap-1 shadow-2xs cursor-pointer"
                  >
                    <div>
                      <span className="font-mono font-bold text-pink-900 bg-pink-50 px-1 rounded text-[10px] mr-1">
                        {mc.code}
                      </span>
                      <span className="font-semibold text-gray-800 text-[11px]">
                        {mc.name} ({mc.discount})
                      </span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-pink-700 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Prepaid Discount Banner */}
          <div className="bg-gradient-to-r from-amber-50 to-pink-50 rounded-2xl border border-amber-200/80 p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-amber-700" />
            </div>
            <div className="space-y-0.5 text-xs">
              <p className="font-extrabold text-amber-950">
                Prepaid Discount: Flat ₹55 OFF
              </p>
              <p className="text-amber-800 leading-tight text-[11px]">
                Pay online using UPI, Cards or NetBanking to automatically get Flat ₹55 off. No promo code needed.
              </p>
            </div>
          </div>

          {/* Price Breakdown & Checkout Action Card */}
          <div className="bg-white rounded-2xl border border-pink-200 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-extrabold text-gray-950 uppercase tracking-wider border-b border-pink-100 pb-2">
              Order Price Details
            </h3>

            <div className="space-y-2.5 text-xs text-gray-700">
              <div className="flex justify-between">
                <span>Total MRP ({cartItems.reduce((acc, i) => acc + i.quantity, 0)} Items)</span>
                <span className="font-mono">₹{totalMrp.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between text-emerald-700">
                <span>Product Discount</span>
                <span className="font-mono font-bold">-₹{totalDiscount.toLocaleString('en-IN')}</span>
              </div>

              {appliedPromo && (
                <div className="flex justify-between text-emerald-700">
                  <span>Coupon Savings ({appliedPromo.code})</span>
                  <span className="font-mono font-bold">-₹{couponDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}

              {prepaidDiscount > 0 && (
                <div className="flex justify-between items-center text-emerald-800 bg-emerald-50/90 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Prepaid Order Discount</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-800">-₹{prepaidDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-gray-700">
                <span className="flex items-center gap-1">
                  <span>Delivery Charges</span>
                  <span className="text-[10px] text-gray-400 font-medium">(Pan-India)</span>
                </span>
                <span className="font-bold text-emerald-700 uppercase">100% FREE</span>
              </div>

              <div className="border-t border-pink-100 pt-3 flex justify-between items-baseline">
                <div>
                  <span className="text-sm sm:text-base font-black text-gray-950">Total Payable</span>
                  <p className="text-[10px] text-gray-500 font-medium">Inclusive of 5% GST &amp; Free Insurance</p>
                </div>
                <span className="text-xl sm:text-2xl font-black text-pink-800 font-mono">
                  ₹{finalPayable.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Terms & Conditions Acceptance Checkbox */}
            <label className="flex items-start gap-2 pt-1 cursor-pointer select-none text-[11px] text-gray-600 leading-snug">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 rounded text-pink-600 focus:ring-pink-500 w-4 h-4 cursor-pointer shrink-0"
              />
              <span>
                I agree to the <a href="/terms" target="_blank" className="underline font-bold text-gray-800 hover:text-pink-700">Terms &amp; Conditions</a> and <a href="/return-and-cancellation" target="_blank" className="underline font-bold text-gray-800 hover:text-pink-700">2-Day Return Policy</a>.
              </span>
            </label>

            {/* Primary Action Button */}
            {paymentMethod === 'Razorpay' ? (
              <button
                type="button"
                onClick={handleOpenRazorpayModal}
                disabled={isRazorpayLoading || cartItems.length === 0}
                className="w-full bg-gradient-to-r from-[#e51975] via-pink-700 to-purple-800 hover:from-pink-700 hover:to-purple-900 disabled:opacity-60 text-white font-black py-4 px-6 rounded-2xl text-sm sm:text-base shadow-xl transition-all flex items-center justify-center gap-2 border border-pink-400 active:scale-98 cursor-pointer"
              >
                {isRazorpayLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-amber-300 shrink-0" />
                )}
                <span>
                  {isRazorpayLoading
                    ? 'Connecting to Gateway...'
                    : `Proceed to Pay ₹${finalPayable.toLocaleString('en-IN')} (Razorpay)`}
                </span>
              </button>
            ) : (
              <button
                type="button"
                disabled={cartItems.length === 0}
                onClick={async () => {
                  if (!agreeTerms) {
                    showAlert('Please accept the Terms & Conditions and Refund Policy to proceed.', 'warning', 'Policy Acceptance Required');
                    return;
                  }
                  if (!isAddressComplete(address, customerEmail)) {
                    setIsEditingAddress(true);
                    showAlert('Please fill in and save your complete delivery and contact details first.', 'warning', 'Address Required');
                    return;
                  }
                  await processOrder('COD_' + Date.now());
                }}
                className="w-full bg-gradient-to-r from-emerald-700 via-teal-800 to-emerald-900 hover:from-emerald-800 hover:to-teal-900 text-amber-200 font-black py-4 px-6 rounded-2xl text-sm sm:text-base shadow-xl transition-all flex items-center justify-center gap-2 border border-emerald-400 active:scale-98 cursor-pointer"
              >
                <Banknote className="w-5 h-5 text-amber-300 shrink-0" />
                <span>Confirm Cash on Delivery Order (₹{finalPayable.toLocaleString('en-IN')})</span>
              </button>
            )}

            {/* Buyer Protection Guarantee List */}
            <div className="pt-2 border-t border-pink-100/80 space-y-2 text-[11px] text-gray-600">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>100% Authentic Handloom Silk &amp; Cotton</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-pink-700 shrink-0" />
                <span>Free Express Shipping across 28,000+ PIN Codes</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                <span>Hassle-Free 48-Hour Return &amp; Exchange Window</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Official GST Tax Invoice Generated Instantly</span>
              </div>
            </div>
          </div>

          {/* Help & Support Card */}
          <div className="p-4 rounded-2xl bg-pink-50/50 border border-pink-200 text-xs text-gray-700 space-y-1 text-center">
            <p className="font-bold text-pink-950">Need Help with Your Order?</p>
            <p className="text-[11px] text-gray-600">
              Call or WhatsApp our styling desk at <a href="tel:7869579735" className="font-bold text-pink-800 underline">7869579735</a>
            </p>
          </div>

        </div>

      </div>

      {/* Centralized Custom Alert Modal */}
      <CustomAlertModal
        isOpen={customAlert.isOpen}
        onClose={() => setCustomAlert(prev => ({ ...prev, isOpen: false }))}
        message={customAlert.message}
        type={customAlert.type}
        title={customAlert.title}
      />

    </div>
  );
};
