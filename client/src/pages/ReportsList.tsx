import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Report, Evaluation } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  ShieldCheck, 
  Lock, 
  PlusCircle, 
  FileCheck2, 
  ArrowRight,
  ExternalLink,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const ReportsList: React.FC = () => {
  const { user, isTestingOfficer, isReviewingOfficer, isAdmin } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal to generate report from completed evaluations
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [completedEvaluations, setCompletedEvaluations] = useState<Evaluation[]>([]);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await api.getReports({
        search: search || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setReports(res.reports || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadReports();
  };

  const openGenerateModal = async () => {
    setIsGenerateModalOpen(true);
    setGenerateError(null);
    try {
      const res = await api.getEvaluations();
      // Can generate report for evaluations in any advanced stage (Under Review or Completed)
      const eligible = res.evaluations.filter(
        (e: Evaluation) => e.state === 'Completed' || e.state === 'Under Review' || e.state === 'In Progress'
      );
      setCompletedEvaluations(eligible);
      if (eligible.length > 0) setSelectedEvaluationId(eligible[0].id);
    } catch (err: any) {
      setGenerateError('Failed to fetch evaluations for report generation');
    }
  };

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvaluationId) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await api.generateReport(selectedEvaluationId);
      setIsGenerateModalOpen(false);
      loadReports();
    } catch (err: any) {
      setGenerateError(err.message || 'Failed to generate standardized report');
    } finally {
      setGenerating(false);
    }
  };

  // Metrics
  const totalReports = reports.length;
  const finalizedReports = reports.filter((r) => r.status === 'FINALIZED').length;
  const draftReports = reports.filter((r) => r.status === 'DRAFT').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-[#ded7c4] rounded p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#a37b12]">
              Official OIML R-76 Certification Registry
            </span>
            <span className="text-gov-sand-400">•</span>
            <span className="text-xs text-gov-sand-600 font-medium">Standardized Test Reports</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#006c51] mt-0.5">
            OIML R-76 Test Reports & Certificates
          </h1>
          <p className="text-xs text-gov-sand-600 mt-0.5">
            Auto-populated official metrology evaluation certificates with cryptographic SHA-256 integrity proofs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(isTestingOfficer || isAdmin) && (
            <button
              onClick={openGenerateModal}
              className="btn-gov-primary text-xs"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Auto-Generate Report
            </button>
          )}

          <Link
            to="/verify"
            className="btn-gov-outline text-xs text-[#006c51] border-[#006c51]"
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-[#006c51]" /> Verify SHA-256 Hash
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="gov-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gov-sand-600 uppercase tracking-wider">
              Total Test Reports
            </span>
            <div className="w-8 h-8 rounded bg-gov-green-50 text-[#006c51] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-serif text-[#006c51]">
            {loading ? '...' : totalReports}
          </div>
          <p className="text-[11px] text-gov-sand-500 mt-1">OIML R 76-2 Standard Format</p>
        </div>

        <div className="gov-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gov-sand-600 uppercase tracking-wider">
              Finalized & Hash-Protected
            </span>
            <div className="w-8 h-8 rounded bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-serif text-emerald-800">
            {loading ? '...' : finalizedReports}
          </div>
          <p className="text-[11px] text-gov-sand-500 mt-1">Locked with Zero-Trust SHA-256</p>
        </div>

        <div className="gov-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gov-sand-600 uppercase tracking-wider">
              Draft & Revisions
            </span>
            <div className="w-8 h-8 rounded bg-amber-50 text-amber-800 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-serif text-amber-800">
            {loading ? '...' : draftReports}
          </div>
          <p className="text-[11px] text-gov-sand-500 mt-1">Pending sign-off or revision</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="gov-card p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gov-sand-400" />
            <input
              type="text"
              placeholder="Search by Report ID (RPT-...), Evaluation, Manufacturer, or Serial Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="gov-input pl-9 text-xs w-full"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="gov-input text-xs py-2 px-3 w-full sm:w-40"
            >
              <option value="ALL">All Statuses</option>
              <option value="FINALIZED">Finalized (Hashed)</option>
              <option value="DRAFT">Draft Reports</option>
            </select>

            <button type="submit" className="btn-gov-secondary text-xs shrink-0">
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Reports Table */}
      <div className="gov-card overflow-hidden">
        <div className="gov-card-header">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-[#006c51]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-gov-sand-900">
              National Test Reports Repository ({reports.length})
            </h2>
          </div>
          <span className="text-[11px] text-gov-sand-500">
            Standard: OIML R 76-2 Test Report Format
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-gov-sand-600">
            <div className="w-8 h-8 border-3 border-[#006c51] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading test reports repository...
          </div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center text-xs text-gov-sand-600">
            <FileText className="w-10 h-10 text-gov-sand-300 mx-auto mb-2" />
            <p className="font-semibold text-gov-sand-800">No test reports found</p>
            <p className="text-gov-sand-500 mt-1">Try adjusting your search criteria or auto-generate a report from an evaluation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf8f2] text-gov-sand-600 font-semibold border-b border-[#e5dfd1]">
                <tr>
                  <th className="px-4 py-3">Report ID & Ver.</th>
                  <th className="px-4 py-3">Evaluation / Instrument</th>
                  <th className="px-4 py-3">Testing Laboratory</th>
                  <th className="px-4 py-3">Rule Version</th>
                  <th className="px-4 py-3">Status & Integrity</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ece7d8]">
                {reports.map((report) => {
                  const inst = report.evaluation?.instrument;
                  const lab = report.evaluation?.laboratory;
                  const isFinalized = report.status === 'FINALIZED';

                  return (
                    <tr key={report.id} className="hover:bg-[#fcfbf9] transition-colors">
                      {/* Report ID */}
                      <td className="px-4 py-3">
                        <Link
                          to={`/reports/${report.id}`}
                          className="font-mono font-bold text-[#006c51] hover:underline flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span>{report.reportId}</span>
                        </Link>
                        <span className="text-[10px] text-gov-sand-500 block mt-0.5">
                          Version {report.version}
                        </span>
                      </td>

                      {/* Instrument */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gov-sand-900">
                          {inst?.model || 'NAWI Instrument'}
                        </div>
                        <div className="text-[10px] text-gov-sand-500 flex items-center gap-2 mt-0.5">
                          <span>{inst?.manufacturer}</span>
                          <span>•</span>
                          <span className="font-mono">{inst?.serialNumber}</span>
                        </div>
                        <Link
                          to={`/evaluations/${report.evaluationId}`}
                          className="text-[10px] text-blue-700 hover:underline font-mono block mt-0.5"
                        >
                          Eval: {report.evaluation?.evaluationNumber}
                        </Link>
                      </td>

                      {/* Laboratory */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gov-sand-800 line-clamp-1" title={lab?.name}>
                          {lab?.name || 'Accredited Lab'}
                        </div>
                        <span className="text-[10px] font-mono text-gov-sand-500">
                          {lab?.code}
                        </span>
                      </td>

                      {/* Rule Version */}
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-mono rounded bg-gov-sand-100 text-gov-sand-800 border border-gov-sand-200">
                          {report.ruleConfig?.version || 'OIML-R76-2006-v1.0'}
                        </span>
                      </td>

                      {/* Status & Hash */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          {isFinalized ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <Lock className="w-3 h-3 text-emerald-700" /> FINALIZED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800">
                              DRAFT
                            </span>
                          )}

                          {report.integrityHash ? (
                            <span
                              className="text-[9px] font-mono text-emerald-700 flex items-center gap-1"
                              title={`SHA-256: ${report.integrityHash}`}
                            >
                              <ShieldCheck className="w-3 h-3 shrink-0" />
                              {report.integrityHash.slice(0, 10)}...
                            </span>
                          ) : (
                            <span className="text-[9px] text-gov-sand-400 italic">No hash</span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-gov-sand-600 font-mono text-[11px] whitespace-nowrap">
                        {new Date(report.createdAt).toLocaleDateString('en-IN')}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <Link
                            to={`/reports/${report.id}`}
                            className="p-1.5 text-[#006c51] hover:bg-[#faf8f2] rounded border border-[#ded7c4]"
                            title="View Full Report"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          <a
                            href={api.getReportExportUrl(report.id, 'pdf')}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-red-700 hover:bg-red-50 rounded border border-red-200"
                            title="Export PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          <a
                            href={api.getReportExportUrl(report.id, 'docx')}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-blue-700 hover:bg-blue-50 rounded border border-blue-200"
                            title="Export Word (.docx)"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Report Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-[#ded7c4] w-full max-w-lg overflow-hidden">
            <div className="p-4 bg-[#faf8f2] border-b border-[#e5dfd1] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCheck2 className="w-4 h-4 text-[#006c51]" />
                <h3 className="text-sm font-bold font-serif text-gov-sand-900">
                  Auto-Populate OIML R-76 Test Report
                </h3>
              </div>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="text-gov-sand-400 hover:text-gov-sand-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateReport} className="p-6 space-y-4 text-xs">
              <p className="text-gov-sand-600">
                Select an active or completed evaluation session. The engine will automatically assemble all laboratory credentials, test observations, calculated errors, compliance breakdowns, and official officer endorsements into a standardized certificate.
              </p>

              {generateError && (
                <div className="p-3 bg-red-50 border-l-4 border-red-600 text-red-700 rounded">
                  {generateError}
                </div>
              )}

              <div>
                <label className="gov-label">Target Evaluation Session</label>
                <select
                  value={selectedEvaluationId}
                  onChange={(e) => setSelectedEvaluationId(e.target.value)}
                  className="gov-input w-full text-xs"
                  required
                >
                  {completedEvaluations.length === 0 ? (
                    <option value="">No evaluations available</option>
                  ) : (
                    completedEvaluations.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.evaluationNumber} — {ev.instrument?.model || 'NAWI'} ({ev.state})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="p-3 bg-[#faf8f2] rounded border border-[#ded7c4] text-[11px] text-gov-sand-600 space-y-1">
                <div className="font-semibold text-gov-sand-800">Included in Output:</div>
                <div>• Laboratory accreditation & test environment conditions</div>
                <div>• Complete test observation matrix & calculated errors</div>
                <div>• OIML R-76 Section 3 MPE tolerances verdict breakdown</div>
                <div>• Linked rule configuration version tracking</div>
              </div>

              <div className="pt-3 border-t border-[#e5dfd1] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="btn-gov-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating || !selectedEvaluationId}
                  className="btn-gov-primary text-xs"
                >
                  {generating ? 'Generating...' : 'Generate Standardized Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
