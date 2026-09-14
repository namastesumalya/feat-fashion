import React, { useState } from 'react';
import { X, FileText, ShieldCheck, RefreshCcw, Truck } from 'lucide-react';

interface PolicyPagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPolicy?: 'terms' | 'privacy' | 'refund' | 'shipping';
}

export const PolicyPagesModal: React.FC<PolicyPagesModalProps> = ({
  isOpen,
  onClose,
  initialPolicy = 'terms'
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'refund' | 'shipping'>(initialPolicy);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-pink-200 overflow-hidden relative max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-800 to-amber-700 text-amber-100 p-4 flex items-center justify-between border-b border-amber-300/30 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-300" />
            <h3 className="font-extrabold text-base text-amber-200">
              Feat Legal & Customer Trust Policies
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-amber-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="bg-pink-50 border-b border-pink-100 px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'terms' ? 'bg-pink-700 text-amber-200 shadow' : 'text-gray-700 hover:bg-pink-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms & Conditions</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'privacy' ? 'bg-pink-700 text-amber-200 shadow' : 'text-gray-700 hover:bg-pink-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => setActiveTab('refund')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'refund' ? 'bg-pink-700 text-amber-200 shadow' : 'text-gray-700 hover:bg-pink-100'
            }`}
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Refund & Cancellation</span>
          </button>

          <button
            onClick={() => setActiveTab('shipping')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'shipping' ? 'bg-pink-700 text-amber-200 shadow' : 'text-gray-700 hover:bg-pink-100'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Shipping & Delivery</span>
          </button>
        </div>

        {/* Policy Body */}
        <div className="p-4 sm:p-6 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-1 text-xs text-gray-700 space-y-4 leading-relaxed">
          
          {activeTab === 'terms' && (
            <div className="space-y-4 text-gray-700">
              <div className="border-b border-pink-100 pb-2">
                <h4 className="font-extrabold text-base text-pink-950">Terms and Conditions</h4>
                <p className="text-gray-500 text-[11px] mt-0.5">Welcome to Feather Hut Fashion (<a href="https://featherhutfashion.com/" target="_blank" rel="noopener noreferrer" className="text-[#e51975] hover:underline font-semibold">https://featherhutfashion.com/</a>)</p>
              </div>

              <p className="leading-relaxed">
                These Terms and Conditions (&quot;Terms&quot;) govern your use of our website and the purchase of products from our online store. By accessing our website or placing an order, you agree to be bound by these Terms. If you do not agree with any part of these terms, please do not use our website.
              </p>

              <div className="space-y-3.5 pt-1">
                <div>
                  <h5 className="font-bold text-gray-900 text-xs">1. General Overview</h5>
                  <p className="text-gray-600 mt-1 leading-relaxed">
                    This website is operated by Feather Hut Fashion. Throughout these terms, &quot;we,&quot; &quot;us,&quot; and &quot;our&quot; refer to Feather Hut Fashion. We offer this website, including all information, tools, and services available from this site, to you, the user, conditioned upon your acceptance of all terms, conditions, policies, and notices stated here.
                  </p>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 text-xs">2. Online Store Terms</h5>
                  <p className="text-gray-600 mt-1 leading-relaxed">
                    By agreeing to these Terms, you represent that you are at least the age of majority in your state or province of residence. You may not use our products for any illegal or unauthorized purpose, nor may you violate any laws in your jurisdiction (including but not limited to copyright laws).
                  </p>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 text-xs">3. Accuracy and Modifications</h5>
                  <p className="text-gray-600 mt-1">We reserve the right to:</p>
                  <ul className="list-disc pl-5 space-y-1 text-gray-600 mt-1.5">
                    <li>Modify or discontinue any service or product at any time without notice.</li>
                    <li>Update, change, or replace any part of these Terms by posting updates to our website. It is your responsibility to check this page periodically for changes.</li>
                    <li>Refuse service to anyone for any reason at any time.</li>
                  </ul>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 text-xs">4. Products and Pricing</h5>
                  <p className="text-gray-600 mt-1 leading-relaxed">
                    Prices for our products are subject to change without notice. We reserve the right to limit the quantities of any products or services that we offer. All descriptions of products or product pricing are subject to change at any time without notice, at our sole discretion.
                  </p>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 text-xs">5. Intellectual Property</h5>
                  <p className="text-gray-600 mt-1 leading-relaxed">
                    All content on this website, including text, graphics, logos, images, and software, is the property of Feather Hut Fashion and is protected by international copyright laws. You may not reproduce, duplicate, copy, or exploit any portion of our website without express written permission.
                  </p>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 text-xs">6. Limitation of Liability</h5>
                  <p className="text-gray-600 mt-1 leading-relaxed">
                    In no case shall Feather Hut Fashion, our directors, officers, employees, or affiliates be liable for any injury, loss, claim, or any direct, indirect, incidental, or consequential damages of any kind arising from your use of our service or any products procured using the service.
                  </p>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 text-xs">7. Governing Law</h5>
                  <p className="text-gray-600 mt-1 leading-relaxed">
                    These Terms shall be governed by and construed in accordance with the laws of INDIA.
                  </p>
                </div>

                <div className="bg-pink-50/70 p-3.5 rounded-xl border border-pink-100 mt-2">
                  <h5 className="font-bold text-pink-950 text-xs">8. Contact Information</h5>
                  <p className="text-gray-600 mt-1">Questions about the Terms and Conditions should be sent to us at:</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <p><strong>Email:</strong> <a href="mailto:support@featherhutfashion.com" className="text-[#e51975] hover:underline font-semibold">support@featherhutfashion.com</a></p>
                    <p><strong>Phone:</strong> <a href="tel:9980815269" className="text-gray-800 hover:text-[#e51975] font-semibold">9980815269</a></p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4 text-gray-700">
              <div className="border-b border-pink-100 pb-2">
                <h4 className="font-extrabold text-base text-pink-950">Privacy Policy</h4>
                <p className="text-gray-500 text-[11px] mt-0.5">At Feather Hut Fashion (accessible from <a href="https://featherhutfashion.com/" target="_blank" rel="noopener noreferrer" className="text-[#e51975] hover:underline font-semibold">https://featherhutfashion.com/</a>)</p>
              </div>

              <p className="leading-relaxed">
                At Feather Hut Fashion (accessible from <a href="https://featherhutfashion.com/" target="_blank" rel="noopener noreferrer" className="text-[#e51975] hover:underline font-semibold">https://featherhutfashion.com/</a>), protecting the privacy of our visitors and customers is one of our main priorities. This Privacy Policy document outlines the types of personal information collected and recorded by Feather Hut Fashion and how we use, share, and protect it.
              </p>

              <div className="space-y-3.5 pt-1">
                <div>
                  <h5 className="font-bold text-gray-900 text-xs">1. Information We Collect</h5>
                  <p className="text-gray-600 mt-1 leading-relaxed">
                    We collect several types of information to provide and improve our services to you:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-gray-600 mt-1.5">
                    <li>
                      <strong>Personal Identification Information:</strong> When you make a purchase, create an account, or contact us, we may collect personal details such as your name, shipping address, billing address, email address (<a href="mailto:support@featherhutfashion.com" className="text-[#e51975] hover:underline">support@featherhutfashion.com</a>), and phone number (<a href="tel:9980815269" className="text-gray-800 hover:text-[#e51975]">9980815269</a>).
                    </li>
                    <li>
                      <strong>Payment Information:</strong> Payment transactions are processed securely through trusted third-party payment gateways. We do not store full credit card numbers or sensitive payment authentication credentials on our servers.
                    </li>
                    <li>
                      <strong>Device &amp; Usage Information:</strong> When you visit our website, we automatically collect certain technical data, including your IP address, browser type, operating system, referring pages, pages viewed, and access times.
                    </li>
                    <li>
                      <strong>Cookies &amp; Tracking Data:</strong> We use cookies and similar tracking technologies to analyze trends, administer the website, track users&apos; movements around the site, and gather broad demographic information.
                    </li>
                  </ul>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 text-xs">2. How We Use Your Information</h5>
                  <p className="text-gray-600 mt-1">We use the collected information for various business purposes, including to:</p>
                  <ul className="list-disc pl-5 space-y-1 text-gray-600 mt-1.5">
                    <li>Process, fulfill, and manage your orders and shipments.</li>
                    <li>Communicate with you regarding order updates, customer service requests, and inquiries.</li>
                    <li>Improve and optimize our website, products, and overall customer experience.</li>
                    <li>Send periodic promotional emails or newsletters (you may opt out at any time).</li>
                    <li>Detect, prevent, and address fraud, technical issues, or unauthorized activities.</li>
                  </ul>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 text-xs">3. Sharing Your Information</h5>
                  <p className="text-gray-600 mt-1 leading-relaxed">
                    We respect your privacy and do not sell, rent, or trade your personal information to third parties. We only share your data with trusted entities under the following circumstances:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-gray-600 mt-1.5">
                    <li>
                      <strong>Service Providers:</strong> We share necessary details with third-party logistics partners (couriers/delivery services), payment gateways, and IT support providers to fulfill your order.
                    </li>
                    <li>
                      <strong>Legal Requirements:</strong> We may disclose your information if required to do so by law or in response to valid legal requests by public authorities.
                    </li>
                    <li>
                      <strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, customer information may be transferred as a business asset.
                    </li>
                  </ul>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 text-xs">4. Cookies and Web Beacons</h5>
                  <p className="text-gray-600 mt-1 leading-relaxed">
                    Like most interactive websites, Feather Hut Fashion uses cookies to remember your preferences and optimize your browsing experience. You can choose to disable cookies through your individual browser options, though doing so may affect the functionality of certain parts of our website.
                  </p>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 text-xs">5. Data Security</h5>
                  <p className="text-gray-600 mt-1 leading-relaxed">
                    We implement reasonable security measures to protect your personal information from unauthorized access, loss, misuse, or alteration. However, please note that no method of transmission over the Internet or electronic storage is 100% secure.
                  </p>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 text-xs">6. Your Rights</h5>
                  <p className="text-gray-600 mt-1">Depending on your location, you may have the right to:</p>
                  <ul className="list-disc pl-5 space-y-1 text-gray-600 mt-1.5">
                    <li>Access the personal data we hold about you.</li>
                    <li>Request corrections to any inaccurate or incomplete data.</li>
                    <li>Request the deletion of your personal data.</li>
                    <li>Opt out of marketing communications at any time.</li>
                  </ul>
                  <p className="text-gray-600 mt-1.5">To exercise any of these rights, please reach out using the contact information below.</p>
                </div>

                <div className="bg-pink-50/70 p-3.5 rounded-xl border border-pink-100 mt-2">
                  <h5 className="font-bold text-pink-950 text-xs">7. Contact Us</h5>
                  <p className="text-gray-600 mt-1">If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us at:</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <p><strong>Email:</strong> <a href="mailto:support@featherhutfashion.com" className="text-[#e51975] hover:underline font-semibold">support@featherhutfashion.com</a></p>
                    <p><strong>Phone:</strong> <a href="tel:9980815269" className="text-gray-800 hover:text-[#e51975] font-semibold">9980815269</a></p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'refund' && (
            <div className="space-y-4 text-gray-700">
              <div className="border-b border-pink-100 pb-2">
                <h4 className="font-extrabold text-base text-pink-950">Refund, Return &amp; Replacement Policy</h4>
                <p className="text-gray-500 text-[11px] mt-0.5">Feather Hut Fashion Customer Satisfaction &amp; Returns Guidelines</p>
              </div>

              <div className="space-y-3.5 pt-1">
                <div>
                  <h5 className="font-bold text-gray-900 text-xs">1. Return Window</h5>
                  <p className="text-gray-600 mt-1 leading-relaxed">
                    You can initiate a return or replacement request within the 2-day return window following the delivery of your order.
                  </p>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 text-xs">2. Refund Policy (7 Days Processing)</h5>
                  <p className="text-gray-600 mt-1 leading-relaxed">
                    Once your return is received and inspected at our warehouse:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-gray-600 mt-1.5">
                    <li>
                      <strong>Notification:</strong> We will notify you via email or SMS regarding the approval or rejection of your refund based on the condition of the item.
                    </li>
                    <li>
                      <strong>Processing Time:</strong> If approved, your refund will be credited back to your original payment method within 7 business days.
                    </li>
                    <li>
                      <strong>COD Orders:</strong> For Cash on Delivery (COD) orders, refunds will be issued via bank transfer/UPI details provided during the return request process.
                    </li>
                  </ul>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 text-xs">3. Replacement Policy (7 Days Delivery)</h5>
                  <p className="text-gray-600 mt-1 leading-relaxed">
                    If you received a damaged, defective, or incorrect product, or if you need a size exchange:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-gray-600 mt-1.5">
                    <li>
                      <strong>Reporting:</strong> You must notify us within the 2-day return window of delivery.
                    </li>
                    <li>
                      <strong>Delivery Timeframe:</strong> Once the replacement request is approved and the returned item is inspected, we will dispatch and deliver your replacement item within 7 business days.
                    </li>
                    <li>
                      <strong>Stock Availability:</strong> If the replacement item or requested size is out of stock, we will issue a full refund within 7 business days instead.
                    </li>
                  </ul>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 text-xs">4. Non-Returnable Items</h5>
                  <p className="text-gray-600 mt-1">For hygiene and safety reasons, the following items cannot be returned or replaced:</p>
                  <ul className="list-disc pl-5 space-y-1 text-gray-600 mt-1.5">
                    <li>Items marked as &quot;Final Sale&quot; or purchased during clearout events.</li>
                    <li>Items without original tags or showing signs of wear/wash.</li>
                  </ul>
                </div>

                <div className="bg-pink-50/70 p-3.5 rounded-xl border border-pink-100 mt-2">
                  <h5 className="font-bold text-pink-950 text-xs">5. Contact Us</h5>
                  <p className="text-gray-600 mt-1">For any queries or assistance regarding returns, refunds, or replacements, please contact our support team:</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <p><strong>Email:</strong> <a href="mailto:support@featherhutfashion.com" className="text-[#e51975] hover:underline font-semibold">support@featherhutfashion.com</a></p>
                    <p><strong>Phone:</strong> <a href="tel:9980815269" className="text-gray-800 hover:text-[#e51975] font-semibold">9980815269</a></p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="space-y-4 text-gray-700">
              <div className="border-b border-pink-100 pb-2">
                <h4 className="font-extrabold text-base text-pink-950">Shipping &amp; Delivery Policy</h4>
                <p className="text-gray-500 text-[11px] mt-0.5">At Feather Hut Fashion (<a href="https://featherhutfashion.com/" target="_blank" rel="noopener noreferrer" className="text-[#e51975] hover:underline font-semibold">https://featherhutfashion.com/</a>)</p>
              </div>

              <p className="leading-relaxed">
                At Feather Hut Fashion (<a href="https://featherhutfashion.com/" target="_blank" rel="noopener noreferrer" className="text-[#e51975] hover:underline font-semibold">https://featherhutfashion.com/</a>), we are committed to delivering your order accurately, in good condition, and on time. This Shipping &amp; Delivery Policy explains the terms, conditions, and timelines associated with shipping your orders.
              </p>

              <div className="space-y-3.5 pt-1">
                <div>
                  <h5 className="font-bold text-gray-900 text-xs">1. Order Processing Time</h5>
                  <p className="text-gray-600 mt-1 leading-relaxed">
                    All orders are processed within 1 to 2 business days (excluding Sundays and national holidays) after receiving your order confirmation email.
                  </p>
                  <p className="text-gray-600 mt-1 leading-relaxed">
                    Orders placed before 2:00 PM are typically dispatched on the same business day. Orders placed after 2:00 PM or on non-business days will be dispatched on the next working day.
                  </p>
                  <p className="text-gray-600 mt-1 leading-relaxed">
                    You will receive a shipment notification email containing a tracking number once your package has been handed over to our courier partner.
                  </p>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 text-xs">2. Estimated Delivery Timelines</h5>
                  <p className="text-gray-600 mt-1">Once dispatched, estimated delivery timelines depend on your location:</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-gray-600 mt-1.5">
                    <li>
                      <strong>Metro Cities (Delhi NCR, Mumbai, Bengaluru, Chennai, Kolkata, Hyderabad, etc.):</strong> 2 to 4 business days.
                    </li>
                    <li>
                      <strong>Rest of India (Tier-2 &amp; Tier-3 cities, regional towns):</strong> 4 to 7 business days.
                    </li>
                    <li>
                      <strong>Special Regions (Jammu &amp; Kashmir, North-East India, Andaman &amp; Nicobar):</strong> 7 to 10 business days.
                    </li>
                  </ul>
                  <p className="text-gray-500 text-[11px] mt-1.5 italic">
                    Note: Delivery times are estimates and may occasionally vary due to external factors such as extreme weather, courier disruptions, or peak festive seasons.
                  </p>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 text-xs">3. Shipping Charges</h5>
                  <ul className="list-disc pl-5 space-y-1.5 text-gray-600 mt-1">
                    <li>
                      <strong>100% Free Shipping on All Orders:</strong> Zero shipping or delivery charges on all products nationwide, with no minimum order value (including items under ₹1,000).
                    </li>
                    <li>
                      <strong>Cash on Delivery (COD):</strong> COD is available for eligible pincodes with zero extra charges.
                    </li>
                  </ul>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 text-xs">4. Order Tracking</h5>
                  <p className="text-gray-600 mt-1 leading-relaxed">
                    Once your order is shipped, you will receive an email and SMS with your Tracking Number (AWB) and direct tracking link. You can use this to monitor the real-time status of your shipment.
                  </p>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 text-xs">5. Delivery Attempts &amp; Failed Delivery</h5>
                  <ul className="list-disc pl-5 space-y-1 text-gray-600 mt-1">
                    <li>Our courier partners will attempt to deliver your package up to 3 times.</li>
                    <li>If you are unavailable to accept the parcel after 3 attempts, the package will be returned to our central warehouse (Return to Origin).</li>
                    <li>In the case of a failed delivery due to an incorrect address or customer unavailability, re-shipping charges may apply.</li>
                  </ul>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 text-xs">6. Damaged or Missing Shipments</h5>
                  <ul className="list-disc pl-5 space-y-1.5 text-gray-600 mt-1">
                    <li>
                      <strong>Damaged Packages:</strong> If the outer packaging appears physically damaged or tampered with upon delivery, please do not accept the package or take photos before opening it.
                    </li>
                    <li>
                      <strong>Reporting:</strong> Contact us within 48 hours (2 days) of delivery at <a href="mailto:support@featherhutfashion.com" className="text-[#e51975] hover:underline">support@featherhutfashion.com</a> or <a href="tel:9980815269" className="text-gray-800 hover:text-[#e51975]">9980815269</a> with photos/videos of the package and your Order ID so we can resolve the issue immediately.
                    </li>
                  </ul>
                </div>

                <div className="bg-pink-50/70 p-3.5 rounded-xl border border-pink-100 mt-2">
                  <h5 className="font-bold text-pink-950 text-xs">7. Contact Us</h5>
                  <p className="text-gray-600 mt-1">For any questions regarding your shipment status or delivery updates, please contact our support team:</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <p><strong>Email:</strong> <a href="mailto:support@featherhutfashion.com" className="text-[#e51975] hover:underline font-semibold">support@featherhutfashion.com</a></p>
                    <p><strong>Phone:</strong> <a href="tel:9980815269" className="text-gray-800 hover:text-[#e51975] font-semibold">9980815269</a></p>
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
