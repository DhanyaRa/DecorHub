import React, { useState } from 'react';
import { supabase, isClientSupabaseConfigured } from '../../services/supabaseClient';
import { X, User, Lock, Mail, CheckCircle2, AlertCircle, Shield, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onAuthChange: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthChange,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConfigured = isClientSupabaseConfigured();

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    if (!isConfigured || !supabase) {
      setErrorMsg('Supabase credentials are not configured yet in .env. Running in Guest / Local mode.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: displayName || email.split('@')[0],
            },
          },
        });

        if (error) throw error;
        setSuccessMsg('Account created successfully! Check your email to confirm registration or sign in.');
        onAuthChange();
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        setSuccessMsg('Signed in successfully!');
        onAuthChange();
        setTimeout(onClose, 1000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    onAuthChange();
    setSuccessMsg('Signed out successfully.');
    setTimeout(onClose, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <span className="text-[11px] font-semibold text-[#86113C] tracking-wider uppercase">
              Supabase Auth & Cloud Sync
            </span>
            <h2 className="font-serif-display text-2xl font-bold text-stone-900 mt-0.5">
              {currentUser && !currentUser.isGuest ? 'Your Account' : mode === 'login' ? 'Sign In to DecorHub' : 'Create Account'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status banner */}
        {!isConfigured ? (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Guest Workspace Active:</strong> Supabase credentials are not yet configured in your `.env`. All room designs and layouts are automatically stored locally in browser storage.
            </div>
          </div>
        ) : null}

        {/* Logged in state */}
        {currentUser && !currentUser.isGuest ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#FDF2F4] border border-[#F8C8D4] text-xs space-y-2">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                <User className="w-4 h-4 text-[#86113C]" />
                <span>{currentUser.displayName || 'Designer'}</span>
              </div>
              <div className="text-stone-600">{currentUser.email}</div>
              <div className="text-[11px] text-[#6B0E30] flex items-center gap-1 font-medium pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#86113C]" />
                <span>Authenticated via Supabase PostgreSQL</span>
              </div>
            </div>

            <div className="text-xs text-stone-500 leading-relaxed">
              Your room designs, dimensions, and custom furniture placements are synced with Row-Level Security in your private database.
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-2.5 px-4 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          /* Form for Login / Register */
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                {successMsg}
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Full Name / Display Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Aditi Sharma"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-stone-200 focus:border-[#86113C] focus:ring-1 focus:ring-[#86113C]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="designer@decorhub.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-stone-200 focus:border-[#86113C] focus:ring-1 focus:ring-[#86113C]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-stone-200 focus:border-[#86113C] focus:ring-1 focus:ring-[#86113C]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-xs font-bold text-white bg-[#86113C] hover:bg-[#700E32] active:bg-[#5A0B28] rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Free Account'}</span>
            </button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-stone-600 hover:text-[#86113C] font-semibold"
              >
                {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="text-stone-400 hover:text-stone-600"
              >
                Continue as Guest
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
