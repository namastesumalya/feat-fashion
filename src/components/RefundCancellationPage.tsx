import React from 'react';
import { 
  ArrowLeft, 
  FileText, 
  ShieldCheck, 
  RefreshCcw, 
  Truck, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  CreditCard,
  ShoppingBag,
  MessageCircle,
  HelpCircle
} from 'lucide-react';

interface PolicyPageProps {
  onBackToHome: () => void;
  onNavigatePolicy: (path: string) => void;
  onExploreCollection?: (collectionName: string) => void;
}

export const RefundCancellationPage: React.FC<PolicyPageProps> = ({
  onBackToHome,
  onNavigatePolicy,
  onExploreCollection
}) => {
  return (
    <div className="min-h-screen bg-[#fdfbf7] text-gray-900 flex flex-col animate-in fade-in duration-300">
      
      {/* Top Breadcrumb Bar */}
      <div className="bg-white border-b border-pink-100/80 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-700 hover:text-[#e51975] transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-[#e51975]" />
            <span>Back to Home</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="hover:underline cursor-pointer" onClick={onBackToHome}>Home</span>
            <span>/</span>
            <span className="text-gray-500">Legal</span>
            <span>/</span>
            <span className="text-[#e51975] font-bold">Refund &amp; Cancellation</span>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-pink-950 via-[#4a0822] to-pink-900 text-white py-12 sm:py-16 px-4 sm:px-6">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-500/20 border border-pink-400/30 text-amber-200 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            <RefreshCcw className="w-3.5 h-3.5 text-amber-300" />
            <span>Hassle-Free Returns &amp; Prompt Refunds</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-serif tracking-tight text-white leading-tight">
            Refund, Return &amp; Cancellation
          </h1>

          <p className="text-sm sm:text-base text-pink-100/90 max-w-2xl mx-auto leading-relaxed">
            Feather Hut Fashion guarantees customer satisfaction with transparent return windows and swift refund processing.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs font-bold text-amber-200">
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">⏱ 2-Day Return Window</span>
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">💰 7-Day Refund Processing</span>
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">🔄 7-Day Replacement Delivery</span>
          </div>
        </div>
      </section>

      {/* Quick Policy Switcher Tabs */}
      <div className="bg-white border-b border-pink-100 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden text-xs sm:text-sm font-bold">
          <button
            onClick={() => onNavigatePolicy('/terms')}
            className="px-4 py-2 rounded-xl text-gray-600 hover:text-[#e51975] hover:bg-pink-50 transition-all flex items-center gap-2 shrink-0"
          >
            <FileText className="w-4 h-4" />
            <span>Terms &amp; Conditions</span>
          </button>

          <button
            onClick={() => onNavigatePolicy('/privacy-policy')}
            className="px-4 py-2 rounded-xl text-gray-600 hover:text-[#e51975] hover:bg-pink-50 transition-all flex items-center gap-2 shrink-0"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => onNavigatePolicy('/return-and-cancellation')}
            className="px-4 py-2 rounded-xl bg-pink-700 text-amber-200 shadow-xs flex items-center gap-2 shrink-0"
          >
            <RefreshCcw className="w-4 h-4" />
            <span>Refund &amp; Cancellation</span>
          </button>

          <button
            onClick={() => onNavigatePolicy('/shipping-and-delivery')}
            className="px-4 py-2 rounded-xl text-gray-600 hover:text-[#e51975] hover:bg-pink-50 transition-all flex items-center gap-2 shrink-0"
          >
            <Truck className="w-4 h-4" />
            <span>Shipping &amp; Delivery</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8 flex-1">
        
        {/* Core Timeline Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl p-6 border border-pink-100 shadow-sm space-y-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-pink-50 text-[#e51975] mx-auto flex items-center justify-center font-black text-xl font-serif">
              2
            </div>
            <h3 className="font-extrabold text-base text-gray-900 font-serif">Days Return Window</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Initiate a return or size exchange request within <strong>2 days</strong> (48 hours) of delivery.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-amber-100 shadow-sm space-y-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center font-black text-xl font-serif">
              7
            </div>
            <h3 className="font-extrabold text-base text-gray-900 font-serif">Days Refund Window</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Approved refunds are processed and credited back to original payment mode within <strong>7 business days</strong>.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center font-black text-xl font-serif">
              7
            </div>
            <h3 className="font-extrabold text-base text-gray-900 font-serif">Days Replacement</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Replacement ethnic wear items are dispatched and delivered to your doorstep within <strong>7 business days</strong>.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">

          {/* Section 1: Cancellation Policy */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-pink-100 text-[#e51975] font-black text-xs flex items-center justify-center">1</span>
              <h3 className="font-black text-base sm:text-lg text-gray-900 font-serif">Order Cancellation Guidelines</h3>
            </div>
            <p>
              We understand that plans can change. You can cancel your order before it has been dispatched from our central textile warehouse:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-600 pt-1">
              <li>
                <strong>Before Dispatch:</strong> You can cancel your order within 2 to 4 hours of placing it by contacting our helpline at <a href="tel:7869579735" className="text-[#e51975] font-bold hover:underline">7869579735</a> or emailing <a href="mailto:support@featherhutfashion.com" className="text-[#e51975] font-bold hover:underline">support@featherhutfashion.com</a> with your Order ID. A 100% instant refund will be initiated.
              </li>
              <li>
                <strong>After Dispatch:</strong> Once an order is assigned a courier tracking number (AWB) and handed over to logistics partners, it cannot be cancelled in transit. You may refuse delivery at your doorstep or initiate a standard return within the 2-day window upon arrival.
              </li>
            </ul>
          </div>

          {/* Section 2: Return Eligibility & Conditions */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-pink-100 text-[#e51975] font-black text-xs flex items-center justify-center">2</span>
              <h3 className="font-black text-base sm:text-lg text-gray-900 font-serif">Return Eligibility &amp; Condition Criteria</h3>
            </div>
            <p>
              To qualify for an authorized return or replacement, the garment must satisfy the following conditions:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-pink-50/50 border border-pink-100 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs text-gray-700">Item must be unworn, unwashed, and without any perfume, makeup stains, or odors.</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-pink-50/50 border border-pink-100 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs text-gray-700">All original brand tags, price tags, and poly packaging must be intact and attached.</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-pink-50/50 border border-pink-100 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs text-gray-700">Sarees and dress materials must not be cut, stitched, or tailored.</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-pink-50/50 border border-pink-100 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs text-gray-700">Requested strictly within 2 days of delivery confirmation.</span>
              </div>
            </div>
          </div>

          {/* Section 3: Refund Process */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-pink-100 text-[#e51975] font-black text-xs flex items-center justify-center">3</span>
              <h3 className="font-black text-base sm:text-lg text-gray-900 font-serif">Refund Settlement &amp; Payment Methods</h3>
            </div>
            <p>
              Once your returned garment reaches our central quality-inspection warehouse in Khanyan, Hooghly, West Bengal (712147) and is verified:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-600">
              <li>
                <strong>Prepaid Orders (UPI, Net Banking, Debit/Credit Card):</strong> The refund will be credited directly to the source account or card within <strong>7 business days</strong>.
              </li>
              <li>
                <strong>Cash on Delivery (COD) Orders:</strong> Our customer team will contact you via WhatsApp / Phone to collect your Bank Account details or UPI ID for a direct transfer within <strong>7 business days</strong>.
              </li>
              <li>
                <strong>Coupons &amp; Discounts:</strong> In case a promo code was applied to the entire cart, the proportionate discount will be adjusted from the refund total.
              </li>
            </ul>
          </div>

          {/* Section 4: Replacement & Size Exchange */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-pink-100 text-[#e51975] font-black text-xs flex items-center justify-center">4</span>
              <h3 className="font-black text-base sm:text-lg text-gray-900 font-serif">7-Day Replacement Policy</h3>
            </div>
            <p>
              If you received a defective, damaged piece, or need a different size (S, M, L, XL, XXL):
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-600">
              <li>Contact our team within 48 hours with photos of the issue and your Order ID.</li>
              <li>We will arrange a reverse pickup from your address.</li>
              <li>Your replacement item will be dispatched and delivered within <strong>7 business days</strong>.</li>
              <li>If the requested design or size is out of stock, a 100% full refund will be processed immediately.</li>
            </ul>
          </div>

          {/* Section 5: Non-Returnable Items */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-pink-100 text-[#e51975] font-black text-xs flex items-center justify-center">5</span>
              <h3 className="font-black text-base sm:text-lg text-gray-900 font-serif">Non-Returnable Items</h3>
            </div>
            <p className="text-xs text-gray-600">
              For hygiene reasons and textile integrity, the following cannot be returned or replaced:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600 text-xs">
              <li>Items purchased during flash clearance sales marked as &quot;Final Sale&quot;.</li>
              <li>Garments where tags have been detached, cut, or misplaced.</li>
              <li>Tailored or stitched customized orders.</li>
            </ul>
          </div>

        </div>

        {/* Dedicated Support Card */}
        <div className="bg-gradient-to-br from-pink-900 via-[#4a0822] to-pink-950 text-white rounded-3xl p-6 sm:p-10 shadow-lg border border-amber-300/30 space-y-6">
          <div>
            <span className="text-xs font-black text-amber-300 uppercase tracking-wider">Returns &amp; Exchanges Desk</span>
            <h3 className="text-2xl font-black font-serif mt-1 text-amber-100">Need Help Initiating a Return?</h3>
            <p className="text-xs sm:text-sm text-pink-100/80 mt-1 leading-relaxed">
              Our returns assistance desk is ready to help you coordinate reverse pickup and track your refund status.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <Phone className="w-4 h-4" />
                <span>Helpline &amp; WA</span>
              </div>
              <p className="text-sm font-black text-white">7869579735</p>
              <div className="flex items-center gap-2 pt-1">
                <a
                  href="tel:7869579735"
                  className="px-2.5 py-1 rounded-lg bg-[#e51975] text-white text-[11px] font-bold hover:bg-pink-600 transition-colors"
                >
                  Call
                </a>
                <a
                  href="https://wa.me/917869579735"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-500 transition-colors flex items-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>Chat</span>
                </a>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <Mail className="w-4 h-4" />
                <span>Returns Email</span>
              </div>
              <p className="text-xs font-bold text-white break-all">support@featherhutfashion.com</p>
              <p className="text-[10px] text-pink-200">Include Order ID &amp; parcel photos</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <MapPin className="w-4 h-4" />
                <span>Registered Office</span>
              </div>
              <p className="text-xs text-pink-100 leading-snug">Khanyan, Hoogly, West Bengal-712147, India</p>
            </div>
          </div>
        </div>

        {/* Back to Home / Explore CTA */}
        <div className="text-center pt-4">
          <button
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#e51975] hover:bg-pink-700 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all active:scale-98"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Continue Shopping on Feat</span>
          </button>
        </div>

      </main>

    </div>
  );
};
