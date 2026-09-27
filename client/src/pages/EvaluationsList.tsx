import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Evaluation } from '../types';
import { EvaluationStatusBadge } from '../components/ui/StatusBadge';
import { 
  FileCheck2, 
  PlusCircle, 
  Search, 
  Filter, 
  BookMarked, 
  Building2, 
  User, 
  Calendar 
} from 'lucide-react';
import { CreateEvaluationModal } from '../components/evaluations/CreateEvaluationModal';
import { useAuth } from '../context/AuthContext';

export const EvaluationsList: React.FC = () => {
  const { isTestingOfficer, isAdmin, isReviewingOfficer } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialFilterState = searchParams.get('state') || 'ALL';
  const [selectedState, setSelectedState] = useState<string>(initialFilterState);
  const [search, setSearch] = useState('');
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadEvaluations();
  }, [selectedState]);

  const loadEvaluations = async () => {
    setLoading(true);
    try {
      const res = await api.getEvaluations({
        state: selectedState !== 'ALL' ? selectedState : undefined,
        search: search || undefined,
      });
      setEvaluations(res.evaluations);
    } catch (err) {
      console.error('Failed to load evaluations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadEvaluations();
  };

  const stateFilters = [
    { label: 'All Evaluations', value: 'ALL' },
    { label: 'Draft', value: 'Draft' },
    { label: 'In Progress', value: 'In Progress' },
    { label: 'Under Review', value: 'Under Review' },
    { label: 'Completed', value: 'Completed' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-[#006c51]" />
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#006c51]">
              OIML R-76 Evaluation Sessions
            </h1>
          </div>
          <p className="text-xs text-gov-sand-600 mt-0.5">
            Standardized Pattern Approval & Non-Automatic Weighing Instrument Test Protocols
          </p>
        </div>

        {(isTestingOfficer || isAdmin) && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-gov-primary text-xs shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Initiate New Evaluation
          </button>
        )}
      </div>

      {/* State Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-[#ded7c4]">
        {stateFilters.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setSelectedState(tab.value);
              setSearchParams(tab.value === 'ALL' ? {} : { state: tab.value });
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t transition-colors whitespace-nowrap ${
              selectedState === tab.value
                ? 'bg-[#006c51] text-white'
                : 'bg-gov-sand-100 text-gov-sand-700 hover:bg-gov-sand-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="bg-white p-3 rounded border border-[#ded7c4] shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gov-sand-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Evaluation Number, Instrument Model, Serial No, or Lab Name..."
              className="gov-input pl-9 text-xs"
            />
          </div>
          <button type="submit" className="btn-gov-secondary text-xs px-4">
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="gov-card">
        <div className="gov-card-header">
          <span className="text-xs font-bold uppercase tracking-wider text-gov-sand-900">
            Evaluation Register ({evaluations.length})
          </span>
          <span className="text-[11px] text-gov-sand-500 font-mono">
            State: {selectedState}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#faf8f2] text-gov-sand-600 font-semibold border-b border-[#e5dfd1]">
              <tr>
                <th className="px-4 py-3">Evaluation ID</th>
                <th className="px-4 py-3">Instrument & Class</th>
                <th className="px-4 py-3">Laboratory</th>
                <th className="px-4 py-3">Testing Officer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ece7d8]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gov-sand-500">
                    <div className="w-8 h-8 border-2 border-[#006c51] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Fetching evaluation records...
                  </td>
                </tr>
              ) : evaluations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gov-sand-500">
                    No evaluations found in state '{selectedState}'.
                  </td>
                </tr>
              ) : (
                evaluations.map((ev) => (
                  <tr key={ev.id} className="hover:bg-[#faf8f2] transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-[#006c51]">
                      <Link to={`/evaluations/${ev.id}`} className="hover:underline">
                        {ev.evaluationNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-gov-sand-900">
                        {ev.instrument?.model || '—'}
                      </div>
                      <div className="text-[11px] text-gov-sand-500">
                        {ev.instrument?.manufacturer} (SN: {ev.instrument?.serialNumber})
                      </div>
                      <div className="text-[10px] text-gov-sand-400 mt-0.5">
                        {ev.instrument?.accuracyClass} • Max {ev.instrument?.maxCapacity}{ev.instrument?.verificationUnits}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gov-sand-800">
                      <div className="font-medium text-gov-sand-900">{ev.laboratory.name}</div>
                      <div className="text-[10px] font-mono text-gov-sand-500">{ev.laboratory.accreditationNumber}</div>
                    </td>
                    <td className="px-4 py-3.5 text-gov-sand-800">
                      <div>{ev.testingOfficer.name}</div>
                      {ev.reviewingOfficer && (
                        <div className="text-[10px] text-blue-700">
                          Reviewer: {ev.reviewingOfficer.name}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-gov-sand-700 font-mono text-[11px]">
                      {new Date(ev.evaluationDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3.5">
                      <EvaluationStatusBadge state={ev.state} />
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <Link
                        to={`/evaluations/${ev.id}`}
                        className="btn-gov-outline text-[11px] py-1 px-2.5"
                      >
                        Open Session &rarr;
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
      <CreateEvaluationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => loadEvaluations()}
      />
    </div>
  );
};
