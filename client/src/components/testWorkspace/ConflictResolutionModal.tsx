import React from 'react';
import { 
  AlertTriangle, 
  GitMerge, 
  Check, 
  ArrowRight, 
  Server, 
  HardDrive 
} from 'lucide-react';
import { OfflineTestDraft } from '../../utils/offlineStorage';
import { TestRecord } from '../../types';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  localDraft: OfflineTestDraft;
  serverRecord: TestRecord;
  onResolve: (choice: 'LOCAL' | 'SERVER') => void;
  onCancel: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  localDraft,
  serverRecord,
  onResolve,
  onCancel,
}) => {
  if (!isOpen) return null;

  const localTime = new Date(localDraft.localUpdatedAt).toLocaleString('en-IN');
  const serverTime = serverRecord.updatedAt 
    ? new Date(serverRecord.updatedAt).toLocaleString('en-IN')
    : 'Unknown';

  const localObsCount = Array.isArray(localDraft.observations) ? localDraft.observations.length : 0;
  const serverObsCount = Array.isArray(serverRecord.observations) ? serverRecord.observations.length : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#fcfbf9] rounded-lg border border-[#ded7c4] max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-red-700 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-red-200" />
            <h3 className="text-sm font-bold font-serif tracking-wide">
              Test Observation Sync Conflict
            </h3>
          </div>
          <span className="text-[10px] font-mono uppercase bg-red-800 px-2 py-0.5 rounded text-red-200 font-bold">
            Resolution Required
          </span>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-3 bg-red-50 border-l-4 border-red-600 rounded text-red-950 space-y-1">
            <p className="font-semibold text-xs">
              Concurrent Updates Detected
            </p>
            <p className="text-[11px] leading-relaxed text-red-900">
              Both your local browser session and the central server have received different test updates for this module. To safeguard against accidental data overwriting, please select which version should be preserved authoritative.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {/* Local Draft Choice */}
            <div className="p-3.5 bg-amber-50/60 border-2 border-amber-300 rounded-lg space-y-2 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-amber-700" /> My Local Draft
                  </span>
                  <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-mono font-bold">
                    IN-BROWSER
                  </span>
                </div>
                <div className="space-y-1 text-[11px] text-amber-900">
                  <div>Timestamp: <span className="font-mono font-semibold">{localTime}</span></div>
                  <div>Recorded Points: <span className="font-bold">{localObsCount} row(s)</span></div>
                  <div>Status: <span className="font-semibold">Local Draft</span></div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onResolve('LOCAL')}
                className="w-full mt-3 py-1.5 px-3 bg-amber-700 hover:bg-amber-800 text-white rounded text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-all"
              >
                <Check className="w-3.5 h-3.5" /> Keep My Local Draft
              </button>
            </div>

            {/* Server Record Choice */}
            <div className="p-3.5 bg-blue-50/60 border-2 border-blue-300 rounded-lg space-y-2 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-950 flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-blue-700" /> Server Version
                  </span>
                  <span className="text-[9px] bg-blue-200 text-blue-900 px-1.5 py-0.2 rounded font-mono font-bold">
                    CENTRAL DB
                  </span>
                </div>
                <div className="space-y-1 text-[11px] text-blue-900">
                  <div>Timestamp: <span className="font-mono font-semibold">{serverTime}</span></div>
                  <div>Recorded Points: <span className="font-bold">{serverObsCount} row(s)</span></div>
                  <div>Updated By: <span className="font-semibold">{serverRecord.testedByName || 'Officer'}</span></div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onResolve('SERVER')}
                className="w-full mt-3 py-1.5 px-3 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-all"
              >
                <Check className="w-3.5 h-3.5" /> Keep Server Version
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-gov-sand-600 hover:text-gov-sand-800 underline"
            >
              Cancel and decide later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
