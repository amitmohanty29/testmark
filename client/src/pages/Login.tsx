import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, UserCheck, Shield } from 'lucide-react';
import { Role } from '../types';

export const Login: React.FC = () => {
  const { login, switchRole } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('officer.test@marksure.gov.in');
  const [password, setPassword] = useState('Pass@123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: Role) => {
    setLoading(true);
    setError(null);
    try {
      await switchRole(role);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-8 sm:px-6 lg:px-8 bg-parchment">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Emblem & Portal Title */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-[#006c51]/10 rounded-full flex items-center justify-center border border-[#006c51]/30 mb-3 shadow-inner">
            <ShieldCheck className="w-9 h-9 text-[#006c51]" />
          </div>
          <h2 className="text-2xl font-bold font-serif text-[#006c51] tracking-tight">
            Official Metrology Portal Login
          </h2>
          <p className="mt-1 text-xs text-gov-sand-600">
            Legal Metrology Division • Government of India
          </p>
        </div>

        {/* Notice Banner */}
        <div className="mt-6 mx-4 sm:mx-0 p-3 bg-amber-50/90 border-l-4 border-[#ff9933] text-gov-sand-800 text-xs rounded-r shadow-xs">
          <p className="font-semibold text-amber-900">Authorized Personnel Only</p>
          <p className="text-[11px] mt-0.5 text-gov-sand-700">
            Access to this system is restricted to certified Legal Metrology Officers, RRSL & NPL testing laboratories, and authorized reviewing officers.
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-4 bg-white py-6 px-4 shadow-gov-card border border-[#ded7c4] rounded sm:px-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-600 text-xs text-red-700 rounded-r flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="gov-label flex items-center justify-between">
                <span>Official Gov Email ID</span>
                <span className="text-[10px] text-gov-sand-500 font-normal lowercase">@marksure.gov.in</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gov-sand-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="gov-input pl-9"
                  placeholder="officer.test@marksure.gov.in"
                />
              </div>
            </div>

            <div>
              <label className="gov-label flex items-center justify-between">
                <span>Password / Security Key</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gov-sand-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="gov-input pl-9"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-gov-primary py-2.5 mt-2 text-sm shadow-sm"
            >
              {loading ? 'Authenticating...' : 'Sign In to MarkSure Engine'}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </button>
          </form>

          {/* Quick Demo Role Switcher Section */}
          <div className="mt-6 pt-5 border-t border-gov-sand-200">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-gov-sand-700 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#006c51]" />
                Demo Credentials (1-Click)
              </span>
              <span className="text-[10px] bg-gov-sand-200 px-1.5 py-0.5 rounded text-gov-sand-700 font-mono">
                SIH26035
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('TESTING_OFFICER')}
                disabled={loading}
                className="w-full text-left p-2.5 rounded bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-300 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-emerald-900 group-hover:text-emerald-950">
                    Testing Officer (Er. Rajesh V. Sharma)
                  </div>
                  <div className="text-[10px] text-emerald-700">
                    Can create instruments, initiate OIML tests & submit reviews
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-emerald-800 bg-white px-2 py-0.5 rounded shadow-2xs border border-emerald-200">
                  Login &rarr;
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('REVIEWING_OFFICER')}
                disabled={loading}
                className="w-full text-left p-2.5 rounded bg-blue-50/70 hover:bg-blue-100/70 border border-blue-300 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-blue-900 group-hover:text-blue-950">
                    Reviewing Officer (Dr. Sunita K. Nambiar)
                  </div>
                  <div className="text-[10px] text-blue-700">
                    Can inspect evaluations, submit remarks & approve/certify
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-blue-800 bg-white px-2 py-0.5 rounded shadow-2xs border border-blue-200">
                  Login &rarr;
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN')}
                disabled={loading}
                className="w-full text-left p-2.5 rounded bg-amber-50/70 hover:bg-amber-100/70 border border-amber-300 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-amber-900 group-hover:text-amber-950">
                    Admin (Shri Amitabh Roy, IIS)
                  </div>
                  <div className="text-[10px] text-amber-700">
                    Full authority, lab management, and global oversight
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-amber-800 bg-white px-2 py-0.5 rounded shadow-2xs border border-amber-200">
                  Login &rarr;
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-gov-sand-500">
          OIML R-76 Standardized Legal Metrology Verification System
        </div>
      </div>
    </div>
  );
};
