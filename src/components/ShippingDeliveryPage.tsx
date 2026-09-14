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
  PackageCheck, 
  Clock, 
  Map, 
  CheckCircle2,
  ShoppingBag,
  MessageCircle,
  Zap,
  Globe
} from 'lucide-react';

interface PolicyPageProps {
  onBackToHome: () => void;
  onNavigatePolicy: (path: string) => void;
  onExploreCollection?: (collectionName: string) => void;
}

export const ShippingDeliveryPage: React.FC<PolicyPageProps> = ({
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
            <span className="text-[#e51975] font-bold">Shipping &amp; Delivery</span>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-pink-950 via-[#4a0822] to-pink-900 text-white py-12 sm:py-16 px-4 sm:px-6">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-500/20 border border-pink-400/30 text-amber-200 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            <Truck className="w-3.5 h-3.5 text-amber-300" />
            <span>Pan-India Safe Logistics &amp; Fast Dispatch</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-serif tracking-tight text-white leading-tight">
            Shipping &amp; Delivery Policy
          </h1>

          <p className="text-sm sm:text-base text-pink-100/90 max-w-2xl mx-auto leading-relaxed">
            Directly from our central warehouse in Khanyan, Hooghly, West Bengal (712147) to your doorstep across India with premier insured courier partners.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs font-bold text-amber-200">
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">⚡ 1–2 Days Dispatch</span>
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">📍 Live AWB Tracking</span>
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">🎁 100% Free Shipping On All Orders</span>
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
            className="px-4 py-2 rounded-xl text-gray-600 hover:text-[#e51975] hover:bg-pink-50 transition-all flex items-center gap-2 shrink-0"
          >
            <RefreshCcw className="w-4 h-4" />
            <span>Refund &amp; Cancellation</span>
          </button>

          <button
            onClick={() => onNavigatePolicy('/shipping-and-delivery')}
            className="px-4 py-2 rounded-xl bg-pink-700 text-amber-200 shadow-xs flex items-center gap-2 shrink-0"
          >
            <Truck className="w-4 h-4" />
            <span>Shipping &amp; Delivery</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8 flex-1">
        
        {/* Delivery Timelines Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl p-6 border border-pink-100 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-[#e51975] font-bold text-xs">
              <Zap className="w-4 h-4" />
              <span>Metro Cities</span>
            </div>
            <h3 className="font-extrabold text-2xl text-gray-900 font-serif">2 – 4 Days</h3>
            <p className="text-xs text-gray-600">
              Delhi NCR, Mumbai, Bengaluru, Hyderabad, Chennai, Kolkata, Ahmedabad, Pune.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-amber-100 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-xs">
              <Map className="w-4 h-4" />
              <span>Rest of India</span>
            </div>
            <h3 className="font-extrabold text-2xl text-gray-900 font-serif">4 – 7 Days</h3>
            <p className="text-xs text-gray-600">
              Tier-2 and Tier-3 cities, regional district towns, and central state locations.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-purple-700 font-bold text-xs">
              <Globe className="w-4 h-4" />
              <span>Special Zones</span>
            </div>
            <h3 className="font-extrabold text-2xl text-gray-900 font-serif">7 – 10 Days</h3>
            <p className="text-xs text-gray-600">
              Jammu &amp; Kashmir, North-East states, Ladakh, Andaman &amp; Nicobar, Lakshadweep.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">

          {/* Section 1: Processing Time */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-pink-100 text-[#e51975] font-black text-xs flex items-center justify-center">1</span>
              <h3 className="font-black text-base sm:text-lg text-gray-900 font-serif">Order Processing &amp; Warehouse Dispatch</h3>
            </div>
            <p>
              At Feather Hut Fashion (<a href="https://featherhutfashion.com/" target="_blank" rel="noopener noreferrer" className="text-[#e51975] font-semibold hover:underline">https://featherhutfashion.com/</a>), all incoming orders undergo a rigorous 3-point quality check (fabric inspect, zari weave check, and anti-crease packing) before dispatch:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-600 pt-1">
              <li>
                <strong>Processing Time:</strong> Orders are processed and packed within <strong>1 to 2 business days</strong> (excluding Sundays and national holidays).
              </li>
              <li>
                <strong>Same-Day Dispatch Cutoff:</strong> Orders placed before <strong>2:00 PM IST</strong> on working days are prioritized for same-day handover to express air-cargo couriers.
              </li>
              <li>
                <strong>Dispatch Notification:</strong> You will immediately receive an automated SMS and email containing your live tracking link and AWB number as soon as the courier scans your package.
              </li>
            </ul>
          </div>

          {/* Section 2: Shipping Charges */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-pink-100 text-[#e51975] font-black text-xs flex items-center justify-center">2</span>
              <h3 className="font-black text-base sm:text-lg text-gray-900 font-serif">Shipping Charges &amp; COD Handling</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                <p className="font-black text-emerald-900 text-xs uppercase tracking-wider">100% Free Delivery on All Products</p>
                <p className="text-xs text-gray-700 leading-relaxed">
                  Enjoy zero delivery charges across all pin codes in India with no minimum cart value. All products—even items under ₹1,000—ship completely free.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                <p className="font-black text-emerald-900 text-xs uppercase tracking-wider">Cash on Delivery (COD) - 100% Free</p>
                <p className="text-xs text-gray-700 leading-relaxed">
                  Available for eligible Indian postal codes with zero extra charges. Pay with cash or UPI QR directly to the courier executive upon doorstep delivery.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Order Tracking */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-pink-100 text-[#e51975] font-black text-xs flex items-center justify-center">3</span>
              <h3 className="font-black text-base sm:text-lg text-gray-900 font-serif">Real-Time Order Tracking</h3>
            </div>
            <p>
              We partner with India&apos;s leading logistics companies including <strong>Blue Dart, Delhivery, DTDC, ExpressBees, and India Post Speed Post</strong>.
            </p>
            <p className="text-xs text-gray-600 bg-gray-50 p-3.5 rounded-2xl border border-gray-200 leading-relaxed">
              You can check the live whereabouts of your package at any time via the direct tracking link provided in your Order Confirmation email or by sending your Order ID to our helpline at <a href="tel:7869579735" className="text-[#e51975] font-bold hover:underline">7869579735</a>.
            </p>
          </div>

          {/* Section 4: Delivery Attempts & Address Errors */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-pink-100 text-[#e51975] font-black text-xs flex items-center justify-center">4</span>
              <h3 className="font-black text-base sm:text-lg text-gray-900 font-serif">Delivery Attempts &amp; Failed Delivery Protocol</h3>
            </div>
            <ul className="list-disc pl-5 space-y-2 text-gray-600">
              <li>Our logistics partners make up to <strong>3 consecutive delivery attempts</strong> before returning an undelivered parcel to our fulfillment facility (Return to Origin - RTO).</li>
              <li>Please ensure your mobile number and shipping address are accurate and complete with nearby landmarks.</li>
              <li>If you require delivery rescheduling, please respond to the courier notification SMS or call our helpline before the third delivery attempt.</li>
            </ul>
          </div>

          {/* Section 5: Damaged Packages on Arrival */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-pink-100 text-[#e51975] font-black text-xs flex items-center justify-center">5</span>
              <h3 className="font-black text-base sm:text-lg text-gray-900 font-serif">Damaged or Tampered Shipments</h3>
            </div>
            <p>
              If the outer courier bag appears visibly tampered with or torn:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>Do not accept the delivery or mention &quot;Damaged Outer Packaging&quot; on the courier delivery sheet before signing.</li>
              <li>Record a quick unboxing video or take clear photos.</li>
              <li>Contact our team within <strong>48 hours (2 days)</strong> at <a href="mailto:support@featherhutfashion.com" className="text-[#e51975] font-bold hover:underline">support@featherhutfashion.com</a> or <a href="tel:7869579735" className="text-[#e51975] font-bold hover:underline">7869579735</a> so we can arrange an immediate free replacement.</li>
            </ul>
          </div>

        </div>

        {/* Dedicated Support Card */}
        <div className="bg-gradient-to-br from-pink-900 via-[#4a0822] to-pink-950 text-white rounded-3xl p-6 sm:p-10 shadow-lg border border-amber-300/30 space-y-6">
          <div>
            <span className="text-xs font-black text-amber-300 uppercase tracking-wider">Logistics &amp; Tracking Desk</span>
            <h3 className="text-2xl font-black font-serif mt-1 text-amber-100">Where Is My Order?</h3>
            <p className="text-xs sm:text-sm text-pink-100/80 mt-1 leading-relaxed">
              Have questions regarding delivery schedules, pincode serviceability, or courier tracking numbers? We are here to help.
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
                <span>Shipping Support</span>
              </div>
              <p className="text-xs font-bold text-white break-all">support@featherhutfashion.com</p>
              <p className="text-[10px] text-pink-200">Include Order ID / AWB Number</p>
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
