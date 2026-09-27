/**
 * MarkSure Rule Impact Simulation Engine
 * Performs virtual, strictly read-only execution of deterministic OIML R-76 calculations
 * against historical evaluation datasets using candidate/draft rule configurations.
 * 
 * ZERO MUTATION GUARANTEE: Never alters, updates, or deletes historical evaluations,
 * test records, or finalized certificates.
 */

import { OIML_R76_CLASSES, VERIFICATION_MULTIPLIERS, MPEBracket } from './oimlR76Config';

export interface SimulationFilters {
  startDate?: string;
  endDate?: string;
  instrumentType?: string;
  accuracyClass?: string;
}

export interface ChangedObservationDetail {
  testType: string;
  label: string;
  appliedLoad?: number;
  observedValue?: any;
  originalMpe?: string;
  simulatedMpe?: string;
  originalStatus: string;
  simulatedStatus: string;
  explanation: string;
}

export interface ChangedCalculationDetail {
  testType: string;
  label: string;
  originalValue: string;
  simulatedValue: string;
  explanation: string;
}

export interface EvaluationSimulationResult {
  evaluationId: string;
  evaluationNumber: string;
  evaluationDate: string;
  instrumentId: string;
  instrumentPassportId: string;
  instrumentManufacturer: string;
  instrumentModel: string;
  instrumentSerialNumber: string;
  instrumentType: string;
  accuracyClass: string;
  laboratoryName: string;
  originalOverallVerdict: 'PASS' | 'FAIL' | 'REVIEW';
  simulatedOverallVerdict: 'PASS' | 'FAIL' | 'REVIEW';
  statusChange: 'PASS_TO_FAIL' | 'PASS_TO_REVIEW' | 'FAIL_TO_PASS' | 'NO_CHANGE';
  flipped: boolean;
  impactDeltas: string[];
  changedObservations: ChangedObservationDetail[];
  changedCalculations: ChangedCalculationDetail[];
  testResults: Array<{
    testType: string;
    originalVerdict: string;
    simulatedVerdict: string;
    flipped: boolean;
  }>;
}

export interface SimulationRunOutput {
  summary: {
    totalEvaluations: number;
    flippedCount: number;
    passToFailCount: number;
    passToReviewCount: number;
    unchangedCount: number;
    affectedPercentage: number;
  };
  filtersApplied: SimulationFilters;
  results: EvaluationSimulationResult[];
}

