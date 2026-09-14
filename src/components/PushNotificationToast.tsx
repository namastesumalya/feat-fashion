import React, { useState, useEffect } from 'react';
import { Bell, X, Package } from 'lucide-react';
import { PushNotification } from '../types';

interface PushNotificationToastProps {
  notifications: PushNotification[];
  onOpenDashboard: () => void;
}

export const PushNotificationToast: React.FC<PushNotificationToastProps> = ({
  notifications,
  onOpenDashboard
}) => {
  const [activeToast, setActiveToast] = useState<PushNotification | null>(null);
  const [shownIds, setShownIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      // Only pop up if unread and hasn't been shown in this session yet
      if (!latest.read && !shownIds.has(latest.id)) {
        setShownIds(prev => new Set(prev).add(latest.id));
        setActiveToast(latest);

        const timer = setTimeout(() => {
          setActiveToast(null);
        }, 5000);

        return () => clearTimeout(timer);
      }
    }
  }, [notifications, shownIds]);

  if (!activeToast) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-gradient-to-r from-pink-900 to-amber-900 text-amber-100 rounded-2xl p-4 shadow-2xl border border-amber-300/40 animate-in slide-in-from-bottom duration-300 flex items-start gap-3">
      <div className="p-2 bg-amber-400 text-pink-950 rounded-xl shrink-0 mt-0.5">
        <Bell className="w-4 h-4 animate-bounce" />
      </div>

      <div className="flex-1 text-xs space-y-1">
        <p className="font-extrabold text-amber-200">{activeToast.title}</p>
        <p className="text-amber-100/90 leading-snug">{activeToast.message}</p>
        <button
          onClick={() => {
            onOpenDashboard();
            setActiveToast(null);
          }}
          className="text-[11px] font-bold text-amber-300 underline block pt-1 hover:text-amber-100"
        >
          View in Orders Dashboard →
        </button>
      </div>

      <button
        onClick={() => setActiveToast(null)}
        className="p-1 text-amber-200 hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
