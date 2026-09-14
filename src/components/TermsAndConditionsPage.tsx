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
  CheckCircle2, 
  AlertCircle, 
  Scale, 
  ShoppingBag,
  MessageCircle
} from 'lucide-react';

interface PolicyPageProps {
  onBackToHome: () => void;
  onNavigatePolicy: (path: string) => void;
  onExploreCollection?: (collectionName: string) => void;
}

export const TermsAndConditionsPage: React.FC<PolicyPageProps> = ({
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
            <span className="text-[#e51975] font-bold">Terms &amp; Conditions</span>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-pink-950 via-[#4a0822] to-pink-900 text-white py-12 sm:py-16 px-4 sm:px-6">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-500/20 border border-pink-400/30 text-amber-200 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            <Scale className="w-3.5 h-3.5 text-amber-300" />
            <span>Legal Agreement &amp; User Terms</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-serif tracking-tight text-white leading-tight">
            Terms and Conditions
          </h1>

          <p className="text-sm sm:text-base text-pink-100/90 max-w-2xl mx-auto leading-relaxed">
            Please read these terms and conditions carefully before using or purchasing from Feather Hut Fashion (<span className="text-amber-200 underline">https://featherhutfashion.com/</span>).
          </p>

          <p className="text-xs text-amber-300/80 font-medium">
            Last Updated: August 2026 • Valid for all online storefront visitors &amp; shoppers
          </p>
        </div>
      </section>

      {/* Quick Policy Switcher Tabs */}
      <div className="bg-white border-b border-pink-100 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden text-xs sm:text-sm font-bold">
          <button
            onClick={() => onNavigatePolicy('/terms')}
            className="px-4 py-2 rounded-xl bg-pink-700 text-amber-200 shadow-xs flex items-center gap-2 shrink-0"
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
            className="px-4 py-2 rounded-xl text-gray-600 hover:text-[#e51975] hover:bg-pink-50 transition-all flex items-center gap-2 shrink-0"
          >
            <Truck className="w-4 h-4" />
            <span>Shipping &amp; Delivery</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8 flex-1">
        
        {/* Intro Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-[#e51975]">
            <FileText className="w-6 h-6" />
            <h2 className="text-xl sm:text-2xl font-black font-serif text-gray-900">Agreement Between User and Feather Hut Fashion</h2>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            These Terms and Conditions (&quot;Terms&quot;) govern your use of our website (<a href="https://featherhutfashion.com/" target="_blank" rel="noopener noreferrer" className="text-[#e51975] font-semibold hover:underline">https://featherhutfashion.com/</a>) and the purchase of ethnic attire, sarees, salwar suits, dress materials, and kurtis from our online store. By accessing our website, browsing our collections, or placing an order, you agree to be legally bound by these Terms.
          </p>
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              If you do not agree with any portion of these Terms, you must discontinue your use of our website immediately.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">

          {/* Section 1 */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-pink-100 text-[#e51975] font-black text-xs flex items-center justify-center">1</span>
              <h3 className="font-black text-base sm:text-lg text-gray-900 font-serif">Legal Entity &amp; Business Registration</h3>
            </div>
            <p>
              This website is operated by <strong>Feather Hut Fashion (&quot;Feat&quot;)</strong>. Throughout the site, the terms &quot;we,&quot; &quot;us,&quot; and &quot;our&quot; refer to Feather Hut Fashion. We offer this website, including all information, tools, collections, and customer services available from this site to you, the user, conditioned upon your acceptance of all terms, conditions, policies, and notices stated here.
            </p>
            <div className="bg-pink-50/70 p-4 rounded-2xl border border-pink-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-gray-500 font-medium block">Legal Entity Name:</span>
                <span className="font-bold text-gray-900">Feather Hut Fashion</span>
              </div>
              <div>
                <span className="text-gray-500 font-medium block">GSTIN:</span>
                <span className="font-mono font-bold text-[#e51975]">19APAPC3078H1Z1</span>
              </div>
              <div>
                <span className="text-gray-500 font-medium block">Registered Office Address:</span>
                <span className="font-bold text-gray-900">Khanyan, Hoogly, West Bengal-712147, India</span>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-pink-100 text-[#e51975] font-black text-xs flex items-center justify-center">2</span>
              <h3 className="font-black text-base sm:text-lg text-gray-900 font-serif">Online Store Terms &amp; Eligibility</h3>
            </div>
            <p>
              By agreeing to these Terms, you represent that you are at least the age of majority in your state, union territory, or province of residence, or that you have given us your consent to allow any of your minor dependents to use this site.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-600 pt-1">
              <li>You may not use our products for any illegal or unauthorized purpose.</li>
              <li>You must not violate any laws in your jurisdiction (including but not limited to intellectual property and copyright laws).</li>
              <li>A breach or violation of any of the Terms will result in an immediate termination of your access to our Services.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-pink-100 text-[#e51975] font-black text-xs flex items-center justify-center">3</span>
              <h3 className="font-black text-base sm:text-lg text-gray-900 font-serif">Accuracy, Completeness &amp; Service Modifications</h3>
            </div>
            <p>
              We reserve the right to:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-pink-50/50 border border-pink-100 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#e51975] shrink-0 mt-0.5" />
                <span className="text-xs text-gray-700">Modify or discontinue any collection, fabric design, or product at any time without notice.</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-pink-50/50 border border-pink-100 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#e51975] shrink-0 mt-0.5" />
                <span className="text-xs text-gray-700">Refuse service, cancel suspicious orders, or limit order quantities per person or per household.</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 pt-1">
              It is your responsibility to check this page periodically for changes. Your continued use of or access to the website following the posting of any changes constitutes acceptance of those changes.
            </p>
          </div>

          {/* Section 4 */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-pink-100 text-[#e51975] font-black text-xs flex items-center justify-center">4</span>
              <h3 className="font-black text-base sm:text-lg text-gray-900 font-serif">Products, Pricing &amp; Fabric Color Disclaimer</h3>
            </div>
            <p>
              Prices for our ethnic apparel are subject to change without notice. All descriptions of products or product pricing are subject to change at any time without notice, at our sole discretion.
            </p>
            <p className="text-xs text-gray-600 bg-gray-50 p-3.5 rounded-2xl border border-gray-200 leading-relaxed">
              <strong>Optical Color Note:</strong> We have made every effort to display as accurately as possible the colors, zari shines, and images of our products. We cannot guarantee that your device screen display of any color will be 100% exact due to natural photographic lighting and monitor calibrations.
            </p>
          </div>

          {/* Section 5 */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-pink-100 text-[#e51975] font-black text-xs flex items-center justify-center">5</span>
              <h3 className="font-black text-base sm:text-lg text-gray-900 font-serif">Intellectual Property Rights</h3>
            </div>
            <p>
              All content on this website, including photographs, garment designs, brand logo, text, graphics, and layout styling, is the exclusive property of <strong>Feather Hut Fashion</strong> and is protected by applicable copyright, trademark, and textile design intellectual property laws. You may not reproduce, duplicate, copy, sell, or exploit any portion of the service without express written permission from us.
            </p>
          </div>

          {/* Section 6 */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-pink-100 text-[#e51975] font-black text-xs flex items-center justify-center">6</span>
              <h3 className="font-black text-base sm:text-lg text-gray-900 font-serif">Limitation of Liability &amp; Governing Law</h3>
            </div>
            <p>
              In no event shall Feather Hut Fashion, our founders, employees, affiliates, or logistics partners be liable for any direct, indirect, incidental, punitive, or consequential damages arising from the use of our services or products procured from this website.
            </p>
            <p className="font-medium text-gray-900">
              These Terms and any separate agreements shall be governed by and construed in accordance with the laws of <strong>India</strong>, with exclusive jurisdiction in the courts of <strong>Hooghly, West Bengal</strong>.
            </p>
          </div>

        </div>

        {/* Dedicated Support Card */}
        <div className="bg-gradient-to-br from-pink-900 via-[#4a0822] to-pink-950 text-white rounded-3xl p-6 sm:p-10 shadow-lg border border-amber-300/30 space-y-6">
          <div>
            <span className="text-xs font-black text-amber-300 uppercase tracking-wider">Customer Care &amp; Queries</span>
            <h3 className="text-2xl font-black font-serif mt-1 text-amber-100">Questions About Our Terms?</h3>
            <p className="text-xs sm:text-sm text-pink-100/80 mt-1 leading-relaxed">
              Our dedicated legal and support desk is available to assist you with any questions regarding our terms and shopping policies.
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
              <p className="text-[10px] text-pink-200">Responds within 2 business hours</p>
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
