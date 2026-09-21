import React, { useState } from 'react';
import { X, Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2, ShieldCheck, Gift, Sparkles } from 'lucide-react';
import { 
  auth, 
  signInWithGoogle, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  userDb
} from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { isSilentAuthCancellation, getCleanAuthErrorMessage } from '../utils/authErrors';
import { getPendingReferralCode, linkReferralCode } from '../services/referralService';
import { triggerFeatherAnimation } from './FloatingFeatherAnimation';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: any) => void;
  intentTitle?: string;
  intentSubtitle?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, intentTitle, intentSubtitle }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState(() => getPendingReferralCode() || '');
  const [showReferralInput, setShowReferralInput] = useState(() => Boolean(getPendingReferralCode()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setError(null);
    setSuccessMessage(null);
    setEmail('');
    setPassword('');
    setFullName('');
    setReferralCode(getPendingReferralCode() || '');
  };

  const handleSwitchMode = (newMode: 'signin' | 'signup' | 'forgot') => {
    resetState();
    setMode(newMode);
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        const pendingRef = getPendingReferralCode();
        let bonusCredited = false;
        if (pendingRef) {
          try {
            const linkRes = await linkReferralCode(user.uid, user.email || '', pendingRef);
            if (linkRes.success && (linkRes.feathersAwarded || 0) > 0) {
              bonusCredited = true;
              triggerFeatherAnimation({
                featherCount: 25,
                durationMs: 3500,
                label: '✨ +40 Magic Feathers (₹20 OFF) Credited! ✨'
              });
            }
          } catch (_) {}
        }

        setSuccessMessage(bonusCredited
          ? `Welcome to Feat! 40 Magic Feathers (₹20 OFF) credited for your orders!`
          : `Welcome back, ${user.displayName || 'Valued Visitor'}!`
        );
        setTimeout(() => {
          if (onSuccess) onSuccess(user);
          onClose();
          resetState();
        }, 1300);
      }
      // If user is null (popup was closed/cancelled by user), do nothing cleanly without displaying any error banner
    } catch (err: any) {
      if (!isSilentAuthCancellation(err)) {
        const cleanMsg = getCleanAuthErrorMessage(err);
        if (cleanMsg) {
          setError(cleanMsg);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Email/Password Sign-In & Sign-Up
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        setSuccessMessage(`Welcome back, ${user.displayName || user.email}!`);
        setTimeout(() => {
          if (onSuccess) onSuccess(user);
          onClose();
          resetState();
        }, 1200);
      } else if (mode === 'signup') {
        if (!fullName.trim()) {
          setError('Please enter your full name');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password should be at least 6 characters long');
          setLoading(false);
          return;
        }

        const cleanRef = (referralCode || getPendingReferralCode() || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update display name
        await updateProfile(user, { displayName: fullName });

        // Save new user profile to featdb-user Firestore
        try {
          if (userDb) {
            await setDoc(doc(userDb, 'users', user.uid), {
              uid: user.uid,
              email: user.email || '',
              displayName: fullName,
              referredByCode: cleanRef || null,
              createdAt: new Date().toISOString(),
              provider: 'password'
            }, { merge: true });
          }
        } catch (dbErr) {
          console.log('Firestore user doc write notice:', dbErr);
        }

        // Link referral code to credit ₹20 worth of magic feathers (40 feathers)
        let bonusCredited = false;
        if (cleanRef) {
          try {
            const linkRes = await linkReferralCode(user.uid, user.email || '', cleanRef);
            if (linkRes.success && (linkRes.feathersAwarded || 0) > 0) {
              bonusCredited = true;
              triggerFeatherAnimation({
                featherCount: 25,
                durationMs: 3500,
                label: '✨ +40 Magic Feathers (₹20 OFF) Credited! ✨'
              });
            }
          } catch (_) {}
        }

        setSuccessMessage(bonusCredited
          ? `Account created! You received 40 Magic Feathers worth ₹20 to use for discounts on any order!`
          : `Account created successfully! Welcome to Feat, ${fullName}.`
        );
        setTimeout(() => {
          if (onSuccess) onSuccess(user);
          onClose();
          resetState();
        }, 1400);
      } else if (mode === 'forgot') {
        if (!email.trim()) {
          setError('Please enter your registered email address');
          setLoading(false);
          return;
        }
        await sendPasswordResetEmail(auth, email);
        setSuccessMessage('Password reset link sent to your email address!');
        setTimeout(() => {
          setMode('signin');
          setError(null);
        }, 3000);
      }
    } catch (err: any) {
      if (!isSilentAuthCancellation(err)) {
        const msg = getCleanAuthErrorMessage(err);
        if (msg) {
          setError(msg);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-pink-200 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Header Pattern */}
        <div className="bg-gradient-to-r from-pink-950 via-pink-900 to-amber-950 p-6 text-amber-100 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-amber-200 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 mb-2">
            <img
              src="/logo.png"
              alt="Feat Logo"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain bg-white/95 p-1 border border-amber-300 shadow-sm shrink-0"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="text-xl font-extrabold tracking-tight font-serif text-amber-200">
              Feat Visitor Portal
            </span>
          </div>

          <p className="text-xs text-amber-100/90 leading-relaxed font-medium">
            {intentSubtitle || (
              <>
                {mode === 'signin' && 'Sign in to access your orders, track deliveries, and save wishlist items.'}
                {mode === 'signup' && 'Create your Feat Couture account to enjoy personalized shopping and fast checkout.'}
                {mode === 'forgot' && 'Enter your registered email to receive a password reset link.'}
              </>
            )}
          </p>
        </div>

        {/* Intent Highlight Banner (e.g. PhonePe Buy Now) */}
        {intentTitle && (
          <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 border-b border-purple-200/80 px-4 py-2.5 flex items-center gap-2.5 text-xs text-purple-950">
            <div className="w-6 h-6 rounded-lg bg-[#5f259f] text-white flex items-center justify-center font-bold text-[11px] shrink-0 shadow-sm">
              पे
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-purple-900 leading-tight">{intentTitle}</p>
              <p className="text-[10.5px] text-purple-700 font-medium">Sign in or create account to directly proceed to PhonePe Payment Gateway</p>
            </div>
          </div>
        )}

        {/* Tab Switchers (SignIn / SignUp) */}
        {mode !== 'forgot' && (
          <div className="flex border-b border-pink-100 bg-pink-50/50">
            <button
              type="button"
              onClick={() => handleSwitchMode('signin')}
              className={`flex-1 py-3 text-xs sm:text-sm font-black transition-colors border-b-2 ${
                mode === 'signin'
                  ? 'border-pink-800 text-pink-950 bg-white'
                  : 'border-transparent text-gray-500 hover:text-pink-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('signup')}
              className={`flex-1 py-3 text-xs sm:text-sm font-black transition-colors border-b-2 ${
                mode === 'signup'
                  ? 'border-pink-800 text-pink-950 bg-white'
                  : 'border-transparent text-gray-500 hover:text-pink-800'
              }`}
            >
              New Account
            </button>
          </div>
        )}

        <div className="p-6 space-y-4">

          {/* Feedback Messages */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold p-3 rounded-xl flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3 rounded-xl flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Quick Google Sign In Option */}
          {mode !== 'forgot' && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-white hover:bg-gray-50 text-gray-800 font-bold py-2.5 px-4 rounded-2xl border border-gray-300 shadow-sm flex items-center justify-center gap-3 text-xs sm:text-sm transition-all active:scale-98 disabled:opacity-50"
              >
                {/* Official Google SVG Icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-gray-200 w-full" />
                <span className="bg-white px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest absolute">
                  Or email
                </span>
              </div>
            </>
          )}

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-3">
            
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-700 font-medium"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-700 font-medium"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">Password</label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => handleSwitchMode('forgot')}
                      className="text-[11px] font-bold text-pink-700 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-700 font-medium"
                  />
                </div>
              </div>
            )}

            {/* Referral Code Field (Optional - Grants ₹20 Magic Feathers!) */}
            {mode === 'signup' && (
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                    <Gift className="w-3.5 h-3.5 text-amber-600" />
                    <span>Have a Referral Code?</span>
                  </label>
                  <span className="text-[10px] font-black text-amber-700 bg-amber-100/90 border border-amber-300/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    Get ₹20 Off
                  </span>
                </div>

                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="e.g. FRIEND20"
                    className="w-full uppercase font-mono text-xs px-3 py-1.5 bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold tracking-wider text-gray-900 placeholder:normal-case placeholder:font-sans placeholder:font-normal placeholder:tracking-normal"
                  />
                </div>
                <p className="text-[10px] text-amber-800 leading-tight">
                  🎁 Sign up using anyone's referral code to instantly receive <strong>40 Magic Feathers (₹20 discount)</strong> to spend on any order!
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-950 via-pink-900 to-amber-950 hover:from-pink-900 hover:to-pink-800 text-amber-200 font-black py-2.5 px-4 rounded-2xl text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span className="animate-pulse">Processing...</span>
              ) : (
                <>
                  <span>
                    {mode === 'signin' && 'Sign In'}
                    {mode === 'signup' && 'Create Feat Account'}
                    {mode === 'forgot' && 'Send Password Reset Link'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-amber-300" />
                </>
              )}
            </button>
          </form>

          {mode === 'forgot' && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => handleSwitchMode('signin')}
                className="text-xs font-bold text-pink-800 hover:underline"
              >
                ← Back to Sign In
              </button>
            </div>
          )}

          <div className="pt-2 text-center text-[10px] text-gray-400 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-pink-700" />
            <span>Protected by Feat & Firebase Auth Security</span>
          </div>

        </div>

      </div>
    </div>
  );
};
