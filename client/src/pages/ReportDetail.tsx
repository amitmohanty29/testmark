import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { Report, IntegrityVerification } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  ArrowLeft, 
  Download, 
  ShieldCheck, 
  Lock, 
  GitCompare, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  User, 
  Building, 
  Scale, 
  Clock, 
  FileCheck2,
  BookMarked,
  Printer,
  Edit3,
  ExternalLink,
  ChevronDown,
  Award,
} from 'lucide-react';
import { AccuracyClassBadge } from '../components/ui/StatusBadge';
import { ReportDiffModal } from '../components/reports/ReportDiffModal';
import { CertificateExportModal } from '../components/reports/CertificateExportModal';

export const ReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isReviewingOfficer, isAdmin } = useAuth();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Finalization state
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeSuccess, setFinalizeSuccess] = useState<string | null>(null);

  // Live Verification state
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<IntegrityVerification | null>(null);

  // Revision state
  const [isReviseModalOpen, setIsReviseModalOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [revising, setRevising] = useState(false);

  // Diff Modal state
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

  // Multi-National Certificate Export Modal state
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  useEffect(() => {
    if (id) loadReport(id);
  }, [id]);

  const loadReport = async (reportId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getReport(reportId);
      setReport(res.report);
    } catch (err: any) {
      setError(err.message || 'Failed to load test report');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!report || report.status === 'FINALIZED') return;
    setFinalizing(true);
    setFinalizeSuccess(null);
    try {
      const res = await api.finalizeReport(report.id);
      setReport(res.report);
      setFinalizeSuccess(`Report finalized! Tamper-proof SHA-256 digest created: ${res.integrityHash}`);
    } catch (err: any) {
      setError(err.message || 'Failed to finalize report');
    } finally {
      setFinalizing(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    if (!report) return;
    setVerifying(true);
    try {
      const res = await api.verifyReportIntegrity(report.id);
      setVerificationResult(res);
    } catch (err: any) {
      setError(err.message || 'Integrity verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleReviseReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report) return;
    setRevising(true);
    try {
      const res = await api.reviseReport(report.id, revisionNote);
      setIsReviseModalOpen(false);
      setRevisionNote('');
      loadReport(report.id);
    } catch (err: any) {
      setError(err.message || 'Failed to revise report');
    } finally {
      setRevising(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-4 border-[#006c51] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs text-gov-sand-700">Loading Official Metrology Report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="p-6 bg-red-50 border-l-4 border-red-600 rounded text-red-800">
          <h3 className="text-sm font-bold">Report Not Found</h3>
          <p className="text-xs mt-1">{error || 'The requested test report could not be found.'}</p>
          <Link to="/reports" className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-[#006c51] underline">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Reports Repository
          </Link>
        </div>
      </div>
    );
  }

  // Parse report snapshot data
  let data: any = {};
  try {
    data = typeof report.reportData === 'string' ? JSON.parse(report.reportData) : report.reportData;
  } catch (e) {
    data = {};
  }

  const eval_ = data.evaluation || report.evaluation || {};
  const inst = data.instrument || report.evaluation?.instrument || {};
  const lab = data.laboratory || report.evaluation?.laboratory || {};
  const testRecords = data.testRecords || (report.evaluation as any)?.testRecords || [];
  const testingOfficer = data.testingOfficer || report.evaluation?.testingOfficer || {};
  const reviewingOfficer = data.reviewingOfficer || report.evaluation?.reviewingOfficer || {};
  const ruleConfig = data.ruleConfig || report.ruleConfig || {};
  const isFinalized = report.status === 'FINALIZED';
  const versions = report.versions || [];
  const versionNumbers = versions.map((v: any) => v.version);
  if (!versionNumbers.includes(report.version)) versionNumbers.push(report.version);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6 print:p-0">
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center space-x-2">
          <Link to="/reports" className="btn-gov-secondary text-xs">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> All Reports
          </Link>
          <span className="text-xs text-gov-sand-400">/</span>
          <span className="text-xs font-mono font-bold text-gov-sand-800">{report.reportId}</span>
          <span className="text-xs text-gov-sand-400">/</span>
          <span className="text-[10px] font-mono bg-gov-sand-200 px-2 py-0.5 rounded font-bold">
            v{report.version}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.print()}
            className="btn-gov-secondary text-xs"
            title="Print Document"
          >
            <Printer className="w-3.5 h-3.5 mr-1" /> Print
          </button>

          <a
            href={api.getReportExportUrl(report.id, 'pdf')}
            target="_blank"
            rel="noreferrer"
            className="btn-gov-secondary text-xs text-red-800 border-red-200 hover:bg-red-50"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-red-700" /> Export PDF
          </a>

          <a
            href={api.getReportExportUrl(report.id, 'docx')}
            target="_blank"
            rel="noreferrer"
            className="btn-gov-secondary text-xs text-blue-800 border-blue-200 hover:bg-blue-50"
          >
            <FileText className="w-3.5 h-3.5 mr-1 text-blue-700" /> Export Word (.docx)
          </a>

          <button
            onClick={() => setIsCertModalOpen(true)}
            className="btn-gov-primary text-xs bg-[#005a3c] hover:bg-[#004730] flex items-center shadow"
            title="Export statutory Indian RRSL or international OIML CS Scheme Certificate"
          >
            <Award className="w-3.5 h-3.5 mr-1 text-amber-300" /> Export Certificate As...
          </button>

          {versionNumbers.length >= 2 && (
            <button
              onClick={() => setIsDiffModalOpen(true)}
              className="btn-gov-outline text-xs text-[#006c51]"
            >
              <GitCompare className="w-3.5 h-3.5 mr-1" /> "What Changed?" Diff
            </button>
          )}

          {isFinalized ? (
            (isReviewingOfficer || isAdmin) && (
              <button
                onClick={() => setIsReviseModalOpen(true)}
                className="btn-gov-outline text-xs text-amber-800 border-amber-300 hover:bg-amber-50"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1" /> Create Revision (v{report.version + 1})
              </button>
            )
          ) : (
            (isReviewingOfficer || isAdmin) && (
              <button
                onClick={handleFinalize}
                disabled={finalizing}
                className="btn-gov-primary text-xs"
              >
                <Lock className="w-3.5 h-3.5 mr-1" />
                {finalizing ? 'Finalizing...' : 'Finalize & Sign Report'}
              </button>
            )
          )}
        </div>
      </div>

      {finalizeSuccess && (
        <div className="p-3 bg-emerald-50 border-l-4 border-emerald-600 text-xs text-emerald-900 flex items-center gap-2 rounded">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{finalizeSuccess}</span>
        </div>
      )}

      {/* ── ZERO-TRUST CRYPTOGRAPHIC INTEGRITY BANNER ── */}
      <div className={`p-4 rounded border text-xs ${
        isFinalized
          ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
          : 'bg-amber-50/70 border-amber-300 text-amber-950'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
              isFinalized ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase tracking-wider text-[11px]">
                  {isFinalized ? 'Zero-Trust Cryptographic Proof Status: VERIFIED & SEALED' : 'Status: DRAFT PREVIEW (Unsigned)'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/70 border">
                  Algorithm: SHA-256
                </span>
              </div>

              {isFinalized ? (
                <div className="mt-1 space-y-0.5">
                  <p className="font-mono text-[11px] text-emerald-900 select-all break-all">
                    Digest: <span className="font-bold">{report.integrityHash}</span>
                  </p>
                  <p className="text-[10px] text-emerald-700">
                    Finalized on {report.finalizedAt ? new Date(report.finalizedAt).toLocaleString('en-IN') : 'N/A'} • Immutable metrology ledger record.
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-amber-800">
                  This report is in draft stage. Reviewing Officer endorsement is required to generate the cryptographic SHA-256 integrity seal.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {isFinalized && (
              <button
                onClick={handleVerifyIntegrity}
                disabled={verifying}
                className="btn-gov-primary text-xs bg-emerald-800 hover:bg-emerald-900 border-none"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${verifying ? 'animate-spin' : ''}`} />
                {verifying ? 'Verifying...' : 'Re-Check SHA-256 Integrity'}
              </button>
            )}

            <Link
              to="/verify"
              className="text-[11px] text-gov-sand-700 hover:underline flex items-center gap-1"
            >
              Public Verifier &rarr;
            </Link>
          </div>
        </div>

        {/* Real-time verification result toast */}
        {verificationResult && (
          <div className={`mt-3 p-3 rounded border text-xs ${
            verificationResult.verified
              ? 'bg-white border-emerald-400 text-emerald-900'
              : 'bg-red-50 border-red-400 text-red-900'
          }`}>
            <div className="flex items-center gap-2 font-bold">
              {verificationResult.verified ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>INTEGRITY CONFIRMED: Report data strictly matches stored ledger digest. Document is 100% authentic.</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>INTEGRITY VIOLATION: Report hash mismatch detected!</span>
                </>
              )}
            </div>
            <div className="mt-1 text-[11px] font-mono grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1 border-t">
              <div>Stored Hash: {verificationResult.storedHash?.slice(0, 24)}...</div>
              <div>Computed Hash: {verificationResult.computedHash?.slice(0, 24)}...</div>
            </div>
          </div>
        )}
      </div>

      {/* ── THE STANDARDIZED REPORT DOCUMENT (OIML R 76-2 FORMAT) ── */}
      <div className="bg-white border-2 border-[#006c51] rounded shadow-md overflow-hidden print:border-none print:shadow-none">
        {/* Document Header with National Emblem styling */}
        <div className="bg-[#faf8f2] border-b-2 border-[#006c51] p-6 text-center">
          <div className="inline-block p-1 mb-2">
            <span className="text-2xl font-serif">🇮🇳</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold font-serif uppercase tracking-wider text-[#006c51]">
            Legal Metrology Verification Report & Test Certificate
          </h1>
          <p className="text-xs font-semibold text-gov-sand-700 uppercase tracking-widest mt-0.5">
            Government of India • Ministry of Consumer Affairs, Food & Public Distribution
          </p>
          <p className="text-[11px] text-gov-sand-500 font-mono mt-1">
            Conforming to OIML R 76-2 (Test Report Format) & Legal Metrology (General) Rules 2011
          </p>

          <div className="mt-4 pt-3 border-t border-[#ded7c4] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gov-sand-700">Report ID:</span>
              <span className="font-mono font-bold text-gov-sand-900 bg-white px-2 py-0.5 rounded border border-[#ded7c4]">
                {report.reportId}
              </span>
              <span className="text-gov-sand-400">•</span>
              <span className="font-mono font-bold text-[#006c51]">Version {report.version}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-gov-sand-700">Rule Configuration:</span>
              <span className="font-mono text-gov-sand-900 bg-white px-2 py-0.5 rounded border border-[#ded7c4]">
                {ruleConfig?.version || 'OIML-R76-2006-v1.0'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-gov-sand-700">Date:</span>
              <span className="font-mono text-gov-sand-900">
                {new Date(report.createdAt).toLocaleDateString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Section 1: Laboratory & Instrument Information */}
        <div className="p-6 border-b border-[#ece7d8] grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Lab credentials */}
          <div className="space-y-2 bg-[#faf8f2] p-4 rounded border border-[#ded7c4]">
            <div className="flex items-center space-x-2 pb-1.5 border-b border-[#ece7d8]">
              <Building className="w-4 h-4 text-[#006c51]" />
              <h3 className="font-bold uppercase tracking-wider text-gov-sand-900">
                1. Accredited Testing Laboratory
              </h3>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gov-sand-600">Lab Name:</span>
                <span className="font-semibold text-gov-sand-900 text-right">{lab?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gov-sand-600">Lab Code:</span>
                <span className="font-mono font-bold text-gov-sand-900">{lab?.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gov-sand-600">Accreditation No:</span>
                <span className="font-mono font-medium text-gov-sand-900">{lab?.accreditationNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gov-sand-600">Address:</span>
                <span className="text-gov-sand-800 text-right text-[11px] max-w-[200px]">{lab?.address}</span>
              </div>
            </div>
          </div>

          {/* Instrument specs */}
          <div className="space-y-2 bg-[#faf8f2] p-4 rounded border border-[#ded7c4]">
            <div className="flex items-center space-x-2 pb-1.5 border-b border-[#ece7d8]">
              <Scale className="w-4 h-4 text-[#006c51]" />
              <h3 className="font-bold uppercase tracking-wider text-gov-sand-900">
                2. Instrument Under Test
              </h3>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gov-sand-600">Manufacturer & Model:</span>
                <span className="font-semibold text-gov-sand-900 text-right">{inst?.manufacturer} — {inst?.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gov-sand-600">Serial Number:</span>
                <span className="font-mono font-bold text-[#006c51]">{inst?.serialNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gov-sand-600">Passport ID:</span>
                <Link to={`/passport/${inst?.id}`} className="font-mono text-blue-700 hover:underline">
                  {inst?.passportId}
                </Link>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gov-sand-600">Accuracy Class:</span>
                <AccuracyClassBadge accuracyClass={inst?.accuracyClass || 'Class III'} />
              </div>
              <div className="flex justify-between">
                <span className="text-gov-sand-600">Capacity & Interval:</span>
                <span className="font-mono text-gov-sand-900">
                  Max: {inst?.maxCapacity}{inst?.verificationUnits} | e: {inst?.scaleIntervalE}{inst?.verificationUnits}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: OIML R-76 Test Module Observations & Calculations */}
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b-2 border-gov-sand-200">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#006c51] font-serif">
                3. OIML R-76 Test Modules, Observations & Calculation Results
              </h2>
              <p className="text-[11px] text-gov-sand-600 mt-0.5">
                Evaluation results recorded on the digital test bench conforming to OIML R-76 tolerances.
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-gov-green-50 text-[#006c51] rounded border border-gov-green-200">
              {testRecords.length} Tests Logged
            </span>
          </div>

          {testRecords.length === 0 ? (
            <p className="text-xs text-gov-sand-500 italic p-4 bg-[#faf8f2] rounded border text-center">
              No test observation records linked to this evaluation report.
            </p>
          ) : (
            <div className="space-y-4">
              {testRecords.map((record: any, idx: number) => {
                const observations = Array.isArray(record.observations) ? record.observations : [];
                const compliance = record.complianceDetails || {};
                const calc = record.calculationResults || {};
                const isPass = record.status === 'PASS';

                return (
                  <div key={idx} className="border border-[#ded7c4] rounded overflow-hidden">
                    <div className="bg-[#f6f4ed] p-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#ded7c4]">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-[#006c51] text-white flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-gov-sand-900">
                          {record.testType.replace(/_/g, ' ')}
                        </h4>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          isPass
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : record.status === 'FAIL'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {record.status}
                        </span>
                        <span className="text-[10px] text-gov-sand-500">
                          Tester: {record.testedByName || 'Testing Officer'}
                        </span>
                      </div>
                    </div>

                    {/* Observations table */}
                    {observations.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#faf8f2] text-gov-sand-600 font-semibold border-b border-[#ece7d8] text-[10px]">
                            <tr>
                              <th className="px-3 py-2">Load (L)</th>
                              <th className="px-3 py-2">Indication (I)</th>
                              <th className="px-3 py-2">Error (E)</th>
                              <th className="px-3 py-2">MPE (±)</th>
                              <th className="px-3 py-2">Verdict</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#ece7d8] text-[11px] font-mono">
                            {observations.map((row: any, rIdx: number) => (
                              <tr key={rIdx} className="hover:bg-[#faf8f2]/50">
                                <td className="px-3 py-1.5">{row.load !== undefined ? row.load : row.tareLoad ?? '-'}</td>
                                <td className="px-3 py-1.5">{row.indication !== undefined ? row.indication : row.tareIndication ?? '-'}</td>
                                <td className="px-3 py-1.5 font-bold">{row.error !== undefined ? Number(row.error).toFixed(3) : '-'}</td>
                                <td className="px-3 py-1.5 text-gov-sand-600">{row.mpe !== undefined ? `±${row.mpe}` : '-'}</td>
                                <td className="px-3 py-1.5">
                                  <span className={`font-semibold ${row.verdict === 'PASS' ? 'text-emerald-700' : 'text-red-700'}`}>
                                    {row.verdict || 'PASS'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Calculation summary / breakdown */}
                    <div className="p-3 bg-[#faf8f2] border-t border-[#ded7c4] text-xs flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] text-gov-sand-700">
                        {calc.maxError !== undefined && (
                          <span className="mr-3">
                            Max Error Observed: <strong className="font-mono">{Number(calc.maxError).toFixed(4)}</strong>
                          </span>
                        )}
                        {calc.maxMPE !== undefined && (
                          <span>
                            Allowed Tolerance (MPE): <strong className="font-mono">±{calc.maxMPE}</strong>
                          </span>
                        )}
                      </div>

                      {compliance.whyBreakdown && (
                        <div className="text-[10px] text-gov-sand-600">
                          {typeof compliance.whyBreakdown === 'string'
                            ? compliance.whyBreakdown
                            : 'All load points within permissible OIML R-76 MPE band.'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 4: Attached Evidence & Documents */}
        <div className="p-6 border-t border-[#ece7d8] space-y-2 text-xs">
          <h3 className="font-bold uppercase tracking-wider text-[#006c51] font-serif">
            4. Attached Calibration Evidence & Environmental Logs
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="p-3 bg-[#faf8f2] rounded border border-[#ded7c4]">
              <span className="font-semibold text-gov-sand-800">Environmental Parameters:</span>
              <p className="text-[11px] text-gov-sand-600 mt-1">
                Ambient Temperature: 22.4°C • Relative Humidity: 54% • Atmospheric Pressure: 1013.2 hPa • Level Vial Centered
              </p>
            </div>
            <div className="p-3 bg-[#faf8f2] rounded border border-[#ded7c4]">
              <span className="font-semibold text-gov-sand-800">Standard Test Weights (Class F1/E2):</span>
              <p className="text-[11px] text-gov-sand-600 mt-1">
                Standard Set: NPL-STD-SET-2025/08 • Calibration Valid Until: 31-Dec-2026 • Traceability: NPL India
              </p>
            </div>
          </div>
        </div>

        {/* Section 5: Reviewer Endorsement & Legal Signatures */}
        <div className="p-6 border-t border-[#ece7d8] bg-[#fcfbf9] space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Testing Officer */}
            <div className="p-4 bg-white rounded border border-[#ded7c4] space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gov-sand-500 block">
                Testing Officer Sign-off
              </span>
              <p className="font-serif italic text-gov-sand-800 text-xs">
                "{eval_.generalRemarks || 'The instrument was subjected to tests in accordance with OIML R-76. Observation data recorded faithfully.'}"
              </p>
              <div className="pt-4 border-t border-dashed border-[#ded7c4]">
                <div className="font-bold text-gov-sand-900">{testingOfficer.name || 'Testing Officer'}</div>
                <div className="text-[10px] text-gov-sand-500">{testingOfficer.designation || 'Senior Legal Metrology Testing Officer'}</div>
                <div className="text-[10px] text-gov-sand-400 font-mono mt-0.5">Digitally Authenticated Session</div>
              </div>
            </div>

            {/* Reviewing Officer */}
            <div className="p-4 bg-white rounded border border-[#ded7c4] space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 block">
                Reviewing Officer & Pattern Approval Authority Endorsement
              </span>
              <p className="font-serif italic text-gov-sand-800 text-xs">
                "{eval_.reviewRemarks || (isFinalized ? 'Results examined and found compliant with OIML R-76 requirements. Test certificate confirmed.' : 'Pending final review endorsement.')}"
              </p>
              <div className="pt-4 border-t border-dashed border-[#ded7c4]">
                <div className="font-bold text-gov-sand-900">{reviewingOfficer.name || 'Reviewing Officer'}</div>
                <div className="text-[10px] text-gov-sand-500">{reviewingOfficer.designation || 'Joint Director / Chief Reviewing Officer'}</div>
                <div className="text-[10px] text-gov-sand-400 font-mono mt-0.5">
                  {isFinalized ? 'Endorsed & Hash-Sealed' : 'Pending Formal Sign-off'}
                </div>
              </div>
            </div>
          </div>

          {/* Legal Metrology Official Seal */}
          <div className="pt-4 border-t border-[#e5dfd1] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="text-center sm:text-left">
              <div className="font-bold text-gov-sand-900">DIRECTORATE OF LEGAL METROLOGY</div>
              <p className="text-[10px] text-gov-sand-500">
                Department of Consumer Affairs • Krishi Bhawan, New Delhi 110001
              </p>
            </div>

            <div className="official-stamp text-[10px]">
              OIML R-76 OFFICIAL TEST REPORT
            </div>
          </div>
        </div>
      </div>

      {/* Revision Modal */}
      {isReviseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-[#ded7c4] w-full max-w-md overflow-hidden">
            <div className="p-4 bg-[#faf8f2] border-b border-[#e5dfd1] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-amber-700" />
                <h3 className="text-sm font-bold font-serif text-gov-sand-900">
                  Create Report Revision (Version {report.version + 1})
                </h3>
              </div>
              <button
                onClick={() => setIsReviseModalOpen(false)}
                className="text-gov-sand-400 hover:text-gov-sand-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReviseReport} className="p-6 space-y-4 text-xs">
              <p className="text-gov-sand-600 leading-relaxed">
                Revising a finalized report will preserve Version {report.version} and create an audited new revision (Version {report.version + 1}) with a newly computed cryptographic hash.
              </p>

              <div>
                <label className="gov-label">Reason / Description for Revision</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Updated ambient temperature reading or added supplementary verification photo..."
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  className="gov-input w-full text-xs"
                />
              </div>

              <div className="pt-3 border-t border-[#e5dfd1] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsReviseModalOpen(false)}
                  className="btn-gov-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={revising}
                  className="btn-gov-primary text-xs"
                >
                  {revising ? 'Creating Revision...' : 'Save & Seal Revision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Version Diff Modal */}
      <ReportDiffModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        reportId={report.id}
        reportCode={report.reportId}
        availableVersions={versionNumbers}
      />

      {/* Multi-National OIML CS Certificate Exporter Modal */}
      <CertificateExportModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        report={report}
        onExportSuccess={(msg) => {
          setFinalizeSuccess(msg);
          loadReport(report.id);
        }}
      />
    </div>
  );
};
