import React from 'react';
import { 
  ArrowLeft, 
  Hourglass, 
  Heart, 
  Award, 
  ShieldCheck, 
  Truck, 
  Users, 
  Layers, 
  CheckCircle2, 
  Phone, 
  Mail, 
  MapPin, 
  ShoppingBag,
  Gem,
  Clock,
  Flame,
  MessageCircle,
  Feather,
  Compass,
  Gift,
  Tag
} from 'lucide-react';

interface AboutUsPageProps {
  onBackToHome: () => void;
  onExploreCollection?: (collectionName: string) => void;
}

export const AboutUsPage: React.FC<AboutUsPageProps> = ({
  onBackToHome,
  onExploreCollection
}) => {
  const panIndiaDestinations = [
    {
      city: "Bengal's Soil (Dhaniakhali & Begumpura)",
      specialty: 'Authentic Bengal Handloom, Fine Cotton & Tangail Drapes',
      tag: 'Birthplace of Feat',
      bg: 'from-pink-900/90 to-rose-950/90',
      badge: 'bg-rose-100 text-rose-900'
    },
    {
      city: 'Jammu',
      specialty: 'Regal Kashmiri Tilla, Resham Threadwork & Intricate Stoles',
      tag: 'Northern Heritage',
      bg: 'from-amber-900/90 to-yellow-950/90',
      badge: 'bg-amber-100 text-amber-900'
    },
    {
      city: 'Jaipur',
      specialty: 'Royal Sanganeri Block Prints, Gota Patti & Hand-Crafted Bandhani',
      tag: 'Rajputana Craft',
      bg: 'from-pink-950/90 to-fuchsia-950/90',
      badge: 'bg-pink-100 text-pink-900'
    },
    {
      city: 'Surat',
      specialty: 'Master Zari Weaves, Tissue Silks & Grand Wedding Brocades',
      tag: 'Textile Capital',
      bg: 'from-purple-950/90 to-indigo-950/90',
      badge: 'bg-purple-100 text-purple-900'
    },
    {
      city: 'Pochampally',
      specialty: 'Geometric Ikat Weaving, Handspun Silks & Natural Dyes',
      tag: 'Telangana Artisans',
      bg: 'from-teal-950/90 to-emerald-950/90',
      badge: 'bg-teal-100 text-teal-900'
    },
    {
      city: 'Ludhiana & Ambernath',
      specialty: 'Contemporary Co-Ords, Modern Silhouettes & Breathable Tailored Fits',
      tag: 'Modern Fusion',
      bg: 'from-sky-950/90 to-blue-950/90',
      badge: 'bg-sky-100 text-sky-900'
    }
  ];

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
            <span className="text-[#e51975] font-bold">About Us</span>
          </div>
        </div>
      </div>

      {/* Hero Banner Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-pink-950 via-[#4a0822] to-pink-900 text-white py-14 sm:py-24 px-4 sm:px-6">
        {/* Ambient background glows */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-4 sm:space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-amber-300/30 text-amber-200 text-xs sm:text-sm font-bold backdrop-blur-xs">
            <Feather className="w-4 h-4 text-amber-300" />
            <span>Feather Hut Fashion • Elegance • Comfort • Celebration</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black font-serif tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-pink-100 to-amber-200 leading-tight">
            About Feather Hut Fashion
          </h1>

          <p className="text-base sm:text-xl text-pink-100/95 max-w-3xl mx-auto leading-relaxed font-serif italic">
            "Your premier destination for elegance, comfort and celebration."
          </p>

          <p className="text-xs sm:text-base text-pink-200/80 max-w-2xl mx-auto leading-relaxed">
            Fashion light as a feather, crafted to leave a lasting impression.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onBackToHome}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-pink-950 font-black text-xs sm:text-sm shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Explore Our Collections</span>
            </button>
          </div>
        </div>
      </section>

      {/* Key Metric Badges */}
      <section className="relative -mt-8 z-20 max-w-6xl mx-auto px-4 w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-lg border border-pink-100 text-center hover:border-pink-300 transition-colors">
            <div className="w-10 h-10 mx-auto rounded-xl bg-pink-50 text-[#e51975] flex items-center justify-center mb-2 shadow-xs">
              <Feather className="w-5 h-5" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-gray-900 font-serif">Light as Feather</p>
            <p className="text-[11px] sm:text-xs text-gray-500 font-semibold mt-0.5">Everyday Comfort</p>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-lg border border-pink-100 text-center hover:border-pink-300 transition-colors">
            <div className="w-10 h-10 mx-auto rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-2 shadow-xs">
              <Compass className="w-5 h-5" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-gray-900 font-serif">Pan-India</p>
            <p className="text-[11px] sm:text-xs text-gray-500 font-semibold mt-0.5">Handpicked Artisan Weaves</p>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-lg border border-pink-100 text-center hover:border-pink-300 transition-colors">
            <div className="w-10 h-10 mx-auto rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-2 shadow-xs">
              <Hourglass className="w-5 h-5" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-gray-900 font-serif">Timeless</p>
            <p className="text-[11px] sm:text-xs text-gray-500 font-semibold mt-0.5">Tradition Meets Trends</p>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-lg border border-pink-100 text-center hover:border-pink-300 transition-colors">
            <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-gray-900 font-serif">Feel Special</p>
            <p className="text-[11px] sm:text-xs text-gray-500 font-semibold mt-0.5">Not Just Look Special</p>
          </div>
        </div>
      </section>

      {/* Main Story & Philosophy Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-12 sm:space-y-16">
        
        {/* Story Part 1: Official Brand Narrative */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-pink-200/90 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-pink-100/40 rounded-full blur-3xl pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center relative z-10">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 text-xs font-black text-[#e51975] uppercase tracking-wider bg-pink-50 px-3.5 py-1.5 rounded-full border border-pink-200">
                <Heart className="w-3.5 h-3.5" />
                <span>Our Heritage &amp; Heart</span>
              </div>
              
              <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 font-serif leading-tight">
                Born on Bengal's Soil with a Love for Indian Craftsmanship
              </h2>

              {/* Exact User Requested Narrative */}
              <div className="space-y-4 text-sm sm:text-base text-gray-700 leading-relaxed font-sans">
                <p className="p-4 bg-gradient-to-r from-pink-50/70 via-rose-50/40 to-amber-50/60 rounded-2xl border-l-4 border-[#e51975] text-gray-800 font-medium leading-relaxed">
                  <strong>Feather Hut Fashion</strong>, your premier destination for elegance, comfort and celebration.
                </p>

                <p>
                  Born on Bengal's soil with a love for Indian craftsmanship, we bring you curated collections that blend tradition with today's trends. The Premium Collection is selected from pan-India destinations viz <strong>Jammu, Jaipur, Ludhiana, Surat, Dhaniakhali, Begumpura, Ambernath, Pochampally etc</strong> — every piece is chosen handpicked from Pan-India to make you feel special, not just look special.
                </p>

                <p className="text-gray-800 font-semibold italic text-base sm:text-lg border-t border-pink-100 pt-3 text-[#e51975]">
                  "At Feather Hut, we believe fashion should be light as a feather, yet leave a lasting impression. We vowed to offer timeless elegance and everyday comfort."
                </p>
              </div>
              
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-2.5 text-xs font-semibold text-gray-800 bg-pink-50/60 p-3 rounded-xl border border-pink-100">
                  <CheckCircle2 className="w-4 h-4 text-[#e51975] shrink-0 mt-0.5" />
                  <span>Handpicked from authentic master artisan clusters across India</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs font-semibold text-gray-800 bg-amber-50/60 p-3 rounded-xl border border-amber-100">
                  <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>Feather-light drapes &amp; skin-friendly breathable comfort</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 relative">
              <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-pink-900">
                <img
                  src="/kurti.jpeg"
                  alt="Feather Hut Fashion Craftsmanship"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== '/saree.jpeg' && !target.src.endsWith('/saree.jpeg')) {
                      target.src = "/saree.jpeg";
                    }
                  }}
                />
              </div>
              <div className="absolute -bottom-6 -left-4 sm:-left-6 bg-white/95 backdrop-blur-xs rounded-2xl p-4 shadow-xl border border-pink-200 max-w-[240px]">
                <div className="flex items-center gap-2 text-[#e51975] mb-1">
                  <Feather className="w-4 h-4" />
                  <p className="text-xs font-black">Light as a Feather</p>
                </div>
                <p className="text-[11px] text-gray-600 leading-snug">
                  Every stitch, weave, and drape is designed for all-day effortless grace.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pan-India Craft Destinations Showcase */}
        <div className="space-y-6">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs">
              <Compass className="w-3.5 h-3.5 text-amber-700" />
              <span>Pan-India Sourcing Journey</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 font-serif">
              Handpicked from India's Richest Textile Hubs
            </h3>
            <p className="text-xs sm:text-sm text-gray-600">
              We travel across India's master craft centers to bring you rare weaves, royal zari, and breathable handloom fabrics directly from the source.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {panIndiaDestinations.map((dest, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-5 border border-pink-100 shadow-sm hover:shadow-md hover:border-pink-300 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${dest.badge}`}>
                      {dest.tag}
                    </span>
                    <MapPin className="w-4 h-4 text-[#e51975] group-hover:scale-110 transition-transform" />
                  </div>
                  <h4 className="font-extrabold text-base text-gray-900 font-serif mb-1">
                    {dest.city}
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {dest.specialty}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-[#e51975] font-bold">
                  <span>Pan-India Handpicked</span>
                  <span>100% Authentic</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5 Signature Curated Collections */}
        <div className="bg-gradient-to-br from-pink-50/70 via-white to-amber-50/80 rounded-3xl p-6 sm:p-10 border border-pink-200/80 shadow-sm space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-black text-[#e51975] uppercase tracking-wider">Curated Collections</span>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 font-serif">Curated for Every Celebration</h3>
            <p className="text-xs sm:text-sm text-gray-600">Thoughtfully crafted to blend Indian tradition with today's trends.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            
            {/* Jashn */}
            <div className="bg-white rounded-2xl p-5 border border-pink-100 shadow-sm hover:shadow-md hover:border-pink-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-pink-100 text-[#e51975] flex items-center justify-center mb-3">
                  <Flame className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-base text-gray-900 font-serif">Jashn Collection</h4>
                <p className="text-xs text-gray-500 font-semibold mb-2">Grand Festive &amp; Wedding Couture</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Heavy resham work, intricate gota patti borders, rich dupioni silks, and celebratory palettes designed for weddings and festive soirees.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onExploreCollection) onExploreCollection('Jashn Collection');
                  else onBackToHome();
                }}
                className="mt-4 text-xs font-bold text-[#e51975] hover:underline flex items-center gap-1"
              >
                <span>View Jashn Pieces →</span>
              </button>
            </div>

            {/* Firdausi */}
            <div className="bg-white rounded-2xl p-5 border border-pink-100 shadow-sm hover:shadow-md hover:border-pink-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
                  <Gem className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-base text-gray-900 font-serif">Firdausi Collection</h4>
                <p className="text-xs text-gray-500 font-semibold mb-2">Royal Chanderi &amp; Gold Zari</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Hand-loomed Chanderi weaves, tissue sharees, and ethereal pastel sets with delicate gold foil stamping.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onExploreCollection) onExploreCollection('Firdausi collection');
                  else onBackToHome();
                }}
                className="mt-4 text-xs font-bold text-purple-700 hover:underline flex items-center gap-1"
              >
                <span>View Firdausi Pieces →</span>
              </button>
            </div>

            {/* 9 to Fivers */}
            <div className="bg-white rounded-2xl p-5 border border-pink-100 shadow-sm hover:shadow-md hover:border-pink-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-base text-gray-900 font-serif">9 to Fivers Collection</h4>
                <p className="text-xs text-gray-500 font-semibold mb-2">Daily Workwear &amp; Office Chic</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Breathable pure cotton kurtis, straight-cut pants, minimal block prints, and wrinkle-resistant blends created for all-day comfort.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onExploreCollection) onExploreCollection('9 to fivers collection');
                  else onBackToHome();
                }}
                className="mt-4 text-xs font-bold text-amber-800 hover:underline flex items-center gap-1"
              >
                <span>View 9 to 5 Pieces →</span>
              </button>
            </div>

            {/* Present is Gifted */}
            <div className="bg-white rounded-2xl p-5 border border-pink-100 shadow-sm hover:shadow-md hover:border-pink-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-3">
                  <Gift className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-base text-gray-900 font-serif">Present is Gifted</h4>
                <p className="text-xs text-gray-500 font-semibold mb-2">Luxury Gift Hampers &amp; Boxed Sets</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Curated apparel sets packaged in signature luxury gift boxes, ideal for weddings, birthdays, and honoring loved ones.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onExploreCollection) onExploreCollection("'Present is Gifted' Collection");
                  else onBackToHome();
                }}
                className="mt-4 text-xs font-bold text-rose-700 hover:underline flex items-center gap-1"
              >
                <span>View Gift Hampers →</span>
              </button>
            </div>

            {/* Deal Maange More */}
            <div className="bg-white rounded-2xl p-5 border border-pink-100 shadow-sm hover:shadow-md hover:border-pink-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
                  <Tag className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-base text-gray-900 font-serif">Deal Maange More</h4>
                <p className="text-xs text-gray-500 font-semibold mb-2">Festive Value Deals &amp; Steals</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Exceptional craftsmanship at unbeatable festive prices, value combo sets, and flash clearance pieces.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onExploreCollection) onExploreCollection("'Deal maange more' Collection");
                  else onBackToHome();
                }}
                className="mt-4 text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
              >
                <span>View Festive Deals →</span>
              </button>
            </div>

          </div>
        </div>

        {/* Our Core Values / Why Choose Feather Hut */}
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 font-serif">The Feather Hut Vow</h3>
            <p className="text-xs sm:text-sm text-gray-500">Timeless elegance and everyday comfort in every single piece.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col items-center text-center space-y-2">
              <div className="p-3 bg-pink-50 text-[#e51975] rounded-full">
                <Award className="w-5 h-5" />
              </div>
              <h5 className="font-extrabold text-sm text-gray-900">100% Genuine Fabrics</h5>
              <p className="text-[11px] text-gray-500">Pure mulmul, chanderi silk, georgette, and Bengal cottons certified for comfort.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col items-center text-center space-y-2">
              <div className="p-3 bg-amber-50 text-amber-700 rounded-full">
                <Truck className="w-5 h-5" />
              </div>
              <h5 className="font-extrabold text-sm text-gray-900">Pan-India Express Shipping</h5>
              <p className="text-[11px] text-gray-500">Fast dispatched from our hub with live SMS &amp; WhatsApp tracking.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col items-center text-center space-y-2">
              <div className="p-3 bg-purple-50 text-purple-700 rounded-full">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h5 className="font-extrabold text-sm text-gray-900">Secure Payments &amp; COD</h5>
              <p className="text-[11px] text-gray-500">100% secure checkout with UPI, Credit/Debit cards, Net Banking &amp; Cash on Delivery.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col items-center text-center space-y-2">
              <div className="p-3 bg-rose-50 text-rose-700 rounded-full">
                <Heart className="w-5 h-5" />
              </div>
              <h5 className="font-extrabold text-sm text-gray-900">5 Days Easy Returns</h5>
              <p className="text-[11px] text-gray-500">Hassle-free 5-day return policy for size or design adjustments.</p>
            </div>
          </div>
        </div>

        {/* Embedded Contact & Support Section on the Page */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-pink-200/90 shadow-md">
          <div className="max-w-4xl mx-auto space-y-8">
            
            <div className="text-center space-y-2">
              <span className="text-xs font-black text-[#e51975] uppercase tracking-wider">Get in Touch</span>
              <h3 className="text-2xl sm:text-3xl font-black text-gray-900 font-serif">We’d Love to Hear From You</h3>
              <p className="text-xs sm:text-sm text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Have questions about fabric sizing, wholesale orders, custom bridal styling, or order delivery? Connect with our dedicated customer care team directly via phone, WhatsApp, or email.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              
              {/* Call & WhatsApp */}
              <div className="bg-gradient-to-br from-pink-50/80 to-rose-50/50 p-6 rounded-2xl border border-pink-200 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-pink-100 text-[#e51975] flex items-center justify-center shadow-xs">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h6 className="font-black text-base text-gray-900 font-serif">Call or WhatsApp</h6>
                    <p className="text-sm font-black text-[#e51975] tracking-wide mt-1">7869579735</p>
                    <p className="text-[11px] text-gray-500 mt-1">Monday to Saturday: 9:00 AM – 8:00 PM IST</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <a
                    href="tel:7869579735"
                    className="w-full py-2.5 px-4 bg-[#e51975] hover:bg-pink-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call 7869579735</span>
                  </a>
                  <a
                    href="https://wa.me/917869579735"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Chat on WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Email Support */}
              <div className="bg-gradient-to-br from-amber-50/80 to-yellow-50/50 p-6 rounded-2xl border border-amber-200 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h6 className="font-black text-base text-gray-900 font-serif">Email Support</h6>
                    <p className="text-xs font-bold text-gray-900 mt-1 break-all">support@featherhutfashion.com</p>
                    <p className="text-[11px] text-gray-500 mt-1">Typically responds within 2 business hours</p>
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href="mailto:support@featherhutfashion.com"
                    className="w-full py-2.5 px-4 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send an Email</span>
                  </a>
                </div>
              </div>

              {/* Registered Office & West Bengal Headquarters */}
              <div className="bg-gradient-to-br from-rose-50/80 to-pink-50/50 p-6 rounded-2xl border border-pink-200 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-700 flex items-center justify-center shadow-xs">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h6 className="font-black text-base text-gray-900 font-serif">Registered Office</h6>
                    <p className="text-xs font-bold text-[#e51975] mt-0.5">Feather Hut Fashion</p>
                    <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                      Khanyan, Hoogly, West Bengal-712147, India
                    </p>
                    <p className="text-[11px] font-mono font-bold text-gray-900 mt-1">GSTIN: 19APAPC3078H1Z1</p>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="w-full py-2 px-3 bg-pink-100/80 text-pink-900 font-bold text-[11px] rounded-xl text-center">
                    Registered Business Office
                  </div>
                </div>
              </div>

            </div>

            {/* Statutory Registration & E-Commerce Compliance Bar */}
            <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-950">
              <div className="space-y-0.5 text-center sm:text-left">
                <p className="font-bold">Authorized Registered Merchant • E-Commerce Compliance</p>
                <p className="text-[11px] text-amber-900/80">
                  Legal Entity: <strong>Feather Hut Fashion</strong> | GSTIN: <strong>19APAPC3078H1Z1</strong> | Registered Office: <strong>Khanyan, Hoogly, West Bengal-712147</strong>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 font-bold text-[10px] rounded-lg border border-emerald-300">
                  ✓ GST Verified
                </span>
                <span className="px-2.5 py-1 bg-blue-100 text-blue-900 font-bold text-[10px] rounded-lg border border-blue-300">
                  ✓ 100% Genuine Handloom
                </span>
              </div>
            </div>

          </div>
        </div>

      </section>

    </div>
  );
};

