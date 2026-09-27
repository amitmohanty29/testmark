export type Role = 'TESTING_OFFICER' | 'REVIEWING_OFFICER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  designation?: string;
  department?: string;
}

export type AccuracyClass = 'Class I' | 'Class II' | 'Class III' | 'Class IV';

export type EvaluationState = 'Draft' | 'In Progress' | 'Under Review' | 'Completed';

export interface InstrumentDocument {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
  uploadedAt: string;
}

export interface Laboratory {
  id: string;
  code: string;
  name: string;
  address: string;
  accreditationNumber: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface Evaluation {
  id: string;
  evaluationNumber: string;
  instrumentId: string;
  instrument?: Instrument;
  laboratoryId: string;
  laboratory: Laboratory;
  evaluationDate: string;
  testingOfficerId: string;
  testingOfficer: User;
  reviewingOfficerId?: string;
  reviewingOfficer?: User;
  state: EvaluationState;
  standardReference: string;
  patternApprovalNo?: string;
  generalRemarks?: string;
  reviewRemarks?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  timelineEvents?: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  instrumentId: string;
  evaluationId?: string;
  eventType: string;
  title: string;
  description: string;
  officerName: string;
  officerRole: string;
  createdAt: string;
}

export interface Instrument {
  id: string;
  passportId: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  instrumentType: string;
  accuracyClass: AccuracyClass;
  maxCapacity: number;
  minCapacity: number;
  scaleIntervalE: number;
  scaleIntervalD?: number;
  verificationUnits: string;
  capacityRangeType: string;
  tareRange?: string;
  temperatureRange?: string;
  powerSupply?: string;
  technicalSpecs?: string;
  status: 'ACTIVE' | 'IN_EVALUATION' | 'CERTIFIED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string; designation?: string };
  documents?: InstrumentDocument[];
  evaluations?: Evaluation[];
  timelineEvents?: TimelineEvent[];
  _count?: {
    evaluations: number;
    documents: number;
  };
}

export interface PassportData extends Instrument {
  summary: {
    totalEvaluations: number;
    completedEvaluations: number;
    activeEvaluations: number;
    lastEvaluationDate: string | null;
    currentCertificationStatus: 'CERTIFIED_OIML_R76' | 'PENDING_FINAL_CERTIFICATION';
  };
}

// Digital Test Workspace Types
export type TestType = 'WEIGHING_PERFORMANCE' | 'REPEATABILITY' | 'ECCENTRICITY' | 'TARE';
export type TestStatus = 'DRAFT' | 'PASS' | 'FAIL' | 'REVIEW';
export type VerificationType = 'INITIAL' | 'IN_SERVICE';

export interface EnvironmentalConditions {
  temperatureCelsius?: number;
  relativeHumidity?: number;
  atmosphericPressureHpa?: number;
  isInstrumentLevel?: boolean;
  standardWeightsCertificate?: string;
  inspectorName?: string;
  notes?: string;
}

export interface AnomalyFinding {
  code: string;
  field: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  description: string;
  clauseReference?: string;
  suggestedAction?: string;
}

export interface ShowMeWhyDetails {
  testType: string;
  testTitle: string;
  clauseReference: string;
  criteriaRule: string;
  verificationType: VerificationType;
  accuracyClass: string;
  scaleIntervalE: number;
  maxPermissibleLimitText: string;
  maximumErrorObserved: number;
  governingComparisonText: string;
  calculationSteps: Array<{
    title: string;
    formula: string;
    valuesApplied: string;
    result: string;
  }>;
  anomaliesDetected: AnomalyFinding[];
  evidenceCount: number;
  finalDecisionReasoning: string;
}

export interface TestComplianceResult {
  testType: string;
  verdict: TestStatus;
  calculationOutput: any;
  anomalies: AnomalyFinding[];
  showMeWhy: ShowMeWhyDetails;
  summaryText: string;
  marginOfCompliance: number;
  maxErrorUtilizationPercent: number;
  timestamp: string;
}

export interface TestAttachment {
  id: string;
  testRecordId: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileType?: string; // "PHOTO" | "DOCUMENT"
  fileSize?: number;
  uploadedAt: string;
}

export interface TestRecord {
  id: string;
  evaluationId: string;
  testType: TestType;
  status: TestStatus;
  environmentalData: EnvironmentalConditions;
  testInputs: Record<string, any>;
  observations: any[];
  calculationResults?: any;
  complianceDetails?: TestComplianceResult;
  notes?: string;
  testedById?: string;
  testedByName?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  attachments?: TestAttachment[];
}

export interface WeighingPointObservation {
  id?: string;
  step: number;
  direction: 'ASCENDING' | 'DESCENDING';
  appliedLoad: number;
  indication: number;
  deltaL?: number;
  notes?: string;
}

export interface RepeatabilityObservation {
  id?: string;
  runIndex: number;
  appliedLoad: number;
  indication: number;
  deltaL?: number;
}

export interface EccentricityObservation {
  id?: string;
  positionIndex: number;
  positionName: string;
  appliedLoad: number;
  indication: number;
  deltaL?: number;
}

export interface TareObservation {
  tareLoad: number;
  tareIndication: number;
  tareDeltaL?: number;
  netLoad: number;
  netIndication: number;
  netDeltaL?: number;
}

// ── New Feature Types ──

export interface RuleConfiguration {
  id: string;
  version: string;
  name: string;
  description?: string;
  standardRef: string;
  configuration: any;
  isActive: boolean;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  id: string;
  reportId: string;
  evaluationId: string;
  evaluation?: Evaluation;
  ruleConfigId?: string;
  ruleConfig?: RuleConfiguration;
  version: number;
  status: 'DRAFT' | 'FINALIZED' | 'REVISED';
  reportData: string;
  integrityHash?: string;
  finalizedAt?: string;
  finalizedById?: string;
  generatedById: string;
  generatedByName: string;
  createdAt: string;
  updatedAt: string;
  versions?: ReportVersion[];
}

export interface ReportVersion {
  id: string;
  reportId: string;
  version: number;
  reportData: string;
  integrityHash?: string;
  changeDescription?: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  previousState?: any;
  newState?: any;
  description: string;
  metadata?: any;
  evaluationId?: string;
  createdAt: string;
}

export interface SimulationRun {
  id: string;
  name: string;
  description?: string;
  baseRuleConfigId: string;
  simulatedRuleConfigId: string;
  results: any[];
  totalEvaluations: number;
  flippedCount: number;
  runById: string;
  runByName: string;
  createdAt: string;
}

export interface IntegrityVerification {
  verified: boolean;
  verdict?: string;
  reportId: string;
  storedHash: string;
  computedHash: string;
  finalizedAt?: string;
  version?: number;
  reason: string;
  fileName?: string;
}

export interface VersionDiff {
  version1: { version: number; createdAt: string; createdByName: string };
  version2: { version: number; createdAt: string; createdByName: string };
  diffs: Array<{ field: string; oldValue: any; newValue: any }>;
  totalChanges: number;
}

export interface DashboardStats {
  totalInstruments: number;
  totalEvaluations: number;
  evaluationsByState: Record<string, number>;
  totalReports: number;
  recentReports: Report[];
  recentAuditLogs: AuditLog[];
  myWorkload?: {
    activeEvaluations: number;
    pendingReview: number;
    completedThisMonth: number;
  };
}
