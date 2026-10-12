'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  Database,
  ArrowRight,
  AlertCircle,
  User,
  Phone,
  MapPin,
  FileCheck2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithJwt, registerWithJwt } = useAuth();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Single Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Facility Registration State
  const [regRole, setRegRole] = useState<'HOSPITAL' | 'BLOOD_BANK'>('HOSPITAL');
  const [regOrg, setRegOrg] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDistrict, setRegDistrict] = useState('Dhaka');
  const [regLicense, setRegLicense] = useState('');

  const districts = ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh'];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError('Please enter both your official email and password.');
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    const res = await loginWithJwt(email.trim(), password);

    setIsLoading(false);
    if (res.success && res.role) {
      if (res.role === 'ADMIN') router.push('/admin');
      else if (res.role === 'HOSPITAL') router.push('/hospital');
      else router.push('/bloodbank');
    } else {
      setAuthError(res.error || 'Invalid credentials. Please verify your email and password.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regOrg || !regEmail || !regPassword || !regPhone || !regLicense) {
      setAuthError('Please fill in all mandatory facility registration fields.');
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    const res = await registerWithJwt({
      email: regEmail.trim(),
      password: regPassword,
      name: regName.trim() || `${regOrg} Official Desk`,
      organization: regOrg.trim(),
      role: regRole,
      phone: regPhone.trim(),
      district: regDistrict,
      licenseNumber: regLicense.trim(),
    });

    setIsLoading(false);
    if (res.success && res.role) {
      if (res.role === 'HOSPITAL') router.push('/hospital');
      else router.push('/bloodbank');
    } else {
      setAuthError(res.error || 'Registration failed. An account with this email may already exist.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col font-sans">
      {/* ================= TOP DARK RED BANNER (EXACT ANDROID APP THEME) ================= */}
      <div className="bg-[#C62828] text-white pt-10 pb-20 sm:pt-14 sm:pb-24 px-4 text-center relative overflow-hidden shadow-inner">
        {/* Subtle decorative glow */}
        <div className="absolute inset-0 bg-radial-gradient from-white/10 to-transparent pointer-events-none" />

        <div className="max-w-md mx-auto relative z-10 flex flex-col items-center">
          {/* Logo Card Squircle matching Android ic_app_logo_card */}
          <div className="w-24 h-24 rounded-3xl bg-white shadow-2xl flex items-center justify-center p-3 mb-4 ring-4 ring-black/5">
            <div className="relative w-full h-full">
              <Image
                src="/ic_app_logo_card.png"
                alt="BloodLink Logo"
                fill
                sizes="96px"
                priority
                className="object-contain"
              />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-xs">
            BloodLink
          </h1>
          <p className="text-base font-medium text-white/90 tracking-wide mt-1">
            Donate Blood, Save Lives
          </p>
        </div>
      </div>

      {/* ================= FLOATING MATERIAL CARD (OVERLAPPING RED BANNER) ================= */}
      <div className="flex-1 max-w-lg w-full mx-auto px-4 -mt-12 sm:-mt-14 mb-10 relative z-20">
        <div className="bg-white rounded-3xl shadow-xl border border-[#E2E8F0] p-6 sm:p-8">
          {/* Mode Switcher */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setAuthError(null);
              }}
              className={`text-sm font-extrabold pb-2 transition-all relative ${
                mode === 'LOGIN'
                  ? 'text-[#C62828] border-b-2 border-[#C62828]'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Portal Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setAuthError(null);
              }}
              className={`text-sm font-extrabold pb-2 transition-all relative ${
                mode === 'REGISTER'
                  ? 'text-[#C62828] border-b-2 border-[#C62828]'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Register Facility
            </button>
          </div>

          {/* Error Banner */}
          {authError && (
            <div className="mb-5 p-3.5 rounded-2xl bg-[#FFEBEE] border border-[#FFCDD2] text-[#B91C1C] text-xs flex items-start space-x-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#E53935] mt-0.5" />
              <div className="leading-snug">
                <span className="font-bold block">Notice:</span>
                {authError}
              </div>
            </div>
          )}

          {mode === 'LOGIN' ? (
            /* ================= SINGLE LOGIN FORM ================= */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#212121] uppercase tracking-wider mb-2">
                  Official Email Address
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. admin@bloodlink.health.bd"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-[#CBD5E1] text-xs font-semibold text-[#212121] bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E53935] focus:border-transparent transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#212121] uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 rounded-2xl border border-[#CBD5E1] text-xs font-semibold text-[#212121] bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E53935] focus:border-transparent transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center space-x-2 text-[#757575] font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#E53935] focus:ring-[#E53935] border-slate-300"
                  />
                  <span>Remember me</span>
                </label>
                <span className="text-[#E53935] font-bold text-xs hover:underline cursor-pointer">
                  Forgot Password?
                </span>
              </div>

              {/* Exact Android-Styled Primary Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-[#E53935] hover:bg-[#C62828] text-white font-extrabold text-sm shadow-md shadow-[#E53935]/30 hover:shadow-[#E53935]/40 transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Quick Preset Selector for Easy Testing */}
              <div className="pt-3 border-t border-slate-100">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  Quick Access Demo Accounts:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('admin@bloodlink.org');
                      setPassword('password123');
                    }}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    👑 Super Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('hospital@dmc.edu.bd');
                      setPassword('password123');
                    }}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#FFEBEE] hover:bg-[#FFCDD2] text-[#C62828] transition-colors cursor-pointer"
                  >
                    🏥 Hospital CMO
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('kamal.icu@dmc.edu.bd');
                      setPassword('password123');
                    }}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                  >
                    🩺 ICU Doctor (Staff)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('contact@redcrescent.org.bd');
                      setPassword('password123');
                    }}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors cursor-pointer"
                  >
                    🩸 Blood Bank Director
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('sumon.lab@redcrescent.org.bd');
                      setPassword('password123');
                    }}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                  >
                    🔬 Lab Tech (Staff)
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* ================= FACILITY REGISTRATION FORM ================= */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[#FFF3E0] border border-[#FFB74D] text-[#E65100] text-xs flex items-start space-x-2.5">
                <ShieldCheck className="w-4 h-4 text-[#E65100] shrink-0 mt-0.5" />
                <div className="leading-snug text-[11px]">
                  <strong>Medical License Onboarding:</strong> Newly registered facilities
                  are placed in the Super Admin verification queue. Once approved, nationwide
                  broadcast access is unlocked.
                </div>
              </div>

              {/* Facility Category */}
              <div>
                <label className="block text-xs font-bold text-[#212121] uppercase tracking-wider mb-1.5">
                  Facility Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegRole('HOSPITAL')}
                    className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all ${
                      regRole === 'HOSPITAL'
                        ? 'bg-[#C62828] text-white border-[#C62828] shadow-sm'
                        : 'bg-white text-[#757575] border-[#E2E8F0] hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Hospital Desk</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegRole('BLOOD_BANK')}
                    className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all ${
                      regRole === 'BLOOD_BANK'
                        ? 'bg-[#C62828] text-white border-[#C62828] shadow-sm'
                        : 'bg-white text-[#757575] border-[#E2E8F0] hover:bg-slate-50'
                    }`}
                  >
                    <Database className="w-4 h-4" />
                    <span>Blood Bank Hub</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#212121] uppercase tracking-wider mb-1">
                    Facility Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Evercare Hospital"
                      value={regOrg}
                      onChange={(e) => setRegOrg(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#212121] focus:ring-2 focus:ring-[#E53935] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#212121] uppercase tracking-wider mb-1">
                    Officer In-Charge
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Tanvir Ahmed"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#212121] focus:ring-2 focus:ring-[#E53935] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#212121] uppercase tracking-wider mb-1">
                    Official Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="desk@hospital.bd"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#212121] focus:ring-2 focus:ring-[#E53935] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#212121] uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="Min 6 characters"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#212121] focus:ring-2 focus:ring-[#E53935] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#212121] uppercase tracking-wider mb-1">
                    Hotline Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="+88017..."
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#212121] focus:ring-2 focus:ring-[#E53935] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#212121] uppercase tracking-wider mb-1">
                    District
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={regDistrict}
                      onChange={(e) => setRegDistrict(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#212121] focus:ring-2 focus:ring-[#E53935] focus:outline-none"
                    >
                      {districts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#212121] uppercase tracking-wider mb-1">
                    License / Registration No.
                  </label>
                  <div className="relative">
                    <FileCheck2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. LIC-2026-..."
                      value={regLicense}
                      onChange={(e) => setRegLicense(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#212121] focus:ring-2 focus:ring-[#E53935] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-[#C62828] hover:bg-[#B71C1C] text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting Onboarding Data...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Submit Facility Registration</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Bottom Switch Link matching Android Sign In screen */}
          <div className="text-center pt-5 mt-5 border-t border-slate-100 text-xs text-[#757575]">
            {mode === 'LOGIN' ? (
              <span>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('REGISTER')}
                  className="font-bold text-[#C62828] hover:underline cursor-pointer ml-1"
                >
                  Register Facility
                </button>
              </span>
            ) : (
              <span>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setMode('LOGIN')}
                  className="font-bold text-[#C62828] hover:underline cursor-pointer ml-1"
                >
                  Sign In
                </button>
              </span>
            )}
          </div>
        </div>

        {/* System & Security Footer */}
        <div className="mt-5 text-center text-[11px] text-[#757575] space-y-1">
          <div className="flex items-center justify-center space-x-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Secure System Access</span>
            <span>&bull;</span>
            <span>Encrypted Transmission</span>
          </div>
        </div>
      </div>
    </div>
  );
}
