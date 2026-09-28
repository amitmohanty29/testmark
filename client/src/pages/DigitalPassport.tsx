import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { AccuracyClassBadge, InstrumentStatusBadge } from '../components/ui/StatusBadge';
import { 
  ShieldCheck, 
  Printer, 
  Calendar, 
  User, 
  FileText, 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  Download, 
  PlusCircle, 
  ExternalLink,
  Layers,
  Award,
  FileCheck2, 
  Image as ImageIcon, 
  ZoomIn, 
  Copy, 
  Check, 
  X, 
  Upload, 
  ChevronDown, 
  ChevronRight, 
  AlertCircle,
  RotateCcw,
  GitCompare,
  Wrench,
  Search,
  Scale
} from 'lucide-react';
import QRCode from 'qrcode';
import { CreateEvaluationModal } from '../components/evaluations/CreateEvaluationModal';
import { useAuth } from '../context/AuthContext';

export const DigitalPassport: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isTestingOfficer, isReviewingOfficer, isAdmin } = useAuth();

  const [passport, setPassport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 5 required tabs: Timeline, Evaluations, Reports, Evidence & Documents, Audit Log
  const [activeTab, setActiveTab] = useState<'timeline' | 'evaluations' | 'reports' | 'evidence' | 'audit'>('timeline');

  // QR Code Data URL
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Modals & Popups
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRecalibrationModalOpen, setIsRecalibrationModalOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title?: string } | null>(null);
  const [copiedPassportId, setCopiedPassportId] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [diffModalData, setDiffModalData] = useState<{ report: any; versionA: any; versionB: any } | null>(null);

  // Timeline Filter State
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('ALL');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');

  // Upload Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Recalibration Form State
  const [recalDate, setRecalDate] = useState(new Date().toISOString().split('T')[0]);
  const [recalCertNo, setRecalCertNo] = useState('');
  const [recalLab, setRecalLab] = useState('');
  const [recalNextDue, setRecalNextDue] = useState('');
  const [recalRemarks, setRecalRemarks] = useState('');
  const [recalLoading, setRecalLoading] = useState(false);
  const [recalError, setRecalError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadPassport(id);
    }
  }, [id]);

  const loadPassport = async (passportOrInstrumentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getInstrumentPassport(passportOrInstrumentId);
      setPassport(res.passport);

      // Generate QR Code for this Passport URL
      const currentUrl = `${window.location.origin}/passport/${res.passport.passportId || passportOrInstrumentId}`;
      try {
        const url = await QRCode.toDataURL(currentUrl, {
          width: 90,
          margin: 1,
          color: { dark: '#006c51', light: '#ffffff' },
        });
        setQrDataUrl(url);
      } catch (qrErr) {
        console.warn('QR Code generation error:', qrErr);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load Digital Passport record');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPassportId = () => {
    if (!passport) return;
    const passportCode = passport.passportId || passport.instrument?.passportId;
    if (passportCode) {
      navigator.clipboard.writeText(passportCode);
      setCopiedPassportId(true);
      setTimeout(() => setCopiedPassportId(false), 2000);
    }
  };

  const handleDocumentUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passport) return;
    const instId = passport.instrument?.id || passport.id;

    if (!uploadFile && !uploadUrl) {
      setUploadError('Please select a file to upload or enter an external document URL.');
      return;
    }

    setUploadLoading(true);
    setUploadError(null);

    try {
      await api.uploadInstrumentDocument(
        instId,
        uploadFile || undefined,
        uploadTitle || (uploadFile ? uploadFile.name : 'Technical Specification Document'),
        uploadUrl || undefined
      );

      setIsUploadModalOpen(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadUrl('');
      await loadPassport(passport.passportId || passport.id);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleRecalibrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passport) return;
    if (!recalDate) {
      setRecalError('Calibration date is required.');
      return;
    }

    setRecalLoading(true);
    setRecalError(null);

    try {
      await api.recordPassportRecalibration(passport.id || passport.passportId, {
        calibrationDate: recalDate,
        certificateNumber: recalCertNo.trim() || undefined,
        laboratoryName: recalLab.trim() || undefined,
        nextDueDate: recalNextDue || undefined,
        remarks: recalRemarks.trim() || undefined,
      });

      setIsRecalibrationModalOpen(false);
      setRecalCertNo('');
      setRecalLab('');
      setRecalNextDue('');
      setRecalRemarks('');
      await loadPassport(passport.passportId || passport.id);
    } catch (err: any) {
      setRecalError(err.message || 'Failed to record recalibration event.');
    } finally {
      setRecalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 border-4 border-[#006c51] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-gov-sand-700">Accessing National Legal Metrology Central Ledger...</p>
        <p className="text-xs text-gov-sand-500 mt-1">Retrieving permanent instrument passport dossier</p>
      </div>
    );
  }

  if (error || !passport) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="p-6 bg-red-50 border-l-4 border-red-600 rounded text-red-800">
          <h3 className="text-base font-bold font-serif">Passport Record Not Found</h3>
          <p className="text-xs mt-1">{error || 'The requested instrument passport does not exist in the National Registry.'}</p>
          <Link to="/passports" className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-[#006c51] underline">
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Passports Registry
          </Link>
        </div>
      </div>
    );
  }

  // Normalize instrument and passport fields
  const inst = passport.instrument || passport;
  const passportCode = passport.passportId || inst.passportId;
  const evaluations = passport.evaluations || inst.evaluations || [];
  const documents = passport.documents || inst.documents || [];
  const events = passport.events || [];
  const auditLogs = passport.auditLogs || [];

  // Flatten reports across evaluations
  const allReports: any[] = passport.reports || evaluations.flatMap((e: any) =>
    (e.reports || []).map((r: any) => ({
      ...r,
      evaluationNumber: e.evaluationNumber,
      laboratoryName: e.laboratory?.name,
    }))
  );

  // Evidence attachments
  const allEvidence: any[] = passport.evidence || [];
  if (allEvidence.length === 0) {
    evaluations.forEach((ev: any) => {
      (ev.testRecords || []).forEach((tr: any) => {
        (tr.attachments || []).forEach((att: any) => {
          allEvidence.push({
            ...att,
            evaluationNumber: ev.evaluationNumber,
            evaluationId: ev.id,
            testType: tr.testType,
          });
        });
      });
    });
  }

  // Current compliance status from latest finalized evaluation or passport summary
  const completedEvaluations = evaluations.filter((e: any) => e.state === 'Completed');
  const latestCompleted = completedEvaluations[0] || null;
  const lastEvaluation = evaluations[0] || null;

  let complianceStatusText = 'PENDING_EVALUATION';
  if (inst.status === 'REJECTED') {
    complianceStatusText = 'NON_CONFORMING';
  } else if (passport.summary?.currentComplianceStatus) {
    complianceStatusText = passport.summary.currentComplianceStatus;
  } else if (latestCompleted) {
    complianceStatusText = 'CONFORMING_OIML_R76';
  } else if (evaluations.some((e: any) => e.state === 'Under Review')) {
    complianceStatusText = 'UNDER_REVIEW';
  } else if (evaluations.some((e: any) => e.state === 'In Progress')) {
    complianceStatusText = 'IN_EVALUATION';
  }

  // Filtered timeline events
  const filteredEvents = events.filter((ev: any) => {
    if (eventTypeFilter !== 'ALL' && ev.eventType !== eventTypeFilter) {
      return false;
    }
    if (dateFromFilter) {
      const evDate = new Date(ev.timestamp).getTime();
      const fromDate = new Date(dateFromFilter).getTime();
      if (evDate < fromDate) return false;
    }
    if (dateToFilter) {
      const evDate = new Date(ev.timestamp).getTime();
      const toDate = new Date(`${dateToFilter}T23:59:59`).getTime();
      if (evDate > toDate) return false;
    }
    return true;
  });

  // Format date in IST
  const formatIST = (dateString: string | Date) => {
    if (!dateString) return 'N/A';
    try {
      const d = new Date(dateString);
      return `${d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })}, ${d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })} IST`;
    } catch (e) {
      return String(dateString);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 print:p-0 space-y-6">
      {/* Top Breadcrumb & Back Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center space-x-2">
          <Link to="/passports" className="btn-gov-secondary text-xs">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> All Passports
          </Link>
          <span className="text-xs text-gov-sand-400">/</span>
          <span className="text-xs font-mono text-gov-sand-700 font-bold">{passportCode}</span>
        </div>

        <div className="text-[11px] text-gov-sand-500 font-mono">
          Central Digital Metrology Record • Permanent Dossier
        </div>
      </div>

      {/* Main Digital Passport Document Card */}
      <div className="bg-white border-2 border-[#d6cfbe] rounded shadow-gov-card overflow-hidden">
        
        {/* Certificate Top Banner with National Emblem */}
        <div className="bg-linear-to-b from-[#f7f5ee] to-[#ece7d8] px-6 py-5 border-b-2 border-[#006c51] relative">
          <div className="absolute right-6 top-4 opacity-10 pointer-events-none hidden sm:block">
            <ShieldCheck className="w-32 h-32 text-[#006c51]" />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center space-x-4">
              {/* National Emblem SVG */}
              <div className="w-14 h-16 bg-white border border-[#d6cfbe] p-1 rounded shadow-xs flex items-center justify-center shrink-0">
                <svg viewBox="0 0 100 120" className="w-10 h-12 text-[#006c51]" fill="currentColor">
                  <circle cx="50" cy="18" r="8" fill="#006c51" />
                  <path d="M42 28 C42 24, 58 24, 58 28 L58 50 C58 52, 42 52, 42 50 Z" fill="#006c51" />
                  <path d="M30 32 C30 28, 42 28, 42 36 L42 52 C36 52, 30 46, 30 32 Z" fill="#005842" />
                  <path d="M70 32 C70 28, 58 28, 58 36 L58 52 C64 52, 70 46, 70 32 Z" fill="#005842" />
                  <rect x="25" y="55" width="50" height="12" rx="2" fill="#a37b12" />
                  <circle cx="50" cy="61" r="5" fill="#fbfaf6" stroke="#006c51" strokeWidth="1.5" />
                  <path d="M20 70 L80 70 L75 82 L25 82 Z" fill="#006c51" />
                  <text x="50" y="98" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#006c51" fontFamily="serif">सत्यमेव जयते</text>
                </svg>
              </div>

              <div>
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#a37b12] block">
                  Government of India • Ministry of Consumer Affairs
                </span>
                <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#006c51] tracking-tight">
                  Instrument Digital Metrology Passport
                </h1>
                <p className="text-xs text-gov-sand-700 font-medium">
                  Central Permanent Record • OIML R-76 Pattern Approval & Lifetime Verification Dossier
                </p>
              </div>
            </div>

            {/* Passport ID Stamp & QR Code */}
            <div className="flex items-center gap-4">
              {/* QR Code linking to Passport URL */}
              {qrDataUrl && (
                <div className="flex flex-col items-center bg-white p-1 rounded border border-[#ded7c4] shadow-xs">
                  <img
                    src={qrDataUrl}
                    alt="Passport QR Code"
                    className="w-16 h-16 object-contain"
                    title={`Scan to verify Passport ${passportCode}`}
                  />
                  <span className="text-[8px] font-mono text-gov-sand-500 uppercase font-bold mt-0.5">
                    VERIFY QR
                  </span>
                </div>
              )}

              {/* Passport Reference Code & Copy */}
              <div className="flex flex-col items-center sm:items-end">
                <div className="official-stamp-gold text-[10px] mb-1.5">
                  PERMANENT RECORD
                </div>
                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded border border-[#ded7c4] shadow-xs">
                  <span className="text-[10px] text-gov-sand-500 font-bold uppercase">PASSPORT ID:</span>
                  <span className="text-xs font-mono font-bold text-[#006c51]">{passportCode}</span>
                  <button
                    type="button"
                    onClick={handleCopyPassportId}
                    className="p-1 hover:bg-gov-sand-100 rounded text-gov-sand-600 transition-colors"
                    title="Copy Passport ID"
                  >
                    {copiedPassportId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── HEADER BLOCK: Comprehensive Instrument Identity & Statutory Specs ── */}
        <div className="bg-[#fcfbf9] px-6 py-4 border-b border-[#ded7c4]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Column 1: Identity */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-gov-sand-900 font-serif">
                  {inst.manufacturer} {inst.model}
                </h2>
              </div>
              <div className="space-y-1 text-gov-sand-700">
                <div className="flex justify-between">
                  <span className="text-gov-sand-500">Serial Number:</span>
                  <strong className="font-mono text-gov-sand-900">{inst.serialNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gov-sand-500">Instrument Type:</span>
                  <span className="font-medium text-gov-sand-800 text-right">{inst.instrumentType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gov-sand-500">Accuracy Class:</span>
                  <AccuracyClassBadge accuracyClass={inst.accuracyClass} />
                </div>
              </div>
            </div>

            {/* Column 2: Metrological Parameters (Max, Min, e, d) */}
            <div className="space-y-1.5 border-l-0 md:border-l border-[#ded7c4] md:pl-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gov-sand-500 block">
                Capacity & Scale Intervals
              </span>
              <div className="space-y-1 text-gov-sand-700">
                <div className="flex justify-between">
                  <span className="text-gov-sand-500">Max Capacity:</span>
                  <strong className="font-mono text-gov-sand-900">{inst.maxCapacity} {inst.verificationUnits}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gov-sand-500">Min Capacity:</span>
                  <strong className="font-mono text-gov-sand-900">{inst.minCapacity} {inst.verificationUnits}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gov-sand-500">Scale Interval (e):</span>
                  <strong className="font-mono text-[#006c51]">{inst.scaleIntervalE} {inst.verificationUnits}</strong>
                </div>
                {inst.scaleIntervalD && (
                  <div className="flex justify-between">
                    <span className="text-gov-sand-500">Actual Interval (d):</span>
                    <span className="font-mono text-gov-sand-700">{inst.scaleIntervalD} {inst.verificationUnits}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Column 3: Compliance Status & Dates */}
            <div className="space-y-1.5 border-l-0 lg:border-l border-[#ded7c4] lg:pl-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gov-sand-500 block">
                Current Compliance Status
              </span>
              <div className="mt-1">
                {complianceStatusText === 'CONFORMING_OIML_R76' || complianceStatusText === 'CERTIFIED' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-700" /> CONFORMING (OIML R-76)
                  </span>
                ) : complianceStatusText === 'UNDER_REVIEW' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
                    <Clock className="w-3.5 h-3.5 text-blue-700" /> UNDER REVIEW
                  </span>
                ) : complianceStatusText === 'IN_EVALUATION' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    <Clock className="w-3.5 h-3.5 text-amber-700" /> IN EVALUATION
                  </span>
                ) : complianceStatusText === 'NON_CONFORMING' || complianceStatusText === 'REJECTED' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-red-100 text-red-900 border border-red-300">
                    <AlertCircle className="w-3.5 h-3.5 text-red-700" /> NON-CONFORMING
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-gov-sand-200 text-gov-sand-800 border border-gov-sand-300">
                    PENDING EVALUATION
                  </span>
                )}
              </div>

              <div className="space-y-1 text-gov-sand-700 pt-1">
                <div className="flex justify-between">
                  <span className="text-gov-sand-500">Last Evaluation:</span>
                  <span className="font-mono text-gov-sand-900">
                    {lastEvaluation ? new Date(lastEvaluation.evaluationDate).toLocaleDateString('en-IN') : 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gov-sand-500">Enrolled On:</span>
                  <span className="font-mono text-gov-sand-700">
                    {new Date(inst.createdAt || passport.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Column 4: Totals & Quick Summary */}
            <div className="space-y-1.5 border-l-0 lg:border-l border-[#ded7c4] lg:pl-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gov-sand-500 block">
                Lifecycle Totals
              </span>
              <div className="grid grid-cols-2 gap-2 text-center pt-1">
                <div className="bg-[#f0ede4] p-2 rounded border border-[#ded7c4]">
                  <span className="text-lg font-bold font-mono text-[#006c51] block">{evaluations.length}</span>
                  <span className="text-[9px] uppercase font-bold text-gov-sand-600">Evaluations</span>
                </div>
                <div className="bg-[#f0ede4] p-2 rounded border border-[#ded7c4]">
                  <span className="text-lg font-bold font-mono text-emerald-800 block">{allReports.length}</span>
                  <span className="text-[9px] uppercase font-bold text-gov-sand-600">Reports</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── ACTION BAR: Print Passport Summary & Management Controls ── */}
        <div className="px-6 py-3 bg-[#faf8f2] border-b border-[#ded7c4] flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            {/* Start Evaluation */}
            {(isTestingOfficer || isAdmin) && (
              <button
                type="button"
                onClick={() => setIsEvaluationModalOpen(true)}
                className="btn-gov-primary text-xs flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Start Evaluation
              </button>
            )}

            {/* Add Document / Photo */}
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="btn-gov-secondary text-xs flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-[#006c51]" /> Add Document / Photo
            </button>

            {/* Record Recalibration */}
            <button
              type="button"
              onClick={() => setIsRecalibrationModalOpen(true)}
              className="btn-gov-secondary text-xs flex items-center gap-1.5"
              title="Record periodic re-verification or recalibration"
            >
              <Wrench className="w-3.5 h-3.5 text-amber-700" /> Record Recalibration
            </button>
          </div>

          <div className="flex items-center gap-2 relative">
            {/* Print Passport Summary Button */}
            <a
              href={api.getPassportSummaryUrl(passportCode)}
              target="_blank"
              rel="noreferrer"
              className="btn-gov-outline text-xs flex items-center gap-1.5 text-gov-sand-900 border-[#006c51] hover:bg-[#006c51]/10 font-bold"
              title="Generate printable official A4 Passport Summary"
            >
              <Printer className="w-3.5 h-3.5 text-[#006c51]" />
              Print Passport Summary
            </a>

            {/* Export Dossier Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                className="btn-gov-secondary text-xs flex items-center gap-1.5 bg-white"
              >
                <Download className="w-3.5 h-3.5 text-[#006c51]" /> Export Dossier <ChevronDown className="w-3 h-3" />
              </button>

              {isExportDropdownOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-white rounded border border-[#ded7c4] shadow-lg py-1 z-20 text-xs">
                  <a
                    href={api.getPassportExportUrl(passportCode, 'pdf')}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setIsExportDropdownOpen(false)}
                    className="block px-4 py-2 hover:bg-[#faf8f2] text-gov-sand-900 font-medium"
                  >
                    Official PDF Dossier
                  </a>
                  <a
                    href={api.getPassportExportUrl(passportCode, 'json')}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setIsExportDropdownOpen(false)}
                    className="block px-4 py-2 hover:bg-[#faf8f2] text-gov-sand-900 font-medium"
                  >
                    Structured JSON Dossier
                  </a>
                  <div className="border-t border-[#ece7d8] my-1" />
                  <a
                    href={api.getPassportSummaryUrl(passportCode)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setIsExportDropdownOpen(false)}
                    className="block px-4 py-2 hover:bg-[#faf8f2] text-[#006c51] font-bold"
                  >
                    Printable A4 Summary
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 5 TABS: Timeline, Evaluations, Reports, Evidence & Documents, Audit Log ── */}
        <div className="px-6 bg-[#f7f5ee] border-b border-[#ded7c4] flex space-x-1 print:hidden overflow-x-auto">
          {/* Tab 1: Timeline */}
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'timeline'
                ? 'border-[#006c51] text-[#006c51] bg-white rounded-t'
                : 'border-transparent text-gov-sand-600 hover:text-gov-sand-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Timeline ({filteredEvents.length})
          </button>

          {/* Tab 2: Evaluations */}
          <button
            type="button"
            onClick={() => setActiveTab('evaluations')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'evaluations'
                ? 'border-[#006c51] text-[#006c51] bg-white rounded-t'
                : 'border-transparent text-gov-sand-600 hover:text-gov-sand-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Evaluations ({evaluations.length})
          </button>

          {/* Tab 3: Reports */}
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'reports'
                ? 'border-[#006c51] text-[#006c51] bg-white rounded-t'
                : 'border-transparent text-gov-sand-600 hover:text-gov-sand-900'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            Reports & Versions ({allReports.length})
          </button>

          {/* Tab 4: Evidence & Documents */}
          <button
            type="button"
            onClick={() => setActiveTab('evidence')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'evidence'
                ? 'border-[#006c51] text-[#006c51] bg-white rounded-t'
                : 'border-transparent text-gov-sand-600 hover:text-gov-sand-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Evidence & Documents ({documents.length + allEvidence.length})
          </button>

          {/* Tab 5: Audit Log */}
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-[#006c51] text-[#006c51] bg-white rounded-t'
                : 'border-transparent text-gov-sand-600 hover:text-gov-sand-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Audit Log ({auditLogs.length})
          </button>
        </div>

        {/* ── TAB CONTENT 1: Chronological Timeline (Newest First) ── */}
        {activeTab === 'timeline' && (
          <div className="p-6 space-y-4">
            {/* Timeline Filter Controls */}
            <div className="bg-[#faf8f2] p-3.5 rounded border border-[#ded7c4] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {/* Event Type Filter */}
                <div className="flex items-center gap-1.5">
                  <label className="font-bold text-gov-sand-700 uppercase text-[10px]">Event Type:</label>
                  <select
                    value={eventTypeFilter}
                    onChange={(e) => setEventTypeFilter(e.target.value)}
                    className="gov-input text-xs py-1 px-2"
                  >
                    <option value="ALL">All Events ({events.length})</option>
                    <option value="REGISTERED">REGISTERED</option>
                    <option value="DOCUMENT_ADDED">DOCUMENT_ADDED</option>
                    <option value="EVALUATION_CREATED">EVALUATION_CREATED</option>
                    <option value="TEST_RECORDED">TEST_RECORDED</option>
                    <option value="EVIDENCE_ATTACHED">EVIDENCE_ATTACHED</option>
                    <option value="SUBMITTED_FOR_REVIEW">SUBMITTED_FOR_REVIEW</option>
                    <option value="REVIEW_APPROVED">REVIEW_APPROVED</option>
                    <option value="REVIEW_RETURNED">REVIEW_RETURNED</option>
                    <option value="REPORT_GENERATED">REPORT_GENERATED</option>
                    <option value="REPORT_REVISED">REPORT_REVISED</option>
                    <option value="CERTIFICATE_EXPORTED">CERTIFICATE_EXPORTED</option>
                    <option value="INTEGRITY_VERIFIED">INTEGRITY_VERIFIED</option>
                    <option value="RECALIBRATION">RECALIBRATION</option>
                  </select>
                </div>

                {/* Date Range Filter */}
                <div className="flex items-center gap-1.5">
                  <label className="font-bold text-gov-sand-700 uppercase text-[10px]">Date Range:</label>
                  <input
                    type="date"
                    value={dateFromFilter}
                    onChange={(e) => setDateFromFilter(e.target.value)}
                    className="gov-input text-xs py-1 px-2"
                    title="From date"
                  />
                  <span className="text-gov-sand-400">to</span>
                  <input
                    type="date"
                    value={dateToFilter}
                    onChange={(e) => setDateToFilter(e.target.value)}
                    className="gov-input text-xs py-1 px-2"
                    title="To date"
                  />
                </div>
              </div>

              {(eventTypeFilter !== 'ALL' || dateFromFilter || dateToFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setEventTypeFilter('ALL');
                    setDateFromFilter('');
                    setDateToFilter('');
                  }}
                  className="btn-gov-secondary text-[11px] py-1 px-2 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Filters
                </button>
              )}
            </div>

            {/* Timeline Stream */}
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center text-gov-sand-500 text-xs bg-[#faf8f2] rounded border border-[#ded7c4]">
                No events match the selected filter criteria.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#ded7c4]">
                {filteredEvents.map((ev: any) => {
                  const isExpanded = expandedEventId === ev.id;
                  let parsedMeta: any = null;
                  if (ev.metadata) {
                    try {
                      parsedMeta = typeof ev.metadata === 'string' ? JSON.parse(ev.metadata) : ev.metadata;
                    } catch (e) {
                      parsedMeta = ev.metadata;
                    }
                  }

                  // Inline thumbnail check (from metadata or attached fileUrl)
                  const hasThumb = parsedMeta?.fileUrl && (
                    parsedMeta.fileType?.startsWith('image') ||
                    parsedMeta.fileName?.match(/\.(png|jpe?g|webp|gif|svg)$/i)
                  );

                  return (
                    <div key={ev.id} className="relative group text-xs">
                      {/* Timeline Node dot */}
                      <div className="absolute -left-[19px] top-2 w-4 h-4 rounded-full bg-white border-2 border-[#006c51] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#006c51]" />
                      </div>

                      <div className="bg-[#faf8f2] p-4 rounded border border-[#ded7c4] hover:border-[#006c51] transition-colors shadow-2xs space-y-2">
                        {/* Event Header: Date/Time (IST), Event Type badge, Ref link */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#006c51]/10 text-[#006c51] border border-[#006c51]/20">
                              {ev.eventType}
                            </span>

                            {/* Direct Links based on refType and refId */}
                            {ev.refType === 'EVALUATION' && ev.refId && (
                              <Link
                                to={`/evaluations/${ev.refId}`}
                                className="text-[11px] font-mono font-semibold text-[#006c51] hover:underline flex items-center gap-1"
                              >
                                Evaluation Ref &rarr;
                              </Link>
                            )}

                            {ev.refType === 'REPORT' && ev.refId && (
                              <Link
                                to={`/reports/${ev.refId.split('-v')[0]}`}
                                className="text-[11px] font-mono font-semibold text-[#006c51] hover:underline flex items-center gap-1"
                              >
                                Test Report Ref &rarr;
                              </Link>
                            )}

                            {ev.refType === 'DOCUMENT' && parsedMeta?.fileUrl && (
                              <a
                                href={parsedMeta.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-mono font-semibold text-[#006c51] hover:underline flex items-center gap-1"
                              >
                                View Document &rarr;
                              </a>
                            )}
                          </div>

                          {/* IST Timestamp */}
                          <span className="text-[11px] font-mono text-gov-sand-600 font-medium">
                            {formatIST(ev.timestamp)}
                          </span>
                        </div>

                        {/* Plain text summary line */}
                        <p className="text-xs text-gov-sand-900 leading-relaxed font-sans">
                          {ev.summary}
                        </p>

                        {/* Inline Evidence Thumbnails */}
                        {hasThumb && (
                          <div className="pt-1 flex items-center gap-3">
                            <div
                              onClick={() => setPreviewImage({ url: parsedMeta.fileUrl, title: parsedMeta.title || parsedMeta.fileName })}
                              className="cursor-pointer relative overflow-hidden rounded border border-[#ded7c4] w-24 h-24 bg-white flex items-center justify-center group/thumb shadow-xs"
                              title="Click to enlarge observation photo"
                            >
                              <img
                                src={parsedMeta.fileUrl}
                                alt={parsedMeta.title || 'Evidence Thumbnail'}
                                className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                <ZoomIn className="w-4 h-4 text-white" />
                              </div>
                            </div>
                            <div className="text-[11px] text-gov-sand-600">
                              <span className="font-bold text-gov-sand-800 block truncate max-w-xs">{parsedMeta.title || parsedMeta.fileName}</span>
                              <span className="text-[10px] text-gov-sand-500 font-mono block">Attached Evidence Photo</span>
                            </div>
                          </div>
                        )}

                        {/* Event Footer: Officer Name and Designation, Metadata toggle */}
                        <div className="pt-2 border-t border-[#ece7d8] flex items-center justify-between text-[11px] text-gov-sand-600 flex-wrap gap-2">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-gov-sand-500" />
                            <span>
                              Officer: <strong className="text-gov-sand-800">{ev.actorName || 'Authorized Officer'}</strong>
                              {ev.actorDesignation ? ` (${ev.actorDesignation})` : ''}
                            </span>
                          </div>

                          {parsedMeta && Object.keys(parsedMeta).length > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                              className="text-[#006c51] hover:underline font-mono text-[10px] flex items-center gap-0.5"
                            >
                              {isExpanded ? 'Hide Metadata' : 'View Event Metadata'}
                              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                          )}
                        </div>

                        {/* Expandable JSON Metadata */}
                        {isExpanded && parsedMeta && (
                          <div className="mt-2 p-3 bg-white rounded border border-[#ded7c4] overflow-x-auto text-[10px] font-mono text-gov-sand-800">
                            <pre>{JSON.stringify(parsedMeta, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB CONTENT 2: Evaluations Tab (With Rule Config Version) ── */}
        {activeTab === 'evaluations' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#e5dfd1]">
              <div>
                <h2 className="text-sm font-bold font-serif uppercase tracking-wider text-[#006c51] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#006c51]" />
                  Statutory Pattern Approval & Verification Sessions
                </h2>
                <p className="text-[11px] text-gov-sand-600 mt-0.5">
                  Complete listing of statutory evaluations conducted on this instrument. Rule configuration version used is recorded for each session.
                </p>
              </div>

              {(isTestingOfficer || isAdmin) && (
                <button
                  type="button"
                  onClick={() => setIsEvaluationModalOpen(true)}
                  className="btn-gov-primary text-xs py-1 px-3 flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Start Evaluation
                </button>
              )}
            </div>

            {evaluations.length === 0 ? (
              <div className="p-8 text-center text-gov-sand-500 text-xs bg-[#faf8f2] rounded border border-[#ded7c4]">
                <Clock className="w-8 h-8 text-gov-sand-400 mx-auto mb-2" />
                No statutory evaluations have been performed on this instrument yet.
              </div>
            ) : (
              <div className="space-y-3">
                {evaluations.map((ev: any) => {
                  const evReports = ev.reports || [];
                  const testCount = ev.testRecords?.length || 0;
                  const ruleVersionText = ev.ruleConfig?.version || ev.standardReference || 'OIML R 76-1:2006';

                  return (
                    <div
                      key={ev.id}
                      className="p-4 bg-white rounded border border-[#ded7c4] hover:border-[#006c51] transition-colors shadow-2xs space-y-3 text-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <Link
                            to={`/evaluations/${ev.id}`}
                            className="font-mono font-bold text-sm text-[#006c51] hover:underline"
                          >
                            {ev.evaluationNumber}
                          </Link>

                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ev.state === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : ev.state === 'Under Review'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {ev.state}
                          </span>

                          {/* Rule Version Used Display */}
                          <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                            <span className="text-[10px] uppercase font-bold text-amber-900">Rule Version:</span>
                            <span className="font-mono font-bold text-[#006c51] text-[11px]">{ruleVersionText}</span>
                          </div>
                        </div>

                        <div className="text-[11px] text-gov-sand-500 font-mono">
                          Date: {new Date(ev.evaluationDate).toLocaleDateString('en-IN')}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#faf8f2] p-2.5 rounded border border-[#ece7d8] text-[11px]">
                        <div>
                          <span className="text-gov-sand-500 block text-[10px] uppercase font-bold">Testing Laboratory</span>
                          <span className="font-semibold text-gov-sand-900">{ev.laboratory?.name || 'Central Metrology Lab'}</span>
                        </div>
                        <div>
                          <span className="text-gov-sand-500 block text-[10px] uppercase font-bold">Officers</span>
                          <span className="text-gov-sand-800">
                            Tester: {ev.testingOfficer?.name || 'Assigned'} | Reviewer: {ev.reviewingOfficer?.name || 'Pending'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gov-sand-500 block text-[10px] uppercase font-bold">Tests Conducted</span>
                          <span className="font-mono font-bold text-gov-sand-900">{testCount} Test Point Sets</span>
                        </div>
                      </div>

                      {/* Associated Reports & Direct Links */}
                      <div className="pt-2 border-t border-[#ece7d8] flex items-center justify-between flex-wrap gap-2 text-[11px]">
                        <div className="flex items-center gap-2">
                          <FileCheck2 className="w-3.5 h-3.5 text-[#006c51]" />
                          <span className="text-gov-sand-600 font-medium">Issued Reports:</span>
                          {evReports.length === 0 ? (
                            <span className="text-gov-sand-400 italic">None generated yet</span>
                          ) : (
                            evReports.map((r: any) => (
                              <Link
                                key={r.id}
                                to={`/reports/${r.id}`}
                                className="font-mono font-bold text-[#006c51] hover:underline"
                              >
                                {r.reportId} (v{r.version})
                              </Link>
                            ))
                          )}
                        </div>

                        <Link to={`/evaluations/${ev.id}`} className="btn-gov-secondary text-[11px] py-1 px-3">
                          Open Evaluation Session &rarr;
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB CONTENT 3: Reports (With All Versions & Export Formats) ── */}
        {activeTab === 'reports' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-[#e5dfd1]">
              <div>
                <h2 className="text-sm font-bold font-serif uppercase tracking-wider text-[#006c51] flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-[#006c51]" />
                  Statutory Test Reports & Version Revision History
                </h2>
                <p className="text-[11px] text-gov-sand-600 mt-0.5">
                  Every version of each issued test report is archived. Compare revisions with "What Changed?" and export certified formats.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#006c51] bg-[#006c51]/10 px-2.5 py-1 rounded">
                {allReports.length} Report{allReports.length === 1 ? '' : 's'} Issued
              </span>
            </div>

            {allReports.length === 0 ? (
              <div className="p-8 text-center text-gov-sand-500 text-xs bg-[#faf8f2] rounded border border-[#ded7c4]">
                No official test reports generated for this instrument yet.
              </div>
            ) : (
              <div className="space-y-6">
                {allReports.map((rpt: any) => {
                  const versions: any[] = rpt.versions || [];
                  return (
                    <div
                      key={rpt.id}
                      className="bg-white border-2 border-[#ded7c4] rounded shadow-xs overflow-hidden text-xs space-y-4 p-5"
                    >
                      {/* Report Master Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#ece7d8]">
                        <div>
                          <div className="flex items-center gap-2">
                            <Link to={`/reports/${rpt.id}`} className="font-mono font-bold text-base text-[#006c51] hover:underline">
                              {rpt.reportId}
                            </Link>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rpt.status === 'FINALIZED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {rpt.status}
                            </span>
                            <span className="font-mono text-gov-sand-600 font-bold">Latest: v{rpt.version}</span>
                          </div>
                          <p className="text-[11px] text-gov-sand-600 mt-0.5">
                            Issued: {new Date(rpt.createdAt).toLocaleDateString('en-IN')} | Generated By: {rpt.generatedByName || 'Legal Metrology Officer'}
                          </p>
                        </div>

                        {/* Export Formats Links */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] uppercase font-bold text-gov-sand-500">Exports:</span>
                          {/* Standard PDF */}
                          <a
                            href={api.getReportExportUrl(rpt.id, 'pdf')}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-gov-outline text-[11px] py-1 px-2.5 flex items-center gap-1 text-red-800 border-red-300"
                            title="Download standard statutory PDF report"
                          >
                            <Download className="w-3 h-3 text-red-700" /> PDF
                          </a>

                          {/* Indian RRSL Certificate Format */}
                          <a
                            href={`${api.getReportExportUrl(rpt.id, 'pdf')}&template=indian-rrsl`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-gov-secondary text-[11px] py-1 px-2.5 flex items-center gap-1"
                            title="Indian RRSL Certificate format"
                          >
                            <Download className="w-3 h-3 text-[#006c51]" /> Indian RRSL
                          </a>

                          {/* OIML CS Certificate Format */}
                          <a
                            href={`${api.getReportExportUrl(rpt.id, 'pdf')}&template=oiml-cs`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-gov-secondary text-[11px] py-1 px-2.5 flex items-center gap-1"
                            title="OIML CS Certificate format"
                          >
                            <Download className="w-3 h-3 text-blue-700" /> OIML CS
                          </a>
                        </div>
                      </div>

                      {/* Cryptographic Hash Seal */}
                      {rpt.integrityHash && (
                        <div className="bg-[#faf8f2] p-2.5 rounded border border-[#ece7d8] flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span className="font-mono text-gov-sand-700 truncate">
                              SHA-256 Digest: <strong>{rpt.integrityHash}</strong>
                            </span>
                          </div>
                          <Link
                            to={`/verify?reportId=${rpt.reportId}`}
                            className="text-[#006c51] font-semibold hover:underline shrink-0 ml-2"
                          >
                            Verify Seal &rarr;
                          </Link>
                        </div>
                      )}

                      {/* Version Revision History Table */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gov-sand-700 block">
                          Version Revisions on Record ({versions.length > 0 ? versions.length : 1})
                        </span>

                        <div className="overflow-x-auto border border-[#ded7c4] rounded">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#f7f5ee] text-gov-sand-700 font-semibold border-b border-[#ded7c4]">
                              <tr>
                                <th className="px-3 py-2 font-serif">Version</th>
                                <th className="px-3 py-2 font-serif">Created Date (IST)</th>
                                <th className="px-3 py-2 font-serif">Officer</th>
                                <th className="px-3 py-2 font-serif">Revision Note / What Changed</th>
                                <th className="px-3 py-2 font-serif">Integrity Digest</th>
                                <th className="px-3 py-2 text-right font-serif">Comparison</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ece7d8]">
                              {versions.length === 0 ? (
                                <tr>
                                  <td className="px-3 py-2 font-mono font-bold text-[#006c51]">v1</td>
                                  <td className="px-3 py-2 font-mono">{formatIST(rpt.createdAt)}</td>
                                  <td className="px-3 py-2">{rpt.generatedByName || 'Testing Officer'}</td>
                                  <td className="px-3 py-2 text-gov-sand-600">Initial statutory release</td>
                                  <td className="px-3 py-2 font-mono text-[10px] text-gov-sand-500">
                                    {rpt.integrityHash ? rpt.integrityHash.slice(0, 16) + '...' : 'Pending'}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gov-sand-400 italic">Base Version</td>
                                </tr>
                              ) : (
                                versions.map((v: any, vIdx: number) => {
                                  const prevVersion = vIdx > 0 ? versions[vIdx - 1] : null;
                                  return (
                                    <tr key={v.id} className="hover:bg-[#faf8f2]">
                                      <td className="px-3 py-2.5 font-mono font-bold text-[#006c51]">
                                        v{v.version}
                                      </td>
                                      <td className="px-3 py-2.5 font-mono">
                                        {formatIST(v.createdAt)}
                                      </td>
                                      <td className="px-3 py-2.5">
                                        {v.createdByName || 'Authorized Officer'}
                                      </td>
                                      <td className="px-3 py-2.5 text-gov-sand-800">
                                        {v.changeDescription || (v.version === 1 ? 'Initial statutory release' : 'Administrative revision')}
                                      </td>
                                      <td className="px-3 py-2.5 font-mono text-[10px] text-gov-sand-500" title={v.integrityHash}>
                                        {v.integrityHash ? v.integrityHash.slice(0, 16) + '...' : 'Pending'}
                                      </td>
                                      <td className="px-3 py-2.5 text-right">
                                        {prevVersion ? (
                                          <button
                                            type="button"
                                            onClick={() => setDiffModalData({ report: rpt, versionA: prevVersion, versionB: v })}
                                            className="btn-gov-secondary text-[10px] py-1 px-2 inline-flex items-center gap-1 text-[#006c51]"
                                            title="Compare changes between version"
                                          >
                                            <GitCompare className="w-3 h-3" /> What Changed?
                                          </button>
                                        ) : (
                                          <span className="text-[10px] text-gov-sand-400 italic">Base</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB CONTENT 4: Evidence & Documents Tab ── */}
        {activeTab === 'evidence' && (
          <div className="p-6 space-y-6">
            {/* Supporting Technical Documents */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#e5dfd1] mb-3">
                <div>
                  <h3 className="text-xs font-bold font-serif uppercase tracking-wider text-[#006c51] flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#006c51]" />
                    Technical Specifications, Manuals & Type Approval Dossiers ({documents.length})
                  </h3>
                  <p className="text-[11px] text-gov-sand-600 mt-0.5">
                    Statutory documents uploaded to the permanent instrument dossier.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(true)}
                  className="btn-gov-secondary text-xs py-1 px-3 flex items-center gap-1"
                >
                  <Upload className="w-3 h-3 text-[#006c51]" /> Upload Document
                </button>
              </div>

              {documents.length === 0 ? (
                <p className="text-xs text-gov-sand-500 italic p-3 bg-[#faf8f2] rounded border border-[#ded7c4]">
                  No technical specification or type approval documents uploaded.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {documents.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="p-3 bg-white rounded border border-[#ded7c4] shadow-2xs flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="truncate">
                        <h4 className="text-xs font-bold text-gov-sand-900 truncate" title={doc.title}>
                          {doc.title}
                        </h4>
                        <p className="text-[10px] text-gov-sand-500 truncate mt-0.5">{doc.fileName}</p>
                        <span className="text-[9px] text-gov-sand-400 block mt-1">
                          Enrolled: {new Date(doc.uploadedAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-[#006c51] hover:bg-gov-sand-100 rounded shrink-0"
                        title="Download / View"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Test Run Photographic Evidence & Calibration Attachments */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#e5dfd1] mb-3">
                <div>
                  <h3 className="text-xs font-bold font-serif uppercase tracking-wider text-[#006c51] flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#006c51]" />
                    Test Session Photographic Evidence & Observation Files ({allEvidence.length})
                  </h3>
                  <p className="text-[11px] text-gov-sand-600 mt-0.5">
                    Photographs and observation attachments collected across all evaluation sessions.
                  </p>
                </div>
              </div>

              {allEvidence.length === 0 ? (
                <p className="text-xs text-gov-sand-500 italic p-3 bg-[#faf8f2] rounded border border-[#ded7c4]">
                  No inline photographic evidence attached to test points yet.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {allEvidence.map((att: any) => {
                    const isImg = att.fileUrl && (att.fileType?.startsWith('image') || att.fileName?.match(/\.(png|jpe?g|webp|gif|svg)$/i));
                    return (
                      <div
                        key={att.id}
                        className="group bg-white border border-[#ded7c4] rounded p-2 shadow-2xs hover:border-[#006c51] transition-all flex flex-col items-center"
                      >
                        {isImg ? (
                          <div
                            onClick={() => setPreviewImage({ url: att.fileUrl, title: att.title || att.fileName })}
                            className="cursor-pointer relative overflow-hidden rounded w-full aspect-square bg-[#faf8f2] flex items-center justify-center"
                            title="Click to enlarge observation photo"
                          >
                            <img
                              src={att.fileUrl}
                              alt={att.title || att.fileName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <ZoomIn className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        ) : (
                          <a
                            href={att.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full aspect-square bg-[#f7f5ee] rounded flex flex-col items-center justify-center text-gov-sand-600 hover:text-[#006c51]"
                          >
                            <FileText className="w-8 h-8 mb-1" />
                            <span className="text-[9px] uppercase font-mono font-bold">ATTACHMENT</span>
                          </a>
                        )}
                        <span className="text-[10px] text-gov-sand-800 font-medium truncate w-full mt-1.5 text-center" title={att.title || att.fileName}>
                          {att.title || att.fileName}
                        </span>
                        <span className="text-[8px] font-mono text-gov-sand-400 block truncate">
                          {att.evaluationNumber || att.testType}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB CONTENT 5: Audit Log Tab ── */}
        {activeTab === 'audit' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#e5dfd1]">
              <div>
                <h2 className="text-sm font-bold font-serif uppercase tracking-wider text-[#006c51] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#006c51]" />
                  Instrument Access & Lifecycle Audit Trail
                </h2>
                <p className="text-[11px] text-gov-sand-600 mt-0.5">
                  Complete immutable ledger of all officer accesses, dossier views, printable summary exports, state transitions, and modifications.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#006c51] bg-[#006c51]/10 px-2.5 py-1 rounded">
                {auditLogs.length} Audit Entries
              </span>
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-gov-sand-500 text-xs bg-[#faf8f2] rounded border border-[#ded7c4]">
                No audit entries recorded for this passport yet.
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#ded7c4] rounded">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f7f5ee] text-gov-sand-700 font-semibold border-b border-[#ded7c4]">
                    <tr>
                      <th className="px-3 py-2.5 font-serif">Timestamp (IST)</th>
                      <th className="px-3 py-2.5 font-serif">Action</th>
                      <th className="px-3 py-2.5 font-serif">Officer</th>
                      <th className="px-3 py-2.5 font-serif">Role</th>
                      <th className="px-3 py-2.5 font-serif">Entity</th>
                      <th className="px-3 py-2.5 font-serif">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ece7d8]">
                    {auditLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-[#faf8f2]">
                        <td className="px-3 py-2 font-mono whitespace-nowrap">
                          {formatIST(log.createdAt)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                            log.action === 'VIEWED'
                              ? 'bg-blue-100 text-blue-800'
                              : log.action === 'PRINTED_SUMMARY'
                              ? 'bg-purple-100 text-purple-800'
                              : log.action === 'STATE_CHANGE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gov-sand-200 text-gov-sand-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium text-gov-sand-900 whitespace-nowrap">
                          {log.actorName}
                        </td>
                        <td className="px-3 py-2 text-[10px] font-mono text-gov-sand-600 whitespace-nowrap">
                          {log.actorRole}
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px] text-gov-sand-500 whitespace-nowrap">
                          {log.entityType}
                        </td>
                        <td className="px-3 py-2 text-gov-sand-700">
                          {log.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── FOOTER: Official Verification Seal & Legal Framework ── */}
        <div className="bg-[#f5f2e9] p-6 border-t border-[#e5dfd1] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="Verification QR"
                className="w-14 h-14 bg-white p-1 rounded border border-[#ded7c4] object-contain shrink-0"
              />
            )}
            <div className="text-xs text-gov-sand-700">
              <p className="font-bold text-gov-sand-900">National Legal Metrology Digital Passport Verification</p>
              <p className="text-[11px] font-mono text-gov-sand-500 mt-0.5">
                PERMANENT IDENTIFIER: {passportCode}
              </p>
              <p className="text-[10px] text-gov-sand-500 mt-0.5">
                Department of Consumer Affairs, Government of India • OIML R-76 Pattern Approval Authority
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <div className="official-stamp text-[10px]">
              OIML R-76 COMPLIANT
            </div>
            <p className="text-[10px] text-gov-sand-500 mt-1 font-mono">
              Central Digital Ledger • Govt. of India
            </p>
          </div>
        </div>
      </div>

      {/* Start Evaluation Modal */}
      <CreateEvaluationModal
        isOpen={isEvaluationModalOpen}
        onClose={() => setIsEvaluationModalOpen(false)}
        preselectedInstrumentId={inst.id}
        onCreated={() => loadPassport(passportCode || inst.id)}
      />

      {/* Add Document / Photo Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#d6cfbe] rounded shadow-2xl max-w-lg w-full p-6 space-y-4 animate-fadeIn text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#ece7d8]">
              <h3 className="text-sm font-bold font-serif text-[#006c51] flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-[#006c51]" />
                Enrol Technical Document or Photographic Evidence
              </h3>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-gov-sand-400 hover:text-gov-sand-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDocumentUploadSubmit} className="space-y-4">
              {uploadError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                  {uploadError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gov-sand-600 mb-1">
                  Document / Photo Title
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Type Approval Certificate, Front Load Cell Photo, etc."
                  className="gov-input text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gov-sand-600 mb-1">
                  Select Local File / Photo
                </label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="gov-input text-xs"
                  accept="image/*,.pdf,.doc,.docx,.xlsx,.csv"
                />
                <p className="text-[10px] text-gov-sand-400 mt-1">
                  Supports image attachments (JPG, PNG, WebP) and PDF/Office documents up to 50MB.
                </p>
              </div>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-[#ece7d8] w-full" />
                <span className="bg-white px-2 text-[10px] text-gov-sand-400 uppercase font-bold">OR</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gov-sand-600 mb-1">
                  External Cloud / Web URL
                </label>
                <input
                  type="url"
                  value={uploadUrl}
                  onChange={(e) => setUploadUrl(e.target.value)}
                  placeholder="https://example.gov.in/documents/approval.pdf"
                  className="gov-input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#ece7d8]">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="btn-gov-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading}
                  className="btn-gov-primary text-xs"
                >
                  {uploadLoading ? 'Uploading...' : 'Save & Link to Passport'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recalibration Recording Modal */}
      {isRecalibrationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#d6cfbe] rounded shadow-2xl max-w-lg w-full p-6 space-y-4 animate-fadeIn text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#ece7d8]">
              <h3 className="text-sm font-bold font-serif text-[#006c51] flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-amber-700" />
                Record Periodic Re-Verification / Recalibration
              </h3>
              <button
                type="button"
                onClick={() => setIsRecalibrationModalOpen(false)}
                className="text-gov-sand-400 hover:text-gov-sand-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecalibrationSubmit} className="space-y-4">
              {recalError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                  {recalError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gov-sand-600 mb-1">
                    Calibration Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={recalDate}
                    onChange={(e) => setRecalDate(e.target.value)}
                    className="gov-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gov-sand-600 mb-1">
                    Certificate Number
                  </label>
                  <input
                    type="text"
                    value={recalCertNo}
                    onChange={(e) => setRecalCertNo(e.target.value)}
                    placeholder="e.g. CAL-2026-RRSL-482"
                    className="gov-input text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gov-sand-600 mb-1">
                    Calibration Laboratory
                  </label>
                  <input
                    type="text"
                    value={recalLab}
                    onChange={(e) => setRecalLab(e.target.value)}
                    placeholder="e.g. RRSL Ahmedabad"
                    className="gov-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gov-sand-600 mb-1">
                    Next Due Date
                  </label>
                  <input
                    type="date"
                    value={recalNextDue}
                    onChange={(e) => setRecalNextDue(e.target.value)}
                    className="gov-input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gov-sand-600 mb-1">
                  Remarks / Verification Verdict
                </label>
                <textarea
                  rows={2}
                  value={recalRemarks}
                  onChange={(e) => setRecalRemarks(e.target.value)}
                  placeholder="Verification conducted with F1 working standards. Errors within in-service MPE."
                  className="gov-input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#ece7d8]">
                <button
                  type="button"
                  onClick={() => setIsRecalibrationModalOpen(false)}
                  className="btn-gov-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recalLoading}
                  className="btn-gov-primary text-xs"
                >
                  {recalLoading ? 'Recording...' : 'Record Recalibration Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* "What Changed?" Version Diff Modal */}
      {diffModalData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#d6cfbe] rounded shadow-2xl max-w-2xl w-full p-6 space-y-4 animate-fadeIn text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#ece7d8]">
              <div>
                <h3 className="text-sm font-bold font-serif text-[#006c51] flex items-center gap-1.5">
                  <GitCompare className="w-4 h-4 text-[#006c51]" />
                  What Changed? Version Comparison
                </h3>
                <p className="text-[11px] text-gov-sand-600 font-mono">
                  Report {diffModalData.report.reportId} • v{diffModalData.versionA.version} &rarr; v{diffModalData.versionB.version}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDiffModalData(null)}
                className="text-gov-sand-400 hover:text-gov-sand-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-[#faf8f2] p-3 rounded border border-[#ded7c4]">
                <span className="text-[10px] uppercase font-bold text-gov-sand-600 block mb-1">
                  Revision Description & Justification:
                </span>
                <p className="text-xs text-gov-sand-900 font-medium">
                  {diffModalData.versionB.changeDescription || 'No formal description entered for this revision.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white border border-[#ded7c4] rounded">
                  <span className="font-bold font-mono text-[#006c51] block">
                    Version {diffModalData.versionA.version}
                  </span>
                  <span className="text-[10px] text-gov-sand-500 block mt-0.5">
                    Created: {formatIST(diffModalData.versionA.createdAt)}
                  </span>
                  <span className="text-[10px] text-gov-sand-500 block">
                    Officer: {diffModalData.versionA.createdByName || 'Authorized Officer'}
                  </span>
                  <div className="mt-2 pt-2 border-t border-[#ece7d8] font-mono text-[9px] text-gov-sand-600 truncate">
                    SHA-256: {diffModalData.versionA.integrityHash || 'None'}
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded">
                  <span className="font-bold font-mono text-emerald-900 block">
                    Version {diffModalData.versionB.version} (Revised)
                  </span>
                  <span className="text-[10px] text-emerald-700 block mt-0.5">
                    Created: {formatIST(diffModalData.versionB.createdAt)}
                  </span>
                  <span className="text-[10px] text-emerald-700 block">
                    Officer: {diffModalData.versionB.createdByName || 'Authorized Officer'}
                  </span>
                  <div className="mt-2 pt-2 border-t border-emerald-200 font-mono text-[9px] text-emerald-800 truncate">
                    SHA-256: {diffModalData.versionB.integrityHash || 'None'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[#ece7d8]">
              <Link
                to={`/reports/${diffModalData.report.id}`}
                className="text-xs font-semibold text-[#006c51] hover:underline"
              >
                Open Full Report View &rarr;
              </Link>
              <button
                type="button"
                onClick={() => setDiffModalData(null)}
                className="btn-gov-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photographic Lightbox Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="max-w-3xl max-h-[90vh] bg-white rounded p-2 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-gov-sand-800 border border-gov-sand-300 flex items-center justify-center shadow-md hover:bg-gov-sand-100"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewImage.url}
              alt={previewImage.title || 'Evidence Preview'}
              className="max-h-[80vh] w-auto mx-auto object-contain rounded"
            />
            {previewImage.title && (
              <p className="text-center text-xs text-gov-sand-700 font-medium mt-2">
                {previewImage.title}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DigitalPassport;
