import React, { useState } from 'react';
import { X, Ruler, Lightbulb, Check, Info } from 'lucide-react';

interface SizeChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: string;
}

export const SizeChartModal: React.FC<SizeChartModalProps> = ({
  isOpen,
  onClose,
  category = 'Kurti'
}) => {
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const [activeTab, setActiveTab] = useState<'apparel' | 'tips'>('apparel');

  if (!isOpen) return null;

  const standardSizesInches = [
    { size: 'XS', bust: '34"', waist: '28"', hip: '36"', shoulder: '13.5"', length: '44"' },
    { size: 'S', bust: '36"', waist: '30"', hip: '38"', shoulder: '14.0"', length: '45"' },
    { size: 'M', bust: '38"', waist: '32"', hip: '40"', shoulder: '14.5"', length: '45"' },
    { size: 'L', bust: '40"', waist: '34"', hip: '42"', shoulder: '15.0"', length: '46"' },
    { size: 'XL', bust: '42"', waist: '36"', hip: '44"', shoulder: '15.5"', length: '46"' },
    { size: 'XXL', bust: '44"', waist: '38"', hip: '46"', shoulder: '16.0"', length: '47"' },
    { size: 'XXXL', bust: '46"', waist: '40"', hip: '48"', shoulder: '16.5"', length: '47"' },
    { size: 'Free Size', bust: '34" - 44"', waist: 'Adjustable', hip: 'Flexible', shoulder: 'Standard', length: '45"' }
  ];

  const standardSizesCm = [
    { size: 'XS', bust: '86 cm', waist: '71 cm', hip: '91 cm', shoulder: '34 cm', length: '112 cm' },
    { size: 'S', bust: '91 cm', waist: '76 cm', hip: '96 cm', shoulder: '35 cm', length: '114 cm' },
    { size: 'M', bust: '96 cm', waist: '81 cm', hip: '101 cm', shoulder: '37 cm', length: '114 cm' },
    { size: 'L', bust: '101 cm', waist: '86 cm', hip: '106 cm', shoulder: '38 cm', length: '117 cm' },
    { size: 'XL', bust: '106 cm', waist: '91 cm', hip: '111 cm', shoulder: '39 cm', length: '117 cm' },
    { size: 'XXL', bust: '112 cm', waist: '96 cm', hip: '117 cm', shoulder: '41 cm', length: '119 cm' },
    { size: 'XXXL', bust: '117 cm', waist: '101 cm', hip: '122 cm', shoulder: '42 cm', length: '119 cm' },
    { size: 'Free Size', bust: '86 - 112 cm', waist: 'Adjustable', hip: 'Flexible', shoulder: 'Standard', length: '114 cm' }
  ];

  const currentChart = unit === 'in' ? standardSizesInches : standardSizesCm;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-pink-200 overflow-hidden relative max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200 text-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-pink-950 via-pink-900 to-amber-950 text-amber-100 px-5 py-4 flex items-center justify-between border-b border-amber-300/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300">
              <Ruler className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-amber-100 font-serif leading-tight">
                Size Chart & Fit Guide
              </h3>
              <p className="text-[11px] text-amber-200/80">
                Standard Measurements for {category} & Ethnic Wear
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/15 rounded-full text-amber-200 transition-colors shrink-0 active:scale-95 cursor-pointer"
            aria-label="Close size guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-bar Controls: Unit Switch & Tabs */}
        <div className="bg-pink-50/80 px-5 py-3 border-b border-pink-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-pink-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('apparel')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'apparel'
                  ? 'bg-pink-900 text-amber-200 shadow-xs'
                  : 'text-gray-600 hover:text-pink-900'
              }`}
            >
              Size Table
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tips')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'tips'
                  ? 'bg-pink-900 text-amber-200 shadow-xs'
                  : 'text-gray-600 hover:text-pink-900'
              }`}
            >
              How to Measure
            </button>
          </div>

          {activeTab === 'apparel' && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
              <span className="text-[11px] text-gray-500 font-medium">Unit:</span>
              <div className="inline-flex rounded-lg border border-pink-300 overflow-hidden bg-white p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setUnit('in')}
                  className={`px-2.5 py-0.5 text-xs font-bold rounded-md transition-colors ${
                    unit === 'in'
                      ? 'bg-pink-900 text-amber-200'
                      : 'text-gray-600 hover:text-pink-900'
                  }`}
                >
                  Inches
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('cm')}
                  className={`px-2.5 py-0.5 text-xs font-bold rounded-md transition-colors ${
                    unit === 'cm'
                      ? 'bg-pink-900 text-amber-200'
                      : 'text-gray-600 hover:text-pink-900'
                  }`}
                >
                  CM
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'apparel' ? (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-pink-200 shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gradient-to-r from-pink-950 to-pink-900 text-amber-200 uppercase font-black tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Size</th>
                      <th className="p-3">Bust</th>
                      <th className="p-3">Waist</th>
                      <th className="p-3">Hip</th>
                      <th className="p-3">Shoulder</th>
                      <th className="p-3">Standard Length</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pink-100 bg-white">
                    {currentChart.map((row, idx) => (
                      <tr
                        key={row.size}
                        className={`transition-colors hover:bg-pink-50/60 ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-pink-50/20'
                        }`}
                      >
                        <td className="p-3 font-extrabold text-pink-950 font-mono">
                          <span className="bg-pink-100 text-pink-900 px-2 py-0.5 rounded-md border border-pink-200">
                            {row.size}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-gray-800">{row.bust}</td>
                        <td className="p-3 font-medium text-gray-700">{row.waist}</td>
                        <td className="p-3 font-medium text-gray-700">{row.hip}</td>
                        <td className="p-3 font-medium text-gray-700">{row.shoulder}</td>
                        <td className="p-3 font-semibold text-pink-900">{row.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-950">
                <Lightbulb className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Pro Sizing Tip for Ethnic Apparel:</p>
                  <p className="text-[11px] text-amber-900/90 mt-0.5">
                    If your measurements fall between two sizes, we recommend choosing the larger size for a relaxed, graceful silhouette or for custom alterations.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100 space-y-1.5">
                  <span className="font-bold text-pink-950 uppercase text-[11px] flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-pink-700" />
                    <span>1. Bust / Chest</span>
                  </span>
                  <p className="text-gray-600 text-[11px] leading-relaxed">
                    Measure around the fullest part of your bust, keeping the measuring tape comfortably snug and parallel to the floor.
                  </p>
                </div>

                <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100 space-y-1.5">
                  <span className="font-bold text-pink-950 uppercase text-[11px] flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-pink-700" />
                    <span>2. Natural Waist</span>
                  </span>
                  <p className="text-gray-600 text-[11px] leading-relaxed">
                    Measure around your natural waistline, which is typically the narrowest point of your torso above your belly button.
                  </p>
                </div>

                <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100 space-y-1.5">
                  <span className="font-bold text-pink-950 uppercase text-[11px] flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-pink-700" />
                    <span>3. Hips</span>
                  </span>
                  <p className="text-gray-600 text-[11px] leading-relaxed">
                    Stand with your feet together and measure around the fullest part of your hips and seat area.
                  </p>
                </div>

                <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100 space-y-1.5">
                  <span className="font-bold text-pink-950 uppercase text-[11px] flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-pink-700" />
                    <span>4. Garment Length</span>
                  </span>
                  <p className="text-gray-600 text-[11px] leading-relaxed">
                    Measured straight from the highest shoulder seam down to the bottom hemline of the kurti or dress.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-pink-100/60 rounded-2xl border border-pink-200 flex items-center gap-2 text-pink-950 text-xs">
                <Info className="w-4 h-4 text-pink-800 shrink-0" />
                <span>All our garments are crafted with tailored seam margins for easy custom adjustments.</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-pink-950 hover:bg-pink-900 text-amber-200 font-bold text-xs rounded-xl transition-all shadow-xs"
          >
            Got It, Close
          </button>
        </div>
      </div>
    </div>
  );
};
