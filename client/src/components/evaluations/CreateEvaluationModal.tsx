import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { api } from '../../api';
import { Instrument, Laboratory, User, Evaluation } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, FileCheck2, Scale, Building2 } from 'lucide-react';

interface CreateEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (evaluation: Evaluation) => void;
  preselectedInstrumentId?: string;
}

export const CreateEvaluationModal: React.FC<CreateEvaluationModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  preselectedInstrumentId,
}) => {
  const { user } = useAuth();

  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);

  const [selectedInstrumentId, setSelectedInstrumentId] = useState(preselectedInstrumentId || '');
  const [selectedLabId, setSelectedLabId] = useState('');
  const [evaluationDate, setEvaluationDate] = useState(new Date().toISOString().split('T')[0]);
  const [testingOfficerId, setTestingOfficerId] = useState(user?.id || '');
  const [reviewingOfficerId, setReviewingOfficerId] = useState('');
  const [standardReference, setStandardReference] = useState('OIML R 76-1:2006 (NAWI Standard)');
  const [generalRemarks, setGeneralRemarks] = useState('');
  const [initialState, setInitialState] = useState<'Draft' | 'In Progress'>('In Progress');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
      if (preselectedInstrumentId) {
        setSelectedInstrumentId(preselectedInstrumentId);
      }
    }
  }, [isOpen, preselectedInstrumentId]);

  const loadDependencies = async () => {
    try {
      const [instRes, labRes, offRes] = await Promise.all([
        api.getInstruments(),
        api.getLaboratories(),
        api.getOfficers(),
      ]);

      setInstruments(instRes.instruments);
      setLaboratories(labRes.laboratories);
      setOfficers(offRes.officers);

      if (labRes.laboratories.length > 0 && !selectedLabId) {
        setSelectedLabId(labRes.laboratories[0].id);
      }
      if (instRes.instruments.length > 0 && !selectedInstrumentId && !preselectedInstrumentId) {
        setSelectedInstrumentId(instRes.instruments[0].id);
      }
      const revOfficers = offRes.officers.filter(o => o.role === 'REVIEWING_OFFICER');
      if (revOfficers.length > 0 && !reviewingOfficerId) {
        setReviewingOfficerId(revOfficers[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load laboratory and officer records');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstrumentId || !selectedLabId) {
      setError('Please select both an instrument and an accredited laboratory.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { evaluation } = await api.createEvaluation({
        instrumentId: selectedInstrumentId,
        laboratoryId: selectedLabId,
        evaluationDate,
        testingOfficerId: testingOfficerId || user?.id,
        reviewingOfficerId: reviewingOfficerId || undefined,
        standardReference,
        generalRemarks,
        initialState,
      });

      onCreated(evaluation);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to initialize evaluation session');
    } finally {
      setLoading(false);
    }
  };

  const selectedInstObj = instruments.find(i => i.id === selectedInstrumentId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Initiate OIML R-76 Evaluation Session"
      subtitle="Issue unique Evaluation ID and link test protocols to instrument Digital Passport"
      maxWidth="max-w-2xl"
    >
      {error && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-600 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Instrument Picker */}
        <div>
          <label className="gov-label flex items-center justify-between">
            <span>Target Weighing Instrument *</span>
            {selectedInstObj && (
              <span className="text-[10px] text-gov-sand-600 font-mono">
                {selectedInstObj.passportId}
              </span>
            )}
          </label>
          <select
            value={selectedInstrumentId}
            onChange={(e) => setSelectedInstrumentId(e.target.value)}
            required
            className="gov-select font-medium"
          >
            <option value="">-- Select Instrument from National Registry --</option>
            {instruments.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.manufacturer} {inst.model} (SN: {inst.serialNumber}) — {inst.accuracyClass} Max: {inst.maxCapacity}{inst.verificationUnits}
              </option>
            ))}
          </select>
        </div>

        {/* Selected Instrument Metrological Summary preview */}
        {selectedInstObj && (
          <div className="p-3 bg-gov-sand-100 rounded border border-[#ded7c4] text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <span className="text-gov-sand-500 block text-[10px] uppercase font-bold">Class</span>
              <span className="font-semibold text-gov-sand-900">{selectedInstObj.accuracyClass}</span>
            </div>
            <div>
              <span className="text-gov-sand-500 block text-[10px] uppercase font-bold">Max Capacity</span>
              <span className="font-semibold text-gov-sand-900">{selectedInstObj.maxCapacity} {selectedInstObj.verificationUnits}</span>
            </div>
            <div>
              <span className="text-gov-sand-500 block text-[10px] uppercase font-bold">Verification e</span>
              <span className="font-semibold text-gov-sand-900">{selectedInstObj.scaleIntervalE} {selectedInstObj.verificationUnits}</span>
            </div>
            <div>
              <span className="text-gov-sand-500 block text-[10px] uppercase font-bold">Type</span>
              <span className="font-semibold text-gov-sand-900 truncate block">{selectedInstObj.instrumentType}</span>
            </div>
          </div>
        )}

        {/* Laboratory Selection */}
        <div>
          <label className="gov-label">Accredited Testing Laboratory *</label>
          <select
            value={selectedLabId}
            onChange={(e) => setSelectedLabId(e.target.value)}
            required
            className="gov-select font-medium"
          >
            <option value="">-- Select Accredited Legal Metrology Testing Lab --</option>
            {laboratories.map((lab) => (
              <option key={lab.id} value={lab.id}>
                [{lab.code}] {lab.name} ({lab.accreditationNumber})
              </option>
            ))}
          </select>
        </div>

        {/* Date and Initial State */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="gov-label">Evaluation Date *</label>
            <input
              type="date"
              required
              value={evaluationDate}
              onChange={(e) => setEvaluationDate(e.target.value)}
              className="gov-input"
            />
          </div>
          <div>
            <label className="gov-label">Initial Evaluation State *</label>
            <select
              value={initialState}
              onChange={(e) => setInitialState(e.target.value as any)}
              className="gov-select font-semibold"
            >
              <option value="In Progress">In Progress (Active Testing Bench)</option>
              <option value="Draft">Draft (Preliminary Setup)</option>
            </select>
          </div>
        </div>

        {/* Officers Assignment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="gov-label">Assigned Testing Officer</label>
            <select
              value={testingOfficerId}
              onChange={(e) => setTestingOfficerId(e.target.value)}
              className="gov-select"
            >
              {officers.map((off) => (
                <option key={off.id} value={off.id}>
                  {off.name} ({off.role.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="gov-label">Nominated Reviewing Officer</label>
            <select
              value={reviewingOfficerId}
              onChange={(e) => setReviewingOfficerId(e.target.value)}
              className="gov-select"
            >
              <option value="">-- Select Reviewing Authority --</option>
              {officers
                .filter((o) => o.role === 'REVIEWING_OFFICER' || o.role === 'ADMIN')
                .map((off) => (
                  <option key={off.id} value={off.id}>
                    {off.name} ({off.designation || off.role})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Standard and Remarks */}
        <div>
          <label className="gov-label">Standard & Regulatory Reference</label>
          <input
            type="text"
            value={standardReference}
            onChange={(e) => setStandardReference(e.target.value)}
            className="gov-input"
          />
        </div>

        <div>
          <label className="gov-label">Initial Testing Scope & Remarks</label>
          <textarea
            rows={2}
            value={generalRemarks}
            onChange={(e) => setGeneralRemarks(e.target.value)}
            placeholder="e.g. Routine OIML R-76 pattern approval tests: weighing performance, repeatability at Max/2 and Max, tare effect."
            className="gov-input text-xs"
          />
        </div>

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
            {loading ? 'Initializing Session...' : 'Generate ID & Start Evaluation'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
