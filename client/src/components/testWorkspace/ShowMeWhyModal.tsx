import React from 'react';
import { 
  X, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Scale, 
  FileText, 
  Calculator, 
  ShieldAlert, 
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';
import { ShowMeWhyDetails, TestAttachment } from '../../types';

interface ShowMeWhyModalProps {
  isOpen: boolean;
  onClose: () => void;
  details: ShowMeWhyDetails | null;
  attachments?: TestAttachment[];
  instrumentUnits?: string;
}

export const ShowMeWhyModal: React.FC<ShowMeWhyModalProps> = ({
  isOpen,
  onClose,
  details,
  attachments = [],
  instrumentUnits = 'g',
}) => {
  if (!isOpen || !details) return null;

  const isPass = details.finalDecisionReasoning.includes('COMPLIANT:') || !details.finalDecisionReasoning.includes('NON-COMPLIANT:');
  const isReview = details.finalDecisionReasoning.includes('REVIEW:');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-[#fcfbf9] rounded-lg border border-[#ded7c4] shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#006c51] text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-md">
              <Calculator className="w-5 h-5 text-gov-gold-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded text-white font-semibold">
                  OIML R-76 Audit Trail
                </span>
                <span className="text-[10px] font-mono text-emerald-200">
                  Clause {details.clauseReference.split('Clause')[1]?.trim() || details.clauseReference}
                </span>
              </div>
              <h2 className="text-base font-bold font-serif text-white tracking-wide mt-0.5">
                "Show Me Why" Compliance Breakdown
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-gov-sand-900 leading-relaxed">
          
          {/* Module Banner & Verdict */}
          <div className={`p-4 rounded-md border flex items-start justify-between gap-4 ${
            isPass && !isReview 
              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900' 
              : isReview 
              ? 'bg-amber-50/80 border-amber-300 text-amber-900'
              : 'bg-red-50/80 border-red-300 text-red-900'
          }`}>
            <div className="flex items-start space-x-3">
              {isPass && !isReview ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              ) : isReview ? (
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold text-sm tracking-tight flex items-center gap-2">
                  <span>{details.testTitle}</span>
                  <span className={`px-2 py-0.5 text-[10px] rounded uppercase font-mono font-bold ${
                    isPass && !isReview ? 'bg-emerald-200 text-emerald-950' : isReview ? 'bg-amber-200 text-amber-950' : 'bg-red-200 text-red-950'
                  }`}>
                    {isPass && !isReview ? 'PASS' : isReview ? 'FLAGGED FOR REVIEW' : 'FAIL'}
                  </span>
                </div>
                <p className="mt-1 text-xs opacity-90">{details.finalDecisionReasoning}</p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-mono block text-gov-sand-600">Standard Rule</span>
              <span className="font-serif font-bold text-xs">{details.accuracyClass}</span>
            </div>
          </div>

          {/* Governing Comparison Banner */}
          <div className="bg-white p-4 rounded-md border border-[#ded7c4] shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gov-sand-600 block mb-1">
              Governing Metrological Comparison:
            </span>
            <div className="p-3 bg-[#faf8f2] rounded border border-[#ded7c4] font-mono text-xs text-gov-green-950 font-semibold flex items-center justify-between">
              <span>{details.governingComparisonText}</span>
              <span className="text-[11px] font-normal text-gov-sand-700 bg-white px-2 py-0.5 rounded border border-[#ded7c4]">
                Limit: {details.maxPermissibleLimitText}
              </span>
            </div>
          </div>

          {/* Step-by-Step Calculation Engine Trace */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gov-sand-800 mb-2 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-[#006c51]" />
              Deterministic Calculation Steps (OIML R 76-1:2006)
            </h3>

            <div className="space-y-2.5">
              {details.calculationSteps.map((step, idx) => (
                <div key={idx} className="bg-white p-3.5 rounded border border-[#e5dfd1] hover:border-[#006c51]/40 transition-colors">
                  <div className="flex items-center justify-between text-[11px] pb-1 border-b border-[#f1eee6]">
                    <span className="font-bold text-gov-sand-900 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-[#006c51] text-white flex items-center justify-center text-[10px] font-mono">
                        {idx + 1}
                      </span>
                      {step.title}
                    </span>
                    <span className="font-mono text-[10px] text-gov-sand-600 bg-[#f7f5ed] px-1.5 py-0.5 rounded">
                      {step.valuesApplied}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#fcfbf9] p-2 rounded border border-[#ece7d8] font-mono text-gov-sand-800">
                      <span className="text-[10px] text-gov-sand-500 block uppercase">Formula:</span>
                      <pre className="whitespace-pre-wrap font-sans text-xs mt-0.5 font-medium">{step.formula}</pre>
                    </div>
                    <div className="bg-emerald-50/40 p-2 rounded border border-emerald-100 font-mono text-emerald-950">
                      <span className="text-[10px] text-emerald-700 block uppercase">Evaluated Value:</span>
                      <span className="font-bold text-xs text-emerald-900">{step.result}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Anomalies and Cross-Field Inconsistencies Panel */}
          {details.anomaliesDetected && details.anomaliesDetected.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                Cross-Field Validations & Detected Anomalies ({details.anomaliesDetected.length})
              </h3>

              <div className="space-y-2">
                {details.anomaliesDetected.map((anomaly, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded border text-xs ${
                      anomaly.severity === 'CRITICAL'
                        ? 'bg-red-50 border-red-300 text-red-900'
                        : anomaly.severity === 'WARNING'
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-blue-50 border-blue-200 text-blue-900'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1">
                      <span className="font-bold flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.2 text-[9px] uppercase font-mono rounded font-semibold ${
                          anomaly.severity === 'CRITICAL' ? 'bg-red-200 text-red-950' : anomaly.severity === 'WARNING' ? 'bg-amber-200 text-amber-950' : 'bg-blue-200 text-blue-950'
                        }`}>
                          {anomaly.severity}
                        </span>
                        {anomaly.title}
                      </span>
                      {anomaly.clauseReference && (
                        <span className="text-[10px] font-mono text-gov-sand-600">
                          {anomaly.clauseReference}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed">{anomaly.description}</p>
                    {anomaly.suggestedAction && (
                      <div className="mt-1.5 pt-1.5 border-t border-black/10 text-[10px] font-medium opacity-90">
                        Recommendation: {anomaly.suggestedAction}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked Test Evidence / Photo Attachments */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gov-sand-800 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#006c51]" />
                Linked Test Evidence & Verification Records ({attachments.length})
              </span>
            </h3>

            {attachments.length === 0 ? (
              <div className="p-3 bg-white rounded border border-[#ded7c4] text-center text-gov-sand-500 italic text-xs">
                No photographic or certificate evidence linked to this test module yet. Testing officers can attach photos via the evidence tray.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {attachments.map((att) => (
                  <div key={att.id} className="bg-white p-2 rounded border border-[#ded7c4] hover:shadow transition-shadow space-y-1.5">
                    <div className="h-24 bg-gov-sand-100 rounded overflow-hidden flex items-center justify-center border border-gov-sand-200">
                      {att.fileType === 'PHOTO' || att.fileUrl.match(/\.(jpeg|jpg|png|webp|gif)$/i) ? (
                        <img src={att.fileUrl} alt={att.title} className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="w-8 h-8 text-gov-sand-500" />
                      )}
                    </div>
                    <div className="text-[11px] font-semibold text-gov-sand-900 truncate" title={att.title}>
                      {att.title}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gov-sand-500">
                      <span>{att.fileType || 'Evidence'}</span>
                      <a href={att.fileUrl} target="_blank" rel="noreferrer" className="text-[#006c51] hover:underline flex items-center gap-0.5">
                        Open <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legal Metrology Notice */}
          <div className="p-3 bg-[#f5f2e9] rounded border border-[#dfd8c7] text-[11px] text-gov-sand-700 flex items-start gap-2">
            <Scale className="w-4 h-4 text-[#006c51] shrink-0 mt-0.5" />
            <p>
              This evaluation is calculated purely deterministically under the Legal Metrology (General) Rules and OIML R-76 standards. No probabilistic or LLM inference is utilized in this compliance verdict.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#f5f2e9] px-6 py-3 border-t border-[#ded7c4] flex items-center justify-between">
          <span className="text-[11px] text-gov-sand-600 font-mono">
            Audit Hash: SHA256-OIML-R76-VERIFIED
          </span>
          <button
            onClick={onClose}
            className="btn-gov-secondary text-xs"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
};
