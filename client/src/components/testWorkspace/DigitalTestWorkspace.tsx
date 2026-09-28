import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  Repeat, 
  Compass, 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Send, 
  ShieldCheck, 
  ArrowRight,
  MessageSquare,
  AlertCircle,
  FileCheck2,
  Undo2
} from 'lucide-react';
import { Evaluation, Instrument, TestRecord, TestType } from '../../types';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { WeighingPerformanceModule } from './WeighingPerformanceModule';
import { RepeatabilityModule } from './RepeatabilityModule';
import { EccentricityModule } from './EccentricityModule';
import { TareModule } from './TareModule';

interface DigitalTestWorkspaceProps {
  evaluation: Evaluation;
  instrument: Instrument;
  onEvaluationUpdated: (evalData: Evaluation) => void;
}

export const DigitalTestWorkspace: React.FC<DigitalTestWorkspaceProps> = ({
  evaluation,
  instrument,
  onEvaluationUpdated,
}) => {
  const { user, isTestingOfficer, isReviewingOfficer, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<TestType>('WEIGHING_PERFORMANCE');
  const [testRecords, setTestRecords] = useState<TestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Workflow states
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const [reviewActionLoading, setReviewActionLoading] = useState(false);
  const [reviewDecisionRemarks, setReviewDecisionRemarks] = useState('');
  const [showReviewModal, setShowReviewModal] = useState<'APPROVE' | 'RETURN' | null>(null);
  const [workflowSuccess, setWorkflowSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadTestRecords();
  }, [evaluation.id]);

  const loadTestRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getEvaluationTests(evaluation.id);
      setTestRecords(res.testRecords);
    } catch (err: any) {
      console.error('Failed to load test records:', err);
      setError('Could not load existing test records.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordSaved = (saved: TestRecord) => {
    setTestRecords((prev) => {
      const index = prev.findIndex((r) => r.testType === saved.testType);
      if (index >= 0) {
        const next = [...prev];
        next[index] = saved;
        return next;
      } else {
        return [...prev, saved];
      }
    });

    // If evaluation was Draft, moving a test saves it to In Progress
    if (evaluation.state === 'Draft') {
      onEvaluationUpdated({
        ...evaluation,
        state: 'In Progress',
      });
    }
  };

  const getRecordForType = (type: TestType): TestRecord | undefined => {
    return testRecords.find((r) => r.testType === type);
  };

  // Submit Evaluation for Review (Testing Officer)
  const handleSubmitForReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    setError(null);
    setWorkflowSuccess(null);

    try {
      const res = await api.submitEvaluationForReview(evaluation.id, submissionNotes);
      onEvaluationUpdated(res.evaluation);
      setShowSubmitModal(false);
      setWorkflowSuccess('Evaluation submitted to Reviewing Officer for compliance review.');
    } catch (err: any) {
      setError(err.message || 'Failed to submit evaluation for review');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Review Action: Approve or Return (Reviewing Officer)
  const handleReviewAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReviewModal) return;

    setReviewActionLoading(true);
    setError(null);
    setWorkflowSuccess(null);

    try {
      const res = await api.reviewEvaluationAction(
        evaluation.id,
        showReviewModal,
        reviewDecisionRemarks
      );
      onEvaluationUpdated(res.evaluation);
      setWorkflowSuccess(res.message);
      setShowReviewModal(null);
      setReviewDecisionRemarks('');
    } catch (err: any) {
      setError(err.message || 'Failed to complete review action');
    } finally {
      setReviewActionLoading(false);
    }
  };

  const completedCount = testRecords.filter(
    (t) => t.status === 'PASS' || t.status === 'FAIL' || t.status === 'REVIEW'
  ).length;

  const isReadOnly = evaluation.state === 'Under Review' || evaluation.state === 'Completed';

  const tabs: Array<{
    id: TestType;
    label: string;
    clause: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'WEIGHING_PERFORMANCE',
      label: 'Weighing Performance',
      clause: 'Clause A.4.4',
      icon: Scale,
    },
    {
      id: 'REPEATABILITY',
      label: 'Repeatability Test',
      clause: 'Clause A.4.10',
      icon: Repeat,
    },
    {
      id: 'ECCENTRICITY',
      label: 'Eccentricity (Off-Center)',
      clause: 'Clause A.4.7',
      icon: Compass,
    },
    {
      id: 'TARE',
      label: 'Tare & Net Weighing',
      clause: 'Clause A.4.6 & 3.6',
      icon: Package,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Return Warning Banner if evaluation was returned by Reviewing Officer */}
      {evaluation.state === 'In Progress' && evaluation.reviewRemarks?.includes('[RETURNED') && (
        <div className="p-4 bg-amber-50 border-l-4 border-amber-600 rounded-md shadow-sm space-y-1 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <Undo2 className="w-4 h-4 text-amber-700" />
            <span>Evaluation Returned by Reviewing Officer for Revision</span>
          </div>
          <p className="leading-relaxed pl-6 font-serif">
            "{evaluation.reviewRemarks}"
          </p>
          <p className="pl-6 text-[11px] text-amber-800">
            Please re-examine the observations, adjust test conditions if needed, and re-submit for officer review.
          </p>
        </div>
      )}

      {/* Workflow Success Banner */}
      {workflowSuccess && (
        <div className="p-3 bg-emerald-50 border-l-4 border-emerald-600 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{workflowSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border-l-4 border-red-600 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Reviewing Officer Endorsement Bar (When Under Review) */}
      {evaluation.state === 'Under Review' && (
        <div className="p-5 bg-blue-50/80 border border-blue-300 rounded-lg shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-700 text-white rounded-md">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-serif text-blue-950">
                  Officer Review Stage: Endorsement & MPE Verification
                </h3>
                <p className="text-xs text-blue-800 mt-0.5">
                  Testing Officer submitted {completedCount} test modules. Inspect calculations, check "Show Me Why" compliance breakdowns, and decide.
                </p>
              </div>
            </div>

            {(isReviewingOfficer || isAdmin) && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowReviewModal('RETURN')}
                  className="btn-gov-secondary text-xs border-amber-600 text-amber-800 hover:bg-amber-100/60"
                >
                  <Undo2 className="w-3.5 h-3.5 mr-1" /> Return for Revision
                </button>
                <button
                  onClick={() => setShowReviewModal('APPROVE')}
                  className="btn-gov-primary text-xs bg-emerald-700 hover:bg-emerald-800"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve & Certify
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workspace Header & Test Module Tabs */}
      <div className="gov-card overflow-hidden">
        <div className="bg-[#f6f4ed] px-6 py-4 border-b border-[#ded7c4] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase bg-[#006c51] text-white px-2 py-0.5 rounded font-bold">
                Digital Test Workspace
              </span>
              <span className="text-xs font-bold text-gov-sand-900">
                OIML R-76 Laboratory Test Bench
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300 shadow-xs">
                <ShieldCheck className="w-3 h-3 text-emerald-700" />
                IndexedDB Auto-Save & Offline Resilient
              </span>
            </div>
            <p className="text-xs text-gov-sand-600 mt-0.5">
              Standard: <span className="font-semibold">{evaluation.standardReference}</span> | Instrument: <span className="font-semibold">{instrument.model} ({instrument.accuracyClass})</span>
            </p>
          </div>

          {/* Test Completion Counter & Submit for Review Button */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase font-mono text-gov-sand-500 block">Workspace Progress</span>
              <span className="text-xs font-mono font-bold text-gov-sand-900">
                {completedCount} / 4 Modules Evaluated
              </span>
            </div>

            {(isTestingOfficer || isAdmin) && evaluation.state !== 'Under Review' && evaluation.state !== 'Completed' && (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                disabled={completedCount < 2}
                className="btn-gov-primary text-xs flex items-center gap-1.5 shadow"
                title={completedCount < 2 ? 'Complete at least 2 test modules to submit for review' : 'Submit evaluation to Reviewing Officer'}
              >
                <Send className="w-3.5 h-3.5" /> Submit for Review
              </button>
            )}
          </div>
        </div>

        {/* Tab Selector Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-[#ded7c4] bg-[#faf8f2]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const rec = getRecordForType(tab.id);
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-3.5 text-left border-r border-[#ded7c4] last:border-r-0 transition-all flex flex-col justify-between ${
                  isActive
                    ? 'bg-white border-b-2 border-b-[#006c51] shadow-sm'
                    : 'hover:bg-[#f3f0e6] text-gov-sand-700'
                }`}
              >
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center space-x-2">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#006c51]' : 'text-gov-sand-500'}`} />
                    <span className={`text-xs font-bold ${isActive ? 'text-[#006c51]' : 'text-gov-sand-800'}`}>
                      {tab.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                  <span className="text-gov-sand-500">{tab.clause}</span>
                  {rec ? (
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                        rec.status === 'PASS'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.status === 'REVIEW'
                          ? 'bg-amber-100 text-amber-800'
                          : rec.status === 'FAIL'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gov-sand-200 text-gov-sand-700'
                      }`}
                    >
                      {rec.status}
                    </span>
                  ) : (
                    <span className="text-gov-sand-400">NOT STARTED</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Module Container */}
        <div className="p-6">
          {loading ? (
            <div className="py-12 text-center text-xs text-gov-sand-500">
              <div className="w-8 h-8 border-3 border-[#006c51] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading Digital Test Modules...
            </div>
          ) : (
            <>
              {activeTab === 'WEIGHING_PERFORMANCE' && (
                <WeighingPerformanceModule
                  evaluationId={evaluation.id}
                  instrument={instrument}
                  existingRecord={getRecordForType('WEIGHING_PERFORMANCE')}
                  onRecordSaved={handleRecordSaved}
                  readOnly={isReadOnly}
                />
              )}

              {activeTab === 'REPEATABILITY' && (
                <RepeatabilityModule
                  evaluationId={evaluation.id}
                  instrument={instrument}
                  existingRecord={getRecordForType('REPEATABILITY')}
                  onRecordSaved={handleRecordSaved}
                  readOnly={isReadOnly}
                />
              )}

              {activeTab === 'ECCENTRICITY' && (
                <EccentricityModule
                  evaluationId={evaluation.id}
                  instrument={instrument}
                  existingRecord={getRecordForType('ECCENTRICITY')}
                  onRecordSaved={handleRecordSaved}
                  readOnly={isReadOnly}
                />
              )}

              {activeTab === 'TARE' && (
                <TareModule
                  evaluationId={evaluation.id}
                  instrument={instrument}
                  existingRecord={getRecordForType('TARE')}
                  onRecordSaved={handleRecordSaved}
                  readOnly={isReadOnly}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal: Testing Officer Submits for Review */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fcfbf9] rounded-lg border border-[#ded7c4] max-w-lg w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#ded7c4] pb-3">
              <h3 className="text-sm font-bold font-serif text-[#006c51] flex items-center gap-2">
                <Send className="w-4 h-4 text-[#006c51]" />
                Submit Evaluation to Reviewing Officer
              </h3>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-gov-sand-500 hover:text-gov-sand-800 text-xs font-semibold px-2 py-0.5 rounded border border-gov-sand-300"
              >
                Close
              </button>
            </div>

            <div className="p-3 bg-[#faf8f2] rounded border border-[#ded7c4] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gov-sand-600">Completed Test Modules:</span>
                <span className="font-mono font-bold text-gov-sand-900">{completedCount} / 4 Modules</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gov-sand-600">Instrument Model:</span>
                <span className="font-medium text-gov-sand-900">{instrument.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gov-sand-600">Assigned Reviewing Officer:</span>
                <span className="font-medium text-gov-sand-900">
                  {evaluation.reviewingOfficer?.name || 'Reviewing Officer'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitForReview} className="space-y-4 text-xs">
              <div>
                <label className="gov-label text-[11px]">Testing Officer Submission Notes & Scope Summary</label>
                <textarea
                  rows={3}
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="e.g. Weighing, Repeatability, and Eccentricity tests completed on verified laboratory test bench. All observation records satisfy OIML R-76 MPE tables. Forwarded for final verification."
                  className="gov-input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#ded7c4]">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="btn-gov-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="btn-gov-primary text-xs"
                >
                  {submittingReview ? 'Submitting...' : 'Confirm Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reviewing Officer Review Action (Approve or Return) */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fcfbf9] rounded-lg border border-[#ded7c4] max-w-lg w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#ded7c4] pb-3">
              <h3 className={`text-sm font-bold font-serif flex items-center gap-2 ${
                showReviewModal === 'APPROVE' ? 'text-emerald-800' : 'text-amber-800'
              }`}>
                {showReviewModal === 'APPROVE' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    Approve Evaluation & Certify Digital Passport
                  </>
                ) : (
                  <>
                    <Undo2 className="w-5 h-5 text-amber-700" />
                    Return Evaluation to Testing Officer with Comments
                  </>
                )}
              </h3>
              <button
                onClick={() => setShowReviewModal(null)}
                className="text-gov-sand-500 hover:text-gov-sand-800 text-xs font-semibold px-2 py-0.5 rounded border border-gov-sand-300"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleReviewAction} className="space-y-4 text-xs">
              <div>
                <label className="gov-label text-[11px]">
                  {showReviewModal === 'APPROVE'
                    ? 'Official Compliance Statement & Approval Remarks *'
                    : 'Reasons for Return & Required Re-testing Instructions *'}
                </label>
                <textarea
                  rows={4}
                  required
                  value={reviewDecisionRemarks}
                  onChange={(e) => setReviewDecisionRemarks(e.target.value)}
                  placeholder={
                    showReviewModal === 'APPROVE'
                      ? 'e.g. All test modules, MPE calculation traces, and environmental records verified under OIML R-76. Indication errors comply with Class III tolerances. Approved for certificate issuance.'
                      : 'e.g. Ambient temperature exceeded declared operating bounds during weighing test; please repeat series under controlled temperature and provide thermal stabilization notes.'
                  }
                  className="gov-input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#ded7c4]">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(null)}
                  className="btn-gov-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewActionLoading || !reviewDecisionRemarks.trim()}
                  className={`btn-gov-primary text-xs ${
                    showReviewModal === 'APPROVE'
                      ? 'bg-emerald-700 hover:bg-emerald-800'
                      : 'bg-amber-700 hover:bg-amber-800 text-white'
                  }`}
                >
                  {reviewActionLoading
                    ? 'Processing...'
                    : showReviewModal === 'APPROVE'
                    ? 'Confirm Approval & Certify'
                    : 'Return to Testing Officer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