const safeParse = (str: any, fallback: any = null) => {
  if (typeof str === 'object' && str !== null) return str;
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

export class RuleSimulationEngine {
  /**
   * Run simulation over historical evaluations using candidate draft config
   */
  public static runSimulation(
    evaluations: any[],
    candidateConfigJson: any,
    filters: SimulationFilters = {}
  ): SimulationRunOutput {
    const candidateConfig = typeof candidateConfigJson === 'string'
      ? safeParse(candidateConfigJson, {})
      : candidateConfigJson || {};

    const toleranceMultiplier = Number(candidateConfig.toleranceMultiplier || candidateConfig.tighteningFactorMultiplier || 1.0);
    const customClasses = candidateConfig.classes || {};
    const repeatabilityFactor = Number(candidateConfig.repeatabilityToleranceFactor || 1.0);
    const eccentricityFactor = Number(candidateConfig.eccentricityToleranceFactor || 1.0);

    const results: EvaluationSimulationResult[] = [];
    let passToFailCount = 0;
    let passToReviewCount = 0;
    let unchangedCount = 0;
    let flippedCount = 0;

    for (const evaluation of evaluations) {
      const inst = evaluation.instrument || {};
      const lab = evaluation.laboratory || {};
      const testRecords = evaluation.testRecords || [];

      const evalAccuracyClass = inst.accuracyClass || 'Class III';
      const scaleIntervalE = Number(inst.scaleIntervalE) > 0 ? Number(inst.scaleIntervalE) : 1.0;
      const verificationUnits = inst.verificationUnits || 'g';

      // Determine class-specific tightening factor
      const classCustom = customClasses[evalAccuracyClass] || {};
      let classTightening = toleranceMultiplier;
      if (classCustom.mpeTighteningFactor !== undefined && classCustom.mpeTighteningFactor !== null) {
        classTightening = Number(classCustom.mpeTighteningFactor);
      }

      // MPE brackets for this accuracy class
      const defaultBrackets: MPEBracket[] = (OIML_R76_CLASSES[evalAccuracyClass] || OIML_R76_CLASSES['Class III']).mpeBrackets;
      const activeBrackets: MPEBracket[] = classCustom.mpeBrackets && Array.isArray(classCustom.mpeBrackets) && classCustom.mpeBrackets.length > 0
        ? classCustom.mpeBrackets
        : defaultBrackets;

      const changedObservations: ChangedObservationDetail[] = [];
      const changedCalculations: ChangedCalculationDetail[] = [];
      const impactDeltas: string[] = [];
      const testResults: Array<{ testType: string; originalVerdict: string; simulatedVerdict: string; flipped: boolean }> = [];

      let origOverallVerdict: 'PASS' | 'FAIL' | 'REVIEW' = 'PASS';
      let simOverallVerdict: 'PASS' | 'FAIL' | 'REVIEW' = 'PASS';

      // Evaluate each test record
      for (const record of testRecords) {
        const testType = record.testType;
        const observations = safeParse(record.observations, []);
        const originalCompliance = safeParse(record.complianceDetails, {});
        const originalVerdict: string = originalCompliance?.verdict || record.status || 'PASS';

        let simulatedVerdict: string = originalVerdict;
        const testInputs = safeParse(record.testInputs, {});
        const vType = testInputs.verificationType || 'INITIAL';
        const vMultiplier = VERIFICATION_MULTIPLIERS[vType as 'INITIAL' | 'IN_SERVICE'] || 1.0;

        // Helper to compute MPE under draft config
        const getCandidateMpe = (loadVal: number): { baseMpe: number; simMpe: number } => {
          const absLoad = Math.abs(loadVal);
          const mInE = absLoad / scaleIntervalE;
          let matched = activeBrackets[0];
          for (const b of activeBrackets) {
            if (mInE >= b.minM && (b.maxM === Infinity || mInE <= b.maxM)) {
              matched = b;
              break;
            }
          }
          const baseMpeInUnits = matched.mpeInE * vMultiplier * scaleIntervalE;
          const simMpeInUnits = baseMpeInUnits * classTightening;
          return { baseMpe: baseMpeInUnits, simMpe: simMpeInUnits };
        };

        if (testType === 'WEIGHING_PERFORMANCE' && observations.length > 0) {
          let testFailed = false;
          let testReview = false;

          for (let i = 0; i < observations.length; i++) {
            const obs = observations[i];
            const load = Number(obs.appliedLoad ?? obs.load ?? 0);
            const err = Number(obs.correctedErrorEc ?? obs.error ?? 0);
            const absErr = Math.abs(err);

            const { baseMpe, simMpe } = getCandidateMpe(load);
            const originalPointPass = absErr <= (baseMpe + 0.000001);
            const simulatedPointPass = absErr <= (simMpe + 0.000001);

            if (originalPointPass && !simulatedPointPass) {
              testFailed = true;
              const obsDetail: ChangedObservationDetail = {
                testType: 'WEIGHING_PERFORMANCE',
                label: `Weighing Performance (Load ${load}${verificationUnits})`,
                appliedLoad: load,
                observedValue: `${err.toFixed(4)}${verificationUnits}`,
                originalMpe: `±${baseMpe.toFixed(4)}${verificationUnits}`,
                simulatedMpe: `±${simMpe.toFixed(4)}${verificationUnits}`,
                originalStatus: 'PASS',
                simulatedStatus: 'FAIL',
                explanation: `Observed error ${err.toFixed(4)}${verificationUnits} at load ${load}${verificationUnits} was compliant under original MPE (±${baseMpe.toFixed(4)}${verificationUnits}), but exceeds candidate standard (±${simMpe.toFixed(4)}${verificationUnits}) by ${(absErr - simMpe).toFixed(4)}${verificationUnits}`,
              };
              changedObservations.push(obsDetail);
              impactDeltas.push(`Weighing Performance: Load ${load}${verificationUnits} error (${err.toFixed(4)}${verificationUnits}) exceeds candidate MPE ±${simMpe.toFixed(4)}${verificationUnits}`);
            } else if (simulatedPointPass && (absErr / simMpe) >= 0.92) {
              testReview = true;
            }
          }

          if (testFailed) {
            simulatedVerdict = 'FAIL';
          } else if (testReview && simulatedVerdict === 'PASS') {
            simulatedVerdict = 'REVIEW';
            changedCalculations.push({
              testType: 'WEIGHING_PERFORMANCE',
              label: 'Borderline Error Margin Warning',
              originalValue: 'Within 90% MPE Band (PASS)',
              simulatedValue: 'Exceeds 92% of Tightened MPE Band (REVIEW)',
              explanation: 'Observed error reaches near the outer boundary of the candidate permissible tolerance.',
            });
          }
        } else if (testType === 'REPEATABILITY' && observations.length > 0) {
          // Compute observed repeatability range (max - min)
          const indications = observations.map((o: any) => Number(o.indication ?? o.load ?? 0));
          if (indications.length >= 2) {
            const maxInd = Math.max(...indications);
            const minInd = Math.min(...indications);
            const range = maxInd - minInd;

            const nominalLoad = Number(testInputs.nominalLoad || inst.maxCapacity * 0.5);
            const { baseMpe, simMpe } = getCandidateMpe(nominalLoad);

            const origLimit = baseMpe;
            const simLimit = simMpe * repeatabilityFactor;

            const origPass = range <= (origLimit + 0.000001);
            const simPass = range <= (simLimit + 0.000001);

            if (origPass && !simPass) {
              simulatedVerdict = 'FAIL';
              changedCalculations.push({
                testType: 'REPEATABILITY',
                label: 'Repeatability Maximum Range [Emax - Emin]',
                originalValue: `Range ${range.toFixed(4)}${verificationUnits} ≤ Original Limit ${origLimit.toFixed(4)}${verificationUnits} (PASS)`,
                simulatedValue: `Range ${range.toFixed(4)}${verificationUnits} > Candidate Limit ${simLimit.toFixed(4)}${verificationUnits} (FAIL)`,
                explanation: `Repeatability span ${range.toFixed(4)}${verificationUnits} exceeds candidate standard threshold ±${simLimit.toFixed(4)}${verificationUnits}`,
              });
              impactDeltas.push(`Repeatability: Observed range ${range.toFixed(4)}${verificationUnits} exceeds candidate limit ${simLimit.toFixed(4)}${verificationUnits}`);
            } else if (simPass && (range / simLimit) >= 0.88 && originalVerdict === 'PASS') {
              simulatedVerdict = 'REVIEW';
            }
          }
        } else if (testType === 'ECCENTRICITY' && observations.length > 0) {
          const appliedLoad = Number(testInputs.appliedLoad || inst.maxCapacity * 0.33);
          const { baseMpe, simMpe } = getCandidateMpe(appliedLoad);
          const simLimit = simMpe * eccentricityFactor;

          let eccFailed = false;
          observations.forEach((o: any, idx: number) => {
            const err = Math.abs(Number(o.correctedErrorEc ?? o.error ?? 0));
            if (err > (simLimit + 0.000001) && err <= (baseMpe + 0.000001)) {
              eccFailed = true;
              changedObservations.push({
                testType: 'ECCENTRICITY',
                label: `Eccentricity (${o.positionName || `Position ${idx + 1}`})`,
                appliedLoad,
                observedValue: `${err.toFixed(4)}${verificationUnits}`,
                originalMpe: `±${baseMpe.toFixed(4)}${verificationUnits}`,
                simulatedMpe: `±${simLimit.toFixed(4)}${verificationUnits}`,
                originalStatus: 'PASS',
                simulatedStatus: 'FAIL',
                explanation: `Corner load error ${err.toFixed(4)}${verificationUnits} at ${o.positionName || `Position ${idx + 1}`} exceeds candidate tolerance ±${simLimit.toFixed(4)}${verificationUnits}`,
              });
            }
          });

          if (eccFailed) {
            simulatedVerdict = 'FAIL';
            impactDeltas.push(`Eccentricity: Corner load error exceeds candidate MPE limit ±${simLimit.toFixed(4)}${verificationUnits}`);
          }
        }

        const isTestFlipped = originalVerdict !== simulatedVerdict;
        testResults.push({
          testType,
          originalVerdict,
          simulatedVerdict,
          flipped: isTestFlipped,
        });

        if (originalVerdict === 'FAIL') origOverallVerdict = 'FAIL';
        else if (originalVerdict === 'REVIEW' && origOverallVerdict !== 'FAIL') origOverallVerdict = 'REVIEW';

        if (simulatedVerdict === 'FAIL') simOverallVerdict = 'FAIL';
        else if (simulatedVerdict === 'REVIEW' && simOverallVerdict !== 'FAIL') simOverallVerdict = 'REVIEW';
      }

      // Check if overall verdict shifted
      const isEvalFlipped = origOverallVerdict !== simOverallVerdict;
      let statusChange: 'PASS_TO_FAIL' | 'PASS_TO_REVIEW' | 'FAIL_TO_PASS' | 'NO_CHANGE' = 'NO_CHANGE';

      if (origOverallVerdict === 'PASS' && simOverallVerdict === 'FAIL') {
        statusChange = 'PASS_TO_FAIL';
        passToFailCount++;
        flippedCount++;
      } else if (origOverallVerdict === 'PASS' && simOverallVerdict === 'REVIEW') {
        statusChange = 'PASS_TO_REVIEW';
        passToReviewCount++;
        flippedCount++;
      } else if (origOverallVerdict === 'FAIL' && simOverallVerdict === 'PASS') {
        statusChange = 'FAIL_TO_PASS';
        flippedCount++;
      } else {
        unchangedCount++;
      }

      results.push({
        evaluationId: evaluation.id,
        evaluationNumber: evaluation.evaluationNumber,
        evaluationDate: evaluation.evaluationDate ? new Date(evaluation.evaluationDate).toISOString() : new Date().toISOString(),
        instrumentId: inst.id,
        instrumentPassportId: inst.passportId || 'N/A',
        instrumentManufacturer: inst.manufacturer || 'N/A',
        instrumentModel: inst.model || 'N/A',
        instrumentSerialNumber: inst.serialNumber || 'N/A',
        instrumentType: inst.instrumentType || 'Electronic NAWI',
        accuracyClass: evalAccuracyClass,
        laboratoryName: lab.name || 'Accredited Laboratory',
        originalOverallVerdict: origOverallVerdict,
        simulatedOverallVerdict: simOverallVerdict,
        statusChange,
        flipped: isEvalFlipped,
        impactDeltas,
        changedObservations,
        changedCalculations,
        testResults,
      });
    }

    const totalEvaluations = evaluations.length;
    const affectedPercentage = totalEvaluations > 0 ? Math.round((flippedCount / totalEvaluations) * 1000) / 10 : 0;

    return {
      summary: {
        totalEvaluations,
        flippedCount,
        passToFailCount,
        passToReviewCount,
        unchangedCount,
        affectedPercentage,
      },
      filtersApplied: filters,
      results,
    };
  }
}
