import React, { useState } from 'react';
import { 
  Camera, 
  Upload, 
  Trash2, 
  ExternalLink, 
  FileText, 
  Check, 
  Plus, 
  Image as ImageIcon 
} from 'lucide-react';
import { TestAttachment } from '../../types';
import { api } from '../../api';

interface EvidenceAttachmentPanelProps {
  evaluationId: string;
  testRecordId?: string;
  attachments: TestAttachment[];
  onAttachmentAdded: (attachment: TestAttachment) => void;
  onAttachmentRemoved: (attachmentId: string) => void;
  readOnly?: boolean;
}

export const EvidenceAttachmentPanel: React.FC<EvidenceAttachmentPanelProps> = ({
  evaluationId,
  testRecordId,
  attachments = [],
  onAttachmentAdded,
  onAttachmentRemoved,
  readOnly = false,
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [title, setTitle] = useState('');
  const [fileType, setFileType] = useState<'PHOTO' | 'DOCUMENT'>('PHOTO');
  const [fileUrl, setFileUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecordId) {
      setError('Please save the test module entry first before attaching files.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', title || selectedFile.name);
        formData.append('fileType', fileType);

        const res = await api.uploadTestAttachment(evaluationId, testRecordId, formData);
        onAttachmentAdded(res.attachment);
      } else if (fileUrl) {
        const formData = new FormData();
        formData.append('title', title || 'External Evidence Photo');
        formData.append('fileType', fileType);
        formData.append('fileUrl', fileUrl);

        const res = await api.uploadTestAttachment(evaluationId, testRecordId, formData);
        onAttachmentAdded(res.attachment);
      } else {
        throw new Error('Please select an image file or provide a photographic URL.');
      }

      // Reset
      setTitle('');
      setFileUrl('');
      setSelectedFile(null);
      setShowUploadModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to upload attachment');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attId: string) => {
    if (!testRecordId || readOnly) return;
    if (!confirm('Are you sure you want to remove this evidence file?')) return;

    try {
      await api.deleteTestAttachment(evaluationId, testRecordId, attId);
      onAttachmentRemoved(attId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete attachment');
    }
  };

  return (
    <div className="bg-[#faf8f2] p-4 rounded-md border border-[#ded7c4] space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[#ece7d8]">
        <div className="flex items-center space-x-2">
          <Camera className="w-4 h-4 text-[#006c51]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-gov-sand-800">
            Linked Test Evidence & Photographs ({attachments.length})
          </h4>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="btn-gov-secondary text-xs py-1 px-2.5 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-[#006c51]" /> Attach Photo / Evidence
          </button>
        )}
      </div>

      {attachments.length === 0 ? (
        <div className="py-4 text-center text-xs text-gov-sand-500 bg-white/50 rounded border border-dashed border-[#ded7c4]">
          <ImageIcon className="w-6 h-6 text-gov-sand-400 mx-auto mb-1.5 opacity-60" />
          <p>No photographs or calibration sheets attached to this specific test module yet.</p>
          <p className="text-[10px] text-gov-sand-400 mt-0.5">
            Attach weight placement pictures, LCD indication readouts, or tare containers as audit proof.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="group relative bg-white p-2 rounded border border-[#ded7c4] shadow-sm hover:shadow transition-shadow"
            >
              <div className="h-24 bg-gov-sand-100 rounded overflow-hidden flex items-center justify-center border border-gov-sand-200">
                {att.fileType === 'PHOTO' || att.fileUrl.match(/\.(jpeg|jpg|png|webp|gif)$/i) ? (
                  <img
                    src={att.fileUrl}
                    alt={att.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <FileText className="w-8 h-8 text-gov-sand-500" />
                )}
              </div>

              <div className="mt-1.5 space-y-0.5">
                <div className="text-[11px] font-semibold text-gov-sand-900 truncate" title={att.title}>
                  {att.title}
                </div>
                <div className="flex items-center justify-between text-[10px] text-gov-sand-500">
                  <span>{att.fileType || 'Evidence'}</span>
                  <a
                    href={att.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#006c51] hover:underline flex items-center gap-0.5 font-medium"
                  >
                    View <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleDelete(att.id)}
                  title="Remove attachment"
                  className="absolute top-3 right-3 p-1 bg-red-600/90 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fcfbf9] rounded-lg border border-[#ded7c4] p-5 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#ded7c4] pb-2">
              <h3 className="text-sm font-bold font-serif text-[#006c51] flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#006c51]" />
                Attach Test Evidence / Photo
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gov-sand-500 hover:text-gov-sand-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-2 bg-red-50 text-red-700 text-xs rounded border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-3 text-xs">
              <div>
                <label className="gov-label text-[11px]">Attachment Title / Caption *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Load at Max Capacity (30kg Readout)"
                  className="gov-input text-xs"
                />
              </div>

              <div>
                <label className="gov-label text-[11px]">Evidence Type</label>
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value as any)}
                  className="gov-input text-xs"
                >
                  <option value="PHOTO">Photographic Readout / Setup Photo</option>
                  <option value="DOCUMENT">Calibration Sheet / Environmental Log</option>
                </select>
              </div>

              <div>
                <label className="gov-label text-[11px]">Upload Image File</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-gov-sand-700 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-[#006c51] file:text-xs file:font-semibold file:bg-[#006c51] file:text-white hover:file:bg-[#00523d] cursor-pointer"
                />
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#ded7c4]"></div>
                <span className="flex-shrink mx-2 text-[10px] uppercase font-mono text-gov-sand-400">or enter image url</span>
                <div className="flex-grow border-t border-[#ded7c4]"></div>
              </div>

              <div>
                <label className="gov-label text-[11px]">External Image URL</label>
                <input
                  type="url"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://... (or placeholder URL)"
                  className="gov-input text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#ded7c4]">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="btn-gov-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="btn-gov-primary text-xs"
                >
                  {uploading ? 'Attaching...' : 'Link Evidence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
