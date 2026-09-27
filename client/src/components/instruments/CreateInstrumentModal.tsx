import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { api } from '../../api';
import { Instrument, AccuracyClass } from '../../types';
import { Scale, Upload, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

interface CreateInstrumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (instrument: Instrument) => void;
}

export const CreateInstrumentModal: React.FC<CreateInstrumentModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [instrumentType, setInstrumentType] = useState('Precision Laboratory Electronic Balance');
  const [accuracyClass, setAccuracyClass] = useState<AccuracyClass>('Class II');
  const [maxCapacity, setMaxCapacity] = useState<string>('3000');
  const [minCapacity, setMinCapacity] = useState<string>('0.5');
  const [scaleIntervalE, setScaleIntervalE] = useState<string>('0.01');
  const [scaleIntervalD, setScaleIntervalD] = useState<string>('0.001');
  const [verificationUnits, setVerificationUnits] = useState('g');
  const [capacityRangeType, setCapacityRangeType] = useState('Single-Interval');
  const [tareRange, setTareRange] = useState('-100% Max');
  const [temperatureRange, setTemperatureRange] = useState('+10°C to +40°C');
  const [powerSupply, setPowerSupply] = useState('230V AC, 50Hz / Battery backup');
  const [technicalSpecs, setTechnicalSpecs] = useState('');

  // Document upload state
  const [docTitle, setDocTitle] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUrl, setDocUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute number of scale intervals n = Max / e
  const maxNum = parseFloat(maxCapacity) || 0;
  const eNum = parseFloat(scaleIntervalE) || 1;
  const nIntervals = eNum > 0 ? Math.round(maxNum / eNum) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const maxVal = parseFloat(maxCapacity);
    const minVal = parseFloat(minCapacity);
    const eVal = parseFloat(scaleIntervalE);

    if (isNaN(maxVal) || isNaN(minVal) || isNaN(eVal)) {
      setError('Max, Min, and e must be valid numbers.');
      return;
    }

    if (maxVal <= minVal) {
      setError('OIML R-76 rule: Max capacity must be strictly greater than Min capacity.');
      return;
    }

    if (eVal <= 0) {
      setError('Verification scale interval (e) must be positive.');
      return;
    }

    setLoading(true);

    try {
      const { instrument } = await api.createInstrument({
        manufacturer,
        model,
        serialNumber,
        instrumentType,
        accuracyClass,
        maxCapacity: maxVal,
        minCapacity: minVal,
        scaleIntervalE: eVal,
        scaleIntervalD: scaleIntervalD ? parseFloat(scaleIntervalD) : undefined,
        verificationUnits,
        capacityRangeType,
        tareRange,
        temperatureRange,
        powerSupply,
        technicalSpecs,
      });

      // Upload document if selected
      if (docFile || docUrl) {
        try {
          await api.uploadInstrumentDocument(
            instrument.id,
            docFile || undefined,
            docTitle || 'Technical Specification Sheet',
            docUrl || undefined
          );
        } catch (docErr) {
          console.warn('Document upload warning:', docErr);
        }
      }

      onCreated(instrument);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register instrument');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register Non-Automatic Weighing Instrument (NAWI)"
      subtitle="Enroll instrument profile and generate permanent OIML R-76 Digital Passport"
      maxWidth="max-w-3xl"
    >
      {error && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-600 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section 1: Manufacturer & General Identity */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#006c51] mb-2.5 pb-1 border-b border-[#e5dfd1]">
            1. Manufacturer & Identification Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="gov-label">Manufacturer Name *</label>
              <input
                type="text"
                required
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Eagle Metrology Systems"
                className="gov-input"
              />
            </div>
            <div>
              <label className="gov-label">Model Designation *</label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. EMS-Pro 3000"
                className="gov-input"
              />
            </div>
            <div>
              <label className="gov-label">Unique Serial Number *</label>
              <input
                type="text"
                required
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. EMS-2026-SN-4912"
                className="gov-input font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="gov-label">Instrument Type *</label>
              <select
                value={instrumentType}
                onChange={(e) => setInstrumentType(e.target.value)}
                className="gov-select"
              >
                <option value="Precision Laboratory Electronic Balance">Precision Laboratory Electronic Balance</option>
                <option value="Retail Price-Computing Counter Scale">Retail Price-Computing Counter Scale</option>
                <option value="Industrial Platform Scale">Industrial Platform Scale</option>
                <option value="Electronic Road Vehicle Weighbridge">Electronic Road Vehicle Weighbridge</option>
                <option value="Crane Scale / Suspended Weigher">Crane Scale / Suspended Weigher</option>
                <option value="Hopper / Silo Weighing Instrument">Hopper / Silo Weighing Instrument</option>
              </select>
            </div>
            <div>
              <label className="gov-label">Capacity Range System</label>
              <select
                value={capacityRangeType}
                onChange={(e) => setCapacityRangeType(e.target.value)}
                className="gov-select"
              >
                <option value="Single-Interval">Single-Interval Instrument</option>
                <option value="Dual-Interval">Dual-Interval (Multi-Interval)</option>
                <option value="Multi-Interval">Multi-Interval (e1, e2, e3)</option>
                <option value="Multiple Range">Multiple Range Instrument</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: OIML R-76 Metrological Parameters */}
        <div>
          <div className="flex items-center justify-between mb-2.5 pb-1 border-b border-[#e5dfd1]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#006c51]">
              2. OIML R-76 Metrological Parameters
            </h4>
            <span className="text-[11px] font-semibold text-gov-sand-700 bg-gov-sand-100 px-2 py-0.5 rounded border border-gov-sand-300">
              Calculated n = {nIntervals.toLocaleString()} intervals
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="gov-label">Accuracy Class *</label>
              <select
                value={accuracyClass}
                onChange={(e) => setAccuracyClass(e.target.value as AccuracyClass)}
                className="gov-select font-semibold"
              >
                <option value="Class I">Class I (Special)</option>
                <option value="Class II">Class II (High)</option>
                <option value="Class III">Class III (Medium)</option>
                <option value="Class IV">Class IV (Ordinary)</option>
              </select>
            </div>

            <div>
              <label className="gov-label">Verification Unit</label>
              <select
                value={verificationUnits}
                onChange={(e) => setVerificationUnits(e.target.value)}
                className="gov-select font-mono"
              >
                <option value="g">Grams (g)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="mg">Milligrams (mg)</option>
                <option value="t">Tonnes (t)</option>
              </select>
            </div>

            <div>
              <label className="gov-label">Max Capacity *</label>
              <input
                type="number"
                step="any"
                required
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(e.target.value)}
                placeholder="e.g. 3200"
                className="gov-input font-mono font-semibold"
              />
            </div>

            <div>
              <label className="gov-label">Min Capacity *</label>
              <input
                type="number"
                step="any"
                required
                value={minCapacity}
                onChange={(e) => setMinCapacity(e.target.value)}
                placeholder="e.g. 0.5"
                className="gov-input font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <div>
              <label className="gov-label">Scale Interval (e) *</label>
              <input
                type="number"
                step="any"
                required
                value={scaleIntervalE}
                onChange={(e) => setScaleIntervalE(e.target.value)}
                placeholder="e.g. 0.01"
                className="gov-input font-mono font-semibold text-[#006c51]"
              />
            </div>

            <div>
              <label className="gov-label">Actual Interval (d)</label>
              <input
                type="number"
                step="any"
                value={scaleIntervalD}
                onChange={(e) => setScaleIntervalD(e.target.value)}
                placeholder="e.g. 0.001"
                className="gov-input font-mono"
              />
            </div>

            <div>
              <label className="gov-label">Tare Range (T)</label>
              <input
                type="text"
                value={tareRange}
                onChange={(e) => setTareRange(e.target.value)}
                placeholder="-100% Max"
                className="gov-input"
              />
            </div>

            <div>
              <label className="gov-label">Temp Limits</label>
              <input
                type="text"
                value={temperatureRange}
                onChange={(e) => setTemperatureRange(e.target.value)}
                placeholder="+10°C to +40°C"
                className="gov-input"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Technical Specifications & Power */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#006c51] mb-2 pb-1 border-b border-[#e5dfd1]">
            3. Technical Specs & Operating Characteristics
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="gov-label">Power Supply Characteristics</label>
              <input
                type="text"
                value={powerSupply}
                onChange={(e) => setPowerSupply(e.target.value)}
                placeholder="230V AC, 50Hz / Battery backup"
                className="gov-input"
              />
            </div>
            <div>
              <label className="gov-label">Sensor & Metrological Hardware Summary</label>
              <input
                type="text"
                value={technicalSpecs}
                onChange={(e) => setTechnicalSpecs(e.target.value)}
                placeholder="e.g. EMFR load sensor, IP65 housing, backlit display"
                className="gov-input"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Supporting Document Attachment */}
        <div className="bg-[#fcfbf9] p-3 rounded border border-gov-sand-300">
          <div className="flex items-center gap-2 mb-2">
            <Upload className="w-4 h-4 text-[#006c51]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-gov-sand-900">
              4. Supporting Metrology Document (Optional)
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="gov-label">Document Title</label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g. Type Approval Dossier"
                className="gov-input"
              />
            </div>
            <div>
              <label className="gov-label">Upload File (PDF / Spec)</label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                className="text-xs text-gov-sand-700 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gov-green-100 file:text-gov-green-800 hover:file:bg-gov-green-200"
              />
            </div>
            <div>
              <label className="gov-label">Or External URL / OIML Doc</label>
              <input
                type="url"
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                placeholder="https://oiml.org/..."
                className="gov-input text-xs"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#e5dfd1]">
          <button
            type="button"
            onClick={onClose}
            className="btn-gov-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-gov-primary"
          >
            {loading ? 'Registering & Generating Passport...' : 'Register Instrument & Issue Passport'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
