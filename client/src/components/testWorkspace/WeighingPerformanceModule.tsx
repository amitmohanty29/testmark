import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  HelpCircle, 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Sparkles, 
  ArrowUp, 
  ArrowDown,
  Info,
  Clock,
  RefreshCw
} from 'lucide-react';
import { 
  Instrument, 
  TestRecord, 
  WeighingPointObservation, 
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

interface WeighingPerformanceModuleProps {
  evaluationId: string;
  instrument: Instrument;
  existingRecord?: TestRecord;
  onRecordSaved: (record: TestRecord) => void;
  readOnly?: boolean;
}

export const WeighingPerformanceModule: React.FC<WeighingPerformanceModuleProps> = ({
  evaluationId,
  instrument,
  existingRecord,
  onRecordSaved,
  readOnly = false,
}) => {
  // Self-healing state engine with immediate IndexedDB saving and offline resiliency
  const {
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
    syncNow,
  } = useSelfHealingTestState({
    evaluationId,
    testType: 'WEIGHING_PERFORMANCE',
    existingRecord,
    onRecordSaved,
    readOnly,
    initialEnvironmentalData: {
      temperatureCelsius: 22.0,
      relativeHumidity: 50,
      atmosphericPressureHpa: 1013,
      isInstrumentLevel: true,
      standardWeightsCertificate: 'NPL/MET/2026/F1-CLASS/9941',
      notes: 'Controlled metrology room with granite test bench.',
    },
    initialTestInputs: {
      verificationType: 'INITIAL',
    },
  });

  const verificationType = (testInputs?.verificationType as VerificationType) || 'INITIAL';
  const setVerificationType = (vt: VerificationType) => {
    setTestInputs((prev: any) => ({ ...prev, verificationType: vt }));
  };

  const [complianceResult, setComplianceResult] = useState<TestComplianceResult | null>(
    existingRecord?.complianceDetails || null
  );

  // State management
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAction, setSavingAction] = useState<'DRAFT' | 'FINALIZE' | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showMeWhyOpen, setShowMeWhyOpen] = useState(false);

  // Sync compliance details if existingRecord changes
  useEffect(() => {
    if (existingRecord?.complianceDetails) {
      setComplianceResult(existingRecord.complianceDetails);
    }
  }, [existingRecord]);

  // Generate standard OIML R-76 test points if empty
  useEffect(() => {
    if (observations.length === 0 && (!existingRecord?.observations || existingRecord.observations.length === 0)) {
      generateStandardPoints();
    }
  }, [observations.length]);

  const generateStandardPoints = () => {
    const e = instrument.scaleIntervalE;
    const max = instrument.maxCapacity;
    const min = instrument.minCapacity;

    // Standard points per OIML R-76 A.4.4.1:
    // Zero, Min, changeover points (e.g. 500e, 2000e), 50% Max, 100% Max, and descending
    const pts: number[] = [0, min];

    if (500 * e < max && 500 * e > min) pts.push(500 * e);
    if (2000 * e < max && 2000 * e > 500 * e) pts.push(2000 * e);
    const halfMax = Math.round(max * 0.5 * 100) / 100;
    if (!pts.includes(halfMax) && halfMax > min) pts.push(halfMax);
    if (!pts.includes(max)) pts.push(max);

    // Sort ascending
    pts.sort((a, b) => a - b);

    const initialRows: WeighingPointObservation[] = [];
    let stepCount = 1;

    // Ascending cycle
    for (const load of pts) {
      initialRows.push({
        step: stepCount++,
        direction: 'ASCENDING',
        appliedLoad: load,
        indication: load, // nominal default indication
        deltaL: 0,
      });
    }

    // Descending cycle (down from max back to zero)
    const descPts = [...pts].reverse();
    for (const load of descPts) {
      if (load === max) continue; // already weighed at peak
      initialRows.push({
        step: stepCount++,
        direction: 'DESCENDING',
        appliedLoad: load,
        indication: load,
        deltaL: 0,
      });
    }

    setObservations(initialRows);
  };

  // Add row
  const addRow = () => {
    const last = observations[observations.length - 1];
    const newStep = observations.length + 1;
    setObservations([
      ...observations,
      {
        step: newStep,
        direction: last?.direction || 'ASCENDING',
        appliedLoad: last ? Math.round((last.appliedLoad + instrument.scaleIntervalE * 10) * 100) / 100 : 0,
        indication: last ? Math.round((last.appliedLoad + instrument.scaleIntervalE * 10) * 100) / 100 : 0,
        deltaL: 0,
      },
    ]);
  };

  // Remove row
  const removeRow = (index: number) => {
    const updated = observations.filter((_, i) => i !== index);
    // re-number steps
    setObservations(updated.map((row, i) => ({ ...row, step: i + 1 })));
  };

  // Update cell
  const updateRow = (index: number, field: keyof WeighingPointObservation, value: any) => {
    const updated = [...observations];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setObservations(updated);
  };

  // Preview Calculation
  const handleCalculatePreview = async () => {
    setCalculating(true);
    setErrorMsg(null);
    try {
      const res = await api.calculateTest(evaluationId, 'WEIGHING_PERFORMANCE', {
        observations,
        environmentalData,
        verificationType,
      });
      setComplianceResult(res.result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to calculate compliance');
    } finally {
      setCalculating(false);
    }
  };

  // Save Record (Save & Resume or Finalize)
  const handleSave = async (statusOverride: 'DRAFT' | 'PASS' | 'FAIL' | 'REVIEW') => {
    setSaving(true);
    setSavingAction(statusOverride === 'DRAFT' ? 'DRAFT' : 'FINALIZE');
    setErrorMsg(null);
    setSaveSuccessMsg(null);

    try {
      const res = await api.saveTestRecord(evaluationId, 'WEIGHING_PERFORMANCE', {
        observations,
        environmentalData,
        testInputs: { verificationType },
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
        : `Weighing Performance module finalized with verdict: ${res.record.status}!`;
      setSaveSuccessMsg(msg);
      setTimeout(() => setSaveSuccessMsg(null), 6000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save test record');
    } finally {
      setSaving(false);
      setSavingAction(null);
    }
  };

  // Find result for specific step if calculated
  const getStepResult = (step: number) => {
    if (!complianceResult?.calculationOutput?.results) return null;
    return complianceResult.calculationOutput.results.find((r: any) => r.step === step);
  };

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

      {/* Module Overview Banner */}
      <div className="bg-[#fcfbf9] p-5 rounded-lg border border-[#ded7c4] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#006c51]" />
            <h3 className="text-base font-bold font-serif text-[#006c51]">
              Weighing Performance & Indication Accuracy Test
            </h3>
            <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-semibold">
              OIML R-76 A.4.4
            </span>
          </div>
          <p className="text-xs text-gov-sand-700 mt-1 max-w-2xl leading-relaxed">
            Verify indication error across ascending loading and descending unloading cycles up to Max Capacity ({instrument.maxCapacity} {instrument.verificationUnits}). 
            Tolerance rule: Maximum Permissible Error (MPE) evaluated per Table 6 for {instrument.accuracyClass}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono text-gov-sand-500 block">Inspection Regimen</span>
            <select
              value={verificationType}
              onChange={(e) => setVerificationType(e.target.value as VerificationType)}
              disabled={readOnly}
              className="gov-input text-xs font-semibold py-1 px-2.5 bg-white"
            >
              <option value="INITIAL">Initial Verification (1.0× MPE)</option>
              <option value="IN_SERVICE">In-Service Inspection (2.0× MPE)</option>
            </select>
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

      {/* Alerts */}
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

      {/* Observation Table Card */}
      <div className="gov-card">
        <div className="gov-card-header flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gov-sand-900">
              Observation Log & Applied Test Weights
            </h4>
            <span className="text-[10px] text-gov-sand-500 font-mono">
              ({observations.length} points logged)
            </span>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={generateStandardPoints}
                className="btn-gov-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                title="Automatically calculate standard test points: Zero, Min, 500e, 2000e, 50% Max, 100% Max"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#006c51]" /> Reset to Standard Points
              </button>
              <button
                type="button"
                onClick={addRow}
                className="btn-gov-secondary text-xs py-1 px-2.5 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 text-[#006c51]" /> Add Load Step
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#f6f4ed] border-b border-[#ded7c4] text-gov-sand-700 font-mono text-[11px] uppercase">
                <th className="py-2.5 px-3 w-12 text-center">Step</th>
                <th className="py-2.5 px-3 w-28">Direction</th>
                <th className="py-2.5 px-3">Applied Load L ({instrument.verificationUnits})</th>
                <th className="py-2.5 px-3">Indication I ({instrument.verificationUnits})</th>
                <th className="py-2.5 px-3">Small Weights ΔL</th>
                <th className="py-2.5 px-3 bg-[#f2efe6]">Corrected Error Ec</th>
                <th className="py-2.5 px-3 bg-[#f2efe6]">MPE Limit</th>
                <th className="py-2.5 px-3 text-center bg-[#f2efe6]">Result</th>
                {!readOnly && <th className="py-2.5 px-3 w-10 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ece7d8]">
              {observations.map((obs, idx) => {
                const stepRes = getStepResult(obs.step);
                const isZero = Math.abs(obs.appliedLoad) < 1e-9;

                return (
                  <tr key={idx} className="hover:bg-[#faf9f5] transition-colors">
                    <td className="py-2 px-3 text-center font-mono font-bold text-gov-sand-600">
                      {obs.step}
                    </td>

                    <td className="py-2 px-3">
                      <select
                        value={obs.direction}
                        onChange={(e) => updateRow(idx, 'direction', e.target.value)}
                        disabled={readOnly}
                        className="gov-input text-xs py-1 px-2 font-mono flex items-center"
                      >
                        <option value="ASCENDING">▲ Ascending</option>
                        <option value="DESCENDING">▼ Descending</option>
                      </select>
                    </td>

                    <td className="py-2 px-3 font-mono">
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          value={obs.appliedLoad}
                          onChange={(e) => updateRow(idx, 'appliedLoad', parseFloat(e.target.value) || 0)}
                          disabled={readOnly}
                          className="gov-input text-xs py-1 px-2 font-mono font-bold text-gov-sand-900"
                        />
                        {isZero && (
                          <span className="absolute right-2 top-1.5 text-[9px] font-mono text-[#006c51] uppercase font-semibold">
                            Zero
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2 px-3 font-mono">
                      <input
                        type="number"
                        step="any"
                        value={obs.indication}
                        onChange={(e) => updateRow(idx, 'indication', parseFloat(e.target.value) || 0)}
                        disabled={readOnly}
                        className="gov-input text-xs py-1 px-2 font-mono text-gov-sand-900"
                      />
                    </td>

                    <td className="py-2 px-3 font-mono">
                      <input
                        type="number"
                        step="any"
                        value={obs.deltaL ?? 0}
                        onChange={(e) => updateRow(idx, 'deltaL', parseFloat(e.target.value) || 0)}
                        disabled={readOnly}
                        placeholder="0"
                        className="gov-input text-xs py-1 px-2 font-mono text-gov-sand-700"
                        title="Small weights added to reach next graduation transition"
                      />
                    </td>

                    {/* Calculated error preview */}
                    <td className="py-2 px-3 font-mono font-bold bg-[#fcfbf9]">
                      {stepRes ? (
                        <span className={stepRes.isPass ? 'text-gov-sand-900' : 'text-red-700'}>
                          {stepRes.correctedErrorEc > 0 ? `+${stepRes.correctedErrorEc}` : stepRes.correctedErrorEc} {instrument.verificationUnits}
                        </span>
                      ) : (
                        <span className="text-gov-sand-400 italic">--</span>
                      )}
                    </td>

                    {/* MPE limit */}
                    <td className="py-2 px-3 font-mono text-gov-sand-700 bg-[#fcfbf9]">
                      {stepRes ? (
                        <span>±{stepRes.mpeResult.mpeValue} ({stepRes.mpeResult.mpeInE}e)</span>
                      ) : (
                        <span className="text-gov-sand-400 italic">--</span>
                      )}
                    </td>

                    {/* Verdict */}
                    <td className="py-2 px-3 text-center bg-[#fcfbf9]">
                      {stepRes ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            stepRes.isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {stepRes.isPass ? 'PASS' : 'FAIL'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gov-sand-400 font-mono">PENDING</span>
                      )}
                    </td>

                    {!readOnly && (
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          disabled={observations.length <= 2}
                          className="text-gov-sand-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Calculation Action Bar */}
        <div className="bg-[#f6f4ed] px-6 py-3 border-t border-[#ded7c4] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gov-sand-600">
            <Info className="w-3.5 h-3.5 text-[#006c51]" />
            <span>Turning point formula: P = I + 0.5e - ΔL | Ec = (P - L) - E0</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCalculatePreview}
              disabled={calculating || observations.length === 0}
              className="btn-gov-secondary text-xs"
            >
              {calculating ? 'Evaluating...' : 'Recalculate Errors & Limits'}
            </button>
          </div>
        </div>
      </div>

      {/* Compliance Results Card & "Show Me Why" Breakdown */}
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
                    OIML R-76 Weighing Compliance Verdict:
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

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded border border-black/10">
              <span className="text-[10px] text-gov-sand-500 uppercase font-mono block">Zero Load Error (E0)</span>
              <span className="font-mono font-bold text-sm text-gov-sand-900">
                {complianceResult.calculationOutput?.zeroErrorE0 ?? 0} {instrument.verificationUnits}
              </span>
            </div>
            <div className="bg-white p-3 rounded border border-black/10">
              <span className="text-[10px] text-gov-sand-500 uppercase font-mono block">Max Observed Error</span>
              <span className="font-mono font-bold text-sm text-gov-sand-900">
                {complianceResult.calculationOutput?.maxError ?? 0} {instrument.verificationUnits}
              </span>
            </div>
            <div className="bg-white p-3 rounded border border-black/10">
              <span className="text-[10px] text-gov-sand-500 uppercase font-mono block">Capacity Margin</span>
              <span className="font-mono font-bold text-sm text-emerald-800">
                +{complianceResult.marginOfCompliance} {instrument.verificationUnits}
              </span>
            </div>
            <div className="bg-white p-3 rounded border border-black/10">
              <span className="text-[10px] text-gov-sand-500 uppercase font-mono block">MPE Utilization</span>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-full bg-gov-sand-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      complianceResult.maxErrorUtilizationPercent > 90
                        ? 'bg-amber-600'
                        : complianceResult.maxErrorUtilizationPercent > 100
                        ? 'bg-red-600'
                        : 'bg-[#006c51]'
                    }`}
                    style={{ width: `${Math.min(complianceResult.maxErrorUtilizationPercent, 100)}%` }}
                  />
                </div>
                <span className="font-mono text-[11px] font-bold">
                  {complianceResult.maxErrorUtilizationPercent}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Free-text Test Notes */}
      <div className="gov-card p-4 space-y-2">
        <label className="gov-label text-xs font-bold uppercase tracking-wider text-gov-sand-800">
          Testing Officer Technical Notes & Observations
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={readOnly}
          placeholder="Record notes on mechanical return, zero stability, creep observation, or specific test weights serials..."
          className="gov-input text-xs"
        />
      </div>

      {/* Photographic & Evidence Attachment Section */}
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

      {/* Save & Resume Action Controls with Direct Feedback */}
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
                disabled={saving || observations.length === 0}
                className="btn-gov-primary text-xs flex items-center gap-1.5 min-w-[170px] justify-center"
              >
                {savingAction === 'FINALIZE' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Finalizing Module...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Finalize Weighing Module</span>
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
