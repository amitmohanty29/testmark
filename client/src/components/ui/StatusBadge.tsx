import React from 'react';
import { AccuracyClass, EvaluationState } from '../../types';
import { CheckCircle2, Clock, AlertTriangle, FileText } from 'lucide-react';

interface EvaluationStatusBadgeProps {
  state: EvaluationState;
  showIcon?: boolean;
}

export const EvaluationStatusBadge: React.FC<EvaluationStatusBadgeProps> = ({ state, showIcon = true }) => {
  switch (state) {
    case 'Draft':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
          {showIcon && <Clock className="w-3 h-3 text-slate-500" />}
          Draft
        </span>
      );
    case 'In Progress':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300">
          {showIcon && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
          In Progress
        </span>
      );
    case 'Under Review':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-300">
          {showIcon && <AlertTriangle className="w-3 h-3 text-blue-600" />}
          Under Review
        </span>
      );
    case 'Completed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-300">
          {showIcon && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
          Completed
        </span>
      );
    default:
      return <span className="text-xs text-gov-sand-700">{state}</span>;
  }
};

interface AccuracyClassBadgeProps {
  accuracyClass: AccuracyClass | string;
}

export const AccuracyClassBadge: React.FC<AccuracyClassBadgeProps> = ({ accuracyClass }) => {
  switch (accuracyClass) {
    case 'Class I':
      return (
        <span className="inline-block px-2 py-0.5 text-xs font-bold rounded bg-purple-100 text-purple-900 border border-purple-300">
          Class I (Special)
        </span>
      );
    case 'Class II':
      return (
        <span className="inline-block px-2 py-0.5 text-xs font-bold rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
          Class II (High)
        </span>
      );
    case 'Class III':
      return (
        <span className="inline-block px-2 py-0.5 text-xs font-bold rounded bg-sky-100 text-sky-900 border border-sky-300">
          Class III (Medium)
        </span>
      );
    case 'Class IV':
      return (
        <span className="inline-block px-2 py-0.5 text-xs font-bold rounded bg-stone-100 text-stone-900 border border-stone-300">
          Class IV (Ordinary)
        </span>
      );
    default:
      return (
        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-800">
          {accuracyClass}
        </span>
      );
  }
};

export const InstrumentStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'CERTIFIED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3 h-3 text-emerald-700" /> CERTIFIED
        </span>
      );
    case 'IN_EVALUATION':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" /> IN EVALUATION
        </span>
      );
    case 'ACTIVE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded bg-blue-50 text-blue-800 border border-blue-200">
          REGISTERED
        </span>
      );
    default:
      return <span className="text-xs text-gov-sand-700">{status}</span>;
  }
};
