import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Scale, 
  FileCheck2, 
  BookMarked, 
  FileText, 
  Search,
  Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const GovNavbar: React.FC = () => {
  const { user } = useAuth();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/instruments', label: 'Instruments Registry', icon: Scale },
    { to: '/evaluations', label: 'OIML R-76 Evaluations', icon: FileCheck2 },
    { to: '/passports', label: 'Digital Passports', icon: BookMarked },
    { to: '/reports', label: 'Test Reports', icon: FileText, isPlaceholder: true },
    { to: '/search', label: 'National Metrology Search', icon: Search, isPlaceholder: true },
  ];

  return (
    <nav className="bg-[#006c51] text-white shadow-md select-none sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12 overflow-x-auto no-scrollbar">
          <div className="flex items-center space-x-1 sm:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center space-x-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-t-sm border-b-2 transition-all whitespace-nowrap ${
                      isActive
                        ? 'border-[#ff9933] bg-[#005842] text-white font-semibold'
                        : 'border-transparent text-emerald-100 hover:bg-[#005842]/60 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 opacity-90" />
                  <span>{item.label}</span>
                  {item.isPlaceholder && (
                    <span className="ml-1 text-[9px] uppercase px-1 py-0.2 bg-white/20 text-white rounded font-mono">
                      Soon
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center text-xs text-emerald-100/80 space-x-2 pl-4 border-l border-emerald-700/60">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>NABL & RRSL Online Grid</span>
          </div>
        </div>
      </div>
    </nav>
  );
};
