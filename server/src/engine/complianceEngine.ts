/**
 * OIML R-76 Deterministic Compliance Engine
 * Evaluates calculation outputs against standard legal metrology criteria
 * Produces structured PASS / FAIL / REVIEW verdicts and comprehensive "Show Me Why" breakdowns.
 */

import {
  OimlCalculationEngine,
  VerificationType,
  WeighingPointObservation,
  RepeatabilityObservation,
  EccentricityObservation,
  TareObservation,
} from './calculationEngine';
import {
  OimlValidationEngine,
  EnvironmentalConditions,
  InstrumentSpecs,
  AnomalyFinding,
} from './validationEngine';
import { OIML_CLAUSE_REFERENCES } from './oimlR76Config';

export type ComplianceVerdict = 'PASS' | 'FAIL' | 'REVIEW';

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
  verdict: ComplianceVerdict;
  calculationOutput: any;
  anomalies: AnomalyFinding[];
  showMeWhy: ShowMeWhyDetails;
  summaryText: string;
  marginOfCompliance: number;
  maxErrorUtilizationPercent: number;
  timestamp: string;
}

export class OimlComplianceEngine {
  /**
   * Evaluate Weighing Performance Test
   */
  public static evaluateWeighingPerformance(
    observations: WeighingPointObservation[],
    specs: InstrumentSpecs,
    env: EnvironmentalConditions,
    verificationType: VerificationType = 'INITIAL',
    evidenceCount: number = 0
  ): TestComplianceResult {
    // 1. Validation & logical cross-checks
    const paramAnomalies = OimlValidationEngine.validateInstrumentMetrology(specs);
    const envAnomalies = OimlValidationEngine.validateEnvironmentalConditions(env, specs);
    const obsAnomalies = OimlValidationEngine.validateObservations('WEIGHING_PERFORMANCE', observations, specs);
    const allAnomalies = [...paramAnomalies, ...envAnomalies, ...obsAnomalies];

    // 2. Deterministic Calculation
    const calc = OimlCalculationEngine.calculateWeighingPerformance(
      observations,
      specs.scaleIntervalE,
      specs.accuracyClass,
      verificationType
    );

    // 3. Compliance Decision Logic (Pure deterministic)
    let verdict: ComplianceVerdict = 'PASS';
    let reasoning = '';

    const hasCriticalError = calc.failCount > 0;
    const hasCriticalAnomaly = allAnomalies.some((a) => a.severity === 'CRITICAL');
    const hasWarningAnomaly = allAnomalies.some((a) => a.severity === 'WARNING');

    // Check for borderline errors (e.g. error >= 95% of MPE)
    const hasBorderlinePoint = calc.results.some((r) => r.utilizationPercentage >= 95 && r.isPass);
    if (hasBorderlinePoint) {
      allAnomalies.push({
        code: 'BORDERLINE_ERROR',
        field: 'calculations',
        severity: 'WARNING',
        title: 'Borderline Indication Error Detected (≥95% MPE)',
        description: 'One or more observed test points are near the outer boundary of the permissible error.',
        clauseReference: 'OIML R 76-1:2006 Clause 3.5.1',
        suggestedAction: 'Require Reviewing Officer review or recommend confirmatory weighing.',
      });
    }

    if (hasCriticalError || hasCriticalAnomaly) {
      verdict = 'FAIL';
      reasoning = hasCriticalError
        ? `NON-COMPLIANT: ${calc.failCount} of ${calc.results.length} test points exceeded Maximum Permissible Error (MPE). Max observed error is ${calc.maxError} ${specs.verificationUnits}.`
        : `NON-COMPLIANT: Critical inspection anomaly detected (${allAnomalies.find((a) => a.severity === 'CRITICAL')?.title}).`;
    } else if (hasWarningAnomaly || hasBorderlinePoint) {
      verdict = 'REVIEW';
      reasoning = `FLAGGED FOR HUMAN REVIEW: All test points are within MPE, but ${allAnomalies.length} anomaly conditions require Reviewing Officer sign-off.`;
    } else {
      verdict = 'PASS';
      reasoning = `COMPLIANT: All ${calc.results.length} test points satisfy OIML R-76 Table 6 error limits. Maximum corrected error is ${calc.maxError} ${specs.verificationUnits}.`;
    }

    // Max error utilization
    const worstPoint = [...calc.results].sort((a, b) => b.utilizationPercentage - a.utilizationPercentage)[0];
    const maxUtilization = worstPoint ? worstPoint.utilizationPercentage : 0;
    const minMargin = worstPoint ? worstPoint.margin : 0;

    const clause = OIML_CLAUSE_REFERENCES.WEIGHING_PERFORMANCE;

    const showMeWhy: ShowMeWhyDetails = {
      testType: 'WEIGHING_PERFORMANCE',
      testTitle: clause.title,
      clauseReference: clause.clause,
      criteriaRule: clause.criteriaRule,
      verificationType,
      accuracyClass: specs.accuracyClass,
      scaleIntervalE: specs.scaleIntervalE,
      maxPermissibleLimitText: `±0.5 e to ±1.5 e (per ${specs.accuracyClass} load brackets)`,
      maximumErrorObserved: calc.maxError,
      governingComparisonText: worstPoint
        ? `Critical Step ${worstPoint.step} (Load ${worstPoint.appliedLoad} ${specs.verificationUnits}): |Ec| = ${Math.abs(
            worstPoint.correctedErrorEc
          )} ≤ MPE = ${worstPoint.mpeResult.mpeValue} ${specs.verificationUnits} (${maxUtilization}% utilization)`
        : 'No points evaluated',
      calculationSteps: [
        {
          title: 'Zero Error Reference (E0)',
          formula: 'E0 = P0 - 0 = I0 + 0.5e - ΔL0',
          valuesApplied: `Zero indication = ${calc.zeroErrorE0} ${specs.verificationUnits}`,
          result: `E0 = ${calc.zeroErrorE0} ${specs.verificationUnits}`,
        },
        {
          title: 'Indication Prior to Rounding (P)',
          formula: 'P = I + 0.5e - ΔL',
          valuesApplied: 'Computed across all steps where small weights were placed',
          result: `Evaluated for ${calc.results.length} load points`,
        },
        {
          title: 'Corrected Error (Ec)',
          formula: 'Ec = (P - L) - E0',
          valuesApplied: `Subtracted tare zero error ${calc.zeroErrorE0} from each observed indication error`,
          result: `Maximum |Ec| = ${calc.maxError} ${specs.verificationUnits}`,
        },
      ],
      anomaliesDetected: allAnomalies,
      evidenceCount,
      finalDecisionReasoning: reasoning,
    };

    return {
      testType: 'WEIGHING_PERFORMANCE',
      verdict,
      calculationOutput: calc,
      anomalies: allAnomalies,
      showMeWhy,
      summaryText: reasoning,
      marginOfCompliance: minMargin,
      maxErrorUtilizationPercent: maxUtilization,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Evaluate Repeatability Test
   */
  public static evaluateRepeatability(
    nominalLoad: number,
    runs: RepeatabilityObservation[],
    specs: InstrumentSpecs,
    env: EnvironmentalConditions,
    verificationType: VerificationType = 'INITIAL',
    evidenceCount: number = 0
  ): TestComplianceResult {
    const paramAnomalies = OimlValidationEngine.validateInstrumentMetrology(specs);
    const envAnomalies = OimlValidationEngine.validateEnvironmentalConditions(env, specs);
    const obsAnomalies = OimlValidationEngine.validateObservations('REPEATABILITY', runs, specs);
    const allAnomalies = [...paramAnomalies, ...envAnomalies, ...obsAnomalies];

    const calc = OimlCalculationEngine.calculateRepeatability(
      nominalLoad,
      runs,
      specs.scaleIntervalE,
      specs.accuracyClass,
      verificationType
    );

    let verdict: ComplianceVerdict = 'PASS';
    let reasoning = '';

    const hasCriticalError = !calc.isPass;
    const hasCriticalAnomaly = allAnomalies.some((a) => a.severity === 'CRITICAL');
    const hasWarningAnomaly = allAnomalies.some((a) => a.severity === 'WARNING');

    // Check repeatability dispersion relative to limit
    const utilization =
      calc.mpeResult.mpeValue > 0
        ? Math.round((calc.observedRange / calc.mpeResult.mpeValue) * 10000) / 100
        : 0;

    if (utilization >= 90 && calc.isPass) {
      allAnomalies.push({
        code: 'HIGH_REPEATABILITY_SPREAD',
        field: 'repeatability',
        severity: 'WARNING',
        title: 'High Repeatability Spread (≥90% of allowable range)',
        description: `Spread Δ = ${calc.observedRange} is close to the MPE limit ${calc.mpeResult.mpeValue}.`,
        clauseReference: 'OIML R 76-1:2006 Clause A.4.10',
        suggestedAction: 'Inspect knife-edges / load cell mountings or repeat series.',
      });
    }

    if (hasCriticalError || hasCriticalAnomaly) {
      verdict = 'FAIL';
      reasoning = hasCriticalError
        ? `NON-COMPLIANT: Spread between successive weighings (Δ = ${calc.observedRange} ${specs.verificationUnits}) exceeds allowable |MPE| of ${calc.mpeResult.mpeValue} ${specs.verificationUnits}.`
        : `NON-COMPLIANT: Critical inspection anomaly detected.`;
    } else if (hasWarningAnomaly || utilization >= 90) {
      verdict = 'REVIEW';
      reasoning = `FLAGGED FOR REVIEW: Spread Δ = ${calc.observedRange} is within MPE, but warnings or high spread require officer verification.`;
    } else {
      verdict = 'PASS';
      reasoning = `COMPLIANT: Successive weighings show high agreement (Δ = ${calc.observedRange} ≤ |MPE| = ${calc.mpeResult.mpeValue} ${specs.verificationUnits}, Std Dev = ${calc.stdDeviation}).`;
    }

    const clause = OIML_CLAUSE_REFERENCES.REPEATABILITY;

    const showMeWhy: ShowMeWhyDetails = {
      testType: 'REPEATABILITY',
      testTitle: clause.title,
      clauseReference: clause.clause,
      criteriaRule: clause.criteriaRule,
      verificationType,
      accuracyClass: specs.accuracyClass,
      scaleIntervalE: specs.scaleIntervalE,
      maxPermissibleLimitText: `|MPE| = ±${calc.mpeResult.mpeValue} ${specs.verificationUnits} (±${calc.mpeResult.mpeInE} e)`,
      maximumErrorObserved: calc.observedRange,
      governingComparisonText: `Observed Spread Δ = (P_max ${calc.maxP} - P_min ${calc.minP}) = ${calc.observedRange} ≤ |MPE| ${calc.mpeResult.mpeValue}`,
      calculationSteps: [
        {
          title: 'Maximum Indication Spread (Δ)',
          formula: 'Δ = P_max - P_min',
          valuesApplied: `Max = ${calc.maxP}, Min = ${calc.minP}`,
          result: `Δ = ${calc.observedRange} ${specs.verificationUnits}`,
        },
        {
          title: 'Sample Standard Deviation (s)',
          formula: 's = sqrt( Σ(P - P_mean)² / (n - 1) )',
          valuesApplied: `Mean = ${calc.meanP} across ${calc.runs.length} runs`,
          result: `s = ${calc.stdDeviation} ${specs.verificationUnits}`,
        },
      ],
      anomaliesDetected: allAnomalies,
      evidenceCount,
      finalDecisionReasoning: reasoning,
    };

    return {
      testType: 'REPEATABILITY',
      verdict,
      calculationOutput: calc,
      anomalies: allAnomalies,
      showMeWhy,
      summaryText: reasoning,
      marginOfCompliance: calc.margin,
      maxErrorUtilizationPercent: utilization,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Evaluate Eccentricity Test
   */
  public static evaluateEccentricity(
    appliedLoad: number,
    points: EccentricityObservation[],
    specs: InstrumentSpecs,
    env: EnvironmentalConditions,
    verificationType: VerificationType = 'INITIAL',
    evidenceCount: number = 0
  ): TestComplianceResult {
    const paramAnomalies = OimlValidationEngine.validateInstrumentMetrology(specs);
    const envAnomalies = OimlValidationEngine.validateEnvironmentalConditions(env, specs);
    const obsAnomalies = OimlValidationEngine.validateObservations('ECCENTRICITY', points, specs);
    const allAnomalies = [...paramAnomalies, ...envAnomalies, ...obsAnomalies];

    const calc = OimlCalculationEngine.calculateEccentricity(
      appliedLoad,
      points,
      specs.scaleIntervalE,
      specs.accuracyClass,
      verificationType
    );

    let verdict: ComplianceVerdict = 'PASS';
    let reasoning = '';

    const hasCriticalError = !calc.isPass;
    const hasCriticalAnomaly = allAnomalies.some((a) => a.severity === 'CRITICAL');
    const hasWarningAnomaly = allAnomalies.some((a) => a.severity === 'WARNING');

    const maxUtilization =
      calc.mpeResult.mpeValue > 0
        ? Math.round((calc.maxEccentricError / calc.mpeResult.mpeValue) * 10000) / 100
        : 0;

    if (hasCriticalError || hasCriticalAnomaly) {
      verdict = 'FAIL';
      reasoning = hasCriticalError
        ? `NON-COMPLIANT: Off-center loading error exceeded MPE limit. Maximum error is ${calc.maxEccentricError} ${specs.verificationUnits} vs MPE of ${calc.mpeResult.mpeValue}.`
        : `NON-COMPLIANT: Critical testing anomaly detected.`;
    } else if (hasWarningAnomaly || maxUtilization >= 90) {
      verdict = 'REVIEW';
      reasoning = `FLAGGED FOR REVIEW: Eccentric errors are within limit, but corner deviations or warnings need reviewing officer approval.`;
    } else {
      verdict = 'PASS';
      reasoning = `COMPLIANT: All 5 platform loading positions (center + 4 quadrants) satisfy MPE limits. Max error = ${calc.maxEccentricError} ${specs.verificationUnits}.`;
    }

    const clause = OIML_CLAUSE_REFERENCES.ECCENTRICITY;

    const showMeWhy: ShowMeWhyDetails = {
      testType: 'ECCENTRICITY',
      testTitle: clause.title,
      clauseReference: clause.clause,
      criteriaRule: clause.criteriaRule,
      verificationType,
      accuracyClass: specs.accuracyClass,
      scaleIntervalE: specs.scaleIntervalE,
      maxPermissibleLimitText: `MPE = ±${calc.mpeResult.mpeValue} ${specs.verificationUnits} (±${calc.mpeResult.mpeInE} e)`,
      maximumErrorObserved: calc.maxEccentricError,
      governingComparisonText: `Max Corner Error |Ec| = ${calc.maxEccentricError} ≤ MPE = ${calc.mpeResult.mpeValue} ${specs.verificationUnits}`,
      calculationSteps: [
        {
          title: 'Quadrant Corner Indication Evaluation',
          formula: 'Ec_pos = P_pos - L_ecc',
          valuesApplied: `Applied Load L = ${appliedLoad} ${specs.verificationUnits}`,
          result: `Evaluated ${calc.points.length} positions. Max deviation from center = ${calc.maxDeviationFromCenter} ${specs.verificationUnits}`,
        },
      ],
      anomaliesDetected: allAnomalies,
      evidenceCount,
      finalDecisionReasoning: reasoning,
    };

    return {
      testType: 'ECCENTRICITY',
      verdict,
      calculationOutput: calc,
      anomalies: allAnomalies,
      showMeWhy,
      summaryText: reasoning,
      marginOfCompliance: Math.round((calc.mpeResult.mpeValue - calc.maxEccentricError) * 1000000) / 1000000,
      maxErrorUtilizationPercent: maxUtilization,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Evaluate Tare Setting & Net Weighing Test
   */
  public static evaluateTare(
    obs: TareObservation,
    specs: InstrumentSpecs,
    env: EnvironmentalConditions,
    verificationType: VerificationType = 'INITIAL',
    evidenceCount: number = 0
  ): TestComplianceResult {
    const paramAnomalies = OimlValidationEngine.validateInstrumentMetrology(specs);
    const envAnomalies = OimlValidationEngine.validateEnvironmentalConditions(env, specs);
    const allAnomalies = [...paramAnomalies, ...envAnomalies];

    const calc = OimlCalculationEngine.calculateTare(
      obs,
      specs.scaleIntervalE,
      specs.accuracyClass,
      verificationType
    );

    let verdict: ComplianceVerdict = 'PASS';
    let reasoning = '';

    if (!calc.tareSettingPass) {
      allAnomalies.push({
        code: 'TARE_SETTING_EXCEEDED',
        field: 'tareError',
        severity: 'CRITICAL',
        title: 'Tare Setting Accuracy Exceeded 0.25 e',
        description: `Observed tare balancing error ${calc.tareError} exceeds limit of ±0.25 e (±${calc.tareMaxPermissibleLimit} ${specs.verificationUnits}).`,
        clauseReference: 'OIML R 76-1:2006 Clause 3.6.1',
        suggestedAction: 'Recalibrate tare balance zero mechanism.',
      });
    }

    if (!calc.netWeighingPass) {
      allAnomalies.push({
        code: 'NET_WEIGHING_ERROR_EXCEEDED',
        field: 'netError',
        severity: 'CRITICAL',
        title: 'Net Load Indication Error Exceeded MPE',
        description: `Observed net load error ${calc.netCorrectedErrorEc} exceeds net MPE of ±${calc.netMpeResult.mpeValue} ${specs.verificationUnits}.`,
        clauseReference: 'OIML R 76-1:2006 Clause 3.6.2',
        suggestedAction: 'Verify load cell linearity with preload tare.',
      });
    }

    const hasCritical = allAnomalies.some((a) => a.severity === 'CRITICAL') || !calc.isPass;
    const hasWarning = allAnomalies.some((a) => a.severity === 'WARNING');

    if (hasCritical) {
      verdict = 'FAIL';
      reasoning = `NON-COMPLIANT: Tare mechanism failed OIML R-76 requirements (${
        !calc.tareSettingPass ? 'Tare balance setting error > 0.25e' : 'Net weighing error > MPE'
      }).`;
    } else if (hasWarning) {
      verdict = 'REVIEW';
      reasoning = 'FLAGGED FOR REVIEW: Tare errors within limit, but environmental or instrument warnings noted.';
    } else {
      verdict = 'PASS';
      reasoning = `COMPLIANT: Tare balance setting accuracy (|Et| = ${Math.abs(calc.tareError)} ≤ 0.25 e) and net load weighing (|Ec| = ${Math.abs(
        calc.netCorrectedErrorEc
      )} ≤ MPE) both satisfy standard.`;
    }

    const clause = OIML_CLAUSE_REFERENCES.TARE;

    const showMeWhy: ShowMeWhyDetails = {
      testType: 'TARE',
      testTitle: clause.title,
      clauseReference: clause.clause,
      criteriaRule: clause.criteriaRule,
      verificationType,
      accuracyClass: specs.accuracyClass,
      scaleIntervalE: specs.scaleIntervalE,
      maxPermissibleLimitText: `Tare Setting: ±0.25 e (±${calc.tareMaxPermissibleLimit} ${specs.verificationUnits}) | Net MPE: ±${calc.netMpeResult.mpeValue} ${specs.verificationUnits}`,
      maximumErrorObserved: Math.max(Math.abs(calc.tareError), Math.abs(calc.netCorrectedErrorEc)),
      governingComparisonText: `Tare Error |Et| = ${Math.abs(calc.tareError)} ≤ ${calc.tareMaxPermissibleLimit} ; Net Error |Ec| = ${Math.abs(
        calc.netCorrectedErrorEc
      )} ≤ ${calc.netMpeResult.mpeValue}`,
      calculationSteps: [
        {
          title: 'Tare Setting Balance Error (Et)',
          formula: 'Et = Pt - Lt',
          valuesApplied: `Tare Load = ${obs.tareLoad}, Indication = ${obs.tareIndication}`,
          result: `Et = ${calc.tareError} ${specs.verificationUnits} (Limit: ±${calc.tareMaxPermissibleLimit})`,
        },
        {
          title: 'Net Load Corrected Indication Error (Ec_net)',
          formula: 'Ec_net = (P_net - L_net) - Et',
          valuesApplied: `Net Load = ${obs.netLoad}, Net Indication = ${obs.netIndication}`,
          result: `Ec_net = ${calc.netCorrectedErrorEc} ${specs.verificationUnits} (MPE: ±${calc.netMpeResult.mpeValue})`,
        },
      ],
      anomaliesDetected: allAnomalies,
      evidenceCount,
      finalDecisionReasoning: reasoning,
    };

    return {
      testType: 'TARE',
      verdict,
      calculationOutput: calc,
      anomalies: allAnomalies,
      showMeWhy,
      summaryText: reasoning,
      marginOfCompliance: Math.round((calc.netMpeResult.mpeValue - Math.abs(calc.netCorrectedErrorEc)) * 1000000) / 1000000,
      maxErrorUtilizationPercent:
        calc.netMpeResult.mpeValue > 0
          ? Math.round((Math.abs(calc.netCorrectedErrorEc) / calc.netMpeResult.mpeValue) * 10000) / 100
          : 0,
      timestamp: new Date().toISOString(),
    };
  }
}
