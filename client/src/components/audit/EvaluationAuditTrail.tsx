import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { AuditLog } from '../../types';
import { 
  ShieldCheck, 
  Clock, 
  User, 
  ArrowRight, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  History,
  FileCheck2,
  RefreshCw
} from 'lucide-react';

interface EvaluationAuditTrailProps {
  evaluationId: string;
}

export const EvaluationAuditTrail: React.FC<EvaluationAuditTrailProps> = ({ evaluationId }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'audit' | 'timeline'>('audit');

  useEffect(() => {
    loadAuditData();
  }, [evaluationId]);

  const loadAuditData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getEvaluationAuditTrail(evaluationId);
      setLogs(res.auditLogs || []);
      setTimeline(res.timelineEvents || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATED':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-emerald-100 text-emerald-800">CREATED</span>;
      case 'STATE_CHANGE':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-blue-100 text-blue-800">STATE CHANGE</span>;
      case 'FINALIZED':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-purple-100 text-purple-800">FINALIZED (HASHED)</span>;
      case 'REVISED':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-amber-100 text-amber-800">REVISED</span>;
      case 'EXPORTED_PDF':
      case 'EXPORTED_DOCX':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-teal-100 text-teal-800">EXPORTED</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-gray-100 text-gray-800">{action}</span>;
    }
  };

  return (
    <div className="bg-white rounded border border-[#ded7c4] shadow-xs overflow-hidden">
      <div className="p-4 bg-[#faf8f2] border-b border-[#e5dfd1] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-[#006c51]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gov-sand-900">
            Immutable Audit Trail & Regulatory Event Log
          </h3>
          <span className="text-[10px] font-mono bg-[#006c51]/10 text-[#006c51] px-2 py-0.5 rounded font-bold">
            {logs.length} Audit Entries
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex rounded border border-[#ded7c4] bg-white p-0.5 text-xs">
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                activeTab === 'audit' ? 'bg-[#006c51] text-white' : 'text-gov-sand-700 hover:bg-[#faf8f2]'
              }`}
            >
              Audit Ledger ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                activeTab === 'timeline' ? 'bg-[#006c51] text-white' : 'text-gov-sand-700 hover:bg-[#faf8f2]'
              }`}
            >
              Workflow Milestones ({timeline.length})
            </button>
          </div>

          <button
            onClick={loadAuditData}
            title="Refresh log"
            className="p-1.5 text-gov-sand-600 hover:text-[#006c51] hover:bg-[#faf8f2] rounded border border-[#ded7c4]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-gov-sand-600">
          <div className="w-6 h-6 border-2 border-[#006c51] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Retrieving tamper-proof audit records...
        </div>
      ) : error ? (
        <div className="p-4 text-xs text-red-600 bg-red-50">{error}</div>
      ) : activeTab === 'audit' ? (
        logs.length === 0 ? (
          <div className="p-6 text-center text-xs text-gov-sand-500 italic">
            No audit log entries recorded for this evaluation yet.
          </div>
        ) : (
          <div className="divide-y divide-[#ece7d8] max-h-96 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="p-3.5 hover:bg-[#fcfbf9] transition-colors text-xs space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {getActionBadge(log.action)}
                    <span className="font-semibold text-gov-sand-900">{log.description}</span>
                  </div>
                  <span className="text-[10px] font-mono text-gov-sand-500">
                    {new Date(log.createdAt).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gov-sand-600 pt-0.5">
                  <div className="flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-gov-sand-400" />
                    <span className="font-medium text-gov-sand-800">{log.actorName}</span>
                    <span className="text-gov-sand-400">({log.actorRole.replace(/_/g, ' ')})</span>
                  </div>

                  <span className="font-mono text-[10px] text-gov-sand-400">
                    Entity: {log.entityType} ({log.entityId.slice(0, 8)}...)
                  </span>
                </div>

                {log.previousState && log.newState && (
                  <div className="mt-1 p-2 bg-[#f8f6f0] rounded border border-[#ece7d8] text-[10px] font-mono flex items-center gap-2 overflow-x-auto">
                    <span className="text-red-700">
                      Before: {typeof log.previousState === 'object' ? JSON.stringify(log.previousState) : String(log.previousState)}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gov-sand-400 shrink-0" />
                    <span className="text-emerald-700 font-bold">
                      After: {typeof log.newState === 'object' ? JSON.stringify(log.newState) : String(log.newState)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        timeline.length === 0 ? (
          <div className="p-6 text-center text-xs text-gov-sand-500 italic">
            No workflow timeline events found.
          </div>
        ) : (
          <div className="divide-y divide-[#ece7d8] max-h-96 overflow-y-auto">
            {timeline.map((evt) => (
              <div key={evt.id} className="p-3.5 hover:bg-[#fcfbf9] transition-colors text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gov-sand-900">{evt.title}</h4>
                  <span className="text-[10px] font-mono text-gov-sand-500">
                    {new Date(evt.createdAt).toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-gov-sand-700">{evt.description}</p>
                <div className="text-[10px] text-gov-sand-500">
                  Officer: {evt.officerName} ({evt.officerRole.replace(/_/g, ' ')})
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <div className="p-2.5 bg-[#faf8f2] border-t border-[#e5dfd1] text-[10px] text-gov-sand-600 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#006c51]" />
          Cryptographically timestamped for compliance under Section 24, Legal Metrology Act 2009.
        </span>
        <span className="font-mono">Log Source: Ledger SQLite</span>
      </div>
    </div>
  );
};
