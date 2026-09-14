import React, { useState } from 'react';
import { X, Phone, Mail, MapPin, Send, MessageSquare, Heart, BookOpen } from 'lucide-react';

interface ContactAboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'about' | 'contact';
}

export const ContactAboutModal: React.FC<ContactAboutModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'about'
}) => {
  const [activeTab, setActiveTab] = useState<'about' | 'contact'>(initialTab);
  const [inquiry, setInquiry] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setInquiry({ name: '', email: '', message: '' });
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-pink-200 overflow-hidden relative max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-800 to-amber-700 text-amber-100 p-4 flex items-center justify-between border-b border-amber-300/30 shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-300" />
            <h3 className="font-extrabold text-base text-amber-200">
              {activeTab === 'about' ? 'About Feat: feather Hut Fashion' : 'Contact Us & Customer Care'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-amber-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="bg-pink-50 border-b border-pink-100 px-4 py-2 flex items-center gap-2 text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('about')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === 'about' ? 'bg-pink-700 text-amber-200 shadow' : 'text-gray-700 hover:bg-pink-100'
            }`}
          >
            About Feat
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === 'contact' ? 'bg-pink-700 text-amber-200 shadow' : 'text-gray-700 hover:bg-pink-100'
            }`}
          >
            Contact Support
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-1 space-y-5 text-xs text-gray-700">
          
          {activeTab === 'about' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-pink-50 to-amber-50 p-4 rounded-xl border border-pink-200 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-pink-950 font-black text-2xl flex items-center justify-center shrink-0 shadow">
                  F
                </div>
                <div>
                  <h4 className="font-black text-pink-950 text-base">Feather Hut Fashion</h4>
                  <p className="text-pink-800 text-xs">Elegance • Comfort • Celebration</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-gray-700 leading-relaxed">
                <p className="p-3 bg-pink-50/70 rounded-xl border-l-4 border-[#e51975] font-medium text-gray-800">
                  <strong>Feather Hut Fashion</strong>, your premier destination for elegance, comfort and celebration.
                </p>

                <p>
                  Born on Bengal's soil with a love for Indian craftsmanship, we bring you curated collections that blend tradition with today's trends. The Premium Collection is selected from pan-India destinations viz <strong>Jammu, Jaipur, Ludhiana, Surat, Dhaniakhali, Begumpura, Ambernath, Pochampally etc</strong> — every piece is chosen handpicked from Pan-India to make you feel special, not just look special.
                </p>

                <p className="text-pink-900 font-semibold italic">
                  "At Feather Hut, we believe fashion should be light as a feather, yet leave a lasting impression. We vowed to offer timeless elegance and everyday comfort."
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="bg-white p-3 rounded-xl border border-pink-100 shadow-sm text-center">
                  <span className="text-base font-black text-pink-700">Light as a Feather</span>
                  <p className="font-bold text-gray-800 text-[11px] mt-0.5">Everyday Comfort</p>
                  <p className="text-[10px] text-gray-500">Pure breathable fabrics</p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-pink-100 shadow-sm text-center">
                  <span className="text-base font-black text-pink-700">Pan-India</span>
                  <p className="font-bold text-gray-800 text-[11px] mt-0.5">Master Weavers</p>
                  <p className="text-[10px] text-gray-500">Bengal, Surat, Jaipur & more</p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-pink-100 shadow-sm text-center">
                  <span className="text-base font-black text-pink-700">Feel Special</span>
                  <p className="font-bold text-gray-800 text-[11px] mt-0.5">5 Curated Lines</p>
                  <p className="text-[10px] text-gray-500">Jashn, Firdausi, 9 to 5 & more</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Form */}
              <form onSubmit={handleSubmitInquiry} className="space-y-3">
                <h4 className="font-bold text-pink-900 text-xs uppercase tracking-wider">Send us a Message</h4>
                
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={inquiry.name}
                    onChange={(e) => setInquiry({ ...inquiry, name: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={inquiry.email}
                    onChange={(e) => setInquiry({ ...inquiry, email: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Inquiry / Feedback</label>
                  <textarea
                    rows={3}
                    required
                    value={inquiry.message}
                    onChange={(e) => setInquiry({ ...inquiry, message: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded-lg"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-pink-700 hover:bg-pink-800 text-amber-200 font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Inquiry</span>
                </button>

                {submitted && (
                  <p className="text-xs font-bold text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200">
                    ✓ Thank you! Our Feat support team will respond within 2 hours.
                  </p>
                )}
              </form>

              {/* Direct Info & Legal Entity Verification */}
              <div className="bg-pink-50/60 p-4 rounded-xl border border-pink-100 space-y-3 text-xs">
                <div className="border-b border-pink-200/70 pb-2">
                  <h4 className="font-extrabold text-pink-950 text-xs uppercase tracking-wider">Business Identity &amp; Registration</h4>
                  <p className="text-[11px] text-gray-700 mt-1"><strong>Legal Entity:</strong> Feather Hut Fashion</p>
                  <p className="text-[11px] text-pink-800 font-mono font-bold"><strong>GSTIN:</strong> 19APAPC3078H1Z1</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-pink-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-gray-900">Registered Office Address</p>
                    <p className="text-gray-600 leading-snug">Khanyan, Hoogly, West Bengal-712147, India</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-pink-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-gray-900">Customer Helpline &amp; WhatsApp</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <a href="tel:7869579735" className="text-[#e51975] font-bold hover:underline">7869579735</a>
                      <span className="text-gray-400">|</span>
                      <a href="https://wa.me/917869579735" target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold hover:underline">WhatsApp</a>
                    </div>
                    <p className="text-[10px] text-gray-500">Mon-Sat 9:00 AM - 8:00 PM IST</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-pink-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-gray-900">Customer Support &amp; Grievance Email</p>
                    <p className="text-gray-600 break-all">support@featherhutfashion.com</p>
                    <p className="text-[10px] text-gray-500">Grievance Redressal SLA: Within 48 Hours</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
