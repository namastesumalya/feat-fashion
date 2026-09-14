import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export interface AlertModalState {
  isOpen: boolean;
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'info' | 'success';
}

interface CustomAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'info' | 'success';
}

export const CustomAlertModal: React.FC<CustomAlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'warning'
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-8 h-8 text-rose-600" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-emerald-600" />;
      case 'info':
        return <Info className="w-8 h-8 text-blue-600" />;
      case 'warning':
      default:
        return <AlertCircle className="w-8 h-8 text-amber-600" />;
    }
  };

  const getHeaderBg = () => {
    switch (type) {
      case 'error':
        return 'bg-rose-50 border-rose-100 text-rose-950';
      case 'success':
        return 'bg-emerald-50 border-emerald-100 text-emerald-950';
      case 'info':
        return 'bg-blue-50 border-blue-100 text-blue-950';
      case 'warning':
      default:
        return 'bg-amber-50 border-amber-100 text-amber-950';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className={`p-4 flex items-center justify-between border-b ${getHeaderBg()}`}>
          <div className="flex items-center gap-2.5">
            {getIcon()}
            <h4 className="font-extrabold text-sm font-serif">
              {title || (type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Notice')}
            </h4>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-black/5 rounded-full text-gray-500 hover:text-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 text-center sm:text-left space-y-4">
          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line font-medium">
            {message}
          </p>

          <div className="flex justify-end pt-1">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2 bg-pink-950 hover:bg-pink-900 text-amber-200 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Understand &amp; Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
