import React, { useState } from 'react';
import { 
  Award, 
  FileText, 
  Download, 
  CheckCircle2, 
  Globe2, 
  ShieldCheck, 
  Layers, 
  ExternalLink,
  Info,
  Check,
  PackageCheck
} from 'lucide-react';
import { api } from '../../api';
import { Report } from '../../types';

interface CertificateExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report;
  onExportSuccess?: (message: string) => void;
}

export const CertificateExportModal: React.FC<CertificateExportModalProps> = ({
  isOpen,
  onClose,
  report,
  onExportSuccess,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<'INDIAN_RRSL' | 'OIML_CS' | 'BOTH'>('INDIAN_RRSL');
  const [fileFormat, setFileFormat] = useState<'pdf' | 'docx'>('pdf');
  const [exporting, setExporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setExporting(true);
    setSuccessMsg(null);

    try {
      if (selectedTemplate === 'BOTH') {
        // Trigger download for Indian RRSL
        const url1 = api.getCertificateExportUrl(report.id, 'INDIAN_RRSL', fileFormat, report.version);
        const a1 = document.createElement('a');
        a1.href = url1;
        a1.target = '_blank';
        a1.download = `${report.reportId}_INDIAN_RRSL_v${report.version}.${fileFormat}`;
        document.body.appendChild(a1);
        a1.click();
        document.body.removeChild(a1);

        // Small timeout to allow browser to handle first download
        await new Promise((r) => setTimeout(r, 600));

        // Trigger download for OIML CS
        const url2 = api.getCertificateExportUrl(report.id, 'OIML_CS', fileFormat, report.version);
        const a2 = document.createElement('a');
        a2.href = url2;
        a2.target = '_blank';
        a2.download = `${report.reportId}_OIML_CS_v${report.version}.${fileFormat}`;
        document.body.appendChild(a2);
        a2.click();
        document.body.removeChild(a2);

        const msg = `Dual certificates (Indian RRSL and OIML CS) exported in .${fileFormat} format. Event recorded in Digital Passport ledger.`;
        setSuccessMsg(msg);
        if (onExportSuccess) onExportSuccess(msg);
      } else {
        const url = api.getCertificateExportUrl(report.id, selectedTemplate, fileFormat, report.version);
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.download = `${report.reportId}_${selectedTemplate}_v${report.version}.${fileFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        const templateName =
          selectedTemplate === 'INDIAN_RRSL'
            ? 'Indian RRSL National Certificate'
            : 'OIML CS Scheme Type Evaluation Certificate';
        const msg = `${templateName} (.${fileFormat}) successfully exported. Recorded on Instrument Passport timeline.`;
        setSuccessMsg(msg);
        if (onExportSuccess) onExportSuccess(msg);
      }
    } catch (err: any) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#fcfbf9] rounded border border-[#ded7c4] max-w-2xl w-full shadow-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#005a3c] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-700/80 rounded">
              <Award className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif tracking-wide">
                Certificate Exporter
              </h3>
              <p className="text-[11px] text-emerald-100">
                Official metrology certificate generator for approved jurisdictions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white text-xs font-semibold px-2 py-1 rounded border border-emerald-600/50"
          >
            Close
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-5 text-xs overflow-y-auto">
          {/* Target Report Snapshot Banner */}
          <div className="p-3 bg-[#faf8f2] rounded border border-[#ded7c4] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-gov-sand-500 block">Report Ref. No.</span>
              <span className="font-mono font-bold text-gov-sand-900 text-xs">
                {report.reportId} (Version {report.version})
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono uppercase text-gov-sand-500 block">SHA-256 Hash</span>
              <span className="font-mono text-[10px] text-emerald-800 font-semibold truncate max-w-[200px] block" title={report.integrityHash || 'Pending'}>
                {report.integrityHash ? `${report.integrityHash.substring(0, 16)}...` : 'Pending finalization'}
              </span>
            </div>
          </div>

          {/* Template Selection Cards */}
          <div className="space-y-2">
            <label className="gov-label text-xs font-bold text-gov-sand-900">
              Select Certificate Format / Legal Standard
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Option 1: Indian RRSL */}
              <div
                onClick={() => setSelectedTemplate('INDIAN_RRSL')}
                className={`p-3.5 rounded border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  selectedTemplate === 'INDIAN_RRSL'
                    ? 'border-[#005a3c] bg-emerald-50/50 shadow-sm ring-1 ring-[#005a3c]'
                    : 'border-[#ded7c4] bg-white hover:bg-[#faf8f2]'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-mono">
                      India RRSL
                    </span>
                    {selectedTemplate === 'INDIAN_RRSL' && (
                      <CheckCircle2 className="w-4 h-4 text-[#005a3c]" />
                    )}
                  </div>
                  <h4 className="font-bold text-xs text-gov-sand-900 pt-1">
                    Legal Metrology Rules, 2011
                  </h4>
                  <p className="text-[11px] text-gov-sand-600 leading-relaxed">
                    Official Regional Reference Standards Laboratory (RRSL) Model Approval Certificate format with Schedule VI Table 6 tolerances and mandatory lead-and-wire sealing clause.
                  </p>
                </div>
                <div className="pt-2 text-[10px] font-mono text-gov-sand-500 border-t border-emerald-100 mt-2">
                  Authority: RRSL, Govt. of India
                </div>
              </div>

              {/* Option 2: OIML CS Scheme */}
              <div
                onClick={() => setSelectedTemplate('OIML_CS')}
                className={`p-3.5 rounded border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  selectedTemplate === 'OIML_CS'
                    ? 'border-sky-700 bg-sky-50/50 shadow-sm ring-1 ring-sky-700'
                    : 'border-[#ded7c4] bg-white hover:bg-[#faf8f2]'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800 bg-sky-100 px-2 py-0.5 rounded font-mono">
                      OIML CS Scheme
                    </span>
                    {selectedTemplate === 'OIML_CS' && (
                      <CheckCircle2 className="w-4 h-4 text-sky-700" />
                    )}
                  </div>
                  <h4 className="font-bold text-xs text-gov-sand-900 pt-1">
                    OIML R 76-1:2006 Format
                  </h4>
                  <p className="text-[11px] text-gov-sand-600 leading-relaxed">
                    International Type Evaluation Certificate of Conformity recognized across OIML member states under Scheme A mutual acceptance agreements.
                  </p>
                </div>
                <div className="pt-2 text-[10px] font-mono text-gov-sand-500 border-t border-sky-100 mt-2">
                  Authority: OIML Issuing Authority
                </div>
              </div>

              {/* Option 3: Both Formats */}
              <div
                onClick={() => setSelectedTemplate('BOTH')}
                className={`p-3.5 rounded border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  selectedTemplate === 'BOTH'
                    ? 'border-amber-700 bg-amber-50/50 shadow-sm ring-1 ring-amber-700'
                    : 'border-[#ded7c4] bg-white hover:bg-[#faf8f2]'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded font-mono">
                      Dual Format
                    </span>
                    {selectedTemplate === 'BOTH' && (
                      <CheckCircle2 className="w-4 h-4 text-amber-700" />
                    )}
                  </div>
                  <h4 className="font-bold text-xs text-gov-sand-900 pt-1">
                    Dual Jurisdiction Bundle
                  </h4>
                  <p className="text-[11px] text-gov-sand-600 leading-relaxed">
                    Simultaneously export both the Indian RRSL National Certificate and the International OIML CS Scheme Report from this single evaluation.
                  </p>
                </div>
                <div className="pt-2 text-[10px] font-mono text-gov-sand-500 border-t border-amber-100 mt-2">
                  Complete Statutory Portfolio
                </div>
              </div>
            </div>
          </div>

          {/* Document Format Selection */}
          <div className="space-y-1.5">
            <label className="gov-label text-xs font-bold text-gov-sand-900">
              Output Document Format
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFileFormat('pdf')}
                className={`flex-1 p-2.5 rounded-md border text-left flex items-center justify-between transition-all ${
                  fileFormat === 'pdf'
                    ? 'border-red-600 bg-red-50/70 text-red-950 font-bold'
                    : 'border-[#ded7c4] bg-white text-gov-sand-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-red-600" />
                  <span>Official Signed PDF Document (.pdf)</span>
                </div>
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 bg-red-100 text-red-800 rounded">
                  A4 Print-Ready
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFileFormat('docx')}
                className={`flex-1 p-2.5 rounded-md border text-left flex items-center justify-between transition-all ${
                  fileFormat === 'docx'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-bold'
                    : 'border-[#ded7c4] bg-white text-gov-sand-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Editable Word Document (.docx)</span>
                </div>
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded">
                  MS Word
                </span>
              </button>
            </div>
          </div>

          {/* Field Mapping Layer Summary Box */}
          <div className="p-3 bg-[#faf8f2] rounded border border-[#ded7c4] space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-gov-sand-900 text-[11px]">
              <Layers className="w-3.5 h-3.5 text-[#005a3c]" />
              Field-Mapping Engine Layer & Fallback Policy
            </div>
            <p className="text-[11px] text-gov-sand-600 leading-relaxed">
              MarkSure dynamically maps internal instrument specifications, observation points, MPE calculation tables, and test verdicts into the required layout of the selected standard. Where specific optional legal metadata is uncollected (e.g. Gazette notification or EMC test report index), the engine safely renders clean <span className="font-mono font-bold bg-white px-1 border border-gov-sand-300 rounded">"N/A"</span> placeholders rather than breaking generation.
            </p>
          </div>

          {/* Success Banner */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border-l-4 border-emerald-600 text-xs text-emerald-900 flex items-center gap-2 rounded">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[#ded7c4]">
            <span className="text-[10px] text-gov-sand-500 font-mono">
              Generation is permanently recorded on Instrument Passport timeline
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-gov-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="btn-gov-primary text-xs flex items-center gap-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5" />
                {exporting ? 'Generating Certificate...' : 'Generate & Download'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
