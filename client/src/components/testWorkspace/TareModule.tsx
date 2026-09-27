import React, { useState } from 'react';
import { 
  Package, 
  HelpCircle, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Clock, 
  ArrowRight 
} from 'lucide-react';
import { 
  Instrument, 
  TestRecord, 
  TareObservation, 
  EnvironmentalConditions, 
  VerificationType,
  TestComplianceResult 
} from '../../types';
import { api } from '../../api';
import { EnvironmentalPanel } from './EnvironmentalPanel';
import { EvidenceAttachmentPanel } from './EvidenceAttachmentPanel';
import { ShowMeWhyModal } from './ShowMeWhyModal';

interface TareModuleProps {
  evaluationId: string;
  instrument: Instrument;
  existingRecord?: TestRecord;
  onRecordSaved: (record: TestRecord) => void;
  readOnly?: boolean;
}

export const TareModule: React.FC<TareModuleProps> = ({
  evaluationId,
  instrument,
  existingRecord,
  onRecordSaved,
  readOnly = false,
}) => {
  const defaultTareLoad = Math.round(instrument.maxCapacity * 0.2 * 100) / 100;
  const defaultNetLoad = Math.round(instrument.maxCapacity * 0.5 * 100) / 100;

  const [tareObservation, setTareObservation] = useState<TareObservation>(
    existingRecord?.observations?.[0] || {
      tareLoad: defaultTareLoad,
      tareIndication: defaultTareLoad,
      tareDeltaL: 0,
      netLoad: defaultNetLoad,
      netIndication: defaultNetLoad,
      netDeltaL: 0,
    }
  );

  const [environmentalData, setEnvironmentalData] = useState<EnvironmentalConditions>(
    existingRecord?.environmentalData || {
      temperatureCelsius: 22.0,
      relativeHumidity: 50,
      atmosphericPressureHpa: 1013,
      isInstrumentLevel: true,
      standardWeightsCertificate: 'NPL/MET/2026/F1-CLASS/9941',
      notes: 'Tare container verified before applying net calibration weights.',
    }
  );

  const [verificationType, setVerificationType] = useState<VerificationType>(
    (existingRecord?.testInputs?.verificationType as VerificationType) || 'INITIAL'
  );

  const [notes, setNotes] = useState<string>(existingRecord?.notes || '');
  const [complianceResult, setComplianceResult] = useState<TestComplianceResult | null>(
    existingRecord?.complianceDetails || null
  );

  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showMeWhyOpen, setShowMeWhyOpen] = useState(false);

  const updateTareField = (field: keyof TareObservation, value: any) => {
    setTareObservation({
      ...tareObservation,
      [field]: value,
    });
  };

  const handleCalculatePreview = async () => {
    setCalculating(true);
    setErrorMsg(null);
    try {
      const res = await api.calculateTest(evaluationId, 'TARE', {
        tareObservation,
        environmentalData,
        verificationType,
      });
      setComplianceResult(res.result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to calculate tare compliance');
    } finally {
      setCalculating(false);
    }
  };

  const handleSave = async (statusOverride?: 'DRAFT' | 'PASS' | 'FAIL' | 'REVIEW') => {
    setSaving(true);
    setErrorMsg(null);
    setSaveSuccessMsg(null);

    try {
      const res = await api.saveTestRecord(evaluationId, 'TARE', {
        tareObservation,
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
      setSaveSuccessMsg('Tare setting & net weighing entries saved.');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save test record');
    } finally {
      setSaving(false);
    }
  };

  const calcOutput = complianceResult?.calculationOutput;
  const tareLimit = Math.round(0.25 * instrument.scaleIntervalE * 1000000) / 1000000;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-[#fcfbf9] p-5 rounded-lg border border-[#ded7c4] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#006c51]" />
            <h3 className="text-base font-bold font-serif text-[#006c51]">
              Tare Setting & Net Weighing Accuracy Test
            </h3>
            <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-semibold">
              OIML R-76 A.4.6 & 3.6
            </span>
          </div>
          <p className="text-xs text-gov-sand-700 mt-1 max-w-2xl leading-relaxed">
            Verify the accuracy of tare balancing device (permissible setting error |Et| ≤ ±0.25 e = ±{tareLimit} {instrument.verificationUnits}) 
            and evaluate net weighing indication compliance across net test loads up to capacity.
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-mono text-gov-sand-500 block">Tare Threshold Limit</span>
          <span className="font-mono font-bold text-xs text-[#006c51] bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
            ±0.25 e (±{tareLimit} {instrument.verificationUnits})
          </span>
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

      {/* Two-Section Test Form: 1. Tare Setting, 2. Net Weighing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Phase 1: Tare Balancing / Setting */}
        <div className="gov-card p-5 space-y-4">
          <div className="pb-2 border-b border-[#ded7c4] flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gov-sand-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#006c51] text-white flex items-center justify-center font-mono text-[10px]">
                1
              </span>
              Tare Balancing / Setting Accuracy
            </h4>
            <span className="text-[10px] font-mono text-gov-sand-500">Clause 3.6.1</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="gov-label text-[11px]">Applied Tare Preload (Lt) *</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={tareObservation.tareLoad}
                  onChange={(e) => updateTareField('tareLoad', parseFloat(e.target.value) || 0)}
                  disabled={readOnly}
                  className="gov-input text-xs font-mono font-bold"
                />
                <span className="absolute right-2.5 top-2 text-[10px] text-gov-sand-500">
                  {instrument.verificationUnits}
                </span>
              </div>
            </div>

            <div>
              <label className="gov-label text-[11px]">Tare Indication (It) *</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={tareObservation.tareIndication}
                  onChange={(e) => updateTareField('tareIndication', parseFloat(e.target.value) || 0)}
                  disabled={readOnly}
                  className="gov-input text-xs font-mono"
                />
                <span className="absolute right-2.5 top-2 text-[10px] text-gov-sand-500">
                  {instrument.verificationUnits}
                </span>
              </div>
            </div>

            <div>
              <label className="gov-label text-[11px]">Tare Turning Point Small Weights (ΔLt)</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={tareObservation.tareDeltaL ?? 0}
                  onChange={(e) => updateTareField('tareDeltaL', parseFloat(e.target.value) || 0)}
                  disabled={readOnly}
                  className="gov-input text-xs font-mono text-gov-sand-700"
                  placeholder="0"
                />
                <span className="absolute right-2.5 top-2 text-[10px] text-gov-sand-500">
                  {instrument.verificationUnits}
                </span>
              </div>
            </div>

            {calcOutput && (
              <div className="p-3 bg-[#fcfbf9] rounded border border-[#ded7c4] space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-gov-sand-600">Calculated Tare Error (Et):</span>
                  <span className="font-bold text-gov-sand-900">
                    {calcOutput.tareError} {instrument.verificationUnits}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gov-sand-600">Max Permissible Limit (0.25e):</span>
                  <span>±{calcOutput.tareMaxPermissibleLimit} {instrument.verificationUnits}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#ece7d8]">
                  <span className="text-gov-sand-700 font-bold">Tare Setting Result:</span>
                  <span className={`font-bold ${calcOutput.tareSettingPass ? 'text-emerald-700' : 'text-red-700'}`}>
                    {calcOutput.tareSettingPass ? 'PASS (≤ 0.25 e)' : 'FAIL (> 0.25 e)'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Phase 2: Net Load Weighing Test */}
        <div className="gov-card p-5 space-y-4">
          <div className="pb-2 border-b border-[#ded7c4] flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gov-sand-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#006c51] text-white flex items-center justify-center font-mono text-[10px]">
                2
              </span>
              Net Load Indication Accuracy
            </h4>
            <span className="text-[10px] font-mono text-gov-sand-500">Clause 3.6.2</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="gov-label text-[11px]">Applied Net Test Load (Lnet) *</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={tareObservation.netLoad}
                  onChange={(e) => updateTareField('netLoad', parseFloat(e.target.value) || 0)}
                  disabled={readOnly}
                  className="gov-input text-xs font-mono font-bold"
                />
                <span className="absolute right-2.5 top-2 text-[10px] text-gov-sand-500">
                  {instrument.verificationUnits}
                </span>
              </div>
            </div>

            <div>
              <label className="gov-label text-[11px]">Net Observed Indication (Inet) *</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={tareObservation.netIndication}
                  onChange={(e) => updateTareField('netIndication', parseFloat(e.target.value) || 0)}
                  disabled={readOnly}
                  className="gov-input text-xs font-mono"
                />
                <span className="absolute right-2.5 top-2 text-[10px] text-gov-sand-500">
                  {instrument.verificationUnits}
                </span>
              </div>
            </div>

            <div>
              <label className="gov-label text-[11px]">Net Turning Point Small Weights (ΔLnet)</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={tareObservation.netDeltaL ?? 0}
                  onChange={(e) => updateTareField('netDeltaL', parseFloat(e.target.value) || 0)}
                  disabled={readOnly}
                  className="gov-input text-xs font-mono text-gov-sand-700"
                  placeholder="0"
                />
                <span className="absolute right-2.5 top-2 text-[10px] text-gov-sand-500">
                  {instrument.verificationUnits}
                </span>
              </div>
            </div>

            {calcOutput && (
              <div className="p-3 bg-[#fcfbf9] rounded border border-[#ded7c4] space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-gov-sand-600">Net Corrected Error (Ec_net):</span>
                  <span className="font-bold text-gov-sand-900">
                    {calcOutput.netCorrectedErrorEc} {instrument.verificationUnits}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gov-sand-600">Net MPE Permissible Limit:</span>
                  <span>±{calcOutput.netMpeResult.mpeValue} ({calcOutput.netMpeResult.mpeInE}e)</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#ece7d8]">
                  <span className="text-gov-sand-700 font-bold">Net Weighing Result:</span>
                  <span className={`font-bold ${calcOutput.netWeighingPass ? 'text-emerald-700' : 'text-red-700'}`}>
                    {calcOutput.netWeighingPass ? 'PASS (≤ Net MPE)' : 'FAIL (> Net MPE)'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recalculate Bar */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleCalculatePreview}
          disabled={calculating}
          className="btn-gov-secondary text-xs"
        >
          {calculating ? 'Evaluating Tare...' : 'Recalculate Tare & Net Compliance'}
        </button>
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
                    Tare & Net Load Compliance Verdict:
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
              <span className="text-[10px] text-gov-sand-500 uppercase font-mono block">Tare Error |Et|</span>
              <span className="font-mono font-bold text-sm text-gov-sand-900">
                {Math.abs(calcOutput?.tareError ?? 0)} {instrument.verificationUnits}
              </span>
            </div>
            <div className="bg-white p-3 rounded border border-black/10">
              <span className="text-[10px] text-gov-sand-500 uppercase font-mono block">Tare Limit (0.25e)</span>
              <span className="font-mono font-bold text-sm text-gov-sand-900">
                ±{calcOutput?.tareMaxPermissibleLimit ?? 0} {instrument.verificationUnits}
              </span>
            </div>
            <div className="bg-white p-3 rounded border border-black/10">
              <span className="text-[10px] text-gov-sand-500 uppercase font-mono block">Net Corrected Error</span>
              <span className="font-mono font-bold text-sm text-gov-sand-900">
                {calcOutput?.netCorrectedErrorEc ?? 0} {instrument.verificationUnits}
              </span>
            </div>
            <div className="bg-white p-3 rounded border border-black/10">
              <span className="text-[10px] text-gov-sand-500 uppercase font-mono block">Net Weighing MPE</span>
              <span className="font-mono font-bold text-sm text-gov-sand-900">
                ±{calcOutput?.netMpeResult?.mpeValue ?? 0} {instrument.verificationUnits}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Free-text Test Notes */}
      <div className="gov-card p-4 space-y-2">
        <label className="gov-label text-xs font-bold uppercase tracking-wider text-gov-sand-800">
          Testing Officer Tare Observations & Container Notes
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={readOnly}
          placeholder="Record notes on tare mechanism type (subtractive/additive tare), container stability, tare cancel operation..."
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

      {/* Action Bar */}
      {!readOnly && (
        <div className="bg-[#fcfbf9] p-4 rounded-lg border border-[#ded7c4] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gov-sand-600">
            <Clock className="w-4 h-4 text-[#006c51]" />
            <span>Save and resume anytime without losing partial entries.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave('DRAFT')}
              disabled={saving}
              className="btn-gov-secondary text-xs flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save Partial Draft
            </button>
            <button
              type="button"
              onClick={() => handleSave(complianceResult?.verdict || 'PASS')}
              disabled={saving}
              className="btn-gov-primary text-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Finalize Tare Module
            </button>
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
