import React, { useState } from 'react';
import { 
  Lock, Mail, User, Phone, ArrowRight, ShieldCheck, CheckCircle2, 
  AlertCircle, Eye, EyeOff, Home, Sparkles, Package, HelpCircle, ArrowLeft
} from 'lucide-react';
import { 
  signInCustomer, 
  signUpCustomer, 
  signInCustomerWithGoogle, 
  resetCustomerPassword,
  CustomerSession 
} from '../services/authService';
import { isSilentAuthCancellation, getCleanAuthErrorMessage } from '../utils/authErrors';

interface AccountAuthBarrierProps {
  onAuthSuccess?: (session: CustomerSession) => void;
  onAuthenticated?: (session: CustomerSession) => void;
  onBackToHome: () => void;
  intentTitle?: string;
  intentSubtitle?: string;
}

export const AccountAuthBarrier: React.FC<AccountAuthBarrierProps> = ({
  onAuthSuccess,
  onAuthenticated,
  onBackToHome,
  intentTitle = 'Account & Order History Portal',
  intentSubtitle = 'Sign in or create your personal account to view your order history, real-time courier tracking, and saved delivery addresses.'
}) => {
  const triggerAuthCallback = (session: CustomerSession) => {
    if (onAuthSuccess) onAuthSuccess(session);
    if (onAuthenticated) onAuthenticated(session);
  };
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetMessages = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const handleSwitchMode = (newMode: 'signin' | 'signup' | 'forgot') => {
    resetMessages();
    setMode(newMode);
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    resetMessages();
    try {
      const session = await signInCustomerWithGoogle();
      if (session) {
        setSuccessMsg(`Welcome, ${session.displayName || 'Valued Patron'}! Opening your dashboard...`);
        setTimeout(() => {
          triggerAuthCallback(session);
        }, 1000);
      }
      // If session is null (popup was closed/cancelled by user), do nothing cleanly without displaying any error banner
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      if (mode === 'signin') {
        if (!email.trim() || !password) {
          setError('Please provide both your registered email address and password.');
          setLoading(false);
          return;
        }

        const session = await signInCustomer(email, password);
        setSuccessMsg(`Welcome back, ${session.displayName || session.email}! Loading your orders...`);
        setTimeout(() => {
          triggerAuthCallback(session);
        }, 1000);
      } else if (mode === 'signup') {
        if (!fullName.trim()) {
          setError('Please enter your full name.');
          setLoading(false);
          return;
        }
        if (!email.trim() || !email.includes('@')) {
          setError('Please enter a valid email address.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must contain at least 6 characters.');
          setLoading(false);
          return;
        }

        const session = await signUpCustomer(email, password, fullName, phone);
        setSuccessMsg(`Account created successfully! Welcome to Feat, ${fullName}.`);
        setTimeout(() => {
          triggerAuthCallback(session);
        }, 1200);
      } else if (mode === 'forgot') {
        if (!email.trim() || !email.includes('@')) {
          setError('Please enter your registered email address.');
          setLoading(false);
          return;
        }
        await resetCustomerPassword(email);
        setSuccessMsg('A password reset instruction link has been sent to your email address.');
        setTimeout(() => {
          setMode('signin');
          resetMessages();
        }, 3500);
      }
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

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-8 sm:py-12 bg-stone-50">
      
      {/* Return to Storefront Header Link */}
      <div className="w-full max-w-lg mb-4 flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 text-xs font-bold text-pink-900 hover:text-pink-950 bg-white hover:bg-pink-50/80 px-3.5 py-2 rounded-xl border border-pink-200/80 shadow-2xs transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Storefront</span>
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-[11px] font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Protected User Route</span>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-lg bg-white rounded-3xl border border-pink-200/90 shadow-xl overflow-hidden">
        
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-pink-950 via-pink-900 to-amber-950 text-white p-6 sm:p-7 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
            <Package className="w-44 h-44 text-amber-200" />
          </div>

          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="Feat Logo"
                className="w-8 h-8 rounded-xl object-contain bg-white/95 p-0.5 border border-amber-300/80 shadow-xs shrink-0"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-lg text-[10px] font-bold tracking-wider uppercase text-amber-300 border border-white/10">
                <Lock className="w-3 h-3" />
                <span>Feat Security Shield</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-amber-100 font-serif leading-tight">
              {intentTitle}
            </h1>
            
            <p className="text-xs sm:text-sm text-pink-200/90 leading-relaxed max-w-md">
              {intentSubtitle}
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 p-2 bg-pink-50/60 border-b border-pink-100 gap-1.5">
          <button
            type="button"
            onClick={() => handleSwitchMode('signin')}
            className={`py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mode === 'signin'
                ? 'bg-pink-900 text-amber-200 shadow-sm'
                : 'text-gray-600 hover:text-pink-900 hover:bg-white/80'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchMode('signup')}
            className={`py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mode === 'signup'
                ? 'bg-pink-900 text-amber-200 shadow-sm'
                : 'text-gray-600 hover:text-pink-900 hover:bg-white/80'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Create New Account</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7 space-y-5">
          
          {/* Status Banners */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-900 text-xs animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Authentication Notice</p>
                <p className="mt-0.5 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-900 text-xs animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Success</p>
                <p className="mt-0.5 leading-relaxed">{successMsg}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name for Signup */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:border-pink-600 focus:ring-2 focus:ring-pink-100 outline-hidden transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Email Address <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:border-pink-600 focus:ring-2 focus:ring-pink-100 outline-hidden transition-all"
                />
              </div>
            </div>

            {/* Phone Number for Signup (Optional) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>Mobile Phone Number</span>
                  <span className="text-[10px] text-gray-400 font-normal">For courier SMS updates</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:border-pink-600 focus:ring-2 focus:ring-pink-100 outline-hidden transition-all"
                  />
                </div>
              </div>
            )}

            {/* Password Field (only for signin and signup) */}
            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700">
                    Password <span className="text-rose-600">*</span>
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => handleSwitchMode('forgot')}
                      className="text-[11px] font-semibold text-pink-700 hover:text-pink-900 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Min 6 characters' : 'Enter your password'}
                    minLength={6}
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:border-pink-600 focus:ring-2 focus:ring-pink-100 outline-hidden transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-pink-900 to-pink-950 hover:from-pink-950 hover:to-stone-900 text-amber-200 text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin" />
                  <span>Verifying Account...</span>
                </>
              ) : mode === 'signin' ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Sign In &amp; Access My Orders</span>
                </>
              ) : mode === 'signup' ? (
                <>
                  <User className="w-4 h-4" />
                  <span>Create Account &amp; Access My Orders</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Send Reset Password Link</span>
                </>
              )}
            </button>
          </form>

          {/* Mode Switch Helper */}
          {mode === 'forgot' && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => handleSwitchMode('signin')}
                className="text-xs font-bold text-pink-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </button>
            </div>
          )}

          {/* Google Sign In Option */}
          {mode !== 'forgot' && (
            <div className="pt-2 space-y-3">
              <div className="relative flex items-center justify-center">
                <div className="border-t border-gray-200 w-full" />
                <span className="bg-white px-3 text-[11px] text-gray-400 font-medium uppercase tracking-wider relative z-10">
                  Or continue with
                </span>
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign In with Google</span>
              </button>
            </div>
          )}

          {/* Privacy Guarantee Footer */}
          <div className="pt-4 border-t border-gray-100 flex items-start gap-2.5 text-[11px] text-gray-500 leading-relaxed bg-pink-50/40 p-3.5 rounded-xl border border-pink-100/80">
            <ShieldCheck className="w-4 h-4 text-pink-700 shrink-0 mt-0.5" />
            <p>
              <strong className="text-pink-950 font-bold">Feather Hut Fashion Security Guarantee:</strong> Your order history, personal contact info, and delivery addresses are strictly tied to your authenticated account and are never accessible to other visitors.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
