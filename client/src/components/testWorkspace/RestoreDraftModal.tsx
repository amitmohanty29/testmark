import React from 'react';
import { 
  History, 
  RotateCcw, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Scale, 
  Clock, 
  FileText 
} from 'lucide-react';
import { OfflineTestDraft } from '../../utils/offlineStorage';
import { TestRecord } from '../../types';

interface RestoreDraftModalProps {
  isOpen: boolean;
  draft: OfflineTestDraft;
  serverRecord?: TestRecord;
  onRestore: () => void;
  onDiscard: () => void;
}

export const RestoreDraftModal: React.FC<RestoreDraftModalProps> = ({
  isOpen,
  draft,
  serverRecord,
  onRestore,
  onDiscard,
}) => {
  if (!isOpen) return null;

  const localTime = new Date(draft.localUpdatedAt).toLocaleString('en-IN');
  const serverTime = serverRecord?.updatedAt 
    ? new Date(serverRecord.updatedAt).toLocaleString('en-IN')
    : 'No prior server record';

  const localObsCount = Array.isArray(draft.observations) ? draft.observations.length : 0;
  const serverObsCount = Array.isArray(serverRecord?.observations) ? serverRecord.observations.length : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#fcfbf9] rounded-lg border border-[#ded7c4] max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-amber-500 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <History className="w-5 h-5 text-amber-100" />
            <h3 className="text-sm font-bold font-serif tracking-wide">
              Restore Unsaved Test Data?
            </h3>
          </div>
          <span className="text-[10px] font-mono uppercase bg-amber-600/80 px-2 py-0.5 rounded text-amber-100 font-bold">
            Self-Healing Guard
          </span>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-3 bg-amber-50/80 border-l-4 border-amber-500 rounded text-amber-950 space-y-1">
            <p className="font-semibold text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              Unsaved Local Test Draft Detected
            </p>
            <p className="text-[11px] leading-relaxed text-amber-900">
              MarkSure's local IndexedDB engine safely captured your test observations before the session was interrupted (e.g. browser crash, tab close, or power disruption).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Local Draft Info */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-300 rounded-md space-y-2">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-1.5">
                <span className="font-bold text-emerald-950 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Local Draft
                </span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-mono font-bold">
                  NEWER
                </span>
              </div>
              <div className="space-y-1 text-[11px] text-emerald-900">
                <div className="flex items-center justify-between">
                  <span className="text-gov-sand-600">Saved:</span>
                  <span className="font-mono font-semibold">{localTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gov-sand-600">Recorded Steps:</span>
                  <span className="font-bold text-emerald-800">{localObsCount} observation row(s)</span>
                </div>
                {draft.notes && (
                  <div className="text-[10px] text-gov-sand-600 truncate">
                    Notes: {draft.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Server Copy Info */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-500" /> Server Copy
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono font-bold">
                  DATABASE
                </span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-gov-sand-600">Saved:</span>
                  <span className="font-mono">{serverTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gov-sand-600">Recorded Steps:</span>
                  <span className="font-semibold">{serverObsCount} observation row(s)</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Status: {serverRecord?.status || 'Draft'}
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-gov-sand-600 leading-relaxed">
            Would you like to restore your unsaved local observations to continue exactly where you left off, or discard them and load the server version?
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#ded7c4]">
            <button
              type="button"
              onClick={onDiscard}
              className="btn-gov-secondary text-xs text-red-800 hover:bg-red-50 border-red-200 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              Discard Local Draft
            </button>
            <button
              type="button"
              onClick={onRestore}
              className="btn-gov-primary text-xs bg-emerald-700 hover:bg-emerald-800 flex items-center gap-1.5 shadow"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore Unsaved Test Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
