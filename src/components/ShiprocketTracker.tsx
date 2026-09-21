import React, { useState, useEffect } from 'react';
import { 
  Truck, CheckCircle2, Clock, MapPin, ExternalLink, RefreshCw, 
  Copy, Check, AlertTriangle, Ban, Package, ArrowRight, ShieldCheck,
  ChevronDown, ChevronUp, Navigation, PhoneCall, FastForward
} from 'lucide-react';
import { Order, ShiprocketTrackingData, ShiprocketScanActivity } from '../types';

interface ShiprocketTrackerProps {
  order: Order;
  onOrderUpdated?: (updatedOrder: Order) => void;
  canChangeAddress?: boolean;
  onChangeAddressClick?: () => void;
}

export const ShiprocketTracker: React.FC<ShiprocketTrackerProps> = ({
  order,
  onOrderUpdated,
  canChangeAddress,
  onChangeAddressClick
}) => {
  const [trackingData, setTrackingData] = useState<ShiprocketTrackingData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);
  const [copiedAwb, setCopiedAwb] = useState<boolean>(false);
  const [showDetailedScans, setShowDetailedScans] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  const awbCode = order.shiprocketAwbCode || `SR-BD-${order.id.slice(-6)}`;
  const courierName = order.shiprocketCourierName || 'BlueDart Express (Shiprocket)';
  const trackingUrl = order.shiprocketTrackingUrl || `https://shiprocket.co/tracking/${awbCode}`;
  const isCancelled = order.orderStatus === 'Cancelled';
  const isDelivered = order.orderStatus === 'Delivered';
  const isDispatched = ['Shipped', 'Out for Delivery', 'Delivered'].includes(order.orderStatus);

  // Fetch real-time tracking data from Shiprocket API
  const fetchTracking = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorNotice(null);

    try {
      const response = await fetch(`/api/shiprocket/track/order/${encodeURIComponent(order.id)}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setTrackingData(result.data);
          if (result.order && onOrderUpdated) {
            onOrderUpdated(result.order);
          }
        }
      } else {
        console.warn('Could not fetch tracking from Shiprocket API, using order history');
      }
    } catch (err) {
      console.warn('Network error querying Shiprocket tracking:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial fetch and auto-refresh when order ID changes
  useEffect(() => {
    fetchTracking(true);
  }, [order.id, order.orderStatus]);

  // Copy AWB code with feedback
  const handleCopyAwb = () => {
    if (!awbCode) return;
    navigator.clipboard.writeText(awbCode);
    setCopiedAwb(true);
    setTimeout(() => setCopiedAwb(false), 2000);
  };

  // Interactive courier milestone advance (Simulation & Testing)
  const handleAdvanceStep = async (targetStatus?: 'Ordered' | 'Packed' | 'Shipped' | 'Out for Delivery' | 'Delivered') => {
    setIsAdvancing(true);
    setActionSuccessNotice(null);
    setErrorNotice(null);

    try {
      const response = await fetch(`/api/shiprocket/advance-step/${encodeURIComponent(order.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setActionSuccessNotice(result.message || 'Milestone updated successfully');
        if (result.tracking) {
          setTrackingData(result.tracking);
        }
        if (result.order && onOrderUpdated) {
          onOrderUpdated(result.order);
        }
        setTimeout(() => setActionSuccessNotice(null), 3500);
      } else {
        setErrorNotice(result.error || 'Failed to update milestone');
      }
    } catch (err) {
      setErrorNotice('Network error updating milestone');
    } finally {
      setIsAdvancing(false);
    }
  };

  // Derive stage milestones
  const stages = [
    {
      id: 'Ordered',
      label: 'Order Confirmed',
      sublabel: 'Manifest & AWB Registered',
      description: `Order verified. Invoiced with Shiprocket.`,
      icon: Package
    },
    {
      id: 'Packed',
      label: 'Packed & Ready',
      sublabel: 'Khanyan Warehouse (712147)',
      description: `Tamper-proof package ready for courier bay handover.`,
      icon: ShieldCheck
    },
    {
      id: 'Shipped',
      label: 'In Transit',
      sublabel: `${courierName}`,
      description: `Air Cargo Freight & Regional Hub sorting.`,
      icon: Truck
    },
    {
      id: 'Out for Delivery',
      label: 'Out for Delivery',
      sublabel: `${order.deliveryAddress?.city || 'Local'} Hub`,
      description: `Courier rider out for doorstep handover.`,
      icon: Navigation
    },
    {
      id: 'Delivered',
      label: 'Delivered',
      sublabel: 'Verified Handover',
      description: `Successfully delivered to ${order.deliveryAddress?.fullName || 'recipient'}.`,
      icon: CheckCircle2
    }
  ];

  const currentStageIndex = isCancelled ? -1 : (
    order.orderStatus === 'Delivered' ? 4 :
    order.orderStatus === 'Out for Delivery' ? 3 :
    order.orderStatus === 'Shipped' ? 2 :
    order.orderStatus === 'Packed' ? 1 : 0
  );

  const trackItem = trackingData?.shipment_track?.[0];
  const scanActivities: ShiprocketScanActivity[] = trackingData?.shipment_track_activities || [];
  const edd = trackItem?.edd || 'In 2-3 Business Days';
  const origin = trackItem?.origin || 'Khanyan Central Warehouse, Hooghly, West Bengal (712147)';
  const destination = trackItem?.destination || `${order.deliveryAddress?.city || 'Hooghly'}, ${order.deliveryAddress?.state || 'West Bengal'} (${order.deliveryAddress?.pincode || '712147'})`;

  return (
    <div className="bg-white rounded-2xl border border-pink-200/90 shadow-sm overflow-hidden space-y-4">
      {/* Top Header Bar */}
      <div className="bg-gradient-to-r from-pink-950 via-purple-950 to-pink-900 text-white p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                SHIPROCKET LIVE TRACKING
              </span>
              <span className="text-[11px] text-pink-200/80 font-mono">
                Order #{order.id}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-pink-400" />
              <span>{courierName}</span>
            </h3>
          </div>

          {/* Real-time Refresh Action */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchTracking(false)}
              disabled={isRefreshing || isLoading}
              className="bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Refresh live status from Shiprocket API"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-pink-300' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Live Refresh'}</span>
            </button>
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
            >
              <span>Courier Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Quick Meta Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
          {/* AWB Code */}
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-pink-200/70 font-semibold uppercase block">AWB Tracking No.</span>
              <span className="font-mono font-black text-amber-300 tracking-wider text-xs sm:text-sm">
                {awbCode}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyAwb}
              className="p-1.5 hover:bg-white/10 rounded-lg text-pink-200 hover:text-white transition-colors cursor-pointer"
              title="Copy AWB Code"
            >
              {copiedAwb ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Estimated Delivery Date */}
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-pink-200/70 font-semibold uppercase block">Estimated Delivery</span>
            <span className="font-extrabold text-white text-xs sm:text-sm flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-pink-400" />
              <span>{edd}</span>
            </span>
          </div>

          {/* Current Status */}
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-pink-200/70 font-semibold uppercase block">Live Courier Status</span>
            <span className={`font-black text-xs sm:text-sm ${
              isDelivered ? 'text-emerald-300' :
              isCancelled ? 'text-rose-300' :
              'text-pink-300'
            }`}>
              ● {order.orderStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-5 space-y-5">
        
        {/* Transit Route Pill */}
        <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-pink-700 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-gray-500 uppercase block">Logistics Route</span>
              <p className="font-semibold text-gray-800 truncate">
                <span className="text-pink-900 font-bold">Khanyan Warehouse (712147)</span> ➔ <span className="text-purple-900 font-bold">{order.deliveryAddress?.city || 'Destination Hub'}</span> ({order.deliveryAddress?.pincode})
              </p>
            </div>
          </div>
          {trackingData?.last_updated && (
            <span className="text-[10px] text-gray-500 bg-white px-2 py-1 rounded-md border self-start sm:self-auto shrink-0 font-medium">
              Last synced: {trackingData.last_updated}
            </span>
          )}
        </div>

        {/* Step-by-Step Progress Tracker Bar (Visual Horizontal Stepper) */}
        {!isCancelled && (
          <div className="bg-gradient-to-br from-pink-50/60 to-purple-50/40 rounded-2xl p-4 sm:p-5 border border-pink-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-black text-xs sm:text-sm text-pink-950 uppercase tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-700" />
                <span>Real-Time Shipment Progress</span>
              </h4>
              <span className="text-[10px] font-extrabold text-pink-800 bg-pink-100 px-2.5 py-0.5 rounded-full border border-pink-300">
                Stage {currentStageIndex + 1} of {stages.length}
              </span>
            </div>

            {/* Stepper Grid */}
            <div className="relative">
              {/* Horizontal Connecting Line */}
              <div className="hidden md:block absolute top-5 left-8 right-8 h-1 bg-gray-200 -z-0">
                <div 
                  className="h-full bg-gradient-to-r from-pink-600 via-purple-600 to-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${(currentStageIndex / (stages.length - 1)) * 100}%` }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-2">
                {stages.map((stage, idx) => {
                  const isCompleted = idx <= currentStageIndex;
                  const isCurrent = idx === currentStageIndex;
                  const StageIcon = stage.icon;

                  return (
                    <div 
                      key={stage.id} 
                      className={`relative flex md:flex-col items-center md:text-center gap-3 md:gap-2 p-2.5 md:p-2 rounded-xl transition-all ${
                        isCurrent 
                          ? 'bg-white shadow-md border-2 border-pink-500 ring-4 ring-pink-100/80 z-10' 
                          : isCompleted 
                          ? 'bg-white/80 border border-emerald-200' 
                          : 'bg-stone-50/60 border border-stone-200/70 opacity-70'
                      }`}
                    >
                      {/* Icon Circle */}
                      <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all z-10 ${
                        isCurrent
                          ? 'bg-gradient-to-tr from-pink-600 to-purple-600 text-white shadow-lg ring-2 ring-pink-300 animate-pulse'
                          : isCompleted
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-gray-200 text-gray-400 border border-gray-300'
                      }`}>
                        {isCompleted && !isCurrent ? (
                          <Check className="w-5 h-5 stroke-[2.5]" />
                        ) : (
                          <StageIcon className="w-4 h-4 md:w-5 md:h-5" />
                        )}
                      </div>

                      {/* Text */}
                      <div className="min-w-0 md:w-full">
                        <div className="flex items-center md:justify-center gap-1">
                          <p className={`font-black text-xs ${
                            isCurrent ? 'text-pink-950 font-extrabold' : isCompleted ? 'text-gray-900' : 'text-gray-400'
                          }`}>
                            {stage.label}
                          </p>
                        </div>
                        <p className={`text-[10px] truncate ${isCurrent ? 'text-pink-700 font-bold' : 'text-gray-500'}`}>
                          {stage.sublabel}
                        </p>
                      </div>

                      {/* Current Active Indicator Pill */}
                      {isCurrent && (
                        <div className="hidden md:block absolute -top-2.5 left-1/2 -translate-x-1/2 bg-pink-700 text-white text-[9px] font-black uppercase px-2 py-0.2 rounded-full tracking-wider shadow-xs">
                          Active
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* If Order is Cancelled */}
        {isCancelled && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-xs space-y-2 text-rose-950">
            <div className="flex items-center gap-2 font-bold text-rose-900">
              <Ban className="w-4 h-4 text-rose-700" />
              <span>Shipment Cancelled & Courier Pickup Revoked</span>
            </div>
            <p className="text-[11px] text-rose-900/80">
              {order.cancellationReason || 'Cancelled at customer request'}. Courier pickup has been cancelled with Shiprocket.
              Refund of <strong>₹{(order.finalAmount ?? 0).toLocaleString('en-IN')}</strong> has been processed to your {order.paymentMethod} account.
            </p>
          </div>
        )}

        {/* Detailed Courier Scan Activity Accordion */}
        <div className="border border-pink-100 rounded-xl overflow-hidden bg-white shadow-2xs">
          <button
            type="button"
            onClick={() => setShowDetailedScans(!showDetailedScans)}
            className="w-full p-3.5 bg-stone-50/80 hover:bg-pink-50/50 flex items-center justify-between text-xs font-bold text-gray-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-pink-700" />
              <span>Shiprocket Courier Activity Log ({scanActivities.length} Checkpoint Scans)</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-pink-800">
              <span>{showDetailedScans ? 'Collapse Scans' : 'View Detailed Timeline'}</span>
              {showDetailedScans ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showDetailedScans && (
            <div className="p-4 bg-white border-t border-pink-100 space-y-3">
              {scanActivities.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-2">
                  No scan activities recorded yet. Status will update in real-time as courier scans parcel.
                </p>
              ) : (
                <div className="space-y-3 relative pl-2">
                  {/* Vertical Track Line */}
                  <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-pink-100 -z-0" />

                  {scanActivities.map((activity, aIdx) => (
                    <div key={aIdx} className="flex items-start gap-3 relative z-10">
                      {/* Checkpoint Dot */}
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        aIdx === scanActivities.length - 1 
                          ? 'bg-pink-600 text-white ring-4 ring-pink-100' 
                          : 'bg-emerald-500 text-white'
                      }`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>

                      {/* Checkpoint Info */}
                      <div className="bg-stone-50/90 rounded-xl p-3 border border-stone-200/80 flex-1 text-xs space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <p className="font-extrabold text-gray-900">{activity.status}</p>
                          <span className="text-[10px] font-mono text-gray-500 bg-white px-2 py-0.5 rounded border self-start sm:self-auto">
                            {activity.date}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-700">{activity.activity}</p>
                        <div className="flex items-center gap-1 text-[10px] text-pink-800 font-semibold pt-0.5">
                          <MapPin className="w-3 h-3 text-pink-600 shrink-0" />
                          <span>{activity.location}</span>
                          {activity['sr-status'] && (
                            <span className="ml-2 font-mono text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded border border-purple-200">
                              {activity['sr-status']}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feedback alerts */}
        {actionSuccessNotice && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-3 py-2 rounded-xl text-xs flex items-center gap-2 animate-fade-in font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessNotice}</span>
          </div>
        )}

        {errorNotice && (
          <div className="bg-rose-50 border border-rose-300 text-rose-900 px-3 py-2 rounded-xl text-xs flex items-center gap-2 animate-fade-in font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* Destination Address Card with Modification Option */}
        <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-pink-700" />
              <span className="font-extrabold text-gray-900">Delivery Address</span>
            </div>
            {canChangeAddress && onChangeAddressClick && (
              <button
                type="button"
                onClick={onChangeAddressClick}
                className="text-[11px] font-bold text-pink-700 hover:text-pink-900 bg-pink-50 hover:bg-pink-100 px-2.5 py-1 rounded-lg border border-pink-200 transition-colors shadow-2xs"
              >
                Change Destination
              </button>
            )}
            {isDispatched && (
              <span className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded border">
                🔒 Locked (In Transit)
              </span>
            )}
          </div>
          <div className="text-gray-700 bg-white p-2.5 rounded-lg border border-stone-200/80 space-y-0.5">
            <p className="font-bold text-gray-900">
              {order.deliveryAddress?.fullName} <span className="font-normal text-gray-500">• {order.deliveryAddress?.phone}</span>
            </p>
            <p className="text-[11px] text-gray-600">{order.deliveryAddress?.addressLine}</p>
            <p className="text-[11px] text-gray-500">
              {order.deliveryAddress?.city}, {order.deliveryAddress?.state} - <strong>{order.deliveryAddress?.pincode}</strong>
              {order.deliveryAddress?.landmark && ` (Landmark: ${order.deliveryAddress.landmark})`}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
