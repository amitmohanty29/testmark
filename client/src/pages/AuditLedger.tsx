import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { AuditLog } from '../types';
import { 
  History, 
  Search, 
  Filter, 
  ShieldCheck, 
  User, 
  ArrowRight, 
  FileText, 
  Scale, 
  FileCheck2, 
  RefreshCw,
  Lock
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AuditLedger: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [actorSearch, setActorSearch] = useState('');

  useEffect(() => {
    loadAuditLogs();
  }, [entityFilter, actionFilter]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (entityFilter !== 'ALL') params.entityType = entityFilter;
      if (actionFilter !== 'ALL') params.action = actionFilter;
      if (actorSearch.trim()) params.actor = actorSearch.trim();

      const res = await api.getAuditLogs(params);
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadAuditLogs();
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
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#ded7c4] rounded p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#a37b12]">
              Regulatory Accountability
            </span>
            <span className="text-gov-sand-400">•</span>
            <span className="text-xs text-gov-sand-600 font-medium">Immutable Event Ledger</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#006c51] mt-0.5 flex items-center gap-2">
            <History className="w-6 h-6 text-[#006c51]" />
            National Metrology Audit Ledger
          </h1>
          <p className="text-xs text-gov-sand-600 mt-0.5">
            Cryptographically timestamped accountability trail tracking every creation, revision, state change, and certificate export.
          </p>
        </div>

        <button
          onClick={loadAuditLogs}
          className="btn-gov-secondary text-xs flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Ledger
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="gov-card p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gov-sand-400" />
            <input
              type="text"
              placeholder="Search by officer name, role, or description..."
              value={actorSearch}
              onChange={(e) => setActorSearch(e.target.value)}
              className="gov-input pl-9 text-xs w-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="gov-input text-xs py-2 px-3 w-full sm:w-36"
            >
              <option value="ALL">All Entities</option>
              <option value="EVALUATION">Evaluations</option>
              <option value="REPORT">Reports</option>
              <option value="INSTRUMENT">Instruments</option>
            </select>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="gov-input text-xs py-2 px-3 w-full sm:w-36"
            >
              <option value="ALL">All Actions</option>
              <option value="CREATED">Created</option>
              <option value="STATE_CHANGE">State Change</option>
              <option value="FINALIZED">Finalized (Hashed)</option>
              <option value="REVISED">Revised</option>
              <option value="EXPORTED_PDF">Exported PDF</option>
              <option value="EXPORTED_DOCX">Exported DOCX</option>
            </select>

            <button type="submit" className="btn-gov-primary text-xs shrink-0">
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Audit Log Entries Table */}
      <div className="gov-card overflow-hidden">
        <div className="gov-card-header">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#006c51]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-gov-sand-900">
              Official Metrology Event Records ({logs.length})
            </h2>
          </div>
          <span className="text-[11px] text-gov-sand-500 font-mono">
            Compliant with Section 24, Legal Metrology Act 2009
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-gov-sand-600">
            <div className="w-8 h-8 border-3 border-[#006c51] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading cryptographic audit records...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-xs text-gov-sand-600">
            <History className="w-10 h-10 text-gov-sand-300 mx-auto mb-2" />
            <p className="font-semibold text-gov-sand-800">No audit log records found</p>
            <p className="text-gov-sand-500 mt-1">Actions performed across the platform are automatically indexed here.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#ece7d8]">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-[#fcfbf9] transition-colors text-xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {getActionBadge(log.action)}
                    <span className="font-bold text-gov-sand-900">{log.description}</span>
                  </div>

                  <span className="text-[10px] font-mono text-gov-sand-500 whitespace-nowrap">
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

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gov-sand-600">
                  <div className="flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-gov-sand-400" />
                    <span className="font-semibold text-gov-sand-800">{log.actorName}</span>
                    <span className="text-gov-sand-400">({log.actorRole.replace(/_/g, ' ')})</span>
                  </div>

                  <div className="flex items-center space-x-3 font-mono text-[10px]">
                    <span className="text-gov-sand-500">
                      Entity: <strong className="text-gov-sand-700">{log.entityType}</strong> ({log.entityId.slice(0, 8)}...)
                    </span>

                    {log.evaluationId && (
                      <Link
                        to={`/evaluations/${log.evaluationId}`}
                        className="text-[#006c51] hover:underline"
                      >
                        Evaluation &rarr;
                      </Link>
                    )}
                  </div>
                </div>

                {log.previousState && log.newState && (
                  <div className="p-2.5 bg-[#faf8f2] rounded border border-[#ded7c4] text-[10px] font-mono flex items-center gap-2 overflow-x-auto">
                    <span className="text-red-700">
                      Previous: {typeof log.previousState === 'object' ? JSON.stringify(log.previousState) : String(log.previousState)}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-gov-sand-400 shrink-0" />
                    <span className="text-emerald-700 font-bold">
                      New: {typeof log.newState === 'object' ? JSON.stringify(log.newState) : String(log.newState)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
