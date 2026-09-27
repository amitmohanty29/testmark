import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { VersionDiff } from '../../types';
import { 
  GitCompare, 
  X, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  FileText,
  User
} from 'lucide-react';

interface ReportDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  reportCode: string;
  availableVersions: number[];
  defaultV1?: number;
  defaultV2?: number;
}

export const ReportDiffModal: React.FC<ReportDiffModalProps> = ({
  isOpen,
  onClose,
  reportId,
  reportCode,
  availableVersions,
  defaultV1 = 1,
  defaultV2 = 2,
}) => {
  const [v1, setV1] = useState<number>(defaultV1);
  const [v2, setV2] = useState<number>(defaultV2);
  const [diffData, setDiffData] = useState<VersionDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && availableVersions.length >= 2) {
      const sorted = [...availableVersions].sort((a, b) => a - b);
      const initialV1 = sorted[0];
      const initialV2 = sorted[sorted.length - 1];
      setV1(initialV1);
      setV2(initialV2);
      fetchDiff(initialV1, initialV2);
    }
  }, [isOpen, reportId]);

  const fetchDiff = async (version1: number, version2: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReportDiff(reportId, version1, version2);
      setDiffData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to compute report version diff');
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();
    if (v1 === v2) {
      setError('Please select two distinct versions to compare.');
      return;
    }
    fetchDiff(v1, v2);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl border border-[#ded7c4] w-full max-w-4xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#faf8f2] border-b border-[#e5dfd1] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-[#006c51]/10 text-[#006c51] flex items-center justify-center">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-serif text-gov-sand-900">
                Report Version Comparison — "What Changed?"
              </h2>
              <p className="text-[11px] text-gov-sand-600">
                Audited differential analysis across versions of report {reportCode}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gov-sand-500 hover:text-gov-sand-800 hover:bg-gov-sand-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Version Selector Bar */}
        <div className="p-4 bg-[#f6f4ed] border-b border-[#e5dfd1] flex flex-wrap items-center justify-between gap-3 text-xs">
          <form onSubmit={handleCompare} className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gov-sand-700">Baseline Version:</span>
              <select
                value={v1}
                onChange={(e) => setV1(Number(e.target.value))}
                className="gov-input text-xs py-1 px-2.5 w-24 bg-white"
              >
                {availableVersions.map((v) => (
                  <option key={`v1-${v}`} value={v}>
                    Version {v}
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight className="w-4 h-4 text-gov-sand-400" />

            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gov-sand-700">Revised Version:</span>
              <select
                value={v2}
                onChange={(e) => setV2(Number(e.target.value))}
                className="gov-input text-xs py-1 px-2.5 w-24 bg-white"
              >
                {availableVersions.map((v) => (
                  <option key={`v2-${v}`} value={v}>
                    Version {v}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn-gov-primary text-xs py-1 px-3">
              Compute Diff
            </button>
          </form>

          {diffData && (
            <div className="flex items-center space-x-2 text-[11px]">
              <span className="font-bold text-[#006c51]">
                {diffData.totalChanges} {diffData.totalChanges === 1 ? 'Delta Detected' : 'Deltas Detected'}
              </span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-xs text-gov-sand-600">
              <div className="w-8 h-8 border-3 border-[#006c51] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Computing cryptographic differential snapshot...
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border-l-4 border-red-600 text-xs text-red-800 rounded">
              <div className="flex items-center gap-2 font-bold mb-1">
                <AlertCircle className="w-4 h-4" /> Comparison Error
              </div>
              <p>{error}</p>
            </div>
          ) : diffData ? (
            <>
              {/* Version Metadata Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-[#faf8f2] rounded border border-[#ded7c4]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gov-sand-500 block">
                    Base: Version {diffData.version1.version}
                  </span>
                  <div className="mt-1 font-medium text-gov-sand-900">
                    Generated by: {diffData.version1.createdByName || 'Testing Officer'}
                  </div>
                  <div className="text-[10px] text-gov-sand-500 mt-0.5">
                    {new Date(diffData.version1.createdAt).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/50 rounded border border-emerald-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                    Revised: Version {diffData.version2.version}
                  </span>
                  <div className="mt-1 font-medium text-emerald-950">
                    Revised by: {diffData.version2.createdByName || 'Reviewing Officer'}
                  </div>
                  <div className="text-[10px] text-emerald-700 mt-0.5">
                    {new Date(diffData.version2.createdAt).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Differences List */}
              {diffData.diffs.length === 0 ? (
                <div className="p-8 text-center bg-[#faf8f2] rounded border border-[#ded7c4] text-xs">
                  <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="font-bold text-gov-sand-900">No Data Changes Detected</p>
                  <p className="text-gov-sand-600 mt-1">
                    Version {diffData.version1.version} and Version {diffData.version2.version} have identical values across all evaluated fields.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gov-sand-800">
                    Modified Parameters & Values ({diffData.diffs.length}):
                  </h3>

                  <div className="border border-[#ded7c4] rounded divide-y divide-[#ece7d8] overflow-hidden text-xs">
                    {diffData.diffs.map((diff, idx) => (
                      <div key={idx} className="p-3 bg-white hover:bg-[#fcfbf9] transition-colors">
                        <div className="font-mono text-[11px] font-bold text-[#006c51] mb-1.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#006c51]" />
                          {diff.field}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                          <div className="p-2 bg-red-50/70 border border-red-200 rounded text-red-900 overflow-x-auto">
                            <span className="text-[9px] uppercase font-bold text-red-700 block mb-0.5">
                              v{diffData.version1.version} (Original)
                            </span>
                            <pre className="text-[11px] whitespace-pre-wrap">
                              {typeof diff.oldValue === 'object'
                                ? JSON.stringify(diff.oldValue, null, 2)
                                : String(diff.oldValue ?? 'None / Undefined')}
                            </pre>
                          </div>

                          <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded text-emerald-950 overflow-x-auto">
                            <span className="text-[9px] uppercase font-bold text-emerald-700 block mb-0.5">
                              v{diffData.version2.version} (Revised)
                            </span>
                            <pre className="text-[11px] whitespace-pre-wrap font-bold">
                              {typeof diff.newValue === 'object'
                                ? JSON.stringify(diff.newValue, null, 2)
                                : String(diff.newValue ?? 'None / Undefined')}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#faf8f2] border-t border-[#e5dfd1] flex items-center justify-between text-xs">
          <span className="text-gov-sand-500 text-[11px]">
            Version diff computed via field canonicalization snapshot engine.
          </span>
          <button onClick={onClose} className="btn-gov-secondary text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
