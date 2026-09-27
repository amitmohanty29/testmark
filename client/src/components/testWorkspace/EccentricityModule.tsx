import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  HelpCircle, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Clock, 
  Grid,
  RefreshCw 
} from 'lucide-react';
import { 
  Instrument, 
  TestRecord, 
  EccentricityObservation, 
  EnvironmentalConditions, 
  VerificationType,
  TestComplianceResult 
} from '../../types';
import { api } from '../../api';
import { EnvironmentalPanel } from './EnvironmentalPanel';
import { EvidenceAttachmentPanel } from './EvidenceAttachmentPanel';
import { ShowMeWhyModal } from './ShowMeWhyModal';
import { SelfHealingStatusBar } from './SelfHealingStatusBar';
import { RestoreDraftModal } from './RestoreDraftModal';
import { ConflictResolutionModal } from './ConflictResolutionModal';
import { useSelfHealingTestState } from '../../hooks/useSelfHealingTestState';

interface EccentricityModuleProps {
  evaluationId: string;
  instrument: Instrument;
  existingRecord?: TestRecord;
  onRecordSaved: (record: TestRecord) => void;
  readOnly?: boolean;
}

export const EccentricityModule: React.FC<EccentricityModuleProps> = ({
  evaluationId,
  instrument,
  existingRecord,
  onRecordSaved,
  readOnly = false,
}) => {
  // Typical eccentricity load is 1/3 Max per OIML R-76 A.4.7.1
  const defaultLoad = Math.round(instrument.maxCapacity * 0.33 * 100) / 100;

  const defaultPositions: EccentricityObservation[] = [
    { positionIndex: 1, positionName: '1. Center (Pos 1)', appliedLoad: defaultLoad, indication: defaultLoad, deltaL: 0 },
    { positionIndex: 2, positionName: '2. Front-Left (Pos 2)', appliedLoad: defaultLoad, indication: defaultLoad, deltaL: 0 },
    { positionIndex: 3, positionName: '3. Rear-Left (Pos 3)', appliedLoad: defaultLoad, indication: defaultLoad, deltaL: 0 },
    { positionIndex: 4, positionName: '4. Rear-Right (Pos 4)', appliedLoad: defaultLoad, indication: defaultLoad, deltaL: 0 },
    { positionIndex: 5, positionName: '5. Front-Right (Pos 5)', appliedLoad: defaultLoad, indication: defaultLoad, deltaL: 0 },
  ];

  // Self-healing state engine with immediate IndexedDB saving and offline resiliency
  const {
    observations: points,
    setObservations: setPoints,
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
    syncNow,
  } = useSelfHealingTestState({
    evaluationId,
    testType: 'ECCENTRICITY',
    existingRecord,
    onRecordSaved,
    readOnly,
    initialObservations: defaultPositions,
    initialEnvironmentalData: {
      temperatureCelsius: 22.0,
      relativeHumidity: 50,
      atmosphericPressureHpa: 1013,
      isInstrumentLevel: true,
      standardWeightsCertificate: 'NPL/MET/2026/F1-CLASS/9941',
      notes: 'Load placed in center and four platform quadrant centroids.',
    },
    initialTestInputs: {
      appliedLoad: defaultLoad,
      verificationType: 'INITIAL',
    },
  });

  const appliedLoad = testInputs?.appliedLoad || defaultLoad;
  const setAppliedLoad = (val: number) => {
    setTestInputs((prev: any) => ({ ...prev, appliedLoad: val }));
  };

  const verificationType = (testInputs?.verificationType as VerificationType) || 'INITIAL';
  const setVerificationType = (val: VerificationType) => {
    setTestInputs((prev: any) => ({ ...prev, verificationType: val }));
  };

  const [notesState, setNotesState] = useState<string>(existingRecord?.notes || '');
  const [complianceResult, setComplianceResult] = useState<TestComplianceResult | null>(
    existingRecord?.complianceDetails || null
  );

  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAction, setSavingAction] = useState<'DRAFT' | 'FINALIZE' | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showMeWhyOpen, setShowMeWhyOpen] = useState(false);
  const [activeHoverPos, setActiveHoverPos] = useState<number | null>(null);

  // Sync compliance details if existingRecord changes
  useEffect(() => {
    if (existingRecord?.complianceDetails) {
      setComplianceResult(existingRecord.complianceDetails);
    }
  }, [existingRecord]);

  const updatePoint = (idx: number, field: keyof EccentricityObservation, value: any) => {
    const updated = [...points];
    updated[idx] = { ...updated[idx], [field]: value };
    setPoints(updated);
  };

  const handleCalculatePreview = async () => {
    setCalculating(true);
    setErrorMsg(null);
    try {
      const res = await api.calculateTest(evaluationId, 'ECCENTRICITY', {
        observations: points,
        appliedLoad,
        environmentalData,
        verificationType,
      });
      setComplianceResult(res.result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to calculate eccentricity');
    } finally {
      setCalculating(false);
    }
  };

  const handleSave = async (statusOverride: 'DRAFT' | 'PASS' | 'FAIL' | 'REVIEW') => {
    setSaving(true);
    setSavingAction(statusOverride === 'DRAFT' ? 'DRAFT' : 'FINALIZE');
    setErrorMsg(null);
    setSaveSuccessMsg(null);

    try {
      const res = await api.saveTestRecord(evaluationId, 'ECCENTRICITY', {
        observations: points,
        appliedLoad,
        environmentalData,
        testInputs: { appliedLoad, verificationType },
        notes,
        verificationType,
        status: statusOverride,
      });

      onRecordSaved(res.record);
      if (res.complianceResult) {
        setComplianceResult(res.complianceResult);
      }
      const msg = statusOverride === 'DRAFT'
        ? 'Partial draft saved successfully. Entries persisted to database.'
        : `Eccentricity module finalized with verdict: ${res.record.status}!`;
      setSaveSuccessMsg(msg);
      setTimeout(() => setSaveSuccessMsg(null), 6000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save test record');
    } finally {
      setSaving(false);
      setSavingAction(null);
    }
  };

  const calcOutput = complianceResult?.calculationOutput;

  return (
    <div className="space-y-6">
      {/* Persistent Self-Healing Status Indicator */}
      <SelfHealingStatusBar
        status={syncStatus}
        lastLocalSaveTime={lastLocalSaveTime}
        lastServerSyncTime={lastServerSyncTime}
        onSyncNow={syncNow}
        onOpenConflictModal={() => conflictData && setConflictData(conflictData)}
      />

      {/* Restore Unsaved Test Data Prompt Modal */}
      {showRestorePrompt && localDraftCandidate && (
        <RestoreDraftModal
          isOpen={showRestorePrompt}
          draft={localDraftCandidate}
          serverRecord={existingRecord}
          onRestore={restoreLocalDraft}
          onDiscard={discardLocalDraft}
        />
      )}

      {/* Sync Conflict Resolution Modal */}
      {conflictData && (
        <ConflictResolutionModal
          isOpen={Boolean(conflictData)}
          localDraft={conflictData.localDraft}
          serverRecord={conflictData.serverRecord}
          onResolve={resolveConflict}
          onCancel={() => setConflictData(null)}
        />
      )}

      {/* Banner */}
      <div className="bg-[#fcfbf9] p-5 rounded-lg border border-[#ded7c4] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#006c51]" />
            <h3 className="text-base font-bold font-serif text-[#006c51]">
              Eccentricity (Off-Center Loading) Test
            </h3>
            <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-semibold">
              OIML R-76 A.4.7
            </span>
          </div>
          <p className="text-xs text-gov-sand-700 mt-1 max-w-2xl leading-relaxed">
            Test the instrument by placing a standard test load (typically 1/3 Max = {appliedLoad} {instrument.verificationUnits}) sequentially on the four quadrants and center of the platform load receptor.
            Every position error |Ec| must be within the MPE limit.
          </p>
        </div>

        <div>
          <span className="text-[10px] uppercase font-mono text-gov-sand-500 block">Eccentricity Test Load (1/3 Max)</span>
          <div className="relative">
            <input
              type="number"
              step="any"
              value={appliedLoad}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setAppliedLoad(val);
                setPoints(points.map((p) => ({ ...p, appliedLoad: val })));
              }}
              disabled={readOnly}
              className="gov-input text-xs font-mono font-bold py-1 px-2.5 w-32"
            />
            <span className="absolute right-2 top-1.5 text-[10px] text-gov-sand-500">
              {instrument.verificationUnits}
            </span>
          </div>
        </div>
      </div>

      {/* Environmental Conditions */}
      <EnvironmentalPanel
        conditions={environmentalData}
        onChange={setEnvironmentalData}
        instrument={instrument}
        readOnly={readOnly}
      />

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border-l-4 border-emerald-600 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border-l-4 border-red-600 text-xs text-red-800 flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Visual Platform Quadrant Diagram + Observation Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Platform Pan Diagram */}
        <div className="gov-card p-5 flex flex-col items-center justify-center text-center">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gov-sand-800 mb-1 flex items-center gap-1.5">
            <Grid className="w-4 h-4 text-[#006c51]" />
            Platform Receptor Layout (5 Positions)
          </h4>
          <p className="text-[11px] text-gov-sand-500 mb-4">
            Centroid loading positions per OIML R-76 Clause A.4.7
          </p>

          {/* Interactive Pan Visualizer */}
          <div className="relative w-56 h-56 bg-[#ede8dc] border-2 border-[#b5ac97] rounded-xl shadow-inner flex items-center justify-center p-3">
            {/* Center crosshair */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full border-t border-dashed border-[#b5ac97]/60" />
              <div className="h-full border-l border-dashed border-[#b5ac97]/60 absolute" />
            </div>

            {/* Position 3: Rear-Left */}
            <div
              className={`absolute top-4 left-4 w-14 h-14 rounded-lg flex flex-col items-center justify-center border font-mono text-[10px] transition-all cursor-pointer ${
                activeHoverPos === 3
                  ? 'bg-[#006c51] text-white border-[#006c51] shadow-lg scale-105'
                  : 'bg-white text-gov-sand-800 border-[#ded7c4] hover:border-[#006c51]'
              }`}
              onMouseEnter={() => setActiveHoverPos(3)}
              onMouseLeave={() => setActiveHoverPos(null)}
            >
              <span className="font-bold">Pos 3</span>
              <span className="text-[9px] opacity-80">Rear-L</span>
            </div>

            {/* Position 4: Rear-Right */}
            <div
              className={`absolute top-4 right-4 w-14 h-14 rounded-lg flex flex-col items-center justify-center border font-mono text-[10px] transition-all cursor-pointer ${
                activeHoverPos === 4
                  ? 'bg-[#006c51] text-white border-[#006c51] shadow-lg scale-105'
                  : 'bg-white text-gov-sand-800 border-[#ded7c4] hover:border-[#006c51]'
              }`}
              onMouseEnter={() => setActiveHoverPos(4)}
              onMouseLeave={() => setActiveHoverPos(null)}
            >
              <span className="font-bold">Pos 4</span>
              <span className="text-[9px] opacity-80">Rear-R</span>
            </div>

            {/* Position 1: Center */}
            <div
              className={`z-10 w-16 h-16 rounded-full flex flex-col items-center justify-center border-2 font-mono text-[10px] transition-all cursor-pointer ${
                activeHoverPos === 1
                  ? 'bg-[#006c51] text-white border-[#006c51] shadow-lg scale-105'
                  : 'bg-[#faf8f2] text-gov-sand-900 border-[#006c51] shadow'
              }`}
              onMouseEnter={() => setActiveHoverPos(1)}
              onMouseLeave={() => setActiveHoverPos(null)}
            >
              <span className="font-bold">Pos 1</span>
              <span className="text-[9px] font-semibold text-[#006c51]">Center</span>
            </div>

            {/* Position 2: Front-Left */}
            <div
              className={`absolute bottom-4 left-4 w-14 h-14 rounded-lg flex flex-col items-center justify-center border font-mono text-[10px] transition-all cursor-pointer ${
                activeHoverPos === 2
                  ? 'bg-[#006c51] text-white border-[#006c51] shadow-lg scale-105'
                  : 'bg-white text-gov-sand-800 border-[#ded7c4] hover:border-[#006c51]'
              }`}
              onMouseEnter={() => setActiveHoverPos(2)}
              onMouseLeave={() => setActiveHoverPos(null)}
            >
              <span className="font-bold">Pos 2</span>
              <span className="text-[9px] opacity-80">Front-L</span>
            </div>

            {/* Position 5: Front-Right */}
            <div
              className={`absolute bottom-4 right-4 w-14 h-14 rounded-lg flex flex-col items-center justify-center border font-mono text-[10px] transition-all cursor-pointer ${
                activeHoverPos === 5
                  ? 'bg-[#006c51] text-white border-[#006c51] shadow-lg scale-105'
                  : 'bg-white text-gov-sand-800 border-[#ded7c4] hover:border-[#006c51]'
              }`}
              onMouseEnter={() => setActiveHoverPos(5)}
              onMouseLeave={() => setActiveHoverPos(null)}
            >
              <span className="font-bold">Pos 5</span>
              <span className="text-[9px] opacity-80">Front-R</span>
            </div>
          </div>

          <span className="text-[10px] text-gov-sand-500 mt-3 font-mono">
            Hover quadrant to cross-reference table row
          </span>
        </div>

        {/* Observation Table */}
        <div className="lg:col-span-2 gov-card">
          <div className="gov-card-header flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gov-sand-900">
              Quadrant Indication Readings ({appliedLoad} {instrument.verificationUnits})
            </h4>
            <span className="text-[10px] font-mono text-gov-sand-500">
              Limit: ±{calcOutput?.mpeResult?.mpeValue ?? '--'} ({calcOutput?.mpeResult?.mpeInE ?? '--'}e)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#f6f4ed] border-b border-[#ded7c4] text-gov-sand-700 font-mono text-[11px] uppercase">
                  <th className="py-2 px-3">Position</th>
                  <th className="py-2 px-3">Indication ({instrument.verificationUnits})</th>
                  <th className="py-2 px-3">ΔL</th>
                  <th className="py-2 px-3 bg-[#f2efe6]">Corrected Error Ec</th>
                  <th className="py-2 px-3 bg-[#f2efe6]">Dev from Center</th>
                  <th className="py-2 px-3 text-center bg-[#f2efe6]">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ece7d8]">
                {points.map((pt, idx) => {
                  const ptOutput = calcOutput?.points?.[idx];
                  const isHovered = activeHoverPos === pt.positionIndex;

                  return (
                    <tr
                      key={idx}
                      className={`transition-colors ${
                        isHovered ? 'bg-emerald-50/80 font-semibold' : 'hover:bg-[#faf9f5]'
                      }`}
                      onMouseEnter={() => setActiveHoverPos(pt.positionIndex)}
                      onMouseLeave={() => setActiveHoverPos(null)}
                    >
                      <td className="py-2 px-3 font-mono font-bold text-gov-sand-900">
                        {pt.positionName}
                      </td>

                      <td className="py-2 px-3 font-mono">
                        <input
                          type="number"
                          step="any"
                          value={pt.indication}
                          onChange={(e) => updatePoint(idx, 'indication', parseFloat(e.target.value) || 0)}
                          disabled={readOnly}
                          className="gov-input text-xs py-1 px-2 font-mono text-gov-sand-900 w-28"
                        />
                      </td>

                      <td className="py-2 px-3 font-mono">
                        <input
                          type="number"
                          step="any"
                          value={pt.deltaL ?? 0}
                          onChange={(e) => updatePoint(idx, 'deltaL', parseFloat(e.target.value) || 0)}
                          disabled={readOnly}
                          placeholder="0"
                          className="gov-input text-xs py-1 px-2 font-mono text-gov-sand-700 w-20"
                        />
                      </td>

                      <td className="py-2 px-3 font-mono font-bold bg-[#fcfbf9]">
                        {ptOutput ? (
                          <span className={ptOutput.isPass ? 'text-gov-sand-900' : 'text-red-700'}>
                            {ptOutput.correctedErrorEc > 0 ? `+${ptOutput.correctedErrorEc}` : ptOutput.correctedErrorEc} {instrument.verificationUnits}
                          </span>
                        ) : (
                          <span className="text-gov-sand-400 italic">--</span>
                        )}
                      </td>

                      <td className="py-2 px-3 font-mono text-gov-sand-700 bg-[#fcfbf9]">
                        {ptOutput ? (
                          <span>{ptOutput.deviationFromCenter} {instrument.verificationUnits}</span>
                        ) : (
                          <span className="text-gov-sand-400 italic">--</span>
                        )}
                      </td>

                      <td className="py-2 px-3 text-center bg-[#fcfbf9]">
                        {ptOutput ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              ptOutput.isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {ptOutput.isPass ? 'PASS' : 'FAIL'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gov-sand-400 font-mono">PENDING</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-[#f6f4ed] px-4 py-2.5 border-t border-[#ded7c4] flex items-center justify-between">
            <span className="text-xs text-gov-sand-600 font-mono">
              Criterion: |Ec,i| ≤ MPE(1/3 Max) for all 5 positions
            </span>
            <button
              type="button"
              onClick={handleCalculatePreview}
              disabled={calculating}
              className="btn-gov-secondary text-xs"
            >
              {calculating ? 'Evaluating...' : 'Recalculate Eccentricity'}
            </button>
          </div>
        </div>
      </div>

      {/* Compliance Results Card */}
      {complianceResult && (
        <div className={`p-5 rounded-lg border shadow-sm space-y-4 ${
          complianceResult.verdict === 'PASS'
            ? 'bg-emerald-50/70 border-emerald-300'
            : complianceResult.verdict === 'REVIEW'
            ? 'bg-amber-50/70 border-amber-300'
            : 'bg-red-50/70 border-red-300'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/10">
            <div className="flex items-center space-x-3">
              {complianceResult.verdict === 'PASS' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0" />
              ) : complianceResult.verdict === 'REVIEW' ? (
                <AlertTriangle className="w-6 h-6 text-amber-700 shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-red-700 shrink-0" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold text-sm text-gov-sand-900">
                    Eccentricity Compliance Verdict:
                  </span>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                    complianceResult.verdict === 'PASS'
                      ? 'bg-emerald-200 text-emerald-950'
                      : complianceResult.verdict === 'REVIEW'
                      ? 'bg-amber-200 text-amber-950'
                      : 'bg-red-200 text-red-950'
                  }`}>
                    {complianceResult.verdict}
                  </span>
                </div>
                <p className="text-xs text-gov-sand-700 mt-0.5 font-medium">
                  {complianceResult.summaryText}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowMeWhyOpen(true)}
              className="btn-gov-primary text-xs bg-[#006c51] hover:bg-[#00523d] flex items-center gap-1.5 shadow"
            >
              <HelpCircle className="w-3.5 h-3.5" /> Show Me Why
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded border border-black/10">
              <span className="text-[10px] text-gov-sand-500 uppercase font-mono block">Max Off-Center Error</span>
              <span className="font-mono font-bold text-sm text-gov-sand-900">
                {calcOutput?.maxEccentricError ?? 0} {instrument.verificationUnits}
              </span>
            </div>
            <div className="bg-white p-3 rounded border border-black/10">
              <span className="text-[10px] text-gov-sand-500 uppercase font-mono block">Max Deviation From Center</span>
              <span className="font-mono font-bold text-sm text-gov-sand-900">
                {calcOutput?.maxDeviationFromCenter ?? 0} {instrument.verificationUnits}
              </span>
            </div>
            <div className="bg-white p-3 rounded border border-black/10">
              <span className="text-[10px] text-gov-sand-500 uppercase font-mono block">Permissible Limit (MPE)</span>
              <span className="font-mono font-bold text-sm text-gov-sand-900">
                ±{calcOutput?.mpeResult?.mpeValue ?? 0} {instrument.verificationUnits}
              </span>
            </div>
            <div className="bg-white p-3 rounded border border-black/10">
              <span className="text-[10px] text-gov-sand-500 uppercase font-mono block">Safety Margin</span>
              <span className="font-mono font-bold text-sm text-emerald-800">
                +{complianceResult.marginOfCompliance} {instrument.verificationUnits}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Free-text Test Notes */}
      <div className="gov-card p-4 space-y-2">
        <label className="gov-label text-xs font-bold uppercase tracking-wider text-gov-sand-800">
          Testing Officer Eccentricity Remarks
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={readOnly}
          placeholder="Record notes on load pan leveling, corner support lever alignment, or specific quadrant load cell response..."
          className="gov-input text-xs"
        />
      </div>

      {/* Evidence Attachments */}
      <EvidenceAttachmentPanel
        evaluationId={evaluationId}
        testRecordId={existingRecord?.id}
        attachments={existingRecord?.attachments || []}
        onAttachmentAdded={(att) => {
          if (existingRecord) {
            onRecordSaved({
              ...existingRecord,
              attachments: [...(existingRecord.attachments || []), att],
            });
          }
        }}
        onAttachmentRemoved={(attId) => {
          if (existingRecord) {
            onRecordSaved({
              ...existingRecord,
              attachments: (existingRecord.attachments || []).filter((a) => a.id !== attId),
            });
          }
        }}
        readOnly={readOnly}
      />

      {/* Save & Resume Controls with Direct Feedback */}
      {!readOnly && (
        <div className="space-y-3">
          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-50 border-l-4 border-emerald-600 text-xs text-emerald-900 flex items-center justify-between rounded shadow-xs animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{saveSuccessMsg}</span>
              </div>
              <span className="text-[10px] font-mono uppercase bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-bold">
                Saved to Database
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border-l-4 border-red-600 text-xs text-red-900 flex items-center gap-2 rounded shadow-xs animate-fadeIn">
              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          <div className="bg-[#fcfbf9] p-4 rounded-lg border border-[#ded7c4] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-gov-sand-600">
              <Clock className="w-4 h-4 text-[#006c51]" />
              <span>Save and resume anytime without losing partial entries.</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSave('DRAFT')}
                disabled={saving}
                className="btn-gov-secondary text-xs flex items-center gap-1.5 min-w-[140px] justify-center"
              >
                {savingAction === 'DRAFT' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#006c51]" />
                    <span>Saving Draft...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Partial Draft</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSave(complianceResult?.verdict || 'PASS')}
                disabled={saving || points.length === 0}
                className="btn-gov-primary text-xs flex items-center gap-1.5 min-w-[180px] justify-center"
              >
                {savingAction === 'FINALIZE' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Finalizing Module...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Finalize Eccentricity Module</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show Me Why Modal */}
      <ShowMeWhyModal
        isOpen={showMeWhyOpen}
        onClose={() => setShowMeWhyOpen(false)}
        details={complianceResult?.showMeWhy || null}
        attachments={existingRecord?.attachments || []}
        instrumentUnits={instrument.verificationUnits}
      />
    </div>
  );
};
