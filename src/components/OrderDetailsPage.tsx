import React, { useState } from 'react';
import { 
  ArrowLeft, FileText, Download, Ban, CheckCircle2, AlertTriangle, 
  Truck, Package, ExternalLink, ArrowRight, ShieldCheck, MapPin, 
  Phone, Mail, Copy, Check, Clock, HelpCircle, RefreshCw, AlertCircle
} from 'lucide-react';
import { Order, Product, DeliveryAddress } from '../types';
import { downloadTaxInvoice } from '../utils/invoiceGenerator';
import { ShiprocketTracker } from './ShiprocketTracker';
import { getStoredCustomerSession } from '../services/authService';

interface OrderDetailsPageProps {
  order: Order | null;
  orders?: Order[];
  onSelectOrder?: (order: Order) => void;
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
  onCancelOrder?: (orderId: string, reason: string) => Promise<boolean | { success: boolean; order?: Order }>;
  onUpdateOrderAddress?: (orderId: string, address: DeliveryAddress) => Promise<boolean>;
  onNavigateHome: () => void;
  onNavigatePolicy?: (path: string) => void;
}

export const OrderDetailsPage: React.FC<OrderDetailsPageProps> = ({
  order,
  orders = [],
  onSelectOrder,
  onBack,
  onSelectProduct,
  onCancelOrder,
  onUpdateOrderAddress,
  onNavigateHome,
  onNavigatePolicy
}) => {
  const [currentOrder, setCurrentOrder] = useState<Order | null>(order);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Found better price elsewhere');
  const [customCancelReason, setCustomCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  // Sync state if prop changes
  React.useEffect(() => {
    if (order) {
      setCurrentOrder(order);
    }
  }, [order]);

  const activeOrder = currentOrder;

  if (!activeOrder) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-stone-50">
        <div className="max-w-md w-full text-center bg-white p-8 rounded-3xl border border-pink-100 shadow-sm space-y-4">
          <div className="w-16 h-16 bg-pink-50 text-pink-700 rounded-2xl flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-pink-950 font-serif">Order Not Found</h2>
          <p className="text-xs text-gray-500">
            We couldn't locate this order in your account, or you do not have permission to view it. You can only view orders placed with your authenticated account.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-pink-900 hover:bg-pink-950 text-amber-200 text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              Back to My Orders
            </button>
            <button
              onClick={onNavigateHome}
              className="px-4 py-2 bg-pink-50 hover:bg-pink-100 text-pink-900 border border-pink-200 text-xs font-bold rounded-xl transition-colors"
            >
              Explore Collection
            </button>
          </div>
        </div>
      </div>
    );
  }

  const canCancel = activeOrder.orderStatus === 'Ordered' || activeOrder.orderStatus === 'Packed';
  const isDispatched = ['Shipped', 'Out for Delivery', 'Delivered'].includes(activeOrder.orderStatus);
  const isCancelled = activeOrder.orderStatus === 'Cancelled';

  const handleCopyOrderId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(activeOrder.id);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  const handleConfirmCancel = async () => {
    const finalReason = cancelReason === 'Other' ? (customCancelReason || 'Customer requested cancellation') : cancelReason;
    setIsSubmittingCancel(true);
    try {
      let updatedOrder: Order | undefined;
      if (onCancelOrder) {
        const res = await onCancelOrder(activeOrder.id, finalReason);
        if (typeof res === 'object' && res && res.order) {
          updatedOrder = res.order;
        }
      } else {
        const customer = getStoredCustomerSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (customer?.token) {
          headers['x-auth-token'] = customer.token;
        }
        const res = await fetch(`/api/orders/${activeOrder.id}/cancel`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ reason: finalReason })
        });
        const data = await res.json();
        if (res.ok && data.order) {
          updatedOrder = data.order;
        } else {
          throw new Error(data.error || 'Failed to cancel order');
        }
      }

      const isCod = activeOrder.paymentMethod === 'COD';
      const fallbackOrder: Order = {
        ...activeOrder,
        orderStatus: 'Cancelled',
        cancellationReason: finalReason,
        cancelledAt: new Date().toISOString(),
        paymentStatus: isCod ? 'Void' : 'Refund Initiated',
        refundAmount: isCod ? 0 : activeOrder.finalAmount,
        refundStatus: isCod ? undefined : 'Initiated',
        refundEstimatedDays: isCod ? undefined : '5-7 business days',
        refundId: isCod ? undefined : (activeOrder.refundId || 'RFND_' + Date.now().toString(36).toUpperCase())
      };

      const finalState = updatedOrder || fallbackOrder;
      setCurrentOrder(finalState);
      setCancelModalOpen(false);

      if (isCod) {
        setCancelFeedback(`Order #${activeOrder.id} has been cancelled successfully. Shiprocket courier dispatch revoked. Since this was Cash on Delivery, no payment was collected.`);
      } else {
        setCancelFeedback(`Order #${activeOrder.id} cancelled successfully. Automated refund of ₹${(activeOrder.finalAmount ?? 0).toLocaleString('en-IN')} initiated to your original payment method (${activeOrder.paymentMethod}).`);
      }
    } catch (err: any) {
      alert(err.message || 'Unable to cancel order right now. Please connect with our support team.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50/70 pb-16">
      {/* Top Header / Breadcrumb Bar */}
      <div className="bg-white border-b border-pink-100 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-pink-900 transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 text-pink-700 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to My Orders</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500 font-medium hidden sm:inline">Order Placed: {activeOrder.date}</span>
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
              activeOrder.orderStatus === 'Delivered'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : activeOrder.orderStatus === 'Cancelled'
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : activeOrder.orderStatus === 'Shipped' || activeOrder.orderStatus === 'Out for Delivery'
                ? 'bg-blue-100 text-blue-900 border-blue-300'
                : 'bg-amber-100 text-amber-900 border-amber-300'
            }`}>
              ● {activeOrder.orderStatus}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Feedback Alert if Cancelled recently */}
        {cancelFeedback && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-2xl text-xs flex items-center gap-2 font-medium animate-fade-in shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{cancelFeedback}</span>
          </div>
        )}

        {/* REFUND & MONEY-BACK CARD (Visible whenever order is cancelled) */}
        {isCancelled && (
          <div className={`rounded-3xl p-5 sm:p-6 border shadow-sm space-y-4 ${
            activeOrder.paymentMethod === 'COD'
              ? 'bg-amber-50/70 border-amber-200'
              : 'bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-cyan-50/40 border-emerald-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5 border-black/5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  activeOrder.paymentMethod === 'COD'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  {activeOrder.paymentMethod === 'COD' ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    <ShieldCheck className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-gray-900 flex items-center gap-2">
                    <span>
                      {activeOrder.paymentMethod === 'COD'
                        ? 'Cash on Delivery Order Cancelled'
                        : '100% Money-Back Refund Initiated'}
                    </span>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                      activeOrder.paymentStatus === 'Refund Completed'
                        ? 'bg-emerald-200 text-emerald-900 border-emerald-400'
                        : activeOrder.paymentMethod === 'COD'
                        ? 'bg-stone-200 text-stone-800 border-stone-300'
                        : 'bg-blue-100 text-blue-900 border-blue-300'
                    }`}>
                      {activeOrder.paymentStatus}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {activeOrder.paymentMethod === 'COD'
                      ? 'No upfront payment was collected. Your balance is ₹0 and no refund is required.'
                      : `Full refund has been triggered back to your source ${activeOrder.paymentMethod} account.`}
                  </p>
                </div>
              </div>

              {activeOrder.paymentMethod !== 'COD' && (
                <div className="text-left sm:text-right bg-white px-4 py-2 rounded-2xl border border-emerald-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Refund Amount</span>
                  <span className="text-lg font-black text-emerald-800 font-serif">
                    ₹{(activeOrder.refundAmount || activeOrder.finalAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>

            {/* Refund Information Grid for Prepaid orders */}
            {activeOrder.paymentMethod !== 'COD' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white/80 backdrop-blur-xs p-3 rounded-2xl border border-emerald-100 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Refund Reference ID</span>
                  <span className="font-mono font-bold text-gray-900 block text-xs">
                    {activeOrder.refundId || `RFND_${activeOrder.id}`}
                  </span>
                </div>

                <div className="bg-white/80 backdrop-blur-xs p-3 rounded-2xl border border-emerald-100 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Credit Destination</span>
                  <span className="font-bold text-gray-900 flex items-center gap-1">
                    <span>Original Source: {activeOrder.paymentMethod}</span>
                  </span>
                </div>

                <div className="bg-white/80 backdrop-blur-xs p-3 rounded-2xl border border-emerald-100 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Bank Settlement Window</span>
                  <span className="font-bold text-emerald-800 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{activeOrder.refundEstimatedDays || '5–7 business days'}</span>
                  </span>
                </div>
              </div>
            )}

            <div className="text-[11px] text-gray-600 bg-white/60 p-3 rounded-xl border border-emerald-100 leading-relaxed flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <strong>Need help with your refund?</strong> Our concierge support is available 24x7. Most UPI (Google Pay, PhonePe, Paytm) transactions reflect within 24–48 hours, while credit/debit card refunds are credited in 5–7 banking days according to RBI merchant standards.
              </div>
            </div>
          </div>
        )}

        {/* Real-Time Shiprocket Courier Tracking Section */}
        <div className="bg-white rounded-3xl border border-pink-100 shadow-sm p-4 sm:p-6 overflow-hidden">
          <ShiprocketTracker
            order={activeOrder}
            onOrderUpdated={(updated) => setCurrentOrder(updated)}
          />
        </div>

        {/* Main 2-Column Grid: Payment & Invoice Details + Delivery Address */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left / Main Column (2 cols): Ordered Items & Invoice Summary */}
          <div className="lg:col-span-2 space-y-6">

            {/* Payment & Invoice Details Header Box */}
            <div className="bg-gradient-to-br from-pink-50/90 via-white to-amber-50/40 rounded-3xl p-5 sm:p-6 border border-pink-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-pink-200/80 pb-4 gap-3">
                <div>
                  <h3 className="font-extrabold text-base text-pink-950 font-serif flex items-center gap-2">
                    <FileText className="w-4 h-4 text-pink-700" />
                    <span>Payment & Invoice Details</span>
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs font-mono font-bold text-gray-800 bg-white px-2 py-0.5 rounded-md border border-pink-200">
                      Order #{activeOrder.id}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyOrderId}
                      className="text-[10px] text-pink-700 hover:text-pink-950 flex items-center gap-1 font-semibold"
                      title="Copy Order ID"
                    >
                      {copiedOrderId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedOrderId ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="inline-block bg-white px-3.5 py-1.5 rounded-xl border border-pink-200 shadow-2xs">
                    <span className="text-[11px] text-gray-500 block font-medium">Grand Total</span>
                    <span className="text-base font-black text-gray-900 font-serif">
                      Total: ₹{(activeOrder.finalAmount ?? 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Method Details */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 font-medium">Payment Mode:</span>
                  <span className="font-bold text-pink-950 bg-pink-100/80 px-2 py-0.5 rounded-lg border border-pink-200">
                    {activeOrder.paymentMethod} ({activeOrder.paymentStatus})
                  </span>
                  {activeOrder.paymentMethod === 'PhonePe' && (
                    <span className="bg-[#5f259f] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                      PhonePe PG Verified
                    </span>
                  )}
                  {activeOrder.paymentMethod === 'Razorpay' && (
                    <span className="bg-[#0c2340] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                      Razorpay Verified
                    </span>
                  )}
                </div>

                {(activeOrder.phonepeTransactionId || activeOrder.transactionId || activeOrder.razorpayPaymentId) && (
                  <span className="font-mono text-[10px] text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200">
                    Ref: {activeOrder.phonepeTransactionId || activeOrder.razorpayPaymentId || activeOrder.transactionId}
                  </span>
                )}
              </div>
            </div>

            {/* Ordered Items List */}
            <div className="bg-white rounded-3xl border border-pink-100 shadow-sm p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-pink-100 pb-3">
                <div>
                  <h4 className="font-extrabold text-sm text-pink-950 font-serif">
                    Ordered Items ({activeOrder.items.length})
                  </h4>
                  <p className="text-[11px] text-pink-700 font-semibold mt-0.5">
                    Click item to view product page
                  </p>
                </div>
                <span className="text-[11px] text-gray-400 font-medium">
                  {activeOrder.items.reduce((sum, it) => sum + it.quantity, 0)} Total Unit(s)
                </span>
              </div>

              <div className="space-y-3">
                {activeOrder.items.map((item, index) => {
                  const sku = item.product.sku || (item.product as any).skucode || item.product.id;
                  return (
                    <div
                      key={index}
                      onClick={() => onSelectProduct(item.product)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-pink-100 bg-stone-50/40 hover:bg-pink-50/40 hover:border-pink-300 hover:shadow-md transition-all cursor-pointer group"
                      title="Click item to view product page"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="relative w-16 h-20 rounded-xl overflow-hidden border border-pink-200 bg-white shrink-0 shadow-2xs">
                          <img
                            src={item.product.images?.[0] || '/images/placeholder.jpg'}
                            alt={item.product.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-pink-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ExternalLink className="w-4 h-4 text-white drop-shadow-sm" />
                          </div>
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-xs sm:text-sm text-gray-900 group-hover:text-pink-900 group-hover:underline transition-colors line-clamp-1">
                              {item.product.name}
                            </h5>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-pink-700 bg-pink-100/70 hover:bg-pink-200 px-2 py-0.5 rounded-md border border-pink-200 flex items-center gap-1">
                              <span>View Item</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 pt-0.5">
                            <span className="font-mono bg-white text-gray-700 px-1.5 py-0.2 rounded border border-gray-200">
                              SKU: {sku}
                            </span>
                            <span className="font-bold text-gray-700 bg-white px-1.5 py-0.2 rounded border border-gray-200">
                              Size: {item.selectedSize || 'Free Size'}
                            </span>
                            {item.selectedColor && item.selectedColor !== 'Default' && item.selectedColor !== 'Original' && ((item.product?.colorVariants && item.product.colorVariants.length > 1) || (item.product?.colors && item.product.colors.length > 1)) && (
                              <span className="font-bold text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                Color: {item.selectedColor}
                              </span>
                            )}
                            <span className="font-bold text-gray-800">
                              • Qty: {item.quantity}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-pink-100 flex sm:flex-col items-center sm:items-end justify-between shrink-0">
                        <span className="text-sm font-black text-gray-900 font-serif">
                          ₹{(((item.product?.price ?? 0) * (item.quantity || 1))).toLocaleString('en-IN')}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-pink-700 group-hover:underline mt-1">
                          <span>Details</span>
                          <ArrowRight className="w-3 h-3 text-pink-600 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Price Breakdown Calculation */}
              <div className="mt-4 pt-4 border-t border-pink-100 space-y-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Items MRP Total</span>
                  <span className="font-semibold">₹{(activeOrder.totalMrp || activeOrder.finalAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                {(activeOrder.discountAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Catalog Product Discount</span>
                    <span>-₹{(activeOrder.discountAmount ?? 0).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {(activeOrder.couponDiscount ?? 0) > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Promo Code ({activeOrder.promoCodeUsed || 'Applied'})</span>
                    <span>-₹{(activeOrder.couponDiscount ?? 0).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Express Shipping & Insurance</span>
                  <span className="text-emerald-700 font-bold">FREE</span>
                </div>
                <div className="flex justify-between border-t border-pink-100 pt-2 text-sm font-black text-pink-950 font-serif">
                  <span>Grand Total Paid</span>
                  <span>₹{(activeOrder.finalAmount ?? 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions: Download Tax Invoice & Cancel Order */}
            <div className="bg-white rounded-3xl border border-pink-100 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => downloadTaxInvoice(activeOrder)}
                className="w-full sm:w-auto bg-pink-900 hover:bg-pink-950 text-amber-200 px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-amber-300" />
                <span>Download Tax Invoice</span>
                <Download className="w-3.5 h-3.5 text-amber-200" />
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => setCancelModalOpen(true)}
                    className="w-full sm:w-auto bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Ban className="w-4 h-4 text-rose-600" />
                    <span>Cancel this order</span>
                  </button>
                )}

                {isCancelled && (
                  <span className="text-xs text-rose-700 font-bold bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 flex items-center gap-1.5">
                    <Ban className="w-3.5 h-3.5 text-rose-600" />
                    <span>Cancelled ({activeOrder.cancellationReason || 'By customer'})</span>
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* Right Column (1 col): Delivery Address & Customer Support */}
          <div className="space-y-6">

            {/* Delivery Address Card */}
            <div className="bg-white rounded-3xl border border-pink-100 shadow-sm p-5 space-y-3">
              <h4 className="font-extrabold text-sm text-pink-950 font-serif flex items-center gap-2 border-b border-pink-100 pb-2.5">
                <MapPin className="w-4 h-4 text-pink-700" />
                <span>Delivery Address</span>
              </h4>

              {activeOrder.deliveryAddress ? (
                <div className="text-xs text-gray-700 space-y-1 leading-relaxed">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-gray-900">{activeOrder.deliveryAddress.fullName}</p>
                    <span className="text-[10px] font-bold text-pink-800 bg-pink-50 px-2 py-0.5 rounded border border-pink-200">
                      {activeOrder.deliveryAddress.type || 'Home'}
                    </span>
                  </div>
                  <p>{activeOrder.deliveryAddress.addressLine}</p>
                  {activeOrder.deliveryAddress.landmark && (
                    <p className="text-gray-500 text-[11px]">Landmark: {activeOrder.deliveryAddress.landmark}</p>
                  )}
                  <p className="font-semibold text-gray-900">
                    {activeOrder.deliveryAddress.city}, {activeOrder.deliveryAddress.state} - {activeOrder.deliveryAddress.pincode}
                  </p>
                  <div className="pt-2 flex items-center gap-2 text-gray-600 text-[11px]">
                    <Phone className="w-3.5 h-3.5 text-pink-700" />
                    <span>+91 {activeOrder.deliveryAddress.phone}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No delivery address recorded.</p>
              )}
            </div>

            {/* Return Policy & Courier Dispatch Notice */}
            {isDispatched && (
              <div className="bg-amber-50/90 border border-amber-200 p-4 rounded-3xl text-xs space-y-2 text-amber-950">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Order in Transit ({activeOrder.shiprocketCourierName || 'Shiprocket Courier'})</span>
                </div>
                <p className="text-[11px] text-amber-900/90 leading-relaxed">
                  This parcel has already been dispatched with our logistics partner. As per Feat policy, parcel cannot be recalled once handed over to the courier. You can easily initiate a 2-day doorstep exchange or return once delivered.
                </p>
                {onNavigatePolicy && (
                  <button
                    onClick={() => onNavigatePolicy('/return-and-cancellation')}
                    className="text-[11px] font-bold text-pink-900 hover:underline inline-block mt-1"
                  >
                    View Return &amp; Cancellation Policy ➔
                  </button>
                )}
              </div>
            )}

            {/* Need Help / Customer Support Box */}
            <div className="bg-gradient-to-br from-pink-900 to-[#4a0420] text-white rounded-3xl p-5 shadow-sm space-y-3">
              <h5 className="font-extrabold text-sm text-amber-200 font-serif flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-300" />
                <span>Need Assistance?</span>
              </h5>
              <p className="text-[11px] text-pink-100 leading-relaxed">
                Have questions regarding delivery schedule, size exchange, or payment receipt for Order #{activeOrder.id}?
              </p>
              <div className="space-y-2 pt-1 text-xs">
                <a
                  href="https://wa.me/917869579735?text=Hello%20Feat%20Team%2C%20I%20need%20help%20with%20Order%20%23"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-2.5 rounded-xl transition-colors"
                >
                  <span>💬 WhatsApp Care (+91 7869579735)</span>
                </a>
                <a
                  href="mailto:support@featherhutfashion.com"
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-pink-100 font-semibold p-2 rounded-xl transition-colors text-[11px]"
                >
                  <Mail className="w-3.5 h-3.5 text-amber-200" />
                  <span>support@featherhutfashion.com</span>
                </a>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Cancel Order Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-pink-200 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-rose-800">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
                <Ban className="w-5 h-5 text-rose-700" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-gray-900 font-serif">
                  Cancel Order #{activeOrder.id}
                </h3>
                <p className="text-xs text-gray-500">
                  Please select your reason for cancellation
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {[
                'Found better price elsewhere',
                'Ordered incorrect size / color',
                'Delivery time is too long',
                'Change of mind / No longer needed',
                'Payment deduction issue',
                'Other'
              ].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    cancelReason === reason
                      ? 'border-pink-600 bg-pink-50 font-bold text-pink-950'
                      : 'border-gray-200 hover:bg-stone-50 text-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancelReason"
                    value={reason}
                    checked={cancelReason === reason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="text-pink-600 focus:ring-pink-500"
                  />
                  <span>{reason}</span>
                </label>
              ))}

              {cancelReason === 'Other' && (
                <textarea
                  rows={2}
                  value={customCancelReason}
                  onChange={(e) => setCustomCancelReason(e.target.value)}
                  placeholder="Please specify why you wish to cancel..."
                  className="w-full p-2.5 border rounded-xl text-xs focus:ring-2 focus:ring-pink-500"
                />
              )}
            </div>

            {activeOrder.paymentMethod === 'COD' ? (
              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-[11px] text-amber-950 leading-relaxed space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-900">
                  <span>⚠️ Cash on Delivery (COD) Order Notice</span>
                </p>
                <p>
                  Since this order was placed with Cash on Delivery, no money was charged upfront. Cancelling will recall the Shiprocket courier pickup with <strong>₹0 due</strong> and no refund required.
                </p>
              </div>
            ) : (
              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-[11px] text-emerald-950 leading-relaxed space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>100% Money-Back Automated Refund</span>
                </p>
                <p>
                  Cancelling will immediately recall the Shiprocket courier dispatch and initiate an automated 100% full refund of <strong>₹{(activeOrder.finalAmount ?? 0).toLocaleString('en-IN')}</strong> directly to your original payment method ({activeOrder.paymentMethod}). Most UPI & bank transfers credit within 5-7 business days.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                disabled={isSubmittingCancel}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isSubmittingCancel}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl shadow-xs transition-colors flex items-center gap-1"
              >
                {isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
