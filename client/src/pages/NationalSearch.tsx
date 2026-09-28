import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import {
  Search,
  Filter,
  Scale,
  FileCheck2,
  FileText,
  BookMarked,
  ArrowRight,
  Building2,
  User,
  Calendar,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { AccuracyClassBadge, EvaluationStatusBadge } from '../components/ui/StatusBadge';

export const NationalSearch: React.FC = () => {
  // Query parameters state
  const [query, setQuery] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [instrumentType, setInstrumentType] = useState('ALL');
  const [accuracyClass, setAccuracyClass] = useState('ALL');
  const [evaluationId, setEvaluationId] = useState('');
  const [reportId, setReportId] = useState('');
  const [officer, setOfficer] = useState('');
  const [result, setResult] = useState('ALL');

  // Search results state
  const [activeTab, setActiveTab] = useState<'all' | 'evaluations' | 'reports' | 'instruments'>('all');
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [instruments, setInstruments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    // Initial search with empty query to load recent repository entries
    executeSearch();
  }, []);

  const executeSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const params: Record<string, string> = {};
      if (query.trim()) params.query = query.trim();
      if (manufacturer.trim()) params.manufacturer = manufacturer.trim();
      if (model.trim()) params.model = model.trim();
      if (serialNumber.trim()) params.serialNumber = serialNumber.trim();
      if (instrumentType !== 'ALL') params.instrumentType = instrumentType;
      if (accuracyClass !== 'ALL') params.accuracyClass = accuracyClass;
      if (evaluationId.trim()) params.evaluationId = evaluationId.trim();
      if (reportId.trim()) params.reportId = reportId.trim();
      if (officer.trim()) params.officer = officer.trim();
      if (result !== 'ALL') params.result = result;

      const data = await api.search(params);
      setEvaluations(data.evaluations || []);
      setReports(data.reports || []);
      setInstruments(data.instruments || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setQuery('');
    setManufacturer('');
    setModel('');
    setSerialNumber('');
    setInstrumentType('ALL');
    setAccuracyClass('ALL');
    setEvaluationId('');
    setReportId('');
    setOfficer('');
    setResult('ALL');
    executeSearch();
  };

  const totalResults = evaluations.length + reports.length + instruments.length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#ded7c4] rounded p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#a37b12]">
              National Metrology Directory
            </span>
            <span className="text-gov-sand-400">•</span>
            <span className="text-xs text-gov-sand-600 font-medium">Unified Search Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#006c51] mt-0.5">
            Cross-Registry Metrology Search
          </h1>
          <p className="text-xs text-gov-sand-600 mt-0.5">
            Federated search across all certified instruments, OIML evaluations, and finalized test reports.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`btn-gov-secondary text-xs flex items-center gap-1.5 ${showAdvancedFilters ? 'bg-[#006c51] text-white hover:bg-[#005842]' : ''
              }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{showAdvancedFilters ? 'Hide Multi-Filters' : 'Multi-Filter Criteria'}</span>
          </button>
        </div>
      </div>

      {/* Search Input and Filters */}
      <div className="gov-card p-5 space-y-4">
        <form onSubmit={executeSearch} className="space-y-4">
          {/* Main search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-gov-sand-400" />
              <input
                type="text"
                placeholder="Search across all fields: serial number, model, manufacturer, report ID, evaluation ID, officer..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="gov-input pl-10 text-xs w-full py-2.5"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-3 text-gov-sand-400 hover:text-gov-sand-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button type="submit" className="btn-gov-primary text-xs px-5 py-2.5">
              <Search className="w-3.5 h-3.5 mr-1.5" /> Search
            </button>
          </div>

          {/* Advanced Multi-Filter Grid */}
          {showAdvancedFilters && (
            <div className="pt-4 border-t border-[#ded7c4] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="gov-label text-[11px]">Manufacturer</label>
                <input
                  type="text"
                  placeholder="e.g. Eagle Metrology"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  className="gov-input w-full text-xs"
                />
              </div>

              <div>
                <label className="gov-label text-[11px]">Model Name</label>
                <input
                  type="text"
                  placeholder="e.g. EMS-Precision Pro"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="gov-input w-full text-xs"
                />
              </div>

              <div>
                <label className="gov-label text-[11px]">Serial Number</label>
                <input
                  type="text"
                  placeholder="e.g. EMS-2026-NX-8821"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="gov-input w-full text-xs"
                />
              </div>

              <div>
                <label className="gov-label text-[11px]">Accuracy Class</label>
                <select
                  value={accuracyClass}
                  onChange={(e) => setAccuracyClass(e.target.value)}
                  className="gov-input w-full text-xs"
                >
                  <option value="ALL">All Classes (I - IV)</option>
                  <option value="Class I">Class I (Special)</option>
                  <option value="Class II">Class II (High)</option>
                  <option value="Class III">Class III (Medium)</option>
                  <option value="Class IV">Class IV (Ordinary)</option>
                </select>
              </div>

              <div>
                <label className="gov-label text-[11px]">Evaluation ID</label>
                <input
                  type="text"
                  placeholder="e.g. EV-2026-0041"
                  value={evaluationId}
                  onChange={(e) => setEvaluationId(e.target.value)}
                  className="gov-input w-full text-xs"
                />
              </div>

              <div>
                <label className="gov-label text-[11px]">Report ID</label>
                <input
                  type="text"
                  placeholder="e.g. RPT-2026-0001"
                  value={reportId}
                  onChange={(e) => setReportId(e.target.value)}
                  className="gov-input w-full text-xs"
                />
              </div>

              <div>
                <label className="gov-label text-[11px]">Testing / Reviewing Officer</label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Sharma"
                  value={officer}
                  onChange={(e) => setOfficer(e.target.value)}
                  className="gov-input w-full text-xs"
                />
              </div>

              <div>
                <label className="gov-label text-[11px]">Evaluation Result / State</label>
                <select
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  className="gov-input w-full text-xs"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Completed">Completed (Certified)</option>
                  <option value="Under Review">Under Review</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>

              <div className="sm:col-span-2 md:col-span-4 flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="btn-gov-secondary text-xs"
                >
                  Clear All Filters
                </button>
                <button type="submit" className="btn-gov-primary text-xs">
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Results Header and Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ded7c4] pb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${activeTab === 'all'
                ? 'bg-[#006c51] text-white'
                : 'text-gov-sand-700 hover:bg-[#faf8f2]'
              }`}
          >
            All Results ({totalResults})
          </button>
          <button
            onClick={() => setActiveTab('evaluations')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${activeTab === 'evaluations'
                ? 'bg-[#006c51] text-white'
                : 'text-gov-sand-700 hover:bg-[#faf8f2]'
              }`}
          >
            Evaluations ({evaluations.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${activeTab === 'reports'
                ? 'bg-[#006c51] text-white'
                : 'text-gov-sand-700 hover:bg-[#faf8f2]'
              }`}
          >
            Reports ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('instruments')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${activeTab === 'instruments'
                ? 'bg-[#006c51] text-white'
                : 'text-gov-sand-700 hover:bg-[#faf8f2]'
              }`}
          >
            Instruments ({instruments.length})
          </button>
        </div>

        <span className="text-xs text-gov-sand-500 font-mono">
          {loading ? 'Searching repository...' : `${totalResults} records indexed`}
        </span>
      </div>

      {/* Results List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-gov-sand-600">
          <div className="w-8 h-8 border-3 border-[#006c51] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Searching legal metrology registry...
        </div>
      ) : totalResults === 0 ? (
        <div className="gov-card p-12 text-center text-xs text-gov-sand-600 space-y-2">
          <Search className="w-10 h-10 text-gov-sand-300 mx-auto" />
          <h3 className="font-bold text-gov-sand-800 text-sm">No Matching Records Found</h3>
          <p className="text-gov-sand-500">
            No instruments, evaluations, or test reports matched your specified filter criteria.
          </p>
          <button onClick={handleClearFilters} className="btn-gov-secondary text-xs mt-2">
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Evaluations Section */}
          {(activeTab === 'all' || activeTab === 'evaluations') && evaluations.length > 0 && (
            <div className="gov-card overflow-hidden">
              <div className="gov-card-header">
                <div className="flex items-center space-x-2">
                  <FileCheck2 className="w-4 h-4 text-[#006c51]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gov-sand-900">
                    OIML R-76 Evaluations ({evaluations.length})
                  </h3>
                </div>
              </div>

              <div className="divide-y divide-[#ece7d8]">
                {evaluations.map((ev) => (
                  <div key={ev.id} className="p-4 hover:bg-[#fcfbf9] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link to={`/evaluations/${ev.id}`} className="font-mono font-bold text-[#006c51] hover:underline">
                          {ev.evaluationNumber}
                        </Link>
                        <EvaluationStatusBadge state={ev.state} />
                        <span className="text-[10px] text-gov-sand-400 font-mono">
                          {new Date(ev.evaluationDate).toLocaleDateString('en-IN')}
                        </span>
                      </div>

                      <div className="font-medium text-gov-sand-900">
                        {ev.instrument?.manufacturer} — {ev.instrument?.model}
                      </div>

                      <div className="text-[11px] text-gov-sand-600 flex flex-wrap items-center gap-2">
                        <span>Serial: <strong className="font-mono">{ev.instrument?.serialNumber}</strong></span>
                        <span>•</span>
                        <span>Lab: {ev.laboratory?.name}</span>
                        <span>•</span>
                        <span>Testing Officer: {ev.testingOfficer?.name}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <Link to={`/evaluations/${ev.id}`} className="btn-gov-secondary text-xs">
                        Open Session &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reports Section */}
          {(activeTab === 'all' || activeTab === 'reports') && reports.length > 0 && (
            <div className="gov-card overflow-hidden">
              <div className="gov-card-header">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-[#006c51]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gov-sand-900">
                    Test Reports & Certificates ({reports.length})
                  </h3>
                </div>
              </div>

              <div className="divide-y divide-[#ece7d8]">
                {reports.map((rpt) => (
                  <div key={rpt.id} className="p-4 hover:bg-[#fcfbf9] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link to={`/reports/${rpt.id}`} className="font-mono font-bold text-[#006c51] hover:underline">
                          {rpt.reportId}
                        </Link>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${rpt.status === 'FINALIZED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                          {rpt.status}
                        </span>
                        <span className="text-[10px] font-mono text-gov-sand-500">v{rpt.version}</span>
                      </div>

                      <div className="font-medium text-gov-sand-900">
                        {rpt.evaluation?.instrument?.model} ({rpt.evaluation?.instrument?.manufacturer})
                      </div>

                      <div className="text-[11px] text-gov-sand-600 flex flex-wrap items-center gap-2">
                        <span>Rule: <strong className="font-mono">{rpt.ruleConfig?.version || 'OIML-R76-2006'}</strong></span>
                        <span>•</span>
                        <span>Generated: {new Date(rpt.createdAt).toLocaleDateString('en-IN')}</span>
                        {rpt.integrityHash && (
                          <span className="font-mono text-[10px] text-emerald-700 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            SHA-256: {rpt.integrityHash.slice(0, 12)}...
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <Link to={`/reports/${rpt.id}`} className="btn-gov-secondary text-xs">
                        View Report &rarr;
                      </Link>
                      <a
                        href={api.getReportExportUrl(rpt.id, 'pdf')}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-gov-outline text-xs text-red-700 border-red-200 hover:bg-red-50"
                      >
                        PDF
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instruments Section */}
          {(activeTab === 'all' || activeTab === 'instruments') && instruments.length > 0 && (
            <div className="gov-card overflow-hidden">
              <div className="gov-card-header">
                <div className="flex items-center space-x-2">
                  <Scale className="w-4 h-4 text-[#006c51]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gov-sand-900">
                    Instruments Registry ({instruments.length})
                  </h3>
                </div>
              </div>

              <div className="divide-y divide-[#ece7d8]">
                {instruments.map((inst) => (
                  <div key={inst.id} className="p-4 hover:bg-[#fcfbf9] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link to={`/passport/${inst.id}`} className="font-mono font-bold text-blue-700 hover:underline">
                          {inst.passportId}
                        </Link>
                        <AccuracyClassBadge accuracyClass={inst.accuracyClass} />
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${inst.status === 'CERTIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                          {inst.status}
                        </span>
                      </div>

                      <div className="font-medium text-gov-sand-900">
                        {inst.model} • {inst.manufacturer}
                      </div>

                      <div className="text-[11px] text-gov-sand-600 flex flex-wrap items-center gap-2">
                        <span>Serial: <strong className="font-mono">{inst.serialNumber}</strong></span>
                        <span>•</span>
                        <span>Max: {inst.maxCapacity}{inst.verificationUnits}</span>
                        <span>•</span>
                        <span>e: {inst.scaleIntervalE}{inst.verificationUnits}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <Link to={`/passport/${inst.id}`} className="btn-gov-outline text-xs">
                        <BookMarked className="w-3.5 h-3.5 mr-1" /> Digital Passport
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
