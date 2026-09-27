import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Instrument } from '../types';
import { 
  AccuracyClassBadge, 
  InstrumentStatusBadge 
} from '../components/ui/StatusBadge';
import { 
  Scale, 
  PlusCircle, 
  Search, 
  Filter, 
  BookMarked, 
  FileText, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { CreateInstrumentModal } from '../components/instruments/CreateInstrumentModal';
import { useAuth } from '../context/AuthContext';

export const InstrumentsList: React.FC = () => {
  const { isTestingOfficer, isAdmin } = useAuth();

  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [accuracyClass, setAccuracyClass] = useState('ALL');
  const [status, setStatus] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadInstruments();
  }, [accuracyClass, status]);

  const loadInstruments = async () => {
    setLoading(true);
    try {
      const res = await api.getInstruments({
        search: search || undefined,
        accuracyClass: accuracyClass !== 'ALL' ? accuracyClass : undefined,
        status: status !== 'ALL' ? status : undefined,
      });
      setInstruments(res.instruments);
    } catch (err) {
      console.error('Failed to load instruments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadInstruments();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#006c51]" />
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#006c51]">
              National Instrument Registry
            </h1>
          </div>
          <p className="text-xs text-gov-sand-600 mt-0.5">
            Registered Non-Automatic Weighing Instruments (NAWI) under Legal Metrology OIML R-76
          </p>
        </div>

        {(isTestingOfficer || isAdmin) && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-gov-primary text-xs shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Register New Instrument
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded border border-[#ded7c4] shadow-xs">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gov-sand-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Model, Manufacturer, Serial No, or Passport ID..."
              className="gov-input pl-9 text-xs"
            />
          </div>

          {/* Class Filter */}
          <div>
            <select
              value={accuracyClass}
              onChange={(e) => setAccuracyClass(e.target.value)}
              className="gov-select text-xs"
            >
              <option value="ALL">All Accuracy Classes</option>
              <option value="Class I">Class I (Special)</option>
              <option value="Class II">Class II (High)</option>
              <option value="Class III">Class III (Medium)</option>
              <option value="Class IV">Class IV (Ordinary)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="gov-select text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Registered</option>
              <option value="IN_EVALUATION">In Evaluation</option>
              <option value="CERTIFIED">Certified</option>
            </select>
            <button
              type="submit"
              className="btn-gov-secondary text-xs px-3"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Instruments Table */}
      <div className="gov-card">
        <div className="gov-card-header">
          <span className="text-xs font-bold uppercase tracking-wider text-gov-sand-900">
            Registered Instruments Database ({instruments.length})
          </span>
          <span className="text-[11px] text-gov-sand-500 font-mono">
            OIML R-76 Pattern Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#faf8f2] text-gov-sand-600 font-semibold border-b border-[#e5dfd1]">
              <tr>
                <th className="px-4 py-3">Passport ID</th>
                <th className="px-4 py-3">Instrument & Manufacturer</th>
                <th className="px-4 py-3">Serial Number</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Capacity Limits (Max / e)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Passport / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ece7d8]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gov-sand-500">
                    <div className="w-8 h-8 border-2 border-[#006c51] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Querying National Registry...
                  </td>
                </tr>
              ) : instruments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gov-sand-500">
                    No instruments match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                instruments.map((inst) => (
                  <tr key={inst.id} className="hover:bg-[#faf8f2] transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-[#006c51]">
                      <Link to={`/passport/${inst.id}`} className="hover:underline flex items-center gap-1">
                        <BookMarked className="w-3.5 h-3.5 text-[#a37b12]" />
                        {inst.passportId}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-gov-sand-900">{inst.model}</div>
                      <div className="text-[11px] text-gov-sand-600">{inst.manufacturer}</div>
                      <div className="text-[10px] text-gov-sand-400 truncate max-w-[200px]">{inst.instrumentType}</div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-gov-sand-800">
                      {inst.serialNumber}
                    </td>
                    <td className="px-4 py-3.5">
                      <AccuracyClassBadge accuracyClass={inst.accuracyClass} />
                    </td>
                    <td className="px-4 py-3.5 font-mono text-gov-sand-800">
                      <div>Max: {inst.maxCapacity} {inst.verificationUnits}</div>
                      <div className="text-[10px] text-gov-sand-500">e: {inst.scaleIntervalE} {inst.verificationUnits}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <InstrumentStatusBadge status={inst.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <Link
                        to={`/passport/${inst.id}`}
                        className="btn-gov-outline text-[11px] py-1 px-2.5"
                      >
                        <BookMarked className="w-3 h-3 mr-1 text-[#006c51]" />
                        Digital Passport
                      </Link>
                      <Link
                        to={`/instruments/${inst.id}`}
                        className="btn-gov-secondary text-[11px] py-1 px-2.5"
                      >
                        Profile
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <CreateInstrumentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => loadInstruments()}
      />
    </div>
  );
};
