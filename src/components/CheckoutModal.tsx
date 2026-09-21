import React, { useState, useEffect } from 'react';
import { 
  X, ShieldCheck, Lock, Trash2, Plus, Minus, Banknote, CheckCircle, ArrowRight, 
  FileText, Check, Navigation, AlertCircle, CheckCircle2, ShoppingBag, Edit3, 
  AlertTriangle, RefreshCw, HelpCircle, XCircle, Clock, Timer, Hourglass, AlertOctagon, Ban, Activity,
  Truck, MapPin, Zap, BookmarkCheck, PlusCircle
} from 'lucide-react';
import { CartItem, DeliveryAddress, Order, PaymentLog, DeliveryEstimate } from '../types';
import { downloadTaxInvoice } from '../utils/invoiceGenerator';
import { getLiveLocationAndAddress } from '../utils/geolocation';
import { lookupCityStateByPincode } from '../utils/pincodeLookup';
import { getColorHex } from '../utils/colors';
import { CustomAlertModal, AlertModalState } from './CustomAlertModal';
import { logPaymentFailureToFirestore, db, userDb } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { sanitizeForFirestore } from '../firebaseAdmin';
import { getShiprocketDeliveryEstimate, computeFallbackEstimate } from '../utils/deliveryEstimation';
import { getItemVariantImage, getCategoryFallbackImage } from '../utils/productImage';
import { getUserReferralProfile, getPendingReferralCode, savePendingReferralCode, feathersToRupees, FEATHER_RUPEE_VALUE } from '../services/referralService';
import { MagicFeatherSvg } from './MagicFeatherAnimation';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity?: (productId: string, size: string, delta: number, color?: string) => void;
  onRemoveItem?: (productId: string, size: string, color?: string) => void;
  appliedPromo: { code: string; discount: number; description: string } | null;
  onApplyPromo?: (code: string) => Promise<{ valid: boolean; message?: string }>;
  onRemovePromo?: () => void;
  currentUser?: any;
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
    feathersUsed?: number;
    feathersDiscount?: number;
    referralCodeUsed?: string;
  }) => Promise<any>;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  appliedPromo,
  onApplyPromo,
  onRemovePromo,
  currentUser,
  onCompleteOrder
}) => {
  const [step, setStep] = useState<'checkout' | 'processing' | 'success'>('checkout');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  
  // Custom Alert Modal State
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
  
  // Promo code state inside checkout
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  // Address State (prefill with saved address or currentUser if available)
  const [address, setAddress] = useState<DeliveryAddress>(() => {
    try {
      const stored = localStorage.getItem('feat_saved_delivery_address');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.fullName && parsed?.phone && parsed?.addressLine) {
          return parsed;
        }
      }
    } catch (e) {}
    return {
      fullName: currentUser?.displayName || '',
      phone: currentUser?.phoneNumber || '',
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

  // Update fields if currentUser updates
  useEffect(() => {
    if (currentUser) {
      if (currentUser.email && !customerEmail) setCustomerEmail(currentUser.email);
      if (currentUser.displayName && !address.fullName) {
        setAddress(prev => ({ ...prev, fullName: currentUser.displayName }));
      }
    }
  }, [currentUser]);

  // Payment Method State
  const [paymentMethod, setPaymentMethod] = useState<'Razorpay' | 'PhonePe' | 'COD'>('Razorpay');
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

  // Logging function that writes failed/timeout/cancelled transaction metadata to Firestore 'payment_logs' collection
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

  // Helper to map Razorpay error codes/reasons into human-friendly explanations & actionable advice
  const parseRazorpayError = (errorObj: any) => {
    const rawCode = errorObj?.code || '';
    const rawReason = (errorObj?.reason || '').toLowerCase();
    const rawDesc = errorObj?.description || errorObj?.message || 'Transaction could not be completed.';
    const source = errorObj?.source || 'gateway';
    const step = errorObj?.step || 'payment_authorization';
    const paymentId = errorObj?.metadata?.payment_id || '';
    const orderId = errorObj?.metadata?.order_id || '';

    let friendlyTitle = 'Payment Incomplete';
    let friendlyReason = rawDesc;
    let advice = 'You can retry with the same method or select another payment option (such as UPI, Netbanking, Cards, or Cash on Delivery).';

    if (rawReason.includes('insufficient_funds') || rawDesc.toLowerCase().includes('insufficient')) {
      friendlyTitle = 'Insufficient Funds';
      friendlyReason = 'Your bank account or card balance does not have enough funds to complete this transaction.';
      advice = 'Please top-up your account, use a different bank card/account, or proceed with Cash on Delivery.';
    } else if (rawReason.includes('payment_cancelled') || rawReason.includes('user_cancelled') || rawDesc.toLowerCase().includes('cancelled') || rawDesc.toLowerCase().includes('canceled')) {
      friendlyTitle = 'Payment Cancelled by User';
      friendlyReason = 'The payment process was closed or cancelled before authorization completed.';
      advice = 'If this was accidental, click the button below to resume payment without re-entering your address.';
    } else if (rawReason.includes('timed_out') || rawReason.includes('timeout') || rawDesc.toLowerCase().includes('timeout') || rawDesc.toLowerCase().includes('timed out')) {
      friendlyTitle = 'Gateway / Bank Timeout';
      friendlyReason = 'The banking network took too long to respond to the authorization request.';
      advice = 'Any amount deducted is automatically refunded by your bank within 24-48 hours. You may try again now with high-speed UPI or Net Banking.';
    } else if (rawReason.includes('bad_request') || rawReason.includes('validation_error')) {
      friendlyTitle = 'Payment Validation Issue';
      friendlyReason = rawDesc || 'The card or payment details provided could not be authenticated.';
      advice = 'Please verify your CVV, expiry date, or UPI PIN and try again.';
    } else if (rawReason.includes('otp') || rawDesc.toLowerCase().includes('otp')) {
      friendlyTitle = 'OTP Authentication Failed';
      friendlyReason = 'The One-Time Password (OTP) entered was incorrect or expired.';
      advice = 'Request a fresh OTP or choose another payment mode.';
    } else if (rawReason.includes('limit_exceeded') || rawDesc.toLowerCase().includes('limit')) {
      friendlyTitle = 'Transaction Limit Exceeded';
      friendlyReason = 'The transaction amount exceeds the daily or per-transaction limit set by your bank.';
      advice = 'Please approve international/domestic e-commerce limits in your banking app or use another payment method.';
    } else if (source === 'customer') {
      friendlyTitle = 'Customer Action Required';
      friendlyReason = rawDesc;
      advice = 'Please check the credentials or authentication prompt sent by your bank app and retry.';
    }

    return {
      title: friendlyTitle,
      description: rawDesc,
      reason: friendlyReason,
      code: rawCode || errorObj?.reason || 'PAYMENT_FAILED',
      source,
      step,
      paymentId,
      orderId,
      actionAdvice: advice,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  // Live Geolocation state
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string | null>(null);

  const [confirmedOrderId, setConfirmedOrderId] = useState<string>('');
  const [confirmedAmount, setConfirmedAmount] = useState<number>(0);
  const [orderedItemsSnapshot, setOrderedItemsSnapshot] = useState<CartItem[]>([]);

  // Magic Feathers Loyalty & Referral State
  const [availableFeathers, setAvailableFeathers] = useState(0);
  const [useMagicFeathers, setUseMagicFeathers] = useState(false);
  const [referralCodeInput, setReferralCodeInput] = useState(() => getPendingReferralCode() || '');
  const [referralCodeApplied, setReferralCodeApplied] = useState(() => Boolean(getPendingReferralCode()));
  const [referralCodeMsg, setReferralCodeMsg] = useState<string | null>(() => {
    const p = getPendingReferralCode();
    return p ? `Referral code "${p}" active from invite link!` : null;
  });

  // Fetch current user's available Magic Feathers
  useEffect(() => {
    if (!isOpen) return;
    const fetchFeathers = async () => {
      try {
        const uid = currentUser?.uid || '';
        const email = customerEmail || currentUser?.email || '';
        if (uid || email) {
          const profile = await getUserReferralProfile(uid, email);
          setAvailableFeathers(profile.availableFeathers || 0);
        }
      } catch (_) {}
    };
    fetchFeathers();
  }, [isOpen, customerEmail, currentUser]);

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
  const totalMrp = cartItems.reduce((acc, item) => acc + item.product.originalPrice * item.quantity, 0);
  const totalDiscount = cartItems.reduce((acc, item) => acc + (item.product.originalPrice - item.product.price) * item.quantity, 0);
  const subtotal = totalMrp - totalDiscount;
  const couponDiscount = appliedPromo ? appliedPromo.discount : 0;
  // Flat discount of 55 rupees on all prepaid orders, no promo code required, but COD orders will not get this discount
  const isPrepaid = paymentMethod !== 'COD';
  const prepaidDiscount = (isPrepaid && subtotal > 0) ? 55 : 0;

  // Magic Feathers Extra Discount (1 feather = 50 paisa = ₹0.50)
  // Applied on top of the promo code discounts!
  const remainingBeforeFeathers = Math.max(0, subtotal - couponDiscount - prepaidDiscount);
  const maxPossibleFeatherDiscount = availableFeathers * FEATHER_RUPEE_VALUE;
  const feathersDiscount = useMagicFeathers ? Math.min(maxPossibleFeatherDiscount, remainingBeforeFeathers) : 0;
  const feathersUsed = useMagicFeathers ? Math.round(feathersDiscount / FEATHER_RUPEE_VALUE) : 0;

  // 100% Free delivery nationwide on all products (no shipping charges even under 1000 rupees)
  const deliveryFee = 0;
  const finalPayable = Math.max(0, subtotal - couponDiscount - prepaidDiscount - feathersDiscount + deliveryFee);

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

  // Address List & Persistence State
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

  // Sync saved address & Cloud Firestore profile on modal open
  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, currentUser]);

  // Automatically calculate Shiprocket Estimated Delivery Date for destination pincode
  useEffect(() => {
    const pin = address?.pincode ? address.pincode.replace(/\D/g, '').slice(0, 6) : '';
    if (pin.length === 6) {
      setIsEstimatingDelivery(true);
      // Instant postal estimate
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

  // Robust persistence helper for Address across browser sessions & cloud
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

      // Save to Firebase Firestore (featdb-user) if logged in
      if (currentUser?.uid && userDb) {
        try {
          const userDocRef = doc(userDb, 'users', currentUser.uid);
          await setDoc(userDocRef, sanitizeForFirestore({
            savedAddresses: updatedList,
            defaultAddress: normalizedAddr,
            email: emailToSave || currentUser.email || '',
            lastUpdated: new Date().toISOString()
          }), { merge: true });
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
        'Location service is off or permission was denied. Please turn on your device GPS / location and allow location access in your browser, then click "Set Live Location" again.'
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

  // Helper to dynamically load Razorpay script
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
      errorDescription: 'User cancelled the pending payment session. Modal controls restored.',
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

    // Ensure saved to localStorage
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
      let isLiveOrder = false;
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
        activeRzpOrderId = rzpData.orderId || '';
        const isLiveOrder = Boolean(rzpData.isLive && activeRzpOrderId && !activeRzpOrderId.startsWith('FEAT_'));
        if (rzpData.keyId) {
          activeKeyId = rzpData.keyId;
        }
      } catch (e: any) {
        console.warn('Razorpay backend order creation notice:', e);
      }

      const options: any = {
        key: activeKeyId || 'rzp_live_TW2OaZD6oLmiqp',
        amount: Math.round(finalPayable * 100),
        currency: 'INR',
        name: 'Feather Hut Fashion',
        description: `Order #${orderRef} - Handloom Ethnic Couture`,
        image: (typeof window !== 'undefined' ? window.location.origin : '') + '/saree.jpeg',
        handler: async function (response: any) {
          setIsPaymentSessionActive(false);
          setIsRazorpayLoading(false);
          if (response && response.razorpay_payment_id) {
            setPaymentMethod('Razorpay');
            try {
              await fetch('/api/razorpay/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  orderId: orderRef
                })
              });
            } catch (vErr) {
              console.warn('Razorpay verification notice:', vErr);
            }
            processOrder(response.razorpay_payment_id, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });
          }
        },
        prefill: {
          name: address.fullName || '',
          email: customerEmail || '',
          contact: address.phone || ''
        },
        notes: {
          orderId: orderRef,
          customerAddress: `${address.addressLine}, ${address.city}, ${address.pincode}`
        },
        theme: {
          color: '#e51975'
        },
        modal: {
          ondismiss: function () {
            const elapsed = paymentSessionSeconds;
            setIsPaymentSessionActive(false);
            setIsRazorpayLoading(false);
            setPaymentFailureDetails(prev => {
              if (!prev) {
                const parsed = parseRazorpayError({
                  reason: 'user_cancelled',
                  description: 'You closed the payment popup window before confirming payment authorization.',
                  source: 'customer',
                  step: 'payment_authentication',
                  metadata: {
                    order_id: activeRzpOrderId || orderRef
                  }
                });
                logFailedPayment({
                  status: 'cancelled',
                  errorCode: 'USER_CANCELLED',
                  errorReason: parsed.reason,
                  errorDescription: parsed.description,
                  errorSource: 'customer',
                  errorStep: 'payment_authentication',
                  orderId: activeRzpOrderId || orderRef,
                  elapsedSeconds: elapsed,
                  actionAdvice: parsed.actionAdvice
                });
                return parsed;
              }
              return prev;
            });
          }
        }
      };

      if (activeRzpOrderId && isLiveOrder) {
        options.order_id = activeRzpOrderId;
      }

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        const elapsed = paymentSessionSeconds;
        setIsPaymentSessionActive(false);
        setIsRazorpayLoading(false);
        const errPayload = resp?.error || resp;
        const parsed = parseRazorpayError(errPayload);
        setPaymentFailureDetails(parsed);
        logFailedPayment({
          status: 'failed',
          errorCode: parsed.code,
          errorReason: parsed.reason,
          errorDescription: parsed.description,
          errorSource: parsed.source,
          errorStep: parsed.step,
          paymentId: parsed.paymentId,
          orderId: parsed.orderId || activeRzpOrderId || orderRef,
          actionAdvice: parsed.actionAdvice,
          elapsedSeconds: elapsed
        });
      });
      rzp.open();
    } catch (err: any) {
      const elapsed = paymentSessionSeconds;
      setIsPaymentSessionActive(false);
      setIsRazorpayLoading(false);
      console.warn('Razorpay popup launch notice:', err?.message || err);
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
  }, overrideMethod?: 'Razorpay' | 'PhonePe' | 'COD') => {
    if (step === 'processing' || step === 'success') return;
    setStep('processing');

    try {
      const effectivePaymentMethod = overrideMethod || paymentMethod;
      const isPrepaidOrder = effectivePaymentMethod !== 'COD';
      const effectivePrepaidDiscount = (isPrepaidOrder && subtotal > 0) ? 55 : 0;
      const effectiveRemaining = Math.max(0, subtotal - couponDiscount - effectivePrepaidDiscount);
      const effectiveFeatherDiscount = useMagicFeathers ? Math.min(availableFeathers * FEATHER_RUPEE_VALUE, effectiveRemaining) : 0;
      const effectiveFeathersUsed = useMagicFeathers ? Math.round(effectiveFeatherDiscount / FEATHER_RUPEE_VALUE) : 0;
      const payableSnapshot = Math.max(0, subtotal - couponDiscount - effectivePrepaidDiscount - effectiveFeatherDiscount + deliveryFee);

      setConfirmedAmount(payableSnapshot);
      setOrderedItemsSnapshot([...cartItems]);
      const currentOrderRef = orderRef;

      const orderPromise = onCompleteOrder({
        orderId: currentOrderRef,
        deliveryAddress: address,
        paymentMethod: effectivePaymentMethod,
        customerEmail,
        transactionId: txnId || (effectivePaymentMethod === 'Razorpay' ? rzpDetails?.razorpayPaymentId : 'TXN_' + Date.now()),
        phonepeTransactionId: txnId,
        razorpayOrderId: rzpDetails?.razorpayOrderId,
        razorpayPaymentId: rzpDetails?.razorpayPaymentId,
        razorpaySignature: rzpDetails?.razorpaySignature,
        feathersUsed: effectiveFeathersUsed > 0 ? effectiveFeathersUsed : undefined,
        feathersDiscount: effectiveFeatherDiscount > 0 ? effectiveFeatherDiscount : undefined,
        referralCodeUsed: referralCodeInput ? referralCodeInput.trim().toUpperCase() : undefined
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
    } catch (err: any) {
      console.warn('Order processing notice:', err?.message || err);
      setStep('checkout');
      showAlert(err.message || 'Could not place order due to an inventory verification error.', 'error', 'Order Verification Failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-pink-200 overflow-hidden relative max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-950 via-purple-950 to-pink-900 text-amber-100 p-4 flex items-center justify-between border-b border-amber-300/30 shrink-0">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-300" />
              <h3 className="font-extrabold text-base text-amber-200 flex items-center gap-2">
                <span>Feat Secure Checkout</span>
              </h3>
            </div>
            <p className="text-[10px] text-amber-100/70">
              Feather Hut Fashion • GSTIN: 19APAPC3078H1Z1 • 256-Bit SSL Encrypted
            </p>
          </div>
          {step !== 'processing' && (
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-amber-200 transition-colors" aria-label="Close modal">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">

          {/* MAIN CHECKOUT SCREEN (Order review, Address, Price, Pay) */}
          {step === 'checkout' && (
            <div className="space-y-4">
              
              {/* 1. ORDER ITEMS REVIEW SECTION */}
              <div className="border border-pink-200 rounded-2xl p-3.5 bg-pink-50/20 space-y-3">
                <div className="flex items-center justify-between border-b border-pink-100 pb-2">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-pink-700" />
                    <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
                      Review Items in Your Purchase ({cartItems.reduce((acc, i) => acc + i.quantity, 0)} Units)
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold text-gray-500">
                    {cartItems.length} {cartItems.length === 1 ? 'Product' : 'Products'}
                  </span>
                </div>

                {cartItems.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <p className="text-sm font-bold text-gray-700">Your shopping bag is empty!</p>
                    <p className="text-xs text-gray-500">All items have been removed. Add products to continue.</p>
                    <button
                      onClick={onClose}
                      className="mt-2 bg-amber-400 text-pink-950 font-bold px-4 py-2 rounded-xl text-xs hover:bg-amber-300 transition-all shadow"
                    >
                      Return to Shop
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {cartItems.map((item) => (
                      <div
                        key={`${item.product.id}-${item.selectedSize}-${item.selectedColor || ''}`}
                        className="bg-white border border-pink-100 rounded-xl p-2.5 flex items-center gap-3 shadow-2xs hover:border-pink-300 transition-all"
                      >
                        {/* Image */}
                        <img
                          src={getItemImage(item)}
                          alt={item.product.name}
                          className="w-14 h-16 object-cover rounded-lg shrink-0 border border-pink-100"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const fb = getCategoryFallbackImage(item.product?.category, item.product?.collection, item.product?.name);
                            if ((e.currentTarget as HTMLImageElement).src !== fb && !(e.currentTarget as HTMLImageElement).src.endsWith(fb)) {
                              (e.currentTarget as HTMLImageElement).src = fb;
                            }
                          }}
                        />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="text-xs font-bold text-gray-900 truncate">{item.product.name}</h5>
                            {onRemoveItem && (
                              <button
                                type="button"
                                onClick={() => onRemoveItem(item.product.id, item.selectedSize, item.selectedColor)}
                                className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors shrink-0 cursor-pointer"
                                title="Remove item from order"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-gray-500 mt-0.5">
                            {(() => {
                              const avail = (item.selectedSize && item.product.sizeStock && item.product.sizeStock[item.selectedSize] !== undefined)
                                ? Number(item.product.sizeStock[item.selectedSize])
                                : Number(item.product.stockCount || 0);
                              return (
                                <span className="bg-pink-50 text-pink-900 font-bold px-1.5 py-0.5 rounded border border-pink-200">
                                  Size: {item.selectedSize} <strong className="font-extrabold text-pink-950">{avail > 0 ? `(${avail} ${avail === 1 ? 'pc' : 'pcs'} in stock)` : '(Out of stock)'}</strong>
                                </span>
                              );
                            })()}
                            {item.selectedColor && item.selectedColor !== 'Default' && item.selectedColor !== 'Original' && ((item.product.colorVariants && item.product.colorVariants.length > 1) || (item.product.colors && item.product.colors.length > 1)) && (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 font-bold px-1.5 py-0.2 rounded border border-amber-200">
                                <span
                                  className="w-2 h-2 rounded-full border border-gray-300 shadow-inner"
                                  style={{ backgroundColor: getColorHex(item.selectedColor) }}
                                />
                                <span>{item.selectedColor}</span>
                              </span>
                            )}
                            <span>• {item.product.category}</span>
                          </div>

                          {/* Price & Quantity Stepper */}
                          <div className="flex items-center justify-between mt-1.5">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xs font-extrabold text-gray-900">
                                ₹{(((item.product?.price ?? 0) * (item.quantity || 1))).toLocaleString('en-IN')}
                              </span>
                              {item.quantity > 1 && (
                                <span className="text-[10px] font-bold text-pink-700 bg-pink-50 px-1.5 py-0.5 rounded border border-pink-200">
                                  {item.quantity} pieces
                                </span>
                              )}
                            </div>

                            {/* Stepper */}
                            {onUpdateQuantity && (() => {
                              const avail = (item.selectedSize && item.product.sizeStock && item.product.sizeStock[item.selectedSize] !== undefined)
                                ? Number(item.product.sizeStock[item.selectedSize])
                                : Number(item.product.stockCount || 0);
                              const isMax = item.quantity >= avail;

                              return (
                                <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                                  <button
                                    type="button"
                                    onClick={() => onUpdateQuantity(item.product.id, item.selectedSize, -1, item.selectedColor)}
                                    className="p-1 hover:bg-gray-200 text-gray-600 rounded-l-lg transition-colors cursor-pointer"
                                    title="Decrease quantity"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="px-2 text-xs font-bold text-gray-800">{item.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => onUpdateQuantity(item.product.id, item.selectedSize, 1, item.selectedColor)}
                                    className={`p-1 text-gray-600 rounded-r-lg transition-colors cursor-pointer ${
                                      isMax ? 'opacity-40 hover:bg-transparent text-gray-400' : 'hover:bg-gray-200'
                                    }`}
                                    title={isMax ? `Only ${avail} unit(s) available in stock` : 'Increase quantity'}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. DELIVERY & CONTACT ADDRESS SECTION */}
              <div className="border border-gray-200 rounded-2xl p-3.5 bg-gray-50/50 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#e51975] text-white flex items-center justify-center text-[10px] font-black">
                      📍
                    </span>
                    <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
                      Delivery &amp; Contact Details
                    </h4>
                  </div>

                  {!isEditingAddress && isAddressComplete(address, customerEmail) && (
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(true)}
                      className="text-xs font-bold text-pink-700 hover:text-pink-900 underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Change Address</span>
                    </button>
                  )}
                </div>

                {/* Multiple Saved Addresses Switcher (if user has saved addresses) */}
                {savedAddressesList && savedAddressesList.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                      <BookmarkCheck className="w-3 h-3 text-pink-700" />
                      <span>Saved Addresses:</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {savedAddressesList.map((sAddr, idx) => {
                        const isSelected = !isEditingAddress && address.pincode === sAddr.pincode && address.addressLine === sAddr.addressLine;
                        return (
                          <button
                            key={sAddr.id || idx}
                            type="button"
                            onClick={() => handleSelectSavedAddress(sAddr)}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all text-left flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-pink-950 text-amber-200 border-pink-950 shadow-xs'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-pink-300 hover:bg-pink-50/50'
                            }`}
                          >
                            <span className="truncate max-w-[140px]">{sAddr.fullName} ({sAddr.pincode})</span>
                            {isSelected && <span className="text-[9px] bg-amber-400/20 text-amber-200 px-1 rounded">Active</span>}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => {
                          setAddress({
                            fullName: currentUser?.displayName || '',
                            phone: currentUser?.phoneNumber || '',
                            pincode: '',
                            addressLine: '',
                            city: '',
                            state: 'West Bengal',
                            type: 'Home'
                          });
                          setIsEditingAddress(true);
                        }}
                        className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-dashed border-gray-300 text-gray-600 hover:text-pink-700 hover:border-pink-400 bg-white flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>Add New Address</span>
                      </button>
                    </div>
                  </div>
                )}

                {!isEditingAddress && isAddressComplete(address, customerEmail) ? (
                  /* Saved Address Summary Card */
                  <div className="bg-white border border-emerald-200 rounded-xl p-3 text-xs space-y-1 shadow-2xs">
                    <div className="flex justify-between items-start">
                      <p className="font-extrabold text-gray-900 text-sm">{address.fullName}</p>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                        Active Delivery Location
                      </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                      {address.addressLine}, {address.city}, {address.state} - <span className="font-bold">{address.pincode}</span>
                    </p>
                    <div className="flex items-center gap-3 text-gray-500 pt-1 text-[11px]">
                      <span>📞 {address.phone}</span>
                      <span>•</span>
                      <span>✉️ {customerEmail}</span>
                    </div>
                  </div>
                ) : (
                  /* Address Input Form */
                  <form onSubmit={handleSaveAddress} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-gray-500">Please provide your complete delivery location:</p>
                      <button
                        type="button"
                        disabled={isLocating}
                        onClick={handleFetchModalLiveLocation}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2.5 py-1 rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <Navigation className={`w-3.5 h-3.5 text-emerald-700 ${isLocating ? 'animate-spin' : ''}`} />
                        <span>{isLocating ? 'Locating...' : '📍 Auto-detect GPS'}</span>
                      </button>
                    </div>

                    {locationError && (
                      <div className="p-2.5 bg-rose-50 text-rose-900 border border-rose-200 rounded-xl text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <p className="text-[11px]">{locationError}</p>
                      </div>
                    )}

                    {locationSuccessMsg && (
                      <div className="p-2 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-[11px]">{locationSuccessMsg}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <label className="block font-bold text-gray-700 mb-0.5">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={address.fullName}
                          onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                          placeholder="Recipient's Name"
                          className="w-full px-3 py-1.5 border rounded-xl bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-0.5">10-Digit Mobile *</label>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          value={address.phone}
                          onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                          placeholder="9876543210"
                          className="w-full px-3 py-1.5 border rounded-xl bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-0.5">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full px-3 py-1.5 border rounded-xl bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="block font-bold text-gray-700">6-Digit Pincode *</label>
                          {isLookingUpPin && (
                            <span className="text-[10px] text-pink-700 font-bold flex items-center gap-1">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                              <span>Detecting...</span>
                            </span>
                          )}
                          {!isLookingUpPin && pinLookupStatus && (
                            <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" />
                              <span>Auto-filled</span>
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="postal-code"
                          required
                          maxLength={6}
                          value={address.pincode}
                          onChange={(e) => handlePincodeChange(e.target.value)}
                          placeholder="e.g. 712147"
                          className="w-full px-3 py-1.5 border rounded-xl bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs font-mono"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-gray-700 mb-0.5">House / Flat No., Street, Landmark *</label>
                        <input
                          type="text"
                          required
                          value={address.addressLine}
                          onChange={(e) => setAddress({ ...address, addressLine: e.target.value })}
                          placeholder="Near Main Market, Station Road"
                          className="w-full px-3 py-1.5 border rounded-xl bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="block font-bold text-gray-700">City *</label>
                          {pinLookupStatus?.city && (
                            <span className="text-[9px] text-gray-400 font-medium truncate max-w-[80px]">From PIN</span>
                          )}
                        </div>
                        <input
                          type="text"
                          required
                          value={address.city}
                          onChange={(e) => setAddress({ ...address, city: e.target.value })}
                          placeholder="City"
                          className="w-full px-3 py-1.5 border rounded-xl bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="block font-bold text-gray-700">State *</label>
                          {pinLookupStatus?.state && (
                            <span className="text-[9px] text-gray-400 font-medium truncate max-w-[80px]">From PIN</span>
                          )}
                        </div>
                        <input
                          type="text"
                          required
                          value={address.state}
                          onChange={(e) => setAddress({ ...address, state: e.target.value })}
                          placeholder="State"
                          className="w-full px-3 py-1.5 border rounded-xl bg-white focus:ring-2 focus:ring-pink-600 outline-none text-xs"
                        />
                      </div>
                    </div>

                    <div className="pt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-gray-200/80">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 font-medium">
                        <input
                          type="checkbox"
                          checked={saveAddressForFuture}
                          onChange={(e) => setSaveAddressForFuture(e.target.checked)}
                          className="accent-[#e51975] rounded cursor-pointer"
                        />
                        <span>Save this address to my profile for future orders</span>
                      </label>

                      <button
                        type="submit"
                        className="bg-pink-950 hover:bg-pink-900 text-amber-200 font-bold px-4 py-1.5 rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        Save &amp; Use Address
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* SHIPROCKET ESTIMATED DELIVERY GUARANTEE CARD */}
              {deliveryEstimate && (
                <div className="p-3 bg-gradient-to-r from-pink-50 via-amber-50 to-emerald-50 rounded-2xl border border-pink-200 shadow-2xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-pink-950 text-amber-200 flex items-center justify-center shrink-0 shadow-xs">
                      <Truck className="w-4 h-4 text-amber-300" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-pink-950 uppercase tracking-wider">
                          Shiprocket Estimated Delivery
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {deliveryEstimate.estimatedDays}
                        </span>
                      </div>
                      <p className="text-xs font-black text-gray-900">
                        Guaranteed by <span className="text-pink-900 font-extrabold">{deliveryEstimate.estimatedDeliveryDate}</span>
                      </p>
                      <p className="text-[10px] text-gray-500 font-medium">
                        Via {deliveryEstimate.courierName} • {deliveryEstimate.dispatchTime}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-black text-emerald-700 block">
                      {deliveryFee === 0 ? 'FREE Express' : '₹99 Delivery'}
                    </span>
                    <span className="text-[9px] text-gray-500 font-medium">
                      {deliveryEstimate.isCodAvailable ? 'COD Eligible' : 'Prepaid Only'}
                    </span>
                  </div>
                </div>
              )}

              {/* 2.5 MAGIC FEATHERS & REFERRAL REWARDS SECTION */}
              <div className="border border-amber-200/90 rounded-2xl p-3.5 bg-gradient-to-br from-amber-50/60 via-pink-50/30 to-amber-50/40 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-xs">
                      <MagicFeatherSvg className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                        <span>Magic Feathers Rewards</span>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          1 Feather = ₹0.50
                        </span>
                      </h4>
                      <p className="text-[10px] text-gray-600">
                        Extra discount on top of promo codes • Up to 5% (0.1%–5.0% dynamic) friend reward unlocked in 12 days
                      </p>
                    </div>
                  </div>
                </div>

                {availableFeathers > 0 ? (
                  <div className="bg-white/95 p-3 rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        id="use-magic-feathers-check"
                        checked={useMagicFeathers}
                        onChange={(e) => setUseMagicFeathers(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                      />
                      <label htmlFor="use-magic-feathers-check" className="text-xs font-bold text-gray-800 cursor-pointer select-none">
                        Use Magic Feathers: <span className="font-extrabold text-amber-900">{availableFeathers} Feathers</span>
                        <span className="text-[11px] text-emerald-700 font-extrabold ml-1.5">
                          (-₹{(availableFeathers * FEATHER_RUPEE_VALUE).toFixed(2)})
                        </span>
                      </label>
                    </div>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${useMagicFeathers ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-gray-100 text-gray-600'}`}>
                      {useMagicFeathers ? 'Applied ✓' : 'Ready'}
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-600 bg-white/70 p-2.5 rounded-xl border border-amber-100 flex items-center justify-between">
                    <span>Your Magic Feathers: <strong className="text-gray-900 font-bold">0 Feathers</strong></span>
                    <span className="text-[10px] text-amber-900 font-bold">Earn up to 5% on friend purchases</span>
                  </div>
                )}

                {/* Friend's Referral Code */}
                <div className="pt-2 border-t border-amber-200/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">
                      Friend's Referral Code (Optional):
                    </label>
                    {referralCodeApplied && (
                      <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Linked ✓
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={referralCodeInput}
                      onChange={(e) => {
                        setReferralCodeInput(e.target.value.toUpperCase());
                        setReferralCodeApplied(false);
                        setReferralCodeMsg(null);
                      }}
                      placeholder="e.g. FEATPRIYA, ROHIT99"
                      className="flex-1 text-xs font-mono font-bold tracking-wider uppercase px-2.5 py-1.5 rounded-lg border border-amber-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    {referralCodeInput.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          const clean = referralCodeInput.trim().toUpperCase();
                          if (clean) {
                            savePendingReferralCode(clean);
                            setReferralCodeApplied(true);
                            setReferralCodeMsg(`Code "${clean}" linked! Friend earns up to 5% (0.1%–5%) in Magic Feathers after 12 days.`);
                          }
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors"
                      >
                        {referralCodeApplied ? 'Linked' : 'Apply'}
                      </button>
                    )}
                  </div>
                  {referralCodeMsg && (
                    <p className="text-[10px] text-emerald-700 font-medium">
                      ✓ {referralCodeMsg}
                    </p>
                  )}
                </div>
              </div>

              {/* 3. ORDER BILL & COUPON SUMMARY */}
              <div className="border border-pink-200 rounded-2xl p-3.5 bg-gradient-to-br from-pink-50/40 to-amber-50/30 space-y-2 text-xs">
                <div className="flex justify-between items-center text-gray-600">
                  <span>Total MRP</span>
                  <span>₹{(totalMrp ?? 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-700 font-bold">
                  <span>Product Discount</span>
                  <span>-₹{(totalDiscount ?? 0).toLocaleString('en-IN')}</span>
                </div>

                {appliedPromo && (
                  <div className="flex justify-between items-center text-emerald-800 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                    <span className="flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" /> Coupon '{appliedPromo.code}'
                    </span>
                    <div className="flex items-center gap-2">
                      <span>-₹{appliedPromo.discount}</span>
                      {onRemovePromo && (
                        <button
                          type="button"
                          onClick={onRemovePromo}
                          className="text-[10px] text-red-600 underline font-bold"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {prepaidDiscount > 0 && (
                  <div className="flex justify-between items-center text-emerald-800 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-emerald-600" /> Prepaid Order Discount
                    </span>
                    <span>-₹{prepaidDiscount}</span>
                  </div>
                )}

                {feathersDiscount > 0 && (
                  <div className="flex justify-between items-center text-amber-900 font-bold bg-amber-50/90 p-2 rounded-lg border border-amber-200">
                    <span className="flex items-center gap-1.5">
                      <MagicFeatherSvg className="w-4 h-4 text-amber-600 inline-block" />
                      <span>Magic Feathers ({feathersUsed} used @ ₹0.50)</span>
                    </span>
                    <span>-₹{feathersDiscount.toFixed(2)}</span>
                  </div>
                )}

                {/* Available Store Coupons Chips */}
                {!appliedPromo && onApplyPromo && (
                  <div className="space-y-1 pt-1">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Tap to Apply Coupon:</p>
                    <div className="flex flex-wrap gap-1">
                      {[
                        ...(subtotal > 2000 
                          ? [{ code: 'FEAT2.0', label: 'FEAT2.0 (₹200 OFF)' }] 
                          : subtotal > 1300 
                          ? [{ code: 'FEAT6', label: 'FEAT6 (₹24 OFF)' }] 
                          : []),
                        { code: 'Welcome76', label: 'Welcome76 (₹76 OFF)' }
                      ].map(item => (
                        <button
                          key={item.code}
                          type="button"
                          disabled={isApplyingPromo}
                          onClick={async () => {
                            setIsApplyingPromo(true);
                            setPromoError(null);
                            const res = await onApplyPromo(item.code);
                            setIsApplyingPromo(false);
                            if (!res.valid) setPromoError(res.message || 'Coupon not applicable');
                          }}
                          className="bg-pink-50 hover:bg-pink-100 text-pink-900 border border-pink-200 px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {promoError && (
                  <p className="text-[10px] text-rose-600 font-medium">{promoError}</p>
                )}

                <div className="flex justify-between items-center text-gray-600">
                  <span>Shipping &amp; Express Handling</span>
                  <span>
                    {deliveryFee === 0 ? (
                      <span className="text-emerald-700 font-bold uppercase">FREE</span>
                    ) : (
                      `₹${deliveryFee}`
                    )}
                  </span>
                </div>

                <div className="border-t border-pink-200 pt-2 flex justify-between items-center text-base font-black text-pink-950 font-serif">
                  <span>Total Payable</span>
                  <div className="text-right">
                    <span>₹{(finalPayable ?? 0).toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-gray-500 font-sans block font-normal">
                      Incl. 5% GST &amp; Free Insurance
                    </span>
                  </div>
                </div>
              </div>

              {/* 3.4 ACTIVE PAYMENT PROGRESS INDICATOR & 30S DELAY ALERT */}
              {isPaymentSessionActive && (
                <div className={`border-2 rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-md ${
                  paymentSessionSeconds >= 30 
                    ? 'border-amber-400 bg-amber-50/95 ring-2 ring-amber-300/60' 
                    : 'border-pink-300 bg-gradient-to-br from-pink-50/90 to-purple-50/90'
                }`}>
                  {/* Header & Live Timer Badge */}
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
                            : `Elapsed: ${paymentSessionSeconds}s of 30s standard authorization window`}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCancelPendingPaymentSession('User cancelled pending session from progress widget.')}
                      className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-200/50 transition-colors"
                      title="Cancel payment session"
                      aria-label="Cancel active payment session"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Visual Animated Progress Bar */}
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

                  {/* Delayed Notification & Recovery Controls (Triggered when >= 30s) */}
                  {paymentSessionSeconds >= 30 ? (
                    <div className="space-y-2.5 pt-1">
                      <div className="bg-white/90 border border-amber-300 rounded-xl p-2.5 text-xs text-amber-950 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Why is this taking longer?</span>
                        </div>
                        <p className="text-[11px] text-gray-700 leading-relaxed pl-5">
                          Your transaction has been pending for <strong>{paymentSessionSeconds} seconds</strong>. This usually happens when the bank gateway experiences latency, or if your UPI app (Google Pay, PhonePe, Paytm) requires a moment to approve the notification.
                        </p>
                        <p className="text-[11px] text-emerald-800 font-medium pl-5 pt-0.5">
                          ✓ <em>If money has not been deducted from your account, you can safely retry or switch to COD without being double-charged.</em>
                        </p>
                      </div>

                      {/* Action Controls for Delayed Session */}
                      <div className="flex flex-col sm:flex-row items-center gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={handleManualRetryPayment}
                          className="w-full sm:flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Manually Retry Payment</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelPendingPaymentSession(`User cancelled session after ${paymentSessionSeconds}s gateway timeout.`)}
                          className="w-full sm:w-auto px-3 py-2 bg-white hover:bg-gray-100 border border-amber-300 text-amber-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5 text-amber-700" />
                          <span>Cancel Pending Session</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5 px-1">
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3 text-pink-600" /> 256-Bit SSL Encrypted Session
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCancelPendingPaymentSession('User cancelled in-flight payment session.')}
                        className="text-gray-500 hover:text-rose-700 underline cursor-pointer"
                      >
                        Cancel session
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 3.5 DETAILED PAYMENT FAILURE / REASON CARD */}
              {paymentFailureDetails && (
                <div className="border-2 border-rose-300 bg-rose-50/90 rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
                  <div className="flex items-start justify-between gap-2 border-b border-rose-200/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-rose-100 text-rose-700 rounded-xl">
                        <XCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-extrabold text-rose-950">
                            {paymentFailureDetails.title || 'Payment Incomplete / Declined'}
                          </h4>
                          {paymentFailureDetails.code && (
                            <span className="text-[10px] uppercase font-mono font-bold bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded-md">
                              {paymentFailureDetails.code}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-rose-700/80 font-medium">
                          Captured at {paymentFailureDetails.timestamp}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaymentFailureDetails(null)}
                      className="text-rose-500 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-200/50 transition-colors"
                      title="Dismiss error"
                      aria-label="Dismiss payment error notification"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* Specific Reason */}
                    <div className="bg-white/80 border border-rose-200 rounded-xl p-2.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Why this happened:</span>
                      </div>
                      <p className="text-gray-800 leading-relaxed text-[11px] pl-5">
                        {paymentFailureDetails.reason || paymentFailureDetails.description}
                      </p>
                    </div>

                    {/* Actionable Advice / Recovery Guidance */}
                    {paymentFailureDetails.actionAdvice && (
                      <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-2.5 space-y-1">
                        <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                          <HelpCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>Suggested Next Step:</span>
                        </div>
                        <p className="text-amber-900/90 leading-relaxed text-[11px] pl-5">
                          {paymentFailureDetails.actionAdvice}
                        </p>
                      </div>
                    )}

                    {/* Metadata References */}
                    {(paymentFailureDetails.paymentId || paymentFailureDetails.orderId) && (
                      <div className="flex items-center gap-3 text-[10px] text-gray-500 font-mono pt-0.5">
                        {paymentFailureDetails.paymentId && (
                          <span>Payment ID: <strong className="text-gray-700">{paymentFailureDetails.paymentId}</strong></span>
                        )}
                        {paymentFailureDetails.orderId && (
                          <span>Order Ref: <strong className="text-gray-700">{paymentFailureDetails.orderId}</strong></span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Action Recovery Buttons */}
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenRazorpayModal}
                      disabled={isRazorpayLoading}
                      className="flex-1 bg-rose-900 hover:bg-rose-950 text-amber-200 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRazorpayLoading ? 'animate-spin' : ''}`} />
                      <span>Retry Payment (Razorpay)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentFailureDetails(null);
                        setPaymentMethod('COD');
                        processOrder('COD_' + Date.now(), undefined, 'COD');
                      }}
                      className="px-3 py-2 bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Banknote className="w-3.5 h-3.5 text-gray-600" />
                      <span>Switch to COD</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 4. PAYMENT ACTIONS (Razorpay & COD) */}
              <div className="space-y-2.5 pt-1">
                {/* Razorpay Gateway Direct Button */}
                <button
                  type="button"
                  onClick={handleOpenRazorpayModal}
                  disabled={isRazorpayLoading || cartItems.length === 0}
                  className="w-full bg-gradient-to-r from-[#e51975] via-pink-700 to-purple-800 hover:from-pink-700 hover:to-purple-900 disabled:opacity-60 text-white font-black py-3.5 rounded-2xl text-sm shadow-xl transition-all flex items-center justify-center gap-2 border border-pink-400 active:scale-95 cursor-pointer"
                >
                  {isRazorpayLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-amber-300 shrink-0" />
                  )}
                  <span>
                    {isRazorpayLoading
                      ? 'Opening Razorpay Gateway...'
                      : `Proceed to Pay ₹${(finalPayable ?? 0).toLocaleString('en-IN')} (Razorpay)`}
                  </span>
                </button>

                {/* Cash on Delivery Alternative */}
                <div className="border border-gray-200 bg-gray-50/80 rounded-xl p-2.5 flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-700 font-semibold">Prefer Cash on Delivery?</span>
                    </div>
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
                          showAlert('Please fill in your delivery and contact details first.', 'warning', 'Address Required');
                          return;
                        }
                        setPaymentMethod('COD');
                        processOrder('COD_' + Date.now(), undefined, 'COD');
                      }}
                      className="font-bold text-gray-900 underline hover:text-pink-700 cursor-pointer disabled:opacity-40"
                    >
                      Place COD Order →
                    </button>
                  </div>
                  <p className="text-[10px] text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                    ⚠️ Note: COD orders do not receive the flat ₹55 prepaid discount. Pay online to save ₹55 instantly!
                  </p>
                </div>

                {/* Policy Agreement */}
                <div className="p-2 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 text-pink-700 rounded focus:ring-pink-600"
                    />
                    <span className="text-gray-700 text-[11px] leading-snug">
                      I agree to the <a href="/terms" target="_blank" className="text-pink-700 underline font-bold">Terms &amp; Conditions</a>, <a href="/privacy-policy" target="_blank" className="text-pink-700 underline font-bold">Privacy Policy</a>, and <a href="/return-and-cancellation" target="_blank" className="text-pink-700 underline font-bold">2-Day Return / 7-Day Refund Policy</a>.
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-center gap-3 text-[10px] text-gray-500 pt-1">
                  <span>🔒 256-Bit SSL Encrypted</span>
                  <span>•</span>
                  <span>🛡️ 100% Buyer Protection</span>
                  <span>•</span>
                  <span>📦 2-Day Return Window</span>
                </div>
              </div>

            </div>
          )}

          {/* STEP: PROCESSING */}
          {step === 'processing' && (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 border-4 border-pink-200 border-t-[#e51975] rounded-full animate-spin mx-auto" />
              <h4 className="font-extrabold text-gray-900 text-lg">Finalizing Order &amp; Securing Inventory...</h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Verifying bank payment settlement and generating your official GST Tax Invoice. Please do not close or refresh.
              </p>
            </div>
          )}

          {/* STEP: SUCCESS & TAX INVOICE */}
          {step === 'success' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full uppercase">
                  Payment &amp; Order Confirmed!
                </span>
                <h3 className="text-xl font-black text-gray-900 mt-2 font-serif">
                  Order ID: {confirmedOrderId}
                </h3>
                <p className="text-xs text-gray-600 mt-1 max-w-sm mx-auto">
                  Tax invoice &amp; real-time delivery tracking link sent to <strong>{customerEmail}</strong>.
                </p>
              </div>

              {/* Tax Invoice Breakdown Box */}
              <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-100 max-w-md mx-auto text-left text-xs space-y-2">
                <div className="border-b border-purple-200/80 pb-2 flex justify-between items-start">
                  <div>
                    <p className="font-black text-purple-950">Feather Hut Fashion</p>
                    <p className="text-[10px] text-gray-600">GSTIN: 19APAPC3078H1Z1</p>
                    <p className="text-[10px] text-gray-600">Reg. Office: Khanyan, Hoogly, WB-712147</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 bg-[#e51975] text-white text-[10px] rounded font-bold">
                      PAID VIA {paymentMethod}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-gray-700">
                  <p className="font-bold text-purple-950">Delivery Address:</p>
                  <p>{address.fullName}, {address.addressLine}, {address.city}, {address.state} - {address.pincode}</p>
                  <p className="text-[11px] text-gray-500">Contact: {address.phone}</p>
                </div>

                <div className="border-t border-purple-200/80 pt-2 flex justify-between font-black text-purple-950">
                  <span>Amount Paid (Incl. 5% GST):</span>
                  <span>₹{((confirmedAmount > 0 ? confirmedAmount : finalPayable) ?? 0).toLocaleString('en-IN')}</span>
                </div>

                <div className="pt-1 text-[10px] text-gray-500 flex items-center justify-between">
                  <span>SLA: 2-Day Return Window</span>
                  <span>Helpline: 7869579735</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
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
                  className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#e51975]" />
                  <span>Download Tax Invoice (GST)</span>
                </button>
                <button
                  onClick={onClose}
                  className="bg-amber-400 hover:bg-amber-300 text-pink-950 font-black px-6 py-2.5 rounded-xl text-xs shadow-md transition-all hover:scale-105 cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          )}

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
