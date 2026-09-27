import React, { useState, useEffect } from 'react';
import { 
  Repeat, 
  HelpCircle, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Sparkles, 
  Info, 
  Clock,
  RefreshCw 
} from 'lucide-react';
import { 
  Instrument, 
  TestRecord, 
  RepeatabilityObservation, 
  EnvironmentalConditions, 
  VerificationType,
  TestComplianceResult 
} from '../../types';
import { api } from '../../api';
import { EnvironmentalPanel } from './EnvironmentalPanel';
import { EvidenceAttachmentPanel } from './EvidenceAttachmentPanel';
import { ShowMeWhyModal } from './ShowMeWhyModal';

interface RepeatabilityModuleProps {
  evaluationId: string;
  instrument: Instrument;
  existingRecord?: TestRecord;
  onRecordSaved: (record: TestRecord) => void;
  readOnly?: boolean;
}

export const RepeatabilityModule: React.FC<RepeatabilityModuleProps> = ({
  evaluationId,
  instrument,
  existingRecord,
  onRecordSaved,
  readOnly = false,
}) => {
  const defaultNominal = Math.round(instrument.maxCapacity * 0.5 * 100) / 100;
  const [nominalLoad, setNominalLoad] = useState<number>(
    existingRecord?.testInputs?.nominalLoad || defaultNominal
  );

  const [environmentalData, setEnvironmentalData] = useState<EnvironmentalConditions>(
    existingRecord?.environmentalData || {
      temperatureCelsius: 22.0,
      relativeHumidity: 50,
      atmosphericPressureHpa: 1013,
      isInstrumentLevel: true,
      standardWeightsCertificate: 'NPL/MET/2026/F1-CLASS/9941',
      notes: 'Repeatability series performed on centered load receptor.',
    }
  );

  const [verificationType, setVerificationType] = useState<VerificationType>(
    (existingRecord?.testInputs?.verificationType as VerificationType) || 'INITIAL'
  );

  const [runs, setRuns] = useState<RepeatabilityObservation[]>(
    existingRecord?.observations && existingRecord.observations.length > 0
      ? existingRecord.observations
      : []
  );

  const [notes, setNotes] = useState<string>(existingRecord?.notes || '');
  const [complianceResult, setComplianceResult] = useState<TestComplianceResult | null>(
    existingRecord?.complianceDetails || null
  );

  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAction, setSavingAction] = useState<'DRAFT' | 'FINALIZE' | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showMeWhyOpen, setShowMeWhyOpen] = useState(false);

  // Sync state if existingRecord changes or is updated
  useEffect(() => {
    if (existingRecord) {
      if (existingRecord.observations && existingRecord.observations.length > 0) {
        setRuns(existingRecord.observations);
      }
      if (existingRecord.complianceDetails) {
        setComplianceResult(existingRecord.complianceDetails);
      }
      if (existingRecord.notes !== undefined) {
        setNotes(existingRecord.notes || '');
      }
      if (existingRecord.environmentalData) {
        setEnvironmentalData((prev) => ({ ...prev, ...existingRecord.environmentalData }));
      }
      if (existingRecord.testInputs?.nominalLoad) {
        setNominalLoad(existingRecord.testInputs.nominalLoad);
      }
      if (existingRecord.testInputs?.verificationType) {
        setVerificationType(existingRecord.testInputs.verificationType);
      }
    }
  }, [existingRecord]);

  useEffect(() => {
    if (runs.length === 0 && (!existingRecord?.observations || existingRecord.observations.length === 0)) {
      // Default to 3 standard runs per OIML R-76 A.4.10
      setRuns([
        { runIndex: 1, appliedLoad: nominalLoad, indication: nominalLoad, deltaL: 0 },
        { runIndex: 2, appliedLoad: nominalLoad, indication: nominalLoad, deltaL: 0 },
        { runIndex: 3, appliedLoad: nominalLoad, indication: nominalLoad, deltaL: 0 },
      ]);
    }
  }, [nominalLoad]);

  const addRun = () => {
    const nextIdx = runs.length + 1;
    setRuns([
      ...runs,
      { runIndex: nextIdx, appliedLoad: nominalLoad, indication: nominalLoad, deltaL: 0 },
    ]);
  };

  const removeRun = (idx: number) => {
    const updated = runs.filter((_, i) => i !== idx);
    setRuns(updated.map((r, i) => ({ ...r, runIndex: i + 1 })));
  };

  const updateRun = (idx: number, field: keyof RepeatabilityObservation, value: any) => {
    const updated = [...runs];
    updated[idx] = { ...updated[idx], [field]: value };
    setRuns(updated);
  };

  const handleCalculatePreview = async () => {
    setCalculating(true);
    setErrorMsg(null);
    try {
      const res = await api.calculateTest(evaluationId, 'REPEATABILITY', {
        observations: runs,
        nominalLoad,
        environmentalData,
        verificationType,
      });
      setComplianceResult(res.result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to calculate repeatability');
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
      const res = await api.saveTestRecord(evaluationId, 'REPEATABILITY', {
        observations: runs,
        nominalLoad,
        environmentalData,
        testInputs: { nominalLoad, verificationType },
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
        : `Repeatability module finalized with verdict: ${res.record.status}!`;
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
      {/* Banner */}
      <div className="bg-[#fcfbf9] p-5 rounded-lg border border-[#ded7c4] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-[#006c51]" />
            <h3 className="text-base font-bold font-serif text-[#006c51]">
              Repeatability Metrological Evaluation
            </h3>
            <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-semibold">
              OIML R-76 A.4.10
            </span>
          </div>
          <p className="text-xs text-gov-sand-700 mt-1 max-w-2xl leading-relaxed">
            Successive weighings of the same test load carried out under identical conditions.
            The difference between results must not exceed the absolute value of the maximum permissible error (|MPE|) for that load.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <span className="text-[10px] uppercase font-mono text-gov-sand-500 block">Nominal Test Load</span>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={nominalLoad}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setNominalLoad(val);
                  setRuns(runs.map((r) => ({ ...r, appliedLoad: val })));
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

      {/* Table Card */}
      <div className="gov-card">
        <div className="gov-card-header flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gov-sand-900">
              Successive Weighing Runs Log ({runs.length} Runs)
            </h4>
            <span className="text-[10px] text-gov-sand-500 font-mono">
              (Min: 3 runs per OIML clause)
            </span>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={addRun}
              className="btn-gov-secondary text-xs py-1 px-2.5 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5 text-[#006c51]" /> Add Successive Run
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#f6f4ed] border-b border-[#ded7c4] text-gov-sand-700 font-mono text-[11px] uppercase">
                <th className="py-2.5 px-3 w-16 text-center">Run #</th>
                <th className="py-2.5 px-3">Applied Load ({instrument.verificationUnits})</th>
                <th className="py-2.5 px-3">Observed Indication I ({instrument.verificationUnits})</th>
                <th className="py-2.5 px-3">Turning Point ΔL</th>
                <th className="py-2.5 px-3 bg-[#f2efe6]">Computed Indication P</th>
                <th className="py-2.5 px-3 bg-[#f2efe6]">Error E</th>
                {!readOnly && <th className="py-2.5 px-3 w-10 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ece7d8]">
              {runs.map((run, idx) => {
                const runOutput = calcOutput?.runs?.[idx];
                return (
                  <tr key={idx} className="hover:bg-[#faf9f5]">
                    <td className="py-2 px-3 text-center font-mono font-bold text-gov-sand-600">
                      Run {run.runIndex}
                    </td>

                    <td className="py-2 px-3 font-mono font-bold text-gov-sand-900">
                      {nominalLoad} {instrument.verificationUnits}
                    </td>

                    <td className="py-2 px-3 font-mono">
                      <input
                        type="number"
                        step="any"
                        value={run.indication}
                        onChange={(e) => updateRun(idx, 'indication', parseFloat(e.target.value) || 0)}
                        disabled={readOnly}
                        className="gov-input text-xs py-1 px-2 font-mono text-gov-sand-900"
                      />
                    </td>

                    <td className="py-2 px-3 font-mono">
                      <input
                        type="number"
                        step="any"
                        value={run.deltaL ?? 0}
                        onChange={(e) => updateRun(idx, 'deltaL', parseFloat(e.target.value) || 0)}
                        disabled={readOnly}
                        placeholder="0"
                        className="gov-input text-xs py-1 px-2 font-mono text-gov-sand-700"
                      />
                    </td>

                    <td className="py-2 px-3 font-mono font-bold bg-[#fcfbf9]">
                      {runOutput ? (
                        <span>{runOutput.calculatedP} {instrument.verificationUnits}</span>
                      ) : (
                        <span className="text-gov-sand-400 italic">--</span>
                      )}
                    </td>

                    <td className="py-2 px-3 font-mono text-gov-sand-700 bg-[#fcfbf9]">
                      {runOutput ? (
                        <span>{runOutput.errorE > 0 ? `+${runOutput.errorE}` : runOutput.errorE} {instrument.verificationUnits}</span>
                      ) : (
                        <span className="text-gov-sand-400 italic">--</span>
                      )}
                    </td>

                    {!readOnly && (
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeRun(idx)}
                          disabled={runs.length <= 3}
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

        <div className="bg-[#f6f4ed] px-6 py-3 border-t border-[#ded7c4] flex items-center justify-between">
          <span className="text-xs text-gov-sand-600 font-mono">
            Criterion: Δ = P_max - P_min ≤ |MPE| of load {nominalLoad} {instrument.verificationUnits}
          </span>
          <button
            type="button"
            onClick={handleCalculatePreview}
            disabled={calculating || runs.length < 2}
            className="btn-gov-secondary text-xs"
          >
            {calculating ? 'Evaluating...' : 'Recalculate Repeatability'}
          </button>
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
                    Repeatability Compliance Result:
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
              <span className="text-[10px] text-gov-sand-500 uppercase font-mono block">Spread (Δ = Max - Min)</span>
              <span className="font-mono font-bold text-sm text-gov-sand-900">
                {calcOutput?.observedRange ?? 0} {instrument.verificationUnits}
              </span>
            </div>
            <div className="bg-white p-3 rounded border border-black/10">
              <span className="text-[10px] text-gov-sand-500 uppercase font-mono block">Permissible Limit (|MPE|)</span>
              <span className="font-mono font-bold text-sm text-gov-sand-900">
                ±{calcOutput?.mpeResult?.mpeValue ?? 0} {instrument.verificationUnits}
              </span>
            </div>
            <div className="bg-white p-3 rounded border border-black/10">
              <span className="text-[10px] text-gov-sand-500 uppercase font-mono block">Std Deviation (s)</span>
              <span className="font-mono font-bold text-sm text-gov-sand-800">
                {calcOutput?.stdDeviation ?? 0} {instrument.verificationUnits}
              </span>
            </div>
            <div className="bg-white p-3 rounded border border-black/10">
              <span className="text-[10px] text-gov-sand-500 uppercase font-mono block">Compliance Margin</span>
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
          Testing Officer Repeatability Remarks
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={readOnly}
          placeholder="Record notes regarding mechanical hysteresis, pan return, or observed friction during repeated loading..."
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
                disabled={saving || runs.length < 2}
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
                    <span>Finalize Repeatability Module</span>
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
