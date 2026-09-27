import React from 'react';
import { 
  CheckCircle2, 
  RefreshCw, 
  HardDrive, 
  WifiOff, 
  AlertTriangle,
  Clock,
  Sparkles
} from 'lucide-react';

export type SyncStatusType = 'SAVED_LOCALLY' | 'SYNCING' | 'SYNCED' | 'OFFLINE' | 'CONFLICT';

interface SelfHealingStatusBarProps {
  status: SyncStatusType;
  lastLocalSaveTime: Date | null;
  lastServerSyncTime: Date | null;
  onSyncNow?: () => void;
  onOpenConflictModal?: () => void;
  className?: string;
}

export const SelfHealingStatusBar: React.FC<SelfHealingStatusBarProps> = ({
  status,
  lastLocalSaveTime,
  lastServerSyncTime,
  onSyncNow,
  onOpenConflictModal,
  className = '',
}) => {
  const formatTime = (d: Date | null) => {
    if (!d) return null;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div
      className={`flex items-center justify-between px-3 py-1.5 rounded-md border text-xs transition-all ${
        status === 'SYNCED'
          ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
          : status === 'SYNCING'
          ? 'bg-blue-50/90 border-blue-200 text-blue-900'
          : status === 'SAVED_LOCALLY'
          ? 'bg-amber-50/90 border-amber-200 text-amber-900'
          : status === 'OFFLINE'
          ? 'bg-slate-100 border-slate-300 text-slate-800'
          : 'bg-red-50 border-red-300 text-red-900'
      } ${className}`}
    >
      <div className="flex items-center space-x-2">
        {status === 'SYNCED' && (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-semibold text-[11px]">Synced to server</span>
            {lastServerSyncTime && (
              <span className="text-[10px] text-emerald-700/80 font-mono hidden sm:inline">
                ({formatTime(lastServerSyncTime)})
              </span>
            )}
          </>
        )}

        {status === 'SYNCING' && (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
            <span className="font-semibold text-[11px]">Syncing to server...</span>
          </>
        )}

        {status === 'SAVED_LOCALLY' && (
          <>
            <HardDrive className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
            <span className="font-semibold text-[11px]">Saved locally</span>
            {lastLocalSaveTime && (
              <span className="text-[10px] text-amber-800/80 font-mono hidden sm:inline">
                (IndexedDB {formatTime(lastLocalSaveTime)})
              </span>
            )}
            <span className="text-[10px] text-amber-700 hidden md:inline">• Background sync queued</span>
          </>
        )}

        {status === 'OFFLINE' && (
          <>
            <WifiOff className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="font-semibold text-[11px]">Offline — Saved locally</span>
            <span className="text-[10px] text-slate-600 hidden md:inline">
              (Safe in browser storage • Auto-syncs when online)
            </span>
          </>
        )}

        {status === 'CONFLICT' && (
          <>
            <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span className="font-semibold text-[11px]">Sync Conflict Detected</span>
            <span className="text-[10px] text-red-700 hidden sm:inline">
              Server has newer draft
            </span>
          </>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {status === 'CONFLICT' && onOpenConflictModal && (
          <button
            type="button"
            onClick={onOpenConflictModal}
            className="px-2 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded hover:bg-red-700 shadow-sm"
          >
            Resolve Conflict
          </button>
        )}

        {(status === 'SAVED_LOCALLY' || status === 'OFFLINE') && onSyncNow && (
          <button
            type="button"
            onClick={onSyncNow}
            className="px-2 py-0.5 text-[10px] font-medium bg-amber-200/70 hover:bg-amber-300 text-amber-900 rounded border border-amber-300 flex items-center gap-1"
            title="Force immediate sync to server"
          >
            <RefreshCw className="w-3 h-3" /> Sync Now
          </button>
        )}

        <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/70 text-slate-600 border border-slate-200/80">
          Self-Healing Engine
        </span>
      </div>
    </div>
  );
};
