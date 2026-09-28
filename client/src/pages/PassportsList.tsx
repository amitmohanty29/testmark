import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { AccuracyClassBadge } from '../components/ui/StatusBadge';
import { 
  BookMarked, 
  Search, 
  ShieldCheck, 
  RotateCcw, 
  LayoutList, 
  LayoutGrid, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Layers,
  Scale
} from 'lucide-react';

export const PassportsList: React.FC = () => {
  // Main view tab: 'passports' or 'models'
  const [activeTab, setActiveTab] = useState<'passports' | 'models'>('passports');

  // Passports state
  const [passports, setPassports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [instrumentType, setInstrumentType] = useState('ALL');
  const [accuracyClass, setAccuracyClass] = useState('ALL');
  const [complianceStatus, setComplianceStatus] = useState('ALL');
  const [result, setResult] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Models state
  const [models, setModels] = useState<any[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [expandedModelKey, setExpandedModelKey] = useState<string | null>(null);
  const [modelSearch, setModelSearch] = useState('');

  useEffect(() => {
    if (activeTab === 'passports') {
      loadPassports();
    } else {
      loadModels();
    }
  }, [activeTab, instrumentType, accuracyClass, complianceStatus, result, startDate, endDate]);

  const loadPassports = async () => {
    setLoading(true);
    try {
      const res = await api.getPassports({
        q: search.trim() || undefined,
        instrumentType: instrumentType !== 'ALL' ? instrumentType : undefined,
        accuracyClass: accuracyClass !== 'ALL' ? accuracyClass : undefined,
        complianceStatus: complianceStatus !== 'ALL' ? complianceStatus : undefined,
        result: result !== 'ALL' ? result : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setPassports(res.passports || []);
    } catch (err) {
      console.error('Failed to load passports:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async () => {
    setLoadingModels(true);
    try {
      const res = await api.getPassportModelsSummary();
      setModels(res.models || []);
    } catch (err) {
      console.error('Failed to load model summaries:', err);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPassports();
  };

  const handleResetFilters = () => {
    setSearch('');
    setInstrumentType('ALL');
    setAccuracyClass('ALL');
    setComplianceStatus('ALL');
    setResult('ALL');
    setStartDate('');
    setEndDate('');
  };

  // Stats computation
  const totalCount = passports.length;
  const certifiedCount = passports.filter(p => p.complianceStatus === 'CONFORMING_OIML_R76').length;
  const reviewCount = passports.filter(p => p.complianceStatus === 'UNDER_REVIEW' || p.complianceStatus === 'IN_EVALUATION').length;
  const pendingCount = passports.filter(p => p.complianceStatus === 'PENDING_EVALUATION' || !p.complianceStatus).length;

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFORMING_OIML_R76':
      case 'CERTIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle className="w-3 h-3 text-emerald-700" /> CONFORMING
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <Clock className="w-3 h-3 text-blue-700" /> UNDER REVIEW
          </span>
        );
      case 'IN_EVALUATION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-700" /> IN EVALUATION
          </span>
        );
      case 'NON_CONFORMING':
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-900 border border-red-300">
            <AlertCircle className="w-3 h-3 text-red-700" /> NON-CONFORMING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gov-sand-200 text-gov-sand-800 border border-gov-sand-300">
            <AlertCircle className="w-3 h-3 text-gov-sand-600" /> PENDING
          </span>
        );
    }
  };

  const filteredModels = models.filter((m) => {
    if (!modelSearch) return true;
    const q = modelSearch.toLowerCase();
    return (
      m.manufacturer?.toLowerCase().includes(q) ||
      m.model?.toLowerCase().includes(q) ||
      m.instrumentType?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Title Banner */}
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
          OIML R-76 PERMANENT REGISTRY
        </div>
      </div>

      {/* Primary Navigation Tabs: Individual Passports vs Model Approval History */}
      <div className="flex border-b border-[#ded7c4] space-x-2 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('passports')}
          className={`py-2.5 px-4 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'passports'
              ? 'border-[#006c51] text-[#006c51] bg-white rounded-t'
              : 'border-transparent text-gov-sand-600 hover:text-gov-sand-900'
          }`}
        >
          <BookMarked className="w-4 h-4" />
          Individual Instrument Passports ({totalCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('models')}
          className={`py-2.5 px-4 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'models'
              ? 'border-[#006c51] text-[#006c51] bg-white rounded-t'
              : 'border-transparent text-gov-sand-600 hover:text-gov-sand-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Model Approval History View {models.length > 0 && `(${models.length} Models)`}
        </button>
      </div>

      {activeTab === 'passports' ? (
        <>
          {/* Quick Statistics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3.5 rounded border border-[#ded7c4] shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gov-sand-500 block">Total Passports</span>
              <span className="text-lg font-bold font-mono text-[#006c51] mt-1 block">{totalCount}</span>
            </div>
            <div className="bg-white p-3.5 rounded border border-[#ded7c4] shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">OIML R-76 Conforming</span>
              <span className="text-lg font-bold font-mono text-emerald-800 mt-1 block">{certifiedCount}</span>
            </div>
            <div className="bg-white p-3.5 rounded border border-[#ded7c4] shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Active Evaluation / Review</span>
              <span className="text-lg font-bold font-mono text-amber-800 mt-1 block">{reviewCount}</span>
            </div>
            <div className="bg-white p-3.5 rounded border border-[#ded7c4] shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gov-sand-600 block">Pending Certification</span>
              <span className="text-lg font-bold font-mono text-gov-sand-800 mt-1 block">{pendingCount}</span>
            </div>
          </div>

          {/* Search and Filter Panel */}
          <div className="bg-white p-4 rounded border border-[#ded7c4] shadow-xs space-y-3">
            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gov-sand-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by Passport ID, Serial Number, Manufacturer, or Model..."
                  className="gov-input pl-9 text-xs"
                />
              </div>
              <button type="submit" className="btn-gov-primary text-xs px-5">
                Search
              </button>
            </form>

            {/* Filter Controls Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-2 border-t border-[#ece7d8] text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gov-sand-600 mb-1">
                  Instrument Type
                </label>
                <select
                  value={instrumentType}
                  onChange={(e) => setInstrumentType(e.target.value)}
                  className="gov-input text-xs py-1.5"
                >
                  <option value="ALL">All Instrument Types</option>
                  <option value="Electronic Non-Automatic Weighing Instrument (NAWI)">Electronic NAWI</option>
                  <option value="Retail Price-Computing Counter Scale">Retail Counter Scale</option>
                  <option value="Precision Laboratory Electronic Balance">Precision Laboratory Balance</option>
                  <option value="Electronic Road Vehicle Weighbridge">Weighbridge</option>
                  <option value="Industrial Platform Scale">Industrial Platform Scale</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gov-sand-600 mb-1">
                  Accuracy Class
                </label>
                <select
                  value={accuracyClass}
                  onChange={(e) => setAccuracyClass(e.target.value)}
                  className="gov-input text-xs py-1.5"
                >
                  <option value="ALL">All Classes (I, II, III, IIII)</option>
                  <option value="Class I">Class I (Special)</option>
                  <option value="Class II">Class II (High)</option>
                  <option value="Class III">Class III (Medium)</option>
                  <option value="Class IIII">Class IIII (Ordinary)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gov-sand-600 mb-1">
                  Result
                </label>
                <select
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  className="gov-input text-xs py-1.5"
                >
                  <option value="ALL">All Results</option>
                  <option value="PASS">PASS (Conforming)</option>
                  <option value="FAIL">FAIL (Non-Conforming)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gov-sand-600 mb-1">
                  Compliance Status
                </label>
                <select
                  value={complianceStatus}
                  onChange={(e) => setComplianceStatus(e.target.value)}
                  className="gov-input text-xs py-1.5"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="CONFORMING_OIML_R76">Conforming (Certified)</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="IN_EVALUATION">In Evaluation</option>
                  <option value="PENDING_EVALUATION">Pending Initial Evaluation</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gov-sand-600 mb-1">
                  Date Range
                </label>
                <div className="flex gap-1">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="gov-input text-[11px] py-1 px-1.5 w-1/2"
                    title="From date"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="gov-input text-[11px] py-1 px-1.5 w-1/2"
                    title="To date"
                  />
                </div>
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="btn-gov-secondary text-xs py-1.5 px-3 flex-1 flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>

                <div className="flex border border-[#ded7c4] rounded overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 ${viewMode === 'table' ? 'bg-[#006c51] text-white' : 'bg-white text-gov-sand-600 hover:bg-gov-sand-100'}`}
                    title="Table View"
                  >
                    <LayoutList className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 ${viewMode === 'grid' ? 'bg-[#006c51] text-white' : 'bg-white text-gov-sand-600 hover:bg-gov-sand-100'}`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Passports Content */}
          {loading ? (
            <div className="bg-white border border-[#ded7c4] rounded p-12 text-center text-gov-sand-500 text-xs">
              <div className="w-8 h-8 border-2 border-[#006c51] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Querying National Metrology Digital Ledger...
            </div>
          ) : passports.length === 0 ? (
            <div className="bg-white border border-[#ded7c4] rounded p-12 text-center text-gov-sand-500 text-xs space-y-2">
              <BookMarked className="w-10 h-10 text-gov-sand-400 mx-auto" />
              <h3 className="text-sm font-bold text-gov-sand-800">No Digital Passports Found</h3>
              <p className="text-xs text-gov-sand-600">No records match your selected filters or search terms.</p>
              <button onClick={handleResetFilters} className="btn-gov-outline text-xs mt-3">
                Reset Filters
              </button>
            </div>
          ) : viewMode === 'table' ? (
            /* Table View */
            <div className="bg-white border border-[#ded7c4] rounded shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f7f5ee] text-gov-sand-700 font-semibold border-b border-[#ded7c4]">
                    <tr>
                      <th className="px-4 py-3 font-serif">Passport ID</th>
                      <th className="px-4 py-3 font-serif">Instrument & Model</th>
                      <th className="px-4 py-3 font-serif">Class</th>
                      <th className="px-4 py-3 font-serif">Capacity (Max / e)</th>
                      <th className="px-4 py-3 font-serif">Status</th>
                      <th className="px-4 py-3 font-serif">Last Event / Summary</th>
                      <th className="px-4 py-3 text-right font-serif">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ece7d8]">
                    {passports.map((p) => {
                      const inst = p.instrument || {};
                      const lastEv = p.recentEvents?.[0] || null;
                      return (
                        <tr key={p.id} className="hover:bg-[#faf8f2] transition-colors">
                          <td className="px-4 py-3.5 font-mono font-bold text-[#006c51] whitespace-nowrap">
                            <Link to={`/passport/${p.passportId}`} className="hover:underline flex items-center gap-1.5">
                              <BookMarked className="w-3.5 h-3.5 text-[#a37b12] shrink-0" />
                              <span>{p.passportId}</span>
                            </Link>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-gov-sand-900">{inst.model}</div>
                            <div className="text-[11px] text-gov-sand-600">{inst.manufacturer}</div>
                            <div className="text-[10px] font-mono text-gov-sand-500 mt-0.5">S/N: {inst.serialNumber}</div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <AccuracyClassBadge accuracyClass={inst.accuracyClass} />
                          </td>
                          <td className="px-4 py-3.5 font-mono text-gov-sand-800 whitespace-nowrap">
                            <div>Max {inst.maxCapacity} {inst.verificationUnits}</div>
                            <div className="text-[10px] text-gov-sand-500">e={inst.scaleIntervalE} {inst.verificationUnits}</div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {renderStatusBadge(p.complianceStatus)}
                          </td>
                          <td className="px-4 py-3.5 max-w-xs">
                            {lastEv ? (
                              <div>
                                <span className="text-[10px] font-mono text-gov-sand-400 block">
                                  {new Date(lastEv.timestamp).toLocaleDateString('en-IN')} • {lastEv.eventType}
                                </span>
                                <span className="text-[11px] text-gov-sand-700 truncate block mt-0.5" title={lastEv.summary}>
                                  {lastEv.summary}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-gov-sand-400 italic">Registered in National Registry</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <Link
                              to={`/passport/${p.passportId}`}
                              className="btn-gov-primary text-[11px] py-1 px-3 inline-flex items-center gap-1"
                            >
                              View Passport &rarr;
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 bg-[#fcfbf9] border-t border-[#ded7c4] flex items-center justify-between text-[11px] text-gov-sand-600">
                <span>Showing {passports.length} registered digital passport{passports.length === 1 ? '' : 's'}</span>
                <span className="font-mono text-gov-sand-400">National Metrology Central Ledger</span>
              </div>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {passports.map((p) => {
                const inst = p.instrument || {};
                const lastEv = p.recentEvents?.[0] || null;
                return (
                  <div
                    key={p.id}
                    className="bg-white border-2 border-[#ded7c4] hover:border-[#006c51] rounded shadow-xs overflow-hidden transition-all duration-150 flex flex-col justify-between"
                  >
                    {/* Card top banner */}
                    <div className="bg-[#f7f5ee] px-4 py-3 border-b border-[#ded7c4] flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-mono font-bold text-[#006c51] block">
                          {p.passportId}
                        </span>
                        <span className="text-[10px] text-gov-sand-500">
                          Enrolled: {new Date(p.createdAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      {renderStatusBadge(p.complianceStatus)}
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
                          <span className="text-gov-sand-500">Capacity:</span>
                          <span className="font-mono text-gov-sand-900">
                            Max {inst.maxCapacity}{inst.verificationUnits} / e={inst.scaleIntervalE}{inst.verificationUnits}
                          </span>
                        </div>
                      </div>

                      {lastEv && (
                        <div className="pt-1 text-[11px] text-gov-sand-600 border-t border-[#f0ede4]">
                          <span className="text-[9px] font-mono font-bold uppercase text-gov-sand-400 block">Last Ledger Event:</span>
                          <p className="truncate text-gov-sand-800 mt-0.5">{lastEv.summary}</p>
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="px-4 py-3 bg-[#fcfbf9] border-t border-[#ded7c4] flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] text-gov-sand-500 font-mono">
                        <ShieldCheck className="w-4 h-4 text-emerald-700" />
                        <span>Ledger Verified</span>
                      </div>
                      <Link
                        to={`/passport/${p.passportId}`}
                        className="btn-gov-primary text-[11px] py-1 px-3 flex items-center gap-1"
                      >
                        Open Passport &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ── MODEL APPROVAL HISTORY VIEW ── */
        <div className="space-y-4">
          <div className="bg-white p-4 rounded border border-[#ded7c4] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gov-sand-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                placeholder="Filter models by manufacturer, model name, or instrument type..."
                className="gov-input pl-9 text-xs"
              />
            </div>
            <div className="text-[11px] text-gov-sand-600 shrink-0 font-mono">
              Consolidated Model Lineage Records
            </div>
          </div>

          {loadingModels ? (
            <div className="bg-white border border-[#ded7c4] rounded p-12 text-center text-gov-sand-500 text-xs">
              <div className="w-8 h-8 border-2 border-[#006c51] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Aggregating Model Approval Ledgers...
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="bg-white border border-[#ded7c4] rounded p-12 text-center text-gov-sand-500 text-xs space-y-2">
              <Building2 className="w-10 h-10 text-gov-sand-400 mx-auto" />
              <h3 className="text-sm font-bold text-gov-sand-800">No Models Found</h3>
              <p className="text-xs text-gov-sand-600">No instrument models match your search.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredModels.map((m, idx) => {
                const modelKey = `${m.manufacturer}___${m.model}`;
                const isExpanded = expandedModelKey === modelKey || filteredModels.length === 1;
                return (
                  <div
                    key={idx}
                    className="bg-white border-2 border-[#ded7c4] rounded shadow-xs overflow-hidden"
                  >
                    {/* Model Header */}
                    <div
                      onClick={() => setExpandedModelKey(isExpanded ? null : modelKey)}
                      className="p-4 bg-[#fcfbf9] hover:bg-[#faf8f2] transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#ded7c4]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded bg-[#006c51]/10 text-[#006c51] shrink-0 mt-0.5">
                          <Scale className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold font-serif text-gov-sand-900">
                              {m.manufacturer} • {m.model}
                            </h3>
                            <AccuracyClassBadge accuracyClass={m.accuracyClass} />
                          </div>
                          <p className="text-xs text-gov-sand-600 mt-0.5">
                            {m.instrumentType} • Max {m.maxCapacity} {m.verificationUnits} (e={m.scaleIntervalE} {m.verificationUnits})
                          </p>
                        </div>
                      </div>

                      {/* Approval Metrics & Toggle */}
                      <div className="flex items-center gap-3 self-end md:self-center">
                        <div className="flex items-center gap-2 text-[11px] font-mono">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                            {m.certifiedCount} Certified
                          </span>
                          {m.underReviewCount > 0 && (
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold border border-blue-300">
                              {m.underReviewCount} Under Review
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded bg-gov-sand-200 text-gov-sand-800 font-bold">
                            {m.totalInstruments} Enrolled
                          </span>
                        </div>

                        <div className="text-gov-sand-400">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Instruments under Model */}
                    {isExpanded && (
                      <div className="p-4 bg-white text-xs space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-[#ece7d8]">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-gov-sand-600">
                            Registered Instruments in Production Series ({m.passports.length})
                          </span>
                          <span className="text-[10px] text-gov-sand-500 font-mono">
                            Permanent Legal Metrology Records
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#f7f5ee] text-gov-sand-700 font-semibold border-b border-[#ded7c4]">
                              <tr>
                                <th className="px-3 py-2 font-serif">Serial Number</th>
                                <th className="px-3 py-2 font-serif">Permanent Passport ID</th>
                                <th className="px-3 py-2 font-serif">Evaluation Ref</th>
                                <th className="px-3 py-2 font-serif">Testing Lab</th>
                                <th className="px-3 py-2 font-serif">Rule Version</th>
                                <th className="px-3 py-2 font-serif">Status</th>
                                <th className="px-3 py-2 text-right font-serif">Passport</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ece7d8]">
                              {m.passports.map((instP: any) => (
                                <tr key={instP.id} className="hover:bg-[#faf8f2]">
                                  <td className="px-3 py-2.5 font-mono font-bold text-gov-sand-900">
                                    {instP.serialNumber}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono text-[#006c51] font-semibold">
                                    <Link to={`/passport/${instP.passportId}`} className="hover:underline">
                                      {instP.passportId}
                                    </Link>
                                  </td>
                                  <td className="px-3 py-2.5 font-mono text-gov-sand-600">
                                    {instP.latestEvaluationNumber || 'Pending'}
                                  </td>
                                  <td className="px-3 py-2.5 text-gov-sand-700">
                                    {instP.laboratoryName || 'Accredited RRSL/NPL'}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono text-gov-sand-600 text-[11px]">
                                    {instP.ruleConfigVersion}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    {renderStatusBadge(instP.status)}
                                  </td>
                                  <td className="px-3 py-2.5 text-right">
                                    <Link
                                      to={`/passport/${instP.passportId}`}
                                      className="btn-gov-primary text-[10px] py-0.5 px-2 inline-flex items-center gap-1"
                                    >
                                      View Passport &rarr;
                                    </Link>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PassportsList;
