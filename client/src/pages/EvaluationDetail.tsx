import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { Evaluation, EvaluationState } from '../types';
import { 
  EvaluationStatusBadge, 
  AccuracyClassBadge 
} from '../components/ui/StatusBadge';
import { 
  FileCheck2, 
  ArrowLeft, 
  BookMarked, 
  Building2, 
  User, 
  Calendar, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  ExternalLink,
  MessageSquare,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DigitalTestWorkspace } from '../components/testWorkspace/DigitalTestWorkspace';
import { EvaluationAuditTrail } from '../components/audit/EvaluationAuditTrail';

export const EvaluationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isTestingOfficer, isReviewingOfficer, isAdmin } = useAuth();

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State transition state
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [transitionSuccess, setTransitionSuccess] = useState<string | null>(null);

  // Report state
  const [existingReport, setExistingReport] = useState<any | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    if (id) loadEvaluation(id);
  }, [id]);

  const loadEvaluation = async (evalId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getEvaluation(evalId);
      setEvaluation(res.evaluation);
      if (res.evaluation.reviewRemarks) {
        setReviewRemarks(res.evaluation.reviewRemarks);
      }

      // Check for existing report
      try {
        const rptRes = await api.getReports({ search: res.evaluation.evaluationNumber });
        if (rptRes.reports && rptRes.reports.length > 0) {
          setExistingReport(rptRes.reports[0]);
        }
      } catch (e) {
        // ignore report lookup error
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load evaluation session');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!evaluation) return;
    setGeneratingReport(true);
    setError(null);
    setTransitionSuccess(null);
    try {
      const res = await api.generateReport(evaluation.id);
      setExistingReport(res.report);
      setTransitionSuccess(`OIML R-76 Test Report ${res.report.reportId} generated successfully!`);
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleStateTransition = async (targetState: EvaluationState) => {
    if (!evaluation) return;
    setTransitionLoading(true);
    setTransitionSuccess(null);
    setError(null);

    try {
      const res = await api.updateEvaluationState(
        evaluation.id,
        targetState,
        reviewRemarks || undefined
      );
      setEvaluation(res.evaluation);
      setTransitionSuccess(`Evaluation session successfully transitioned to: ${targetState}`);
    } catch (err: any) {
      setError(err.message || 'State transition failed');
    } finally {
      setTransitionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-4 border-[#006c51] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs text-gov-sand-700">Loading Evaluation Session...</p>
      </div>
    );
  }

  if (error && !evaluation) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="p-6 bg-red-50 border-l-4 border-red-600 rounded text-red-800">
          <h3 className="text-sm font-bold">Evaluation Session Not Found</h3>
          <p className="text-xs mt-1">{error}</p>
          <Link to="/evaluations" className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-[#006c51] underline">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Evaluations
          </Link>
        </div>
      </div>
    );
  }

  if (!evaluation) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Link to="/evaluations" className="btn-gov-secondary text-xs">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> All Evaluations
          </Link>
          <span className="text-xs text-gov-sand-400">/</span>
          <span className="text-xs font-mono font-bold text-gov-sand-800">{evaluation.evaluationNumber}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {existingReport ? (
            <Link
              to={`/reports/${existingReport.id}`}
              className="btn-gov-primary text-xs flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" /> View Report ({existingReport.reportId})
            </Link>
          ) : (
            <button
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="btn-gov-primary text-xs flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              {generatingReport ? 'Generating Report...' : 'Auto-Generate Report'}
            </button>
          )}

          {evaluation.instrument && (
            <Link
              to={`/passport/${evaluation.instrument.id}`}
              className="btn-gov-outline text-xs"
            >
              <BookMarked className="w-3.5 h-3.5 mr-1.5 text-[#006c51]" />
              Passport
            </Link>
          )}
        </div>
      </div>

      {transitionSuccess && (
        <div className="p-3 bg-emerald-50 border-l-4 border-emerald-600 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{transitionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border-l-4 border-red-600 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Session Card */}
      <div className="gov-card">
        <div className="gov-card-header">
          <div className="flex items-center space-x-3">
            <FileCheck2 className="w-5 h-5 text-[#006c51]" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold font-serif text-[#006c51]">
                  Evaluation {evaluation.evaluationNumber}
                </h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-gov-green-100 text-gov-green-900 rounded font-semibold">
                  OIML R-76
                </span>
              </div>
              <p className="text-xs text-gov-sand-600 mt-0.5">
                Standard: <span className="font-medium text-gov-sand-800">{evaluation.standardReference}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <EvaluationStatusBadge state={evaluation.state} />
          </div>
        </div>

        {/* Workflow State Transition Bar */}
        <div className="bg-[#f6f4ed] px-6 py-4 border-b border-[#e5dfd1]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gov-sand-700 block mb-2">
            OIML R-76 Pattern Evaluation Workflow Progress:
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {/* Step 1: Draft */}
            <div className={`p-2.5 rounded border ${evaluation.state === 'Draft' ? 'bg-[#006c51] text-white font-bold border-[#006c51]' : 'bg-white text-gov-sand-700 border-gov-sand-200'}`}>
              <div className="text-[10px] uppercase font-mono">Step 1</div>
              <div>Draft Setup</div>
            </div>

            {/* Step 2: In Progress */}
            <div className={`p-2.5 rounded border ${evaluation.state === 'In Progress' ? 'bg-[#006c51] text-white font-bold border-[#006c51]' : 'bg-white text-gov-sand-700 border-gov-sand-200'}`}>
              <div className="text-[10px] uppercase font-mono">Step 2</div>
              <div>Active Test Bench</div>
            </div>

            {/* Step 3: Under Review */}
            <div className={`p-2.5 rounded border ${evaluation.state === 'Under Review' ? 'bg-[#006c51] text-white font-bold border-[#006c51]' : 'bg-white text-gov-sand-700 border-gov-sand-200'}`}>
              <div className="text-[10px] uppercase font-mono">Step 3</div>
              <div>Officer Review</div>
            </div>

            {/* Step 4: Completed */}
            <div className={`p-2.5 rounded border ${evaluation.state === 'Completed' ? 'bg-[#006c51] text-white font-bold border-[#006c51]' : 'bg-white text-gov-sand-700 border-gov-sand-200'}`}>
              <div className="text-[10px] uppercase font-mono">Step 4</div>
              <div>Certified & Pass</div>
            </div>
          </div>
        </div>

        {/* Evaluation Metadata Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Target Instrument Details */}
          <div className="bg-[#faf8f2] p-4 rounded border border-[#ded7c4] space-y-2 text-xs">
            <div className="flex items-center justify-between pb-1 border-b border-[#ece7d8]">
              <span className="font-bold text-gov-sand-800 uppercase tracking-wider text-[11px]">
                Target Instrument
              </span>
              {evaluation.instrument && (
                <Link to={`/instruments/${evaluation.instrument.id}`} className="text-[#006c51] hover:underline font-semibold">
                  Open Profile &rarr;
                </Link>
              )}
            </div>

            {evaluation.instrument ? (
              <>
                <div className="flex justify-between py-1">
                  <span className="text-gov-sand-600">Model:</span>
                  <span className="font-bold text-gov-sand-900">{evaluation.instrument.model}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gov-sand-600">Manufacturer:</span>
                  <span className="font-medium text-gov-sand-900">{evaluation.instrument.manufacturer}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gov-sand-600">Serial Number:</span>
                  <span className="font-mono font-bold text-[#006c51]">{evaluation.instrument.serialNumber}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gov-sand-600">Accuracy Class:</span>
                  <AccuracyClassBadge accuracyClass={evaluation.instrument.accuracyClass} />
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gov-sand-600">Capacity & e:</span>
                  <span className="font-mono text-gov-sand-900">
                    Max: {evaluation.instrument.maxCapacity}{evaluation.instrument.verificationUnits} | e: {evaluation.instrument.scaleIntervalE}{evaluation.instrument.verificationUnits}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-gov-sand-500 italic">No instrument linked.</p>
            )}
          </div>

          {/* Laboratory & Officials */}
          <div className="bg-[#faf8f2] p-4 rounded border border-[#ded7c4] space-y-2 text-xs">
            <h3 className="font-bold text-gov-sand-800 uppercase tracking-wider text-[11px] pb-1 border-b border-[#ece7d8]">
              Accredited Laboratory & Officers
            </h3>
            <div className="flex justify-between py-1">
              <span className="text-gov-sand-600">Testing Lab:</span>
              <span className="font-bold text-gov-sand-900 text-right">{evaluation.laboratory.name}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gov-sand-600">Accreditation:</span>
              <span className="font-mono font-semibold text-gov-sand-900">{evaluation.laboratory.accreditationNumber}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gov-sand-600">Testing Officer:</span>
              <span className="font-medium text-gov-sand-900">{evaluation.testingOfficer.name}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gov-sand-600">Reviewing Officer:</span>
              <span className="font-medium text-gov-sand-900">
                {evaluation.reviewingOfficer?.name || 'Pending Review Assignment'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gov-sand-600">Session Date:</span>
              <span className="font-mono text-gov-sand-900">
                {new Date(evaluation.evaluationDate).toLocaleDateString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Remarks Section */}
        <div className="px-6 pb-6 text-xs space-y-4">
          <div>
            <label className="gov-label">Testing Officer Scope & General Remarks</label>
            <div className="p-3 bg-white rounded border border-[#ded7c4] text-gov-sand-800 leading-relaxed">
              {evaluation.generalRemarks || 'Standard testing protocol in progress.'}
            </div>
          </div>

          {evaluation.reviewRemarks && (
            <div>
              <label className="gov-label text-blue-900 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-700" />
                Reviewing Officer Remarks & Endorsement
              </label>
              <div className="p-3 bg-blue-50/60 rounded border border-blue-200 text-blue-900 leading-relaxed font-serif">
                "{evaluation.reviewRemarks}"
              </div>
            </div>
          )}
        </div>

        {/* Role-Based State Overview Banner */}
        <div className="bg-[#fcfbf9] p-4 border-t border-[#e5dfd1] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase bg-gov-sand-200 text-gov-sand-800 px-2 py-0.5 rounded font-bold">
              Current Stage: {evaluation.state}
            </span>
            <span className="text-gov-sand-600">
              {evaluation.state === 'Draft' && 'Evaluation created. Ready to commence testing.'}
              {evaluation.state === 'In Progress' && 'Test bench active. Record observation points across the test modules below.'}
              {evaluation.state === 'Under Review' && 'Test entries finalized. Awaiting Reviewing Officer compliance verification.'}
              {evaluation.state === 'Completed' && 'Evaluation endorsed & certified under OIML R-76.'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {evaluation.state === 'Draft' && (isTestingOfficer || isAdmin) && (
              <button
                onClick={() => handleStateTransition('In Progress')}
                disabled={transitionLoading}
                className="btn-gov-primary text-xs"
              >
                Start Testing (Move to In Progress)
              </button>
            )}

            {evaluation.state === 'Completed' && evaluation.instrument && (
              <Link
                to={`/passport/${evaluation.instrument.id}`}
                className="btn-gov-outline text-xs text-emerald-800 border-emerald-700 hover:bg-emerald-50"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-700" /> Inspect Certified Passport &rarr;
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* DIGITAL TEST WORKSPACE (OIML R-76 TEST BENCH) */}
      {evaluation.instrument ? (
        <DigitalTestWorkspace
          evaluation={evaluation}
          instrument={evaluation.instrument}
          onEvaluationUpdated={(updatedEval) => {
            setEvaluation(updatedEval);
            if (updatedEval.reviewRemarks) {
              setReviewRemarks(updatedEval.reviewRemarks);
            }
          }}
        />
      ) : (
        <div className="p-8 text-center text-xs text-gov-sand-600 bg-white rounded border border-[#ded7c4]">
          No instrument details linked to this evaluation.
        </div>
      )}

      {/* Complete Audit Trail */}
      <EvaluationAuditTrail evaluationId={evaluation.id} />
    </div>
  );
};
