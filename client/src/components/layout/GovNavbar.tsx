import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Scale, 
  FileCheck2, 
  BookMarked, 
  FileText, 
  Search,
  ShieldCheck,
  Cpu,
  History
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const GovNavbar: React.FC = () => {
  const { user, isAdmin } = useAuth();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/instruments', label: 'Instruments', icon: Scale },
    { to: '/evaluations', label: 'Evaluations', icon: FileCheck2 },
    { to: '/passports', label: 'Passports', icon: BookMarked },
    { to: '/reports', label: 'Test Reports', icon: FileText },
    { to: '/search', label: 'National Search', icon: Search },
    { to: '/verify', label: 'Integrity Check', icon: ShieldCheck },
    { to: '/simulator', label: 'Rule Simulator', icon: Cpu },
    ...(isAdmin ? [{ to: '/audit', label: 'Audit Ledger', icon: History }] : []),
  ];

  return (
    <nav className="bg-[#006c51] text-white shadow-md select-none sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12 overflow-x-auto no-scrollbar">
          <div className="flex items-center space-x-1 sm:space-x-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-t-sm border-b-2 transition-all whitespace-nowrap ${
                      isActive
                        ? 'border-[#ff9933] bg-[#005842] text-white font-semibold'
                        : 'border-transparent text-emerald-100 hover:bg-[#005842]/60 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5 opacity-90" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>

          <div className="hidden xl:flex items-center text-xs text-emerald-100/80 space-x-2 pl-4 border-l border-emerald-700/60 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Legal Metrology Authority Online</span>
          </div>
        </div>
      </div>
    </nav>
  );
};
