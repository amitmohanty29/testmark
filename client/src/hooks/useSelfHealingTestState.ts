import { useState, useEffect, useRef, useCallback } from 'react';
import { TestRecord, TestType } from '../types';
import { offlineStorage, OfflineTestDraft } from '../utils/offlineStorage';
import { api } from '../api';
import { SyncStatusType } from '../components/testWorkspace/SelfHealingStatusBar';

interface UseSelfHealingTestStateOptions {
  evaluationId: string;
  testType: TestType;
  existingRecord?: TestRecord;
  onRecordSaved: (record: TestRecord) => void;
  readOnly?: boolean;
  initialObservations?: any[];
  initialEnvironmentalData?: any;
  initialTestInputs?: any;
  initialNotes?: string;
}

export function useSelfHealingTestState({
  evaluationId,
  testType,
  existingRecord,
  onRecordSaved,
  readOnly = false,
  initialObservations = [],
  initialEnvironmentalData = {},
  initialTestInputs = {},
  initialNotes = '',
}: UseSelfHealingTestStateOptions) {
  // Core state
  const [observations, setObservationsState] = useState<any[]>(
    existingRecord?.observations && existingRecord.observations.length > 0
      ? existingRecord.observations
      : initialObservations
  );

  const [environmentalData, setEnvironmentalDataState] = useState<any>(
    existingRecord?.environmentalData || initialEnvironmentalData
  );

  const [testInputs, setTestInputsState] = useState<any>(
    existingRecord?.testInputs || initialTestInputs
  );

  const [notes, setNotesState] = useState<string>(
    existingRecord?.notes !== undefined ? existingRecord.notes : initialNotes
  );

  // Sync & Resiliency state
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 'OFFLINE';
    return existingRecord ? 'SYNCED' : 'SAVED_LOCALLY';
  });

  const [lastLocalSaveTime, setLastLocalSaveTime] = useState<Date | null>(null);
  const [lastServerSyncTime, setLastServerSyncTime] = useState<Date | null>(
    existingRecord?.updatedAt ? new Date(existingRecord.updatedAt) : null
  );

  // Restore & Conflict modals
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [localDraftCandidate, setLocalDraftCandidate] = useState<OfflineTestDraft | null>(null);
  const [conflictData, setConflictData] = useState<{ localDraft: OfflineTestDraft; serverRecord: TestRecord } | null>(null);

  // Refs for tracking values inside debounced sync without stale closures
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);
  const latestServerUpdatedAtRef = useRef<string | null>(existingRecord?.updatedAt || null);

  const latestStateRef = useRef({
    observations,
    environmentalData,
    testInputs,
    notes,
  });

  latestStateRef.current = {
    observations,
    environmentalData,
    testInputs,
    notes,
  };

  if (existingRecord?.updatedAt) {
    latestServerUpdatedAtRef.current = existingRecord.updatedAt;
  }

  // 1. Initial check for local draft on mount or when module changes
  useEffect(() => {
    let isCancelled = false;

    const checkForUnsavedDraft = async () => {
      try {
        const draft = await offlineStorage.getDraft(evaluationId, testType);
        if (isCancelled || !draft) return;

        const serverUpdateTime = existingRecord?.updatedAt
          ? new Date(existingRecord.updatedAt).getTime()
          : 0;

        // If local draft is newer than what server has by > 2 seconds
        // and local draft has observations
        const isNewer = draft.localUpdatedAt > serverUpdateTime + 2000;
        const hasData = (draft.observations && draft.observations.length > 0) || Boolean(draft.notes);

        if (isNewer && hasData && !readOnly) {
          setLocalDraftCandidate(draft);
          setShowRestorePrompt(true);
          setLastLocalSaveTime(new Date(draft.localUpdatedAt));
          setSyncStatus('SAVED_LOCALLY');
        } else if (existingRecord) {
          // If server copy is current, populate from server
          if (existingRecord.observations) setObservationsState(existingRecord.observations);
          if (existingRecord.environmentalData) setEnvironmentalDataState(existingRecord.environmentalData);
          if (existingRecord.testInputs) setTestInputsState(existingRecord.testInputs);
          if (existingRecord.notes !== undefined) setNotesState(existingRecord.notes || '');
          setSyncStatus('SYNCED');
        }
      } catch (err) {
        console.warn('[useSelfHealingTestState] Error checking draft:', err);
      }
    };

    checkForUnsavedDraft();

    return () => {
      isCancelled = true;
    };
  }, [evaluationId, testType]);

  // 2. Online / Offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus((prev) => (prev === 'OFFLINE' ? 'SAVED_LOCALLY' : prev));
      // Trigger background sync retry
      triggerDebouncedSync(300);
    };

    const handleOffline = () => {
      setSyncStatus('OFFLINE');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [evaluationId, testType]);

  // 3. Auto-save to IndexedDB immediately and schedule debounced background sync
  const persistFrameByFrame = useCallback(
    async (newObs: any[], newEnv: any, newInputs: any, newNotes: string) => {
      if (readOnly) return;

      const now = Date.now();
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      const draft: OfflineTestDraft = {
        draftKey: offlineStorage.getDraftKey(evaluationId, testType),
        evaluationId,
        testType,
        observations: newObs,
        environmentalData: newEnv,
        testInputs: newInputs,
        notes: newNotes,
        localUpdatedAt: now,
        serverUpdatedAt: latestServerUpdatedAtRef.current,
        syncStatus: isOnline ? 'SAVED_LOCALLY' : 'OFFLINE',
      };

      // Save into IndexedDB immediately (frame-by-frame)
      await offlineStorage.saveDraft(draft);
      setLastLocalSaveTime(new Date(now));
      setSyncStatus(isOnline ? 'SAVED_LOCALLY' : 'OFFLINE');

      // Schedule background sync if online
      if (isOnline) {
        triggerDebouncedSync(1500);
      }
    },
    [evaluationId, testType, readOnly]
  );

  // Background sync worker
  const performBackgroundSync = useCallback(
    async (forceResolution = false) => {
      if (readOnly) return;
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        setSyncStatus('OFFLINE');
        return;
      }

      setSyncStatus('SYNCING');

      try {
        const { observations: curObs, environmentalData: curEnv, testInputs: curInputs, notes: curNotes } =
          latestStateRef.current;

        const payload: any = {
          observations: curObs,
          environmentalData: curEnv,
          testInputs: curInputs,
          notes: curNotes,
          status: 'DRAFT',
          isAutoSync: true,
          expectedServerUpdatedAt: latestServerUpdatedAtRef.current,
          forceConflictResolution: forceResolution,
        };

        // Specific test module fields
        if (curInputs?.verificationType) payload.verificationType = curInputs.verificationType;
        if (curInputs?.nominalLoad) payload.nominalLoad = curInputs.nominalLoad;
        if (curInputs?.appliedLoad) payload.appliedLoad = curInputs.appliedLoad;
        if (testType === 'TARE' && curObs && curObs[0]) payload.tareObservation = curObs[0];

        const res = await api.saveTestRecord(evaluationId, testType, payload);

        // Update server update tracker
        if (res.record?.updatedAt) {
          latestServerUpdatedAtRef.current = res.record.updatedAt;
        }

        // Mark IndexedDB as synced
        await offlineStorage.markDraftSynced(evaluationId, testType, res.record?.updatedAt);

        setLastServerSyncTime(new Date());
        setSyncStatus('SYNCED');

        if (conflictData) {
          setConflictData(null);
        }
      } catch (err: any) {
        if (err.status === 409 || err.conflict) {
          console.warn('[useSelfHealingTestState] Conflict detected:', err);
          setSyncStatus('CONFLICT');
          const currentDraft = await offlineStorage.getDraft(evaluationId, testType);
          if (currentDraft && err.serverRecord) {
            setConflictData({
              localDraft: currentDraft,
              serverRecord: err.serverRecord,
            });
          }
        } else {
          console.warn('[useSelfHealingTestState] Background sync failed (retained in IndexedDB):', err);
          const isOnlineNow = typeof navigator !== 'undefined' ? navigator.onLine : true;
          setSyncStatus(isOnlineNow ? 'SAVED_LOCALLY' : 'OFFLINE');
        }
      }
    },
    [evaluationId, testType, readOnly, conflictData]
  );

  const triggerDebouncedSync = useCallback(
    (delayMs = 1500) => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = setTimeout(() => {
        performBackgroundSync();
      }, delayMs);
    },
    [performBackgroundSync]
  );

  // Setters that trigger immediate local auto-save
  const setObservations = useCallback(
    (updater: any[] | ((prev: any[]) => any[])) => {
      setObservationsState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        persistFrameByFrame(
          next,
          latestStateRef.current.environmentalData,
          latestStateRef.current.testInputs,
          latestStateRef.current.notes
        );
        return next;
      });
    },
    [persistFrameByFrame]
  );

  const setEnvironmentalData = useCallback(
    (updater: any | ((prev: any) => any)) => {
      setEnvironmentalDataState((prev: any) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        persistFrameByFrame(
          latestStateRef.current.observations,
          next,
          latestStateRef.current.testInputs,
          latestStateRef.current.notes
        );
        return next;
      });
    },
    [persistFrameByFrame]
  );

  const setTestInputs = useCallback(
    (updater: any | ((prev: any) => any)) => {
      setTestInputsState((prev: any) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        persistFrameByFrame(
          latestStateRef.current.observations,
          latestStateRef.current.environmentalData,
          next,
          latestStateRef.current.notes
        );
        return next;
      });
    },
    [persistFrameByFrame]
  );

  const setNotes = useCallback(
    (updater: string | ((prev: string) => string)) => {
      setNotesState((prev: string) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        persistFrameByFrame(
          latestStateRef.current.observations,
          latestStateRef.current.environmentalData,
          latestStateRef.current.testInputs,
          next
        );
        return next;
      });
    },
    [persistFrameByFrame]
  );

  // Restore decision handlers
  const restoreLocalDraft = useCallback(async () => {
    if (!localDraftCandidate) return;

    if (localDraftCandidate.observations) {
      setObservationsState(localDraftCandidate.observations);
    }
    if (localDraftCandidate.environmentalData) {
      setEnvironmentalDataState(localDraftCandidate.environmentalData);
    }
    if (localDraftCandidate.testInputs) {
      setTestInputsState(localDraftCandidate.testInputs);
    }
    if (localDraftCandidate.notes !== undefined) {
      setNotesState(localDraftCandidate.notes);
    }

    setShowRestorePrompt(false);
    setSyncStatus('SAVED_LOCALLY');

    // Trigger immediate sync to push restored draft to server
    setTimeout(() => {
      performBackgroundSync();
    }, 100);
  }, [localDraftCandidate, performBackgroundSync]);

  const discardLocalDraft = useCallback(async () => {
    await offlineStorage.deleteDraft(evaluationId, testType);
    setShowRestorePrompt(false);
    setLocalDraftCandidate(null);

    // Reset to server existingRecord
    if (existingRecord) {
      if (existingRecord.observations) setObservationsState(existingRecord.observations);
      if (existingRecord.environmentalData) setEnvironmentalDataState(existingRecord.environmentalData);
      if (existingRecord.testInputs) setTestInputsState(existingRecord.testInputs);
      if (existingRecord.notes !== undefined) setNotesState(existingRecord.notes || '');
      setSyncStatus('SYNCED');
    }
  }, [evaluationId, testType, existingRecord]);

  // Conflict resolution handler
  const resolveConflict = useCallback(
    async (choice: 'LOCAL' | 'SERVER') => {
      if (!conflictData) return;

      if (choice === 'LOCAL') {
        // Force save local to server
        await performBackgroundSync(true);
        setConflictData(null);
      } else {
        // Discard local and adopt server
        await offlineStorage.deleteDraft(evaluationId, testType);
        const s = conflictData.serverRecord;
        if (s.observations) setObservationsState(s.observations);
        if (s.environmentalData) setEnvironmentalDataState(s.environmentalData);
        if (s.testInputs) setTestInputsState(s.testInputs);
        if (s.notes !== undefined) setNotesState(s.notes || '');
        if (s.updatedAt) latestServerUpdatedAtRef.current = s.updatedAt;
        setConflictData(null);
        setSyncStatus('SYNCED');
        onRecordSaved(s);
      }
    },
    [conflictData, evaluationId, testType, performBackgroundSync, onRecordSaved]
  );

  return {
    observations,
    setObservations,
    environmentalData,
    setEnvironmentalData,
    testInputs,
    setTestInputs,
    notes,
    setNotes,
    syncStatus,
    lastLocalSaveTime,
    lastServerSyncTime,
    showRestorePrompt,
    localDraftCandidate,
    conflictData,
    setConflictData,
    restoreLocalDraft,
    discardLocalDraft,
    resolveConflict,
    syncNow: () => performBackgroundSync(false),
  };
}
