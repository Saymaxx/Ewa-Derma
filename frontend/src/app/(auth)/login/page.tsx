'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import {
  Lock,
  Mail,
  ArrowRight,
  UserCheck,
  Shield,
  Stethoscope,
  Building2,
  Package,
  Sparkles,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Clock,
  MapPin,
  HeartPulse,
} from 'lucide-react';

interface RoleOption {
  id: string;
  roleName: string;
  badgeLabel: string;
  categoryTag: string;
  email: string;
  description: string;
  icon: React.ReactNode;
  themeClass: {
    bgLight: string;
    bgHover: string;
    borderColor: string;
    borderHover: string;
    iconBg: string;
    iconColor: string;
    textColor: string;
    tagBg: string;
    tagText: string;
    btnGradient: string;
    btnShadow: string;
    ringColor: string;
  };
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    id: 'ADMIN',
    roleName: 'Clinic Administrator',
    badgeLabel: 'ADMIN',
    categoryTag: 'FULL GOVERNANCE',
    email: 'admin@ewaderma.com',
    description: 'Clinic configuration, doctor rosters, staff RBAC & revenue analytics.',
    icon: <Shield className="w-6 h-6" />,
    themeClass: {
      bgLight: 'bg-purple-50/80',
      bgHover: 'hover:bg-purple-100/90',
      borderColor: 'border-purple-200',
      borderHover: 'hover:border-purple-500',
      iconBg: 'bg-purple-100 text-purple-700',
      iconColor: 'text-purple-700',
      textColor: 'text-purple-950',
      tagBg: 'bg-purple-200/80',
      tagText: 'text-purple-900',
      btnGradient: 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800',
      btnShadow: 'shadow-purple-500/20',
      ringColor: 'focus:ring-purple-200 focus:border-purple-600',
    },
  },
  {
    id: 'DOCTOR',
    roleName: 'Dermatologist / Doctor',
    badgeLabel: 'DOCTOR',
    categoryTag: 'CLINICAL SUITE',
    email: 'doctor@ewaderma.com',
    description: 'Doctor desk, live patient queue, digital prescriptions & follow-ups.',
    icon: <Stethoscope className="w-6 h-6" />,
    themeClass: {
      bgLight: 'bg-amber-50/80',
      bgHover: 'hover:bg-amber-100/90',
      borderColor: 'border-amber-200',
      borderHover: 'hover:border-amber-500',
      iconBg: 'bg-amber-100 text-amber-700',
      iconColor: 'text-amber-700',
      textColor: 'text-amber-950',
      tagBg: 'bg-amber-200/80',
      tagText: 'text-amber-900',
      btnGradient: 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700',
      btnShadow: 'shadow-amber-500/20',
      ringColor: 'focus:ring-amber-200 focus:border-amber-600',
    },
  },
  {
    id: 'RECEPTIONIST',
    roleName: 'Receptionist & Front Desk',
    badgeLabel: 'RECEPTIONIST',
    categoryTag: 'FRONT DESK',
    email: 'reception@ewaderma.com',
    description: 'Patient registrations, appointment bookings, queue check-in & billing.',
    icon: <Building2 className="w-6 h-6" />,
    themeClass: {
      bgLight: 'bg-emerald-50/80',
      bgHover: 'hover:bg-emerald-100/90',
      borderColor: 'border-emerald-200',
      borderHover: 'hover:border-emerald-500',
      iconBg: 'bg-emerald-100 text-emerald-700',
      iconColor: 'text-emerald-700',
      textColor: 'text-emerald-950',
      tagBg: 'bg-emerald-200/80',
      tagText: 'text-emerald-900',
      btnGradient: 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800',
      btnShadow: 'shadow-emerald-500/20',
      ringColor: 'focus:ring-emerald-200 focus:border-emerald-600',
    },
  },
  {
    id: 'INVENTORY_MANAGER',
    roleName: 'Pharmacy & Stock Manager',
    badgeLabel: 'INVENTORY',
    categoryTag: 'PHARMACY',
    email: 'inventory@ewaderma.com',
    description: 'Medicine catalog, stock valuation, batch expiry alerts & purchase ledger.',
    icon: <Package className="w-6 h-6" />,
    themeClass: {
      bgLight: 'bg-indigo-50/80',
      bgHover: 'hover:bg-indigo-100/90',
      borderColor: 'border-indigo-200',
      borderHover: 'hover:border-indigo-500',
      iconBg: 'bg-indigo-100 text-indigo-700',
      iconColor: 'text-indigo-700',
      textColor: 'text-indigo-950',
      tagBg: 'bg-indigo-200/80',
      tagText: 'text-indigo-900',
      btnGradient: 'bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800',
      btnShadow: 'shadow-indigo-500/20',
      ringColor: 'focus:ring-indigo-200 focus:border-indigo-600',
    },
  },
];

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('Clinic@12345');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();

  const handleSelectRole = (roleId: string) => {
    setSelectedRole(roleId);
    const selected = ROLE_OPTIONS.find((r) => r.id === roleId);
    if (selected) {
      setIdentifier(selected.email);
      setPassword('Clinic@12345');
    }
  };

  const handleBackToRoles = () => {
    setSelectedRole(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      showToast('Please enter both email and password', 'warning', 'Validation Error');
      return;
    }

    setIsLoading(true);
    try {
      await login(identifier, password);
      showToast('Login successful! Directing to workspace...', 'success');
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Invalid login credentials';
      showToast(msg, 'error', 'Authentication Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const currentRoleObj = selectedRole ? ROLE_OPTIONS.find((r) => r.id === selectedRole) : null;

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
              <img
                src="/ewa-derma-logo.jpg"
                alt="Ewa Derma Clinic Logo"
                className="w-full h-full object-cover rounded-xl"
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
              Select Your Clinical Workspace
            </span>
          </div>

          {/* Big "WHO ARE YOU?" Headline */}
          <div className="space-y-3 pt-2">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-serif tracking-tight leading-none text-white drop-shadow-md">
              WHO ARE{' '}
              <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-yellow-100 bg-clip-text text-transparent">
                YOU?
              </span>
            </h1>

            <p className="text-xs sm:text-sm lg:text-base text-purple-100/90 font-normal leading-relaxed max-w-lg">
              Choose your clinic role to enter your customized portal with role-based clinical tools & workflows.
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
          RIGHT HALF: 50% - WARM TONE (ROLES GRID & DYNAMIC LOGIN FORM)
      ========================================================================= */}
      <div className="w-full lg:w-1/2 min-h-full bg-gradient-to-br from-[#FFFDF9] via-[#FAF4E8] to-[#F5ECE0] text-stone-900 flex flex-col justify-between p-6 sm:p-10 lg:p-14 relative">
        {/* Soft Warm Ambient Lights */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-amber-200/30 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-orange-100/40 blur-3xl pointer-events-none" />

        <div className="relative z-10 my-auto w-full max-w-xl mx-auto transition-all duration-500 ease-in-out">
          {!selectedRole ? (
            /* -------------------------------------------------------------
               STATE A: 4 ROLE CARDS (WARM TONE & COMPACT BUTTONS)
            ------------------------------------------------------------- */
            <div className="space-y-4 animate-slide-up-fade">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                    Select Your Role
                  </h3>
                  <p className="text-xs text-stone-600 font-medium">
                    Click any role below to open the login form
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-900 border border-amber-300">
                  4 Workspaces
                </span>
              </div>

              {/* 4 Compact Role Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleSelectRole(role.id)}
                    className={`group text-left p-4 sm:p-4.5 rounded-2xl ${role.themeClass.bgLight} ${role.themeClass.bgHover} border ${role.themeClass.borderColor} ${role.themeClass.borderHover} shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between cursor-pointer relative overflow-hidden`}
                  >
                    <div className="space-y-2.5 w-full">
                      {/* Top Icon + Badge */}
                      <div className="flex items-center justify-between">
                        <div
                          className={`p-2.5 rounded-xl ${role.themeClass.iconBg} shadow-xs group-hover:scale-105 transition-transform`}
                        >
                          {role.icon}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${role.themeClass.tagBg} ${role.themeClass.tagText}`}
                        >
                          {role.badgeLabel}
                        </span>
                      </div>

                      {/* Role Info */}
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block">
                          {role.categoryTag}
                        </span>
                        <h4 className={`text-sm sm:text-base font-black ${role.themeClass.textColor} tracking-tight`}>
                          {role.roleName}
                        </h4>
                        <p className="text-[11px] text-stone-600 font-normal leading-snug line-clamp-2 mt-0.5">
                          {role.description}
                        </p>
                      </div>
                    </div>

                    {/* Small Button Action Pill */}
                    <div className="pt-3 mt-3 border-t border-stone-200/60 flex items-center justify-between w-full">
                      <span className="text-[11px] font-bold text-stone-700 group-hover:text-stone-900">
                        Open {role.badgeLabel}
                      </span>
                      <div className="w-6 h-6 rounded-full bg-white shadow-xs border border-stone-300 flex items-center justify-center group-hover:bg-stone-900 group-hover:text-white transition-colors">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* -------------------------------------------------------------
               STATE B: LOGIN FORM (OPENS IN RIGHT HALF WITH SMOOTH TRANSITION)
            ------------------------------------------------------------- */
            <div className="animate-slide-up-fade space-y-3.5">
              {/* Small Back Button */}
              <button
                type="button"
                onClick={handleBackToRoles}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50/80 border border-amber-200 text-xs font-bold text-stone-700 hover:text-stone-900 transition-all shadow-xs group cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>← Back to All Roles</span>
              </button>

              {/* Login Card */}
              <div className="rounded-2xl bg-white shadow-xl border border-amber-200/80 overflow-hidden">
                {/* Active Role Header Bar */}
                <div
                  className={`p-3.5 sm:p-4 ${currentRoleObj?.themeClass.btnGradient} text-white flex items-center justify-between`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-xs shrink-0">
                      {currentRoleObj?.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest bg-white/25 px-1.5 py-0.5 rounded">
                          {currentRoleObj?.badgeLabel}
                        </span>
                        <span className="text-[10px] font-medium text-white/90">
                          Selected Role
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-white tracking-tight mt-0.5">
                        {currentRoleObj?.roleName}
                      </h3>
                    </div>
                  </div>

                  <CheckCircle2 className="w-5 h-5 text-white/90 shrink-0" />
                </div>

                {/* Form Body with Compact Inputs & Buttons */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-amber-600" />
                      Sign In to {currentRoleObj?.badgeLabel} Workspace
                    </h4>
                    <p className="text-[11px] text-stone-500 font-medium">
                      Enter clinic credentials or use the demo login below.
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-3">
                    {/* Email Input */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-700 tracking-wide uppercase flex items-center justify-between">
                        <span>Email / Username</span>
                        <span className="text-[10px] text-purple-700 font-bold lowercase">
                          {currentRoleObj?.badgeLabel.toLowerCase()}
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="e.g. name@ewaderma.com"
                          required
                          className={`w-full h-10 pl-9 pr-3 rounded-xl border border-stone-300 bg-stone-50/60 text-xs sm:text-sm font-semibold text-stone-900 focus:bg-white ${currentRoleObj?.themeClass.ringColor} focus:ring-2 focus:outline-none transition-all shadow-inner`}
                        />
                        <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-700 tracking-wide uppercase flex items-center justify-between">
                        <span>Password</span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          Clinic@12345
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className={`w-full h-10 pl-9 pr-10 rounded-xl border border-stone-300 bg-stone-50/60 text-xs sm:text-sm font-semibold text-stone-900 focus:bg-white ${currentRoleObj?.themeClass.ringColor} focus:ring-2 focus:outline-none transition-all shadow-inner`}
                        />
                        <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-2.5 p-1 rounded-md text-stone-400 hover:text-stone-700 transition-colors"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Small, Compact Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`w-full h-10 mt-1 rounded-xl ${currentRoleObj?.themeClass.btnGradient} text-white font-bold text-xs sm:text-sm shadow-md ${currentRoleObj?.themeClass.btnShadow} hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 cursor-pointer`}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Verifying...</span>
                        </div>
                      ) : (
                        <>
                          <span>Sign In to {currentRoleObj?.badgeLabel}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* 1-Click Quick Role Switchers */}
                  <div className="pt-3 border-t border-stone-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        1-Click Role Switch
                      </span>
                      <button
                        type="button"
                        onClick={handleBackToRoles}
                        className="text-[10px] font-bold text-purple-700 hover:underline"
                      >
                        All Roles
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {ROLE_OPTIONS.map((r) => {
                        const isCurrent = selectedRole === r.id;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => handleSelectRole(r.id)}
                            className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                              isCurrent
                                ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-400/20'
                                : 'border-stone-200 bg-stone-50/80 hover:bg-white hover:border-stone-300'
                            }`}
                          >
                            <div className={`p-1 rounded-lg ${r.themeClass.iconBg} shrink-0`}>
                              {r.icon && React.cloneElement(r.icon as React.ReactElement, { className: 'w-3.5 h-3.5' })}
                            </div>
                            <div className="truncate">
                              <p className="text-[11px] font-bold text-stone-900 truncate">
                                {r.badgeLabel}
                              </p>
                              <p className="text-[9px] text-stone-500 font-mono truncate">
                                {r.email}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-10 pt-4 text-center sm:text-right text-[11px] text-stone-500 font-medium">
          <span>Phone: 0120-5244840 • Ewa Derma Clinic Management System</span>
        </div>
      </div>
    </div>
  );
}
