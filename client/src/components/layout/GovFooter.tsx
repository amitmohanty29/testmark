import React from 'react';
import { ExternalLink, ShieldCheck, Scale, Award } from 'lucide-react';

export const GovFooter: React.FC = () => {
  return (
    <footer className="bg-[#231f18] text-[#ded7c5] mt-16 border-t-4 border-[#006c51]">
      <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-gov-sand-800">
          {/* Col 1: About Portal */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-serif font-bold text-white tracking-wide">MarkSure</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-[#006c51] text-white rounded font-mono font-semibold">
                OIML R-76
              </span>
            </div>
            <p className="text-xs text-gov-sand-400 leading-relaxed">
              Standardized digital verification platform and permanent Digital Metrology Passport engine for Non-Automatic Weighing Instruments (NAWI).
            </p>
            <div className="text-[11px] text-gov-sand-400">
              Department of Consumer Affairs, Ministry of Consumer Affairs, Food & Public Distribution, New Delhi.
            </div>
          </div>

          {/* Col 2: Metrology Standards */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Metrology Framework</h4>
            <ul className="text-xs space-y-1.5 text-gov-sand-400">
              <li className="flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-gov-sand-400" />
                <span>OIML R 76-1:2006 (NAWI Standard)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-gov-sand-400" />
                <span>Legal Metrology Act, 2009</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-gov-sand-400" />
                <span>Legal Metrology (General) Rules, 2011</span>
              </li>
              <li>ISO/IEC 17025:2017 Calibration Testing</li>
            </ul>
          </div>

          {/* Col 3: Portal Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Official Portals</h4>
            <ul className="text-xs space-y-1.5 text-gov-sand-400">
              <li>
                <a
                  href="https://dfpd.gov.in/en"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white flex items-center gap-1"
                >
                  Dept. of Food & Public Distribution <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://consumeraffairs.nic.in"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white flex items-center gap-1"
                >
                  Dept. of Consumer Affairs <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.oiml.org"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white flex items-center gap-1"
                >
                  International OIML Portal <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.india.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white flex items-center gap-1"
                >
                  National Portal of India <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Support */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Contact & Support</h4>
            <ul className="text-xs space-y-1.5 text-gov-sand-400">
              <li>Helpdesk: lm-support@marksure.gov.in</li>
              <li>Tel: 011-2338 1653 (Legal Metrology Division)</li>
              <li>Krishi Bhawan, New Delhi 110001</li>
              <li className="text-[11px] pt-1">Website content managed by Department of Consumer Affairs</li>
            </ul>
          </div>
        </div>

        {/* Bottom Disclaimer */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-gov-sand-500 gap-2">
          <p>
            © {new Date().getFullYear()} MarkSure Portal. All Rights Reserved. Govt. of India.
          </p>
          <div className="flex items-center space-x-4">
            <span>Website Policies</span>
            <span>•</span>
            <span>Security Policy</span>
            <span>•</span>
            <span>Helpdesk: lm-support@marksure.gov.in</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
