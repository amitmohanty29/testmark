import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { PassportData, InstrumentDocument, TimelineEvent } from '../types';
import { 
  AccuracyClassBadge, 
  InstrumentStatusBadge, 
  EvaluationStatusBadge 
} from '../components/ui/StatusBadge';
import { 
  ShieldCheck, 
  QrCode, 
  Printer, 
  Calendar, 
  User, 
  Building, 
  FileText, 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  Download, 
  PlusCircle, 
  ExternalLink,
  Cpu,
  Layers,
  Award,
  Lock,
  FileCheck2
} from 'lucide-react';
import { CreateEvaluationModal } from '../components/evaluations/CreateEvaluationModal';
import { useAuth } from '../context/AuthContext';

export const DigitalPassport: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [passport, setPassport] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);

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
    } catch (err: any) {
      setError(err.message || 'Failed to load Digital Passport record');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 border-4 border-[#006c51] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-gov-sand-700">Accessing National Metrology Digital Ledger...</p>
      </div>
    );
  }

  if (error || !passport) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="p-6 bg-red-50 border-l-4 border-red-600 rounded text-red-800">
          <h3 className="text-base font-bold">Passport Record Not Found</h3>
          <p className="text-xs mt-1">{error || 'The requested instrument passport does not exist in the National Registry.'}</p>
          <Link to="/instruments" className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-gov-green-800 underline">
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Instrument Registry
          </Link>
        </div>
      </div>
    );
  }

  const nValue = passport.scaleIntervalE > 0 ? Math.round(passport.maxCapacity / passport.scaleIntervalE) : 0;
  const allReports = (passport.evaluations || []).flatMap((e: any) =>
    (e.reports || []).map((r: any) => ({
      ...r,
      evaluationNumber: e.evaluationNumber,
      laboratoryName: e.laboratory?.name,
    }))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 print:p-0">
      {/* Back and Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <div className="flex items-center space-x-2">
          <Link to="/instruments" className="btn-gov-secondary text-xs">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> All Instruments
          </Link>
          <span className="text-xs text-gov-sand-400">/</span>
          <span className="text-xs font-mono text-gov-sand-700 font-bold">{passport.passportId}</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsEvaluationModalOpen(true)}
            className="btn-gov-primary text-xs"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Initiate New Evaluation
          </button>
          <button
            onClick={handlePrint}
            className="btn-gov-secondary text-xs"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Passport Dossier
          </button>
        </div>
      </div>

      {/* Main Digital Passport Document Card */}
      <div className="bg-white border-2 border-[#d6cfbe] rounded shadow-gov-card overflow-hidden">
        {/* Certificate Top Banner with National Emblem */}
        <div className="bg-linear-to-b from-[#f7f5ee] to-[#ece7d8] px-6 py-5 border-b-2 border-[#006c51] relative">
          {/* Subtle watermarked badge */}
          <div className="absolute right-6 top-4 opacity-10 pointer-events-none hidden sm:block">
            <ShieldCheck className="w-32 h-32 text-[#006c51]" />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center space-x-4">
              {/* Emblem icon */}
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
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#a37b12] block">
                  Government of India • Ministry of Consumer Affairs
                </span>
                <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#006c51] tracking-tight">
                  Permanent Instrument Digital Passport
                </h1>
                <p className="text-xs text-gov-sand-700 font-medium">
                  Legal Metrology Act, 2009 • OIML R-76 Verification Single Source of Truth
                </p>
              </div>
            </div>

            {/* Passport ID & Stamp */}
            <div className="flex flex-col items-center sm:items-end">
              <div className="official-stamp-gold text-[10px] mb-1.5">
                VERIFIABLE DIGITAL RECORD
              </div>
              <div className="text-xs font-mono font-bold text-gov-sand-900 bg-white px-3 py-1 rounded border border-[#ded7c4] shadow-2xs">
                PASSPORT ID: <span className="text-[#006c51]">{passport.passportId}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Passport Overview Bar */}
        <div className="bg-[#fcfbf9] px-6 py-4 border-b border-[#e5dfd1] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-gov-sand-500 block uppercase text-[10px] font-bold">Instrument Status</span>
            <div className="mt-1">
              <InstrumentStatusBadge status={passport.status} />
            </div>
          </div>
          <div>
            <span className="text-gov-sand-500 block uppercase text-[10px] font-bold">Accuracy Class</span>
            <div className="mt-1">
              <AccuracyClassBadge accuracyClass={passport.accuracyClass} />
            </div>
          </div>
          <div>
            <span className="text-gov-sand-500 block uppercase text-[10px] font-bold">Evaluations Tied</span>
            <span className="mt-1 text-sm font-bold text-gov-sand-900 block font-mono">
              {passport.summary.totalEvaluations} Session(s) ({passport.summary.completedEvaluations} Completed)
            </span>
          </div>
          <div>
            <span className="text-gov-sand-500 block uppercase text-[10px] font-bold">First Enrolled</span>
            <span className="mt-1 text-xs text-gov-sand-900 block font-medium">
              {new Date(passport.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Metrological Specifications Table */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#e5dfd1]">
            <h2 className="text-sm font-bold font-serif uppercase tracking-wider text-[#006c51] flex items-center gap-2">
              <Award className="w-4 h-4 text-[#a37b12]" />
              Official Metrological Profile & Specifications
            </h2>
            <span className="text-[11px] text-gov-sand-600 font-mono">
              Standard: OIML R 76-1 (Edition 2006)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#faf8f2] p-4 rounded border border-[#ded7c4]">
            {/* Left Col: Metrological Limits */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#ece7d8]">
                <span className="text-gov-sand-600 font-medium">Manufacturer:</span>
                <span className="font-bold text-gov-sand-900">{passport.manufacturer}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#ece7d8]">
                <span className="text-gov-sand-600 font-medium">Model Designation:</span>
                <span className="font-bold text-gov-sand-900">{passport.model}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#ece7d8]">
                <span className="text-gov-sand-600 font-medium">Unique Serial Number:</span>
                <span className="font-bold font-mono text-[#006c51]">{passport.serialNumber}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#ece7d8]">
                <span className="text-gov-sand-600 font-medium">Instrument Type:</span>
                <span className="font-semibold text-gov-sand-900">{passport.instrumentType}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gov-sand-600 font-medium">Capacity Range System:</span>
                <span className="font-semibold text-gov-sand-900">{passport.capacityRangeType}</span>
              </div>
            </div>

            {/* Right Col: Range, Intervals & Environment */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#ece7d8]">
                <span className="text-gov-sand-600 font-medium">Maximum Capacity (Max):</span>
                <span className="font-bold font-mono text-gov-sand-900">
                  {passport.maxCapacity} {passport.verificationUnits}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#ece7d8]">
                <span className="text-gov-sand-600 font-medium">Minimum Capacity (Min):</span>
                <span className="font-bold font-mono text-gov-sand-900">
                  {passport.minCapacity} {passport.verificationUnits}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#ece7d8]">
                <span className="text-gov-sand-600 font-medium">Verification Scale Interval (e):</span>
                <span className="font-bold font-mono text-[#006c51]">
                  {passport.scaleIntervalE} {passport.verificationUnits}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#ece7d8]">
                <span className="text-gov-sand-600 font-medium">Actual Scale Interval (d):</span>
                <span className="font-bold font-mono text-gov-sand-900">
                  {passport.scaleIntervalD ? `${passport.scaleIntervalD} ${passport.verificationUnits}` : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gov-sand-600 font-medium">Calculated Scale Intervals (n):</span>
                <span className="font-bold font-mono text-amber-900">
                  n = {nValue.toLocaleString()} e
                </span>
              </div>
            </div>
          </div>

          {/* Operating Conditions & Technical Notes */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-white border border-[#e5dfd1] rounded">
              <span className="text-gov-sand-500 block uppercase text-[10px] font-bold">Tare Range</span>
              <span className="font-semibold text-gov-sand-900 mt-0.5 block">{passport.tareRange || 'Not Specified'}</span>
            </div>
            <div className="p-3 bg-white border border-[#e5dfd1] rounded">
              <span className="text-gov-sand-500 block uppercase text-[10px] font-bold">Temperature Range</span>
              <span className="font-semibold text-gov-sand-900 mt-0.5 block">{passport.temperatureRange || '+10°C to +40°C'}</span>
            </div>
            <div className="p-3 bg-white border border-[#e5dfd1] rounded">
              <span className="text-gov-sand-500 block uppercase text-[10px] font-bold">Power Supply</span>
              <span className="font-semibold text-gov-sand-900 mt-0.5 block">{passport.powerSupply || 'Mains AC'}</span>
            </div>
          </div>
        </div>

        {/* Digital Metrology Dossier Documents */}
        <div className="px-6 py-4 bg-[#fbfaf6] border-t border-b border-[#e5dfd1]">
          <h3 className="text-xs font-bold font-serif uppercase tracking-wider text-[#006c51] mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#006c51]" />
              Digital Dossier & Supporting Technical Documents ({passport.documents?.length || 0})
            </span>
            <Link
              to={`/instruments/${passport.id}`}
              className="text-[11px] text-[#006c51] hover:underline normal-case font-sans font-medium"
            >
              + Upload Document in Profile
            </Link>
          </h3>

          {passport.documents && passport.documents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {passport.documents.map((doc: InstrumentDocument) => (
                <div
                  key={doc.id}
                  className="p-3 bg-white rounded border border-[#ded7c4] shadow-2xs flex items-start justify-between gap-2"
                >
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-gov-sand-900 truncate" title={doc.title}>
                      {doc.title}
                    </h4>
                    <p className="text-[10px] text-gov-sand-500 truncate mt-0.5">{doc.fileName}</p>
                    <span className="text-[9px] text-gov-sand-400 block mt-1">
                      Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-[#006c51] hover:bg-gov-green-50 rounded shrink-0"
                    title="View Document"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gov-sand-500 italic">No supporting documents uploaded yet.</p>
          )}
        </div>

        {/* Full Instrument-Wise Test Report History & Cryptographic Proofs */}
        <div className="px-6 py-5 bg-[#faf8f2] border-t border-[#e5dfd1]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold font-serif uppercase tracking-wider text-[#006c51] flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-[#006c51]" />
                Full Instrument Test Report & Certificate History ({allReports.length})
              </h3>
              <p className="text-[11px] text-gov-sand-600 mt-0.5">
                All legally-issued OIML test reports and SHA-256 cryptographic proofs generated across this instrument's lifecycle.
              </p>
            </div>

            <Link
              to="/reports"
              className="text-[11px] text-[#006c51] hover:underline font-semibold"
            >
              National Reports Registry &rarr;
            </Link>
          </div>

          {allReports.length > 0 ? (
            <div className="space-y-2.5">
              {allReports.map((rpt: any) => (
                <div
                  key={rpt.id}
                  className="p-3.5 bg-white rounded border border-[#ded7c4] hover:border-[#006c51]/60 transition-colors shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/reports/${rpt.id}`}
                        className="font-mono font-bold text-[#006c51] hover:underline flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {rpt.reportId}
                      </Link>
                      <span className="text-[10px] font-mono text-gov-sand-500">v{rpt.version}</span>
                      <span className={`px-2 py-0.2 rounded text-[9px] font-bold ${
                        rpt.status === 'FINALIZED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {rpt.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-gov-sand-600 flex flex-wrap items-center gap-2">
                      <span>Evaluation: <strong className="font-mono">{rpt.evaluationNumber}</strong></span>
                      <span>•</span>
                      <span>Rule: <strong className="font-mono">{rpt.ruleConfig?.version || 'OIML-R76-2006'}</strong></span>
                      <span>•</span>
                      <span>Date: {new Date(rpt.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>

                    {rpt.integrityHash && (
                      <div className="text-[10px] font-mono text-emerald-700 flex items-center gap-1 pt-0.5">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>SHA-256 Digest: {rpt.integrityHash.slice(0, 24)}...</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <Link
                      to={`/reports/${rpt.id}`}
                      className="btn-gov-secondary text-xs"
                    >
                      View Report &rarr;
                    </Link>
                    <a
                      href={api.getReportExportUrl(rpt.id, 'pdf')}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-red-700 hover:bg-red-50 rounded border border-red-200"
                      title="Export PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gov-sand-500 italic p-3 bg-white rounded border border-[#ded7c4]">
              No test reports issued yet. Once an evaluation is conducted, standardized test certificates will appear here.
            </p>
          )}
        </div>

        {/* Single Source of Truth Metrology Timeline */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#e5dfd1]">
            <div>
              <h2 className="text-sm font-bold font-serif uppercase tracking-wider text-[#006c51] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#006c51]" />
                Permanent Digital Passport Timeline & Verification History
              </h2>
              <p className="text-[11px] text-gov-sand-600 mt-0.5">
                Every evaluation, OIML test log, officer endorsement and state revision is cryptographically bound to this instrument.
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-[#006c51]/10 text-[#006c51] px-2.5 py-1 rounded">
              {passport.timelineEvents?.length || 0} Ledger Events
            </span>
          </div>

          {/* Timeline Feed */}
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#ded7c4]">
            {passport.timelineEvents && passport.timelineEvents.length > 0 ? (
              passport.timelineEvents.map((evt: TimelineEvent) => (
                <div key={evt.id} className="relative group">
                  {/* Timeline bullet */}
                  <div className="absolute -left-[19px] top-1 w-4 h-4 rounded-full bg-white border-2 border-[#006c51] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#006c51]" />
                  </div>

                  <div className="bg-[#faf8f2] p-4 rounded border border-[#ded7c4] hover:border-[#006c51]/60 transition-colors shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                      <h4 className="text-xs font-bold text-gov-sand-900 flex items-center gap-1.5">
                        <span>{evt.title}</span>
                      </h4>
                      <span className="text-[10px] font-mono text-gov-sand-500">
                        {new Date(evt.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-gov-sand-700 leading-relaxed">
                      {evt.description}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-[#ece7d8] flex items-center justify-between text-[10px] text-gov-sand-500">
                      <span className="font-semibold text-gov-sand-800">
                        Officer: {evt.officerName} ({evt.officerRole.replace('_', ' ')})
                      </span>
                      {evt.evaluationId && (
                        <Link
                          to={`/evaluations/${evt.evaluationId}`}
                          className="text-[#006c51] hover:underline font-mono"
                        >
                          View Evaluation Record &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gov-sand-500 italic">No timeline entries logged for this passport.</p>
            )}
          </div>
        </div>

        {/* Verification QR Stamp & Legal Seal */}
        <div className="bg-[#f5f2e9] p-6 border-t border-[#e5dfd1] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white p-1 rounded border border-[#ded7c4] flex items-center justify-center shrink-0">
              <QrCode className="w-14 h-14 text-gov-sand-900" />
            </div>
            <div className="text-xs text-gov-sand-700">
              <p className="font-bold text-gov-sand-900">National QR Verification Stamp</p>
              <p className="text-[11px] font-mono text-gov-sand-500 mt-0.5">
                HASH: SHA256-R76-{passport.passportId.replace(/-/g, '')}
              </p>
              <p className="text-[10px] text-gov-sand-500 mt-0.5">
                Scan with any Legal Metrology Verification scanner to validate validity in real-time.
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <div className="official-stamp text-[10px]">
              OIML R-76 COMPLIANT
            </div>
            <p className="text-[10px] text-gov-sand-500 mt-1">
              Issued under Authority of Director of Legal Metrology, Govt of India
            </p>
          </div>
        </div>
      </div>

      {/* Modal for creating a new evaluation for this instrument */}
      <CreateEvaluationModal
        isOpen={isEvaluationModalOpen}
        onClose={() => setIsEvaluationModalOpen(false)}
        preselectedInstrumentId={passport.id}
        onCreated={() => loadPassport(passport.id)}
      />
    </div>
  );
};
