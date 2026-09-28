import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { Instrument, InstrumentDocument } from '../types';
import { 
  AccuracyClassBadge, 
  InstrumentStatusBadge, 
  EvaluationStatusBadge 
} from '../components/ui/StatusBadge';
import { 
  Scale, 
  BookMarked, 
  Upload, 
  FileText, 
  PlusCircle, 
  ArrowLeft, 
  ExternalLink,
  CheckCircle,
  Clock,
  Layers,
  FileCheck2
} from 'lucide-react';
import { CreateEvaluationModal } from '../components/evaluations/CreateEvaluationModal';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';

export const InstrumentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isTestingOfficer, isAdmin } = useAuth();

  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Document upload state
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUrl, setDocUrl] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Evaluation modal
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);

  useEffect(() => {
    if (id) loadInstrument(id);
  }, [id]);

  const loadInstrument = async (instId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getInstrument(instId);
      setInstrument(res.instrument);
    } catch (err: any) {
      setError(err.message || 'Failed to load instrument record');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instrument) return;
    if (!docFile && !docUrl) {
      setUploadError('Please select a file or provide a URL.');
      return;
    }

    setUploadLoading(true);
    setUploadError(null);

    try {
      await api.uploadInstrumentDocument(
        instrument.id,
        docFile || undefined,
        docTitle || 'Technical Specification Document',
        docUrl || undefined
      );
      setIsDocModalOpen(false);
      setDocFile(null);
      setDocTitle('');
      setDocUrl('');
      loadInstrument(instrument.id);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document');
    } finally {
      setUploadLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-4 border-[#006c51] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs text-gov-sand-700">Loading Instrument Record...</p>
      </div>
    );
  }

  if (error || !instrument) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="p-6 bg-red-50 border-l-4 border-red-600 rounded text-red-800">
          <h3 className="text-sm font-bold">Instrument Not Found</h3>
          <p className="text-xs mt-1">{error || 'Unable to locate instrument.'}</p>
          <Link to="/instruments" className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-[#006c51] underline">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Registry
          </Link>
        </div>
      </div>
    );
  }

  const nVal = instrument.scaleIntervalE > 0 ? Math.round(instrument.maxCapacity / instrument.scaleIntervalE) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Link to="/instruments" className="btn-gov-secondary text-xs">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Instruments Registry
          </Link>
          <span className="text-xs text-gov-sand-400">/</span>
          <span className="text-xs font-mono font-bold text-gov-sand-800">{instrument.model}</span>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to={`/passport/${instrument.id}`}
            className="btn-gov-primary text-xs"
          >
            <BookMarked className="w-3.5 h-3.5 mr-1.5" /> Open Digital Passport
          </Link>
          {(isTestingOfficer || isAdmin) && (
            <button
              onClick={() => setIsEvaluationModalOpen(true)}
              className="btn-gov-outline text-xs"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Start Evaluation
            </button>
          )}
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="gov-card">
        <div className="gov-card-header">
          <div className="flex items-center space-x-3">
            <Scale className="w-5 h-5 text-[#006c51]" />
            <div>
              <h2 className="text-base font-bold font-serif text-[#006c51]">
                {instrument.model}
              </h2>
              <p className="text-xs text-gov-sand-600">
                Manufactured by <span className="font-semibold text-gov-sand-900">{instrument.manufacturer}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <InstrumentStatusBadge status={instrument.status} />
            <span className="text-xs font-mono font-bold text-gov-sand-800 bg-gov-sand-200 px-2 py-0.5 rounded border border-gov-sand-300">
              {instrument.passportId}
            </span>
          </div>
        </div>

        {/* Specifications grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Identity & Type */}
          <div className="space-y-3 bg-[#faf8f2] p-4 rounded border border-[#ded7c4] text-xs">
            <h3 className="font-bold text-gov-sand-800 uppercase tracking-wider text-[11px] pb-1 border-b border-[#ece7d8]">
              Instrument Identification
            </h3>
            <div className="flex justify-between py-1">
              <span className="text-gov-sand-600">Accuracy Class:</span>
              <AccuracyClassBadge accuracyClass={instrument.accuracyClass} />
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gov-sand-600">Serial Number:</span>
              <span className="font-bold font-mono text-[#006c51]">{instrument.serialNumber}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gov-sand-600">Instrument Category:</span>
              <span className="font-medium text-gov-sand-900">{instrument.instrumentType}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gov-sand-600">Capacity System:</span>
              <span className="font-medium text-gov-sand-900">{instrument.capacityRangeType}</span>
            </div>
          </div>

          {/* OIML Metrological Parameters */}
          <div className="space-y-3 bg-[#faf8f2] p-4 rounded border border-[#ded7c4] text-xs">
            <h3 className="font-bold text-gov-sand-800 uppercase tracking-wider text-[11px] pb-1 border-b border-[#ece7d8]">
              OIML R-76 Metrological Parameters
            </h3>
            <div className="flex justify-between py-1">
              <span className="text-gov-sand-600">Max Capacity (Max):</span>
              <span className="font-bold font-mono text-gov-sand-900">
                {instrument.maxCapacity} {instrument.verificationUnits}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gov-sand-600">Min Capacity (Min):</span>
              <span className="font-bold font-mono text-gov-sand-900">
                {instrument.minCapacity} {instrument.verificationUnits}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gov-sand-600">Verification Scale Interval (e):</span>
              <span className="font-bold font-mono text-[#006c51]">
                {instrument.scaleIntervalE} {instrument.verificationUnits}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gov-sand-600">Actual Scale Interval (d):</span>
              <span className="font-bold font-mono text-gov-sand-900">
                {instrument.scaleIntervalD ? `${instrument.scaleIntervalD} ${instrument.verificationUnits}` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gov-sand-600">Calculated Resolution (n):</span>
              <span className="font-bold font-mono text-amber-900">
                n = {nVal.toLocaleString()} e
              </span>
            </div>
          </div>
        </div>

        {/* Operating & Technical Specs */}
        <div className="px-6 pb-6 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-white border border-[#e5dfd1] rounded">
            <span className="text-gov-sand-500 block uppercase text-[10px] font-bold">Tare Range</span>
            <span className="font-semibold text-gov-sand-900 mt-0.5 block">{instrument.tareRange || 'Not Specified'}</span>
          </div>
          <div className="p-3 bg-white border border-[#e5dfd1] rounded">
            <span className="text-gov-sand-500 block uppercase text-[10px] font-bold">Operating Temperature</span>
            <span className="font-semibold text-gov-sand-900 mt-0.5 block">{instrument.temperatureRange || '+10°C to +40°C'}</span>
          </div>
          <div className="p-3 bg-white border border-[#e5dfd1] rounded">
            <span className="text-gov-sand-500 block uppercase text-[10px] font-bold">Power Supply</span>
            <span className="font-semibold text-gov-sand-900 mt-0.5 block">{instrument.powerSupply || 'Mains AC'}</span>
          </div>
        </div>
      </div>

      {/* Supporting Documents Section */}
      <div className="gov-card">
        <div className="gov-card-header">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-[#006c51]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gov-sand-900">
              Supporting Metrological Documents & Schematics ({instrument.documents?.length || 0})
            </h3>
          </div>
          {(isTestingOfficer || isAdmin) && (
            <button
              onClick={() => setIsDocModalOpen(true)}
              className="btn-gov-outline text-[11px] py-1 px-2.5"
            >
              <Upload className="w-3 h-3 mr-1" /> Attach Document
            </button>
          )}
        </div>

        <div className="p-4">
          {instrument.documents && instrument.documents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {instrument.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 bg-[#faf8f2] rounded border border-[#ded7c4] flex items-start justify-between gap-2 text-xs"
                >
                  <div className="truncate">
                    <h4 className="font-bold text-gov-sand-900 truncate" title={doc.title}>
                      {doc.title}
                    </h4>
                    <p className="text-[10px] text-gov-sand-500 truncate mt-0.5">{doc.fileName}</p>
                    <span className="text-[9px] text-gov-sand-400 block mt-1">
                      {new Date(doc.uploadedAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-[#006c51] hover:bg-gov-green-100 rounded shrink-0"
                    title="Open Document"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-gov-sand-500">
              No technical documents uploaded for this instrument yet.
            </div>
          )}
        </div>
      </div>

      {/* Evaluations Tied to this Instrument */}
      <div className="gov-card">
        <div className="gov-card-header">
          <div className="flex items-center space-x-2">
            <FileCheck2 className="w-4 h-4 text-[#006c51]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gov-sand-900">
              Evaluation History for this Instrument ({instrument.evaluations?.length || 0})
            </h3>
          </div>
          {(isTestingOfficer || isAdmin) && (
            <button
              onClick={() => setIsEvaluationModalOpen(true)}
              className="btn-gov-primary text-[11px] py-1 px-2.5"
            >
              + New Evaluation
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#faf8f2] text-gov-sand-600 font-semibold border-b border-[#e5dfd1]">
              <tr>
                <th className="px-4 py-2.5">Evaluation ID</th>
                <th className="px-4 py-2.5">Laboratory</th>
                <th className="px-4 py-2.5">Testing Officer</th>
                <th className="px-4 py-2.5">State</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ece7d8]">
              {instrument.evaluations && instrument.evaluations.length > 0 ? (
                instrument.evaluations.map((ev) => (
                  <tr key={ev.id} className="hover:bg-[#faf8f2]">
                    <td className="px-4 py-3 font-mono font-bold text-[#006c51]">
                      <Link to={`/evaluations/${ev.id}`} className="hover:underline">
                        {ev.evaluationNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gov-sand-800">{ev.laboratory.name}</td>
                    <td className="px-4 py-3 text-gov-sand-800">{ev.testingOfficer.name}</td>
                    <td className="px-4 py-3">
                      <EvaluationStatusBadge state={ev.state} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/evaluations/${ev.id}`}
                        className="text-[#006c51] hover:underline font-semibold"
                      >
                        View Evaluation &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-xs text-gov-sand-500">
                    No evaluations conducted yet for this instrument.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Document Modal */}
      <Modal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        title="Upload Metrological Document"
        subtitle={`Attach official dossiers or calibration reports to ${instrument.model}`}
      >
        {uploadError && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-600 text-xs text-red-700">
            {uploadError}
          </div>
        )}

        <form onSubmit={handleDocumentUpload} className="space-y-4 text-xs">
          <div>
            <label className="gov-label">Document Title *</label>
            <input
              type="text"
              required
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="e.g. Type Approval Test Dossier / Sensor Linearity Report"
              className="gov-input text-xs"
            />
          </div>

          <div>
            <label className="gov-label">Upload File</label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={(e) => setDocFile(e.target.files?.[0] || null)}
              className="text-xs text-gov-sand-700 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gov-green-100 file:text-gov-green-800"
            />
          </div>

          <div>
            <label className="gov-label">Or External Document URL</label>
            <input
              type="url"
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
              placeholder="https://oiml.org/..."
              className="gov-input text-xs"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#e5dfd1]">
            <button
              type="button"
              onClick={() => setIsDocModalOpen(false)}
              className="btn-gov-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadLoading}
              className="btn-gov-primary text-xs"
            >
              {uploadLoading ? 'Uploading...' : 'Attach to Instrument'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Evaluation Modal */}
      <CreateEvaluationModal
        isOpen={isEvaluationModalOpen}
        onClose={() => setIsEvaluationModalOpen(false)}
        preselectedInstrumentId={instrument.id}
        onCreated={() => loadInstrument(instrument.id)}
      />
    </div>
  );
};
