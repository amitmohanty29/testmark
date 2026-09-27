import React from 'react';
import { Link } from 'react-router-dom';
import { Construction, FileText, Search, ArrowLeft, Shield } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  moduleName: string;
  description: string;
  iconType: 'report' | 'search';
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  moduleName,
  description,
  iconType,
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="bg-white border-2 border-dashed border-[#ded7c4] rounded-lg p-10 shadow-xs">
        <div className="w-16 h-16 bg-[#006c51]/10 text-[#006c51] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#006c51]/20">
          {iconType === 'report' ? (
            <FileText className="w-8 h-8" />
          ) : (
            <Search className="w-8 h-8" />
          )}
        </div>

        <div className="inline-block px-3 py-1 bg-amber-50 border border-amber-300 rounded text-amber-900 text-xs font-semibold uppercase tracking-wider mb-2">
          Under Scheduled Development • Phase 2
        </div>

        <h1 className="text-2xl font-bold font-serif text-[#006c51]">{title}</h1>
        <p className="mt-2 text-xs text-gov-sand-600 max-w-lg mx-auto leading-relaxed">
          {description}
        </p>

        <div className="mt-6 p-4 bg-[#faf8f2] rounded border border-[#ded7c4] max-w-md mx-auto text-xs text-gov-sand-700 text-left space-y-1.5">
          <div className="font-bold text-gov-sand-900 uppercase text-[10px] tracking-wider mb-1">
            Planned Technical Scope ({moduleName}):
          </div>
          <div>• Automated PDF generation compliant with OIML R 76-1:2006 format</div>
          <div>• Direct export to National Legal Metrology database</div>
          <div>• Cryptographic digital signature affixing (e-Sign)</div>
        </div>

        <div className="mt-8 flex justify-center gap-3">
          <Link to="/" className="btn-gov-primary text-xs">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Return to Dashboard
          </Link>
          <Link to="/evaluations" className="btn-gov-secondary text-xs">
            Go to OIML Evaluations
          </Link>
        </div>
      </div>
    </div>
  );
};
