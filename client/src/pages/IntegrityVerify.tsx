import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { IntegrityVerification } from '../types';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  Lock, 
  FileText, 
  Copy, 
  QrCode, 
  Check, 
  Clock, 
  Award,
  Hash,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const IntegrityVerify: React.FC = () => {
  const [reportIdInput, setReportIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [verification, setVerification] = useState<IntegrityVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Quick select recent reports
  const [recentReports, setRecentReports] = useState<any[]>([]);

  useEffect(() => {
    loadRecentFinalized();
  }, []);

  const loadRecentFinalized = async () => {
    try {
      const res = await api.getReports({ status: 'FINALIZED' });
      setRecentReports((res.reports || []).slice(0, 5));
    } catch (e) {
      console.error('Failed to load recent reports for verify screen', e);
    }
  };

  const handleVerify = async (reportIdToVerify?: string) => {
    const target = (reportIdToVerify || reportIdInput).trim();
    if (!target) return;
    setLoading(true);
    setError(null);
    setVerification(null);

    try {
      const result = await api.verifyReportByReportId(target);
      setVerification(result);
    } catch (err: any) {
      setError(err.message || `No finalized report found for Report ID: ${target}`);
    } finally {
      setLoading(false);
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#ded7c4] rounded-lg p-6 shadow-xs text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#006c51]/10 text-[#006c51] mb-1">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#a37b12]">
            Zero-Trust Architecture
          </span>
          <span className="text-gov-sand-400">•</span>
          <span className="text-[11px] text-gov-sand-600 font-mono">SHA-256 Ledger</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#006c51]">
          Report Integrity Verification Portal
        </h1>
        <p className="text-xs text-gov-sand-600 max-w-2xl mx-auto leading-relaxed">
          Re-verify any OIML R-76 test certificate or evaluation record against the government's immutable SHA-256 cryptographic ledger to ensure it has not been altered or tampered with.
        </p>
      </div>

      {/* Verification Input Box */}
      <div className="gov-card p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify();
          }}
          className="space-y-4"
        >
          <label className="gov-label text-xs">Enter Report ID or Verification Token</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-gov-sand-400" />
              <input
                type="text"
                placeholder="e.g. RPT-2026-0001"
                value={reportIdInput}
                onChange={(e) => setReportIdInput(e.target.value)}
                className="gov-input pl-10 text-xs w-full py-2.5 font-mono"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-gov-primary text-xs px-6 py-2.5 shrink-0"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying Cryptographic Ledger...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Verify Report Integrity
                </span>
              )}
            </button>
          </div>

          {/* Quick Click Finalized Reports */}
          {recentReports.length > 0 && (
            <div className="pt-3 border-t border-[#ece7d8] flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] text-gov-sand-500 font-medium">Quick Verify Sample:</span>
              {recentReports.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setReportIdInput(r.reportId);
                    handleVerify(r.reportId);
                  }}
                  className="font-mono text-[11px] px-2.5 py-1 bg-[#faf8f2] hover:bg-gov-green-50 text-[#006c51] rounded border border-[#ded7c4] transition-colors"
                >
                  {r.reportId}
                </button>
              ))}
            </div>
          )}
        </form>
      </div>

      {/* Verification Error */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-600 rounded text-xs text-red-900 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Verification Failed</h4>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Verification Result Certificate */}
      {verification && (
        <div className="gov-card overflow-hidden border-2 border-[#006c51] shadow-lg animate-fadeIn">
          {/* Status Header */}
          <div className={`p-6 text-white text-center ${
            verification.verified ? 'bg-[#006c51]' : 'bg-red-700'
          }`}>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/20 mb-2">
              {verification.verified ? (
                <CheckCircle className="w-8 h-8 text-white" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-white" />
              )}
            </div>

            <h2 className="text-xl font-bold font-serif tracking-wide uppercase">
              {verification.verified
                ? 'Document Integrity Confirmed'
                : 'Integrity Violation Detected'}
            </h2>
            <p className="text-xs text-emerald-100 mt-1 max-w-lg mx-auto">
              {verification.reason}
            </p>
          </div>

          {/* Cryptographic Proof Details */}
          <div className="p-6 space-y-5 text-xs bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#faf8f2] rounded border border-[#ded7c4] space-y-2">
                <span className="font-bold text-gov-sand-800 uppercase tracking-wider text-[10px] block">
                  Report Credentials
                </span>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gov-sand-600">Report ID:</span>
                    <span className="font-mono font-bold text-gov-sand-900">{verification.reportId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gov-sand-600">Version:</span>
                    <span className="font-mono font-bold text-[#006c51]">v{verification.version || 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gov-sand-600">Finalized Timestamp:</span>
                    <span className="font-mono text-gov-sand-800">
                      {verification.finalizedAt ? new Date(verification.finalizedAt).toLocaleString('en-IN') : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gov-sand-600">Hashing Engine:</span>
                    <span className="font-mono text-gov-sand-800">SHA-256 (NIST FIPS 180-4)</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#faf8f2] rounded border border-[#ded7c4] space-y-2">
                <span className="font-bold text-gov-sand-800 uppercase tracking-wider text-[10px] block">
                  Legal Metrology Seal
                </span>
                <div className="space-y-1 text-gov-sand-700">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                    <Award className="w-4 h-4 text-[#006c51]" />
                    <span>Government of India Metrology Authority</span>
                  </div>
                  <p className="text-[11px] text-gov-sand-600 pt-1 leading-relaxed">
                    Cryptographic signature validates that test observation numbers, errors, tare calculations, and inspector endorsements remain identical to the original record.
                  </p>
                </div>
              </div>
            </div>

            {/* Cryptographic Hashes Display */}
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gov-sand-700 text-[11px]">
                    Stored Authority Ledger Hash:
                  </span>
                  {verification.storedHash && (
                    <button
                      onClick={() => copyHash(verification.storedHash!)}
                      className="text-[10px] text-[#006c51] hover:underline flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copied' : 'Copy Hash'}
                    </button>
                  )}
                </div>
                <div className="p-2.5 bg-[#f6f4ed] rounded border border-[#ded7c4] font-mono text-[11px] text-gov-sand-900 break-all select-all">
                  {verification.storedHash || 'None'}
                </div>
              </div>

              <div>
                <span className="font-semibold text-gov-sand-700 text-[11px] block mb-1">
                  Computed Real-Time Document Hash:
                </span>
                <div className={`p-2.5 rounded border font-mono text-[11px] break-all select-all ${
                  verification.verified
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                    : 'bg-red-50 border-red-300 text-red-950 font-bold'
                }`}>
                  {verification.computedHash || 'None'}
                </div>
              </div>
            </div>

            {/* Verification Flow Diagram */}
            <div className="p-4 bg-[#fcfbf9] rounded border border-[#ece7d8] space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gov-sand-600 block">
                How Zero-Trust Verification Works
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-[11px]">
                <div className="p-2 bg-white rounded border border-[#ded7c4]">
                  <div className="font-bold text-[#006c51]">1. Canonical Snapshot</div>
                  <div className="text-gov-sand-500 mt-0.5">Deterministic sorting of all evaluation data</div>
                </div>
                <div className="p-2 bg-white rounded border border-[#ded7c4]">
                  <div className="font-bold text-[#006c51]">2. SHA-256 Digest</div>
                  <div className="text-gov-sand-500 mt-0.5">256-bit cryptographic fingerprint created</div>
                </div>
                <div className="p-2 bg-white rounded border border-[#ded7c4]">
                  <div className="font-bold text-[#006c51]">3. Ledger Match</div>
                  <div className="text-gov-sand-500 mt-0.5">Bit-by-bit ledger proof verification</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer with view report link */}
          <div className="p-4 bg-[#faf8f2] border-t border-[#e5dfd1] flex items-center justify-between text-xs">
            <span className="text-gov-sand-500">
              Metrology Proof Token: VERIFIED-OIML-{verification.reportId}
            </span>
            <Link
              to="/reports"
              className="btn-gov-secondary text-xs flex items-center gap-1"
            >
              Browse All Reports <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
