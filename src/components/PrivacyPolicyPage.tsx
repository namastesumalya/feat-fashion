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
  Lock, 
  Eye, 
  Database, 
  UserCheck,
  ShoppingBag,
  MessageCircle
} from 'lucide-react';

interface PolicyPageProps {
  onBackToHome: () => void;
  onNavigatePolicy: (path: string) => void;
  onExploreCollection?: (collectionName: string) => void;
}

export const PrivacyPolicyPage: React.FC<PolicyPageProps> = ({
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
            <span className="text-[#e51975] font-bold">Privacy Policy</span>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-pink-950 via-[#4a0822] to-pink-900 text-white py-12 sm:py-16 px-4 sm:px-6">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-500/20 border border-pink-400/30 text-amber-200 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
            <span>Customer Privacy &amp; Data Security</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-serif tracking-tight text-white leading-tight">
            Privacy Policy
          </h1>

          <p className="text-sm sm:text-base text-pink-100/90 max-w-2xl mx-auto leading-relaxed">
            At Feather Hut Fashion, we are committed to safeguarding your personal data, shopping privacy, and checkout security.
          </p>

          <p className="text-xs text-amber-300/80 font-medium">
            Last Updated: August 2026 • Valid for all online visitors &amp; registered buyers
          </p>
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
            className="px-4 py-2 rounded-xl bg-pink-700 text-amber-200 shadow-xs flex items-center gap-2 shrink-0"
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
            className="px-4 py-2 rounded-xl text-gray-600 hover:text-[#e51975] hover:bg-pink-50 transition-all flex items-center gap-2 shrink-0"
          >
            <Truck className="w-4 h-4" />
            <span>Shipping &amp; Delivery</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8 flex-1">
        
        {/* Intro Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-[#e51975]">
            <Lock className="w-6 h-6" />
            <h2 className="text-xl sm:text-2xl font-black font-serif text-gray-900">Your Privacy is Paramount to Us</h2>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            At <strong>Feather Hut Fashion</strong> (accessible from <a href="https://featherhutfashion.com/" target="_blank" rel="noopener noreferrer" className="text-[#e51975] font-semibold hover:underline">https://featherhutfashion.com/</a>), protecting the personal information of our valued shoppers is our utmost priority. This Privacy Policy details how we collect, handle, utilize, and protect your information when you visit our storefront, register an account, or order handcrafted Indian ethnic wear.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">

          {/* 1. Information We Collect */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100/90 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-pink-100 text-[#e51975] font-black text-xs flex items-center justify-center">1</span>
              <h3 className="font-black text-base sm:text-lg text-gray-900 font-serif">Information We Collect</h3>
            </div>
            
            <p>We collect essential information to deliver a smooth and personalized shopping experience:</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="p-4 rounded-2xl bg-pink-50/60 border border-pink-100 space-y-2">
                <div className="flex items-center gap-2 text-pink-900 font-bold text-xs">
                  <UserCheck className="w-4 h-4 text-[#e51975]" />
                  <span>Personal Identification</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Name, delivery shipping address, billing address, email address (<a href="mailto:support@featherhutfashion.com" className="text-[#e51975] underline">support@featherhutfashion.com</a>), and contact phone number (<a href="tel:7869579735" className="text-gray-800 font-semibold hover:underline">7869579735</a>).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <Lock className="w-4 h-4 text-amber-700" />
                  <span>Payment Information</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  All transactions are encrypted through RBI-compliant, PCI-DSS certified payment gateways. We never store sensitive full card numbers, CVVs, or bank PINs on our servers.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-2">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                  <Database className="w-4 h-4 text-purple-700" />
                  <span>Device &amp; Usage Logs</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  IP address, browser type, operating system, referrer URL, pages visited, session duration, and clickstream analytics to help us optimize site speed.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <Eye className="w-4 h-4 text-emerald-700" />
                  <span>Cookies &amp; Local Preferences</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  We use cookies and localStorage to remember your active shopping bag items, saved wishlist garments, coupon selections, and language/currency settings.
                </p>
              </div>
            </div>
          </div>

          {/* 2. How We Use Your Information */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-pink-100 text-[#e51975] font-black text-xs flex items-center justify-center">2</span>
              <h3 className="font-black text-base sm:text-lg text-gray-900 font-serif">How We Use Your Information</h3>
            </div>
            <p>We use the data collected for the following legitimate business purposes:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>Processing, packing, dispatching, and delivering your ordered ethnic garments.</li>
              <li>Sending transactional SMS and email updates (Order Confirmation, Tracking AWB numbers, Delivery status).</li>
              <li>Providing responsive customer support and troubleshooting via phone and WhatsApp.</li>
              <li>Preventing unauthorized transactions, fraud, or spam orders.</li>
              <li>Sending optional promotional announcements or seasonal festive discounts (you can unsubscribe at any time).</li>
            </ul>
          </div>

          {/* 3. Sharing Your Information */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-pink-100 text-[#e51975] font-black text-xs flex items-center justify-center">3</span>
              <h3 className="font-black text-base sm:text-lg text-gray-900 font-serif">Third-Party Sharing &amp; Non-Sale Guarantee</h3>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 font-medium leading-relaxed">
              ✓ <strong>Zero Data Selling:</strong> We do NOT sell, rent, or trade your personal contact details or purchasing history to any advertising brokers or marketing third parties.
            </div>
            <p className="pt-1">We share data strictly with trusted service partners for order fulfillment:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li><strong>Logistics &amp; Courier Partners:</strong> BlueDart, Delhivery, DTDC, India Post to complete door-to-door delivery.</li>
              <li><strong>Payment Processors:</strong> Razorpay, PayU, Stripe, UPI gateways to securely authenticate transactions.</li>
              <li><strong>Legal Compliance:</strong> When compelled by valid Indian judicial warrants or law enforcement mandates.</li>
            </ul>
          </div>

          {/* 4. Data Security */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-pink-100 text-[#e51975] font-black text-xs flex items-center justify-center">4</span>
              <h3 className="font-black text-base sm:text-lg text-gray-900 font-serif">Data Security &amp; Encryption</h3>
            </div>
            <p>
              We implement industry-standard 256-bit SSL/TLS encryption for all data transmitted between your browser and our servers. Our databases are secured with modern access control tokens, automated firewall filtering, and encrypted storage protocols.
            </p>
          </div>

          {/* 5. User Rights */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-pink-100 text-[#e51975] font-black text-xs flex items-center justify-center">5</span>
              <h3 className="font-black text-base sm:text-lg text-gray-900 font-serif">Your Rights &amp; Data Rectification</h3>
            </div>
            <p>
              You have the right to request a copy of the personal information we hold about you, request corrections to your delivery address or contact details, or ask for the deletion of your account. Contact our privacy officer at <a href="mailto:support@featherhutfashion.com" className="text-[#e51975] font-semibold hover:underline">support@featherhutfashion.com</a>.
            </p>
          </div>

        </div>

        {/* Dedicated Support Card */}
        <div className="bg-gradient-to-br from-pink-900 via-[#4a0822] to-pink-950 text-white rounded-3xl p-6 sm:p-10 shadow-lg border border-amber-300/30 space-y-6">
          <div>
            <span className="text-xs font-black text-amber-300 uppercase tracking-wider">Privacy &amp; Compliance Officer</span>
            <h3 className="text-2xl font-black font-serif mt-1 text-amber-100">Have Questions on Data Safety?</h3>
            <p className="text-xs sm:text-sm text-pink-100/80 mt-1 leading-relaxed">
              Feel free to reach out to our customer care and privacy team for any questions or data concerns.
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
                <span>Email Support</span>
              </div>
              <p className="text-xs font-bold text-white break-all">support@featherhutfashion.com</p>
              <p className="text-[10px] text-pink-200">Typically responds within 2 hours</p>
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
