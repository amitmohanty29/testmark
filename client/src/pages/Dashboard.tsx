import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Instrument, Evaluation, Report, AuditLog } from '../types';
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
  UserCheck,
  FileText,
  Lock,
  Cpu,
  History,
  Download,
  Search,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';
import { CreateInstrumentModal } from '../components/instruments/CreateInstrumentModal';
import { CreateEvaluationModal } from '../components/evaluations/CreateEvaluationModal';

export const Dashboard: React.FC = () => {
  const { user, isTestingOfficer, isReviewingOfficer, isAdmin } = useAuth();

  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [recentAudit, setRecentAudit] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter view for officers (Toggle between "My Workload" and "All")
  const [workloadScope, setWorkloadScope] = useState<'my' | 'all'>(isAdmin ? 'all' : 'my');

  const [isInstrumentModalOpen, setIsInstrumentModalOpen] = useState(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [instRes, evalRes, rptRes, auditRes] = await Promise.all([
        api.getInstruments(),
        api.getEvaluations(),
        api.getReports(),
        api.getAuditLogs({ limit: '6' }).catch(() => ({ logs: [] })),
      ]);
      setInstruments(instRes.instruments || []);
      setEvaluations(evalRes.evaluations || []);
      setReports(rptRes.reports || []);
      setRecentAudit(auditRes.logs || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter evaluations based on role and scope
  const filteredEvaluations = evaluations.filter((e) => {
    if (workloadScope === 'all' || isAdmin) return true;
    if (isTestingOfficer) return e.testingOfficerId === user?.id;
    if (isReviewingOfficer) return e.reviewingOfficerId === user?.id || e.state === 'Under Review';
    return true;
  });

  // Calculate metrics
  const totalInstruments = instruments.length;
  const certifiedInstruments = instruments.filter(i => i.status === 'CERTIFIED').length;

  const inProgressCount = filteredEvaluations.filter(e => e.state === 'In Progress').length;
  const underReviewCount = filteredEvaluations.filter(e => e.state === 'Under Review').length;
  const completedCount = filteredEvaluations.filter(e => e.state === 'Completed').length;
  const draftCount = filteredEvaluations.filter(e => e.state === 'Draft').length;

  const totalReportsCount = reports.length;
  const finalizedReportsCount = reports.filter(r => r.status === 'FINALIZED').length;

  const totalEvalForRatio = filteredEvaluations.length || 1;
  const inProgressPct = Math.round((inProgressCount / totalEvalForRatio) * 100);
  const underReviewPct = Math.round((underReviewCount / totalEvalForRatio) * 100);
  const completedPct = Math.round((completedCount / totalEvalForRatio) * 100);
  const draftPct = Math.round((draftCount / totalEvalForRatio) * 100);

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
            <span className="text-gov-sand-400">•</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-[#006c51]/10 text-[#006c51]">
              Role: {user?.role.replace(/_/g, ' ')}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#006c51] mt-0.5">
            Welcome, {user?.name || 'Officer'}
          </h1>
          <p className="text-xs text-gov-sand-600 mt-0.5">
            {user?.designation || 'Legal Metrology Officer'} • {user?.department || 'Department of Consumer Affairs'}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!isAdmin && (
            <div className="flex rounded border border-[#ded7c4] bg-white p-0.5 text-xs mr-2">
              <button
                onClick={() => setWorkloadScope('my')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  workloadScope === 'my' ? 'bg-[#006c51] text-white' : 'text-gov-sand-700 hover:bg-[#faf8f2]'
                }`}
              >
                My Workload
              </button>
              <button
                onClick={() => setWorkloadScope('all')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  workloadScope === 'all' ? 'bg-[#006c51] text-white' : 'text-gov-sand-700 hover:bg-[#faf8f2]'
                }`}
              >
                Division Overview
              </button>
            </div>
          )}

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
                <FileCheck2 className="w-3.5 h-3.5 mr-1.5" /> Start Evaluation
              </button>
            </>
          )}

          {isReviewingOfficer && (
            <Link
              to="/evaluations?state=Under%20Review"
              className="btn-gov-primary text-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Review Queue ({underReviewCount})
            </Link>
          )}
        </div>
      </div>

      {/* Reviewing Officer Notification Banner */}
      {isReviewingOfficer && underReviewCount > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r shadow-2xs flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-blue-700 shrink-0" />
            <div>
              <p className="text-xs font-bold text-blue-900">
                Action Required: {underReviewCount} Evaluation(s) Awaiting Review & Endorsement
              </p>
              <p className="text-[11px] text-blue-700">
                Testing officers have submitted completed OIML R-76 test benches requiring pattern approval sign-off.
              </p>
            </div>
          </div>
          <Link
            to="/evaluations?state=Under%20Review"
            className="text-xs font-bold text-blue-800 bg-white px-3 py-1.5 rounded border border-blue-300 hover:bg-blue-50 transition-colors shrink-0"
          >
            Review Queue &rarr;
          </Link>
        </div>
      )}

      {/* ── CORE WORKLOAD & EVALUATION METRICS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active In-Progress Evaluations */}
        <div className="gov-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gov-sand-600 uppercase tracking-wider">
              {workloadScope === 'my' ? 'My In-Progress' : 'Evaluations In Progress'}
            </span>
            <div className="w-8 h-8 rounded bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-serif text-amber-800">
            {loading ? '...' : inProgressCount}
          </div>
          <p className="text-[11px] text-gov-sand-500 mt-1">Active test bench sessions</p>
          <div className="mt-3 pt-2 border-t border-[#ece7d8] flex justify-between items-center text-[11px]">
            <Link to="/evaluations?state=In%20Progress" className="text-amber-800 hover:underline font-medium">
              View In Progress &rarr;
            </Link>
            <span className="text-gov-sand-400 font-mono">Stage 2</span>
          </div>
        </div>

        {/* Card 2: Pending Review */}
        <div className="gov-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gov-sand-600 uppercase tracking-wider">
              {workloadScope === 'my' ? 'Awaiting Review' : 'Pending Review'}
            </span>
            <div className="w-8 h-8 rounded bg-blue-50 text-blue-700 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-serif text-blue-900">
            {loading ? '...' : underReviewCount}
          </div>
          <p className="text-[11px] text-gov-sand-500 mt-1">Ready for officer sign-off</p>
          <div className="mt-3 pt-2 border-t border-[#ece7d8] flex justify-between items-center text-[11px]">
            <Link to="/evaluations?state=Under%20Review" className="text-blue-800 hover:underline font-medium">
              Review Queue &rarr;
            </Link>
            <span className="text-gov-sand-400 font-mono">Stage 3</span>
          </div>
        </div>

        {/* Card 3: Completed / Certified Evaluations */}
        <div className="gov-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gov-sand-600 uppercase tracking-wider">
              {workloadScope === 'my' ? 'My Completed' : 'Completed & Certified'}
            </span>
            <div className="w-8 h-8 rounded bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-serif text-emerald-800">
            {loading ? '...' : completedCount}
          </div>
          <p className="text-[11px] text-gov-sand-500 mt-1">Conforming OIML evaluations</p>
          <div className="mt-3 pt-2 border-t border-[#ece7d8] flex justify-between items-center text-[11px]">
            <Link to="/evaluations?state=Completed" className="text-emerald-800 hover:underline font-medium">
              View Completed &rarr;
            </Link>
            <span className="text-gov-sand-400 font-mono">Stage 4</span>
          </div>
        </div>

        {/* Card 4: Reports & Cryptographic Certificates */}
        <div className="gov-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gov-sand-600 uppercase tracking-wider">
              Hashed Reports
            </span>
            <div className="w-8 h-8 rounded bg-gov-green-50 text-[#006c51] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-serif text-[#006c51]">
            {loading ? '...' : `${finalizedReportsCount} / ${totalReportsCount}`}
          </div>
          <p className="text-[11px] text-gov-sand-500 mt-1">Finalized with SHA-256 proof</p>
          <div className="mt-3 pt-2 border-t border-[#ece7d8] flex justify-between items-center text-[11px]">
            <Link to="/reports" className="text-[#006c51] hover:underline font-medium">
              Reports Repository &rarr;
            </Link>
            <span className="text-gov-sand-400 font-mono">OIML R-76</span>
          </div>
        </div>
      </div>

      {/* ── WORKFLOW PIPELINE DISTRIBUTION VISUALIZER ── */}
      <div className="gov-card p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gov-sand-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#006c51]" />
              {workloadScope === 'my' ? 'My Evaluation Pipeline Distribution' : 'Division-Wide OIML Workflow Distribution'}
            </h3>
            <p className="text-[11px] text-gov-sand-600 mt-0.5">
              Live breakdown across Draft, In Progress, Under Review, and Completed stages ({filteredEvaluations.length} total).
            </p>
          </div>

          <span className="text-xs font-mono font-bold text-[#006c51]">
            {filteredEvaluations.length} Evaluations
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="h-4 w-full bg-[#ece7d8] rounded-full overflow-hidden flex">
          <div
            style={{ width: `${completedPct}%` }}
            className="bg-[#006c51] h-full transition-all duration-500"
            title={`Completed: ${completedCount} (${completedPct}%)`}
          />
          <div
            style={{ width: `${underReviewPct}%` }}
            className="bg-blue-600 h-full transition-all duration-500"
            title={`Under Review: ${underReviewCount} (${underReviewPct}%)`}
          />
          <div
            style={{ width: `${inProgressPct}%` }}
            className="bg-amber-500 h-full transition-all duration-500"
            title={`In Progress: ${inProgressCount} (${inProgressPct}%)`}
          />
          <div
            style={{ width: `${draftPct}%` }}
            className="bg-gov-sand-400 h-full transition-all duration-500"
            title={`Draft: ${draftCount} (${draftPct}%)`}
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#006c51]" />
            <span className="text-gov-sand-700">Completed ({completedCount})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span className="text-gov-sand-700">Under Review ({underReviewCount})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-gov-sand-700">In Progress ({inProgressCount})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gov-sand-400" />
            <span className="text-gov-sand-700">Draft Setup ({draftCount})</span>
          </div>
        </div>
      </div>

      {/* ── THREE PLATFORM DIFFERENTIATORS (CORE USPs) SPOTLIGHT ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* USP 1: Zero-Trust Report Integrity */}
        <div className="gov-card p-5 border-l-4 border-l-[#006c51] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded bg-[#006c51]/10 text-[#006c51] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#a37b12] block">
              Differentiator 1
            </span>
            <h3 className="text-sm font-bold font-serif text-gov-sand-900">
              Zero-Trust Cryptographic Integrity
            </h3>
            <p className="text-xs text-gov-sand-600 leading-relaxed">
              Every finalized report receives a SHA-256 digital fingerprint stored in the ledger. Public verification verifies tamper-proof legitimacy.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#ece7d8]">
            <Link to="/verify" className="text-xs font-semibold text-[#006c51] hover:underline flex items-center gap-1">
              Open Verification Portal &rarr;
            </Link>
          </div>
        </div>

        {/* USP 2: Rule Impact Simulator */}
        <div className="gov-card p-5 border-l-4 border-l-[#ff9933] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded bg-amber-100 text-amber-800 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#a37b12] block">
              Differentiator 2
            </span>
            <h3 className="text-sm font-bold font-serif text-gov-sand-900">
              OIML Rule Impact Simulator
            </h3>
            <p className="text-xs text-gov-sand-600 leading-relaxed">
              Test candidate regulatory rules against historical evaluation records in a read-only sandbox. Pinpoint which certificates would flip PASS → FAIL.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#ece7d8]">
            <Link to="/simulator" className="text-xs font-semibold text-amber-800 hover:underline flex items-center gap-1">
              Launch Sandbox Simulator &rarr;
            </Link>
          </div>
        </div>

        {/* USP 3: Immutable Audit Trail */}
        <div className="gov-card p-5 border-l-4 border-l-blue-600 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded bg-blue-100 text-blue-800 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#a37b12] block">
              Differentiator 3
            </span>
            <h3 className="text-sm font-bold font-serif text-gov-sand-900">
              Complete Regulatory Audit Trail
            </h3>
            <p className="text-xs text-gov-sand-600 leading-relaxed">
              Cryptographically timestamped accountability log capturing every actor, state change, and certificate export across the entire lifecycle.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#ece7d8]">
            <Link to="/audit" className="text-xs font-semibold text-blue-800 hover:underline flex items-center gap-1">
              Explore Audit Ledger &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* ── GRID: RECENT REPORTS & RECENT EVALUATION SESSIONS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recent Test Reports & Certifications */}
        <div className="gov-card overflow-hidden">
          <div className="gov-card-header">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-[#006c51]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gov-sand-900">
                Recent OIML Test Reports ({reports.length})
              </h3>
            </div>
            <Link to="/reports" className="text-xs text-[#006c51] hover:underline font-semibold">
              View All &rarr;
            </Link>
          </div>

          {reports.length === 0 ? (
            <div className="p-8 text-center text-xs text-gov-sand-500 italic">
              No test reports generated yet.
            </div>
          ) : (
            <div className="divide-y divide-[#ece7d8] text-xs">
              {reports.slice(0, 5).map((rpt) => (
                <div key={rpt.id} className="p-3.5 hover:bg-[#fcfbf9] transition-colors flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Link to={`/reports/${rpt.id}`} className="font-mono font-bold text-[#006c51] hover:underline">
                        {rpt.reportId}
                      </Link>
                      <span className={`px-2 py-0.2 rounded text-[9px] font-bold ${
                        rpt.status === 'FINALIZED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {rpt.status}
                      </span>
                      <span className="text-[10px] font-mono text-gov-sand-500">v{rpt.version}</span>
                    </div>

                    <p className="text-[11px] text-gov-sand-800 font-medium">
                      {rpt.evaluation?.instrument?.model || 'NAWI Instrument'} ({rpt.evaluation?.instrument?.manufacturer})
                    </p>

                    <div className="text-[10px] text-gov-sand-500 flex items-center gap-2">
                      <span>{new Date(rpt.createdAt).toLocaleDateString('en-IN')}</span>
                      {rpt.integrityHash && (
                        <span className="font-mono text-emerald-700 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          {rpt.integrityHash.slice(0, 10)}...
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <Link to={`/reports/${rpt.id}`} className="p-1.5 text-[#006c51] hover:bg-[#faf8f2] rounded border border-[#ded7c4]" title="View Report">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                    <a
                      href={api.getReportExportUrl(rpt.id, 'pdf')}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-red-700 hover:bg-red-50 rounded border border-red-200"
                      title="Download PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Recent Evaluation Sessions */}
        <div className="gov-card overflow-hidden">
          <div className="gov-card-header">
            <div className="flex items-center space-x-2">
              <FileCheck2 className="w-4 h-4 text-[#006c51]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gov-sand-900">
                {workloadScope === 'my' ? 'My Recent Evaluations' : 'Recent Evaluations'} ({filteredEvaluations.length})
              </h3>
            </div>
            <Link to="/evaluations" className="text-xs text-[#006c51] hover:underline font-semibold">
              View All &rarr;
            </Link>
          </div>

          {filteredEvaluations.length === 0 ? (
            <div className="p-8 text-center text-xs text-gov-sand-500 italic">
              No evaluation sessions in current view.
            </div>
          ) : (
            <div className="divide-y divide-[#ece7d8] text-xs">
              {filteredEvaluations.slice(0, 5).map((ev) => (
                <div key={ev.id} className="p-3.5 hover:bg-[#fcfbf9] transition-colors flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Link to={`/evaluations/${ev.id}`} className="font-mono font-bold text-[#006c51] hover:underline">
                        {ev.evaluationNumber}
                      </Link>
                      <EvaluationStatusBadge state={ev.state} />
                    </div>

                    <p className="text-[11px] text-gov-sand-800 font-medium">
                      {ev.instrument?.model} ({ev.instrument?.manufacturer})
                    </p>

                    <div className="text-[10px] text-gov-sand-500 flex items-center gap-2">
                      <span>Serial: <strong className="font-mono">{ev.instrument?.serialNumber}</strong></span>
                      <span>•</span>
                      <span>{new Date(ev.evaluationDate).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>

                  <Link to={`/evaluations/${ev.id}`} className="btn-gov-secondary text-xs">
                    Open &rarr;
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals for Instrument and Evaluation creation */}
      <CreateInstrumentModal
        isOpen={isInstrumentModalOpen}
        onClose={() => setIsInstrumentModalOpen(false)}
        onCreated={loadDashboardData}
      />

      <CreateEvaluationModal
        isOpen={isEvaluationModalOpen}
        onClose={() => setIsEvaluationModalOpen(false)}
        onCreated={loadDashboardData}
      />
    </div>
  );
};
