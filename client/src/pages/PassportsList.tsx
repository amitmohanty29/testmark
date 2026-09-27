import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Instrument } from '../types';
import { 
  AccuracyClassBadge, 
  InstrumentStatusBadge 
} from '../components/ui/StatusBadge';
import { 
  BookMarked, 
  Search, 
  ShieldCheck, 
  QrCode, 
  ArrowRight,
  Award
} from 'lucide-react';

export const PassportsList: React.FC = () => {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadPassports();
  }, []);

  const loadPassports = async () => {
    setLoading(true);
    try {
      const res = await api.getInstruments({ search: search || undefined });
      setInstruments(res.instruments);
    } catch (err) {
      console.error('Failed to load passports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadPassports();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-[#006c51]" />
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#006c51]">
              National Digital Metrology Passports
            </h1>
          </div>
          <p className="text-xs text-gov-sand-600 mt-0.5">
            Single Source of Truth: Permanent digital ledger records for certified Non-Automatic Weighing Instruments
          </p>
        </div>

        <div className="official-stamp-gold text-xs shrink-0">
          OIML R-76 VERIFIABLE DOSSIERS
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded border border-[#ded7c4] shadow-xs">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gov-sand-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Passport ID, Model, Serial Number, or Manufacturer..."
              className="gov-input pl-9 text-xs"
            />
          </div>
          <button type="submit" className="btn-gov-secondary text-xs px-4">
            Search
          </button>
        </form>
      </div>

      {/* Passport Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center py-16 text-gov-sand-500 text-xs">
            <div className="w-8 h-8 border-2 border-[#006c51] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Accessing Central Digital Ledger...
          </div>
        ) : instruments.length === 0 ? (
          <div className="col-span-full text-center py-16 text-gov-sand-500 text-xs">
            No Digital Passports found.
          </div>
        ) : (
          instruments.map((inst) => (
            <div
              key={inst.id}
              className="bg-white border-2 border-[#ded7c4] hover:border-[#006c51] rounded shadow-xs overflow-hidden transition-all duration-150 flex flex-col justify-between"
            >
              {/* Card top banner */}
              <div className="bg-[#f7f5ee] px-4 py-3 border-b border-[#ded7c4] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#006c51] block">
                    {inst.passportId}
                  </span>
                  <span className="text-[11px] font-medium text-gov-sand-600">
                    OIML R-76 Passport
                  </span>
                </div>
                <InstrumentStatusBadge status={inst.status} />
              </div>

              {/* Card body */}
              <div className="p-4 space-y-3 text-xs flex-1">
                <div>
                  <h3 className="text-sm font-bold text-gov-sand-900 font-serif">
                    {inst.model}
                  </h3>
                  <p className="text-[11px] text-gov-sand-600">{inst.manufacturer}</p>
                  <p className="text-[10px] text-gov-sand-400 mt-0.5 truncate">{inst.instrumentType}</p>
                </div>

                <div className="bg-[#faf8f2] p-2.5 rounded border border-[#ece7d8] space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gov-sand-500">Serial No:</span>
                    <span className="font-mono font-bold text-gov-sand-800">{inst.serialNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gov-sand-500">Class:</span>
                    <AccuracyClassBadge accuracyClass={inst.accuracyClass} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gov-sand-500">Capacity Limits:</span>
                    <span className="font-mono text-gov-sand-900">
                      Max {inst.maxCapacity}{inst.verificationUnits} / e={inst.scaleIntervalE}{inst.verificationUnits}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gov-sand-500 pt-1">
                  <span>Ledger History:</span>
                  <span className="font-semibold text-gov-sand-800">
                    {inst._count?.evaluations || 0} Evaluation(s) tied
                  </span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-4 py-3 bg-[#fcfbf9] border-t border-[#ded7c4] flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-gov-sand-500 font-mono">
                  <QrCode className="w-4 h-4 text-gov-sand-700" />
                  <span>Verified QR</span>
                </div>
                <Link
                  to={`/passport/${inst.id}`}
                  className="btn-gov-primary text-[11px] py-1 px-3"
                >
                  Open Passport &rarr;
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
