import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Shield, 
  User as UserIcon, 
  LogOut, 
  ChevronRight, 
  Layers, 
  CheckCircle2, 
  Clock, 
  HelpCircle,
  Eye,
  Type
} from 'lucide-react';
import { Role } from '../../types';

export const GovHeader: React.FC = () => {
  const { user, logout, switchRole, isAuthenticated } = useAuth();
  const location = useLocation();
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(0);

  // Parse path for breadcrumb
  const pathParts = location.pathname.split('/').filter(Boolean);
  const getBreadcrumbName = (part: string, idx: number) => {
    if (part === 'instruments') return 'Instrument Registry';
    if (part === 'evaluations') return 'OIML R-76 Evaluations';
    if (part === 'passport') return 'Digital Passport Dossier';
    if (part === 'new') return 'New Registration';
    if (part === 'reports') return 'Test Reports';
    if (part === 'search') return 'National Search';
    if (part === 'login') return 'Official Login';
    return part.length > 15 ? `${part.substring(0, 14)}...` : part;
  };

  const getRoleBadge = (role?: Role) => {
    switch (role) {
      case 'TESTING_OFFICER':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded border border-emerald-300">Testing Officer</span>;
      case 'REVIEWING_OFFICER':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded border border-blue-300">Reviewing Officer</span>;
      case 'ADMIN':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded border border-amber-300">Admin</span>;
      default:
        return null;
    }
  };

  return (
    <header className="w-full bg-[#fbfaf6] border-b border-[#e5dfd1] text-gov-sand-900 select-none">
      {/* Top Accessibility & India Portal Bar */}
      <div className="bg-[#ede8dc] border-b border-[#ded7c4] px-4 py-1 text-[11px] text-gov-sand-700 flex flex-wrap items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="font-semibold tracking-wide text-gov-sand-900">भारत सरकार | Government of India</span>
          <span className="text-gov-sand-400">|</span>
          <span className="hidden sm:inline">Ministry of Consumer Affairs, Food & Public Distribution</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 bg-[#f5f2e9] px-2 py-0.5 rounded border border-[#ded7c4]">
            <Type className="w-3 h-3 text-gov-sand-600" />
            <button 
              onClick={() => {
                document.documentElement.style.fontSize = '14px';
                setFontSizeLevel(-1);
              }}
              className={`hover:text-gov-green-700 px-1 font-bold ${fontSizeLevel === -1 ? 'text-gov-green-700 underline' : ''}`}
              title="Standard Font Size"
            >
              A-
            </button>
            <button 
              onClick={() => {
                document.documentElement.style.fontSize = '16px';
                setFontSizeLevel(0);
              }}
              className={`hover:text-gov-green-700 px-1 font-bold ${fontSizeLevel === 0 ? 'text-gov-green-700 underline' : ''}`}
              title="Reset Font Size"
            >
              A
            </button>
            <button 
              onClick={() => {
                document.documentElement.style.fontSize = '18px';
                setFontSizeLevel(1);
              }}
              className={`hover:text-gov-green-700 px-1 font-bold ${fontSizeLevel === 1 ? 'text-gov-green-700 underline' : ''}`}
              title="Large Font Size"
            >
              A+
            </button>
          </div>
          <span className="font-medium text-gov-green-800 hidden md:inline">Standard: OIML R-76 (NAWI)</span>
        </div>
      </div>

      {/* Tricolor Ribbon Bar */}
      <div className="tricolor-bar" />

      {/* Main Government Portal Header */}
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Emblem, Logo and Titles */}
        <div className="flex items-center space-x-4">
          {/* Government Emblem placeholder slot styled as National Emblem Crest */}
          <div className="flex-shrink-0 flex items-center justify-center w-14 h-16 bg-[#faf8f2] border border-[#d6cfbe] rounded p-1 shadow-sm">
            <svg viewBox="0 0 100 120" className="w-12 h-14 text-gov-green-800" fill="currentColor">
              {/* Ashoka Pillar Lion Capital stylized emblem */}
              <circle cx="50" cy="18" r="8" fill="#006c51" />
              <path d="M42 28 C42 24, 58 24, 58 28 L58 50 C58 52, 42 52, 42 50 Z" fill="#006c51" />
              <path d="M30 32 C30 28, 42 28, 42 36 L42 52 C36 52, 30 46, 30 32 Z" fill="#005842" />
              <path d="M70 32 C70 28, 58 28, 58 36 L58 52 C64 52, 70 46, 70 32 Z" fill="#005842" />
              {/* Abacus pedestal */}
              <rect x="25" y="55" width="50" height="12" rx="2" fill="#a37b12" />
              {/* Ashoka Chakra in center */}
              <circle cx="50" cy="61" r="5" fill="#fbfaf6" stroke="#006c51" strokeWidth="1.5" />
              {/* Base */}
              <path d="M20 70 L80 70 L75 82 L25 82 Z" fill="#006c51" />
              <rect x="22" y="84" width="56" height="4" fill="#a37b12" />
              {/* Motto text placeholder: Satyameva Jayate */}
              <text x="50" y="98" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#006c51" fontFamily="serif">सत्यमेव जयते</text>
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Link to="/" className="text-2xl sm:text-3xl font-bold font-serif text-[#006c51] tracking-tight hover:opacity-90">
                MarkSure
              </Link>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 bg-[#006c51]/10 text-[#006c51] border border-[#006c51]/30 rounded">
                Gov Portal
              </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-gov-sand-800">
              Department of Consumer Affairs • Legal Metrology Division
            </p>
            <p className="text-[11px] text-gov-sand-600">
              OIML R-76 Non-Automatic Weighing Instruments (NAWI) Digital Test & Passport Engine
            </p>
          </div>
        </div>

        {/* User Session & Role Switcher */}
        {isAuthenticated && user ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white p-2.5 rounded border border-[#e5dfd1] shadow-sm">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded bg-gov-green-100 text-gov-green-800 flex items-center justify-center font-bold text-xs">
                {user.name.charAt(0)}
              </div>
              <div>
                <div className="text-xs font-bold text-gov-sand-900 leading-tight">
                  {user.name}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {getRoleBadge(user.role)}
                </div>
              </div>
            </div>

            {/* Quick Demo Role Switcher */}
            <div className="flex items-center space-x-1 pl-2 border-l border-gov-sand-200">
              <span className="text-[10px] text-gov-sand-500 font-medium hidden lg:inline">Switch Role:</span>
              <button
                onClick={() => switchRole('TESTING_OFFICER')}
                title="Switch to Testing Officer"
                className={`text-[11px] px-2 py-1 rounded transition-colors ${
                  user.role === 'TESTING_OFFICER'
                    ? 'bg-[#006c51] text-white font-semibold'
                    : 'bg-gov-sand-100 text-gov-sand-800 hover:bg-gov-sand-200'
                }`}
              >
                Testing
              </button>
              <button
                onClick={() => switchRole('REVIEWING_OFFICER')}
                title="Switch to Reviewing Officer"
                className={`text-[11px] px-2 py-1 rounded transition-colors ${
                  user.role === 'REVIEWING_OFFICER'
                    ? 'bg-[#006c51] text-white font-semibold'
                    : 'bg-gov-sand-100 text-gov-sand-800 hover:bg-gov-sand-200'
                }`}
              >
                Reviewing
              </button>
              <button
                onClick={() => switchRole('ADMIN')}
                title="Switch to Admin"
                className={`text-[11px] px-2 py-1 rounded transition-colors ${
                  user.role === 'ADMIN'
                    ? 'bg-[#006c51] text-white font-semibold'
                    : 'bg-gov-sand-100 text-gov-sand-800 hover:bg-gov-sand-200'
                }`}
              >
                Admin
              </button>
            </div>

            {/* Logout button */}
            <button
              onClick={logout}
              title="Sign out of official portal"
              className="text-gov-sand-600 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Link to="/login" className="btn-gov-primary text-xs">
              <UserIcon className="w-3.5 h-3.5 mr-1.5" /> Official Login
            </Link>
          </div>
        )}
      </div>

      {/* Official Breadcrumb Navigation Bar */}
      <div className="bg-[#f5f2e9] border-t border-b border-[#e5dfd1] px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex items-center space-x-2 text-xs text-gov-sand-600">
          <Link to="/" className="hover:text-gov-green-700 font-medium">Home</Link>
          {pathParts.length > 0 && (
            <>
              {pathParts.map((part, index) => {
                const routeTo = `/${pathParts.slice(0, index + 1).join('/')}`;
                const isLast = index === pathParts.length - 1;
                return (
                  <React.Fragment key={routeTo}>
                    <ChevronRight className="w-3 h-3 text-gov-sand-400" />
                    {isLast ? (
                      <span className="font-semibold text-gov-green-800">
                        {getBreadcrumbName(part, index)}
                      </span>
                    ) : (
                      <Link to={routeTo} className="hover:text-gov-green-700">
                        {getBreadcrumbName(part, index)}
                      </Link>
                    )}
                  </React.Fragment>
                );
              })}
            </>
          )}
          {pathParts.length === 0 && (
            <>
              <ChevronRight className="w-3 h-3 text-gov-sand-400" />
              <span className="font-semibold text-gov-green-800">Dashboard & Metrology Command</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
