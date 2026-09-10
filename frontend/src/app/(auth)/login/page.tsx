'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import {
  Lock,
  Mail,
  ArrowRight,
  UserCheck,
  Shield,
  Sparkles,
  Eye,
  EyeOff,
  ShieldCheck,
  Clock,
  MapPin,
  HeartPulse,
} from 'lucide-react';



export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      showToast('Please enter both email/username and password', 'warning', 'Validation Error');
      return;
    }

    setIsLoading(true);
    try {
      await login(identifier.trim(), password);
      showToast('Login successful! Directing to workspace...', 'success');
    } catch (err: any) {
      let msg = 'Invalid login credentials';
      if (err.response?.data?.error?.message) {
        msg = err.response.data.error.message;
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        msg = 'Unable to connect to backend server. Please check your network or NEXT_PUBLIC_API_URL.';
      } else if (err.message) {
        msg = err.message;
      }
      showToast(msg, 'error', 'Authentication Failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row overflow-hidden font-sans">
      
      {/* =========================================================================
          LEFT HALF: 50% - ROYAL VIOLET TONE
      ========================================================================= */}
      <div className="w-full lg:w-1/2 min-h-full bg-gradient-to-br from-[#240C4F] via-[#350F70] to-[#481894] text-white flex flex-col justify-between p-6 sm:p-10 lg:p-14 relative overflow-hidden">
        {/* Subtle Decorative Ambient Glows */}
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-0 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Top Logo & Clinic Name */}
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4 select-none">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-xl border-2 border-amber-400/80 bg-white p-1 shrink-0 hover:scale-105 transition-transform duration-300">
              <Image
                src="/ewa-derma-logo.jpg"
                alt="Ewa Derma Clinic Logo"
                width={80}
                height={80}
                className="w-full h-full object-cover rounded-xl"
                priority
              />
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black font-serif text-white tracking-tight">
                EWA DERMA
              </h2>
              <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-amber-300">
                Skin • Hair • Aesthetic Clinic
              </p>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-purple-200">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Hazratganj, Lucknow, UP</span>
              </div>
            </div>
          </div>

          {/* Sparkle Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: '8s' }} />
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              Clinical Management Portal
            </span>
          </div>

          {/* Big Headline */}
          <div className="space-y-3 pt-2">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-serif tracking-tight leading-none text-white drop-shadow-md">
              WELCOME{' '}
              <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-yellow-100 bg-clip-text text-transparent">
                BACK
              </span>
            </h1>

            <p className="text-xs sm:text-sm lg:text-base text-purple-100/90 font-normal leading-relaxed max-w-lg">
              Sign in with your staff credentials to access your clinical desk, OPD appointments, pharmacy inventory, and billing records.
            </p>
          </div>
        </div>

        {/* Feature Badges & Operating Hours */}
        <div className="relative z-10 pt-8 mt-6 border-t border-white/15 space-y-2.5">
          <div className="flex items-center gap-2.5 text-xs text-purple-100/90">
            <div className="p-1.5 rounded-lg bg-white/10 text-amber-300">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span>Role-Based Access Control (RBAC) & 256-Bit SSL Encrypted</span>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-purple-100/90">
            <div className="p-1.5 rounded-lg bg-white/10 text-emerald-300">
              <HeartPulse className="w-3.5 h-3.5" />
            </div>
            <span>Live OPD Queue Desk, Digital Prescriptions & Invoicing</span>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-purple-100/90">
            <div className="p-1.5 rounded-lg bg-white/10 text-yellow-300">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <span>Clinic Hours: 10:00 AM – 7:00 PM (7 Days a Week)</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          RIGHT HALF: 50% - WARM TONE (SECURE CLINICAL LOGIN FORM)
      ========================================================================= */}
      <div className="w-full lg:w-1/2 min-h-full bg-gradient-to-br from-[#FFFDF9] via-[#FAF4E8] to-[#F5ECE0] text-stone-900 flex flex-col justify-between p-6 sm:p-10 lg:p-14 relative">
        {/* Soft Warm Ambient Lights */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-amber-200/30 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-orange-100/40 blur-3xl pointer-events-none" />

        <div className="relative z-10 my-auto w-full max-w-md mx-auto">
          {/* Main Login Card */}
          <div className="rounded-2xl bg-white shadow-xl border border-amber-200/80 overflow-hidden">
            {/* Header Bar */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-purple-800 via-indigo-900 to-purple-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-amber-300 shadow-xs shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                    Staff Portal Sign In
                  </h3>
                  <p className="text-[11px] text-purple-200 font-medium">
                    Ewa Derma Clinic Management System
                  </p>
                </div>
              </div>
              <ShieldCheck className="w-5 h-5 text-amber-400/90 shrink-0" />
            </div>

            {/* Form Body */}
            <div className="p-6 sm:p-8 space-y-5">
              <div>
                <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  Account Authentication
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Enter your assigned staff email or username to access your workspace.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email / Username Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 tracking-wide uppercase">
                    Email / Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. admin@ewaderma.com or dr.sharma"
                      required
                      autoComplete="username"
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-stone-300 bg-stone-50/70 text-sm font-semibold text-stone-900 focus:bg-white focus:ring-2 focus:ring-purple-200 focus:border-purple-600 focus:outline-none transition-all shadow-inner"
                    />
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 tracking-wide uppercase">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      className="w-full h-11 pl-10 pr-11 rounded-xl border border-stone-300 bg-stone-50/70 text-sm font-semibold text-stone-900 focus:bg-white focus:ring-2 focus:ring-purple-200 focus:border-purple-600 focus:outline-none transition-all shadow-inner"
                    />
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 p-1 rounded-md text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 mt-2 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white font-bold text-sm shadow-md shadow-purple-600/20 hover:shadow-lg hover:shadow-purple-600/30 transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <>
                      <span>Sign In to Clinical Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Security & Roles Info */}
              <div className="pt-4 border-t border-stone-100 text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Authorized Personnel Only • 256-Bit SSL Protected</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 pt-4 text-center sm:text-right text-[11px] text-stone-500 font-medium">
          <span>Phone: +91 9120854977 • Ewa Derma Clinic Management System</span>
        </div>
      </div>
    </div>
  );
}
