import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Instrument, Evaluation } from '../types';
import { 
  AccuracyClassBadge, 
  EvaluationStatusBadge, 
  InstrumentStatusBadge 
} from '../components/ui/StatusBadge';
import { 
  Scale, 
  FileCheck2, 
  BookMarked, 
  ShieldCheck, 
  PlusCircle, 
  ArrowRight, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Building,
  UserCheck
} from 'lucide-react';
import { CreateInstrumentModal } from '../components/instruments/CreateInstrumentModal';
import { CreateEvaluationModal } from '../components/evaluations/CreateEvaluationModal';

export const Dashboard: React.FC = () => {
  const { user, isTestingOfficer, isReviewingOfficer, isAdmin } = useAuth();

  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  const [isInstrumentModalOpen, setIsInstrumentModalOpen] = useState(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [instRes, evalRes] = await Promise.all([
        api.getInstruments(),
        api.getEvaluations(),
      ]);
      setInstruments(instRes.instruments);
      setEvaluations(evalRes.evaluations);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Compute stat metrics
  const totalInstruments = instruments.length;
  const certifiedInstruments = instruments.filter(i => i.status === 'CERTIFIED').length;
  const activeEvaluations = evaluations.filter(e => e.state === 'In Progress').length;
  const underReviewEvaluations = evaluations.filter(e => e.state === 'Under Review').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Official Welcome & Role Header */}
      <div className="bg-white border border-[#ded7c4] rounded p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#a37b12]">
              National Legal Metrology Portal
            </span>
            <span className="text-gov-sand-400">•</span>
            <span className="text-xs text-gov-sand-600 font-medium">Session Active</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#006c51] mt-0.5">
            Welcome, {user?.name || 'Officer'}
          </h1>
          <p className="text-xs text-gov-sand-600 mt-0.5">
            {user?.designation || 'Legal Metrology Officer'} • {user?.department || 'Department of Consumer Affairs'}
          </p>
        </div>

        {/* Quick Action Buttons for Authorized Roles */}
        <div className="flex flex-wrap items-center gap-2">
          {(isTestingOfficer || isAdmin) && (
            <>
              <button
                onClick={() => setIsInstrumentModalOpen(true)}
                className="btn-gov-primary text-xs"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Register Instrument
              </button>
              <button
                onClick={() => setIsEvaluationModalOpen(true)}
                className="btn-gov-outline text-xs"
              >
                <FileCheck2 className="w-3.5 h-3.5 mr-1.5" /> Start OIML Evaluation
              </button>
            </>
          )}

          {isReviewingOfficer && (
            <Link
              to="/evaluations?state=Under%20Review"
              className="btn-gov-primary text-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Review Queue ({underReviewEvaluations})
            </Link>
          )}
        </div>
      </div>

      {/* Role specific notification banner */}
      {isReviewingOfficer && underReviewEvaluations > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r shadow-2xs flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-blue-700 shrink-0" />
            <div>
              <p className="text-xs font-bold text-blue-900">
                Action Required: {underReviewEvaluations} Evaluation(s) Awaiting Official Review
              </p>
              <p className="text-[11px] text-blue-700">
                You have pending OIML R-76 test reports submitted by Testing Officers requiring pattern verification endorsement.
              </p>
            </div>
          </div>
          <Link
            to="/evaluations?state=Under%20Review"
            className="text-xs font-bold text-blue-800 bg-white px-3 py-1.5 rounded border border-blue-300 hover:bg-blue-50 transition-colors shrink-0"
          >
            Review Now &rarr;
          </Link>
        </div>
      )}

      {/* 4 Stat Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Registered Instruments */}
        <div className="gov-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gov-sand-600 uppercase tracking-wider">
              Enrolled Instruments
            </span>
            <div className="w-8 h-8 rounded bg-gov-green-50 text-[#006c51] flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-serif text-[#006c51]">
            {loading ? '...' : totalInstruments}
          </div>
          <p className="text-[11px] text-gov-sand-500 mt-1">Non-Automatic Weighing Instruments</p>
          <div className="mt-3 pt-2 border-t border-[#ece7d8] flex justify-between items-center text-[11px]">
            <Link to="/instruments" className="text-[#006c51] hover:underline font-medium">
              View Registry &rarr;
            </Link>
            <span className="text-gov-sand-400">NAWI</span>
          </div>
        </div>

        {/* Card 2: Active Evaluations */}
        <div className="gov-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gov-sand-600 uppercase tracking-wider">
              Active Evaluations
            </span>
            <div className="w-8 h-8 rounded bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-serif text-amber-800">
            {loading ? '...' : activeEvaluations}
          </div>
          <p className="text-[11px] text-gov-sand-500 mt-1">In progress on test benches</p>
          <div className="mt-3 pt-2 border-t border-[#ece7d8] flex justify-between items-center text-[11px]">
            <Link to="/evaluations" className="text-amber-800 hover:underline font-medium">
              View Test Sessions &rarr;
            </Link>
            <span className="text-gov-sand-400">OIML R-76</span>
          </div>
        </div>

        {/* Card 3: Pending Reviews */}
        <div className="gov-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gov-sand-600 uppercase tracking-wider">
              Under Review
            </span>
            <div className="w-8 h-8 rounded bg-blue-50 text-blue-700 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-serif text-blue-900">
            {loading ? '...' : underReviewEvaluations}
          </div>
          <p className="text-[11px] text-gov-sand-500 mt-1">Awaiting Reviewing Officer action</p>
          <div className="mt-3 pt-2 border-t border-[#ece7d8] flex justify-between items-center text-[11px]">
            <Link to="/evaluations" className="text-blue-800 hover:underline font-medium">
              Review Reports &rarr;
            </Link>
            <span className="text-gov-sand-400">RBAC</span>
          </div>
        </div>

        {/* Card 4: Certified Passports */}
        <div className="gov-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gov-sand-600 uppercase tracking-wider">
              Certified Passports
            </span>
            <div className="w-8 h-8 rounded bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <BookMarked className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-serif text-emerald-800">
            {loading ? '...' : certifiedInstruments}
          </div>
          <p className="text-[11px] text-gov-sand-500 mt-1">Digital Metrology Passports issued</p>
          <div className="mt-3 pt-2 border-t border-[#ece7d8] flex justify-between items-center text-[11px]">
            <Link to="/passports" className="text-emerald-800 hover:underline font-medium">
              Open Ledger &rarr;
            </Link>
            <span className="text-gov-sand-400">Single Source</span>
          </div>
        </div>
      </div>

      {/* Grid: Recent Evaluations & Quick Instrument Registry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Recent OIML R-76 Evaluations */}
        <div className="lg:col-span-2 gov-card">
          <div className="gov-card-header">
            <div className="flex items-center space-x-2">
              <FileCheck2 className="w-4 h-4 text-[#006c51]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gov-sand-900">
                Recent OIML R-76 Evaluation Sessions
              </h3>
            </div>
            <Link to="/evaluations" className="text-xs text-[#006c51] hover:underline font-semibold">
              View All ({evaluations.length}) &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf8f2] text-gov-sand-600 font-semibold border-b border-[#e5dfd1]">
                <tr>
                  <th className="px-4 py-2.5">Evaluation ID</th>
                  <th className="px-4 py-2.5">Instrument Model</th>
                  <th className="px-4 py-2.5">Laboratory</th>
                  <th className="px-4 py-2.5">State</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ece7d8]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-gov-sand-500">
                      Loading evaluations...
                    </td>
                  </tr>
                ) : evaluations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-gov-sand-500">
                      No evaluations registered yet.
                    </td>
                  </tr>
                ) : (
                  evaluations.slice(0, 5).map((ev) => (
                    <tr key={ev.id} className="hover:bg-[#faf8f2] transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#006c51]">
                        <Link to={`/evaluations/${ev.id}`} className="hover:underline">
                          {ev.evaluationNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-gov-sand-900">
                        {ev.instrument?.model || 'Instrument'}
                        <span className="block text-[10px] text-gov-sand-500 font-normal">
                          {ev.instrument?.manufacturer}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gov-sand-700 truncate max-w-[160px]" title={ev.laboratory.name}>
                        {ev.laboratory.name}
                      </td>
                      <td className="px-4 py-3">
                        <EvaluationStatusBadge state={ev.state} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/evaluations/${ev.id}`}
                          className="text-[#006c51] hover:underline font-semibold"
                        >
                          Details &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right (1 col): Digital Passports Quick Access */}
        <div className="gov-card">
          <div className="gov-card-header">
            <div className="flex items-center space-x-2">
              <BookMarked className="w-4 h-4 text-[#006c51]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gov-sand-900">
                Digital Passports
              </h3>
            </div>
            <Link to="/passports" className="text-xs text-[#006c51] hover:underline font-semibold">
              Registry &rarr;
            </Link>
          </div>

          <div className="p-3 divide-y divide-[#ece7d8]">
            {loading ? (
              <p className="text-xs text-gov-sand-500 text-center py-4">Loading passports...</p>
            ) : instruments.length === 0 ? (
              <p className="text-xs text-gov-sand-500 text-center py-4">No instruments recorded.</p>
            ) : (
              instruments.slice(0, 4).map((inst) => (
                <div key={inst.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#006c51] block">
                        {inst.passportId}
                      </span>
                      <h4 className="text-xs font-bold text-gov-sand-900">
                        {inst.model}
                      </h4>
                      <p className="text-[10px] text-gov-sand-600 truncate">{inst.manufacturer}</p>
                    </div>
                    <InstrumentStatusBadge status={inst.status} />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-gov-sand-500">
                      {inst.maxCapacity} {inst.verificationUnits} (e={inst.scaleIntervalE})
                    </span>
                    <Link
                      to={`/passport/${inst.id}`}
                      className="text-[#006c51] hover:underline font-semibold flex items-center gap-0.5"
                    >
                      Passport Dossier &rarr;
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateInstrumentModal
        isOpen={isInstrumentModalOpen}
        onClose={() => setIsInstrumentModalOpen(false)}
        onCreated={() => loadDashboardData()}
      />
      <CreateEvaluationModal
        isOpen={isEvaluationModalOpen}
        onClose={() => setIsEvaluationModalOpen(false)}
        onCreated={() => loadDashboardData()}
      />
    </div>
  );
};
